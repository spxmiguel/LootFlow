import { logger } from './logger'
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { initializeAuth, getAuth, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc,
  deleteDoc, type Firestore,
} from 'firebase/firestore'
import type { FirebaseConfig, PublicProfileSummary } from './types'

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

export async function firestoreLoadPublicProfiles(uids: string[]): Promise<PublicProfileSummary[]> {
  const unique = [...new Set(uids)].filter(Boolean)
  const profiles = await Promise.all(unique.map(uid => firestoreLoadPublicProfile(uid).catch(() => null)))
  return profiles.filter((profile): profile is PublicProfileSummary => profile !== null)
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
  await Promise.allSettled([
    deleteDoc(publicProfileRef),
    friendCode ? deleteDoc(doc(db, 'friendCodes', friendCode.toUpperCase())) : Promise.resolve(),
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
