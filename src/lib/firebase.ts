import { logger } from './logger'
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  getFirestore, collection, doc, getDocs, setDoc,
  deleteDoc, type Firestore,
} from 'firebase/firestore'
import type { FirebaseConfig } from './types'

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
    auth = getAuth(app)
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
  await setDoc(doc(db, 'users', userId, collectionName, docId), data, { merge: true })
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
  const cols = ['accounts', 'drops', 'goals', 'settings', '_test']
  const results = await Promise.allSettled(cols.map(async col => {
    const snap = await getDocs(collection(db!, 'users', userId, col))
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
  }))
  const failed = results.filter(r => r.status === 'rejected')
  if (failed.length > 0) {
    throw new Error(`Falha ao apagar ${failed.length}/${cols.length} coleções do Firestore`)
  }
}

export { GoogleAuthProvider }
