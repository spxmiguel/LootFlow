import { logger } from '../lib/logger'
import { useEffect } from 'react'
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
} from 'firebase/auth'
import { useStore } from '../store'
import { initFirebase, getGoogleProvider, isFirebaseReady } from '../lib/firebase'
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from '../lib/config'
import { storage } from '../lib/storage'
import type { AppUser } from '../lib/types'
import toast from 'react-hot-toast'

const SESSION_KEY = 'lootflow_session'
let authListenerStarted = false
let redirectHandled = false

interface StoredSession { mode: 'local' | 'firebase'; user: AppUser }
type LoginResult = 'success' | 'redirect' | 'cancelled' | 'error'

function makeAppUser(fbUser: import('firebase/auth').User): AppUser {
  const providerProfile = fbUser.providerData.find(p => p.providerId === 'google.com')
  return {
    uid: fbUser.uid, email: fbUser.email,
    displayName: fbUser.displayName ?? providerProfile?.displayName,
    photoURL: fbUser.photoURL ?? providerProfile?.photoURL,
    isAnonymous: false, provider: 'google',
  }
}

function saveSession(mode: 'local' | 'firebase', user: AppUser) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, user })) } catch {}
}

function savePendingGoogleLogin() {
  try { sessionStorage.setItem('lootflow_google_pending', '1') } catch {}
}

function clearPendingGoogleLogin() {
  try { sessionStorage.removeItem('lootflow_google_pending') } catch {}
}

function shouldUseRedirectLogin(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent.toLowerCase()
  const isTouch = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const isSmallScreen = window.matchMedia?.('(max-width: 768px)').matches ?? false
  const isMobileUA = /android|iphone|ipad|ipod|mobile/.test(ua)
  return isTouch || isSmallScreen || isMobileUA
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
    const finishReady = () => {
      setAuthReady(true)
    }

    // ── PASSO 1: Checar Firebase/redirect do Google ────────────────────
    if (FIREBASE_ENABLED) {
      try {
        const { auth } = initFirebase(FIREBASE_CONFIG)

        // getRedirectResult só retorna algo se o usuário acabou de voltar de redirect.
        if (!redirectHandled) {
          redirectHandled = true
          getRedirectResult(auth).then(result => {
          if (result?.user) {
            clearPendingGoogleLogin()
            const appUser = makeAppUser(result.user)
            setUser(appUser)
            setAuthMode('firebase')
            saveSession('firebase', appUser)
            hydrateCloud(appUser)
              .then(() => toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`))
              .catch(e => {
                logger.error('[Auth] cloud hydration error:', e)
                hydrate()
                toast.error('Login feito, mas não consegui sincronizar a nuvem agora.')
              })
          }
          }).catch(e => {
            logger.error('[Auth] redirect result error:', e)
          })
        }

        // Listener é a fonte confiável depois de redirect/reload.
        if (!authListenerStarted) {
          authListenerStarted = true
          onAuthStateChanged(auth, (fbUser) => {
            if (!fbUser) {
              clearPendingGoogleLogin()
              finishReady()
              return
            }
            clearPendingGoogleLogin()
            const appUser = makeAppUser(fbUser)
            setUser(appUser)
            setAuthMode('firebase')
            saveSession('firebase', appUser)
            hydrateCloud(appUser).catch(e => {
              logger.error('[Auth] cloud hydration error:', e)
              hydrate()
            }).finally(finishReady)
          })
        }
      } catch (e) {
        logger.error('[Auth] Firebase init error:', e)
        finishReady()
      }
    } else {
      finishReady()
    }

    // ── PASSO 2: Restaurar sessão do localStorage ───────────────────────
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (!raw) return

      const session = JSON.parse(raw) as StoredSession

      if (session.mode === 'local') {
        setUser(session.user)
        setAuthMode('local')
        hydrate()
        finishReady()
        return
      }

      if (session.mode === 'firebase' && FIREBASE_ENABLED) {
        // Restaura imediatamente com dados salvos (UX rápida)
        // O onAuthStateChanged acima vai verificar o token assincronamente
        setUser(session.user)
        setAuthMode('firebase')
        hydrate()
        hydrateCloud(session.user).catch(e => logger.error('[Auth] cloud hydration error:', e))
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }

    const fallback = window.setTimeout(finishReady, 2500)
    return () => {
      window.clearTimeout(fallback)
    }
  }, [hydrate, hydrateCloud, setAuthMode, setAuthReady, setUser])

  // ── Login Local (convidado) ───────────────────────────────────────────
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

  // ── Login Google ──────────────────────────────────────────────────────
  const loginGoogle = async (): Promise<LoginResult> => {
    if (!FIREBASE_ENABLED) {
      toast.error('Firebase não configurado.')
      return 'error'
    }
    try {
      const { auth } = initFirebase(FIREBASE_CONFIG)
      const provider = getGoogleProvider()

      if (shouldUseRedirectLogin()) {
        logger.log('[Auth] Mobile/touch environment, using redirect...')
        savePendingGoogleLogin()
        signInWithRedirect(auth, provider).catch(e => {
          clearPendingGoogleLogin()
          logger.error('[Auth] redirect start error:', e)
          toast.error('Não consegui abrir o login do Google.')
        })
        return 'redirect'
      }

      // Tenta popup primeiro — funciona em desktop e alguns mobiles
      try {
        const result = await signInWithPopup(auth, provider)
        const appUser = makeAppUser(result.user)
        setUser(appUser)
        setAuthMode('firebase')
        saveSession('firebase', appUser)
        await hydrateCloud(appUser)
        toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`)
        return 'success'
      } catch (popupErr: unknown) {
        const code = (popupErr as { code?: string })?.code
        if (code === 'auth/popup-closed-by-user') return 'cancelled'
        // Popup bloqueado ou falhou → usa redirect (mobile-friendly)
        if (
          code === 'auth/popup-blocked' ||
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/web-storage-unsupported'
        ) {
          logger.log('[Auth] Popup blocked, using redirect...')
          savePendingGoogleLogin()
          signInWithRedirect(auth, provider).catch(e => {
            clearPendingGoogleLogin()
            logger.error('[Auth] redirect start error:', e)
            toast.error('Não consegui abrir o login do Google.')
          })
          // Página vai recarregar. getRedirectResult no useEffect trata o retorno.
          return 'redirect'
        }
        throw popupErr
      }
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      logger.error('[Auth]', err?.code, err?.message)
      toast.error('Erro ao fazer login com Google. Tente novamente.')
      return 'error'
    }
  }

  // ── Logout ────────────────────────────────────────────────────────────
  const logout = () => {
    if (authMode === 'firebase' && isFirebaseReady()) {
      try {
        const { auth } = initFirebase(FIREBASE_CONFIG)
        signOut(auth).catch(() => {})
      } catch {}
    }
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    toast.success('Até mais!')
  }

  return { user, authMode, authReady, isLoggedIn: !!user, loginLocal, loginGoogle, logout }
}
