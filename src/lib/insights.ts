// ─── Insights & Predictions Engine ───────────────────────────────────────────
// Motor de insights automáticos e previsões do LootFlow.
// Apenas lógica pura — sem código de UI.

import type { CSAccount, Drop, Goal, AppSettings, AccountStats, WeekStats } from './types'
import {
  calcAccountStats,
  calcDashboardStats,
  calcWeekStats,
  calcGoalProgress,
  calcCashout,
} from './calculations'
import {
  getCurrentWeekId,
  formatCurrency,
  getWeekIdForDate,
  getPreviousWeeks,
} from './utils'
import { PRIME_COST_BRL } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Insight {
  id: string
  type: 'best_account' | 'best_roi' | 'closest_payback' | 'closest_goal' | 'period_comparison' | 'prediction'
  title_pt: string
  title_en: string
  value: string
  detail_pt: string
  detail_en: string
  tone: 'profit' | 'primary' | 'gold' | 'purple' | 'loss'
  icon: string // nome do ícone Lucide
}

export interface Prediction {
  id: string
  label_pt: string
  label_en: string
  eta_weeks: number | null
  detail_pt: string
  detail_en: string
}

export interface HallOfFameEntry {
  name: string
  value: string
  detail_pt: string
  detail_en: string
}

export interface HallOfFame {
  bestAccount: HallOfFameEntry | null
  bestROI: HallOfFameEntry | null
  biggestDrop: HallOfFameEntry | null
  bestWeek: HallOfFameEntry | null
}

// ─── ETA Estimators ───────────────────────────────────────────────────────────

/** Estima semanas restantes para atingir uma meta, dado o ritmo semanal médio. */
export function estimateGoalETA(
  targetAmount: number,
  currentValue: number,
  weeklyAvg: number,
): number | null {
  if (weeklyAvg <= 0) return null
  const remaining = targetAmount - currentValue
  if (remaining <= 0) return 0
  return Math.ceil(remaining / weeklyAvg)
}

/** Estima semanas restantes para o payback de uma conta. */
export function estimatePaybackETA(
  remainingPayback: number,
  weeklyAvgCashout: number,
): number | null {
  if (weeklyAvgCashout <= 0) return null
  if (remainingPayback <= 0) return 0
  return Math.ceil(remainingPayback / weeklyAvgCashout)
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Retorna o cashout total de drops em uma determinada semana. */
function weekCashout(drops: Drop[], weekId: string, settings: AppSettings): number {
  return drops
    .filter(d => d.weekId === weekId)
    .reduce((sum, d) => sum + (d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)), 0)
}

/** Calcula o cashout médio semanal global (últimas N semanas com drops). */
function globalWeeklyAvg(drops: Drop[], settings: AppSettings, weeks = 12): number {
  const weekIds = getPreviousWeeks(weeks)
  const totals = weekIds.map(wid => weekCashout(drops, wid, settings)).filter(v => v > 0)
  if (totals.length === 0) return 0
  return totals.reduce((a, b) => a + b, 0) / totals.length
}

/** Valor acumulado atual de uma goal (baseado no tipo). */
function goalCurrentValue(
  goal: Goal,
  drops: Drop[],
  settings: AppSettings,
): number {
  const currentWeekId = getCurrentWeekId()
  switch (goal.type) {
    case 'revenue':
      return drops.reduce((s, d) => s + d.steamValue, 0)
    case 'profit':
    case 'cashout':
      // 'cashout' usa a semana atual; 'profit' acumula all-time
      if (goal.type === 'cashout') {
        return drops
          .filter(d => d.weekId === currentWeekId)
          .reduce((s, d) => s + (d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)), 0)
      }
      return drops.reduce((s, d) => s + (d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)), 0)
    case 'drops':
      return drops.length
    default:
      return 0
  }
}

// ─── computeInsights ──────────────────────────────────────────────────────────

export function computeInsights(
  accounts: CSAccount[],
  drops: Drop[],
  goals: Goal[],
  settings: AppSettings,
): Insight[] {
  const insights: Insight[] = []
  const currency = settings.currency ?? 'BRL'

  // Estatísticas por conta
  const accountStats = accounts.map(a => calcAccountStats(a, drops, settings))

  // ── Best Account (maior cashout total) ──
  const bestAccount = accountStats.reduce<AccountStats | null>((best, s) => {
    return !best || s.totalCashout > best.totalCashout ? s : best
  }, null)

  if (bestAccount && bestAccount.totalCashout > 0) {
    insights.push({
      id: 'best_account',
      type: 'best_account',
      title_pt: 'Melhor Conta',
      title_en: 'Best Account',
      value: formatCurrency(bestAccount.totalCashout, currency),
      detail_pt: `${bestAccount.account.name} gerou o maior cashout total.`,
      detail_en: `${bestAccount.account.name} generated the highest total cashout.`,
      tone: 'profit',
      icon: 'Trophy',
    })
  }

  // ── Best ROI ──
  const bestROI = accountStats
    .filter(s => s.totalDrops > 0)
    .reduce<AccountStats | null>((best, s) => {
      return !best || s.roiPercent > best.roiPercent ? s : best
    }, null)

  if (bestROI && bestROI.roiPercent > 0) {
    insights.push({
      id: 'best_roi',
      type: 'best_roi',
      title_pt: 'Melhor ROI',
      title_en: 'Best ROI',
      value: `${bestROI.roiPercent >= 0 ? '+' : ''}${bestROI.roiPercent.toFixed(1)}%`,
      detail_pt: `${bestROI.account.name} tem o melhor retorno sobre investimento.`,
      detail_en: `${bestROI.account.name} has the best return on investment.`,
      tone: 'profit',
      icon: 'TrendingUp',
    })
  }

  // ── Closest to Payback ──
  const closestPayback = accountStats
    .filter(s => s.remainingPayback > 0)
    .sort((a, b) => a.remainingPayback - b.remainingPayback)[0] ?? null

  if (closestPayback) {
    insights.push({
      id: 'closest_payback',
      type: 'closest_payback',
      title_pt: 'Próximo do Payback',
      title_en: 'Closest to Payback',
      value: formatCurrency(closestPayback.remainingPayback, currency),
      detail_pt: `${closestPayback.account.name} precisa de mais ${formatCurrency(closestPayback.remainingPayback, currency)} para se pagar.`,
      detail_en: `${closestPayback.account.name} needs ${formatCurrency(closestPayback.remainingPayback, currency)} more to pay back.`,
      tone: 'gold',
      icon: 'Target',
    })
  }

  // ── Closest Goal ──
  const dashStats = calcDashboardStats(accounts, drops, goals, settings)
  const currentWeekId = getCurrentWeekId()
  const currentWeekStats = calcWeekStats(currentWeekId, drops, accounts, settings)

  const goalsWithProgress = goals.map(g => ({
    goal: g,
    progress: calcGoalProgress(g, dashStats, currentWeekStats),
  }))

  const closestGoal = goalsWithProgress
    .filter(gp => gp.progress > 0 && gp.progress < 100)
    .sort((a, b) => b.progress - a.progress)[0] ?? null

  if (closestGoal) {
    insights.push({
      id: 'closest_goal',
      type: 'closest_goal',
      title_pt: 'Meta Mais Próxima',
      title_en: 'Closest Goal',
      value: `${closestGoal.progress.toFixed(1)}%`,
      detail_pt: `"${closestGoal.goal.name}" está a ${(100 - closestGoal.progress).toFixed(1)}% de ser alcançada.`,
      detail_en: `"${closestGoal.goal.name}" is ${(100 - closestGoal.progress).toFixed(1)}% away from completion.`,
      tone: 'purple',
      icon: 'Flag',
    })
  }

  // ── Week Comparison (esta semana vs semana passada) ──
  const recentWeeks = getPreviousWeeks(2) // [semana atual, semana passada]
  if (recentWeeks.length >= 2) {
    const thisWeekCashout = weekCashout(drops, recentWeeks[0], settings)
    const lastWeekCashout = weekCashout(drops, recentWeeks[1], settings)
    const delta = thisWeekCashout - lastWeekCashout

    const isUp = delta >= 0
    const deltaFormatted = formatCurrency(Math.abs(delta), currency)
    const sign = isUp ? '+' : '-'

    insights.push({
      id: 'period_comparison',
      type: 'period_comparison',
      title_pt: 'Semana vs Anterior',
      title_en: 'Week vs Previous',
      value: `${sign}${deltaFormatted}`,
      detail_pt: isUp
        ? `Esta semana rendeu ${deltaFormatted} a mais que a anterior.`
        : `Esta semana rendeu ${deltaFormatted} a menos que a anterior.`,
      detail_en: isUp
        ? `This week earned ${deltaFormatted} more than last week.`
        : `This week earned ${deltaFormatted} less than last week.`,
      tone: isUp ? 'profit' : 'loss',
      icon: isUp ? 'ArrowUpRight' : 'ArrowDownRight',
    })
  }

  return insights
}

// ─── computePredictions ───────────────────────────────────────────────────────

export function computePredictions(
  accounts: CSAccount[],
  drops: Drop[],
  goals: Goal[],
  settings: AppSettings,
): Prediction[] {
  const predictions: Prediction[] = []
  const currency = settings.currency ?? 'BRL'

  // ── Previsão de ETA para metas incompletas ──
  const dashStats = calcDashboardStats(accounts, drops, goals, settings)
  const currentWeekId = getCurrentWeekId()
  const currentWeekStats = calcWeekStats(currentWeekId, drops, accounts, settings)
  const avgWeekly = globalWeeklyAvg(drops, settings)

  for (const goal of goals) {
    const progress = calcGoalProgress(goal, dashStats, currentWeekStats)
    if (progress >= 100) continue // meta já completa

    const current = goalCurrentValue(goal, drops, settings)
    const eta = estimateGoalETA(goal.targetAmount, current, avgWeekly)

    const etaLabel = eta !== null
      ? (eta === 1 ? '1 semana' : `${eta} semanas`)
      : '—'
    const etaLabelEn = eta !== null
      ? (eta === 1 ? '1 week' : `${eta} weeks`)
      : '—'

    predictions.push({
      id: `goal_eta_${goal.id}`,
      label_pt: `Meta "${goal.name}"`,
      label_en: `Goal "${goal.name}"`,
      eta_weeks: eta,
      detail_pt: eta !== null
        ? `Estimativa: ~${etaLabel} restantes (${progress.toFixed(1)}% concluído).`
        : `Sem dados suficientes para estimar ETA (${progress.toFixed(1)}% concluído).`,
      detail_en: eta !== null
        ? `Estimate: ~${etaLabelEn} remaining (${progress.toFixed(1)}% complete).`
        : `Not enough data to estimate ETA (${progress.toFixed(1)}% complete).`,
    })
  }

  // ── Previsão de payback por conta ──
  const accountStats = accounts.map(a => calcAccountStats(a, drops, settings))

  for (const stat of accountStats) {
    if (stat.isPaidBack) continue // já pagou

    const eta = estimatePaybackETA(stat.remainingPayback, stat.weeklyAvgCashout)

    const etaLabel = eta !== null
      ? (eta === 1 ? '1 semana' : `${eta} semanas`)
      : '—'
    const etaLabelEn = eta !== null
      ? (eta === 1 ? '1 week' : `${eta} weeks`)
      : '—'

    predictions.push({
      id: `payback_eta_${stat.account.id}`,
      label_pt: `Payback "${stat.account.name}"`,
      label_en: `Payback "${stat.account.name}"`,
      eta_weeks: eta,
      detail_pt: eta !== null
        ? `Faltam ${formatCurrency(stat.remainingPayback, currency)} — ~${etaLabel} no ritmo atual.`
        : `Faltam ${formatCurrency(stat.remainingPayback, currency)} — sem histórico para estimar.`,
      detail_en: eta !== null
        ? `${formatCurrency(stat.remainingPayback, currency)} remaining — ~${etaLabelEn} at current pace.`
        : `${formatCurrency(stat.remainingPayback, currency)} remaining — no history to estimate.`,
    })
  }

  return predictions
}

// ─── computeHallOfFame ────────────────────────────────────────────────────────

export function computeHallOfFame(
  accounts: CSAccount[],
  drops: Drop[],
  settings: AppSettings,
): HallOfFame {
  const currency = settings.currency ?? 'BRL'
  const accountStats = accounts.map(a => calcAccountStats(a, drops, settings))

  // ── Best Account (maior cashout) ──
  const bestAccount = accountStats.reduce<AccountStats | null>((best, s) => {
    return !best || s.totalCashout > best.totalCashout ? s : best
  }, null)

  // ── Best ROI ──
  const bestROI = accountStats
    .filter(s => s.totalDrops > 0)
    .reduce<AccountStats | null>((best, s) => {
      return !best || s.roiPercent > best.roiPercent ? s : best
    }, null)

  // ── Biggest Drop (maior valor de cashout individual) ──
  const biggestDrop = drops.reduce<Drop | null>((best, d) => {
    const val = d.cashoutValue ?? calcCashout(d.steamValue, settings.cashoutRate)
    const bestVal = best
      ? (best.cashoutValue ?? calcCashout(best.steamValue, settings.cashoutRate))
      : -Infinity
    return val > bestVal ? d : best
  }, null)

  // Nome da conta do biggest drop
  const biggestDropAccount = biggestDrop
    ? accounts.find(a => a.id === biggestDrop.accountId)
    : null

  // ── Best Week (maior cashout semanal) ──
  const weekIds = [...new Set(drops.map(d => d.weekId))].sort()
  let bestWeekId: string | null = null
  let bestWeekCashout = 0

  for (const wid of weekIds) {
    const total = weekCashout(drops, wid, settings)
    if (total > bestWeekCashout) {
      bestWeekCashout = total
      bestWeekId = wid
    }
  }

  return {
    bestAccount: bestAccount && bestAccount.totalCashout > 0
      ? {
          name: bestAccount.account.name,
          value: formatCurrency(bestAccount.totalCashout, currency),
          detail_pt: `${bestAccount.totalDrops} drops, ROI ${bestAccount.roiPercent.toFixed(1)}%`,
          detail_en: `${bestAccount.totalDrops} drops, ROI ${bestAccount.roiPercent.toFixed(1)}%`,
        }
      : null,

    bestROI: bestROI && bestROI.roiPercent > 0
      ? {
          name: bestROI.account.name,
          value: `${bestROI.roiPercent >= 0 ? '+' : ''}${bestROI.roiPercent.toFixed(1)}%`,
          detail_pt: `Cashout total: ${formatCurrency(bestROI.totalCashout, currency)}`,
          detail_en: `Total cashout: ${formatCurrency(bestROI.totalCashout, currency)}`,
        }
      : null,

    biggestDrop: biggestDrop
      ? {
          name: biggestDrop.item.name,
          value: formatCurrency(
            biggestDrop.cashoutValue ?? calcCashout(biggestDrop.steamValue, settings.cashoutRate),
            currency,
          ),
          detail_pt: biggestDropAccount
            ? `Conta: ${biggestDropAccount.name}`
            : 'Conta removida',
          detail_en: biggestDropAccount
            ? `Account: ${biggestDropAccount.name}`
            : 'Account removed',
        }
      : null,

    bestWeek: bestWeekId
      ? {
          name: bestWeekId,
          value: formatCurrency(bestWeekCashout, currency),
          detail_pt: `Melhor semana registrada no sistema.`,
          detail_en: `Best recorded week in the system.`,
        }
      : null,
  }
}
