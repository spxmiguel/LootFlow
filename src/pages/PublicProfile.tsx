import { BarChart3, Boxes, Lock, Target, Trophy, UserCircle } from 'lucide-react'
import { useStore } from '../store'
import { Card, Empty, Badge } from '../components/ui'
import { Avatar, useProfileDisplay } from '../components/ProfileModal'
import { calcDashboardStats, calcGoalProgress, calcWeekStats } from '../lib/calculations'
import { formatCurrency, getCurrentWeekId } from '../lib/utils'
import { useT } from '../hooks/useT'

export default function PublicProfile() {
  const t = useT()
  const { accounts, drops, goals, cases, collection, gamification, settings, user } = useStore()
  const { displayName, photoURL } = useProfileDisplay()
  const username = decodeURIComponent(window.location.pathname.split('/u/')[1] || user?.uid || 'profile')
  const privacy = settings.privacy ?? {}
  const isPrivate = settings.profilePrivacy !== 'public' || privacy.hideProfile

  const stats = calcDashboardStats(accounts, drops, goals, settings)
  const currentWeek = calcWeekStats(getCurrentWeekId(), drops, accounts, settings)
  const activeGoals = goals
    .map(goal => ({ goal, progress: calcGoalProgress(goal, stats, currentWeek) }))
    .filter(item => item.progress < 100)
    .slice(0, 3)
  const caseCost = cases.reduce((sum, c) => sum + (c.casePriceAtOpen ?? 0) + (c.keyPriceAtOpen ?? c.keyPrice ?? 0), 0)
  const caseValue = cases.reduce((sum, c) => sum + (c.receivedValueAtOpen ?? c.obtainedValue ?? 0), 0)
  const openingRoi = caseCost > 0 ? ((caseValue / caseCost) - 1) * 100 : 0

  if (isPrivate) {
    return (
      <div className="min-h-screen bg-[#0d1117] p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Empty icon={Lock} title={t('profile.private_title')} description={t('profile.private_desc')} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar photoURL={photoURL} displayName={displayName} size={64} />
              <div>
                <h1 className="text-xl font-bold text-white">{displayName}</h1>
                <p className="text-sm text-slate-500">@{username}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gamification.activeTitle && <Badge color="purple">{gamification.activeTitle}</Badge>}
                  <Badge color="blue">Level {gamification.level}</Badge>
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              {t('profile.joined')} {user ? new Date().getFullYear() : 'LootFlow'}
            </div>
          </div>
        </Card>

        {!privacy.hideStatistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">{t('profile.total_drops')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-100">{stats.totalDropsAllTime}</p>
            </Card>
            {!privacy.hideTotalProfit && (
              <Card className="p-4">
                <Target className="h-4 w-4 text-profit" />
                <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">{t('profile.total_profit')}</p>
                <p className="mt-1 font-mono text-xl font-bold text-profit">{formatCurrency(stats.totalCashoutAllTime, settings.currency)}</p>
              </Card>
            )}
            <Card className="p-4">
              <Trophy className="h-4 w-4 text-gold" />
              <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">{t('profile.perfect_weeks')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-100">{gamification.totalPerfectWeeks}</p>
            </Card>
            <Card className="p-4">
              <UserCircle className="h-4 w-4 text-purple-400" />
              <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">XP</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-100">{gamification.totalXP}</p>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {!privacy.hideCollection && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">{t('profile.collection')}</h2>
                <Badge color="blue">{collection.length}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">{t('profile.collection_desc')}</p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">{t('profile.case_openings')}</h2>
              <Badge color={openingRoi >= 0 ? 'green' : 'red'}>{openingRoi.toFixed(0)}%</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Boxes className="h-5 w-5 text-slate-500" />
              <p className="text-sm text-slate-400">{t('profile.cases_opened', { count: cases.length })}</p>
            </div>
          </Card>
        </div>

        {activeGoals.length > 0 && (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-100">{t('profile.goals')}</h2>
            <div className="mt-4 space-y-3">
              {activeGoals.map(({ goal, progress }) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{goal.name}</span>
                    <span className="font-mono text-slate-500">{Math.round(progress)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
