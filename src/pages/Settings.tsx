import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Settings2, Palette, Database, Download, Upload, Trash2,
  Shield, RotateCcw, Check, AlertTriangle, Zap, ChevronRight,
  RefreshCw, Lock, Info, ExternalLink, ChevronDown, UserX, MessageCircle,
} from 'lucide-react'
import { LegalModal, type LegalType } from '../components/LegalModal'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { exportDropsCSV, exportDropsXLSX, exportBackupJSON } from '../lib/export'
import { storage } from '../lib/storage'
import { clearSteamCache, getSteamCacheStats } from '../lib/steam'
import { CUSTOM_FIREBASE_KEY, getCustomFirebaseConfig, isUsingCustomFirebase, FIREBASE_CONFIG } from '../lib/config'
import { formatCurrency } from '../lib/utils'
import { Button, Card, Input, Toggle } from '../components/ui'
import { firestoreQueueNotification } from '../lib/firebase'
import toast from 'react-hot-toast'

const SECTION_COLORS = {
  blue: 'bg-primary/10 text-primary',
  green: 'bg-profit/10 text-profit',
  gold: 'bg-gold/10 text-gold',
  red: 'bg-loss/10 text-loss',
  purple: 'bg-purple-400/10 text-purple-400',
}

function Section({ icon: Icon, color, title, subtitle, children }: {
  icon: any; color: keyof typeof SECTION_COLORS
  title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-lg ${SECTION_COLORS[color]}`}>
          <Icon size={16} />
        </div>
        <div>
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
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

// ─── WhatsApp Section ─────────────────────────────────────────────────────────

function WhatsAppSection() {
  const { settings, updateSettings } = useStore()
  const { user } = useAuth()
  const [testing, setTesting] = useState(false)

  const wa = settings.whatsapp
  const phone = wa?.phone ?? ''
  const enabled = wa?.enabled ?? false
  const quietStart = wa?.quietStart ?? '22:00'
  const quietEnd = wa?.quietEnd ?? '08:00'
  const remindDays = wa?.remindDays ?? [2, 3, 4]
  const encheSaco = wa?.encheSaco ?? false
  const weeklySummary = wa?.weeklySummary ?? true

  const updateWA = useCallback((patch: Partial<NonNullable<typeof wa>>) => {
    updateSettings({
      whatsapp: {
        phone, enabled, quietStart, quietEnd, remindDays, encheSaco, weeklySummary,
        ...wa,
        ...patch,
      },
    })
  }, [wa, phone, enabled, quietStart, quietEnd, remindDays, encheSaco, weeklySummary, updateSettings])

  async function handleTest() {
    if (!user?.uid) { toast.error('Você precisa estar logado'); return }
    if (!phone) { toast.error('Adicione seu número primeiro'); return }
    setTesting(true)
    try {
      await firestoreQueueNotification(user.uid, 'test')
      toast.success('Solicitação enviada! O bot vai te mandar uma mensagem em segundos.')
    } catch {
      toast.error('Erro ao enviar solicitação. Verifique o Firebase.')
    } finally {
      setTesting(false)
    }
  }

  const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const hasPhone = phone.length >= 12
  const botStatus = !hasPhone
    ? { label: '📱 Número não configurado', color: 'text-slate-500' }
    : !enabled
    ? { label: '⏸ Lembretes desativados', color: 'text-slate-500' }
    : { label: '✅ Ativo — aguardando bot no VPS', color: 'text-profit' }

  return (
    <Section icon={MessageCircle} color="green" title="Notificações WhatsApp" subtitle="Lembretes automáticos de drop via bot">
      <div className="space-y-5">

        {/* Info */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0d1117] border border-white/[0.06]">
          <Info size={13} className="text-slate-500 mt-0.5 shrink-0" />
          <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
            <p>Requer o bot <span className="text-slate-300 font-medium">lootflow-bot</span> rodando no VPS (Oracle Cloud Free Tier).</p>
            <p>O número do WhatsApp que você coloca aqui é o SEU número — onde você vai <span className="text-slate-300">receber</span> as mensagens. O bot usa um número dedicado pra enviar.</p>
          </div>
        </div>

        {/* Toggle principal + status */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06]">
          <div>
            <p className="text-sm text-white font-medium">Ativar lembretes</p>
            <p className={`text-[11px] mt-0.5 ${botStatus.color}`}>{botStatus.label}</p>
          </div>
          <Toggle value={enabled} onChange={v => updateWA({ enabled: v })} />
        </div>

        {/* Número — opcional */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">
            Seu número do WhatsApp <span className="text-slate-600">(opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">+55</span>
            <input
              type="tel"
              value={phone.startsWith('55') ? phone.slice(2) : phone}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 11)
                updateWA({ phone: digits ? `55${digits}` : '' })
              }}
              placeholder="11 99999-9999"
              className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm pl-10 pr-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1">DDD + número, somente dígitos. Deixe vazio para não receber mensagens.</p>
        </div>

        {/* Opções de mensagem */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 block">Tipos de mensagem</label>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06]">
            <div>
              <p className="text-sm text-white">Resumo semanal</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Toda terça: drops da semana, cashout e contas</p>
            </div>
            <Toggle value={weeklySummary} onChange={v => updateWA({ weeklySummary: v })} />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-loss/20">
            <div>
              <p className="text-sm text-white">Modo "enche o saco" 😤</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Lembretes mais frequentes e urgentes até você registrar</p>
            </div>
            <Toggle value={encheSaco} onChange={v => updateWA({ encheSaco: v })} />
          </div>
        </div>

        {/* Dias de lembrete */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Dias de lembrete</label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((label, day) => {
              const active = remindDays.includes(day)
              return (
                <button
                  key={day}
                  onClick={() => updateWA({
                    remindDays: active
                      ? remindDays.filter(d => d !== day)
                      : [...remindDays, day].sort(),
                  })}
                  className={`h-8 px-3 rounded-xl text-xs font-medium border transition-all ${
                    active
                      ? 'bg-profit/10 border-profit/40 text-profit'
                      : 'bg-[#111827] border-white/[0.08] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Horário de silêncio */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Horário de silêncio</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input type="time" value={quietStart}
                onChange={e => updateWA({ quietStart: e.target.value })}
                className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
              />
              <p className="text-[10px] text-slate-600 mt-1 text-center">início</p>
            </div>
            <span className="text-slate-600">→</span>
            <div className="flex-1">
              <input type="time" value={quietEnd}
                onChange={e => updateWA({ quietEnd: e.target.value })}
                className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
              />
              <p className="text-[10px] text-slate-600 mt-1 text-center">fim</p>
            </div>
          </div>
        </div>

        {/* Botão de teste */}
        <div className="pt-1 border-t border-white/[0.06]">
          <Button
            onClick={handleTest}
            disabled={testing || !hasPhone}
            variant="ghost"
            size="sm"
            className="w-full border border-white/[0.1] hover:border-profit/40 hover:text-profit"
          >
            {testing ? '⏳ Enviando...' : '📲 Enviar mensagem de teste'}
          </Button>
          <p className="text-[10px] text-slate-600 mt-1.5 text-center">
            {hasPhone ? 'O bot precisa estar rodando no VPS para funcionar' : 'Configure seu número para testar'}
          </p>
        </div>
      </div>
    </Section>
  )
}

export default function Settings() {
  const {
    accounts, drops, goals, settings,
    updateSettings, updateTheme, reset,
    clearDrops, clearAccounts, clearGoals, resetSettingsToDefault,
  } = useStore()
  const { user, deleteAccount } = useAuth()

  const [resetConfirm, setResetConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<'drops' | 'accounts' | 'goals' | 'settings' | null>(null)
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(0)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalType | null>(null)
  const [cacheStats, setCacheStats] = useState<{ entries: number; sizeKB: number } | null>(null)
  const [showCustomFirebase, setShowCustomFirebase] = useState(false)
  const [showFirebaseTutorial, setShowFirebaseTutorial] = useState(false)
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

  // ── Handlers ──

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
      toast.error('Preencha pelo menos: API Key, Auth Domain, Project ID e App ID.')
      return
    }
    if (!authDomain.includes('.') || authDomain.includes('<') || authDomain.includes('>')) {
      toast.error('Auth Domain inválido (ex: meu-projeto.firebaseapp.com)')
      return
    }
    if (!/^[a-z0-9-]+$/.test(projectId)) {
      toast.error('Project ID inválido — use apenas letras minúsculas, números e hífens.')
      return
    }
    if (!appId.startsWith('1:')) {
      toast.error('App ID inválido — deve começar com "1:" (ex: 1:123456:web:abc123)')
      return
    }
    try {
      localStorage.setItem(CUSTOM_FIREBASE_KEY, JSON.stringify(customFbForm))
      toast.success('Firebase próprio salvo! Recarregue a página para ativar.')
    } catch {
      toast.error('Erro ao salvar configuração.')
    }
  }

  function handleClearCustomFirebase() {
    localStorage.removeItem(CUSTOM_FIREBASE_KEY)
    setCustomFbForm({ apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' })
    toast.success('Firebase padrão restaurado. Recarregue a página.')
  }

  function handleCashoutRate(val: number) {
    updateSettings({ cashoutRate: Math.min(100, Math.max(0, val)) })
  }

  function handleExportCSV() {
    try {
      exportDropsCSV(drops, accounts, settings)
      toast.success('CSV exportado!')
    } catch (e) {
      toast.error('Erro ao exportar CSV')
    }
  }

  function handleExportXLSX() {
    try {
      exportDropsXLSX(drops, accounts, settings)
      toast.success('XLSX exportado!')
    } catch (e) {
      toast.error('Erro ao exportar XLSX')
    }
  }

  function handleExportJSON() {
    try {
      exportBackupJSON(storage.exportAll())
      toast.success('Backup exportado!')
    } catch (e) {
      toast.error('Erro ao exportar backup')
    }
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 5 MB)')
      return
    }
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      toast.error('Apenas arquivos .json são aceitos')
      return
    }

    const reader = new FileReader()
    reader.onerror = () => toast.error('Erro ao ler o arquivo')
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result
        if (typeof raw !== 'string') throw new Error('Leitura inválida')
        const data = JSON.parse(raw)
        storage.validateImport(data)
        storage.importAll(data)
        toast.success('Backup importado com sucesso!')
        setTimeout(() => window.location.reload(), 800)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Arquivo inválido')
      }
    }
    reader.readAsText(file)
  }

  function handleClearCache() {
    clearSteamCache()
    toast.success('Cache Steam limpo!')
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
    toast.success('Dados apagados')
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
    if (type === 'drops') { clearDrops(); toast.success('Drops apagados') }
    else if (type === 'accounts') { clearAccounts(); toast.success('Contas apagadas') }
    else if (type === 'goals') { clearGoals(); toast.success('Metas apagadas') }
    else if (type === 'settings') { resetSettingsToDefault(); toast.success('Configurações restauradas') }
  }

  const cashoutRate = settings.cashoutRate

  return (
    <>
    {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    <div className="p-4 md:p-6 space-y-5 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-display font-bold text-white">Configurações</h1>
        <p className="text-slate-500 text-sm mt-0.5">Personalize o LootFlow ao seu jeito</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Finanças ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Section icon={Settings2} color="blue" title="Financeiro" subtitle="Parâmetros de cálculo">
            {/* Cashout rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white">Taxa de Cashout</p>
                <span className="text-lg font-mono font-bold text-primary">{cashoutRate}%</span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Percentual do valor bruto que você realmente recebe na venda.<br/>
                Ex: item R$10 de valor bruto → cashout {formatCurrency(10 * cashoutRate / 100)}
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
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Ou insira manualmente</label>
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

            {/* Currency - fixed BRL */}
            <SettingRow label="Moeda" hint="Todos os valores em Real Brasileiro (R$)">
              <div className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                R$ BRL
              </div>
            </SettingRow>

            {/* Weekly goal */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Meta semanal de cashout (R$)</label>
              <Input
                type="number"
                min="0"
                step="10"
                value={String(settings.weeklyGoalAmount)}
                onChange={e => updateSettings({ weeklyGoalAmount: Number(e.target.value) })}
                placeholder="50"
              />
            </div>
          </Section>
        </motion.div>

        {/* ── Aparência ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Section icon={Palette} color="purple" title="Aparência" subtitle="Cores e efeitos visuais">
            {/* Primary color */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Cor Principal</label>
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
                  className="w-8 h-8 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
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
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Cor de Destaque</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={settings.theme.accentColor}
                  onChange={e => updateTheme({ accentColor: e.target.value })}
                  className="w-8 h-8 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                />
                <Input
                  value={settings.theme.accentColor}
                  onChange={e => updateTheme({ accentColor: e.target.value })}
                  className="w-28 font-mono text-xs"
                  placeholder="#4ade80"
                />
              </div>
            </div>

            <SettingRow label="Glassmorphism" hint="Efeito de vidro nas cards">
              <Toggle
                value={settings.theme.glassmorphism}
                onChange={v => updateTheme({ glassmorphism: v })}
              />
            </SettingRow>

            <SettingRow label="Otimizar site" hint="Desativa animações e efeitos para melhor performance">
              <Toggle
                value={!settings.theme.animations}
                onChange={v => updateTheme({ animations: !v })}
              />
            </SettingRow>

            <SettingRow label="Sidebar compacta" hint="Colapsa labels no menu lateral">
              <Toggle
                value={settings.theme.sidebarCompact}
                onChange={v => updateTheme({ sidebarCompact: v })}
              />
            </SettingRow>
          </Section>
        </motion.div>

        {/* ── Exportação ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Section icon={Download} color="green" title="Exportar Dados" subtitle={`${drops.length} drops · ${accounts.length} contas`}>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleExportCSV}
                disabled={drops.length === 0}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#111827]/40 hover:bg-[#111827] border border-white/[0.08] hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Exportar CSV</p>
                  <p className="text-xs text-slate-500">Tabela simples de todos os drops</p>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-primary transition-colors" />
              </button>

              <button
                onClick={handleExportXLSX}
                disabled={drops.length === 0}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#111827]/40 hover:bg-[#111827] border border-white/[0.08] hover:border-profit/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Exportar XLSX</p>
                  <p className="text-xs text-slate-500">Excel com abas: Drops + Contas</p>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-profit transition-colors" />
              </button>

              <button
                onClick={handleExportJSON}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#111827]/40 hover:bg-[#111827] border border-white/[0.08] hover:border-gold/50 transition-all group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Backup JSON</p>
                  <p className="text-xs text-slate-500">Exporta tudo: contas, drops, metas</p>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-gold transition-colors" />
              </button>
            </div>

            <div className="pt-1 border-t border-white/[0.08]">
              <p className="text-xs text-slate-500 mb-2">Importar backup</p>
              <input type="file" accept=".json" ref={importRef} onChange={handleImportJSON} className="hidden" />
              <Button
                variant="ghost"
                icon={Upload}
                size="sm"
                onClick={() => importRef.current?.click()}
                className="w-full"
              >
                Importar JSON
              </Button>
              <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle size={10} />
                Isso vai sobrescrever todos os dados atuais
              </p>
            </div>
          </Section>
        </motion.div>

        {/* ── Cache Steam ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Section icon={Zap} color="gold" title="Cache Steam" subtitle="Preços salvos localmente">
            <p className="text-xs text-slate-500">
              O LootFlow salva preços do Steam Market localmente por 30 minutos para não sobrecarregar a API e manter a UI responsiva.
            </p>

            {cacheStats !== null && (
              <div className="bg-[#111827]/60 rounded-xl p-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Itens em cache</p>
                  <p className="text-lg font-mono font-bold text-white">{cacheStats.entries}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tamanho aprox.</p>
                  <p className="text-lg font-mono font-bold text-white">{cacheStats.sizeKB} KB</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" icon={RefreshCw} size="sm" onClick={handleCheckCache} className="flex-1">
                Ver Cache
              </Button>
              <Button variant="danger" icon={Trash2} size="sm" onClick={handleClearCache} className="flex-1">
                Limpar Cache
              </Button>
            </div>
          </Section>
        </motion.div>

        {/* ── Firebase ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2"
        >
          <Section icon={Database} color="blue" title="Firebase" subtitle="Sincronização na nuvem">
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-start gap-3 p-3 bg-profit/5 border border-profit/20 rounded-xl">
                <Check size={15} className="text-profit mt-0.5 flex-shrink-0" />
                <div className="text-xs text-slate-400">
                  <p className="text-profit font-semibold mb-1">
                    {isUsingCustomFirebase() ? 'Firebase próprio ativo ✓' : 'Firebase padrão ativo ✓'}
                  </p>
                  <p>Login com Google disponível. Dados sincronizam entre dispositivos.</p>
                </div>
              </div>

              {/* Custom Firebase toggle */}
              <button
                onClick={() => setShowCustomFirebase(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.06] hover:border-white/[0.12] transition-colors text-left"
              >
                <div>
                  <p className="text-sm text-white">Usar Firebase próprio</p>
                  <p className="text-xs text-slate-500 mt-0.5">Para privacidade total — seus dados ficam no seu projeto Firebase</p>
                </div>
                <ChevronDown size={15} className={`text-slate-500 transition-transform ${showCustomFirebase ? 'rotate-180' : ''}`} />
              </button>

              {showCustomFirebase && (
                <div className="space-y-3 p-3 rounded-xl bg-[#0d1117] border border-white/[0.06]">
                  {/* Tutorial */}
                  <button
                    onClick={() => setShowFirebaseTutorial(v => !v)}
                    className="w-full flex items-center justify-between text-xs text-primary hover:underline"
                  >
                    <span>Como criar meu Firebase?</span>
                    <ChevronDown size={13} className={`transition-transform ${showFirebaseTutorial ? 'rotate-180' : ''}`} />
                  </button>

                  {showFirebaseTutorial && (
                    <div className="text-xs text-slate-500 space-y-1.5 p-3 bg-black/20 rounded-xl leading-relaxed">
                      <p className="text-slate-300 font-semibold">Tutorial — Firebase gratuito em 5 passos:</p>
                      <p>1. Acesse <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-primary underline">console.firebase.google.com</a> → "Criar projeto"</p>
                      <p>2. Crie o projeto (desative Google Analytics se quiser)</p>
                      <p>3. Clique em "Web" (&lt;/&gt;) → registre o app → copie o objeto <code className="text-slate-300">firebaseConfig</code></p>
                      <p>4. No menu lateral: <strong className="text-slate-300">Build → Firestore Database</strong> → criar banco → "Modo produção"</p>
                      <p>5. Em Firestore → <strong className="text-slate-300">Rules</strong>, cole:</p>
                      <pre className="font-mono text-[10px] bg-black/30 rounded-lg px-2 py-1.5 text-slate-400 whitespace-pre-wrap">{'rules_version = \'2\';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /users/{uid}/{d=**} {\n      allow read, write: if request.auth.uid == uid;\n    }\n  }\n}'}</pre>
                      <p>6. Em Authentication → <strong className="text-slate-300">Get Started</strong> → ative "Google"</p>
                      <p>7. Em Authentication → <strong className="text-slate-300">Settings → Authorized domains</strong> → adicione seu domínio (ex: <code className="text-slate-300">spxmiguel.github.io</code>)</p>
                      <p>8. Cole os valores abaixo e salve.</p>
                    </div>
                  )}

                  {/* Form */}
                  <div className="space-y-2">
                    {([
                      ['apiKey', 'API Key *'],
                      ['authDomain', 'Auth Domain * (ex: meu-projeto.firebaseapp.com)'],
                      ['projectId', 'Project ID *'],
                      ['appId', 'App ID *'],
                      ['storageBucket', 'Storage Bucket (opcional)'],
                      ['messagingSenderId', 'Messaging Sender ID (opcional)'],
                    ] as const).map(([field, label]) => (
                      <div key={field}>
                        <label className="text-[10px] text-slate-500 block mb-1">{label}</label>
                        <input
                          type="text"
                          value={customFbForm[field as keyof typeof customFbForm]}
                          onChange={e => setCustomFbForm(f => ({ ...f, [field]: e.target.value }))}
                          placeholder={FIREBASE_CONFIG[field as keyof typeof FIREBASE_CONFIG] ? '•'.repeat(8) : ''}
                          className="w-full h-8 rounded-lg border border-white/[0.1] bg-[#111827] text-slate-200 text-xs px-3 focus:outline-none focus:border-primary/60"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={handleSaveCustomFirebase} className="flex-1">
                      Salvar e recarregar
                    </Button>
                    {isUsingCustomFirebase() && (
                      <Button size="sm" variant="ghost" onClick={handleClearCustomFirebase}>
                        Usar padrão
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </motion.div>

        {/* ── WhatsApp ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.27 }}
          className="lg:col-span-2"
        >
          <WhatsAppSection />
        </motion.div>

        {/* ── Privacidade ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="lg:col-span-2"
        >
          <Section icon={Lock} color="purple" title="Privacidade" subtitle="Controle total sobre seus dados">
            {/* Firebase sync toggle */}
            <SettingRow
              label="Sincronizar com Firebase"
              hint="Com sync ativo, exclusões locais também removem do Firestore. Desativado, novas alterações ficam só no dispositivo."
            >
              <Toggle
                value={settings.firebaseSyncEnabled !== false}
                onChange={v => updateSettings({ firebaseSyncEnabled: v })}
              />
            </SettingRow>

            {/* Selective deletion */}
            <div>
              <p className="text-xs text-slate-400 mb-3">Apagar dados seletivamente</p>
              <div className="space-y-2">
                {/* Drops */}
                <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="text-sm text-white">Drops</p>
                    <p className="text-xs text-slate-500">{drops.length} registro{drops.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button
                    variant="danger"
                    icon={deleteConfirm === 'drops' ? AlertTriangle : Trash2}
                    size="sm"
                    onClick={() => handleSelectiveDelete('drops')}
                    disabled={drops.length === 0}
                  >
                    {deleteConfirm === 'drops' ? 'Confirmar?' : 'Apagar'}
                  </Button>
                </div>

                {/* Contas */}
                <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="text-sm text-white">Contas</p>
                    <p className="text-xs text-slate-500">{accounts.length} registro{accounts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button
                    variant="danger"
                    icon={deleteConfirm === 'accounts' ? AlertTriangle : Trash2}
                    size="sm"
                    onClick={() => handleSelectiveDelete('accounts')}
                    disabled={accounts.length === 0}
                  >
                    {deleteConfirm === 'accounts' ? 'Confirmar?' : 'Apagar'}
                  </Button>
                </div>

                {/* Metas */}
                <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="text-sm text-white">Metas</p>
                    <p className="text-xs text-slate-500">{goals.length} registro{goals.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button
                    variant="danger"
                    icon={deleteConfirm === 'goals' ? AlertTriangle : Trash2}
                    size="sm"
                    onClick={() => handleSelectiveDelete('goals')}
                    disabled={goals.length === 0}
                  >
                    {deleteConfirm === 'goals' ? 'Confirmar?' : 'Apagar'}
                  </Button>
                </div>

                {/* Configurações */}
                <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827]/40 border border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="text-sm text-white">Configurações</p>
                    <p className="text-xs text-slate-500">Restaurar valores padrão</p>
                  </div>
                  <Button
                    variant="danger"
                    icon={deleteConfirm === 'settings' ? AlertTriangle : RotateCcw}
                    size="sm"
                    onClick={() => handleSelectiveDelete('settings')}
                  >
                    {deleteConfirm === 'settings' ? 'Confirmar?' : 'Resetar'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Storage disclosure */}
            <div className="flex items-start gap-3 p-3 bg-[#111827]/60 border border-white/[0.06] rounded-xl">
              <Info size={14} className="text-slate-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-500 space-y-1">
                <p>Contas, drops e metas ficam no <span className="text-slate-400">localStorage</span> do seu navegador.</p>
                <p>Se logado com Google, uma cópia é sincronizada no Firestore (desative o toggle acima para impedir).</p>
                <p>Nenhum IP, comportamento de navegação ou dado de terceiros é coletado. Projeto <span className="text-slate-400">open source</span> — você pode auditar o código.</p>
              </div>
            </div>
          </Section>
        </motion.div>

        {/* ── Danger Zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Section icon={Shield} color="red" title="Zona de Perigo" subtitle="Ações irreversíveis">
            <div className="space-y-3">
              {/* Reset local data */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-white">Apagar todos os dados locais</p>
                  <p className="text-xs text-slate-500 mt-0.5">Remove contas, drops, metas e configurações deste dispositivo.</p>
                </div>
                <Button
                  variant="danger"
                  icon={resetConfirm ? AlertTriangle : Trash2}
                  onClick={handleReset}
                  className="shrink-0"
                >
                  {resetConfirm ? 'Confirmar?' : 'Resetar'}
                </Button>
              </div>

              {/* Delete account */}
              {user && (
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-loss/20 bg-loss/5">
                  <div className="min-w-0">
                    <p className="text-sm text-white">Excluir conta permanentemente</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Apaga <strong className="text-slate-400">todos os dados do Firestore</strong> e locais. Conforme LGPD, art. 18.
                      {deleteAccountConfirm === 1 && <span className="text-gold"> Clique mais uma vez para confirmar.</span>}
                      {deleteAccountConfirm === 2 && <span className="text-loss"> Clique para confirmar definitivamente.</span>}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    icon={deleteAccountConfirm > 0 ? AlertTriangle : UserX}
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount}
                    className="shrink-0"
                  >
                    {deletingAccount ? 'Apagando…' : deleteAccountConfirm === 0 ? 'Excluir' : 'Confirmar?'}
                  </Button>
                </div>
              )}
            </div>
          </Section>
        </motion.div>
      </div>

      {/* Version & Legal */}
      <div className="text-center text-xs text-slate-700 pt-2 space-y-1.5">
        <p>LootFlow v1.0.0 · Feito para acompanhar drops com calma</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setLegalModal('privacy')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
            Política de Privacidade
          </button>
          <span>·</span>
          <button onClick={() => setLegalModal('terms')} className="hover:text-slate-500 transition-colors underline underline-offset-2">
            Termos de Uso
          </button>
          <span>·</span>
          <a href="https://github.com/spxmiguel/LootFlow" target="_blank" rel="noreferrer"
            className="hover:text-slate-500 transition-colors inline-flex items-center gap-1 underline underline-offset-2">
            GitHub <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
    </>
  )
}
