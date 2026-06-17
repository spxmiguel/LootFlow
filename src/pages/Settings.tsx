import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings2, Palette, Database, Download, Upload, Trash2,
  Shield, RotateCcw, Check, AlertTriangle, Zap, ChevronRight,
  RefreshCw, Lock, Info, ExternalLink, ChevronDown, UserX, MessageCircle,
  Loader2,
} from 'lucide-react'
import { LegalModal, type LegalType } from '../components/LegalModal'
import type { WhatsAppSettings, DaySchedule } from '../lib/types'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { exportDrops, exportBackupJSON, DEFAULT_EXPORT_OPTIONS, type ExportOptions, type ExportFormat, type ExportFilter, type ExportColumns, type ExportCurrency } from '../lib/export'
import { storage, DEFAULT_SETTINGS } from '../lib/storage'
import { clearSteamCache, getSteamCacheStats } from '../lib/steam'
import { CUSTOM_FIREBASE_KEY, getCustomFirebaseConfig, isUsingCustomFirebase, FIREBASE_CONFIG } from '../lib/config'
import { formatCurrency } from '../lib/utils'
import { Button, Card, Input, Toggle } from '../components/ui'
import { firestoreQueueNotification } from '../lib/firebase'
import { useT } from '../hooks/useT'
import toast from 'react-hot-toast'

const SECTION_COLORS = {
  blue: 'bg-primary/10 text-primary',
  green: 'bg-profit/10 text-profit',
  gold: 'bg-gold/10 text-gold',
  red: 'bg-loss/10 text-loss',
  purple: 'bg-purple-400/10 text-purple-400',
}

function Section({ icon: Icon, color, title, subtitle, defaultOpen = false, children }: {
  icon: any; color: keyof typeof SECTION_COLORS
  title: string; subtitle?: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="p-0 overflow-hidden border border-white/[0.025] bg-[#0d1117]/30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-white/[0.01] transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${SECTION_COLORS[color]} shrink-0`}>
            <Icon size={16} />
          </div>
          <div>
            <h2 className="font-semibold text-white text-sm leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-slate-500 shrink-0 p-1 hover:text-slate-300 transition-colors"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-white/[0.025] space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

const PRESET_COLORS = [
  '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa',
  '#4ade80', '#34d399', '#fb923c', '#fbbf24',
  '#f87171', '#e879f9', '#ffffff',
]

// ─── Xingamentos metadata (espelha REMINDERS_XINGAMENTOS do bot) ──────────────
const XINGAMENTOS_META = [
  { id:  0, title: 'BORA SEU VAGABUNDO!' },
  { id:  1, title: 'ACORDA PORRA!' },
  { id:  2, title: 'EI SEU FILHO DA PUTA!' },
  { id:  3, title: 'FALTA FARMAR N CONTAS SEU PREGUIÇOSO DE MERDA!' },
  { id:  4, title: 'QUE É ISSO SEU MERDA!' },
  { id:  5, title: 'PORRA, TÁ DORMINDO NO PONTO?' },
  { id:  6, title: 'BORA SEU PUTO, PARA DE ENROLAÇÃO!' },
  { id:  7, title: 'ACORDA SEU FILHO DA PUTA!' },
  { id:  8, title: 'FALTANDO N CONTAS PRA FARMAR SEU LERDO DO CARALHO!' },
  { id:  9, title: 'RELATÓRIO DO INÚTIL DA SEMANA' },
  { id: 10, title: 'VAI TOMAR NO CU SEU ESQUECIDO!' },
  { id: 11, title: 'BORA PORRA!' },
  { id: 12, title: 'DROP SEMANAL SEU FILHO DA PUTA!' },
  { id: 13, title: 'ACORDA SEU PREGUIÇOSO DO CARALHO!' },
  { id: 14, title: 'PARA DE SER UM FRACASSADO!' },
  { id: 15, title: 'PORRA, OS DROPS TÃO TE CHAMANDO!' },
  { id: 16, title: 'BORA SEU MOLEZA DE MERDA!' },
  { id: 17, title: 'EI SEU INÚTIL, PARA DE COISA!' },
  { id: 18, title: 'OI SEU ANIMAL, TUDO BEM?' },
  { id: 19, title: 'ÚLTIMA CHAMADA SEU FILHO DA PUTA!' },
]

// ─── WhatsApp Section ─────────────────────────────────────────────────────────

const DEFAULT_SCHEDULE: { [day: number]: DaySchedule } = {
  0: { enabled: false, activeStart: '09:00', activeEnd: '22:00' },
  1: { enabled: false, activeStart: '09:00', activeEnd: '22:00' },
  2: { enabled: true,  activeStart: '09:00', activeEnd: '22:00' },
  3: { enabled: true,  activeStart: '09:00', activeEnd: '22:00' },
  4: { enabled: true,  activeStart: '09:00', activeEnd: '22:00' },
  5: { enabled: false, activeStart: '09:00', activeEnd: '22:00' },
  6: { enabled: false, activeStart: '09:00', activeEnd: '22:00' },
}

const VC_COOLDOWNS = [90, 30 * 60, 60 * 60, 4 * 60 * 60, 9 * 60 * 60] // segundos

function formatCooldown(secs: number): string {
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.ceil(secs / 60)}min`
  return `${Math.ceil(secs / 3600)}h`
}

function WhatsAppSection() {
  const t = useT()
  const { settings, updateSettings } = useStore()
  const { user } = useAuth()

  const wa = settings.whatsapp

  // ── Draft state — só salva no Firestore ao clicar Salvar ──────────────────
  const [draft, setDraft] = useState<Partial<WhatsAppSettings>>(() => ({
    enabled: wa?.enabled ?? false,
    schedule: wa?.schedule ?? (wa?.remindDays ? undefined : DEFAULT_SCHEDULE),
    encheSaco: wa?.encheSaco ?? false,
    encheSacoInterval: wa?.encheSacoInterval ?? 60,
    weeklySummary: wa?.weeklySummary ?? true,
    xingamentos: wa?.xingamentos ?? false,
    enabledXingamentos: wa?.enabledXingamentos,
  }))
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDevTone, setShowDevTone] = useState(() => wa?.xingamentos ?? false)

  // ── Phone & verificação (imediato — bot precisa) ───────────────────────────
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // ── Cooldown reenvio código ───────────────────────────────────────────────
  const [cooldownLeft, setCooldownLeft] = useState(0)
  useEffect(() => {
    const count = parseInt(localStorage.getItem('lf_vc_count') ?? '0', 10)
    const last = parseInt(localStorage.getItem('lf_vc_last') ?? '0', 10)
    if (last > 0) {
      const cd = (VC_COOLDOWNS[Math.min(count - 1, VC_COOLDOWNS.length - 1)] ?? 0) * 1000
      const remaining = Math.max(0, cd - (Date.now() - last))
      if (remaining > 0) setCooldownLeft(Math.ceil(remaining / 1000))
    }
  }, [])
  useEffect(() => {
    if (cooldownLeft <= 0) return
    const t = setTimeout(() => setCooldownLeft(c => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldownLeft])

  // ── Test / force reminder ─────────────────────────────────────────────────
  const [testing, setTesting] = useState(false)
  const [forcingReminder, setForcingReminder] = useState(false)

  const phone = wa?.phone ?? ''
  const verified = wa?.verified ?? false
  const hasPhone = phone.length >= 12

  const schedule = useMemo(() => {
    const base = draft.schedule ?? wa?.schedule
    if (base && Object.keys(base).length > 0) return base
    // Legacy: construir schedule a partir de remindDays + quietHours
    if (wa?.remindDays) {
      const s: { [day: number]: DaySchedule } = {}
      for (let d = 0; d < 7; d++) {
        s[d] = {
          enabled: wa.remindDays.includes(d),
          activeStart: wa.quietEnd ?? '09:00',   // fim do silêncio = início do ativo
          activeEnd: wa.quietStart ?? '22:00',    // início do silêncio = fim do ativo
        }
      }
      return s
    }
    return DEFAULT_SCHEDULE
  }, [draft.schedule, wa])

  function updateDraft(patch: Partial<WhatsAppSettings>) {
    setDraft(d => ({ ...d, ...patch }))
    setHasChanges(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const newWA: WhatsAppSettings = {
        phone: wa?.phone ?? '',
        verified: wa?.verified,
        verifyCode: wa?.verifyCode,
        lastReminderAt: wa?.lastReminderAt,
        enabled: draft.enabled ?? false,
        schedule: draft.schedule ?? schedule,
        encheSaco: draft.encheSaco ?? false,
        encheSacoInterval: draft.encheSacoInterval ?? 60,
        weeklySummary: draft.weeklySummary ?? true,
        xingamentos: draft.xingamentos ?? false,
        enabledXingamentos: draft.enabledXingamentos,
      }
      updateSettings({ whatsapp: newWA })
      setHasChanges(false)
      toast.success(t('wa.toast_saved'))
    } finally {
      setSaving(false)
    }
  }

  async function sendVerifyCode(newPhone?: string) {
    if (!user?.uid) { toast.error(settings.language === 'en' ? 'You need to be logged in' : 'Você precisa estar logado'); return }
    const targetPhone = newPhone ?? phone
    if (targetPhone.length < 12) { toast.error(settings.language === 'en' ? 'Invalid number' : 'Número inválido'); return }
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setSendingCode(true)
    try {
      // Atualiza imediatamente (bot precisa do código no Firestore)
      const currentWA: WhatsAppSettings = {
        phone: targetPhone,
        verified: false,
        verifyCode: code,
        consentAt: wa?.consentAt ?? new Date().toISOString(), // LGPD Art. 7, I — registra timestamp do consentimento
        enabled: draft.enabled ?? wa?.enabled ?? false,
        schedule: draft.schedule ?? schedule,
        encheSaco: draft.encheSaco ?? wa?.encheSaco ?? false,
        encheSacoInterval: draft.encheSacoInterval ?? wa?.encheSacoInterval ?? 60,
        weeklySummary: draft.weeklySummary ?? wa?.weeklySummary ?? true,
        xingamentos: draft.xingamentos ?? wa?.xingamentos ?? false,
        lastReminderAt: wa?.lastReminderAt,
      }
      updateSettings({ whatsapp: currentWA })
      await firestoreQueueNotification(user.uid, 'send_verify_code')
      // Registrar cooldown
      const prev = parseInt(localStorage.getItem('lf_vc_count') ?? '0', 10)
      const nextCount = prev + 1
      localStorage.setItem('lf_vc_count', String(nextCount))
      localStorage.setItem('lf_vc_last', String(Date.now()))
      const cd = VC_COOLDOWNS[Math.min(nextCount, VC_COOLDOWNS.length - 1)] ?? VC_COOLDOWNS[VC_COOLDOWNS.length - 1]
      setCooldownLeft(cd)
      setEditingPhone(false)
      setHasChanges(false)
      toast.success(t('wa.toast_code_sent'))
    } catch {
      toast.error(t('wa.toast_code_error'))
    } finally {
      setSendingCode(false)
    }
  }

  async function handleTest() {
    if (!user?.uid || !hasPhone) return
    setTesting(true)
    try {
      await firestoreQueueNotification(user.uid, 'test')
      toast.success(t('wa.toast_test_sent'))
    } catch { toast.error(t('wa.toast_test_error')) }
    finally { setTesting(false) }
  }

  async function handleForceReminder() {
    if (!user?.uid || !hasPhone) return
    setForcingReminder(true)
    try {
      await firestoreQueueNotification(user.uid, 'force_reminder')
      toast.success(t('wa.toast_reminder_sent'))
    } catch { toast.error(t('wa.toast_reminder_error')) }
    finally { setForcingReminder(false) }
  }

  const DAY_LABELS = settings.language === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const botStatus = !hasPhone
    ? { label: t('wa.status_no_phone'), color: 'text-slate-500' }
    : !verified
    ? { label: t('wa.status_pending'), color: 'text-yellow-500' }
    : !(draft.enabled ?? wa?.enabled)
    ? { label: t('wa.status_disabled'), color: 'text-slate-500' }
    : { label: t('wa.status_active'), color: 'text-profit' }

  return (
    <div className="space-y-5">
      {/* 1. Conexão & Status */}
      <Section icon={MessageCircle} color="green" title={t('wa.section_connection')} subtitle={t('wa.section_connection_desc')} defaultOpen={true}>
        {/* Info */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0d1117] border border-white/[0.025]">
          <Info size={13} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('wa.info_phone')}
          </p>
        </div>

        {/* Toggle principal + status */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.025]">
          <div>
            <p className="text-sm text-white font-medium">{t('wa.enable_alerts')}</p>
            <p className={`text-[11px] mt-0.5 ${botStatus.color}`}>{botStatus.label}</p>
          </div>
          <Toggle value={draft.enabled ?? false} onChange={v => updateDraft({ enabled: v })} />
        </div>

        {/* Número */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">{t('wa.input_phone')}</label>
          {!editingPhone && hasPhone ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[#111827] border border-white/[0.025]">
              <div>
                <p className="text-sm text-white font-mono">+{phone}</p>
                <p className={`text-[11px] mt-0.5 ${verified ? 'text-profit' : 'text-yellow-500'}`}>
                  {verified ? t('wa.status_verified') : t('wa.status_pending')}
                </p>
              </div>
              <button
                onClick={() => { setPhoneInput(phone.startsWith('55') ? phone.slice(2) : phone); setEditingPhone(true) }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg border border-white/[0.025] hover:border-white/30 transition-all"
              >
                {t('wa.btn_change')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">+55</span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder={t('wa.placeholder_phone')}
                  className="w-full h-9 rounded-xl border border-white/[0.025] bg-[#111827] text-slate-200 text-sm pl-10 pr-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={sendingCode || phoneInput.length < 10}
                  onClick={() => sendVerifyCode(`55${phoneInput}`)}
                  className="flex-1 h-8 rounded-xl bg-primary/10 border border-primary/40 text-primary text-xs font-medium hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sendingCode && <Loader2 size={12} className="animate-spin" />}
                  {sendingCode ? t('wa.btn_sending') : t('wa.btn_send_code')}
                </button>
                {hasPhone && (
                  <button
                    onClick={() => { setEditingPhone(false); setPhoneInput('') }}
                    className="px-3 h-8 rounded-xl border border-white/[0.025] text-slate-500 text-xs hover:text-slate-300 transition-all"
                  >
                    {t('wa.btn_cancel')}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-600">{t('wa.phone_hint')}</p>
              <p className="text-[10px] text-slate-600/70 leading-relaxed">
                {t('wa.phone_legal')}
              </p>
            </div>
          )}
        </div>

        {/* Verificação pendente */}
        {hasPhone && !verified && !editingPhone && (
          <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/25 space-y-3">
            <div>
              <p className="text-xs text-yellow-400 font-medium">{t('wa.alert_pending_title')}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {t('wa.alert_pending_desc')}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="flex-1 h-9 rounded-xl border border-white/[0.025] bg-[#0d1117] text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-yellow-500/50 placeholder:text-slate-700"
              />
              <button
                disabled={codeInput.length !== 6 || verifying}
                onClick={async () => {
                  if (!user?.uid) return
                  setVerifying(true)
                  try {
                    const stored = settings.whatsapp?.verifyCode
                    if (codeInput === stored) {
                      updateSettings({ whatsapp: { ...settings.whatsapp!, verified: true, verifyCode: undefined } })
                      setCodeInput('')
                      toast.success(t('wa.toast_verified'))
                    } else {
                      toast.error(t('wa.toast_invalid_code'))
                    }
                  } finally { setVerifying(false) }
                }}
                className="px-4 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium hover:bg-yellow-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                {verifying && <Loader2 size={12} className="animate-spin" />}
                {t('wa.btn_verify')}
              </button>
            </div>
            <button
              disabled={sendingCode || cooldownLeft > 0}
              onClick={() => sendVerifyCode()}
              className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sendingCode
                ? t('wa.btn_sending')
                : cooldownLeft > 0
                ? t('wa.resend_cooldown', { time: formatCooldown(cooldownLeft) })
                : t('wa.resend_btn')}
            </button>
          </div>
        )}
      </Section>

      {/* 2. Tipos de Alerta */}
      <Section icon={MessageCircle} color="blue" title={t('wa.section_alert_types')} subtitle={t('wa.section_alert_types_desc')} defaultOpen={true}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.025]">
            <div>
              <p className="text-sm text-white">{t('wa.summary_label')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('wa.summary_desc')}</p>
            </div>
            <Toggle value={draft.weeklySummary ?? true} onChange={v => updateDraft({ weeklySummary: v })} />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-loss/20">
            <div>
              <p className="text-sm text-white">{t('wa.annoy_label')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('wa.annoy_desc')}</p>
            </div>
            <Toggle value={draft.encheSaco ?? false} onChange={v => updateDraft({ encheSaco: v })} />
          </div>

          {(draft.encheSaco ?? false) && (
            <div className="pl-1 py-1">
              <label className="text-xs text-slate-500 block mb-2">{t('wa.annoy_repeat_label')}</label>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: '30 min', value: 30 },
                  { label: '1h', value: 60 },
                  { label: '1h30', value: 90 },
                  { label: '2h', value: 120 },
                  { label: '3h', value: 180 },
                  { label: '4h', value: 240 },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateDraft({ encheSacoInterval: opt.value })}
                    className={`h-8 px-3 rounded-xl text-xs font-medium border transition-all ${
                      (draft.encheSacoInterval ?? 60) === opt.value
                        ? 'bg-loss/10 border-loss/40 text-loss'
                        : 'bg-[#0d1117] border-white/[0.025] text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/[0.025] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDevTone(v => !v)}
              className="w-full flex items-center justify-between gap-3 p-3 bg-[#111827] text-left hover:bg-[#131c2e] transition-colors"
            >
              <div>
                <p className="text-sm text-white">{t('wa.dev_mode_label')}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{t('wa.dev_mode_desc')}</p>
              </div>
              <ChevronDown size={15} className={`text-slate-500 transition-transform ${showDevTone ? 'rotate-180' : ''}`} />
            </button>
            {showDevTone && (
              <div className="bg-[#0d1117] border-t border-white/[0.025] p-3 space-y-3">
                <div className="flex items-start gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-yellow-400" />
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {t('wa.dev_mode_warning')}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-red-500/20">
                  <div>
                    <p className="text-sm text-white">{t('wa.dev_mode_active_label')}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t('wa.dev_mode_active_desc')}</p>
                  </div>
                  <Toggle value={draft.xingamentos ?? false} onChange={async v => {
                    const wasOff = !(draft.xingamentos ?? false)
                    updateDraft({ xingamentos: v })
                    if (v && wasOff && user?.uid && hasPhone) {
                      try { await firestoreQueueNotification(user.uid, 'xingamentos_welcome') } catch {}
                    }
                  }} />
                </div>

                {(draft.xingamentos ?? false) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{t('wa.active_messages')}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateDraft({ enabledXingamentos: undefined })}
                          className="text-[10px] text-slate-600 hover:text-profit transition-colors"
                        >
                          {t('wa.active_messages_all')}
                        </button>
                        <span className="text-slate-800 text-[10px]">·</span>
                        <button
                          onClick={() => updateDraft({ enabledXingamentos: [] })}
                          className="text-[10px] text-slate-600 hover:text-loss transition-colors"
                        >
                          {t('wa.active_messages_none')}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                      {XINGAMENTOS_META.map(x => {
                        const enabled = !draft.enabledXingamentos || draft.enabledXingamentos.includes(x.id)
                        return (
                          <div
                            key={x.id}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all cursor-pointer ${
                              enabled
                                ? 'bg-red-500/5 border-red-500/15 text-slate-300'
                                : 'bg-transparent border-white/[0.025] text-slate-600'
                            }`}
                            onClick={() => {
                              const current = draft.enabledXingamentos ?? XINGAMENTOS_META.map(m => m.id)
                              updateDraft({
                                enabledXingamentos: enabled
                                  ? current.filter(i => i !== x.id)
                                  : [...current, x.id].sort((a, b) => a - b),
                              })
                            }}
                          >
                            <span className="text-[10px] font-mono text-slate-500 leading-none shrink-0">#{x.id + 1}</span>
                            <span className="text-[11px] font-mono flex-1 truncate">{x.title}</span>
                            <span className={`text-[10px] shrink-0 ${enabled ? 'text-profit' : 'text-slate-700'}`}>
                              {enabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-700 mt-2 text-center">
                      {(() => {
                        const n = draft.enabledXingamentos == null ? XINGAMENTOS_META.length : draft.enabledXingamentos.length
                        return t('wa.active_messages_status', { n, total: XINGAMENTOS_META.length })
                      })()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 3. Grade de Horários */}
      <Section icon={MessageCircle} color="gold" title={t('wa.section_schedule')} subtitle={t('wa.section_schedule_desc')} defaultOpen={false}>
        <p className="text-[11px] text-slate-600 mb-3">{t('wa.schedule_intro')}</p>
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map(day => {
            const conf = schedule[day] ?? { enabled: false, activeStart: '09:00', activeEnd: '22:00' }
            return (
              <div
                key={day}
                className={`rounded-xl border transition-all ${
                  conf.enabled
                    ? 'bg-[#111827]'
                    : 'bg-transparent'
                } border-white/[0.025]`}
              >
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className={`text-xs font-medium w-7 ${conf.enabled ? 'text-white' : 'text-slate-600'}`}>
                    {DAY_LABELS[day]}
                  </span>
                  <Toggle
                    value={conf.enabled}
                    onChange={v => updateDraft({
                      schedule: { ...schedule, [day]: { ...conf, enabled: v } },
                    })}
                  />
                  {conf.enabled && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input
                        type="time"
                        value={conf.activeStart}
                        onChange={e => updateDraft({
                          schedule: { ...schedule, [day]: { ...conf, activeStart: e.target.value } },
                        })}
                        className="h-7 w-20 rounded-lg border border-white/[0.025] bg-[#0d1117] text-slate-200 text-xs px-2 focus:outline-none focus:border-primary/60"
                      />
                      <span className="text-slate-600 text-xs">→</span>
                      <input
                        type="time"
                        value={conf.activeEnd}
                        onChange={e => updateDraft({
                          schedule: { ...schedule, [day]: { ...conf, activeEnd: e.target.value } },
                        })}
                        className="h-7 w-20 rounded-lg border border-white/[0.025] bg-[#0d1117] text-slate-200 text-xs px-2 focus:outline-none focus:border-primary/60"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* 4. Testes & Diagnóstico */}
      <Section icon={MessageCircle} color="purple" title={t('wa.section_diagnostics')} subtitle={t('wa.section_diagnostics_desc')} defaultOpen={false}>
        <div className="space-y-2">
          <Button
            onClick={handleTest}
            disabled={testing || !hasPhone}
            variant="ghost"
            size="sm"
            className="w-full border border-white/[0.025] hover:border-profit/40 hover:text-profit"
          >
            {testing ? t('wa.btn_test_msg_sending') : t('wa.btn_test_msg')}
          </Button>
          <Button
            onClick={handleForceReminder}
            disabled={forcingReminder || !hasPhone}
            variant="ghost"
            size="sm"
            className="w-full border border-white/[0.025] hover:border-primary/40 hover:text-primary"
          >
            {forcingReminder ? t('wa.btn_simulate_reminder_sending') : t('wa.btn_simulate_reminder')}
          </Button>
        </div>
      </Section>

      {/* Botão Salvar */}
      <div className={`p-4 rounded-xl border bg-[#0d1117]/30 transition-all ${hasChanges ? 'border-primary/30' : 'border-white/[0.025]'}`}>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          size="sm"
          className={`w-full transition-all ${
            hasChanges
              ? 'bg-primary/90 hover:bg-primary text-white border-transparent'
              : 'opacity-40 cursor-not-allowed'
          }`}
        >
          {saving ? t('wa.btn_saving') : hasChanges ? t('wa.btn_save') : t('wa.btn_saved')}
        </Button>
        {hasChanges && (
          <p className="text-[10px] text-primary/70 text-center mt-1.5">
            {t('wa.save_card_hint')}
          </p>
        )}
      </div>
    </div>
  )
}

const tabs: { id: 'finance' | 'appearance' | 'notifications' | 'privacy'; label: string; icon: any }[] = [
  { id: 'finance', label: 'Financeiro', icon: Settings2 },
  { id: 'appearance', label: 'Aparência', icon: Palette },
  { id: 'notifications', label: 'Notificações', icon: MessageCircle },
  { id: 'privacy', label: 'Dados e Privacidade', icon: Database },
]

export default function Settings() {
  const t = useT()
  const {
    accounts, drops, goals, settings,
    updateSettings, updateTheme, updateProfile, reset,
    clearDrops, clearAccounts, clearGoals, resetSettingsToDefault,
  } = useStore()
  const { user, deleteAccount, resync } = useAuth()

  const [activeTab, setActiveTab] = useState<'finance' | 'appearance' | 'notifications' | 'privacy'>('finance')
  const [syncing, setSyncing] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<'drops' | 'accounts' | 'goals' | 'settings' | null>(null)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(0)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalType | null>(null)
  const [cacheStats, setCacheStats] = useState<{ entries: number; sizeKB: number } | null>(null)
  const [showCustomFirebase, setShowCustomFirebase] = useState(false)
  const [showFirebaseTutorial, setShowFirebaseTutorial] = useState(false)
  const [exportingJSON, setExportingJSON] = useState(false)
  const [importingJSON, setImportingJSON] = useState(false)
  const [exportOpts, setExportOpts] = useState<ExportOptions>(() => ({
    ...DEFAULT_EXPORT_OPTIONS,
    currency: (settings.currency as ExportCurrency) ?? 'BRL',
    usdRate:  settings.usdRate ?? 5.2,
  }))
  const [customFbForm, setCustomFbForm] = useState(() => {
    const c = getCustomFirebaseConfig()
    return {
      apiKey: c?.apiKey ?? '',
      authDomain: c?.authDomain ?? '',
      projectId: c?.projectId ?? '',
      storageBucket: c?.storageBucket ?? '',
      messagingSenderId: c?.messagingSenderId ?? '',
      appId: c?.appId ?? '',
    }
  })
  const importRef = useRef<HTMLInputElement>(null)
  const deleteConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current)
  }, [])

  // Sync exportOpts when settings.currency / usdRate change mid-session (BUG-005)
  useEffect(() => {
    setExportOpts(prev => ({
      ...prev,
      currency: (settings.currency as ExportCurrency) ?? 'BRL',
      usdRate:  settings.usdRate ?? 5.2,
    }))
  }, [settings.currency, settings.usdRate])

  // ── Handlers ──

  async function handleResync() {
    setSyncing(true)
    try {
      await resync(true)
      toast.success(t('settings.firebase_resync_success'))
    } catch {
      toast.error(t('settings.firebase_resync_error'))
    } finally {
      setSyncing(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteAccountConfirm < 2) {
      setDeleteAccountConfirm(c => c + 1)
      return
    }
    setDeletingAccount(true)
    await deleteAccount()
    setDeletingAccount(false)
    setDeleteAccountConfirm(0)
  }

  function handleSaveCustomFirebase() {
    const { apiKey, authDomain, projectId, appId } = customFbForm
    if (!apiKey || !authDomain || !projectId || !appId) {
      toast.error(t('settings.firebase_validation_fields'))
      return
    }
    if (!authDomain.includes('.') || authDomain.includes('<') || authDomain.includes('>')) {
      toast.error(t('settings.firebase_validation_domain'))
      return
    }
    if (!/^[a-z0-9-]+$/.test(projectId)) {
      toast.error(t('settings.firebase_validation_project'))
      return
    }
    if (!appId.startsWith('1:')) {
      toast.error(t('settings.firebase_validation_app'))
      return
    }
    try {
      localStorage.setItem(CUSTOM_FIREBASE_KEY, JSON.stringify(customFbForm))
      toast.success(t('settings.firebase_toast_saved'))
    } catch {
      toast.error(settings.language === 'en' ? 'Error saving configuration.' : 'Erro ao salvar configuração.')
    }
  }

  function handleClearCustomFirebase() {
    localStorage.removeItem(CUSTOM_FIREBASE_KEY)
    setCustomFbForm({ apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' })
    toast.success(t('settings.firebase_toast_restored'))
  }

  function handleCashoutRate(val: number) {
    updateSettings({ cashoutRate: Math.min(100, Math.max(0, val)) })
  }

  function handleGamificationMode(liteMode: boolean) {
    updateSettings({
      liteMode,
      gamification: {
        ...(settings.gamification ?? {}),
        showInsights: !liteMode,
        showHeatmap: !liteMode,
        showTimeline: false,
        showAchievements: !liteMode,
        showHallOfFame: !liteMode,
        showPerfectWeek: !liteMode,
        showLevels: !liteMode,
        showTitles: !liteMode,
        showRankings: true,
        showCollection: !liteMode,
        showCaseTracker: !liteMode,
      },
    })
  }

  function updatePrivacySetting(key: keyof NonNullable<typeof settings.privacy>, value: boolean) {
    updateSettings({ privacy: { ...(settings.privacy ?? {}), [key]: value } })
  }

  function handleExport() {
    try {
      exportDrops(drops, accounts, settings, exportOpts)
      const labels: Record<ExportFormat, string> = { csv: 'CSV', xlsx: 'XLSX', txt: 'TXT' }
      toast.success(t('settings.export_toast_exported', { format: labels[exportOpts.format] }))
    } catch {
      toast.error(t('settings.export_toast_error'))
    }
  }

  function handleExportJSON() {
    setExportingJSON(true)
    setTimeout(() => {
      try {
        exportBackupJSON(storage.exportAll())
        toast.success(t('settings.export_toast_backup_exported'))
      } catch {
        toast.error(t('settings.export_toast_backup_error'))
      } finally {
        setExportingJSON(false)
      }
    }, 700)
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('settings.export_import_toast_large'))
      return
    }
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      toast.error(t('settings.export_import_toast_invalid_type'))
      return
    }

    setImportingJSON(true)
    const reader = new FileReader()
    reader.onerror = () => {
      toast.error(t('settings.export_import_toast_read_error'))
      setImportingJSON(false)
    }
    reader.onload = (ev) => {
      setTimeout(() => {
        try {
          const raw = ev.target?.result
          if (typeof raw !== 'string') throw new Error('Leitura inválida')
          const data = JSON.parse(raw)
          storage.validateImport(data)
          storage.importAll(data)
          toast.success(t('settings.export_import_toast_success'))
          setTimeout(() => window.location.reload(), 800)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : (settings.language === 'en' ? 'Invalid file' : 'Arquivo inválido'))
        } finally {
          setImportingJSON(false)
        }
      }, 700)
    }
    reader.readAsText(file)
  }

  function handleClearCache() {
    clearSteamCache()
    toast.success(t('settings.steam_cache_toast_cleared'))
    setCacheStats(getSteamCacheStats())
  }

  function handleCheckCache() {
    setCacheStats(getSteamCacheStats())
  }

  function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true)
      setTimeout(() => setResetConfirm(false), 4000)
      return
    }
    storage.clearAll()
    reset()
    toast.success(t('settings.danger_toast_deleted_local'))
    setResetConfirm(false)
    setTimeout(() => window.location.reload(), 500)
  }

  function handleSelectiveDelete(type: 'drops' | 'accounts' | 'goals' | 'settings') {
    if (deleteConfirm !== type) {
      setDeleteConfirm(type)
      if (deleteConfirmTimerRef.current) clearTimeout(deleteConfirmTimerRef.current)
      deleteConfirmTimerRef.current = setTimeout(() => setDeleteConfirm(null), 4000)
      return
    }
    if (deleteConfirmTimerRef.current) { clearTimeout(deleteConfirmTimerRef.current); deleteConfirmTimerRef.current = null }
    setDeleteConfirm(null)
    if (type === 'drops') { clearDrops(); toast.success(t('settings.selective_clear_toast_drops')) }
    else if (type === 'accounts') { clearAccounts(); toast.success(t('settings.selective_clear_toast_accounts')) }
    else if (type === 'goals') { clearGoals(); toast.success(t('settings.selective_clear_toast_goals')) }
    else if (type === 'settings') { resetSettingsToDefault(); toast.success(t('settings.selective_clear_toast_settings')) }
  }

  const cashoutRate = settings.cashoutRate

  return (
    <>
    {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    <div className="p-4 md:p-6 lg:p-8 space-y-5 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-display font-bold text-white font-body">{t('settings.title')}</h1>
        <p className="text-slate-500 text-xs mt-0.5">{t('settings.subtitle')}</p>
      </motion.div>

      {/* 2-Column Sidebar Layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Tab Navigation Vertical Sidebar */}
        <div className="flex flex-col gap-1 w-full md:w-60 shrink-0 bg-[#0d1117]/60 border border-white/[0.025] rounded-xl p-2.5">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-lg text-sm font-semibold transition-all duration-200 border text-left ${
                  isActive
                    ? 'bg-primary/10 border-primary/20 text-primary shadow-[0_0_15px_rgba(16,185,129,0.06)]'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <span>{t(`settings.tab_${tab.id}` as any)}</span>
              </button>
            )
          })}
        </div>

        {/* Settings Tab Panels */}
        <div className="flex-1 w-full">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            {/* ── Tab: Financeiro ── */}
            {activeTab === 'finance' && (
              <div className="space-y-5">
                {/* 1. Taxa de Cashout */}
                <Section icon={Settings2} color="blue" title={t('settings.section_cashout_rate')} subtitle={t('settings.section_cashout_rate_desc')} defaultOpen={true}>
                  {/* Cashout rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white font-medium">{t('settings.cashout_rate_label')}</p>
                      <span className="text-lg font-mono font-bold text-primary">{cashoutRate}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {t('settings.cashout_rate_hint', {
                        gross: formatCurrency(10, settings.currency),
                        cashout: formatCurrency(10 * cashoutRate / 100, settings.currency)
                      })}
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={cashoutRate}
                      onChange={e => handleCashoutRate(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-[#111827]"
                    />
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Manual override */}
                  <div className="pt-3 border-t border-white/[0.025]">
                    <label className="text-xs text-slate-400 mb-1.5 block">{t('settings.cashout_rate_manual')}</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={String(cashoutRate)}
                        onChange={e => handleCashoutRate(Number(e.target.value))}
                        className="w-28"
                      />
                      <span className="flex items-center text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                </Section>

                {/* 2. Moeda & Conversão */}
                <Section icon={Settings2} color="green" title={t('settings.section_currency')} subtitle={t('settings.section_currency_desc')} defaultOpen={false}>
                  {/* Currency */}
                  <SettingRow label={t('settings.currency_label')} hint={settings.currency === 'USD' ? t('settings.currency_hint_usd', { rate: settings.usdRate ?? 5.2 }) : t('settings.currency_hint_brl')}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSettings({ currency: 'BRL' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.currency === 'BRL' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/[0.025] text-slate-400 hover:text-slate-200'}`}
                      >R$ BRL</button>
                      <button
                        onClick={() => updateSettings({ currency: 'USD' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.currency === 'USD' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/[0.025] text-slate-400 hover:text-slate-200'}`}
                      >$ USD</button>
                    </div>
                  </SettingRow>

                  {settings.currency === 'USD' && (
                    <div className="pt-3 border-t border-white/[0.025] pl-4 border-l-2 border-primary/20 space-y-1.5">
                      <label className="text-xs text-slate-400 block">{t('settings.currency_conversion_label')}</label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={String(settings.usdRate ?? 5.2)}
                        onChange={e => updateSettings({ usdRate: Number(e.target.value) || 5.2 })}
                        placeholder="5.2"
                      />
                    </div>
                  )}
                </Section>

                {/* 3. Meta Semanal */}
                <Section icon={Settings2} color="gold" title={t('settings.section_weekly_goal')} subtitle={t('settings.section_weekly_goal_desc')} defaultOpen={false}>
                  {/* Weekly goal */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">{t('settings.weekly_goal_label', { symbol: settings.currency === 'USD' ? '$' : 'R$' })}</label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={String(
                        settings.currency === 'USD'
                          ? parseFloat((settings.weeklyGoalAmount / (settings.usdRate ?? 5.2)).toFixed(2))
                          : settings.weeklyGoalAmount
                      )}
                      onChange={e => {
                        const val = Number(e.target.value)
                        const finalVal = settings.currency === 'USD' ? val * (settings.usdRate ?? 5.2) : val
                        updateSettings({ weeklyGoalAmount: finalVal })
                      }}
                      placeholder="50"
                    />
                  </div>
                </Section>
              </div>
            )}

            {/* ── Tab: Aparência ── */}
            {activeTab === 'appearance' && (
              <div className="space-y-5">
                {/* 1. Tema & Cores */}
                <Section icon={Palette} color="purple" title={t('settings.section_theme')} subtitle={t('settings.section_theme_desc')} defaultOpen={true}>
                  {/* Primary color */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">{t('settings.theme_primary_label')}</label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => updateTheme({ primaryColor: c })}
                          className={`w-7 h-7 rounded-lg transition-all ${
                            settings.theme.primaryColor === c
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d1117] scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={settings.theme.primaryColor}
                        onChange={e => updateTheme({ primaryColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/[0.025] bg-transparent cursor-pointer"
                      />
                      <Input
                        value={settings.theme.primaryColor}
                        onChange={e => updateTheme({ primaryColor: e.target.value })}
                        className="w-28 font-mono text-xs"
                        placeholder="#38bdf8"
                      />
                    </div>
                  </div>

                  {/* Accent color */}
                  <div className="pt-3 border-t border-white/[0.025]">
                    <label className="text-xs text-slate-400 mb-2 block">{t('settings.theme_accent_label')}</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={settings.theme.accentColor}
                        onChange={e => updateTheme({ accentColor: e.target.value })}
                        className="w-8 h-8 rounded-lg border border-white/[0.025] bg-transparent cursor-pointer"
                      />
                      <Input
                        value={settings.theme.accentColor}
                        onChange={e => updateTheme({ accentColor: e.target.value })}
                        className="w-28 font-mono text-xs"
                        placeholder="#4ade80"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.025]">
                    <SettingRow label={t('settings.theme_glassmorphism')} hint={t('settings.theme_glassmorphism_hint')}>
                      <Toggle
                        value={settings.theme.glassmorphism}
                        onChange={v => updateTheme({ glassmorphism: v })}
                      />
                    </SettingRow>
                  </div>
                </Section>

                {/* 2. Gamification Mode */}
                <Section icon={Zap} color="gold" title={t('settings.section_gamification_mode')} subtitle={t('settings.section_gamification_mode_desc')} defaultOpen={false}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleGamificationMode(false)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        !settings.liteMode
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-white/[0.025] bg-[#111827]/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-sm font-semibold">{t('settings.gamification_full')}</p>
                      <p className="mt-1 text-xs text-slate-500">{t('settings.gamification_full_hint')}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGamificationMode(true)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        settings.liteMode
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-white/[0.025] bg-[#111827]/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <p className="text-sm font-semibold">{t('settings.gamification_lite')}</p>
                      <p className="mt-1 text-xs text-slate-500">{t('settings.gamification_lite_hint')}</p>
                    </button>
                  </div>
                </Section>

                {/* 2. Interface & Otimização */}
                <Section icon={Palette} color="blue" title={t('settings.section_interface')} subtitle={t('settings.section_interface_desc')} defaultOpen={false}>
                  <SettingRow label={t('settings.interface_animations')} hint={t('settings.interface_animations_hint')}>
                    <Toggle
                      value={!settings.theme.animations}
                      onChange={v => updateTheme({ animations: !v })}
                    />
                  </SettingRow>

                  <div className="pt-3 border-t border-white/[0.025]">
                    <SettingRow label={t('settings.interface_sidebar')} hint={t('settings.interface_sidebar_hint')}>
                      <Toggle
                        value={settings.theme.sidebarCompact}
                        onChange={v => updateTheme({ sidebarCompact: v })}
                      />
                    </SettingRow>
                  </div>
                </Section>

                {/* 3. Idioma */}
                <Section icon={Palette} color="gold" title={t('settings.section_language')} subtitle={t('settings.section_language_desc')} defaultOpen={false}>
                  <SettingRow label={t('settings.language_label')} hint={t('settings.language_hint')}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSettings({ language: 'pt' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.language !== 'en' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/[0.025] text-slate-400 hover:text-slate-200'}`}
                      >PT</button>
                      <button
                        onClick={() => updateSettings({ language: 'en' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${settings.language === 'en' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-white/5 border border-white/[0.025] text-slate-400 hover:text-slate-200'}`}
                      >EN</button>
                    </div>
                  </SettingRow>
                </Section>
              </div>
            )}

            {/* ── Tab: Notificações ── */}
            {activeTab === 'notifications' && (
              <div className="space-y-5">
                <WhatsAppSection />
              </div>
            )}

            {/* ── Tab: Dados e Privacidade ── */}
            {activeTab === 'privacy' && (
              <div className="space-y-5">
                {/* Firebase Cloud Sync Card */}
                <Section icon={Database} color="blue" title={t('settings.section_firebase')} subtitle={t('settings.section_firebase_desc')} defaultOpen={true}>
                  <div className="space-y-3">
                    <SettingRow
                      label={t('settings.firebase_sync_label')}
                      hint={t('settings.firebase_sync_hint')}
                    >
                      <Toggle
                        value={settings.firebaseSyncEnabled !== false}
                        onChange={v => updateSettings({ firebaseSyncEnabled: v })}
                      />
                    </SettingRow>

                    <div className="flex items-start gap-3 p-3 bg-profit/5 border border-profit/20 rounded-xl">
                      <Check size={15} className="text-profit mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-slate-400">
                        <p className="text-profit font-semibold mb-1">
                          {isUsingCustomFirebase() ? t('settings.firebase_status_custom') : t('settings.firebase_status_default')}
                        </p>
                        <p>{t('settings.firebase_status_desc')}</p>
                      </div>
                    </div>

                    {user?.provider === 'google' && (
                      <Button
                        variant="ghost"
                        icon={RefreshCw}
                        size="sm"
                        onClick={handleResync}
                        disabled={syncing}
                        className="w-full justify-center"
                      >
                        {syncing ? t('settings.firebase_resyncing') : t('settings.firebase_resync_now')}
                      </Button>
                    )}

                    <button
                      onClick={() => setShowCustomFirebase(v => !v)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.025] hover:border-white/[0.06] transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm text-white">{t('settings.firebase_custom_toggle')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('settings.firebase_custom_hint')}</p>
                      </div>
                      <ChevronDown size={15} className={`text-slate-500 transition-transform ${showCustomFirebase ? 'rotate-180' : ''}`} />
                    </button>

                    {showCustomFirebase && (
                      <div className="space-y-3 p-3 rounded-xl bg-[#0d1117] border border-white/[0.025]">
                        <button
                          onClick={() => setShowFirebaseTutorial(v => !v)}
                          className="w-full flex items-center justify-between text-xs text-primary hover:underline"
                        >
                          <span>{t('settings.firebase_tutorial_toggle')}</span>
                          <ChevronDown size={13} className={`transition-transform ${showFirebaseTutorial ? 'rotate-180' : ''}`} />
                        </button>

                        {showFirebaseTutorial && (
                          <div className="text-xs text-slate-500 space-y-1.5 p-3 bg-black/20 rounded-xl leading-relaxed">
                            <p className="text-slate-300 font-semibold">Tutorial — Firebase gratuito em 5 passos:</p>
                            <p>{t('settings.firebase_tutorial_step1')}</p>
                            <p>{t('settings.firebase_tutorial_step2')}</p>
                            <p>{t('settings.firebase_tutorial_step3')}</p>
                            <p>{t('settings.firebase_tutorial_step4')}</p>
                            <p>{t('settings.firebase_tutorial_step5')}</p>
                            <pre className="font-mono text-[10px] bg-black/30 rounded-lg px-2 py-1.5 text-slate-400 whitespace-pre-wrap">{'rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /users/{uid}/{d=**} {\n      allow read, write: if request.auth != null && request.auth.uid == uid;\n    }\n    match /publicProfiles/{uid} {\n      allow read: if true;\n      allow write: if request.auth != null && request.auth.uid == uid && request.resource.data.uid == uid;\n    }\n    match /friendCodes/{code} {\n      allow read: if true;\n      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;\n      allow update, delete: if request.auth != null && resource.data.uid == request.auth.uid;\n    }\n  }\n}'}</pre>
                            <p>{t('settings.firebase_tutorial_step6')}</p>
                          </div>
                        )}

                        <div className="space-y-2">
                          {([
                            ['apiKey', 'API Key *'],
                            ['authDomain', settings.language === 'en' ? 'Auth Domain * (e.g.: my-project.firebaseapp.com)' : 'Auth Domain * (ex: meu-projeto.firebaseapp.com)'],
                            ['projectId', 'Project ID *'],
                            ['appId', 'App ID *'],
                            ['storageBucket', settings.language === 'en' ? 'Storage Bucket (optional)' : 'Storage Bucket (opcional)'],
                            ['messagingSenderId', settings.language === 'en' ? 'Messaging Sender ID (optional)' : 'Messaging Sender ID (opcional)'],
                          ] as const).map(([field, label]) => (
                            <div key={field}>
                              <label className="text-[10px] text-slate-500 block mb-1">{label}</label>
                              <input
                                type="text"
                                value={customFbForm[field as keyof typeof customFbForm]}
                                onChange={e => setCustomFbForm(f => ({ ...f, [field]: e.target.value }))}
                                placeholder={FIREBASE_CONFIG[field as keyof typeof FIREBASE_CONFIG] ? '•'.repeat(8) : ''}
                                className="w-full h-8 rounded-lg border border-white/[0.025] bg-[#111827] text-slate-200 text-xs px-3 focus:outline-none focus:border-primary/60"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={handleSaveCustomFirebase} className="flex-1">
                            {t('settings.firebase_custom_save_btn')}
                          </Button>
                          {isUsingCustomFirebase() && (
                            <Button size="sm" variant="ghost" onClick={handleClearCustomFirebase}>
                              {t('settings.firebase_custom_default_btn')}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Section>

                {/* Profile privacy */}
                <Section icon={Shield} color="purple" title={t('settings.section_profile_privacy')} subtitle={t('settings.section_profile_privacy_desc')} defaultOpen={false}>
                  <div className="space-y-4">
                    <Input
                      label={t('settings.profile_display_name')}
                      value={settings.profile?.displayName ?? ''}
                      onChange={e => updateProfile({ displayName: e.target.value || undefined })}
                      placeholder={user?.displayName ?? t('settings.profile_display_name_placeholder')}
                      maxLength={60}
                    />

                    <SettingRow label={t('settings.profile_hide_email')} hint={t('settings.profile_hide_email_hint')}>
                      <Toggle
                        value={settings.profile?.hideEmail ?? true}
                        onChange={v => updateProfile({ hideEmail: v })}
                      />
                    </SettingRow>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">{t('settings.profile_visibility')}</label>
                      <select
                        value={settings.profilePrivacy ?? 'private'}
                        onChange={e => updateSettings({ profilePrivacy: e.target.value as 'public' | 'private' | 'friends' })}
                        disabled={user?.provider !== 'google'}
                        className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60 disabled:opacity-50"
                      >
                        <option value="private">{t('settings.profile_visibility_private')}</option>
                        <option value="friends">{t('settings.profile_visibility_friends')}</option>
                        <option value="public">{t('settings.profile_visibility_public')}</option>
                      </select>
                      <p className="text-[10px] text-slate-600 mt-1.5">
                        {user?.provider === 'google' ? t('settings.profile_visibility_hint') : t('settings.profile_visibility_offline_hint')}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-white/[0.025]">
                      <SettingRow label={t('settings.privacy_hide_profile')} hint={t('settings.privacy_hide_profile_hint')}>
                        <Toggle value={settings.privacy?.hideProfile ?? true} onChange={v => updatePrivacySetting('hideProfile', v)} />
                      </SettingRow>
                      <SettingRow label={t('settings.privacy_hide_statistics')}>
                        <Toggle value={settings.privacy?.hideStatistics ?? false} onChange={v => updatePrivacySetting('hideStatistics', v)} />
                      </SettingRow>
                      <SettingRow label={t('settings.privacy_hide_achievements')}>
                        <Toggle value={settings.privacy?.hideAchievements ?? true} onChange={v => updatePrivacySetting('hideAchievements', v)} />
                      </SettingRow>
                      <SettingRow label={t('settings.privacy_hide_collection')}>
                        <Toggle value={settings.privacy?.hideCollection ?? true} onChange={v => updatePrivacySetting('hideCollection', v)} />
                      </SettingRow>
                      <SettingRow label={t('settings.privacy_hide_profit')}>
                        <Toggle value={settings.privacy?.hideTotalProfit ?? true} onChange={v => updatePrivacySetting('hideTotalProfit', v)} />
                      </SettingRow>
                      <SettingRow label={t('settings.privacy_hide_accounts')}>
                        <Toggle value={settings.privacy?.hideAccounts ?? true} onChange={v => updatePrivacySetting('hideAccounts', v)} />
                      </SettingRow>
                      <SettingRow label={t('settings.privacy_hide_history')}>
                        <Toggle value={settings.privacy?.hideHistory ?? true} onChange={v => updatePrivacySetting('hideHistory', v)} />
                      </SettingRow>
                    </div>

                  </div>
                </Section>

                {/* Cache Steam */}
                <Section icon={Zap} color="gold" title={t('settings.section_steam_cache')} subtitle={t('settings.section_steam_cache_desc')} defaultOpen={false}>
                  <p className="text-xs text-slate-500">
                    {t('settings.steam_cache_hint')}
                  </p>

                  {cacheStats !== null && (
                    <div className="bg-[#111827]/60 rounded-xl p-3 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-500">{t('settings.steam_cache_entries')}</p>
                        <p className="text-lg font-mono font-bold text-white">{cacheStats.entries}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">{t('settings.steam_cache_size')}</p>
                        <p className="text-lg font-mono font-bold text-white">{cacheStats.sizeKB} KB</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="ghost" icon={RefreshCw} size="sm" onClick={handleCheckCache} className="flex-1">
                      {t('settings.steam_cache_btn_view')}
                    </Button>
                    <Button variant="danger" icon={Trash2} size="sm" onClick={handleClearCache} className="flex-1">
                      {t('settings.steam_cache_btn_clear')}
                    </Button>
                  </div>
                </Section>

                {/* Exportar Dados */}
                <Section icon={Download} color="green" title={t('settings.section_export')} subtitle={t('settings.section_export_desc', { drops: drops.length, accounts: accounts.length })} defaultOpen={false}>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                    <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {t('settings.export_alert_hint')}
                    </p>
                  </div>

                  {/* Format selection */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">{t('settings.export_format_label')}</p>
                    <div className="flex gap-1.5">
                      {(['csv', 'xlsx', 'txt'] as ExportFormat[]).map(f => (
                        <button
                          key={f}
                          onClick={() => setExportOpts(o => ({ ...o, format: f }))}
                          className={`h-8 px-3 rounded-xl text-xs font-semibold border uppercase transition-all ${
                            exportOpts.format === f
                              ? 'bg-profit/10 border-profit/40 text-profit'
                              : 'bg-[#0d1117] border-white/[0.025] text-slate-500 hover:text-slate-300'
                          }`}
                        >{f}</button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5">
                      {exportOpts.format === 'csv'  && t('settings.export_format_hint_csv')}
                      {exportOpts.format === 'xlsx' && t('settings.export_format_hint_xlsx')}
                      {exportOpts.format === 'txt'  && t('settings.export_format_hint_txt')}
                    </p>
                  </div>

                  {/* Filter selection */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">{t('settings.export_filter_label')}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { id: 'all',    label: t('settings.export_filter_all') },
                        { id: 'sold',   label: t('settings.export_filter_sold') },
                        { id: 'unsold', label: t('settings.export_filter_unsold') },
                      ] as { id: ExportFilter; label: string }[]).map(f => (
                        <button
                          key={f.id}
                          onClick={() => setExportOpts(o => ({ ...o, filter: f.id }))}
                          className={`h-8 px-3 rounded-xl text-xs font-medium border transition-all ${
                            exportOpts.filter === f.id
                              ? 'bg-primary/10 border-primary/40 text-primary'
                              : 'bg-[#0d1117] border-white/[0.025] text-slate-500 hover:text-slate-300'
                          }`}
                        >{f.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Columns configuration */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">{t('settings.export_columns_label')}</p>
                    <div className="space-y-1.5">
                      {([
                        { id: 'all',        label: t('settings.export_columns_all'),         hint: t('settings.export_columns_all_hint') },
                        { id: 'minimal',    label: t('settings.export_columns_minimal'), hint: t('settings.export_columns_minimal_hint') },
                        { id: 'with-dates', label: t('settings.export_columns_dates'),               hint: t('settings.export_columns_dates_hint') },
                      ] as { id: ExportColumns; label: string; hint: string }[]).map(c => (
                        <button
                          key={c.id}
                          onClick={() => setExportOpts(o => ({ ...o, columns: c.id }))}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            exportOpts.columns === c.id
                              ? 'bg-[#111827] border-primary/30'
                              : 'bg-[#0d1117] border-white/[0.025] hover:border-white/[0.06]'
                          }`}
                        >
                          <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                            exportOpts.columns === c.id ? 'border-primary bg-primary' : 'border-slate-600'
                          }`} />
                          <div>
                            <p className={`text-xs font-medium ${exportOpts.columns === c.id ? 'text-white' : 'text-slate-400'}`}>{c.label}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{c.hint}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Export Currency options */}
                  {exportOpts.columns !== 'minimal' && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">{t('settings.export_currency_label')}</p>
                      <div className="flex gap-1.5">
                        {(['BRL', 'USD'] as ExportCurrency[]).map(c => (
                          <button
                            key={c}
                            onClick={() => setExportOpts(o => ({ ...o, currency: c }))}
                            className={`h-8 px-3 rounded-xl text-xs font-semibold border transition-all ${
                              exportOpts.currency === c
                                ? 'bg-primary/10 border-primary/40 text-primary'
                                : 'bg-[#0d1117] border-white/[0.025] text-slate-500 hover:text-slate-300'
                            }`}
                          >{c === 'BRL' ? 'R$ BRL' : '$ USD'}</button>
                        ))}
                      </div>
                      {exportOpts.currency === 'USD' && (
                        <p className="text-[10px] text-slate-600 mt-1">
                          {t('settings.export_currency_hint_usd', { rate: settings.usdRate ?? 5.2 })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Export Total row Toggle */}
                  {exportOpts.columns !== 'minimal' && (
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-white">{t('settings.export_total_row_label')}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{t('settings.export_total_row_hint')}</p>
                      </div>
                      <Toggle value={exportOpts.includeTotal} onChange={v => setExportOpts(o => ({ ...o, includeTotal: v }))} />
                    </div>
                  )}

                  {/* Export execution trigger */}
                  <Button
                    onClick={handleExport}
                    disabled={drops.length === 0}
                    size="sm"
                    className="w-full"
                  >
                    <Download size={14} />
                    {t('settings.export_btn_format', { format: exportOpts.format.toUpperCase(), count: drops.length })}
                  </Button>

                  {/* JSON backup export */}
                  <div className="pt-1 border-t border-white/[0.025]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-white">{t('settings.export_backup_label')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('settings.export_backup_hint')}</p>
                      </div>
                      <button
                        onClick={handleExportJSON}
                        disabled={exportingJSON}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-[#111827]/40 border border-white/[0.025] hover:border-gold/40 text-slate-400 hover:text-gold text-xs transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {exportingJSON ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        {t('settings.export_backup_btn')}
                      </button>
                    </div>
                  </div>

                  {/* JSON import wrapper */}
                  <div className="pt-1 border-t border-white/[0.025]">
                    <p className="text-xs text-slate-500 mb-2">{t('settings.export_import_label')}</p>
                    <input type="file" accept=".json" ref={importRef} onChange={handleImportJSON} className="hidden" />
                    <Button
                      variant="ghost"
                      icon={Upload}
                      size="sm"
                      loading={importingJSON}
                      onClick={() => importRef.current?.click()}
                      className="w-full"
                    >
                      {t('settings.export_import_btn')}
                    </Button>
                    <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {t('settings.export_import_warning')}
                    </p>
                  </div>
                </Section>

                {/* Apagar dados seletivamente */}
                <Section icon={Lock} color="purple" title={t('settings.section_selective_clear')} subtitle={t('settings.section_selective_clear_desc')} defaultOpen={false}>
                  <div>
                    <p className="text-xs text-slate-400 mb-3">{t('settings.selective_clear_hint')}</p>
                    <div className="space-y-2">
                      {/* Drops delete row */}
                      <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.025]">
                        <div className="min-w-0">
                          <p className="text-sm text-white">{t('settings.selective_clear_drops')}</p>
                          <p className="text-xs text-slate-500">
                            {t('settings.selective_clear_drops_count', { count: drops.length, s: drops.length !== 1 ? 's' : '' })}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          icon={deleteConfirm === 'drops' ? AlertTriangle : Trash2}
                          size="sm"
                          onClick={() => handleSelectiveDelete('drops')}
                          disabled={drops.length === 0}
                        >
                          {deleteConfirm === 'drops' ? t('settings.selective_clear_confirm_btn') : t('settings.selective_clear_delete_btn')}
                        </Button>
                      </div>

                      {/* Accounts delete row */}
                      <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.025]">
                        <div className="min-w-0">
                          <p className="text-sm text-white">{t('settings.selective_clear_accounts')}</p>
                          <p className="text-xs text-slate-500">
                            {t('settings.selective_clear_accounts_count', { count: accounts.length, s: accounts.length !== 1 ? 's' : '' })}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          icon={deleteConfirm === 'accounts' ? AlertTriangle : Trash2}
                          size="sm"
                          onClick={() => handleSelectiveDelete('accounts')}
                          disabled={accounts.length === 0}
                        >
                          {deleteConfirm === 'accounts' ? t('settings.selective_clear_confirm_btn') : t('settings.selective_clear_delete_btn')}
                        </Button>
                      </div>

                      {/* Goals delete row */}
                      <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.025]">
                        <div className="min-w-0">
                          <p className="text-sm text-white">{t('settings.selective_clear_goals')}</p>
                          <p className="text-xs text-slate-500">
                            {t('settings.selective_clear_goals_count', { count: goals.length, s: goals.length !== 1 ? 's' : '' })}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          icon={deleteConfirm === 'goals' ? AlertTriangle : Trash2}
                          size="sm"
                          onClick={() => handleSelectiveDelete('goals')}
                          disabled={goals.length === 0}
                        >
                          {deleteConfirm === 'goals' ? t('settings.selective_clear_confirm_btn') : t('settings.selective_clear_delete_btn')}
                        </Button>
                      </div>

                      {/* Config defaults reset row */}
                      <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.025]">
                        <div className="min-w-0">
                          <p className="text-sm text-white">{t('settings.selective_clear_settings')}</p>
                          <p className="text-xs text-slate-500">{t('settings.selective_clear_settings_desc')}</p>
                        </div>
                        <Button
                          variant="danger"
                          icon={deleteConfirm === 'settings' ? AlertTriangle : RotateCcw}
                          size="sm"
                          onClick={() => handleSelectiveDelete('settings')}
                        >
                          {deleteConfirm === 'settings' ? t('settings.selective_clear_confirm_btn') : t('settings.selective_clear_reset_btn')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Storage usage details */}
                  <div className="flex items-start gap-3 p-3 bg-[#111827]/60 border border-white/[0.025] rounded-xl mt-2">
                    <Info size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>{t('settings.privacy_notice')}</p>
                    </div>
                  </div>
                </Section>

                {/* Danger Zone */}
                <Section icon={Shield} color="red" title={t('settings.section_danger')} subtitle={t('settings.section_danger_desc')} defaultOpen={false}>
                  <div className="space-y-3">
                    {/* Reset local data */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-white">{t('settings.danger_clear_local')}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{t('settings.danger_clear_local_hint')}</p>
                      </div>
                      <Button
                        variant="danger"
                        icon={resetConfirm ? AlertTriangle : Trash2}
                        onClick={handleReset}
                        className="shrink-0"
                      >
                        {resetConfirm ? t('settings.selective_clear_confirm_btn') : t('settings.selective_clear_reset_btn')}
                      </Button>
                    </div>

                    {/* Delete account permanently */}
                    {user && (
                      <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-loss/20 bg-loss/5">
                        <div className="min-w-0">
                          <p className="text-sm text-white">{t('settings.danger_delete_account')}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t('settings.danger_delete_account_hint')}
                            {deleteAccountConfirm === 1 && <span className="text-gold">{t('settings.danger_delete_account_confirm1')}</span>}
                            {deleteAccountConfirm === 2 && <span className="text-loss">{t('settings.danger_delete_account_confirm2')}</span>}
                          </p>
                        </div>
                        <Button
                          variant="danger"
                          icon={deleteAccountConfirm > 0 ? AlertTriangle : UserX}
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="shrink-0"
                        >
                          {deletingAccount ? (settings.language === 'en' ? 'Deleting...' : 'Apagando...') : deleteAccountConfirm === 0 ? (settings.language === 'en' ? 'Delete' : 'Excluir') : t('settings.selective_clear_confirm_btn')}
                        </Button>
                      </div>
                    )}
                  </div>
                </Section>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Version & Legal Footer */}
      <div className="text-center text-xs text-slate-700 pt-5 space-y-1.5 border-t border-white/[0.025] mt-8">
        <p>{t('settings.footer_version')}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
            {t('settings.footer_privacy')}
          </button>
          <span>·</span>
          <button onClick={() => setLegalModal('terms')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
            {t('settings.footer_terms')}
          </button>
          <span>·</span>
          <a href="https://github.com/spxmiguel/LootFlow" target="_blank" rel="noreferrer"
            className="hover:text-slate-500 transition-colors inline-flex items-center gap-1 underline underline-offset-2">
            {t('settings.footer_github')} <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
    </>
  )
}
