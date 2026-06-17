import { logger } from './logger'
import type {
  CSAccount,
  Drop,
  Goal,
  AppSettings,
  CollectionItem,
  Friend,
  FriendRequest,
  CaseOpeningLog,
  Achievement,
  GamificationState,
} from './types'
import { DEFAULT_GAMIFICATION_TITLE, normalizeGamificationTitle } from './gamificationTitles'

const KEYS = {
  accounts: 'lootflow_accounts',
  drops: 'lootflow_drops',
  goals: 'lootflow_goals',
  settings: 'lootflow_settings',
  user: 'lootflow_user',
  collection: 'lootflow_collection',
  cases: 'lootflow_cases',
  friends: 'lootflow_friends',
  friendRequests: 'lootflow_friend_requests',
  achievements: 'lootflow_achievements',
  gamification: 'lootflow_gamification',
} as const

const OWNER_KEY = 'lootflow_storage_owner'
let storageOwner = 'local'

function sanitizeOwner(owner: string): string {
  return owner.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96) || 'local'
}

function scopedKey(key: string): string {
  return `lootflow:${storageOwner}:${key}`
}

function hasLegacyValue(key: string): boolean {
  try { return localStorage.getItem(key) !== null } catch { return false }
}

function loadRaw(key: string): string | null {
  try {
    const scoped = localStorage.getItem(scopedKey(key))
    if (scoped !== null) return scoped

    // Legacy global keys are only trusted for local/offline mode. Google data
    // must never be hydrated from global localStorage, otherwise switching
    // accounts can show or upload another account's cached data.
    if (storageOwner === 'local') {
      const legacy = localStorage.getItem(key)
      if (legacy !== null) {
        localStorage.setItem(scopedKey(key), legacy)
        return legacy
      }
    }
    return null
  } catch {
    return null
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = loadRaw(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value))
    localStorage.setItem(OWNER_KEY, storageOwner)
  } catch (e) {
    logger.error('localStorage save error:', e)
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(scopedKey(key))
    if (storageOwner === 'local') localStorage.removeItem(key)
  } catch {}
}

function setOwner(owner: string): void {
  storageOwner = sanitizeOwner(owner)
  try { localStorage.setItem(OWNER_KEY, storageOwner) } catch {}
}

function getOwner(): string {
  return storageOwner
}

function hasCurrentOwnerData(): boolean {
  return Object.values(KEYS).some(key => {
    try { return localStorage.getItem(scopedKey(key)) !== null } catch { return false }
  })
}

function hasLegacyData(): boolean {
  return Object.values(KEYS).some(hasLegacyValue)
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
  liteMode: false,
  profilePrivacy: 'private',
  privacy: {
    hideProfile: true,
    hideStatistics: false,
    hideAchievements: true,
    hideCollection: true,
    hideTotalProfit: true,
    hideAccounts: true,
    hideHistory: true,
  },
  gamification: {
    showInsights: true,
    showHeatmap: true,
    showTimeline: false,
    showAchievements: true,
    showHallOfFame: true,
    showPerfectWeek: true,
    showLevels: true,
    showTitles: true,
    showRankings: true,
    showCollection: true,
    showCaseTracker: true,
  },
}

// ─── Loaders ──────────────────────────────────────────────────────────────────

function loadAccounts(): CSAccount[] { return load<CSAccount[]>(KEYS.accounts, []) }
function loadDrops(): Drop[] { return load<Drop[]>(KEYS.drops, []) }
function loadGoals(): Goal[] { return load<Goal[]>(KEYS.goals, []) }
function loadCollection(): CollectionItem[] { return load<CollectionItem[]>(KEYS.collection, []) }
function loadCases(): CaseOpeningLog[] { return load<CaseOpeningLog[]>(KEYS.cases, []) }
function loadFriends(): Friend[] { return load<Friend[]>(KEYS.friends, []) }
function loadFriendRequests(): FriendRequest[] { return load<FriendRequest[]>(KEYS.friendRequests, []) }
function loadAchievements(): Achievement[] { return load<Achievement[]>(KEYS.achievements, []) }
function loadGamificationState(): GamificationState {
  const def: GamificationState = {
    totalPerfectWeeks: 0,
    currentPerfectWeekStreak: 0,
    bestPerfectWeekStreak: 0,
    totalXP: 0,
    level: 1,
    levelProgress: 0,
    unlockedTitles: [DEFAULT_GAMIFICATION_TITLE],
    activeTitle: DEFAULT_GAMIFICATION_TITLE,
    completedPerfectWeeks: [],
    xpAwardedWeeks: {},
  }
  const saved = load<GamificationState>(KEYS.gamification, def)
  const unlockedTitles = [...new Set((saved.unlockedTitles ?? def.unlockedTitles).map(normalizeGamificationTitle))]
  return {
    ...def,
    ...saved,
    unlockedTitles,
    activeTitle: normalizeGamificationTitle(saved.activeTitle ?? def.activeTitle),
  }
}

function loadSettings(): AppSettings {
  const saved = load<Partial<AppSettings>>(KEYS.settings, {})
  const merged: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...saved,
    theme: { ...DEFAULT_SETTINGS.theme, ...(saved.theme ?? {}) },
    gamification: { ...DEFAULT_SETTINGS.gamification, ...(saved.gamification ?? {}) } as any,
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(saved.privacy ?? {}) },
  }
  // Rankings são padrão; a opção antiga fica habilitada apenas por compatibilidade.
  merged.gamification!.showRankings = true
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
function saveCollection(collection: CollectionItem[]) { save(KEYS.collection, collection) }
function saveCases(cases: CaseOpeningLog[]) { save(KEYS.cases, cases) }
function saveFriends(friends: Friend[]) { save(KEYS.friends, friends) }
function saveFriendRequests(requests: FriendRequest[]) { save(KEYS.friendRequests, requests) }
function saveAchievements(achievements: Achievement[]) { save(KEYS.achievements, achievements) }
function saveGamificationState(state: GamificationState) { save(KEYS.gamification, state) }

export const storage = {
  loadAccounts,
  loadDrops,
  loadGoals,
  loadSettings,
  loadCollection,
  loadCases,
  loadFriends,
  loadFriendRequests,
  loadAchievements,
  loadGamificationState,
  saveAccounts,
  saveDrops,
  saveGoals,
  saveSettings,
  saveCollection,
  saveCases,
  saveFriends,
  saveFriendRequests,
  saveAchievements,
  saveGamificationState,
  setOwner,
  getOwner,
  hasCurrentOwnerData,
  hasLegacyData,

  clearAll: () => {
    Object.values(KEYS).forEach(k => remove(k))
  },

  exportAll: () => ({
    accounts: loadAccounts(),
    drops: loadDrops(),
    goals: loadGoals(),
    settings: loadSettings(),
    collection: loadCollection(),
    cases: loadCases(),
    friends: loadFriends(),
    friendRequests: loadFriendRequests(),
    achievements: loadAchievements(),
    gamification: loadGamificationState(),
    exportedAt: new Date().toISOString(),
    version: '2.0',
  }),

  // Validates the shape of an imported backup and throws if invalid.
  validateImport(data: unknown): data is {
    accounts?: unknown[];
    drops?: unknown[];
    goals?: unknown[];
    settings?: unknown;
    collection?: unknown[];
    cases?: unknown[];
    friends?: unknown[];
    friendRequests?: unknown[];
    achievements?: unknown[];
    gamification?: unknown;
  } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Formato inválido')
    const d = data as Record<string, unknown>
    if (d.accounts !== undefined && !Array.isArray(d.accounts)) throw new Error('Campo "accounts" inválido')
    if (d.drops !== undefined && !Array.isArray(d.drops)) throw new Error('Campo "drops" inválido')
    if (d.goals !== undefined && !Array.isArray(d.goals)) throw new Error('Campo "goals" inválido')
    if (d.settings !== undefined && (typeof d.settings !== 'object' || Array.isArray(d.settings))) throw new Error('Campo "settings" inválido')
    if (d.collection !== undefined && !Array.isArray(d.collection)) throw new Error('Campo "collection" inválido')
    if (d.cases !== undefined && !Array.isArray(d.cases)) throw new Error('Campo "cases" inválido')
    if (d.friends !== undefined && !Array.isArray(d.friends)) throw new Error('Campo "friends" inválido')
    if (d.friendRequests !== undefined && !Array.isArray(d.friendRequests)) throw new Error('Campo "friendRequests" inválido')
    if (d.achievements !== undefined && !Array.isArray(d.achievements)) throw new Error('Campo "achievements" inválido')
    if (!d.accounts && !d.drops && !d.goals && !d.settings) throw new Error('Backup vazio ou sem dados reconhecidos')
    // Enforce max item counts to prevent DoS
    if (Array.isArray(d.accounts) && d.accounts.length > 50) throw new Error('Muitas contas (máx 50)')
    if (Array.isArray(d.drops) && d.drops.length > 5000) throw new Error('Muitos drops (máx 5000)')
    if (Array.isArray(d.goals) && d.goals.length > 200) throw new Error('Muitas metas (máx 200)')
    return true
  },

  importAll: (data: {
    accounts?: CSAccount[];
    drops?: Drop[];
    goals?: Goal[];
    settings?: AppSettings;
    collection?: CollectionItem[];
    cases?: CaseOpeningLog[];
    friends?: Friend[];
    friendRequests?: FriendRequest[];
    achievements?: Achievement[];
    gamification?: GamificationState;
  }) => {
    if (data.accounts) saveAccounts(data.accounts)
    if (data.drops) saveDrops(data.drops)
    if (data.goals) saveGoals(data.goals)
    if (data.settings) saveSettings(data.settings)
    if (data.collection) saveCollection(data.collection)
    if (data.cases) saveCases(data.cases)
    if (data.friends) saveFriends(data.friends)
    if (data.friendRequests) saveFriendRequests(data.friendRequests)
    if (data.achievements) saveAchievements(data.achievements)
    if (data.gamification) saveGamificationState(data.gamification)
  },
}
