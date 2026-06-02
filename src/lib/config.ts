// ─── Firebase Configuration ────────────────────────────────────────────────────
// Firebase Web API Keys são PÚBLICAS por design.
// Segurança é via Firestore Security Rules + domínios autorizados.
// https://firebase.google.com/docs/projects/api-keys

export const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? "",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? "",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? "",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? "",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     ?? "",
}

export const FIREBASE_ENABLED = true

export const CUSTOM_FIREBASE_KEY = 'lootflow_custom_firebase'

export function getCustomFirebaseConfig(): typeof FIREBASE_CONFIG | null {
  try {
    const raw = localStorage.getItem(CUSTOM_FIREBASE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw)
    if (c.apiKey && c.authDomain && c.projectId && c.appId) return c
  } catch {}
  return null
}

export function getActiveFirebaseConfig(): typeof FIREBASE_CONFIG {
  return getCustomFirebaseConfig() ?? FIREBASE_CONFIG
}

export function isUsingCustomFirebase(): boolean {
  return getCustomFirebaseConfig() !== null
}

// Preço fixo usado no LootFlow para contas CS2 Prime.
export const PRIME_COST_BRL = 74.99
export const PRIME_COST_BRL_FALLBACK = PRIME_COST_BRL
