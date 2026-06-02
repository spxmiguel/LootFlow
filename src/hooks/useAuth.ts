import { logger } from '../lib/logger'
import { useEffect } from 'react'
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithCredential,
} from 'firebase/auth'
import { useStore } from '../store'
import { initFirebase, getGoogleProvider, isFirebaseReady, firestoreDeleteAllUserData } from '../lib/firebase'
import { FIREBASE_ENABLED, getActiveFirebaseConfig, hasFirebaseConfig } from '../lib/config'
import { storage } from '../lib/storage'
import type { AppUser } from '../lib/types'
import toast from 'react-hot-toast'

const SESSION_KEY = 'lootflow_session'
const REDIRECT_PENDING_KEY = 'lootflow_google_pending'
const POPUP_PENDING_KEY = 'lootflow_popup_pending'

let authListenerStarted = false
let redirectHandled = false
let redirectResultPending = false  // true while getRedirectResult() hasn't resolved yet

// Detect the electron-auth callback page (opened in the user's real browser)
const IS_ELECTRON_AUTH_PAGE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('electron-auth') === '1'

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface StoredSession { mode: 'local' | 'firebase'; user: AppUser; savedAt?: number }
type LoginResult = 'success' | 'redirect' | 'cancelled' | 'error'

function makeAppUser(fbUser: import('firebase/auth').User): AppUser {
  const providerProfile = fbUser.providerData.find(p => p.providerId === 'google.com')
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName ?? providerProfile?.displayName,
    photoURL: fbUser.photoURL ?? providerProfile?.photoURL,
    isAnonymous: false,
    provider: 'google',
  }
}

function saveSession(mode: 'local' | 'firebase', user: AppUser) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, user, savedAt: Date.now() })) } catch {}
}

// iOS Safari clears sessionStorage on cross-origin redirect — use localStorage instead
function setRedirectPending() {
  try { localStorage.setItem(REDIRECT_PENDING_KEY, '1') } catch {}
}

function clearRedirectPending() {
  try { localStorage.removeItem(REDIRECT_PENDING_KEY) } catch {}
}

function isRedirectPending(): boolean {
  try { return localStorage.getItem(REDIRECT_PENDING_KEY) === '1' } catch { return false }
}

export function useAuth() {
  const user = useStore(s => s.user)
  const authMode = useStore(s => s.authMode)
  const setUser = useStore(s => s.setUser)
  const setAuthMode = useStore(s => s.setAuthMode)
  const authReady = useStore(s => s.authReady)
  const setAuthReady = useStore(s => s.setAuthReady)
  const hydrate = useStore(s => s.hydrate)
  const hydrateCloud = useStore(s => s.hydrateCloud)

  useEffect(() => {
    const finishReady = () => setAuthReady(true)

    if (!FIREBASE_ENABLED) {
      finishReady()
    } else {
      const firebaseConfig = getActiveFirebaseConfig()
      if (!hasFirebaseConfig(firebaseConfig)) {
        finishReady()
      } else {
        try {
          const { auth } = initFirebase(firebaseConfig)

          // ── Redirect result ────────────────────────────────────────────────
          // Must be processed before registering onAuthStateChanged, so the
          // listener knows whether to wait or finalize immediately.
          if (!redirectHandled) {
            redirectHandled = true
            redirectResultPending = true

            getRedirectResult(auth)
              .then(result => {
                redirectResultPending = false
                if (result?.user) {
                  // ── Electron-auth page: extract Google tokens and deep-link back to Electron
                  if (IS_ELECTRON_AUTH_PAGE) {
                    clearRedirectPending()
                    const cred = GoogleAuthProvider.credentialFromResult(result)
                    if (cred?.idToken) {
                      window.location.href = `lootflow://auth?idToken=${encodeURIComponent(cred.idToken)}&accessToken=${encodeURIComponent(cred.accessToken ?? '')}`
                    } else {
                      // credentialFromResult gave no idToken — surface error to the page
                      ;(window as unknown as Record<string, unknown>).__electronAuthRedirectError = 'Google não retornou token. Tente novamente.'
                    }
                    return
                  }

                  clearRedirectPending()
                  const appUser = makeAppUser(result.user)
                  setUser(appUser)
                  setAuthMode('firebase')
                  saveSession('firebase', appUser)
                  hydrateCloud(appUser)
                    .then(() => toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`))
                    .catch(e => {
                      logger.error('[Auth] cloud hydration error after redirect:', e)
                      hydrate()
                      toast.error('Sincronização falhou. Verifique as regras do Firestore e os domínios autorizados no Firebase Console.', { duration: 8000 })
                    })
                    .finally(finishReady)
                } else {
                  // No pending redirect → clear flag and let onAuthStateChanged decide
                  clearRedirectPending()
                }
              })
              .catch(e => {
                redirectResultPending = false
                logger.error('[Auth] getRedirectResult error:', e)
                clearRedirectPending()
              })
          }

          // ── Auth state listener ────────────────────────────────────────────
          if (!authListenerStarted) {
            authListenerStarted = true

            onAuthStateChanged(auth, fbUser => {
              if (!fbUser) {
                // Don't finalize if a redirect or popup is still in flight —
                // the result handler will set the user when it resolves.
                if (isRedirectPending()) return
                if (redirectResultPending) return  // getRedirectResult() still running
                if (localStorage.getItem(POPUP_PENDING_KEY)) return
                clearRedirectPending()
                finishReady()
                return
              }

              // Popup completed (possibly after PWA was killed and restarted)
              localStorage.removeItem(POPUP_PENDING_KEY)
              clearRedirectPending()
              const appUser = makeAppUser(fbUser)
              setUser(appUser)
              setAuthMode('firebase')
              saveSession('firebase', appUser)
              hydrateCloud(appUser)
                .catch(e => {
                  logger.error('[Auth] cloud hydration error:', e)
                  hydrate()
                  toast.error('Sincronização falhou. Verifique as regras do Firestore e os domínios autorizados no Firebase Console.', { duration: 8000 })
                })
                .finally(finishReady)
            })
          }
        } catch (e) {
          logger.error('[Auth] Firebase init error:', e)
          setAuthReady(true)
        }
      }
    }

    // ── Restore saved session (local or Google) ────────────────────────
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return

      const session = JSON.parse(raw) as StoredSession

      // Expire sessions older than 30 days
      if (session.savedAt && Date.now() - session.savedAt > SESSION_MAX_AGE_MS) {
        localStorage.removeItem(SESSION_KEY)
        return
      }

      if (session.mode === 'local') {
        setUser(session.user)
        setAuthMode('local')
        hydrate()
        setAuthReady(true)
        return
      }

      if (session.mode === 'firebase' && FIREBASE_ENABLED) {
        // Restore user immediately for fast UX — show local data right away.
        // Do NOT call hydrateCloud here: the auth token isn't ready yet and
        // Firestore would return PERMISSION_DENIED. onAuthStateChanged fires
        // once the token is valid and handles the cloud sync from there.
        setUser(session.user)
        setAuthMode('firebase')
        hydrate()
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }

    const fallback = window.setTimeout(setAuthReady, 3000, true)
    return () => window.clearTimeout(fallback)
  }, [hydrate, hydrateCloud, setAuthMode, setAuthReady, setUser])

  // ── Login Local ──────────────────────────────────────────────────────
  const loginLocal = () => {
    const localUser: AppUser = {
      uid: 'local', displayName: 'Usuário Local',
      email: null, photoURL: null, isAnonymous: true, provider: 'local',
    }
    setUser(localUser)
    setAuthMode('local')
    hydrate()
    saveSession('local', localUser)
    toast.success('Modo offline ativado!')
  }

  // ── Login Google via Electron (browser auth) ─────────────────────────
  // Opens the user's real browser → GitHub Pages web app does OAuth →
  // browser redirects to lootflow://auth-callback?idToken=...
  // Electron main catches the URL and sends 'auth:credential' IPC.
  const loginGoogleViaElectron = (): Promise<LoginResult> => {
    if (!FIREBASE_ENABLED) {
      toast.error('Firebase não configurado.')
      return Promise.resolve('error')
    }
    if (!window.electronAPI?.openBrowserLogin) {
      toast.error('Atualize o app para usar login com Google.')
      return Promise.resolve('error')
    }
    return new Promise<LoginResult>((resolve) => {
      window.electronAPI!.openBrowserLogin()
      toast('Faça login no navegador que abriu...', { duration: 10000, icon: '🌐' })
      window.electronAPI!.removeAuthListener()
      window.electronAPI!.onAuthCredential(async ({ idToken, accessToken }) => {
        window.electronAPI!.removeAuthListener()
        try {
          const { auth } = initFirebase(getActiveFirebaseConfig())
          const credential = GoogleAuthProvider.credential(idToken, accessToken)
          const result = await signInWithCredential(auth, credential)
          const appUser = makeAppUser(result.user)
          setUser(appUser)
          setAuthMode('firebase')
          saveSession('firebase', appUser)
          await hydrateCloud(appUser)
          toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`)
          resolve('success')
        } catch (e: unknown) {
          const err = e as { code?: string }
          logger.error('[Auth] electron credential error:', e)
          toast.error(`Erro ao autenticar (${err?.code ?? 'desconhecido'})`)
          resolve('error')
        }
      })
    })
  }

  // ── Login Google + return raw Google tokens ───────────────────────────
  // Used by ElectronCallbackScreen (browser side of Epic Games flow).
  // Throws on failure so caller can inspect error code and fall back to redirect.
  const loginGoogleAndGetTokens = async (): Promise<{ idToken: string; accessToken: string | null }> => {
    if (!FIREBASE_ENABLED) throw new Error('Firebase não configurado.')
    const { auth } = initFirebase(getActiveFirebaseConfig())
    const provider = getGoogleProvider()
    const result = await signInWithPopup(auth, provider) // throws auth/* codes on failure
    const cred = GoogleAuthProvider.credentialFromResult(result)
    if (!cred?.idToken) throw new Error('Google não retornou token de identidade.')
    return { idToken: cred.idToken, accessToken: cred.accessToken ?? null }
  }

  // ── Fallback: start Google redirect for Electron auth ─────────────────
  // Called when signInWithPopup is blocked by the browser (e.g. Safari).
  // Sets the redirect-pending flag then navigates to Google OAuth.
  // On return, getRedirectResult() in useAuth handles the deep-link redirect.
  const loginGoogleViaRedirectForElectron = async (): Promise<void> => {
    if (!FIREBASE_ENABLED) throw new Error('Firebase não configurado.')
    const { auth } = initFirebase(getActiveFirebaseConfig())
    const provider = getGoogleProvider()
    setRedirectPending()
    await signInWithRedirect(auth, provider)
  }

  // ── Login Google ─────────────────────────────────────────────────────
  // Mobile browsers block cross-origin popups — use redirect directly.
  // Desktop: popup first, fall back to redirect on failure.
  const loginGoogle = async (): Promise<LoginResult> => {
    // In Electron: open the user's real browser instead of a popup
    if (window.electronAPI?.isElectron) return loginGoogleViaElectron()

    if (!FIREBASE_ENABLED) {
      toast.error('Firebase não configurado.')
      return 'error'
    }

    try {
      const { auth } = initFirebase(getActiveFirebaseConfig())
      const provider = getGoogleProvider()

      // signInWithRedirect is broken on iOS Safari (Firebase v9+ + ITP).
      // Use popup everywhere — on mobile it opens as a new tab, which works fine.
      // Only fallback to redirect if popup is explicitly blocked.

      try {
        // Save flag before opening popup so that if iOS kills the app while
        // the popup is open, onAuthStateChanged won't finalize as "logged out".
        try { localStorage.setItem(POPUP_PENDING_KEY, '1') } catch {}

        // Safari can leave a blocked popup "open" without ever throwing, which
        // makes signInWithPopup hang forever (spinner stuck). Race a timeout so
        // we can recover via redirect instead of leaving the user stuck.
        const POPUP_TIMEOUT = Symbol('popup-timeout')
        const result = await Promise.race([
          signInWithPopup(auth, provider),
          new Promise<typeof POPUP_TIMEOUT>(resolve =>
            window.setTimeout(() => resolve(POPUP_TIMEOUT), 20_000),
          ),
        ])
        if (result === POPUP_TIMEOUT) throw { code: 'auth/popup-blocked' }
        localStorage.removeItem(POPUP_PENDING_KEY)
        const appUser = makeAppUser(result.user)
        setUser(appUser)
        setAuthMode('firebase')
        saveSession('firebase', appUser)
        await hydrateCloud(appUser)
        toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`)
        return 'success'
      } catch (popupErr: unknown) {
        localStorage.removeItem(POPUP_PENDING_KEY)
        const code = (popupErr as { code?: string })?.code

        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          return 'cancelled'
        }

        // Popup explicitly blocked or internally failed (e.g. third-party cookies
        // blocked by browser) → use redirect
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/web-storage-unsupported' ||
          code === 'auth/internal-error'
        ) {
          logger.log('[Auth] Popup blocked, falling back to redirect…')
          setRedirectPending()
          signInWithRedirect(auth, provider).catch(e => {
            clearRedirectPending()
            logger.error('[Auth] redirect error:', e)
            toast.error('Não consegui abrir o login do Google.')
          })
          return 'redirect'
        }

        throw popupErr
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      logger.error('[Auth]', err?.code, err?.message)
      toast.error(`Erro ao fazer login (${err?.code ?? 'desconhecido'}). Tente novamente.`)
      return 'error'
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────
  const logout = () => {
    if (authMode === 'firebase' && isFirebaseReady()) {
      try {
        const { auth } = initFirebase(getActiveFirebaseConfig())
        signOut(auth).catch(() => {})
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(POPUP_PENDING_KEY)
    clearRedirectPending()
    setUser(null)
    toast.success('Até mais!')
  }

  // ── Delete Account ────────────────────────────────────────────────────
  // Apaga todos os dados do Firestore do usuário, limpa o localStorage
  // e faz logout. Não deleta a conta Google em si (requer reauth).
  const deleteAccount = async (): Promise<'success' | 'error'> => {
    try {
      if (user?.provider === 'google' && isFirebaseReady()) {
        await firestoreDeleteAllUserData(user.uid)
      }
      useStore.getState().reset()
      clearRedirectPending()
      if (isFirebaseReady()) {
        try {
          const { auth } = initFirebase(getActiveFirebaseConfig())
          await signOut(auth)
        } catch {}
      }
      setUser(null)
      toast.success('Conta e todos os dados apagados.')
      return 'success'
    } catch (e) {
      logger.error('[Auth] deleteAccount error:', e)
      toast.error('Erro ao apagar dados. Tente novamente.')
      return 'error'
    }
  }

  // ── Login Google via Device Code ─────────────────────────────────────
  // Called after watchDeviceCode resolves: signs into Firebase with the
  // Google credential tokens that the web app wrote to Firestore.
  const loginGoogleViaDeviceCode = async (idToken: string, accessToken: string): Promise<LoginResult> => {
    if (!FIREBASE_ENABLED) {
      toast.error('Firebase não configurado.')
      return 'error'
    }
    try {
      const { auth } = initFirebase(getActiveFirebaseConfig())
      const credential = GoogleAuthProvider.credential(idToken, accessToken || null)
      const result = await signInWithCredential(auth, credential)
      const appUser = makeAppUser(result.user)
      setUser(appUser)
      setAuthMode('firebase')
      saveSession('firebase', appUser)
      await hydrateCloud(appUser)
      toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`)
      return 'success'
    } catch (e: unknown) {
      const err = e as { code?: string }
      logger.error('[Auth] device code credential error:', e)
      toast.error(`Erro ao autenticar (${err?.code ?? 'desconhecido'})`)
      return 'error'
    }
  }

  return { user, authMode, authReady, isLoggedIn: !!user, loginLocal, loginGoogle, loginGoogleAndGetTokens, loginGoogleViaRedirectForElectron, loginGoogleViaDeviceCode, loginGoogleViaElectron: loginGoogleViaDeviceCode, logout, deleteAccount }
}
