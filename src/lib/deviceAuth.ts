/**
 * Device code authentication flow (similar to YouTube TV).
 *
 * 1. Electron generates a code and writes it to Firestore (device_codes/{code}).
 * 2. Electron shows the code on screen and polls for completion.
 * 3. User opens the LootFlow web app with ?device=CODE in the URL.
 * 4. Web app logs in with Google and writes the tokens to device_codes/{code}.
 * 5. Electron onSnapshot fires → reads tokens → signInWithCredential.
 */
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { initFirebase } from './firebase'
import { getActiveFirebaseConfig } from './config'
import { logger } from './logger'

export const DEVICE_CODE_TTL_MS = 5 * 60 * 1000 // 5 minutes

function getDB() {
  const { db } = initFirebase(getActiveFirebaseConfig())
  return db
}

// Generates a human-friendly 6-char code (no O/0/I/1/L confusion).
export function generateDeviceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

// Writes a pending code to Firestore. Called by the Electron app.
export async function createDeviceCode(code: string): Promise<void> {
  const db = getDB()
  await setDoc(doc(db, 'device_codes', code), {
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + DEVICE_CODE_TTL_MS).toISOString(),
  })
}

// Watches the code for completion. Returns an unsubscribe function.
export function watchDeviceCode(
  code: string,
  onAuth: (tokens: { idToken: string; accessToken: string }) => void,
  onExpired: () => void,
): () => void {
  const db = getDB()
  return onSnapshot(doc(db, 'device_codes', code), snap => {
    if (!snap.exists()) { onExpired(); return }
    const data = snap.data()
    if (new Date(data.expiresAt) < new Date()) { onExpired(); return }
    if (data.status === 'authenticated' && data.idToken) {
      onAuth({ idToken: data.idToken, accessToken: data.accessToken ?? '' })
    }
  })
}

// Completes the flow. Called by the web app after Google login.
export async function completeDeviceAuth(
  code: string,
  idToken: string,
  accessToken: string,
): Promise<void> {
  const db = getDB()
  await setDoc(
    doc(db, 'device_codes', code),
    { status: 'authenticated', idToken, accessToken, authenticatedAt: new Date().toISOString() },
    { merge: true },
  )
}

// Cleans up the code after use.
export async function cleanupDeviceCode(code: string): Promise<void> {
  try {
    const db = getDB()
    await deleteDoc(doc(db, 'device_codes', code))
  } catch (e) {
    logger.error('[DeviceAuth] cleanup error:', e)
  }
}
