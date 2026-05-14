import { logger } from '../lib/logger'
import { useEffect } from 'react'
import {
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged,
} from 'firebase/auth'
import { useStore } from '../store'
import { initFirebase, getGoogleProvider, isFirebaseReady } from '../lib/firebase'
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from '../lib/config'
import type { AppUser } from '../lib/types'
import toast from 'react-hot-toast'

const SESSION_KEY = 'lootflow_session'
let authInitDone = false
let loginInProgress = false  // Prevents double hydration

interface StoredSession { mode: 'local' | 'firebase'; user: AppUser }

function makeAppUser(fbUser: import('firebase/auth').User): AppUser {
  const p = fbUser.providerData.find(d => d.providerId === 'google.com')
  return {
    uid: fbUser.uid, email: fbUser.email,
    displayName: fbUser.displayName ?? p?.displayName,
    photoURL: fbUser.photoURL ?? p?.photoURL,
    isAnonymous: false, provider: 'google',
  }
}

function saveSession(mode: 'local' | 'firebase', user: AppUser) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ mode, user })) } catch {}
}

function shouldUseRedirect(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return /android|iphone|ipad|ipod|mobile/i.test(ua) ||
    window.matchMedia?.('(pointer: coarse)').matches ||
    window.matchMedia?.('(max-width: 768px)').matches
}

export function useAuth() {
  const user = useStore(s => s.user)
  const authMode = useStore(s => s.authMode)
  const setUser = useStore(s => s.setUser)
  const setAuthMode = useStore(s => s.setAuthMode)
  const setAuthReady = useStore(s => s.setAuthReady)
  const hydrate = useStore(s => s.hydrate)
  const hydrateCloud = useStore(s => s.hydrateCloud)

  useEffect(() => {
    if (authInitDone) return
    authInitDone = true

    const finish = () => setAuthReady(true)

    // ── Restaurar sessão local primeiro (resposta imediata) ─────────────
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) {
        const session = JSON.parse(raw) as StoredSession
        if (session.mode === 'local') {
          setUser(session.user)
          setAuthMode('local')
          hydrate()
          finish()
          return  // Local mode — sem Firebase
        }
        if (session.mode === 'firebase') {
          // Mostra dados locais imediatamente enquanto verifica Firebase
          setUser(session.user)
          setAuthMode('firebase')
          hydrate()
        }
      }
    } catch { localStorage.removeItem(SESSION_KEY) }

    // ── Firebase auth ───────────────────────────────────────────────────
    if (!FIREBASE_ENABLED) { finish(); return }

    try {
      const { auth } = initFirebase(FIREBASE_CONFIG)

      // Checar redirect (mobile Google login retorno)
      getRedirectResult(auth).then(async result => {
        if (result?.user) {
          loginInProgress = true
          const appUser = makeAppUser(result.user)
          setUser(appUser)
          setAuthMode('firebase')
          saveSession('firebase', appUser)
          try {
            await hydrateCloud(appUser)
            toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`)
          } catch {
            hydrate()
            toast.error('Login OK, mas erro ao sincronizar.')
          }
          loginInProgress = false
          finish()
        }
      }).catch(e => logger.error('[Auth] redirect:', e))

      // Listener permanente — verifica token e sincroniza
      onAuthStateChanged(auth, async (fbUser) => {
        if (!fbUser) {
          // Não logado no Firebase
          const cur = useStore.getState().user
          if (cur?.provider === 'google') {
            // Token expirou
            localStorage.removeItem(SESSION_KEY)
            setUser(null)
          }
          finish()
          return
        }

        // Logado no Firebase
        const appUser = makeAppUser(fbUser)
        setUser(appUser)
        setAuthMode('firebase')
        saveSession('firebase', appUser)

        // Só faz hydration se loginGoogle/redirect não já fez
        if (!loginInProgress) {
          try {
            await hydrateCloud(appUser)
          } catch {
            hydrate()
          }
        }
        finish()
      })

      // Timeout de segurança
      setTimeout(finish, 4000)
    } catch (e) {
      logger.error('[Auth] init:', e)
      finish()
    }
  }, [hydrate, hydrateCloud, setAuthMode, setAuthReady, setUser])

  // ── Login Local ─────────────────────────────────────────────────────
  const loginLocal = () => {
    const u: AppUser = {
      uid: 'local', displayName: 'Usuário Local',
      email: null, photoURL: null, isAnonymous: true, provider: 'local',
    }
    setUser(u); setAuthMode('local'); hydrate()
    saveSession('local', u)
    toast.success('Modo offline ativado!')
  }

  // ── Login Google ────────────────────────────────────────────────────
  const loginGoogle = async () => {
    if (!FIREBASE_ENABLED) { toast.error('Firebase não configurado.'); return 'error' }
    loginInProgress = true
    try {
      const { auth } = initFirebase(FIREBASE_CONFIG)
      const provider = getGoogleProvider()

      if (shouldUseRedirect()) {
        try { sessionStorage.setItem('lootflow_google_pending', '1') } catch {}
        await signInWithRedirect(auth, provider)
        return 'redirect'
      }

      try {
        const result = await signInWithPopup(auth, provider)
        const appUser = makeAppUser(result.user)
        setUser(appUser)
        setAuthMode('firebase')
        saveSession('firebase', appUser)
        toast.loading('Sincronizando dados...', { id: 'sync' })
        await hydrateCloud(appUser)
        toast.success(`Bem-vindo, ${result.user.displayName?.split(' ')[0] ?? 'usuário'}!`, { id: 'sync' })
        return 'success'
      } catch (pe: unknown) {
        const code = (pe as { code?: string })?.code
        if (code === 'auth/popup-closed-by-user') return 'cancelled'
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
          try { sessionStorage.setItem('lootflow_google_pending', '1') } catch {}
          await signInWithRedirect(auth, provider)
          return 'redirect'
        }
        throw pe
      }
    } catch (e: unknown) {
      logger.error('[Auth]', e)
      toast.error('Erro ao fazer login com Google.')
      return 'error'
    } finally {
      loginInProgress = false
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────
  const logout = () => {
    if (authMode === 'firebase' && isFirebaseReady()) {
      try { const { auth } = initFirebase(FIREBASE_CONFIG); signOut(auth).catch(() => {}) } catch {}
    }
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    toast.success('Até mais!')
  }

  return {
    user, authMode,
    authReady: useStore(s => s.authReady),
    isLoggedIn: !!user,
    loginLocal, loginGoogle, logout,
  }
}
