import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { BarChart2, Award, Zap, Package, DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react'
import { useStore } from '../store'
import { calcDashboardStats, calcAccountStats } from '../lib/calculations'
import { formatCurrency, formatPercent, getWeekLabel, getPreviousWeeks, roiColorClass } from '../lib/utils'
import { Card, StatCard, Empty } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { useT } from '../hooks/useT'

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1117] border border-white/10 rounded-xl p-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.name !== 'Drops'
            ? formatCurrency(p.value, currency)
            : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Analytics Page ───────────────────────────────────────────────────────────

export default function Analytics() {
  const { accounts, drops, goals, settings } = useStore()
  const t = useT()
  const currency = settings.currency
  const [weeksRange, setWeeksRange] = useState(12)

  // All memos are null-safe
  const stats = useMemo(() =>
    calcDashboardStats(accounts, drops, goals, settings),
    [accounts, drops, goals, settings]
  )

  const accountStats = useMemo(() =>
    accounts.map(a => calcAccountStats(a, drops, settings)),
    [accounts, drops, settings]
  )

  const chartData = useMemo(() => {
    const weeks = getPreviousWeeks(weeksRange).reverse()
    return weeks.map(wid => {
      const ws = stats.weeklyStats.find(w => w.weekId === wid)
      return {
        week: getWeekLabel(wid).split('–')[0].trim(),
        Cashout: parseFloat((ws?.totalCashout ?? 0).toFixed(2)),
        Bruto:   parseFloat((ws?.totalSteamValue ?? 0).toFixed(2)),
        Drops:   ws?.totalDrops ?? 0,
      }
    })
  }, [stats.weeklyStats, weeksRange])

  const cumData = useMemo(() => {
    let acc = 0
    return chartData.map(d => {
      acc += d.Cashout
      return { ...d, Acumulado: parseFloat(acc.toFixed(2)) }
    })
  }, [chartData])

  const pieData = useMemo(() =>
    accountStats
      .filter(a => a.totalDrops > 0)
      .map(a => ({ name: a.account.name, value: a.totalDrops, color: a.account.color ?? '#38bdf8' })),
    [accountStats]
  )

  const topDrops = useMemo(() =>
    [...drops]
      .sort((a, b) => {
        const rate = settings.cashoutRate / 100
        const va = a.cashoutValue ?? a.steamValue * rate
        const vb = b.cashoutValue ?? b.steamValue * rate
        return vb - va
      })
      .slice(0, 8),
    [drops, settings.cashoutRate]
  )

  if (drops.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <Empty icon={BarChart2} title={t('analytics.empty_title')}
          description={t('analytics.empty_desc')} />
      </div>
    )
  }

  const cur = currency

  return (
    <div className="p-4 md:p-6 space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">Performance e tendências</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t('analytics.total_cashout')}  value={formatCurrency(stats.totalCashoutAllTime, currency)}  icon={DollarSign} color="profit" />
        <StatCard label={t('analytics.gross_value')}    value={formatCurrency(stats.totalSteamValueAllTime, currency)} icon={Package}   color="primary" />
        <StatCard label="ROI Geral"      value={isFinite(stats.overallROI) ? formatPercent(stats.overallROI) : '∞'} icon={TrendingUp} color={stats.overallROI >= 0 ? 'profit' : 'loss'} />
        <StatCard label={t('analytics.total_drops')} value={String(stats.totalDropsAllTime)} icon={Zap} color="gold" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-white">Cashout Semanal</p>
            <select value={weeksRange} onChange={e => setWeeksRange(Number(e.target.value))}
              className="text-xs bg-[#111827] border border-white/[0.1] rounded-lg px-2 py-1 text-slate-300 focus:outline-none">
              <option value={6}>6 semanas</option>
              <option value={12}>12 semanas</option>
              <option value={24}>24 semanas</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip currency={cur} />} />
              <Bar dataKey="Cashout" fill="#38bdf8" radius={[4,4,0,0]} maxBarSize={36} />
              <Bar dataKey="Bruto"   fill="#4ade80" radius={[4,4,0,0]} maxBarSize={36} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-white mb-4">Cashout Acumulado</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip currency={cur} />} />
              <Area type="monotone" dataKey="Acumulado" stroke="#38bdf8" strokeWidth={2} fill="url(#gradCum)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm font-semibold text-white mb-4">Volume de Drops</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTip currency={cur} />} />
              <Line type="monotone" dataKey="Drops" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3, fill: '#fbbf24' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-white mb-4">Drops por Conta</p>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-slate-600 text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                  paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, n: any) => [v + ' drops', n]} />
                <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Account table */}
      <Card className="p-5">
        <p className="text-sm font-semibold text-white mb-4">Performance por Conta</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Conta','Drops','Bruto','Cashout','Investido','ROI','Status'].map(h => (
                  <th key={h} className="text-left text-xs text-slate-500 font-medium pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...accountStats].sort((a,b) => b.roiPercent - a.roiPercent).map(as => (
                <tr key={as.account.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: as.account.color ?? '#64748b' }} />
                      <span className="text-white font-medium">{as.account.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-400">{as.totalDrops}</td>
                  <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">{formatCurrency(as.totalSteamValue, currency)}</td>
                  <td className="py-3 pr-4 text-profit font-mono whitespace-nowrap">{formatCurrency(as.totalCashout, currency)}</td>
                  <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">{formatCurrency(as.investedCost, currency)}</td>
                  <td className={`py-3 pr-4 font-mono font-semibold whitespace-nowrap ${roiColorClass(as.roiPercent)}`}>
                    {isFinite(as.roiPercent) ? formatPercent(as.roiPercent) : '∞'}
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      as.isPaidBack ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                    }`}>
                      {as.isPaidBack ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top drops */}
      {topDrops.length > 0 && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Award size={16} className="text-gold" /> Top Drops
          </p>
          <div className="space-y-2">
            {topDrops.map((drop, i) => {
              const account = accounts.find(a => a.id === drop.accountId)
              const val = drop.cashoutValue ?? (drop.steamValue * settings.cashoutRate / 100)
              return (
                <div key={drop.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#0d1117] hover:bg-[#111827] transition-colors">
                  <span className={`text-xs font-bold w-5 text-center ${i === 0 ? 'text-gold' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-[#111827] flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <SteamItemImage imageUrl={drop.item?.imageUrl} alt={drop.item?.name} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{drop.item?.name || '—'}</p>
                    <p className="text-xs text-slate-500">{account?.name ?? '?'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-profit">{formatCurrency(val, currency)}</p>
                    <p className="text-xs text-slate-500 font-mono">Bruto {formatCurrency(drop.steamValue, currency)}</p>
                  </div>
                  <ArrowUpRight size={13} className="text-slate-600" />
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
