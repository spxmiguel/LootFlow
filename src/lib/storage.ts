import { logger } from './logger'
import type { CSAccount, Drop, Goal, AppSettings } from './types'

const KEYS = {
  accounts: 'lootflow_accounts',
  drops: 'lootflow_drops',
  goals: 'lootflow_goals',
  settings: 'lootflow_settings',
  user: 'lootflow_user',
} as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    logger.error('localStorage save error:', e)
  }
}

// ─── Default Settings ──────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  cashoutRate: 85,
  currency: 'BRL',
  weeklyGoalAmount: 50,
  firebaseSyncEnabled: true,
  theme: {
    primaryColor: '#38bdf8',
    accentColor: '#4ade80',
    glassmorphism: true,
    animations: true,
    sidebarCompact: false,
  },
  showOnboarding: true,
}

// ─── Loaders ──────────────────────────────────────────────────────────────────

function loadAccounts(): CSAccount[] { return load<CSAccount[]>(KEYS.accounts, []) }
function loadDrops(): Drop[] { return load<Drop[]>(KEYS.drops, []) }
function loadGoals(): Goal[] { return load<Goal[]>(KEYS.goals, []) }
function loadSettings(): AppSettings {
  const saved = load<Partial<AppSettings>>(KEYS.settings, {})
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    theme: { ...DEFAULT_SETTINGS.theme, ...(saved.theme ?? {}) },
  }
}
function saveAccounts(accounts: CSAccount[]) { save(KEYS.accounts, accounts) }
function saveDrops(drops: Drop[]) { save(KEYS.drops, drops) }
function saveGoals(goals: Goal[]) { save(KEYS.goals, goals) }
function saveSettings(settings: AppSettings) { save(KEYS.settings, settings) }

export const storage = {
  loadAccounts,
  loadDrops,
  loadGoals,
  loadSettings,
  saveAccounts,
  saveDrops,
  saveGoals,
  saveSettings,

  clearAll: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  },

  exportAll: () => ({
    accounts: loadAccounts(),
    drops: loadDrops(),
    goals: loadGoals(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }),

  importAll: (data: { accounts?: CSAccount[]; drops?: Drop[]; goals?: Goal[]; settings?: AppSettings }) => {
    if (data.accounts) saveAccounts(data.accounts)
    if (data.drops) saveDrops(data.drops)
    if (data.goals) saveGoals(data.goals)
    if (data.settings) saveSettings(data.settings)
  },
}
