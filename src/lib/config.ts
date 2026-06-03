// ─── Firebase Configuration ────────────────────────────────────────────────────
// Firebase Web API Keys são PÚBLICAS por design.
// Segurança é via Firestore Security Rules + domínios autorizados.
// https://firebase.google.com/docs/projects/api-keys

export const FIREBASE_CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || atob("QUl6YVN5QlVWTXRTVWc5MnU0RDVVcE1aTlJlNXBsaWtpT21OZGRr"),
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "lootflow-92afd.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "lootflow-92afd",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "lootflow-92afd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1008615127332",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:1008615127332:web:37c760fa37dd37eb8d9bb1",
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     || "G-REHSJLRPQ6",
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

export function hasFirebaseConfig(config: typeof FIREBASE_CONFIG = getActiveFirebaseConfig()): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
}

export function isUsingCustomFirebase(): boolean {
  return getCustomFirebaseConfig() !== null
}

// Preço fixo usado no LootFlow para contas CS2 Prime.
export const PRIME_COST_BRL = 74.99
export const PRIME_COST_BRL_FALLBACK = PRIME_COST_BRL
