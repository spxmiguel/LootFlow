import { logger } from './logger'
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeAuth, getAuth, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc,
  deleteDoc, onSnapshot, query, updateDoc, where, writeBatch, type Firestore,
} from 'firebase/firestore'
import type {
  FirebaseConfig,
  Friend,
  FriendRequest,
  Friendship,
  PublicProfileSummary,
} from './types'

// ─── State ────────────────────────────────────────────────────────────────────

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let initialized = false

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initFirebase(config: FirebaseConfig): { auth: Auth; db: Firestore } {
  try {
    const existing = getApps()
    app = existing.length > 0 ? existing[0] : initializeApp(config)
    // Use browserLocalPersistence so Firebase stores credentials in localStorage.
    // initializeAuth throws "auth/already-initialized" on re-init — use getAuth
    // in that case. Any OTHER error should propagate (don't silently fall back
    // to getAuth, which would use default Electron persistence with safeStorage).
    try {
      auth = initializeAuth(app, { persistence: [browserLocalPersistence], popupRedirectResolver: browserPopupRedirectResolver })
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      if (code === 'auth/already-initialized' || auth != null) {
        auth = getAuth(app)
      } else {
        throw e
      }
    }
    db = getFirestore(app)
    initialized = true
    return { auth, db }
  } catch (e) {
    logger.error('[Firebase] Init error:', e)
    throw e
  }
}

export function getFirebaseAuth(): Auth | null {
  return auth
}

export function getFirebaseDB(): Firestore | null {
  return db
}

export function isFirebaseReady(): boolean {
  return initialized && app != null && auth != null && db != null
}

export function getGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}

// ─── Firestore Helpers ────────────────────────────────────────────────────────

// Firestore doesn't accept undefined values — strip them recursively before writing.
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj))
}

// Throws on error so callers can detect Firestore access failures (e.g. missing rules).
export async function firestoreLoadCollection<T>(
  userId: string,
  collectionName: string,
): Promise<T[]> {
  if (!db) throw new Error('Firestore not initialized')
  const snap = await getDocs(collection(db, 'users', userId, collectionName))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
}

// Throws on error so callers can detect write failures.
export async function firestoreSaveDoc(
  userId: string,
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  await setDoc(doc(db, 'users', userId, collectionName, docId), sanitize(data), { merge: true })
}

export async function firestoreSavePublicProfile(profile: PublicProfileSummary): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  const data = sanitize(profile as unknown as Record<string, unknown>)
  await Promise.all([
    setDoc(doc(db, 'publicProfiles', profile.uid), data, { merge: true }),
    setDoc(doc(db, 'friendCodes', profile.friendCode.toUpperCase()), {
      uid: profile.uid,
      friendCode: profile.friendCode.toUpperCase(),
      updatedAt: profile.updatedAt,
    }),
  ])
}

export async function firestoreLookupFriendCode(friendCode: string): Promise<{ uid: string; friendCode: string } | null> {
  if (!db) throw new Error('Firestore not initialized')
  const snap = await getDoc(doc(db, 'friendCodes', friendCode.toUpperCase()))
  return snap.exists() ? (snap.data() as { uid: string; friendCode: string }) : null
}

export async function firestoreLoadPublicProfile(uid: string): Promise<PublicProfileSummary | null> {
  if (!db) throw new Error('Firestore not initialized')
  const snap = await getDoc(doc(db, 'publicProfiles', uid))
  return snap.exists() ? (snap.data() as PublicProfileSummary) : null
}

export async function firestoreCreateFriendRequest(request: FriendRequest): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  await setDoc(doc(db, 'friendRequests', request.id), sanitize(request as unknown as Record<string, unknown>))
}

export async function firestoreAcceptFriendRequest(
  request: FriendRequest,
  friendship: Friendship,
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  const batch = writeBatch(db)
  batch.set(doc(db, 'friendships', friendship.id), sanitize(friendship as unknown as Record<string, unknown>))
  batch.delete(doc(db, 'friendRequests', request.id))
  await batch.commit()
}

export async function firestoreDeleteFriendRequest(requestId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  await deleteDoc(doc(db, 'friendRequests', requestId))
}

export async function firestoreDeleteFriendship(friendshipId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  await deleteDoc(doc(db, 'friendships', friendshipId))
}

export async function firestoreUpdateFriendshipProfile(
  friendshipId: string,
  userId: string,
  profile: Friend,
): Promise<void> {
  if (!db) throw new Error('Firestore not initialized')
  await updateDoc(doc(db, 'friendships', friendshipId), {
    [`memberProfiles.${userId}`]: sanitize(profile as unknown as Record<string, unknown>),
    updatedAt: new Date().toISOString(),
  })
}

export function firestoreSubscribeSocial(
  userId: string,
  onChange: (requests: FriendRequest[], friendships: Friendship[]) => void,
  onError: (error: unknown) => void,
): () => void {
  if (!db) throw new Error('Firestore not initialized')

  let requests: FriendRequest[] = []
  let friendships: Friendship[] = []
  const emit = () => {
    const visibleRequests = requests
      .map(request => ({
        ...request,
        type: request.senderId === userId ? 'outgoing' : 'incoming',
      } as FriendRequest))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    onChange(visibleRequests, friendships)
  }

  const requestsQuery = query(collection(db, 'friendRequests'), where('participantIds', 'array-contains', userId))
  const friendshipsQuery = query(collection(db, 'friendships'), where('memberIds', 'array-contains', userId))

  const unsubRequests = onSnapshot(requestsQuery, snap => {
    requests = snap.docs.map(item => ({
      id: item.id,
      ...item.data(),
    } as FriendRequest))
    emit()
  }, onError)
  const unsubFriendships = onSnapshot(friendshipsQuery, snap => {
    friendships = snap.docs.map(item => ({ id: item.id, ...item.data() } as Friendship))
    emit()
  }, onError)

  return () => {
    unsubRequests()
    unsubFriendships()
  }
}

export function firestoreSubscribeUserCollection<T>(
  userId: string,
  collectionName: string,
  onChange: (items: T[]) => void,
  onError: (error: unknown) => void,
): () => void {
  if (!db) throw new Error('Firestore not initialized')
  return onSnapshot(collection(db, 'users', userId, collectionName), snap => {
    onChange(snap.docs.map(item => ({ id: item.id, ...item.data() } as T)))
  }, onError)
}

export async function firestoreDeleteDoc(
  userId: string,
  collectionName: string,
  docId: string,
): Promise<void> {
  if (!db) return
  try {
    await deleteDoc(doc(db, 'users', userId, collectionName, docId))
  } catch (e) {
    logger.error(`[Firestore] Delete ${collectionName}/${docId}:`, e)
  }
}

export async function firestoreDeleteAllUserData(userId: string): Promise<void> {
  if (!db) return
  const publicProfileRef = doc(db, 'publicProfiles', userId)
  const publicProfileSnap = await getDoc(publicProfileRef).catch(() => null)
  const friendCode = publicProfileSnap?.exists() ? (publicProfileSnap.data() as { friendCode?: string }).friendCode : undefined
  const cols = [
    'accounts',
    'drops',
    'goals',
    'settings',
    'collection',
    'cases',
    'friends',
    'friendRequests',
    'achievements',
    'gamification',
    'notifications',
    '_test',
  ]
  const results = await Promise.allSettled(cols.map(async col => {
    const snap = await getDocs(collection(db!, 'users', userId, col))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  }))
  const [socialRequests, friendships] = await Promise.all([
    getDocs(query(collection(db, 'friendRequests'), where('participantIds', 'array-contains', userId))),
    getDocs(query(collection(db, 'friendships'), where('memberIds', 'array-contains', userId))),
  ])
  await Promise.allSettled([
    deleteDoc(publicProfileRef),
    friendCode ? deleteDoc(doc(db, 'friendCodes', friendCode.toUpperCase())) : Promise.resolve(),
    ...socialRequests.docs.map(request => deleteDoc(request.ref)),
    ...friendships.docs.map(friendship => deleteDoc(friendship.ref)),
  ])
  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    throw new Error(`Falha ao apagar ${failed.length}/${cols.length} coleções do Firestore`)
  }
}

/** Enfileira uma notificação para o bot WhatsApp processar */
export async function firestoreQueueNotification(
  userId: string,
  type: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  if (!db) return
  const docId = `${type}_${Date.now()}`
  await setDoc(
    doc(db, 'users', userId, 'notifications', docId),
    sanitize({ type, createdAt: new Date().toISOString(), ...(payload ?? {}) }),
  )
}

export { GoogleAuthProvider }
