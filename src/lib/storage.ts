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

function detectLanguage(): 'pt' | 'en' {
  try {
    const nav = navigator.language || 'pt'
    return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en'
  } catch { return 'pt' }
}

export const DEFAULT_SETTINGS: AppSettings = {
  cashoutRate: 85,
  currency: 'BRL',
  usdRate: 5.2,
  language: detectLanguage(),
  weeklyGoalAmount: 50,
  firebaseSyncEnabled: true,
  theme: {
    primaryColor: '#10b981',
    accentColor: '#10b981',
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
  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...saved,
    theme: { ...DEFAULT_SETTINGS.theme, ...(saved.theme ?? {}) },
  }
  // Migrate old cyan default → green to match new design system
  if (merged.theme.primaryColor === '#38bdf8') merged.theme.primaryColor = '#10b981'
  if (merged.theme.accentColor === '#4ade80') merged.theme.accentColor = '#10b981'
  // Auto-detect language if not explicitly set
  if (!merged.language) merged.language = detectLanguage()
  return merged
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

  // Validates the shape of an imported backup and throws if invalid.
  validateImport(data: unknown): data is { accounts?: unknown[]; drops?: unknown[]; goals?: unknown[]; settings?: unknown } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Formato inválido')
    const d = data as Record<string, unknown>
    if (d.accounts !== undefined && !Array.isArray(d.accounts)) throw new Error('Campo "accounts" inválido')
    if (d.drops !== undefined && !Array.isArray(d.drops)) throw new Error('Campo "drops" inválido')
    if (d.goals !== undefined && !Array.isArray(d.goals)) throw new Error('Campo "goals" inválido')
    if (d.settings !== undefined && (typeof d.settings !== 'object' || Array.isArray(d.settings))) throw new Error('Campo "settings" inválido')
    if (!d.accounts && !d.drops && !d.goals && !d.settings) throw new Error('Backup vazio ou sem dados reconhecidos')
    // Enforce max item counts to prevent DoS
    if (Array.isArray(d.accounts) && d.accounts.length > 50) throw new Error('Muitas contas (máx 50)')
    if (Array.isArray(d.drops) && d.drops.length > 5000) throw new Error('Muitos drops (máx 5000)')
    if (Array.isArray(d.goals) && d.goals.length > 200) throw new Error('Muitas metas (máx 200)')
    return true
  },

  importAll: (data: { accounts?: CSAccount[]; drops?: Drop[]; goals?: Goal[]; settings?: AppSettings }) => {
    if (data.accounts) saveAccounts(data.accounts)
    if (data.drops) saveDrops(data.drops)
    if (data.goals) saveGoals(data.goals)
    if (data.settings) saveSettings(data.settings)
  },
}
