import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Target, Trash2, Edit3, CheckCircle2, Clock, TrendingUp, Package, DollarSign, Zap, Search, X, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { calcDashboardStats, calcGoalProgress, calcWeekStats } from '../lib/calculations'
import { formatCurrency, formatDate, getCurrentWeekId, cn } from '../lib/utils'
import { Button, Card, Input, Modal, Empty, Progress } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { searchSteamMarket } from '../lib/steam'
import { useT } from '../hooks/useT'
import type { Goal, SteamItem } from '../lib/types'

const GOAL_COLORS = ['#38bdf8','#4ade80','#fbbf24','#f87171','#a78bfa','#fb923c','#34d399','#e879f9']
const MAX_MONEY_GOAL = 9999.99
const MAX_DROPS_GOAL = 10000

function parseGoalTarget(raw: string, type: Goal['type']): number | null {
  const normalized = raw.trim()
  if (!normalized) return null

  if (type === 'drops') {
    if (!/^\d+$/.test(normalized)) return null
    return Number(normalized)
  }

  const cleaned = normalized.replace(/[^\d.,]/g, '')
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const decimalSeparator = lastComma > lastDot ? ',' : lastDot > -1 ? '.' : ''
  const integerPart = decimalSeparator
    ? cleaned.slice(0, cleaned.lastIndexOf(decimalSeparator)).replace(/[.,]/g, '')
    : cleaned.replace(/[.,]/g, '')
  const decimalPart = decimalSeparator ? cleaned.slice(cleaned.lastIndexOf(decimalSeparator) + 1) : ''

  if (!integerPart && !decimalPart) return null
  if (decimalPart.length > 2) return null

  const parsed = Number(`${integerPart || '0'}${decimalPart ? `.${decimalPart}` : ''}`)
  return Number.isFinite(parsed) ? parsed : null
}

// Static type structure (icons/values) — labels are resolved via t() at render time
export const GOAL_TYPES = [
  { value: 'profit',  label: 'Cashout Total',    icon: DollarSign, desc: 'Cashout real acumulado'       },
  { value: 'revenue', label: 'Receita Steam',     icon: Package,    desc: 'Valor Steam acumulado'        },
  { value: 'cashout', label: 'Cashout Semanal',   icon: TrendingUp, desc: 'Cashout na semana atual'      },
  { value: 'drops',   label: 'Total de Drops',    icon: Zap,        desc: 'Quantidade total de drops'    },
] as const

function useGoalTypes() {
  const t = useT()
  return [
    { value: 'profit',  label: t('goals.type_profit_label'),  icon: DollarSign, desc: t('goals.type_profit_desc')  },
    { value: 'revenue', label: t('goals.type_revenue_label'), icon: Package,    desc: t('goals.type_revenue_desc') },
    { value: 'cashout', label: t('goals.type_cashout_label'), icon: TrendingUp, desc: t('goals.type_cashout_desc') },
    { value: 'drops',   label: t('goals.type_drops_label'),   icon: Zap,        desc: t('goals.type_drops_desc')   },
  ] as const
}

// ─── Mini Item Picker (para metas) ───────────────────────────────────────────

function GoalItemPicker({ value, onChange }: { value: SteamItem | null; onChange: (item: SteamItem | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ name: string; hashName: string; imageUrl: string }>>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const r = await searchSteamMarket(q)
      setResults(r.slice(0, 6))
    } catch { setResults([]) }
    finally { setSearching(false) }
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0d1117] border border-white/[0.08]">
        <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center shrink-0 overflow-hidden">
          <SteamItemImage imageUrl={value.imageUrl} alt={value.name} size={40} />
        </div>
        <p className="flex-1 text-sm text-white font-medium truncate">{value.name}</p>
        <button onClick={() => onChange(null)} className="p-1 text-slate-500 hover:text-loss transition-colors">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />}
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar item CS2 (ex: Bayonet Doppler)"
          maxLength={80}
          className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-xs pl-9 pr-4 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
        />
      </div>
      {results.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1117] overflow-hidden divide-y divide-white/[0.04]">
          {results.map(r => (
            <button
              key={r.hashName}
              onClick={() => { onChange({ name: r.name, marketHashName: r.hashName, imageUrl: r.imageUrl ?? '' }); setQuery(''); setResults([]) }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#111827] shrink-0 overflow-hidden flex items-center justify-center">
                <SteamItemImage imageUrl={r.imageUrl} alt={r.name} size={32} />
              </div>
              <p className="text-xs text-slate-200 truncate">{r.name}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Goal Form ────────────────────────────────────────────────────────────────

function GoalForm({ initial, onSave, onClose }: {
  initial?: Goal
  onSave: (data: Omit<Goal, 'id' | 'createdAt'>) => void
  onClose: () => void
}) {
  const t = useT()
  const { settings } = useStore()
  const currency = settings.currency
  const goalTypes = useGoalTypes()
  const usdRate = settings.usdRate || 5.2

  const [type, setType]       = useState<Goal['type']>(initial?.type ?? 'profit')

  // If currency is USD and goal type is monetary, convert BRL database value to USD for display
  const initialTargetValue = initial?.targetAmount != null
    ? (type === 'drops' ? initial.targetAmount.toString() : (currency === 'USD' ? (initial.targetAmount / usdRate).toFixed(2) : initial.targetAmount.toString()))
    : ''

  const [name, setName]       = useState(initial?.name ?? '')
  const [target, setTarget]   = useState(initialTargetValue)
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0,10) ?? '')
  const [color, setColor]     = useState(initial?.color ?? GOAL_COLORS[0])
  const [targetItem, setTargetItem] = useState<SteamItem | null>(initial?.targetItem ?? null)
  const [errors, setErrors]   = useState<Record<string,string>>({})

  function handleSave() {
    const e: Record<string,string> = {}
    if (!name.trim()) e.name = 'Obrigatório'
    let n = parseGoalTarget(target, type)
    const max = type === 'drops' ? MAX_DROPS_GOAL : MAX_MONEY_GOAL
    
    if (n == null || n <= 0) {
      e.target = type === 'drops' ? 'Quantidade inválida' : 'Valor inválido'
    } else {
      // If currency is USD and type is monetary, convert it back to BRL for validation and saving
      if (type !== 'drops' && currency === 'USD') {
        n = n * usdRate
      }
      if (n > max) {
        e.target = type === 'drops' ? `Máximo de ${max} drops` : `Máximo de ${formatCurrency(max, currency)}`
      }
    }

    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      name: name.trim(), targetAmount: n!, type,
      deadline: deadline || undefined, color,
      targetItem: targetItem ?? undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Editar Meta' : 'Nova Meta'} size="md">
      <div className="space-y-4 pt-1">
        <Input
          label={t('goals.name_label')}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('goals.name_placeholder')}
          error={errors.name}
          maxLength={80}
          className="bg-[#11161d] border-white/[0.08]"
        />

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-body font-medium block">Tipo de Meta</label>
          <div className="grid grid-cols-2 gap-2">
            {goalTypes.map(gt => (
              <button key={gt.value} type="button" onClick={() => setType(gt.value)}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  type === gt.value
                    ? 'border-primary/50 bg-primary/10 text-white shadow-[0_0_12px_rgba(74,222,128,0.06)]'
                    : 'border-white/[0.08] text-slate-400 hover:border-white/20 bg-[#11161d]/60'
                }`}>
                <gt.icon size={15} className={`mt-0.5 flex-shrink-0 ${type === gt.value ? 'text-primary' : 'text-slate-500'}`} />
                <div>
                  <p className="text-xs font-semibold font-body leading-none">{gt.label}</p>
                  <p className="text-[9px] text-slate-500 font-body mt-1 leading-normal">{gt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Input
          label={type === 'drops' ? t('goals.target_label_qty') : t('goals.target_label_money', { currency: currency === 'USD' ? '$' : 'R$' })}
          type="text" inputMode={type === 'drops' ? 'numeric' : 'decimal'}
          value={target} onChange={e => setTarget(e.target.value)}
          placeholder={type === 'drops' ? '100' : '500,00'}
          hint={type === 'drops' ? `Até ${MAX_DROPS_GOAL} drops` : `Até ${formatCurrency(MAX_MONEY_GOAL, currency)}. Aceita 500, 500.00 ou 500,00.`}
          error={errors.target}
          className="bg-[#11161d] border-white/[0.08]"
        />

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-body font-medium block">
            Item Alvo no CS2 <span className="text-slate-600 font-normal font-body">(opcional)</span>
          </label>
          <GoalItemPicker value={targetItem} onChange={setTargetItem} />
        </div>

        <Input
          label="Prazo de Conclusão (opcional)"
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="bg-[#11161d] border-white/[0.08]"
        />

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-body font-medium block">Cor Temática</label>
          <div className="flex gap-2 flex-wrap p-2.5 rounded-xl bg-[#11161d]/60 border border-white/[0.08]">
            {GOAL_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1117] scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-white/[0.04]">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} variant="primary" className="flex-1 font-semibold">{initial ? 'Salvar' : 'Criar Meta'}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, progress, currentValue, onEdit, onDelete }: {
  goal: Goal; progress: number; currentValue: number
  onEdit: () => void; onDelete: () => void
}) {
  const { settings } = useStore()
  const currency = settings.currency
  const goalTypes = useGoalTypes()
  const clamped    = Math.min(100, Math.max(0, progress))
  const isDone     = clamped >= 100
  const typeInfo   = goalTypes.find(gt => gt.value === goal.type) ?? goalTypes[0]
  const isMonetary = goal.type !== 'drops'
  const isOverdue  = goal.deadline && new Date(goal.deadline) < new Date() && !isDone

  // Glowing borders for knife/weapon target items or completed goals
  const hasItemTarget = !!goal.targetItem
  const glowStyle = isDone
    ? 'border-profit/30 shadow-[0_0_18px_rgba(74,222,128,0.12)]'
    : hasItemTarget
    ? 'border-primary/20 shadow-[0_0_18px_rgba(74,222,128,0.08)] bg-gradient-to-br from-[#11161d] to-[#121c1d]'
    : 'border-white/[0.06] hover:border-white/[0.1]'

  return (
    <Card className={cn('p-5 relative overflow-hidden transition-all duration-300 bg-[#11161d]', glowStyle)}>
      {/* top accent */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ backgroundColor: goal.color }} />

      {/* Confetti particles area for completed goals */}
      {isDone && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 select-none bg-gradient-to-b from-[#10b981]/5 to-transparent">
          <span className="absolute w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ top: '25%', left: '20%', animationDuration: '3s' }} />
          <span className="absolute w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ top: '65%', left: '85%', animationDuration: '4.5s' }} />
          <span className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ top: '45%', left: '75%', animationDuration: '3.5s' }} />
          <span className="absolute w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ top: '75%', left: '15%', animationDuration: '4s' }} />
          <span className="absolute w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ top: '15%', left: '60%', animationDuration: '2.8s' }} />
        </div>
      )}

      {isDone && (
        <div className="absolute top-3.5 right-3.5">
          <div className="flex items-center gap-1 bg-profit/15 text-profit text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-profit/20 select-none font-display tracking-wider">
            <CheckCircle2 size={10} className="stroke-[3]" /> Concluída
          </div>
        </div>
      )}

      <div className="flex items-start gap-3.5 mb-4">
        {goal.targetItem ? (
          <div className="w-11 h-11 rounded-xl bg-[#111827]/80 border border-white/[0.08] shrink-0 overflow-hidden flex items-center justify-center relative">
            <SteamItemImage imageUrl={goal.targetItem.imageUrl} alt={goal.targetItem.name} size={44} />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: goal.color + '15', color: goal.color, border: `1px solid ${goal.color}25` }}>
            <typeInfo.icon size={18} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-snug truncate font-body">{goal.name}</h3>
          <p className="text-[10px] text-slate-500 font-semibold font-body uppercase mt-0.5 tracking-wider">
            {goal.targetItem ? 'Alvo: Item CS2' : typeInfo.label}
          </p>
        </div>
        
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.02] transition-colors">
            <Edit3 size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-loss hover:bg-loss/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5 text-[10px] font-semibold text-slate-500 font-body uppercase tracking-wider">
          <span>Progresso</span>
          <span className="font-mono font-bold" style={{ color: goal.color }}>
            {clamped.toFixed(1)}%
          </span>
        </div>
        
        {/* Progress Bar with 25%, 50%, 75% Ticks */}
        <div className="relative w-full h-2 rounded-full bg-white/[0.06] border border-white/[0.03] overflow-hidden p-[1px]">
          <span className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-slate-900 z-10 opacity-60" />
          <span className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-900 z-10 opacity-60" />
          <span className="absolute left-3/4 top-0 bottom-0 w-[1px] bg-slate-900 z-10 opacity-60" />
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${clamped}%`, backgroundColor: goal.color, boxShadow: `0 0 8px ${goal.color}40` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs py-2 px-2.5 rounded-lg bg-[#0e121a]/60 border border-white/[0.02]">
        <div>
          <p className="text-[9px] text-slate-500 font-semibold font-body uppercase tracking-wider">Atual</p>
          <p className="font-mono font-bold text-slate-200 mt-0.5">
            {isMonetary ? formatCurrency(currentValue, currency) : Math.round(currentValue).toString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-slate-500 font-semibold font-body uppercase tracking-wider">Falta</p>
          <p className="font-mono font-medium text-slate-400 mt-0.5">
            {isMonetary
              ? formatCurrency(Math.max(0, goal.targetAmount - currentValue), currency)
              : Math.max(0, Math.round(goal.targetAmount - currentValue)).toString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 font-semibold font-body uppercase tracking-wider">Alvo</p>
          <p className="font-mono font-bold text-slate-200 mt-0.5">
            {isMonetary ? formatCurrency(goal.targetAmount, currency) : goal.targetAmount.toString()}
          </p>
        </div>
      </div>

      {goal.deadline && (
        <div className={`mt-3 pt-3 border-t border-white/[0.04] flex items-center gap-1.5 text-[10px] font-body ${isOverdue ? 'text-loss font-semibold' : 'text-slate-500'}`}>
          <Clock size={11} className={isOverdue ? 'animate-pulse' : ''} />
          <span>{isOverdue ? 'Venceu em' : 'Prazo:'} {formatDate(goal.deadline)}</span>
        </div>
      )}
    </Card>
  )
}

// ─── Goals Page ───────────────────────────────────────────────────────────────

export default function Goals() {
  const { accounts, drops, goals, settings, addGoal, updateGoal, deleteGoal } = useStore()
  const t = useT()
  const [showForm, setShowForm]         = useState(false)
  const [editingGoal, setEditingGoal]   = useState<Goal | null>(null)
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null)

  const dashStats = useMemo(
    () => calcDashboardStats(accounts, drops, goals, settings),
    [accounts, drops, goals, settings]
  )

  const currentWeekStats = useMemo(
    () => calcWeekStats(getCurrentWeekId(), drops, accounts, settings),
    [drops, accounts, settings]
  )

  const goalsWithProgress = useMemo(() =>
    goals.map(g => {
      const progress = calcGoalProgress(g, dashStats, currentWeekStats)
      const currentValue = (() => {
        switch (g.type) {
          case 'revenue': return dashStats.totalSteamValueAllTime
          case 'profit':  return dashStats.totalCashoutAllTime
          case 'cashout': return currentWeekStats.totalCashout
          case 'drops':   return dashStats.totalDropsAllTime
          default:        return 0
        }
      })()
      return { goal: g, progress, currentValue }
    }),
    [goals, dashStats, currentWeekStats]
  )

  const inProgress = goalsWithProgress.filter(g => g.progress < 100)
  const completed  = goalsWithProgress.filter(g => g.progress >= 100)

  function handleSave(data: Omit<Goal, 'id' | 'createdAt'>) {
    if (editingGoal) updateGoal(editingGoal.id, data)
    else addGoal(data)
    setShowForm(false)
    setEditingGoal(null)
  }

  function confirmDeleteGoal() {
    if (!goalToDelete) return
    deleteGoal(goalToDelete.id)
    setGoalToDelete(null)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Metas</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {goals.length === 0 ? 'Defina objetivos para monitorar seu progresso' : `${inProgress.length} em andamento · ${completed.length} concluídas`}
          </p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => { setEditingGoal(null); setShowForm(true) }}>
          Nova Meta
        </Button>
      </div>

      {goals.length === 0 && (
        <Empty
          icon={Target}
          title={t('goals.empty_title')}
          description={t('goals.empty_desc')}
          action={{ label: 'Criar meta', onClick: () => setShowForm(true) }}
        />
      )}

      {inProgress.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Em Andamento ({inProgress.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {inProgress.map(({ goal, progress, currentValue }) => (
              <GoalCard
                key={goal.id} goal={goal} progress={progress} currentValue={currentValue}
                onEdit={() => { setEditingGoal(goal); setShowForm(true) }}
                onDelete={() => setGoalToDelete(goal)}
              />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="opacity-75">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Concluídas ({completed.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completed.map(({ goal, progress, currentValue }) => (
              <GoalCard
                key={goal.id} goal={goal} progress={progress} currentValue={currentValue}
                onEdit={() => { setEditingGoal(goal); setShowForm(true) }}
                onDelete={() => setGoalToDelete(goal)}
              />
            ))}
          </div>
        </div>
      )}

      {goalToDelete && (
        <Modal
          open
          onClose={() => setGoalToDelete(null)}
          title="Excluir meta?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setGoalToDelete(null)}>Cancelar</Button>
              <Button variant="danger" icon={Trash2} onClick={confirmDeleteGoal}>Excluir</Button>
            </>
          }
        >
          <p className="text-sm text-slate-400">
            A meta <span className="font-semibold text-white">{goalToDelete.name}</span> será removida. Essa ação não apaga contas nem drops.
          </p>
        </Modal>
      )}

      <AnimatePresence>
        {showForm && (
          <GoalForm
            initial={editingGoal ?? undefined}
            onSave={handleSave}
            onClose={() => { setShowForm(false); setEditingGoal(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
