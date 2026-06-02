import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Target, Trash2, Edit3, CheckCircle2, Clock, TrendingUp, Package, DollarSign, Zap, Search, X, Loader2 } from 'lucide-react'
import { useStore } from '../store'
import { calcDashboardStats, calcGoalProgress, calcWeekStats } from '../lib/calculations'
import { formatCurrency, formatDate, getCurrentWeekId } from '../lib/utils'
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
  const [name, setName]       = useState(initial?.name ?? '')
  const [target, setTarget]   = useState(String(initial?.targetAmount ?? ''))
  const [type, setType]       = useState<Goal['type']>(initial?.type ?? 'profit')
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0,10) ?? '')
  const [color, setColor]     = useState(initial?.color ?? GOAL_COLORS[0])
  const [targetItem, setTargetItem] = useState<SteamItem | null>(initial?.targetItem ?? null)
  const [errors, setErrors]   = useState<Record<string,string>>({})

  function handleSave() {
    const e: Record<string,string> = {}
    if (!name.trim()) e.name = 'Obrigatório'
    const n = parseGoalTarget(target, type)
    const max = type === 'drops' ? MAX_DROPS_GOAL : MAX_MONEY_GOAL
    if (n == null || n <= 0) e.target = type === 'drops' ? 'Quantidade inválida' : 'Valor inválido'
    else if (n > max) e.target = type === 'drops' ? `Máximo de ${max} drops` : `Máximo de ${formatCurrency(max, currency)}`
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      name: name.trim(), targetAmount: n!, type,
      deadline: deadline || undefined, color,
      targetItem: targetItem ?? undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={initial ? 'Editar Meta' : 'Nova Meta'} size="md">
      <div className="space-y-4">
        <Input label={t('goals.name_label')} value={name} onChange={e => setName(e.target.value)}
          placeholder={t('goals.name_placeholder')} error={errors.name} maxLength={80} />

        <div>
          <label className="text-xs text-slate-400 block mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {goalTypes.map(gt => (
              <button key={gt.value} onClick={() => setType(gt.value)}
                className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${
                  type === gt.value
                    ? 'border-primary/60 bg-primary/10 text-white'
                    : 'border-white/[0.08] text-slate-400 hover:border-white/20 bg-[#111827]'
                }`}>
                <gt.icon size={14} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium">{gt.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{gt.desc}</p>
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
        />

        <div>
          <label className="text-xs text-slate-400 block mb-2">
            Item alvo no CS2 <span className="text-slate-600 font-normal">(opcional)</span>
          </label>
          <GoalItemPicker value={targetItem} onChange={setTargetItem} />
        </div>

        <Input label="Prazo (opcional)" type="date" value={deadline}
          onChange={e => setDeadline(e.target.value)} />

        <div>
          <label className="text-xs text-slate-400 block mb-2">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {GOAL_COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-lg transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0d1117] scale-110' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} className="flex-1">{initial ? 'Salvar' : 'Criar Meta'}</Button>
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

  return (
    <Card className={`p-5 relative overflow-hidden ${isDone ? 'border-profit/30' : ''}`}>
      {/* top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ backgroundColor: goal.color }} />

      {isDone && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-profit/20 text-profit text-[10px] px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} /> Concluída!
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 mb-4">
        {goal.targetItem ? (
          <div className="w-10 h-10 rounded-lg bg-[#111827] border border-white/[0.08] shrink-0 overflow-hidden flex items-center justify-center">
            <SteamItemImage imageUrl={goal.targetItem.imageUrl} alt={goal.targetItem.name} size={40} />
          </div>
        ) : (
          <div className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: goal.color + '20', color: goal.color }}>
            <typeInfo.icon size={16} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">{goal.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {goal.targetItem ? goal.targetItem.name.split('|')[0].trim() : typeInfo.label}
          </p>
        </div>
        {!isDone && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-[#1a2235] transition-colors">
              <Edit3 size={13} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-loss hover:bg-loss/10 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
        {isDone && (
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-500 hover:text-loss hover:bg-loss/10 transition-colors">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Progresso</span>
          <span className="text-xs font-mono font-semibold" style={{ color: goal.color }}>
            {clamped.toFixed(1)}%
          </span>
        </div>
        <Progress value={clamped} color={goal.color} size="md" />
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Atual</p>
          <p className="font-mono font-semibold text-white">
            {isMonetary ? formatCurrency(currentValue, currency) : Math.round(currentValue).toString()}
          </p>
        </div>
        <div className="text-center text-xs text-slate-500">
          Falta {isMonetary
            ? formatCurrency(Math.max(0, goal.targetAmount - currentValue), currency)
            : Math.max(0, Math.round(goal.targetAmount - currentValue)).toString()}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Meta</p>
          <p className="font-mono font-semibold text-white">
            {isMonetary ? formatCurrency(goal.targetAmount, currency) : goal.targetAmount.toString()}
          </p>
        </div>
      </div>

      {goal.deadline && (
        <div className={`mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-1.5 text-xs ${isOverdue ? 'text-loss' : 'text-slate-500'}`}>
          <Clock size={11} />
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
