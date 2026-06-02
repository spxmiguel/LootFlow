import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  Package, Users, DollarSign,
  Plus, ArrowUpRight, Flame, Trophy, AlertTriangle,
  Target, CheckCircle2, Activity,
} from 'lucide-react'
import { useStore } from '../store'
import { calcDashboardStats, calcWeekStats } from '../lib/calculations'
import { PRIME_COST_BRL } from '../lib/config'
import { formatCurrency, formatCurrencyCompact, formatDateRelative, formatPercent, getCurrentWeekId, cn } from '../lib/utils'
import { Card, Badge, Button, Empty } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { useT } from '../hooks/useT'

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, currency }: Record<string, unknown> & { currency: 'BRL' | 'USD' }) {
  if (!active || !payload || !(payload as unknown[]).length) return null
  const p = payload as Array<{ name: string; value: number; color: string }>
  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl px-3 py-2.5 shadow-modal">
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
      }))

    const goalEvents: FeedItem[] = activeGoals.slice(0, 2).map(({ goal, progress }) => ({
      id: `goal-${goal.id}`,
      icon: Target,
      tone: 'gold' as InsightTone,
      title: `${goal.name} avançou para ${progress.toFixed(1).replace('.', ',')}%`,
      detail: goal.type === 'drops' ? 'Meta de volume em andamento' : 'Meta financeira em andamento',
      when: 'Meta',
    }))

    return [...dropEvents, ...paybackEvents, ...goalEvents].slice(0, 7)
  }, [activeGoals, accounts, currency, settings.cashoutRate, stats.accountStats, stats.recentDrops])

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

      {/* Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <InsightCard
          icon={DollarSign}
          title="Cashout recuperado"
          statement={`${formatCurrency(stats.totalCashoutAllTime, currency)} recuperados`}
          context={`Já pagou ${primeAccountsPaid.toFixed(1).replace('.', ',')} ${totalAccountsLabel}. Bruto acumulado: ${formatCurrencyCompact(stats.totalSteamValueAllTime, currency)}.`}
          badge="Payback"
          tone="profit"
          delay={0}
        />
        <InsightCard
          icon={Target}
          title="Próxima meta"
          statement={monetaryGoalInsight.statement}
          context={monetaryGoalInsight.context}
          badge={monetaryGoalInsight.badge}
          tone={monetaryGoalInsight.tone}
          delay={0.05}
        />
        {accountsMissingDrops.length > 0 && activeAccounts.length > 0 ? (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setCurrentPage('drops')}
            className="flex flex-col justify-between gap-3 p-4 rounded-2xl bg-loss/10 border-2 border-loss/60 shadow-[0_0_24px_rgba(248,113,113,0.15)] hover:bg-loss/15 hover:border-loss/80 transition-all text-left cursor-pointer"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-loss/20 shrink-0 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-loss" strokeWidth={2.5} />
              </div>
              <p className="font-display font-black text-loss text-xs sm:text-sm leading-snug uppercase tracking-wider">
                Falta pegar drop semanal
              </p>
            </div>
            <div className="space-y-1">
              {accountsMissingDrops.length === activeAccounts.length ? (
                <p className="text-xs text-loss/70 font-body">
                  Todas as {activeAccounts.length} contas sem drop esta semana
                </p>
              ) : (
                accountsMissingDrops.slice(0, 3).map(a => {
                  const got = drops.filter(d => d.accountId === a.id && d.weekId === currentWeekId).length
                  return (
                    <p key={a.id} className="text-xs text-loss/70 font-body truncate">
                      · {a.name} — {got}/2 drops
                    </p>
                  )
                })
              )}
              {accountsMissingDrops.length > 3 && (
                <p className="text-[11px] text-loss/50 font-body">
                  +{accountsMissingDrops.length - 3} conta{accountsMissingDrops.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </motion.button>
        ) : (
          <InsightCard
            icon={Activity}
            title="Ritmo semanal"
            statement={weekComparison.statement}
            context={weekComparison.context}
            badge={weekComparison.badge}
            tone={weekComparison.tone}
            delay={0.1}
          />
        )}
        <InsightCard
          icon={Users}
          title="Carteira"
          statement={`${stats.activeAccounts}/${stats.totalAccounts} contas ativas`}
          context={`${stats.totalDropsAllTime} drops registrados. ROI geral: ${stats.overallROI === Infinity ? 'infinito' : formatPercent(stats.overallROI, 0)}.`}
          badge="Contas"
          tone="purple"
          delay={0.15}
        />
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
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Cashout Chart */}
          <motion.div
            className="lg:col-span-2"
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
            <Card className="p-5 h-full flex flex-col">
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
                  <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.09]">
                    <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">Bruto</p>
                    <p className="font-mono text-sm font-medium text-slate-200 mt-0.5">
                      {formatCurrencyCompact(currentWeekStats.totalSteamValue, currency)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.09]">
                    <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">Cashout</p>
                    <p className="font-mono text-sm font-medium text-profit mt-0.5">
                      {formatCurrencyCompact(currentWeekStats.totalCashout, currency)}
                    </p>
                  </div>
                </div>

                {/* Best week */}
                {stats.bestWeek && (
                  <div className="p-3 rounded-xl bg-gold/[0.05] border border-gold/15">
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
      )}

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

      {/* Goals preview */}
      {activeGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-bold text-slate-100">Metas em Andamento</p>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage('goals')}>
                Ver todas <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-4">
              {activeGoals.map(({ goal, current, progress }) => {
                const isMonetary = goal.type !== 'drops'
                return (
                  <div key={goal.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
                        <span className="text-sm text-slate-300 font-body">{goal.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-slate-500">
                          {isMonetary ? formatCurrency(current, currency) : current.toString()}
                          {' / '}
                          {isMonetary ? formatCurrency(goal.targetAmount, currency) : goal.targetAmount.toString()}
                        </span>
                        <span className="font-semibold" style={{ color: goal.color }}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${progress}%`, backgroundColor: goal.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Activity Feed */}
      {feedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display font-bold text-slate-100">Feed recente</p>
                <p className="text-xs text-slate-500 mt-0.5">Drops, payback e metas que acabaram de mexer no painel</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage('drops')}>
                Ver todos <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <div className="space-y-2">
              {feedItems.map(item => {
                const Icon = item.icon
                const tone = insightToneMap[item.tone]
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#111827] transition-colors">
                    {item.imageUrl ? (
                      <div className="w-10 h-10 rounded-lg bg-[#111827] border border-white/[0.09] shrink-0 overflow-hidden flex items-center justify-center">
                        <SteamItemImage imageUrl={item.imageUrl} alt={item.itemName} size={40} />
                      </div>
                    ) : (
                      <div className={cn('w-10 h-10 rounded-lg shrink-0 flex items-center justify-center', tone.icon)}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-body truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 font-body truncate">{item.detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge color={tone.badge}>{item.when}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default Dashboard
