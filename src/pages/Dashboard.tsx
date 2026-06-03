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
        statement: `Faltam ${formatCurrency(monetary.remaining, currency)} pra bater ${monetary.goal.name}`,
        context: `${monetary.progress.toFixed(1).replace('.', ',')}% concluído até agora.`,
        badge: 'Meta',
        tone: 'primary' as InsightTone,
      }
    }

    const weeklyRemaining = Math.max(0, settings.weeklyGoalAmount - currentWeekStats.totalCashout)
    return {
      statement: weeklyRemaining > 0
        ? `Faltam ${formatCurrency(weeklyRemaining, currency)} pra meta semanal`
        : `Meta semanal batida com ${formatCurrency(currentWeekStats.totalCashout, currency)}`,
      context: `Meta configurada: ${formatCurrency(settings.weeklyGoalAmount, currency)} em cashout.`,
      badge: weeklyRemaining > 0 ? 'Em curso' : 'Batida',
      tone: weeklyRemaining > 0 ? 'primary' as InsightTone : 'profit' as InsightTone,
    }
  }, [activeGoals, currency, currentWeekStats.totalCashout, settings.weeklyGoalAmount])

  const weekDelta = currentWeekStats.totalCashout - previousWeekStats.totalCashout
  const weekComparison = previousWeekStats.totalDrops === 0 && previousWeekStats.totalCashout === 0
    ? {
        statement: `Essa semana já tem ${stats.currentWeekDrops} drop${stats.currentWeekDrops !== 1 ? 's' : ''} registrado${stats.currentWeekDrops !== 1 ? 's' : ''}`,
        context: 'Registre mais uma semana para comparar tendência de verdade.',
        badge: 'Semana',
        tone: 'gold' as InsightTone,
      }
    : {
        statement: weekDelta >= 0 ? 'Essa semana foi melhor que a anterior' : 'Essa semana está abaixo da anterior',
        context: `${weekDelta >= 0 ? '+' : ''}${formatCurrency(weekDelta, currency)} vs. semana passada.`,
        badge: weekDelta >= 0 ? 'Subiu' : 'Atenção',
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
        title: `${account?.name ?? 'Conta'} registrou ${drop.item?.name?.split('|')[0].trim() || 'um drop'}`,
        detail: `${formatCurrency(cashout, currency)} cashout · Drop #${drop.dropNumber}`,
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
        title: `${as.account.name} bateu payback`,
        detail: `${as.paybackMultiplier.toFixed(1).replace('.', ',')}x o custo Prime recuperado`,
        when: 'Agora',
        avatarUrl: as.account.avatarUrl,
        accountColor: as.account.color,
        accountName: as.account.name,
      }))

    return [...dropEvents, ...paybackEvents].slice(0, 7)
  }, [activeGoals, accounts, currency, settings.cashoutRate, stats.accountStats, stats.recentDrops])

  const netBalance = stats.totalCashoutAllTime - stats.totalInvestedAllTime
  const paybackProgress = stats.totalInvestedAllTime > 0
    ? Math.round((stats.totalCashoutAllTime / stats.totalInvestedAllTime) * 100)
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header - single button only */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 font-body mt-0.5">
            Visão geral dos seus drops CS2
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCurrentPage('drops')}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Registrar Drops</span>
          <span className="sm:hidden">Registrar</span>
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
              <p className="text-sm font-semibold text-slate-200">Drops semanais pendentes ({currentWeekLabel})</p>
              <p className="text-xs text-slate-400 mt-0.5 font-body">
                {accountsMissingDrops.length} conta{accountsMissingDrops.length !== 1 ? 's' : ''} precisa{accountsMissingDrops.length !== 1 ? 'm' : 'se'} de atenção: {accountsMissingDrops.slice(0, 3).map(a => a.name).join(', ')}{accountsMissingDrops.length > 3 ? ` e mais ${accountsMissingDrops.length - 3}` : ''}.
              </p>
            </div>
          </div>
          <Button variant="danger" size="sm" className="self-start sm:self-center">
            Registrar Drops
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
          <Card className="p-5 shadow-[0_0_15px_rgba(74,222,128,0.03)] bg-gradient-to-br from-[#11161d] to-[#141b27] relative overflow-hidden h-full flex flex-col justify-between">
            <div className={cn(
              "absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl pointer-events-none",
              netBalance >= 0 ? "bg-profit/5" : "bg-loss/5"
            )} />
            
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", netBalance >= 0 ? "bg-profit" : "bg-loss")} />
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-body">Saldo Líquido</p>
                </div>
                <Badge color={netBalance >= 0 ? 'green' : 'red'}>
                  {netBalance >= 0 ? 'Lucro' : 'Payback em Andamento'}
                </Badge>
              </div>

              <h3 className={cn(
                "text-xl sm:text-2xl font-mono font-bold leading-none mb-1.5",
                netBalance >= 0 ? "text-profit" : "text-loss"
              )}>
                {netBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(netBalance), currency)}
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed mb-4">
                Total recuperado: <span className="text-profit font-semibold">{formatCurrency(stats.totalCashoutAllTime, currency)}</span> de <span className="text-slate-300 font-medium">{formatCurrency(stats.totalInvestedAllTime, currency)}</span> investidos.
              </p>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-xs font-body">
                <span className="text-slate-400 font-medium">Retorno do Investimento (Payback)</span>
                <span className={cn('font-mono font-bold', paybackProgress >= 100 ? 'text-profit' : 'text-primary')}>
                  {paybackProgress}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden p-[1px] border border-white/[0.04]">
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
          <Card className="p-5 hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-[#11161d] to-[#121b27] relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-body">Semana Atual</p>
                </div>
                <Badge color="green">Ciclo Ativo</Badge>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-slate-100 leading-snug mb-1">
                {formatCurrency(currentWeekStats.totalCashout, currency)} <span className="text-[10px] text-slate-500 font-normal">recuperado</span>
              </h3>
              <p className="text-xs text-slate-400 font-body leading-relaxed mb-4">
                Bruto est.: {formatCurrency(currentWeekStats.totalSteamValue, currency)}
              </p>
            </div>

            <div className="space-y-2 mt-auto">
              <div className="flex justify-between text-[10px] text-slate-500 font-body">
                <span>Progresso Drops</span>
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
          <Card className="p-5 hover:border-gold/30 transition-all duration-300 bg-gradient-to-br from-[#11161d] to-[#161c22] relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-gold animate-bounce" />
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-body">Meta Próxima</p>
                </div>
                {closestGoal ? (
                  <Badge color="gold">{closestGoal.progress.toFixed(0)}%</Badge>
                ) : (
                  <Badge color="default">Nenhuma</Badge>
                )}
              </div>

              {closestGoal ? (
                <>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 truncate leading-snug mb-1">
                    {closestGoal.goal.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-body leading-relaxed mb-4">
                    Alvo: {closestGoal.goal.type === 'drops' ? `${closestGoal.goal.targetAmount} drops` : formatCurrency(closestGoal.goal.targetAmount, currency)}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-slate-400 leading-snug mb-4 font-body">
                    Nenhuma meta em andamento
                  </h3>
                </>
              )}
            </div>

            <div className="space-y-2 mt-auto">
              {closestGoal && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-500 font-body">
                    <span>Progresso</span>
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
                  Criar meta
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
          title="Nenhum drop registrado"
          description={hasAccounts
            ? 'Suas contas já estão cadastradas. Agora registre o primeiro drop para começar a acompanhar cashout e ROI.'
            : 'Adicione suas contas Prime para começar a acompanhar drops, cashout e ROI.'}
          action={{
            label: hasAccounts ? 'Registrar Drops' : 'Adicionar Conta',
            onClick: () => setCurrentPage(hasAccounts ? 'drops' : 'accounts'),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Left panel: Charts, Stats, Goals (spans 3 columns on desktop) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">Cashout Recuperado</span>
                <span className="text-base font-mono font-bold text-profit mt-1">
                  {formatCurrency(stats.totalCashoutAllTime, currency)}
                </span>
              </Card>
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">ROI Geral</span>
                <span className="text-base font-mono font-bold text-primary mt-1">
                  {stats.overallROI === Infinity ? '∞' : `${formatPercent(stats.overallROI, 0)}`}
                </span>
              </Card>
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">Bruto Acumulado</span>
                <span className="text-base font-mono font-bold text-slate-200 mt-1">
                  {formatCurrencyCompact(stats.totalSteamValueAllTime, currency)}
                </span>
              </Card>
              <Card className="p-3.5 flex flex-col justify-between bg-white/[0.01] border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-body">Investimento Total</span>
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
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-slate-500 font-body uppercase tracking-wider">Cashout semanal</p>
                      <p className="font-display font-bold text-slate-100 mt-0.5">Últimas 8 semanas</p>
                    </div>
                    <Badge color="blue">Histórico</Badge>
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
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
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
                <Card className="p-5 h-full flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-gold" />
                    <p className="font-display font-bold text-slate-100 text-sm">Semana Atual</p>
                  </div>

                  <div className="space-y-4 flex-1">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs font-body mb-2">
                        <span className="text-slate-500">Drops</span>
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
                      <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.04]">
                        <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">Bruto</p>
                        <p className="font-mono text-sm font-medium text-slate-200 mt-0.5">
                          {formatCurrencyCompact(currentWeekStats.totalSteamValue, currency)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.04]">
                        <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">Cashout</p>
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
                    Ver todos os drops <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
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
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-display font-bold text-slate-100">Performance por Conta</p>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentPage('accounts')}>
                      Ver todas <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] text-slate-600 uppercase tracking-wider font-body">
                          <th className="text-left pb-3">Conta</th>
                          <th className="text-right pb-3">Drops</th>
                          <th className="text-right pb-3">Bruto</th>
                          <th className="text-right pb-3">Cashout</th>
                          <th className="text-right pb-3">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
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
                                  <Badge color="default">inativa</Badge>
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


          </div>

          {/* Right panel: Activity Feed (spans 1 column on desktop) */}
          {feedItems.length > 0 && (
            <motion.div
              className="lg:col-span-1 h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="p-5 h-full flex flex-col justify-between bg-gradient-to-b from-[#11161d] to-[#0c0f14] border-white/[0.05]">
                <div>
                  <div className="flex items-center justify-between mb-4 border-b border-white/[0.04] pb-3">
                    <div>
                      <p className="font-display font-bold text-slate-100">Feed recente</p>
                      <p className="text-xs text-slate-500 mt-0.5">Drops, payback e metas</p>
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
                                className="w-9 h-9 rounded-full object-cover border border-white/[0.08]"
                              />
                            ) : item.accountName ? (
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-200 border border-white/[0.08] uppercase"
                                style={{ backgroundColor: item.accountColor ?? '#3b82f6' }}
                              >
                                {item.accountName.slice(0, 2)}
                              </div>
                            ) : (
                              <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border border-white/[0.08]', tone.icon)}>
                                <Icon className="h-4 w-4" />
                              </div>
                            )}

                            {/* Drop overlay badge */}
                            {item.imageUrl && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-[#0d1117] border border-white/[0.08] overflow-hidden flex items-center justify-center shadow-md">
                                <SteamItemImage imageUrl={item.imageUrl} alt={item.itemName} size={18} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate leading-tight font-body">{item.title}</p>
                            <p className="text-[10px] text-slate-500 font-body truncate leading-normal mt-0.5">{item.detail}</p>
                          </div>
                          
                          <div className="shrink-0 text-right">
                            <span className="text-[9px] font-semibold text-slate-500 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded-md font-body">
                              {item.when}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentPage('drops')} className="mt-4 w-full justify-center">
                  Ver todos <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
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
