import { logger } from './logger'
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'
import {
  getFirestore, collection, doc, getDocs, setDoc,
  deleteDoc, onSnapshot, type Firestore, enableNetwork, disableNetwork,
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

export async function firestoreLoadCollection<T>(
  userId: string,
  collectionName: string,
): Promise<T[]> {
  if (!db) {
    logger.error(`[Firestore] db is null when loading ${collectionName} — Firebase not initialized`)
    return []
  }
  try {
    const snap = await getDocs(collection(db, 'users', userId, collectionName))
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as T))
    logger.log(`[Firestore] Loaded ${results.length} ${collectionName} for user ${userId.substring(0,8)}...`)
    return results
  } catch (e) {
    logger.error(`[Firestore] ERRO ao carregar ${collectionName}:`, e)
    return []
  }
}

export async function firestoreSaveDoc(
  userId: string,
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
): Promise<void> {
  if (!db) {
    logger.error(`[Firestore] db is null when saving ${collectionName}/${docId}`)
    return
  }
  try {
    await setDoc(doc(db, 'users', userId, collectionName, docId), data, { merge: true })
    logger.log(`[Firestore] Saved ${collectionName}/${docId}`)
  } catch (e) {
    logger.error(`[Firestore] ERRO ao salvar ${collectionName}/${docId}:`, e)
    throw e  // Propaga o erro pra quem chamou saber que falhou
  }
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
    logger.error(`[Firestore] Delete doc ${collectionName}/${docId}:`, e)
  }
}

export { GoogleAuthProvider }
