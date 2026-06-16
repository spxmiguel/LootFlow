import type { CSAccount, Drop, Goal, AppSettings } from './types'
import { PRIME_COST_BRL } from './config'
import { calcCashout, calcDashboardStats, calcGoalProgress, calcWeekStats } from './calculations'
import { getCurrentWeekId } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond'

export interface Achievement {
  id: string
  icon: string
  tier: AchievementTier
  name_pt: string
  name_en: string
  desc_pt: string
  desc_en: string
}

export interface UnlockedAchievement {
  achievement: Achievement
  unlockedAt: string   // ISO date (estimativa baseada nos dados)
  progress: number     // 0–100
}

// ─── Definição das Conquistas ─────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_drop',
    icon: '🎯',
    tier: 'bronze',
    name_pt: 'Primeiro Drop',
    name_en: 'First Drop',
    desc_pt: 'Registre seu primeiro drop',
    desc_en: 'Register your first drop',
  },
  {
    id: 'ten_drops',
    icon: '📦',
    tier: 'bronze',
    name_pt: '10 Drops',
    name_en: '10 Drops',
    desc_pt: '10 drops registrados',
    desc_en: '10 drops registered',
  },
  {
    id: 'fifty_drops',
    icon: '🏗️',
    tier: 'silver',
    name_pt: '50 Drops',
    name_en: '50 Drops',
    desc_pt: '50 drops registrados',
    desc_en: '50 drops registered',
  },
  {
    id: 'hundred_drops',
    icon: '💯',
    tier: 'gold',
    name_pt: '100 Drops',
    name_en: '100 Drops',
    desc_pt: '100 drops registrados',
    desc_en: '100 drops registered',
  },
  {
    id: 'first_payback',
    icon: '💰',
    tier: 'silver',
    name_pt: 'Primeiro Payback',
    name_en: 'First Payback',
    desc_pt: 'Uma conta atingiu o payback',
    desc_en: 'First account payback reached',
  },
  {
    id: 'positive_roi',
    icon: '📈',
    tier: 'silver',
    name_pt: 'ROI Positivo',
    name_en: 'Positive ROI',
    desc_pt: 'ROI geral acima de 0%',
    desc_en: 'Overall ROI above 0%',
  },
  {
    id: 'goal_completed',
    icon: '✅',
    tier: 'bronze',
    name_pt: 'Meta Cumprida',
    name_en: 'Goal Completed',
    desc_pt: 'Complete qualquer meta',
    desc_en: 'Complete any goal',
  },
  {
    id: 'all_goals',
    icon: '🏆',
    tier: 'gold',
    name_pt: 'Todas as Metas',
    name_en: 'All Goals',
    desc_pt: 'Complete todas as metas (mínimo 2)',
    desc_en: 'Complete all goals (min 2)',
  },
  {
    id: 'weekly_streak_4',
    icon: '🔥',
    tier: 'silver',
    name_pt: 'Sequência de 4',
    name_en: '4-Week Streak',
    desc_pt: 'Drops em 4 semanas consecutivas',
    desc_en: 'Drops in 4 consecutive weeks',
  },
  {
    id: 'weekly_streak_8',
    icon: '🔥',
    tier: 'gold',
    name_pt: 'Sequência de 8',
    name_en: '8-Week Streak',
    desc_pt: 'Drops em 8 semanas consecutivas',
    desc_en: 'Drops in 8 consecutive weeks',
  },
  {
    id: 'gold_drop',
    icon: '🥇',
    tier: 'gold',
    name_pt: 'Drop de Ouro',
    name_en: 'Gold Drop',
    desc_pt: 'Um drop com cashout acima de R$50',
    desc_en: 'Single drop cashout above R$50',
  },
  {
    id: 'diamond_drop',
    icon: '💎',
    tier: 'diamond',
    name_pt: 'Drop Diamante',
    name_en: 'Diamond Drop',
    desc_pt: 'Um drop com cashout acima de R$150',
    desc_en: 'Single drop cashout above R$150',
  },
  {
    id: 'drop_machine',
    icon: '⚙️',
    tier: 'silver',
    name_pt: 'Máquina de Drops',
    name_en: 'Drop Machine',
    desc_pt: '50 drops registrados no total',
    desc_en: '50 drops registered in total',
  },
  {
    id: 'full_house',
    icon: '🏠',
    tier: 'gold',
    name_pt: 'Full House',
    name_en: 'Full House',
    desc_pt: 'Todas as contas ativas completaram drops em uma semana',
    desc_en: 'All active accounts completed drops in a single week',
  },
]

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Retorna o valor de cashout efetivo de um drop */
function dropCashoutValue(drop: Drop, cashoutRate: number): number {
  return drop.cashoutValue ?? calcCashout(drop.steamValue, cashoutRate)
}

/**
 * Calcula o streak máximo de semanas consecutivas com drops.
 * WeekIds seguem o padrão YYYY-MM-DD (terça-feira), então
 * verificamos se a diferença entre semanas ordenadas é exatamente 7 dias.
 */
function calcMaxWeeklyStreak(drops: Drop[]): { maxStreak: number; weekIds: string[] } {
  const weekIdSet = new Set(drops.map(d => d.weekId))
  const sortedWeeks = [...weekIdSet].sort() // ordena cronologicamente

  if (sortedWeeks.length === 0) return { maxStreak: 0, weekIds: [] }

  let maxStreak = 1
  let currentStreak = 1
  let bestEnd = 0

  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = new Date(sortedWeeks[i - 1]).getTime()
    const curr = new Date(sortedWeeks[i]).getTime()
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)

    if (diffDays === 7) {
      currentStreak++
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        bestEnd = i
      }
    } else {
      currentStreak = 1
    }
  }

  return { maxStreak, weekIds: sortedWeeks }
}

/**
 * Retorna a data ISO mais antiga de um conjunto de drops (createdAt).
 * Usado como estimativa de "quando" um achievement foi desbloqueado.
 */
function earliestDropDate(drops: Drop[]): string {
  if (drops.length === 0) return new Date().toISOString()
  return drops.reduce((oldest, d) => {
    const date = d.createdAt ?? d.registeredAt ?? ''
    return date < oldest ? date : oldest
  }, drops[0].createdAt ?? drops[0].registeredAt ?? new Date().toISOString())
}

/**
 * Retorna a data ISO do N-ésimo drop (ordenado por criação).
 * Útil para estimar quando milestones de contagem foram atingidos.
 */
function nthDropDate(drops: Drop[], n: number): string {
  const sorted = [...drops].sort((a, b) =>
    (a.createdAt ?? a.registeredAt ?? '').localeCompare(b.createdAt ?? b.registeredAt ?? '')
  )
  const target = sorted[Math.min(n - 1, sorted.length - 1)]
  return target?.createdAt ?? target?.registeredAt ?? new Date().toISOString()
}

// ─── Computação Principal ─────────────────────────────────────────────────────

/**
 * Computa todas as conquistas desbloqueadas a partir dos dados da store.
 * Função pura — sem side effects, apenas leitura dos arrays.
 */
export function computeUnlockedAchievements(
  accounts: CSAccount[],
  drops: Drop[],
  goals: Goal[],
  settings: AppSettings,
): UnlockedAchievement[] {
  const unlocked: UnlockedAchievement[] = []
  const rate = settings.cashoutRate
  const now = new Date().toISOString()

  // Pré-computa stats do dashboard (reutilizado por vários achievements)
  const dashStats = calcDashboardStats(accounts, drops, goals, settings)
  const currentWeekId = getCurrentWeekId()
  const currentWeekStats = calcWeekStats(currentWeekId, drops, accounts, settings)

  // Helper para adicionar um achievement desbloqueado
  const unlock = (id: string, unlockedAt: string, progress: number) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === id)
    if (!achievement) return
    unlocked.push({ achievement, unlockedAt, progress: Math.min(100, Math.round(progress)) })
  }

  // ── Drop count milestones ─────────────────────────────────────────────────

  const totalDrops = drops.length

  if (totalDrops >= 1) {
    unlock('first_drop', nthDropDate(drops, 1), 100)
  } else {
    unlock('first_drop', now, 0)
  }

  // ten_drops
  unlock('ten_drops', totalDrops >= 10 ? nthDropDate(drops, 10) : now, (totalDrops / 10) * 100)

  // fifty_drops
  unlock('fifty_drops', totalDrops >= 50 ? nthDropDate(drops, 50) : now, (totalDrops / 50) * 100)

  // hundred_drops
  unlock('hundred_drops', totalDrops >= 100 ? nthDropDate(drops, 100) : now, (totalDrops / 100) * 100)

  // drop_machine (também 50 drops, mas tier diferente — mesma lógica)
  unlock('drop_machine', totalDrops >= 50 ? nthDropDate(drops, 50) : now, (totalDrops / 50) * 100)

  // ── Payback ───────────────────────────────────────────────────────────────

  const paidBackAccounts = dashStats.accountStats.filter(s => s.isPaidBack)
  if (paidBackAccounts.length > 0) {
    // Estimativa: pega a data do drop mais antigo da conta que fez payback
    const accountDrops = drops.filter(d =>
      paidBackAccounts.some(s => s.account.id === d.accountId)
    )
    unlock('first_payback', accountDrops.length > 0 ? earliestDropDate(accountDrops) : now, 100)
  } else {
    // Progresso: maior % de payback dentre todas as contas
    const bestPaybackPct = dashStats.accountStats.length > 0
      ? Math.max(...dashStats.accountStats.map(s => s.paybackMultiplier * 100))
      : 0
    unlock('first_payback', now, Math.min(100, bestPaybackPct))
  }

  // ── ROI Positivo ──────────────────────────────────────────────────────────

  const overallROI = dashStats.overallROI
  if (overallROI > 0) {
    unlock('positive_roi', now, 100)
  } else {
    // Progresso: quão perto está do 0% (de -100% a 0%)
    const progress = accounts.length > 0 ? Math.max(0, (100 + overallROI)) : 0
    unlock('positive_roi', now, progress)
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  const goalProgresses = goals.map(g =>
    calcGoalProgress(g, dashStats, currentWeekStats)
  )
  const completedGoals = goalProgresses.filter(p => p >= 100).length
  const hasAnyGoal = goals.length > 0

  // goal_completed
  if (completedGoals >= 1) {
    unlock('goal_completed', now, 100)
  } else if (hasAnyGoal) {
    const bestGoalProgress = Math.max(...goalProgresses, 0)
    unlock('goal_completed', now, bestGoalProgress)
  } else {
    unlock('goal_completed', now, 0)
  }

  // all_goals (mínimo 2 metas)
  if (goals.length >= 2 && completedGoals === goals.length) {
    unlock('all_goals', now, 100)
  } else if (goals.length >= 2) {
    unlock('all_goals', now, (completedGoals / goals.length) * 100)
  } else {
    unlock('all_goals', now, 0)
  }

  // ── Weekly Streaks ────────────────────────────────────────────────────────

  const { maxStreak } = calcMaxWeeklyStreak(drops)

  // weekly_streak_4
  unlock(
    'weekly_streak_4',
    maxStreak >= 4 ? now : now,
    (Math.min(maxStreak, 4) / 4) * 100,
  )

  // weekly_streak_8
  unlock(
    'weekly_streak_8',
    maxStreak >= 8 ? now : now,
    (Math.min(maxStreak, 8) / 8) * 100,
  )

  // ── High-value drops ──────────────────────────────────────────────────────

  const dropValues = drops.map(d => ({
    value: dropCashoutValue(d, rate),
    date: d.createdAt ?? d.registeredAt ?? now,
  }))

  // gold_drop (cashout > R$50)
  const goldDrop = dropValues.find(d => d.value > 50)
  if (goldDrop) {
    unlock('gold_drop', goldDrop.date, 100)
  } else {
    const bestValue = dropValues.length > 0 ? Math.max(...dropValues.map(d => d.value)) : 0
    unlock('gold_drop', now, (bestValue / 50) * 100)
  }

  // diamond_drop (cashout > R$150)
  const diamondDrop = dropValues.find(d => d.value > 150)
  if (diamondDrop) {
    unlock('diamond_drop', diamondDrop.date, 100)
  } else {
    const bestValue = dropValues.length > 0 ? Math.max(...dropValues.map(d => d.value)) : 0
    unlock('diamond_drop', now, (bestValue / 150) * 100)
  }

  // ── Full House ────────────────────────────────────────────────────────────

  const activeAccounts = accounts.filter(a => a.active)
  if (activeAccounts.length > 0) {
    // Verifica todas as semanas com drops
    const weekIds = [...new Set(drops.map(d => d.weekId))]
    let fullHouseFound = false

    for (const weekId of weekIds) {
      const weekDrops = drops.filter(d => d.weekId === weekId)
      const accountsWithDrops = new Set(weekDrops.map(d => d.accountId))

      // Checa se todas as contas ativas naquela semana tinham drops
      const allActive = activeAccounts.every(a => accountsWithDrops.has(a.id))
      if (allActive && activeAccounts.length > 0) {
        fullHouseFound = true
        // Estimativa: data do último drop daquela semana
        const weekDropDates = weekDrops.map(d => d.createdAt ?? d.registeredAt ?? '')
        const latestDate = weekDropDates.sort().pop() ?? now
        unlock('full_house', latestDate, 100)
        break
      }
    }

    if (!fullHouseFound) {
      // Progresso: melhor semana (% de contas ativas que fizeram drop)
      let bestPct = 0
      for (const weekId of weekIds) {
        const weekDrops = drops.filter(d => d.weekId === weekId)
        const accountsWithDrops = new Set(weekDrops.map(d => d.accountId))
        const activeWithDrops = activeAccounts.filter(a => accountsWithDrops.has(a.id)).length
        const pct = (activeWithDrops / activeAccounts.length) * 100
        if (pct > bestPct) bestPct = pct
      }
      unlock('full_house', now, bestPct)
    }
  } else {
    unlock('full_house', now, 0)
  }

  return unlocked
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

/** Cor do tier para uso em badges/borders */
export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  diamond: '#b9f2ff',
}

/** Retorna apenas achievements efetivamente desbloqueados (progress === 100) */
export function getCompletedAchievements(all: UnlockedAchievement[]): UnlockedAchievement[] {
  return all.filter(a => a.progress >= 100)
}

/** Retorna achievements em progresso (0 < progress < 100) */
export function getInProgressAchievements(all: UnlockedAchievement[]): UnlockedAchievement[] {
  return all.filter(a => a.progress > 0 && a.progress < 100)
}
