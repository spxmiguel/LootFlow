import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  Package, Users, DollarSign,
  Plus, ArrowUpRight, Flame, Trophy, AlertTriangle,
  Target, CheckCircle2, Activity, TrendingUp,
} from 'lucide-react'
import { useStore } from '../store'
import { calcDashboardStats, calcWeekStats } from '../lib/calculations'
import { PRIME_COST_BRL } from '../lib/config'
import { formatCurrency, formatCurrencyCompact, formatDateRelative, formatPercent, getCurrentWeekId, getWeekLabel, cn } from '../lib/utils'
import { Card, Badge, Button, Empty } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { useT } from '../hooks/useT'

import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { computeUnlockedAchievements, TIER_COLORS } from '../lib/achievements'
import { computeInsights, computePredictions } from '../lib/insights'

// ─── Gamification Helper Components ───────────────────────────────────────────

function AchievementsCard({ accounts, drops, goals, settings }: any) {
  const allAchievements = computeUnlockedAchievements(accounts, drops, goals, settings)
  const completed = allAchievements.filter(a => a.progress >= 100)
  const inProgress = allAchievements.filter(a => a.progress > 0 && a.progress < 100)

  return (
    <Card className="p-5 border-white/[0.025]">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-4 h-4 text-gold" />
        <h3 className="font-display font-bold text-slate-100 text-sm">
          {settings.language === 'en' ? 'Achievements' : 'Conquistas'}
        </h3>
        <Badge color="gold">{completed.length} / {allAchievements.length}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {completed.slice(0, 4).map(ua => (
          <div key={ua.achievement.id} className="p-3 rounded-xl bg-white/[0.01] border border-white/[0.025] flex flex-col items-center text-center">
            <span className="text-2xl mb-1">{ua.achievement.icon}</span>
            <p className="text-xs font-semibold text-slate-200 truncate w-full">
              {settings.language === 'en' ? ua.achievement.name_en : ua.achievement.name_pt}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate w-full">
              {settings.language === 'en' ? ua.achievement.desc_en : ua.achievement.desc_pt}
            </p>
          </div>
        ))}
        {completed.length === 0 && (
          <div className="col-span-full py-4 text-center text-xs text-slate-500 font-body">
            {settings.language === 'en' ? 'Start registering drops to unlock achievements!' : 'Comece a registrar drops para desbloquear conquistas!'}
          </div>
        )}
      </div>
    </Card>
  )
}

function InsightsGrid({ accounts, drops, goals, settings }: any) {
  const insights = computeInsights(accounts, drops, goals, settings)
  const predictions = computePredictions(accounts, drops, goals, settings)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Insights */}
      {insights.length > 0 && (
        <Card className="p-5 border-white/[0.025]">
          <h3 className="font-display font-bold text-slate-100 text-sm mb-3">
            {settings.language === 'en' ? 'System Insights' : 'Insights do Sistema'}
          </h3>
          <div className="space-y-3">
            {insights.slice(0, 3).map(ins => (
              <div key={ins.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.025]">
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    {settings.language === 'en' ? ins.title_en : ins.title_pt}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {settings.language === 'en' ? ins.detail_en : ins.detail_pt}
                  </p>
                </div>
                <Badge color={ins.tone === 'profit' ? 'green' : ins.tone === 'loss' ? 'red' : ins.tone === 'gold' ? 'gold' : 'blue'}>
                  {ins.value}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Predictions */}
      {predictions.length > 0 && (
        <Card className="p-5 border-white/[0.025]">
          <h3 className="font-display font-bold text-slate-100 text-sm mb-3">
            {settings.language === 'en' ? 'ETA Predictions' : 'Previsões de ETA'}
          </h3>
          <div className="space-y-3">
            {predictions.slice(0, 3).map(pred => (
              <div key={pred.id} className="p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.025]">
                <p className="text-xs font-semibold text-slate-200">
                  {settings.language === 'en' ? pred.label_en : pred.label_pt}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {settings.language === 'en' ? pred.detail_en : pred.detail_pt}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency }: Record<string, unknown> & { currency: 'BRL' | 'USD' }) {
  if (!active || !payload || !(payload as unknown[]).length) return null
  const p = payload as Array<{ name: string; value: number; color: string }>
  return (
    <div className="bg-[#0d1117] border border-white/[0.05] rounded-xl px-3 py-2.5 shadow-modal">
      <p className="text-xs text-slate-500 font-body mb-1.5">{label as string}</p>
      {p.map((item) => (
        <p key={item.name} className="text-sm font-mono font-medium" style={{ color: item.color }}>
          {formatCurrency(item.value, currency)}
        </p>
      ))}
    </div>
  )
}

type InsightTone = 'profit' | 'primary' | 'gold' | 'purple' | 'loss'
type FeedItem = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  tone: InsightTone
  title: string
  detail: string
  when: string
  imageUrl?: string
  itemName?: string
  avatarUrl?: string
  accountColor?: string
  accountName?: string
}

const insightToneMap: Record<InsightTone, { icon: string; border: string; badge: 'green' | 'blue' | 'gold' | 'purple' | 'red' }> = {
  profit: { icon: 'bg-profit/10 text-profit', border: 'hover:border-profit/25', badge: 'green' },
  primary: { icon: 'bg-primary/10 text-primary', border: 'hover:border-primary/25', badge: 'blue' },
  gold: { icon: 'bg-gold/10 text-gold', border: 'hover:border-gold/25', badge: 'gold' },
  purple: { icon: 'bg-purple-400/10 text-purple-400', border: 'hover:border-purple-400/25', badge: 'purple' },
  loss: { icon: 'bg-loss/10 text-loss', border: 'hover:border-loss/25', badge: 'red' },
}

function InsightCard({
  icon: Icon,
  title,
  statement,
  context,
  badge,
  tone = 'primary',
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  statement: string
  context: string
  badge: string
  tone?: InsightTone
  delay?: number
}) {
  const toneStyle = insightToneMap[tone]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={cn('h-full p-4 transition-colors', toneStyle.border)}>
        <div className="flex items-start justify-between gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneStyle.icon)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <Badge color={toneStyle.badge}>{badge}</Badge>
        </div>
        <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-600 font-body">{title}</p>
        <p className="mt-1 text-sm font-semibold leading-snug text-slate-100">{statement}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{context}</p>
      </Card>
    </motion.div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { accounts, drops, goals, settings, setCurrentPage } = useStore()
  const t = useT()
  const currency = settings.currency

  const stats = useMemo(
    () => calcDashboardStats(accounts, drops, goals, settings),
    [accounts, drops, goals, settings],
  )

  const currentWeekId = getCurrentWeekId()
  const currentWeekLabel = getWeekLabel(currentWeekId)
  const currentWeekStats = useMemo(
    () => calcWeekStats(currentWeekId, drops, accounts, settings),
    [drops, accounts, settings, currentWeekId],
  )

  const previousWeekStats = useMemo(() => {
    const previous = stats.weeklyStats.find(w => w.weekId !== currentWeekId)
    return previous ?? calcWeekStats('', [], accounts, settings)
  }, [stats.weeklyStats, currentWeekId, accounts, settings])

  // Chart data (last 8 weeks)
  const chartData = stats.weeklyStats.slice(0, 8).reverse().map(w => ({
    week: w.label.split('–')[0].trim(),
    cashout: w.totalCashout,
    steam: w.totalSteamValue,
    drops: w.totalDrops,
  }))

  const weekProgress = stats.currentWeekTarget > 0
    ? Math.round((stats.currentWeekDrops / stats.currentWeekTarget) * 100)
    : 0

  const isEmpty = drops.length === 0
  const hasAccounts = accounts.length > 0

  // Contas ativas com drops faltando esta semana
  const activeAccounts = accounts.filter(a => a.active)
  const accountsMissingDrops = activeAccounts.filter(a => {
    const count = drops.filter(d => d.accountId === a.id && d.weekId === currentWeekId).length
    return count < 2
  })

  // Goals data for dashboard preview
  const dashStats = stats
  const activeGoals = useMemo(() => {
    return goals.map(g => {
      const current = (() => {
        switch (g.type) {
          case 'revenue': return dashStats.totalSteamValueAllTime
          case 'profit':  return dashStats.totalCashoutAllTime
          case 'cashout': return currentWeekStats.totalCashout
          case 'drops':   return dashStats.totalDropsAllTime
          default:        return 0
        }
      })()
      const progress = g.targetAmount > 0 ? Math.min(100, (current / g.targetAmount) * 100) : 0
      return { goal: g, current, progress }
    }).filter(g => g.progress < 100).slice(0, 3)
  }, [goals, dashStats, currentWeekStats])

  const bestAccountStats = useMemo(() => {
    if (stats.accountStats.length === 0) return null
    return [...stats.accountStats].sort((a, b) => b.totalCashout - a.totalCashout)[0]
  }, [stats.accountStats])

  const closestGoal = useMemo(() => {
    if (activeGoals.length === 0) return null
    return [...activeGoals].sort((a, b) => b.progress - a.progress)[0]
  }, [activeGoals])

  const primeAccountsPaid = stats.totalCashoutAllTime / PRIME_COST_BRL
  const totalAccountsLabel = stats.totalAccounts === 1 ? 'conta Prime' : 'contas Prime'

  const monetaryGoalInsight = useMemo(() => {
    const monetary = activeGoals
      .filter(g => g.goal.type !== 'drops')
      .map(g => ({ ...g, remaining: Math.max(0, g.goal.targetAmount - g.current) }))
      .sort((a, b) => a.remaining - b.remaining)[0]

    if (monetary) {
      return {
        statement: t('dash.insight.remaining', {
          remaining: formatCurrency(monetary.remaining, currency),
          goal: monetary.goal.name
        }),
        context: t('dash.insight.remaining_desc', {
          progress: settings.language === 'en' ? monetary.progress.toFixed(1) : monetary.progress.toFixed(1).replace('.', ',')
        }),
        badge: settings.language === 'en' ? 'Goal' : 'Meta',
        tone: 'primary' as InsightTone,
      }
    }

    const weeklyRemaining = Math.max(0, settings.weeklyGoalAmount - currentWeekStats.totalCashout)
    return {
      statement: weeklyRemaining > 0
        ? t('dash.insight.weekly_remaining', { remaining: formatCurrency(weeklyRemaining, currency) })
        : t('dash.insight.weekly_hit', { cashout: formatCurrency(currentWeekStats.totalCashout, currency) }),
      context: t('dash.insight.weekly_desc', { target: formatCurrency(settings.weeklyGoalAmount, currency) }),
      badge: weeklyRemaining > 0 ? t('dash.insight.weekly_badge_active') : t('dash.insight.weekly_badge_hit'),
      tone: weeklyRemaining > 0 ? 'primary' as InsightTone : 'profit' as InsightTone,
    }
  }, [activeGoals, currency, currentWeekStats.totalCashout, settings.weeklyGoalAmount, settings.language, t])

  const weekDelta = currentWeekStats.totalCashout - previousWeekStats.totalCashout
  const weekComparison = previousWeekStats.totalDrops === 0 && previousWeekStats.totalCashout === 0
    ? {
        statement: t('dash.insight.delta_positive', {
          drops: stats.currentWeekDrops,
          s: stats.currentWeekDrops !== 1 ? 's' : ''
        }),
        context: t('dash.insight.delta_positive_desc'),
        badge: t('dash.insight.badge_week'),
        tone: 'gold' as InsightTone,
      }
    : {
        statement: weekDelta >= 0 ? t('dash.insight.delta_comparison_positive') : t('dash.insight.delta_comparison_negative'),
        context: t('dash.insight.delta_comparison_desc', {
          delta: `${weekDelta >= 0 ? '+' : ''}${formatCurrency(weekDelta, currency)}`
        }),
        badge: weekDelta >= 0 ? t('dash.insight.badge_up') : t('dash.insight.badge_attention'),
        tone: weekDelta >= 0 ? 'profit' as InsightTone : 'loss' as InsightTone,
      }

  const feedItems = useMemo(() => {
    const dropEvents: FeedItem[] = stats.recentDrops.slice(0, 5).map(drop => {
      const account = accounts.find(a => a.id === drop.accountId)
      const cashout = drop.cashoutValue ?? (drop.steamValue * settings.cashoutRate / 100)
      return {
        id: `drop-${drop.id}`,
        icon: Package,
        tone: 'primary' as InsightTone,
        title: t('dash.feed.registered_drop', {
          account: account?.name ?? 'Conta',
          item: drop.item?.name?.split('|')[0].trim() || t('dash.feed.drop_hash')
        }),
        detail: t('dash.feed.drop_detail', {
          cashout: formatCurrency(cashout, currency),
          number: drop.dropNumber
        }),
        when: formatDateRelative(drop.createdAt ?? drop.registeredAt ?? new Date().toISOString()),
        imageUrl: drop.item?.imageUrl,
        itemName: drop.item?.name,
        avatarUrl: account?.avatarUrl,
        accountColor: account?.color,
        accountName: account?.name,
      }
    })

    const paybackEvents: FeedItem[] = stats.accountStats
      .filter(as => as.isPaidBack && as.totalDrops > 0)
      .sort((a, b) => b.paybackMultiplier - a.paybackMultiplier)
      .slice(0, 2)
      .map(as => ({
        id: `payback-${as.account.id}`,
        icon: CheckCircle2,
        tone: 'profit' as InsightTone,
        title: t('dash.feed.payback_hit', { account: as.account.name }),
        detail: t('dash.feed.payback_multiplier', {
          multiplier: settings.language === 'en' ? as.paybackMultiplier.toFixed(1) : as.paybackMultiplier.toFixed(1).replace('.', ',')
        }),
        when: t('dash.feed.time_now'),
        avatarUrl: as.account.avatarUrl,
        accountColor: as.account.color,
        accountName: as.account.name,
      }))

    return [...dropEvents, ...paybackEvents].slice(0, 7)
  }, [activeGoals, accounts, currency, settings.cashoutRate, settings.language, stats.accountStats, stats.recentDrops, t])

  const netBalance = stats.totalCashoutAllTime - stats.totalInvestedAllTime
  const paybackProgress = stats.totalInvestedAllTime > 0
    ? Math.round((stats.totalCashoutAllTime / stats.totalInvestedAllTime) * 100)
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header - single button only */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">{t('nav.dashboard')}</h1>
          <p className="text-sm text-slate-500 font-body mt-0.5">
            {t('dash.subtitle')}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCurrentPage('drops')}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('dash.register')}</span>
          <span className="sm:hidden">{t('dash.register_short')}</span>
        </Button>
      </div>

      {/* Warnings / Alerts (e.g. pending weekly drops) */}
      {accountsMissingDrops.length > 0 && activeAccounts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-loss/10 border border-loss/20 shadow-[0_0_12px_rgba(248,113,113,0.05)] cursor-pointer"
          onClick={() => setCurrentPage('drops')}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-loss shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-200">{t('dash.alert.title', { week: currentWeekLabel })}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-body">
                {accountsMissingDrops.length === 1
                  ? t('dash.alert.desc.singular', { account: accountsMissingDrops[0].name })
                  : t('dash.alert.desc.plural', {
                      count: accountsMissingDrops.length,
                      accounts: accountsMissingDrops.slice(0, 3).map(a => a.name).join(', '),
                      more: accountsMissingDrops.length > 3 ? t('dash.alert.desc.more', { n: accountsMissingDrops.length - 3 }) : ''
                    })}
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" className="self-start sm:self-center">
            {t('dash.register')}
          </Button>
        </motion.div>
      )}

      {/* Redesigned Context Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Saldo Líquido Card (Spans 2 columns) */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-5 shadow-[0_0_15px_rgba(74,222,128,0.03)] bg-gradient-to-br from-[#11161d] to-[#141b27] border-white/[0.025] relative overflow-hidden h-full flex flex-col justify-between">
            <div className={cn(
              "absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl pointer-events-none",
              netBalance >= 0 ? "bg-profit/5" : "bg-loss/5"
            )} />
            
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", netBalance >= 0 ? "bg-profit" : "bg-loss")} />
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-body">{t('dash.net_balance')}</p>
                </div>
                <Badge color={netBalance >= 0 ? 'green' : 'red'}>
                  {netBalance >= 0 ? t('dash.net_balance.profit') : t('dash.net_balance.payback')}
                </Badge>
              </div>

              <h3 className={cn(
                "text-xl sm:text-2xl font-mono font-bold leading-none mb-1.5",
                netBalance >= 0 ? "text-profit" : "text-loss"
              )}>
                {netBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(netBalance), currency)}
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed mb-4">
                {t('dash.net_balance.desc', {
                  recovered: formatCurrency(stats.totalCashoutAllTime, currency),
                  invested: formatCurrency(stats.totalInvestedAllTime, currency)
                })}
              </p>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-xs font-body">
                <span className="text-slate-400 font-medium">{t('dash.roi_payback')}</span>
                <span className={cn('font-mono font-bold', paybackProgress >= 100 ? 'text-profit' : 'text-primary')}>
                  {paybackProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-[1px] border border-white/[0.02]">
                <motion.div
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r",
                    netBalance >= 0 
                      ? "from-profit to-[#86efac] shadow-[0_0_8px_rgba(74,222,128,0.5)]" 
                      : "from-primary to-primary/60 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, paybackProgress)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Semana Atual Card (1 column) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-5 hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-[#11161d] to-[#121b27] border-white/[0.025] relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-body">{t('dash.current_week')}</p>
                </div>
                <Badge color="green">{t('dash.current_week.active')}</Badge>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-100 leading-snug mb-1">
                {formatCurrency(currentWeekStats.totalCashout, currency)} <span className="text-[10px] text-slate-500 font-normal">{t('dash.current_week.recovered')}</span>
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed mb-4">
                {t('dash.current_week.gross_est')} {formatCurrency(currentWeekStats.totalSteamValue, currency)}
              </p>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-[10px] text-slate-500 font-body">
                <span>{t('dash.current_week.progress_label')}</span>
                <span>{stats.currentWeekDrops} / {stats.currentWeekTarget}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#86efac] transition-all duration-700 shadow-[0_0_6px_rgba(74,222,128,0.3)]"
                  style={{ width: `${Math.min(100, weekProgress)}%` }}
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Closest Goal Card (1 column) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-5 hover:border-gold/20 transition-all duration-300 bg-gradient-to-br from-[#11161d] to-[#161c22] border-white/[0.025] relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-gold animate-bounce" />
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-body">{t('dash.closest_goal')}</p>
                </div>
                {closestGoal ? (
                  <Badge color="gold">{closestGoal.progress.toFixed(0)}%</Badge>
                ) : (
                  <Badge color="default">{t('dash.closest_goal.none')}</Badge>
                )}
              </div>

              {closestGoal ? (
                <>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate leading-snug mb-1">
                    {closestGoal.goal.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-body leading-relaxed mb-4">
                    {t('goals.card_target')}: {closestGoal.goal.type === 'drops' ? `${closestGoal.goal.targetAmount} drops` : formatCurrency(closestGoal.goal.targetAmount, currency)}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-slate-400 leading-snug mb-4 font-body">
                    {t('dash.closest_goal.no_goals')}
                  </h3>
                </>
              )}
            </div>

            <div className="space-y-2 mt-auto">
              {closestGoal && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-500 font-body">
                    <span>{t('dash.closest_goal.progress')}</span>
                    <span>{closestGoal.goal.type === 'drops' ? `${closestGoal.current} drops` : formatCurrency(closestGoal.current, currency)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 shadow-[0_0_6px_rgba(251,191,36,0.3)]"
                      style={{ width: `${closestGoal.progress}%`, backgroundColor: closestGoal.goal.color || '#fbbf24' }}
                    />
                  </div>
                </>
              )}
              {!closestGoal && (
                <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => setCurrentPage('goals')}>
                  {t('dash.closest_goal.create_btn')}
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Main content */}
      {isEmpty ? (
        <Empty
          icon={<Package className="w-8 h-8" />}
          title={t('dash.no_drops')}
          description={hasAccounts
            ? t('dash.empty.desc_has_accounts')
            : t('dash.empty.desc_no_accounts')}
          action={{
            label: hasAccounts ? t('dash.register') : t('dash.empty.action_add_account'),
            onClick: () => setCurrentPage(hasAccounts ? 'drops' : 'accounts'),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Left panel: Charts, Stats, Goals (spans 3 columns on desktop) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.025] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">{t('analytics.total_cashout')}</span>
                <span className="text-base font-mono font-bold text-profit mt-1">
                  {formatCurrency(stats.totalCashoutAllTime, currency)}
                </span>
              </Card>
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.025] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">{t('dash.rankings.col_roi')} {settings.language === 'en' ? 'Overall' : 'Geral'}</span>
                <span className="text-base font-mono font-bold text-primary mt-1">
                  {stats.overallROI === Infinity ? '∞' : `${formatPercent(stats.overallROI, 0)}`}
                </span>
              </Card>
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.025] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">{t('analytics.gross_value')}</span>
                <span className="text-base font-mono font-bold text-slate-200 mt-1">
                  {formatCurrencyCompact(stats.totalSteamValueAllTime, currency)}
                </span>
              </Card>
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.025] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">{t('dash.invested')}</span>
                <span className="text-base font-mono font-bold text-slate-400 mt-1">
                  {formatCurrency(stats.totalInvestedAllTime, currency)}
                </span>
              </Card>
            </div>
            
            {/* Chart + Current Week stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cashout Chart */}
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-5 border-white/[0.025]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-body uppercase tracking-wider">{t('dash.chart.weekly_cashout')}</p>
                      <p className="font-display font-bold text-slate-100 mt-0.5">{t('dash.chart.last_8_weeks')}</p>
                    </div>
                    <Badge color="blue">{t('dash.chart.history')}</Badge>
                  </div>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="cashoutGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                        <XAxis
                          dataKey="week"
                          tick={{ fill: '#475569', fontSize: 11, fontFamily: 'Figtree' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: '#475569', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => currency === 'USD' ? `$${v}` : `R$${v}`}
                          width={50}
                        />
                        <Tooltip content={(p) => <ChartTooltip {...p} currency={settings.currency} />} />
                        <Area
                          type="monotone"
                          dataKey="cashout"
                          name="Cashout"
                          stroke="#4ade80"
                          strokeWidth={2}
                          fill="url(#cashoutGrad)"
                          dot={{ fill: '#4ade80', r: 3, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>

              {/* Semana Atual */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Card className="p-5 h-full flex flex-col justify-between border-white/[0.025]">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-gold" />
                    <p className="font-display font-bold text-slate-100 text-sm">{t('dash.current_week')}</p>
                  </div>

                  <div className="space-y-4 flex-1">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs font-body mb-2">
                        <span className="text-slate-500">{t('dash.rankings.col_drops')}</span>
                        <span className={cn('font-medium', weekProgress >= 100 ? 'text-profit' : 'text-slate-300')}>
                          {stats.currentWeekDrops} / {stats.currentWeekTarget}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-full', weekProgress >= 100 ? 'bg-profit' : 'bg-primary')}
                          initial={{ width: 0 }}
                          animate={{ width: `${weekProgress}%` }}
                          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.025]">
                        <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">{t('dash.rankings.col_gross')}</p>
                        <p className="font-mono text-sm font-medium text-slate-200 mt-0.5">
                          {formatCurrencyCompact(currentWeekStats.totalSteamValue, currency)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.025]">
                        <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">{t('dash.rankings.col_cashout')}</p>
                        <p className="font-mono text-sm font-medium text-profit mt-0.5">
                          {formatCurrencyCompact(currentWeekStats.totalCashout, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Best week */}
                    {stats.bestWeek && (
                      <div className="p-3 rounded-xl bg-gold/[0.05] border border-gold/10">
                        <div className="flex items-center gap-1.5 mb-1">
                           <Trophy className="w-3.5 h-3.5 text-gold" />
                          <p className="text-xs text-gold font-body font-medium">{t('dash.best_week')}</p>
                        </div>
                        <p className="font-mono text-sm font-medium text-slate-200">
                          {formatCurrency(stats.bestWeek.totalCashout, currency)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-body">{stats.bestWeek.label}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setCurrentPage('drops')}
                  >
                    {settings.language === 'en' ? 'View all drops' : 'Ver todos os drops'} <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Card>
              </motion.div>
            </div>

            {/* Account Rankings */}
            {stats.accountStats.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-5 border-white/[0.025]">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display font-bold text-slate-100">{t('dash.rankings.title')}</p>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentPage('accounts')}>
                      {t('dash.rankings.view_all')} <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-body">
                          <th className="text-left pb-3">{t('dash.rankings.col_account')}</th>
                          <th className="text-right pb-3">{t('dash.rankings.col_drops')}</th>
                          <th className="text-right pb-3">{t('dash.rankings.col_gross')}</th>
                          <th className="text-right pb-3">{t('dash.rankings.col_cashout')}</th>
                          <th className="text-right pb-3">{t('dash.rankings.col_roi')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {stats.accountStats.slice(0, 5).map(as => (
                          <tr key={as.account.id} className="group">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: as.account.color ?? '#38bdf8' }}
                                />
                                <span className="font-body text-sm text-slate-300 truncate max-w-[140px]">
                                  {as.account.name}
                                </span>
                                {!as.account.active && (
                                  <Badge color="default">{t('dash.rankings.status_inactive')}</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-sm text-slate-400">
                              {as.totalDrops}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-sm text-slate-400">
                              {formatCurrencyCompact(as.totalSteamValue, currency)}
                            </td>
                            <td className="py-3 pr-4 text-right font-mono text-sm text-profit">
                              {formatCurrencyCompact(as.totalCashout, currency)}
                            </td>
                            <td className="py-3 text-right">
                              <Badge color={as.roiPercent > 0 ? 'green' : as.roiPercent < -10 ? 'red' : 'default'}>
                                {as.roiPercent === Infinity ? '∞' : formatPercent(as.roiPercent, 0)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}


            {/* Heatmap & Timeline if enabled */}
            {settings.gamification?.showHeatmap && (
              <ActivityHeatmap drops={drops} />
            )}



            {/* Achievements if enabled */}
            {settings.gamification?.showAchievements && (
              <AchievementsCard accounts={accounts} drops={drops} goals={goals} settings={settings} />
            )}

            {/* Insights and Predictions if enabled */}
            {settings.gamification?.showInsights && (
              <InsightsGrid accounts={accounts} drops={drops} goals={goals} settings={settings} />
            )}
          </div>

          {/* Right panel: Activity Feed (spans 1 column on desktop) */}
          {feedItems.length > 0 && (
            <motion.div
              className="lg:col-span-1 h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="p-5 h-full flex flex-col justify-between bg-gradient-to-b from-[#11161d] to-[#0c0f14] border-white/[0.025]">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.02] pb-3">
                    <div>
                      <p className="font-display font-bold text-slate-100">{t('dash.feed.title')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('dash.feed.subtitle')}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {feedItems.map(item => {
                      const Icon = item.icon
                      const tone = insightToneMap[item.tone]
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] border border-transparent transition-all">
                          {/* Circular Avatar Container */}
                          <div className="relative shrink-0">
                            {item.avatarUrl ? (
                              <img
                                src={item.avatarUrl}
                                alt={item.accountName || 'Avatar'}
                                className="w-9 h-9 rounded-full object-cover border border-white/[0.04]"
                              />
                            ) : item.accountName ? (
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-200 border border-white/[0.04] uppercase"
                                style={{ backgroundColor: item.accountColor ?? '#3b82f6' }}
                              >
                                {item.accountName.slice(0, 2)}
                              </div>
                            ) : (
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border border-white/[0.04]', tone.icon)}>
                                <Icon className="h-4 w-4" />
                              </div>
                            )}

                            {/* Drop overlay badge */}
                            {item.imageUrl && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#0d1117] border border-white/[0.04] overflow-hidden flex items-center justify-center shadow-md">
                                <SteamItemImage imageUrl={item.imageUrl} alt={item.itemName} size={18} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate leading-tight font-body">{item.title}</p>
                            <p className="text-[10px] text-slate-500 font-body truncate leading-normal mt-0.5">{item.detail}</p>
                          </div>
                          
                          <div className="shrink-0 text-right">
                            <span className="text-[9px] font-semibold text-slate-500 bg-white/[0.03] border border-white/[0.03] px-1.5 py-0.5 rounded-md font-body">
                              {item.when}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage('drops')} className="mt-4 w-full justify-center">
                  {t('dash.feed.view_all')} <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

export default Dashboard
