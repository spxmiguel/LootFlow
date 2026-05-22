import type {
  CSAccount, Drop, Goal, AppSettings,
  AccountStats, WeekStats, DashboardStats,
} from './types'
import {
  getCurrentWeekId, getWeekLabel, getPreviousWeeks,
  formatDate,
} from './utils'
import { PRIME_COST_BRL } from './config'
import { format, parseISO, differenceInWeeks } from 'date-fns'

// ─── Cashout Calculation ──────────────────────────────────────────────────────

export function calcCashout(steamValue: number, rate: number): number {
  return steamValue * (rate / 100)
}

export function calcROIPercent(cashout: number, cost: number): number {
  if (cost === 0) return cashout > 0 ? Infinity : 0
  return ((cashout / cost) - 1) * 100
}

export function calcPaybackMultiplier(cashout: number, cost: number): number {
  if (cost === 0) return Infinity
  return cashout / cost
}

// ─── Account Stats ────────────────────────────────────────────────────────────

export function calcAccountStats(
  account: CSAccount,
  allDrops: Drop[],
  settings: AppSettings,
): AccountStats {
  const drops = allDrops.filter(d => d.accountId === account.id)

  const totalSteamValue = drops.reduce((s, d) => s + d.steamValue, 0)
  const totalCashout = drops.reduce((s, d) => s + (d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)), 0)
  const soldDrops = drops.filter(d => d.sold).length

  const investedCost = PRIME_COST_BRL

  const roiPercent = calcROIPercent(totalCashout, investedCost)
  const paybackMultiplier = calcPaybackMultiplier(totalCashout, investedCost)
  const isPaidBack = totalCashout >= investedCost
  const remainingPayback = Math.max(0, investedCost - totalCashout)

  // Weekly average cashout
  const weekIds = [...new Set(drops.map(d => d.weekId))]
  const weeklyAvgCashout = weekIds.length > 0 ? totalCashout / weekIds.length : 0

  // Best drop
  const bestDrop = drops.reduce<Drop | undefined>((best, d) => {
    const v = d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)
    const bv = best ? (best.cashoutValue ?? calcCashout(best.steamValue, settings.cashoutRate)) : -Infinity
    return v > bv ? d : best
  }, undefined)

  return {
    account,
    totalDrops: drops.length,
    totalSteamValue,
    totalCashout,
    soldDrops,
    unsoldDrops: drops.length - soldDrops,
    investedCost,
    roiPercent,
    paybackMultiplier,
    isPaidBack,
    remainingPayback,
    weeklyAvgCashout,
    bestDrop,
  }
}

// ─── Week Stats ────────────────────────────────────────────────────────────────

export function calcWeekStats(
  weekId: string,
  allDrops: Drop[],
  allAccounts: CSAccount[],
  settings: AppSettings,
): WeekStats {
  const drops = allDrops.filter(d => d.weekId === weekId)
  const totalSteamValue = drops.reduce((s, d) => s + d.steamValue, 0)
  const totalCashout = drops.reduce((s, d) => s + (d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)), 0)

  const accountDropCounts = new Map<string, number>()
  drops.forEach(d => {
    accountDropCounts.set(d.accountId, (accountDropCounts.get(d.accountId) ?? 0) + 1)
  })
  const completedAccounts = [...accountDropCounts.values()].filter(c => c >= 2).length

  return {
    weekId,
    label: getWeekLabel(weekId),
    totalDrops: drops.length,
    completedAccounts,
    totalSteamValue,
    totalCashout,
    soldDrops: drops.filter(d => d.sold).length,
    drops,
  }
}

// ─── Dashboard Aggregation ────────────────────────────────────────────────────

export function calcDashboardStats(
  accounts: CSAccount[],
  drops: Drop[],
  goals: Goal[],
  settings: AppSettings,
): DashboardStats {
  const activeAccounts = accounts.filter(a => a.active)
  const currentWeekId = getCurrentWeekId()
  const currentWeekDrops = drops.filter(d => d.weekId === currentWeekId).length
  const currentWeekTarget = activeAccounts.length * 2

  const totalSteamValueAllTime = drops.reduce((s, d) => s + d.steamValue, 0)
  const totalCashoutAllTime = drops.reduce((s, d) => s + (d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)), 0)
  const totalInvestedAllTime = accounts.length * PRIME_COST_BRL

  const overallROI = calcROIPercent(totalCashoutAllTime, totalInvestedAllTime)

  // Past 12 weeks
  const weekIds = getPreviousWeeks(12)
  const weeklyStats = weekIds.map(wid => calcWeekStats(wid, drops, accounts, settings))

  const accountStats = accounts.map(a => calcAccountStats(a, drops, settings))

  const bestWeek = weeklyStats.reduce<WeekStats | undefined>((best, w) => {
    return !best || w.totalCashout > best.totalCashout ? w : best
  }, undefined)

  const recentDrops = [...drops]
    .sort((a, b) => (b.createdAt ?? b.registeredAt ?? '').localeCompare(a.createdAt ?? a.registeredAt ?? ''))
    .slice(0, 10)

  return {
    totalAccounts: accounts.length,
    activeAccounts: activeAccounts.length,
    currentWeekDrops,
    currentWeekTarget,
    totalDropsAllTime: drops.length,
    totalSteamValueAllTime,
    totalCashoutAllTime,
    totalInvestedAllTime,
    overallROI,
    weeklyStats,
    accountStats,
    bestWeek,
    recentDrops,
  }
}

// ─── Goal Progress ────────────────────────────────────────────────────────────

export function calcGoalProgress(
  goal: Goal,
  stats: DashboardStats,
  currentWeekStats: WeekStats,
): number {
  if (!goal.targetAmount || goal.targetAmount <= 0) return 0
  switch (goal.type) {
    case 'revenue': return Math.min(100, (stats.totalSteamValueAllTime / goal.targetAmount) * 100)
    case 'profit':  return Math.min(100, (stats.totalCashoutAllTime   / goal.targetAmount) * 100)
    case 'cashout': return Math.min(100, (currentWeekStats.totalCashout / goal.targetAmount) * 100)
    case 'drops':   return Math.min(100, (stats.totalDropsAllTime     / goal.targetAmount) * 100)
    default:        return 0
  }
}
