import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  UserPlus, Package, DollarSign, Target, Trophy,
  CheckCircle2, Clock,
} from 'lucide-react'
import type { CSAccount, Drop, Goal, AppSettings } from '../lib/types'
import { calcAccountStats, calcGoalProgress, calcDashboardStats, calcWeekStats } from '../lib/calculations'
import { formatCurrency, formatDate, getCurrentWeekId, cn } from '../lib/utils'
import { useT } from '../hooks/useT'
import { useStore } from '../store'
import { Card } from './ui'

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'account_created' | 'drop_registered' | 'drop_sold' | 'goal_created' | 'goal_completed' | 'payback_reached'

interface TimelineEvent {
  id: string
  type: EventType
  date: string           // ISO
  title: string
  detail: string
  icon: typeof UserPlus
  color: string          // tailwind bg class
  textColor: string      // tailwind text class
}

const EVENT_CONFIG: Record<EventType, {
  icon: typeof UserPlus
  color: string
  textColor: string
}> = {
  account_created: { icon: UserPlus, color: 'bg-sky-500/15', textColor: 'text-sky-400' },
  drop_registered: { icon: Package, color: 'bg-primary/15', textColor: 'text-primary' },
  drop_sold:       { icon: DollarSign, color: 'bg-profit/15', textColor: 'text-profit' },
  goal_created:    { icon: Target, color: 'bg-purple-400/15', textColor: 'text-purple-400' },
  goal_completed:  { icon: Trophy, color: 'bg-gold/15', textColor: 'text-gold' },
  payback_reached: { icon: CheckCircle2, color: 'bg-emerald-400/15', textColor: 'text-emerald-400' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TimelineProps {
  accounts: CSAccount[]
  drops: Drop[]
  goals: Goal[]
  settings: AppSettings
  limit?: number
}

export function Timeline({ accounts, drops, goals, settings, limit = 30 }: TimelineProps) {
  const t = useT()
  const lang = settings.language ?? 'pt'
  const currency = settings.currency

  const events = useMemo(() => {
    const all: TimelineEvent[] = []

    // Account creation events
    for (const account of accounts) {
      all.push({
        id: `acc-${account.id}`,
        type: 'account_created',
        date: account.createdAt,
        title: lang === 'en'
          ? `Account "${account.name}" created`
          : `Conta "${account.name}" criada`,
        detail: lang === 'en'
          ? `New Prime account added to tracking`
          : `Nova conta Prime adicionada ao rastreamento`,
        ...EVENT_CONFIG.account_created,
      })
    }

    // Drop registered events (filter to notable ones — top 20% by value or all if < 20 drops)
    const sortedDrops = [...drops].sort((a, b) => b.steamValue - a.steamValue)
    const notableThreshold = drops.length >= 20
      ? sortedDrops[Math.floor(drops.length * 0.2)]?.steamValue ?? 0
      : 0

    for (const drop of drops) {
      const account = accounts.find(a => a.id === drop.accountId)
      const isNotable = drop.steamValue >= notableThreshold || drops.length < 20
      if (!isNotable) continue

      const itemName = drop.item?.name?.split('|')[0].trim() || (lang === 'en' ? 'Drop' : 'Drop')
      const cashout = drop.cashoutValue ?? drop.steamValue * (settings.cashoutRate / 100)

      all.push({
        id: `drop-${drop.id}`,
        type: 'drop_registered',
        date: drop.createdAt ?? drop.registeredAt ?? new Date().toISOString(),
        title: lang === 'en'
          ? `Drop: ${itemName}`
          : `Drop: ${itemName}`,
        detail: lang === 'en'
          ? `${account?.name ?? 'Account'} · ${formatCurrency(cashout, currency)} cashout`
          : `${account?.name ?? 'Conta'} · ${formatCurrency(cashout, currency)} cashout`,
        ...EVENT_CONFIG.drop_registered,
      })
    }

    // Drop sold events
    for (const drop of drops) {
      if (!drop.sold || !drop.soldAt) continue
      const account = accounts.find(a => a.id === drop.accountId)
      const itemName = drop.item?.name?.split('|')[0].trim() || 'Item'

      all.push({
        id: `sold-${drop.id}`,
        type: 'drop_sold',
        date: drop.soldAt,
        title: lang === 'en'
          ? `Sold: ${itemName}`
          : `Vendido: ${itemName}`,
        detail: lang === 'en'
          ? `${account?.name ?? 'Account'} · ${formatCurrency(drop.cashoutValue ?? 0, currency)} received`
          : `${account?.name ?? 'Conta'} · ${formatCurrency(drop.cashoutValue ?? 0, currency)} recebido`,
        ...EVENT_CONFIG.drop_sold,
      })
    }

    // Goal creation events
    for (const goal of goals) {
      all.push({
        id: `goal-${goal.id}`,
        type: 'goal_created',
        date: goal.createdAt,
        title: lang === 'en'
          ? `Goal "${goal.name}" created`
          : `Meta "${goal.name}" criada`,
        detail: lang === 'en'
          ? `Target: ${goal.type === 'drops' ? `${goal.targetAmount} drops` : formatCurrency(goal.targetAmount, currency)}`
          : `Alvo: ${goal.type === 'drops' ? `${goal.targetAmount} drops` : formatCurrency(goal.targetAmount, currency)}`,
        ...EVENT_CONFIG.goal_created,
      })
    }

    // Goal completed events
    const dashStats = calcDashboardStats(accounts, drops, goals, settings)
    const currentWeekStats = calcWeekStats(getCurrentWeekId(), drops, accounts, settings)
    for (const goal of goals) {
      const progress = calcGoalProgress(goal, dashStats, currentWeekStats)
      if (progress >= 100) {
        all.push({
          id: `goal-done-${goal.id}`,
          type: 'goal_completed',
          date: new Date().toISOString(), // Aproximado
          title: lang === 'en'
            ? `Goal "${goal.name}" completed! 🎉`
            : `Meta "${goal.name}" concluída! 🎉`,
          detail: lang === 'en'
            ? `Target of ${goal.type === 'drops' ? `${goal.targetAmount} drops` : formatCurrency(goal.targetAmount, currency)} reached`
            : `Alvo de ${goal.type === 'drops' ? `${goal.targetAmount} drops` : formatCurrency(goal.targetAmount, currency)} alcançado`,
          ...EVENT_CONFIG.goal_completed,
        })
      }
    }

    // Payback reached events
    for (const account of accounts) {
      const stats = calcAccountStats(account, drops, settings)
      if (stats.isPaidBack && stats.totalDrops > 0) {
        all.push({
          id: `payback-${account.id}`,
          type: 'payback_reached',
          date: new Date().toISOString(), // Aproximado
          title: lang === 'en'
            ? `"${account.name}" payback reached!`
            : `"${account.name}" payback alcançado!`,
          detail: lang === 'en'
            ? `Investment recovered · ${stats.paybackMultiplier.toFixed(1)}x multiplier`
            : `Investimento recuperado · ${stats.paybackMultiplier.toFixed(1).replace('.', ',')}x multiplicador`,
          ...EVENT_CONFIG.payback_reached,
        })
      }
    }

    // Sort by date descending
    return all
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .slice(0, limit)
  }, [accounts, drops, goals, settings, lang, currency, limit])

  if (events.length === 0) {
    return (
      <Card className="p-6 text-center border-white/[0.025]">
        <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">
          {lang === 'en' ? 'No events yet. Start adding accounts and drops!' : 'Nenhum evento ainda. Comece adicionando contas e drops!'}
        </p>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="p-5 border-white/[0.025]">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-lg bg-purple-400/10">
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t('timeline.title')}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('timeline.subtitle')}
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gradient-to-b from-white/[0.06] via-white/[0.03] to-transparent" />

          <div className="space-y-0">
            {events.map((event, index) => {
              const Icon = event.icon
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  className="flex items-start gap-3 py-2.5 group"
                >
                  {/* Icon */}
                  <div className={cn(
                    'relative z-10 flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border border-white/[0.04] transition-all',
                    event.color,
                    'group-hover:scale-110 group-hover:border-white/[0.08]'
                  )}>
                    <Icon className={cn('h-3.5 w-3.5', event.textColor)} />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] font-medium text-slate-200 leading-snug truncate">
                      {event.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {event.detail}
                    </p>
                  </div>

                  {/* Date */}
                  <span className="text-[10px] text-slate-600 font-mono shrink-0 pt-1">
                    {formatDate(event.date)}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
