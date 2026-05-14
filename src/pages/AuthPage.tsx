import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Zap, UserCircle2, Chrome, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { FIREBASE_ENABLED } from '../lib/config'

export default function AuthPage({ onBack }: { onBack?: () => void }) {
  const { loginLocal, loginGoogle } = useAuth()
  const [loadingGoogle, setLoadingGoogle] = useState(false)

  const handleGoogle = async () => {
    setLoadingGoogle(true)
    const result = await loginGoogle()
    if (result === 'redirect') {
      window.setTimeout(() => setLoadingGoogle(false), 6000)
      return
    }
    setLoadingGoogle(false)
  }

  const hasFirebase = FIREBASE_ENABLED

  return (
    <div className="min-h-screen bg-[#07090f] flex items-center justify-center p-4 relative overflow-hidden">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute left-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0c1018]/85 px-3 py-2 text-xs font-medium text-slate-400 backdrop-blur hover:text-slate-100 hover:border-white/[0.16] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      )}
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[120px]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 6%, transparent)' }} />
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
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary, #38bdf8) 30%, transparent), color-mix(in srgb, var(--color-primary, #38bdf8) 10%, transparent))', border: '1px solid color-mix(in srgb, var(--color-primary, #38bdf8) 25%, transparent)' }}
          >
            <Zap className="w-8 h-8" style={{ color: 'var(--color-primary, #38bdf8)' }} strokeWidth={2} />
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
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#0c1018] border border-white/[0.09] hover:bg-[#111827] hover:border-white/[0.15] transition-all group"
          >
            <div className="w-11 h-11 rounded-xl bg-[#111827] flex items-center justify-center shrink-0 group-hover:bg-[#1a2235] transition-colors">
              <UserCircle2 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-200 text-sm">Entrar como Convidado</p>
              <p className="text-xs text-slate-500 mt-0.5">Dados salvos localmente · sem conta</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#1a2235] text-xs text-slate-300 font-medium shrink-0">
              Entrar
            </div>
          </motion.button>

          {/* Google */}
          <motion.button
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleGoogle}
            disabled={loadingGoogle || !hasFirebase}
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
                : <Chrome className="w-5 h-5" style={{ color: 'var(--color-primary, #38bdf8)' }} />}
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-200 text-sm">Entrar com Google</p>
              <p className="text-xs text-slate-500 mt-0.5">Sync na nuvem · acesso em qualquer dispositivo</p>
            </div>
            <div className="px-3 py-1.5 rounded-xl text-xs font-medium shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary, #38bdf8) 15%, transparent)',
                color: 'var(--color-primary, #38bdf8)',
              }}>
              {loadingGoogle ? '...' : 'Entrar'}
            </div>
          </motion.button>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[11px] text-slate-700 mt-8"
        >
          {hasFirebase
            ? 'Dados do Convidado ficam só no seu navegador. Google sincroniza na nuvem.'
            : 'Firebase não configurado — apenas modo Convidado disponível.'}
        </motion.p>
      </motion.div>
    </div>
  )
}
