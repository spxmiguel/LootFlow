import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, UserCircle2, Loader2, Shield, X, RefreshCw, Monitor } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { FIREBASE_ENABLED } from '../lib/config'
import { LegalModal, type LegalType } from '../components/LegalModal'
import {
  generateDeviceCode, createDeviceCode, watchDeviceCode,
  cleanupDeviceCode, completeDeviceAuth, DEVICE_CODE_TTL_MS,
} from '../lib/deviceAuth'

const CONSENT_KEY = 'lootflow_google_consent'
const IS_ELECTRON = typeof window !== 'undefined' && !!window.electronAPI?.isElectron

// Web app opened with ?device=CODE → authorize a waiting Electron session
const DEVICE_PARAM = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('device')
  : null

const DEVICE_AUTH_URL = 'spxmiguel.github.io/LootFlow/app'

// ── Device callback mode (web) ────────────────────────────────────────────────
// When the user opens the web app with ?device=CODE, show a simple
// "Autorizar LootFlow" screen, do Google login, write tokens to Firestore.
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
      if (!tokens?.idToken) throw new Error('Nenhum token retornado.')
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
            <button
              onClick={handleAuth}
              className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              Tentar novamente
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Electron device code panel ────────────────────────────────────────────────
function DeviceCodePanel({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { loginGoogleViaDeviceCode } = useAuth()
  const [code, setCode] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(Math.floor(DEVICE_CODE_TTL_MS / 1000))
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCode = async () => {
    setGenerating(true)
    unsubRef.current?.()
    if (timerRef.current) clearInterval(timerRef.current)

    const newCode = generateDeviceCode()
    try {
      await createDeviceCode(newCode)
    } catch {
      setGenerating(false)
      return
    }

    setCode(newCode)
    setSecondsLeft(Math.floor(DEVICE_CODE_TTL_MS / 1000))
    setGenerating(false)

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!)
          setCode('')
          return 0
        }
        return s - 1
      })
    }, 1000)

    // Watch Firestore for auth completion
    unsubRef.current = watchDeviceCode(
      newCode,
      async ({ idToken, accessToken }) => {
        unsubRef.current?.()
        clearInterval(timerRef.current!)
        setDone(true)
        await loginGoogleViaDeviceCode(idToken, accessToken)
        cleanupDeviceCode(newCode)
        onSuccess()
      },
      () => {
        clearInterval(timerRef.current!)
        setCode('')
        setSecondsLeft(0)
      },
    )
  }

  useEffect(() => {
    startCode()
    return () => {
      unsubRef.current?.()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const secs = String(secondsLeft % 60).padStart(2, '0')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-4 rounded-2xl bg-[#11161d] border border-white/[0.12]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-primary shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-slate-200">Autorizar pelo navegador</p>
          </div>
          <button onClick={onCancel} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
            <p className="text-xs text-slate-400">Autenticando...</p>
          </div>
        ) : generating ? (
          <div className="text-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500 mx-auto" />
          </div>
        ) : code ? (
          <>
            <p className="text-xs text-slate-400 mb-3">
              No seu celular ou computador, acesse:
            </p>
            <div className="bg-black/30 rounded-lg px-3 py-2 mb-3 text-center">
              <p className="text-xs text-slate-400 font-mono">{DEVICE_AUTH_URL}</p>
            </div>
            <p className="text-xs text-slate-400 mb-2 text-center">e insira o código:</p>
            <div className="flex items-center justify-center gap-1 mb-3">
              {code.split('').map((ch, i) => (
                <span
                  key={i}
                  className="w-9 h-11 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.12] text-xl font-bold text-slate-100 font-mono tracking-wider"
                >
                  {ch}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-xs font-mono ${secondsLeft < 60 ? 'text-red-400' : 'text-slate-600'}`}>
                ⏱ {mins}:{secs}
              </p>
              <button
                onClick={startCode}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                <RefreshCw size={10} /> Novo código
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-slate-500 mb-2">Código expirado.</p>
            <button
              onClick={startCode}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mx-auto"
            >
              <RefreshCw size={10} /> Gerar novo código
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────
export default function AuthPage({ onBack }: { onBack?: () => void }) {
  const { loginLocal, loginGoogle } = useAuth()
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const [showDeviceCode, setShowDeviceCode] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalType | null>(null)

  const hasFirebase = FIREBASE_ENABLED

  // Web: ?device=CODE → authorize Electron session
  if (DEVICE_PARAM) {
    return <DeviceCallbackScreen />
  }

  const handleGoogleClick = () => {
    if (IS_ELECTRON) {
      // Electron: show device code panel instead of opening browser
      setShowDeviceCode(true)
      return
    }
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

  return (
    <>
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}

      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="bg-texture" aria-hidden="true" />
        {!IS_ELECTRON && (
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

          {/* Options */}
          <div className="space-y-3">
            {/* Anonymous */}
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
              <div className="px-3 py-1.5 rounded-xl bg-[#1a2235] text-xs text-slate-300 font-medium shrink-0">
                Entrar
              </div>
            </motion.button>

            {/* Google / Device Code */}
            <motion.button
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleGoogleClick}
              disabled={loadingGoogle || !hasFirebase || showDeviceCode}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 25%, transparent)',
              }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 15%, transparent)' }}>
                {loadingGoogle
                  ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary, #38bdf8)' }} />
                  : <Monitor className="w-5 h-5" style={{ color: 'var(--color-primary, #38bdf8)' }} />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-200 text-sm">
                  {IS_ELECTRON ? 'Entrar com Google' : 'Entrar com Google'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {IS_ELECTRON
                    ? 'Use seu celular ou navegador — sem senha no app'
                    : 'Sync na nuvem · acesso em qualquer dispositivo'}
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl text-xs font-medium shrink-0"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 15%, transparent)',
                  color: 'var(--color-primary, #38bdf8)',
                }}>
                {loadingGoogle ? '...' : 'Entrar'}
              </div>
            </motion.button>

            {/* Device Code Panel (Electron) */}
            <AnimatePresence>
              {showDeviceCode && (
                <DeviceCodePanel
                  onSuccess={() => setShowDeviceCode(false)}
                  onCancel={() => setShowDeviceCode(false)}
                />
              )}
            </AnimatePresence>

            {/* Google consent panel (web only) */}
            <AnimatePresence>
              {showConsent && !IS_ELECTRON && (
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
              <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
                Privacidade
              </button>
              <span>·</span>
              <button onClick={() => setLegalModal('terms')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
                Termos de Uso
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}
