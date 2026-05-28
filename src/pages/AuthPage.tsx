import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, UserCircle2, Loader2, Shield, X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { FIREBASE_ENABLED } from '../lib/config'
import { LegalModal, type LegalType } from '../components/LegalModal'
import { completeDeviceAuth } from '../lib/deviceAuth'

const CONSENT_KEY = 'lootflow_google_consent'

const params = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search)
  : new URLSearchParams()

// ?device=CODE  → web app authorizes a waiting Electron device-code session
const DEVICE_PARAM = params.get('device')
// ?electron-auth=1 → Epic Games callback: do Google login here, redirect back to Electron
const ELECTRON_AUTH = params.get('electron-auth') === '1'

// ── Electron callback screen ───────────────────────────────────────────────
// User's real browser opened here. Two auth paths:
//   1. Popup:   click → signInWithPopup → tokens → lootflow://auth?idToken=...
//   2. Redirect: popup blocked (Safari) → signInWithRedirect → Google → back here
//      → useAuth.getRedirectResult intercepts → deep-links to Electron automatically.
function ElectronCallbackScreen() {
  const { loginGoogleAndGetTokens, loginGoogleViaRedirectForElectron } = useAuth()
  // If redirect was pending when the page loaded, useAuth is already processing it.
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(() => {
    try {
      if (localStorage.getItem('lootflow_google_pending') === '1') return 'loading'
    } catch {}
    return 'idle'
  })
  const [errorMsg, setErrorMsg] = useState('')

  // Check if useAuth surfaced a redirect error (credentialFromResult returned no idToken)
  useEffect(() => {
    const err = (window as { __electronAuthRedirectError?: string }).__electronAuthRedirectError
    if (err) {
      delete (window as { __electronAuthRedirectError?: string }).__electronAuthRedirectError
      setErrorMsg(err)
      setStatus('error')
    }
  }, [])

  async function handleAuth() {
    setStatus('loading')
    try {
      const tokens = await loginGoogleAndGetTokens()
      // Redirect back to Electron via deep link
      const redirect = `lootflow://auth?idToken=${encodeURIComponent(tokens.idToken)}&accessToken=${encodeURIComponent(tokens.accessToken ?? '')}`
      window.location.href = redirect
      setStatus('done')
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      // Popup blocked or not supported → fall back to redirect (works in all browsers)
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/web-storage-unsupported'
      ) {
        try {
          await loginGoogleViaRedirectForElectron()
          // page navigates away; code below won't run
        } catch (re) {
          setErrorMsg((re as { message?: string })?.message ?? 'Erro ao redirecionar')
          setStatus('error')
        }
        return
      }
      // User closed popup → back to idle
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setStatus('idle')
        return
      }
      setErrorMsg((e as { message?: string })?.message ?? 'Erro desconhecido')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <img src="../icon.svg" className="w-16 h-16 rounded-2xl mx-auto mb-6" alt="LootFlow" />
        <h1 className="font-display text-2xl font-bold text-slate-100 mb-2">Autorizar LootFlow</h1>
        <p className="text-sm text-slate-500 mb-8">
          Faça login com sua conta Google para sincronizar seus dados no app.
        </p>

        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Processando login...</span>
          </div>
        )}

        {status === 'done' && (
          <div className="text-center">
            <p className="text-sm text-green-400 mb-1">✅ Login realizado!</p>
            <p className="text-xs text-slate-500">Pode fechar esta aba e voltar para o app.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <p className="text-sm text-red-400 mb-3">{errorMsg}</p>
            <button
              onClick={handleAuth}
              className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {status === 'idle' && (
          <button
            onClick={handleAuth}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-2xl font-semibold text-sm transition-all"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 15%, transparent)',
              color: 'var(--color-primary, #38bdf8)',
              border: '1px solid color-mix(in srgb, var(--color-primary, #38bdf8) 30%, transparent)',
            }}
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
            Entrar com Google
          </button>
        )}
      </div>
    </div>
  )
}

// ── Device callback screen (web → Electron device code) ───────────────────
function DeviceCallbackScreen() {
  const { loginGoogleAndGetTokens } = useAuth()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const code = DEVICE_PARAM!

  useEffect(() => {
    handleAuth()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleAuth() {
    setStatus('loading')
    try {
      const tokens = await loginGoogleAndGetTokens()
      await completeDeviceAuth(code, tokens.idToken, tokens.accessToken ?? '')
      setStatus('done')
    } catch (e: unknown) {
      setErrorMsg((e as { message?: string })?.message ?? 'Erro desconhecido')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <img src="../icon.svg" className="w-16 h-16 rounded-2xl mx-auto mb-6" alt="LootFlow" />
        {status === 'loading' && (
          <>
            <h1 className="font-display text-2xl font-bold text-slate-100 mb-2">Autorizando LootFlow</h1>
            <p className="text-sm text-slate-500 mb-6">Fazendo login com Google...</p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </>
        )}
        {status === 'done' && (
          <>
            <h1 className="font-display text-2xl font-bold text-slate-100 mb-2">✅ Autorizado!</h1>
            <p className="text-sm text-slate-500">Pode fechar essa aba e voltar pro app.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="font-display text-2xl font-bold text-red-400 mb-2">Erro</h1>
            <p className="text-sm text-slate-500 mb-4">{errorMsg}</p>
            <button onClick={handleAuth} className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors">
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage({ onBack: _ }: { onBack?: () => void }) {
  const { loginLocal, loginGoogle, loginGoogleViaElectron } = useAuth()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [waitingBrowser, setWaitingBrowser] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalType | null>(null)

  const hasFirebase = FIREBASE_ENABLED

  // Callback screens
  if (ELECTRON_AUTH) return <ElectronCallbackScreen />
  if (DEVICE_PARAM) return <DeviceCallbackScreen />

  // Strict equality — preload sets isElectron: true as const
  const inElectron = window.electronAPI?.isElectron === true

  const handleGoogleClick = async () => {
    // ── Electron: direct IPC — intentionally bypasses loginGoogle() to
    //    prevent any accidental fallthrough to the web popup path ──────────
    if (inElectron) {
      if (!window.electronAPI?.openBrowserLogin) {
        toast.error('Atualize o app para usar login com Google.')
        return
      }
      setWaitingBrowser(true)
      window.electronAPI.removeAuthListener()   // clear any stale listener
      window.electronAPI.openBrowserLogin()     // opens real browser
      window.electronAPI.onAuthCredential(async ({ idToken, accessToken }) => {
        window.electronAPI!.removeAuthListener()
        setWaitingBrowser(false)
        if (!idToken) { toast.error('Token inválido. Tente novamente.'); return }
        await loginGoogleViaElectron(idToken, accessToken ?? '')
      })
      return
    }

    // ── Web: popup/redirect ───────────────────────────────────────────────
    if (localStorage.getItem(CONSENT_KEY) === 'true') {
      doGoogleLogin()
    } else {
      setShowConsent(true)
    }
  }

  const doGoogleLogin = async () => {
    setShowConsent(false)
    localStorage.setItem(CONSENT_KEY, 'true')
    setLoadingGoogle(true)
    const result = await loginGoogle()
    if (result === 'redirect') {
      window.setTimeout(() => setLoadingGoogle(false), 6000)
      return
    }
    setLoadingGoogle(false)
  }

  const cancelBrowser = () => {
    window.electronAPI?.removeAuthListener?.()
    setWaitingBrowser(false)
  }

  return (
    <>
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="bg-texture" aria-hidden="true" />
        {!inElectron && (
          <a
            href="https://spxmiguel.github.io/LootFlow/"
            className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#11161d]/85 px-3 py-2 text-xs font-medium text-slate-400 backdrop-blur hover:text-slate-100 hover:border-white/[0.12] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </a>
        )}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px]"
            style={{ backgroundColor: 'rgba(16,185,129,0.08)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Logo */}
          <div className="text-center mb-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 overflow-hidden"
            >
              <img src="../icon.svg" className="w-full h-full" alt="LootFlow" />
            </motion.div>
            <h1 className="font-display text-3xl font-extrabold text-slate-100 leading-tight">LootFlow</h1>
            <p className="text-sm text-slate-500 mt-2">Analytics premium de drops CS2 · Prime Weekly</p>
          </div>

          <div className="space-y-3">
            {/* Visitor */}
            <motion.button
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={loginLocal}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#11161d] border border-white/[0.09] hover:bg-[#111827] hover:border-white/[0.15] transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#111827] flex items-center justify-center shrink-0 group-hover:bg-[#1a2235] transition-colors">
                <UserCircle2 className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-200 text-sm">Entrar como Visitante</p>
                <p className="text-xs text-slate-500 mt-0.5">Dados salvos localmente · sem conta</p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#1a2235] text-xs text-slate-300 font-medium shrink-0">Entrar</div>
            </motion.button>

            {/* Google */}
            <motion.button
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleGoogleClick}
              disabled={loadingGoogle || waitingBrowser || !hasFirebase}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 25%, transparent)',
              }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 15%, transparent)' }}>
                {loadingGoogle || waitingBrowser
                  ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary, #38bdf8)' }} />
                  : <ExternalLink className="w-5 h-5" style={{ color: 'var(--color-primary, #38bdf8)' }} />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-200 text-sm">Entrar com Google</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {waitingBrowser
                    ? 'Aguardando login no navegador...'
                    : 'Sync na nuvem · acesso em qualquer dispositivo'}
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl text-xs font-medium shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 15%, transparent)',
                  color: 'var(--color-primary, #38bdf8)',
                }}>
                {waitingBrowser ? '...' : loadingGoogle ? '...' : 'Entrar'}
              </div>
            </motion.button>

            {/* Cancel waiting for browser */}
            <AnimatePresence>
              {waitingBrowser && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <button
                    onClick={cancelBrowser}
                    className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors py-1"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Web consent panel */}
            <AnimatePresence>
              {showConsent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-2xl bg-[#11161d] border border-white/[0.12]">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-primary shrink-0 mt-0.5" />
                        <p className="text-sm font-semibold text-slate-200">Antes de continuar</p>
                      </div>
                      <button onClick={() => setShowConsent(false)} className="text-slate-600 hover:text-slate-400 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-5 mb-3">
                      Ao entrar com Google, o LootFlow receberá:{' '}
                      <strong className="text-slate-300">e-mail, nome e foto de perfil</strong>.
                      Usados apenas para identificar sua conta e sincronizar dados no Firestore.
                    </p>
                    <p className="text-xs text-slate-500 leading-5 mb-4">
                      Você pode desativar o sync ou apagar seus dados em{' '}
                      <strong className="text-slate-400">Configurações → Privacidade</strong>.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={doGoogleLogin}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 20%, transparent)',
                          color: 'var(--color-primary, #38bdf8)',
                        }}
                      >
                        Entendi, continuar
                      </button>
                      <button
                        onClick={() => setShowConsent(false)}
                        className="flex-1 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-xs text-slate-400 font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                    <p className="text-center mt-3">
                      <button
                        onClick={() => setLegalModal('privacy')}
                        className="text-[11px] text-slate-600 hover:text-slate-400 underline underline-offset-2 transition-colors"
                      >
                        Ver Política de Privacidade completa
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8 space-y-2"
          >
            <p className="text-[11px] text-slate-700">
              {hasFirebase
                ? 'Visitante salva dados só no dispositivo. Google sincroniza na nuvem.'
                : 'Firebase não configurado — apenas modo Visitante disponível.'}
            </p>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-700">
              <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-500 transition-colors underline underline-offset-2">Privacidade</button>
              <span>·</span>
              <button onClick={() => setLegalModal('terms')} className="hover:text-slate-500 transition-colors underline underline-offset-2">Termos de Uso</button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
