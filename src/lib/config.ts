// ─── Firebase Configuration ────────────────────────────────────────────────────
// Firebase Web API Keys são PÚBLICAS por design.
// Segurança é via Firestore Security Rules + domínios autorizados.
// https://firebase.google.com/docs/projects/api-keys

export const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBcbwBlfW_SBINVVLbxkDrpiLF_ArKJ1xM",
  authDomain:        "kkkkkkkk-3fc45.firebaseapp.com",
  projectId:         "kkkkkkkk-3fc45",
  storageBucket:     "kkkkkkkk-3fc45.firebasestorage.app",
  messagingSenderId: "529544539876",
  appId:             "1:529544539876:web:fdd4832e4096f0e465c6f1",
  measurementId:     "G-W34TK015CG",
}

export const FIREBASE_ENABLED = true

// Preço fixo usado no LootFlow para contas CS2 Prime.
export const PRIME_COST_BRL = 74.99
export const PRIME_COST_BRL_FALLBACK = PRIME_COST_BRL
