import { logger } from '../lib/logger'
import toast from 'react-hot-toast'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
  CSAccount,
  Drop,
  Goal,
  AppSettings,
  AppUser,
  Page,
  ModalType,
  ProfileOverride,
  CollectionItem,
  Friend,
  FriendRequest,
  CaseOpeningLog,
  Achievement,
  GamificationState,
  LeaderboardEntry,
  SteamItem,
  PublicProfileSummary,
} from '../lib/types'
import { storage, DEFAULT_SETTINGS } from '../lib/storage'
import { generateId, getAccountColor } from '../lib/utils'
import { calcCashout } from '../lib/calculations'
import { ACHIEVEMENTS as ACHIEVEMENT_CATALOG, computeUnlockedAchievements } from '../lib/achievements'
import {
  isFirebaseReady, getFirebaseAuth, firestoreSaveDoc, firestoreDeleteDoc,
  firestoreLoadCollection, firestoreLookupFriendCode, firestoreLoadPublicProfile,
  firestoreLoadPublicProfiles, firestoreSavePublicProfile,
} from '../lib/firebase'

const generateDefaultAchievements = (): Achievement[] => {
  return ACHIEVEMENT_CATALOG.map(a => ({
    id: a.id,
    name: a.name_pt,
    description: a.desc_pt,
    unlocked: false,
    progress: 0,
    maxProgress: 100,
    category: a.category,
  }))
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = generateDefaultAchievements()

// ─── State Shape ──────────────────────────────────────────────────────────────

interface AppState {
  // Auth
  user: AppUser | null
  authMode: 'firebase' | 'local'
  authReady: boolean

  // Data
  accounts: CSAccount[]
  drops: Drop[]
  goals: Goal[]
  settings: AppSettings
  collection: CollectionItem[]
  cases: CaseOpeningLog[]
  friends: Friend[]
  friendRequests: FriendRequest[]
  achievements: Achievement[]
  gamification: GamificationState
  rankings: LeaderboardEntry[]

  // UI
  currentPage: Page
  modalType: ModalType
  modalData: unknown
  sidebarOpen: boolean
  isLoading: boolean

  // Actions – Auth
  setUser: (user: AppUser | null) => void
  setAuthMode: (mode: 'firebase' | 'local') => void
  setAuthReady: (ready: boolean) => void

  // Actions – Accounts
  addAccount: (data: Omit<CSAccount, 'id' | 'createdAt' | 'color'>) => CSAccount
  updateAccount: (id: string, updates: Partial<CSAccount>) => void
  deleteAccount: (id: string) => void
  toggleAccountActive: (id: string) => void

  // Actions – Drops
  addDrop: (data: Omit<Drop, 'id' | 'createdAt'>) => Drop
  updateDrop: (id: string, updates: Partial<Drop>) => void
  deleteDrop: (id: string) => void
  markDropSold: (id: string, cashoutValue: number) => void

  // Actions – Goals
  addGoal: (data: Omit<Goal, 'id' | 'createdAt'>) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void

  // Actions – Settings
  updateSettings: (updates: Partial<AppSettings>) => void
  updateTheme: (updates: Partial<AppSettings['theme']>) => void
  updateProfile: (updates: Partial<ProfileOverride>) => void

  // Actions – Case Opening Tracker
  addCaseOpening: (data: Omit<CaseOpeningLog, 'id' | 'createdAt'>) => void
  deleteCaseOpening: (id: string) => void
  sellObtainedItem: (id: string, soldValue: number) => void

  // Actions – Friends and Social (Online only)
  addFriend: (friendCode: string) => Promise<boolean>
  removeFriend: (friendId: string) => void
  sendFriendRequest: (friendCode: string) => Promise<boolean>
  acceptFriendRequest: (requestId: string) => void
  declineFriendRequest: (requestId: string) => void
  fetchRankings: () => Promise<void>
  setProfilePrivacy: (privacy: 'public' | 'private' | 'friends') => void
  changeUserName: (newName: string) => void

  // Actions – Gamification & Achievements
  addXP: (amount: number) => void
  setActiveTitle: (title: string) => void
  unlockTitle: (title: string) => void
  checkAchievements: () => void

  // Actions – Privacy / Selective clear
  clearDrops: () => void
  clearAccounts: () => void
  clearGoals: () => void
  resetSettingsToDefault: () => void

  // Actions – UI
  setCurrentPage: (page: Page) => void
  openModal: (type: ModalType, data?: unknown) => void
  closeModal: () => void
  setSidebarOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void

  // Data hydration
  hydrate: () => void
  hydrateCloud: (user: AppUser) => Promise<void>
  reset: () => void
}

// ─── Firestore Sync Helper ────────────────────────────────────────────────────

let syncErrorToastShown = false

function syncToFirestore(
  user: AppUser | null,
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  enabled = true,
) {
  if (!enabled) return
  // Only write when Firebase Auth has a confirmed current user.
  // Session restore sets user before onAuthStateChanged fires — token may not be valid yet.
  if (user?.provider === 'google' && isFirebaseReady() && getFirebaseAuth()?.currentUser) {
    firestoreSaveDoc(user.uid, collection, docId, data)
      .then(() => { syncErrorToastShown = false })
      .catch(e => {
        logger.error(`[Sync] ${collection}/${docId}:`, e)
        if (!syncErrorToastShown) {
          syncErrorToastShown = true
          const code = (e as { code?: string })?.code
          const msg =
            code === 'permission-denied'
              ? 'Sem permissão no Firestore. Configure as regras em Console Firebase → Firestore → Rules.'
              : code === 'unauthenticated'
                ? 'Sessão expirada. Saia e entre novamente com o Google.'
                : code === 'unavailable'
                  ? 'Firestore indisponível. Verifique sua conexão com a internet.'
                  : `Falha ao salvar na nuvem${code ? ` (${code})` : ''}. Tente novamente.`
          toast.error(msg, { duration: 8000 })
        }
      })
  }
}

function deleteFromFirestore(user: AppUser | null, collection: string, docId: string, enabled = true) {
  if (!enabled) return
  if (user?.provider === 'google' && isFirebaseReady() && getFirebaseAuth()?.currentUser) {
    firestoreDeleteDoc(user.uid, collection, docId).catch(logger.error)
  }
}

type LocalSnapshot = {
  accounts: CSAccount[]
  drops: Drop[]
  goals: Goal[]
  settings: AppSettings
  collection: CollectionItem[]
  cases: CaseOpeningLog[]
  friends: Friend[]
  friendRequests: FriendRequest[]
  achievements: Achievement[]
  gamification: GamificationState
}

function loadLocalSnapshot(): LocalSnapshot {
  return {
    accounts: storage.loadAccounts(),
    drops: storage.loadDrops(),
    goals: storage.loadGoals(),
    settings: storage.loadSettings(),
    collection: storage.loadCollection(),
    cases: storage.loadCases(),
    friends: storage.loadFriends(),
    friendRequests: storage.loadFriendRequests(),
    achievements: storage.loadAchievements().length ? storage.loadAchievements() : DEFAULT_ACHIEVEMENTS,
    gamification: storage.loadGamificationState(),
  }
}

async function syncLocalSnapshotToFirestore(user: AppUser, snapshot: LocalSnapshot) {
  if (user.provider !== 'google' || !isFirebaseReady()) return
  await Promise.all([
    ...snapshot.accounts.map(account =>
      firestoreSaveDoc(user.uid, 'accounts', account.id, account as unknown as Record<string, unknown>),
    ),
    ...snapshot.drops.map(drop =>
      firestoreSaveDoc(user.uid, 'drops', drop.id, drop as unknown as Record<string, unknown>),
    ),
    ...snapshot.goals.map(goal =>
      firestoreSaveDoc(user.uid, 'goals', goal.id, goal as unknown as Record<string, unknown>),
    ),
    ...snapshot.collection.map(item =>
      firestoreSaveDoc(user.uid, 'collection', item.marketHashName, item as unknown as Record<string, unknown>),
    ),
    ...snapshot.cases.map(log =>
      firestoreSaveDoc(user.uid, 'cases', log.id, log as unknown as Record<string, unknown>),
    ),
    ...snapshot.friends.map(friend =>
      firestoreSaveDoc(user.uid, 'friends', friend.id, friend as unknown as Record<string, unknown>),
    ),
    ...snapshot.friendRequests.map(request =>
      firestoreSaveDoc(user.uid, 'friendRequests', request.id, request as unknown as Record<string, unknown>),
    ),
    firestoreSaveDoc(user.uid, 'settings', 'app', snapshot.settings as unknown as Record<string, unknown>),
    firestoreSaveDoc(user.uid, 'achievements', 'list', { list: snapshot.achievements }),
    firestoreSaveDoc(user.uid, 'gamification', 'state', snapshot.gamification as unknown as Record<string, unknown>),
  ])
}

const updateCollectionHelper = (collection: CollectionItem[], item: SteamItem, value: number): CollectionItem[] => {
  const existing = collection.find(c => c.marketHashName === item.marketHashName)
  const now = new Date().toISOString()
  if (existing) {
    return collection.map(c => c.marketHashName === item.marketHashName ? {
      ...c,
      count: c.count + 1,
      lastSeen: now,
      maxValueSeen: Math.max(c.maxValueSeen, value)
    } : c)
  } else {
    return [...collection, {
      marketHashName: item.marketHashName,
      name: item.name,
      imageUrl: item.imageUrl,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      maxValueSeen: value
    }]
  }
}

function rebuildCollectionFromHistory(drops: Drop[], cases: CaseOpeningLog[], fallback: CollectionItem[] = []): CollectionItem[] {
  const map = new Map<string, CollectionItem>()

  const add = (item: SteamItem | undefined, value: number | undefined, date: string | undefined) => {
    if (!item?.marketHashName) return
    const seenAt = date ?? new Date().toISOString()
    const existing = map.get(item.marketHashName)
    if (!existing) {
      map.set(item.marketHashName, {
        marketHashName: item.marketHashName,
        name: item.name,
        imageUrl: item.imageUrl,
        count: 1,
        firstSeen: seenAt,
        lastSeen: seenAt,
        maxValueSeen: value ?? 0,
      })
      return
    }
    map.set(item.marketHashName, {
      ...existing,
      name: existing.name || item.name,
      imageUrl: existing.imageUrl || item.imageUrl,
      count: existing.count + 1,
      firstSeen: seenAt < existing.firstSeen ? seenAt : existing.firstSeen,
      lastSeen: seenAt > existing.lastSeen ? seenAt : existing.lastSeen,
      maxValueSeen: Math.max(existing.maxValueSeen, value ?? 0),
    })
  }

  drops.forEach(drop => add(drop.item, drop.steamValue, drop.registeredAt ?? drop.createdAt))
  cases.forEach(log => {
    add(
      log.receivedItem ?? log.obtainedItem,
      log.receivedValueAtOpen ?? log.obtainedValue,
      log.openedAt ?? log.createdAt,
    )
  })

  if (map.size === 0 && fallback.length > 0) return fallback
  return [...map.values()].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
}

function generateFriendCode(user: AppUser): string {
  let hash = 0
  for (const char of user.uid) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return `LF-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`
}

function buildPublicProfile(state: AppState): PublicProfileSummary | null {
  const { user, authMode, settings, gamification, drops, cases, collection } = state
  if (authMode !== 'firebase' || user?.provider !== 'google') return null
  const privacy = settings.privacy ?? {}
  const friendCode = (settings.friendCode || generateFriendCode(user)).toUpperCase()
  const showProfile = settings.profilePrivacy === 'public' && !privacy.hideProfile
  const allowRankings = settings.gamification?.showRankings === true && !settings.liteMode
  const name = settings.profile?.displayName || user.displayName || friendCode
  const totalProfit = drops.reduce((sum, drop) => {
    const cashout = drop.cashoutValue ?? calcCashout(drop.steamValue, settings.cashoutRate)
    return sum + cashout
  }, 0)

  return {
    uid: user.uid,
    friendCode,
    name: showProfile || allowRankings ? name : undefined,
    avatarUrl: showProfile || allowRankings ? (settings.profile?.customPhotoURL || user.photoURL || undefined) : undefined,
    activeTitle: allowRankings || (showProfile && settings.gamification?.showTitles !== false) ? gamification.activeTitle : undefined,
    level: allowRankings || showProfile ? gamification.level : undefined,
    xp: allowRankings || showProfile ? gamification.totalXP : undefined,
    totalDrops: allowRankings || (showProfile && !privacy.hideStatistics) ? drops.length : undefined,
    totalCases: showProfile && settings.gamification?.showCaseTracker !== false ? cases.length : undefined,
    collectionCount: showProfile && !privacy.hideCollection ? collection.length : undefined,
    perfectWeeks: showProfile && settings.gamification?.showPerfectWeek !== false ? gamification.totalPerfectWeeks : undefined,
    showProfile,
    allowRankings,
    showStatistics: showProfile && !privacy.hideStatistics,
    showCollection: showProfile && !privacy.hideCollection,
    showProfit: showProfile && !privacy.hideTotalProfit,
    totalProfit: showProfile && !privacy.hideTotalProfit ? totalProfit : undefined,
    updatedAt: new Date().toISOString(),
  }
}

function publishPublicProfileSnapshot(state: AppState): void {
  const profile = buildPublicProfile(state)
  if (!profile || state.settings.firebaseSyncEnabled === false || !isFirebaseReady()) return
  firestoreSavePublicProfile(profile).catch(e => logger.error('[Social] publish public profile:', e))
}

function getWeekXpReward(completionPercent: number): number {
  if (completionPercent >= 100) return 100
  if (completionPercent >= 90) return 80
  if (completionPercent >= 80) return 60
  if (completionPercent >= 70) return 40
  if (completionPercent > 0) return 20
  return 0
}

function deriveUnlockedTitles(state: Pick<AppState, 'accounts' | 'drops' | 'cases' | 'collection'>): string[] {
  const titles = new Set<string>(['One Account One Dream'])
  const caseDrops = state.drops.filter(d => /case|caixa|package/i.test(d.item?.name ?? '')).length
  const profitableCase = state.cases.some(c => (c.profitLoss ?? ((c.receivedValueAtOpen ?? c.obtainedValue) - (c.casePriceAtOpen ?? 0) - (c.keyPriceAtOpen ?? c.keyPrice))) > 0)
  const sundayDrop = state.drops.some(d => {
    const raw = d.createdAt ?? d.registeredAt
    return raw ? new Date(raw).getDay() === 0 : false
  })

  if (state.drops.length >= 100) titles.add('Valve Employee')
  if (state.cases.length >= 5 || caseDrops >= 5) titles.add('Case Farmer')
  if (profitableCase || state.drops.some(d => (d.cashoutValue ?? d.steamValue) >= 100)) titles.add('Lucky Bastard')
  if (state.collection.length >= 10) titles.add('Collector')
  if (sundayDrop) titles.add('Sunday Night Gang')
  if (state.drops.length >= 50) titles.add('Drop Addict')

  return [...titles]
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    authMode: 'local',
    authReady: true,
    accounts: [],
    drops: [],
    goals: [],
    settings: storage.loadSettings(),
    collection: storage.loadCollection(),
    cases: storage.loadCases(),
    friends: storage.loadFriends(),
    friendRequests: storage.loadFriendRequests(),
    achievements: storage.loadAchievements().length ? storage.loadAchievements() : DEFAULT_ACHIEVEMENTS,
    gamification: storage.loadGamificationState(),
    rankings: [],
    currentPage: 'dashboard',
    modalType: null,
    modalData: null,
    sidebarOpen: false,
    isLoading: false,

    // ── Auth ────────────────────────────────────────────────────────────────

    setUser: (user) => {
      if (user) syncErrorToastShown = false
      set({ user })
    },
    setAuthMode: (authMode) => set({ authMode }),
    setAuthReady: (authReady) => set({ authReady }),

    // ── Accounts ────────────────────────────────────────────────────────────

    addAccount: (data) => {
      const { accounts, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const account: CSAccount = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        color: getAccountColor(accounts.length),
      }
      const updated = [...accounts, account]
      set({ accounts: updated })
      storage.saveAccounts(updated)
      syncToFirestore(user, 'accounts', account.id, account as unknown as Record<string, unknown>, sync)
      return account
    },

    updateAccount: (id, updates) => {
      const { accounts, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = accounts.map(a => a.id === id ? { ...a, ...updates } : a)
      set({ accounts: updated })
      storage.saveAccounts(updated)
      const acct = updated.find(a => a.id === id)
      if (acct) syncToFirestore(user, 'accounts', id, acct as unknown as Record<string, unknown>, sync)
    },

    deleteAccount: (id) => {
      const { accounts, drops, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updatedAccounts = accounts.filter(a => a.id !== id)
      const updatedDrops = drops.filter(d => d.accountId !== id)
      const removedDrops = drops.filter(d => d.accountId === id)
      set({ accounts: updatedAccounts, drops: updatedDrops })
      storage.saveAccounts(updatedAccounts)
      storage.saveDrops(updatedDrops)
      deleteFromFirestore(user, 'accounts', id, sync)
      removedDrops.forEach(d => deleteFromFirestore(user, 'drops', d.id, sync))
    },

    toggleAccountActive: (id) => {
      const { accounts } = get()
      const account = accounts.find(a => a.id === id)
      if (account) get().updateAccount(id, { active: !account.active })
    },

    // ── Drops ────────────────────────────────────────────────────────────────

    addDrop: (data) => {
      const { drops, user, settings, collection, gamification } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const drop: Drop = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }
      const updated = [...drops, drop]

      // Update Collection
      const updatedCollection = updateCollectionHelper(collection, drop.item, drop.steamValue)

      // Perfect Week Stats check
      const activeAccounts = get().accounts.filter(a => a.active)
      let perfectWeekState = { ...gamification }
      let xpReward = 0
      if (activeAccounts.length > 0) {
        const accountDropCounts = new Map<string, number>()
        updated.filter(d => d.weekId === drop.weekId).forEach(d => {
          accountDropCounts.set(d.accountId, (accountDropCounts.get(d.accountId) ?? 0) + 1)
        })
        const allCompleted = activeAccounts.every(a => (accountDropCounts.get(a.id) ?? 0) >= 2)
        if (drop.weekId !== 'unknown' && allCompleted) {
          const completedWeeks = gamification.completedPerfectWeeks ?? []
          if (!completedWeeks.includes(drop.weekId)) {
            const newWeeks = [...completedWeeks, drop.weekId]
            const totalPerfect = gamification.totalPerfectWeeks + 1
            const currentStreak = gamification.currentPerfectWeekStreak + 1
            const bestStreak = Math.max(gamification.bestPerfectWeekStreak, currentStreak)
            perfectWeekState = {
              ...gamification,
              totalPerfectWeeks: totalPerfect,
              currentPerfectWeekStreak: currentStreak,
              bestPerfectWeekStreak: bestStreak,
              completedPerfectWeeks: newWeeks
            }
          }
        }

        if (drop.weekId !== 'unknown') {
          const targetDrops = activeAccounts.length * 2
          const weekDrops = updated.filter(d => d.weekId === drop.weekId).length
          const completionPercent = targetDrops > 0 ? Math.min(100, (weekDrops / targetDrops) * 100) : 0
          const rewardForWeek = getWeekXpReward(completionPercent)
          const previousReward = perfectWeekState.xpAwardedWeeks?.[drop.weekId] ?? 0
          if (rewardForWeek > previousReward) {
            xpReward = rewardForWeek - previousReward
            perfectWeekState = {
              ...perfectWeekState,
              xpAwardedWeeks: {
                ...(perfectWeekState.xpAwardedWeeks ?? {}),
                [drop.weekId]: rewardForWeek,
              },
            }
          }
        }
      }

      set({
        drops: updated,
        collection: updatedCollection,
        gamification: perfectWeekState
      })
      storage.saveDrops(updated)
      storage.saveCollection(updatedCollection)
      storage.saveGamificationState(perfectWeekState)

      syncToFirestore(user, 'drops', drop.id, drop as unknown as Record<string, unknown>, sync)
      syncToFirestore(user, 'collection', drop.item.marketHashName, updatedCollection.find(c => c.marketHashName === drop.item.marketHashName) as any, sync)
      syncToFirestore(user, 'gamification', 'state', perfectWeekState as any, sync)

      if (xpReward > 0) get().addXP(xpReward)
      get().checkAchievements()
      publishPublicProfileSnapshot(get())

      return drop
    },

    updateDrop: (id, updates) => {
      const { drops, cases, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = drops.map(d => d.id === id ? { ...d, ...updates } : d)
      const collection = rebuildCollectionFromHistory(updated, cases, get().collection)
      set({ drops: updated, collection })
      storage.saveDrops(updated)
      storage.saveCollection(collection)
      const drop = updated.find(d => d.id === id)
      if (drop) syncToFirestore(user, 'drops', id, drop as unknown as Record<string, unknown>, sync)
      collection.forEach(item => syncToFirestore(user, 'collection', item.marketHashName, item as unknown as Record<string, unknown>, sync))
      publishPublicProfileSnapshot(get())
    },

    deleteDrop: (id) => {
      const { drops, cases, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = drops.filter(d => d.id !== id)
      const collection = rebuildCollectionFromHistory(updated, cases, get().collection)
      set({ drops: updated, collection })
      storage.saveDrops(updated)
      storage.saveCollection(collection)
      deleteFromFirestore(user, 'drops', id, sync)
      publishPublicProfileSnapshot(get())
    },

    markDropSold: (id, cashoutValue) => {
      get().updateDrop(id, {
        sold: true,
        cashoutValue,
        soldAt: new Date().toISOString(),
      })
    },

    // ── Goals ────────────────────────────────────────────────────────────────

    addGoal: (data) => {
      const { goals, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const goal: Goal = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }
      const updated = [...goals, goal]
      set({ goals: updated })
      storage.saveGoals(updated)
      syncToFirestore(user, 'goals', goal.id, goal as unknown as Record<string, unknown>, sync)
    },

    updateGoal: (id, updates) => {
      const { goals, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = goals.map(g => g.id === id ? { ...g, ...updates } : g)
      set({ goals: updated })
      storage.saveGoals(updated)
      const goal = updated.find(g => g.id === id)
      if (goal) syncToFirestore(user, 'goals', id, goal as unknown as Record<string, unknown>, sync)
    },

    deleteGoal: (id) => {
      const { goals, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = goals.filter(g => g.id !== id)
      set({ goals: updated })
      storage.saveGoals(updated)
      deleteFromFirestore(user, 'goals', id, sync)
    },

    // ── Settings ─────────────────────────────────────────────────────────────

    updateSettings: (updates) => {
      const { settings: current, user } = get()
      const updated = { ...current, ...updates }
      const sync = updated.firebaseSyncEnabled !== false
      set({ settings: updated })
      storage.saveSettings(updated)
      syncToFirestore(user, 'settings', 'app', updated as unknown as Record<string, unknown>, sync)
      publishPublicProfileSnapshot(get())
    },

    updateTheme: (updates) => {
      const { settings: current, user } = get()
      const updated = { ...current, theme: { ...current.theme, ...updates } }
      const sync = updated.firebaseSyncEnabled !== false
      set({ settings: updated })
      storage.saveSettings(updated)
      syncToFirestore(user, 'settings', 'app', updated as unknown as Record<string, unknown>, sync)
      publishPublicProfileSnapshot(get())
    },

    updateProfile: (updates) => {
      const { settings: current, user } = get()
      const updated = { ...current, profile: { ...(current.profile ?? {}), ...updates } }
      const sync = updated.firebaseSyncEnabled !== false
      set({ settings: updated })
      storage.saveSettings(updated)
      syncToFirestore(user, 'settings', 'app', updated as unknown as Record<string, unknown>, sync)
      publishPublicProfileSnapshot(get())
    },

    clearDrops: () => {
      const { user, settings, drops: current } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const collection = rebuildCollectionFromHistory([], get().cases, get().collection)
      set({ drops: [], collection })
      storage.saveDrops([])
      storage.saveCollection(collection)
      current.forEach(d => deleteFromFirestore(user, 'drops', d.id, sync))
      publishPublicProfileSnapshot(get())
    },

    clearAccounts: () => {
      const { user, settings, accounts: current, drops } = get()
      const sync = settings.firebaseSyncEnabled !== false
      // LGPD: cascade-delete all drops belonging to the cleared accounts
      const accountIds = new Set(current.map(a => a.id))
      const survivingDrops = drops.filter(d => !accountIds.has(d.accountId))
      const orphanedDrops = drops.filter(d => accountIds.has(d.accountId))
      const collection = rebuildCollectionFromHistory(survivingDrops, get().cases, get().collection)
      set({ accounts: [], drops: survivingDrops, collection })
      storage.saveAccounts([])
      storage.saveDrops(survivingDrops)
      storage.saveCollection(collection)
      current.forEach(a => deleteFromFirestore(user, 'accounts', a.id, sync))
      orphanedDrops.forEach(d => deleteFromFirestore(user, 'drops', d.id, sync))
      publishPublicProfileSnapshot(get())
    },

    clearGoals: () => {
      const { user, settings, goals: current } = get()
      const sync = settings.firebaseSyncEnabled !== false
      set({ goals: [] })
      storage.saveGoals([])
      current.forEach(g => deleteFromFirestore(user, 'goals', g.id, sync))
    },

    resetSettingsToDefault: () => {
      const { user, settings: current } = get()
      const sync = current.firebaseSyncEnabled !== false
      const defaultSettings = { ...DEFAULT_SETTINGS }
      set({ settings: defaultSettings })
      storage.saveSettings(defaultSettings)
      syncToFirestore(user, 'settings', 'app', defaultSettings as unknown as Record<string, unknown>, sync)
    },

    // ── Case Opening Tracker ──────────────────────────────────────────────────

    addCaseOpening: (data) => {
      const { cases, user, settings, collection } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const openedAt = data.openedAt ?? new Date().toISOString()
      const casePriceAtOpen = data.casePriceAtOpen ?? 0
      const keyPriceAtOpen = data.keyPriceAtOpen ?? data.keyPrice ?? 0
      const receivedItem = data.receivedItem ?? data.obtainedItem
      const receivedValueAtOpen = data.receivedValueAtOpen ?? data.obtainedValue ?? 0
      const log: CaseOpeningLog = {
        ...data,
        id: generateId(),
        casePriceAtOpen,
        keyPriceAtOpen,
        keyPrice: keyPriceAtOpen,
        receivedItem,
        obtainedItem: receivedItem,
        receivedValueAtOpen,
        obtainedValue: receivedValueAtOpen,
        openedAt,
        profitLoss: data.profitLoss ?? (receivedValueAtOpen - casePriceAtOpen - keyPriceAtOpen),
        createdAt: openedAt,
      }
      const updatedCases = [...cases, log]
      const updatedCollection = updateCollectionHelper(collection, receivedItem, receivedValueAtOpen)

      set({ cases: updatedCases, collection: updatedCollection })
      storage.saveCases(updatedCases)
      storage.saveCollection(updatedCollection)
      syncToFirestore(user, 'cases', log.id, log as any, sync)
      syncToFirestore(user, 'collection', receivedItem.marketHashName, updatedCollection.find(c => c.marketHashName === receivedItem.marketHashName) as any, sync)

      get().addXP(10)
      get().checkAchievements()
      publishPublicProfileSnapshot(get())
    },

    deleteCaseOpening: (id) => {
      const { cases, drops, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = cases.filter(c => c.id !== id)
      const collection = rebuildCollectionFromHistory(drops, updated, get().collection)
      set({ cases: updated, collection })
      storage.saveCases(updated)
      storage.saveCollection(collection)
      deleteFromFirestore(user, 'cases', id, sync)
      publishPublicProfileSnapshot(get())
    },

    sellObtainedItem: (id, soldValue) => {
      const { cases, user, settings } = get()
      const sync = settings.firebaseSyncEnabled !== false
      const updated = cases.map(c => c.id === id ? { ...c, sold: true, soldValue } : c)
      set({ cases: updated })
      storage.saveCases(updated)
      const log = updated.find(c => c.id === id)
      if (log) syncToFirestore(user, 'cases', id, log as any, sync)
    },

    // ── Friends and Social ────────────────────────────────────────────────────

    addFriend: async (friendCode) => {
      const { user, authMode, friends, settings } = get()
      if (authMode !== 'firebase' || user?.provider !== 'google') {
        toast.error('Recurso online disponível apenas com login do Google.')
        return false
      }
      if (!isFirebaseReady()) {
        toast.error('Firebase indisponível no momento.')
        return false
      }

      const code = friendCode.trim().toUpperCase()
      const ownCode = (settings.friendCode || generateFriendCode(user)).toUpperCase()
      if (!settings.friendCode) get().updateSettings({ friendCode: ownCode })
      publishPublicProfileSnapshot(get())

      if (code === ownCode) {
        toast.error('Esse é o seu próprio código.')
        return false
      }

      try {
        const match = await firestoreLookupFriendCode(code)
        if (!match) {
          toast.error('Código de amigo não encontrado.')
          return false
        }
        if (match.uid === user.uid) {
          toast.error('Esse é o seu próprio código.')
          return false
        }
        if (friends.some(f => f.id === match.uid)) {
          toast.error('Vocês já são amigos!')
          return false
        }

        const profile = await firestoreLoadPublicProfile(match.uid).catch(() => null)
        const friend: Friend = {
          id: match.uid,
          name: profile?.name || match.friendCode,
          avatarUrl: profile?.avatarUrl,
          activeTitle: profile?.activeTitle,
          level: profile?.level ?? 1,
          xp: profile?.xp ?? 0,
          friendCode: match.friendCode,
        }
        const updated = [...friends, friend]
        set({ friends: updated })
        storage.saveFriends(updated)
        syncToFirestore(user, 'friends', friend.id, friend as unknown as Record<string, unknown>, settings.firebaseSyncEnabled !== false)
        toast.success(`${friend.name} adicionado como amigo!`)
        get().addXP(20)
        get().checkAchievements()
        return true
      } catch (e) {
        logger.error('[Social] addFriend:', e)
        toast.error('Não consegui adicionar esse amigo agora.')
        return false
      }
    },

    removeFriend: (friendId) => {
      const { friends, user, settings } = get()
      const updated = friends.filter(f => f.id !== friendId)
      set({ friends: updated })
      storage.saveFriends(updated)
      deleteFromFirestore(user, 'friends', friendId, settings.firebaseSyncEnabled !== false)
      toast.success('Amigo removido.')
    },

    sendFriendRequest: async (friendCode) => {
      const { user, authMode, friendRequests, settings } = get()
      if (authMode !== 'firebase' || user?.provider !== 'google') {
        toast.error('Recurso online disponível apenas com login do Google.')
        return false
      }
      if (friendRequests.some(r => r.senderFriendCode.toLowerCase() === friendCode.toLowerCase())) {
        toast.error('Solicitação já enviada ou recebida.')
        return false
      }
      try {
        const match = await firestoreLookupFriendCode(friendCode.trim().toUpperCase())
        if (!match || match.uid === user.uid) {
          toast.error('Código de amigo não encontrado.')
          return false
        }
        const profile = await firestoreLoadPublicProfile(match.uid).catch(() => null)
        const outgoingRequest: FriendRequest = {
          id: generateId(),
          senderId: user.uid,
          senderName: settings.profile?.displayName || user.displayName || 'Usuário',
          senderFriendCode: match.friendCode,
          type: 'outgoing',
          createdAt: new Date().toISOString()
        }
        const updated = [...friendRequests, outgoingRequest]
        set({ friendRequests: updated })
        storage.saveFriendRequests(updated)
        syncToFirestore(user, 'friendRequests', outgoingRequest.id, outgoingRequest as unknown as Record<string, unknown>, settings.firebaseSyncEnabled !== false)
        toast.success(`Solicitação registrada para ${profile?.name || match.friendCode}.`)
        return true
      } catch (e) {
        logger.error('[Social] sendFriendRequest:', e)
        toast.error('Não consegui enviar a solicitação agora.')
        return false
      }
    },

    acceptFriendRequest: (requestId) => {
      const { friendRequests, friends, user, settings } = get()
      const request = friendRequests.find(r => r.id === requestId)
      if (!request) return
      const newFriend: Friend = {
        id: request.senderId,
        name: request.senderName,
        avatarUrl: request.senderAvatar,
        level: 1,
        xp: 0,
        friendCode: request.senderFriendCode
      }
      const updatedFriends = [...friends, newFriend]
      const updatedRequests = friendRequests.filter(r => r.id !== requestId)
      set({ friends: updatedFriends, friendRequests: updatedRequests })
      storage.saveFriends(updatedFriends)
      storage.saveFriendRequests(updatedRequests)
      syncToFirestore(user, 'friends', newFriend.id, newFriend as unknown as Record<string, unknown>, settings.firebaseSyncEnabled !== false)
      deleteFromFirestore(user, 'friendRequests', requestId, settings.firebaseSyncEnabled !== false)
      toast.success(`Agora você é amigo de ${request.senderName}!`)
      get().addXP(20)
      get().checkAchievements()
    },

    declineFriendRequest: (requestId) => {
      const { friendRequests, user, settings } = get()
      const updatedRequests = friendRequests.filter(r => r.id !== requestId)
      set({ friendRequests: updatedRequests })
      storage.saveFriendRequests(updatedRequests)
      deleteFromFirestore(user, 'friendRequests', requestId, settings.firebaseSyncEnabled !== false)
      toast.success('Solicitação recusada.')
    },

    fetchRankings: async () => {
      const { user, authMode, gamification, drops, settings, friends } = get()
      if (authMode !== 'firebase' || user?.provider !== 'google' || settings.gamification?.showRankings !== true || settings.liteMode) {
        set({ rankings: [] })
        return
      }
      publishPublicProfileSnapshot(get())
      const ownProfile = buildPublicProfile(get())
      const friendProfiles = await firestoreLoadPublicProfiles(friends.map(friend => friend.id)).catch(e => {
        logger.error('[Social] fetchRankings:', e)
        return []
      })
      const entries: LeaderboardEntry[] = []
      if (ownProfile?.allowRankings) {
        entries.push({
          id: user.uid,
          name: ownProfile.name || settings.profile?.displayName || user.displayName || 'Você',
          avatarUrl: ownProfile.avatarUrl,
          activeTitle: ownProfile.activeTitle ?? gamification.activeTitle,
          level: ownProfile.level ?? gamification.level,
          xp: ownProfile.xp ?? gamification.totalXP,
          totalDrops: ownProfile.totalDrops ?? drops.length,
        })
      }
      friendProfiles
        .filter(profile => profile.allowRankings)
        .forEach(profile => entries.push({
          id: profile.uid,
          name: profile.name || profile.friendCode,
          avatarUrl: profile.avatarUrl,
          activeTitle: profile.activeTitle,
          level: profile.level ?? 1,
          xp: profile.xp ?? 0,
          totalDrops: profile.totalDrops ?? 0,
        }))
      set({ rankings: entries.sort((a, b) => b.xp - a.xp) })
    },

    setProfilePrivacy: (privacy) => {
      get().updateSettings({ profilePrivacy: privacy })
    },

    changeUserName: (newName) => {
      get().updateProfile({ displayName: newName })
    },

    // ── Gamification and Achievements ─────────────────────────────────────────

    addXP: (amount) => {
      if (get().settings.liteMode) return
      const { gamification, user, settings } = get()
      const previousLevel = gamification.level
      const totalXP = gamification.totalXP + amount
      const level = Math.floor(totalXP / 500) + 1
      const levelProgress = totalXP % 500
      const derivedTitles = deriveUnlockedTitles(get())
      const unlockedTitles = [...new Set([...gamification.unlockedTitles, ...derivedTitles])]
      const activeTitle = gamification.activeTitle && unlockedTitles.includes(gamification.activeTitle)
        ? gamification.activeTitle
        : unlockedTitles[0]
      const updated = {
        ...gamification,
        totalXP,
        level,
        levelProgress,
        unlockedTitles,
        activeTitle
      }
      set({ gamification: updated })
      storage.saveGamificationState(updated)
      syncToFirestore(user, 'gamification', 'state', updated as any, settings.firebaseSyncEnabled !== false)
      publishPublicProfileSnapshot(get())
      if (level > previousLevel) {
        toast.success(settings.language === 'en' ? `Level ${level} reached!` : `Nível ${level} alcançado!`)
        get().checkAchievements()
      }
    },

    setActiveTitle: (title) => {
      const { gamification, user, settings } = get()
      const updated = { ...gamification, activeTitle: title }
      set({ gamification: updated })
      storage.saveGamificationState(updated)
      syncToFirestore(user, 'gamification', 'state', updated as any, settings.firebaseSyncEnabled !== false)
      publishPublicProfileSnapshot(get())
    },

    unlockTitle: (title) => {
      const { gamification, user, settings } = get()
      if (gamification.unlockedTitles.includes(title)) return
      const updated = { ...gamification, unlockedTitles: [...gamification.unlockedTitles, title] }
      set({ gamification: updated })
      storage.saveGamificationState(updated)
      syncToFirestore(user, 'gamification', 'state', updated as any, settings.firebaseSyncEnabled !== false)
      publishPublicProfileSnapshot(get())
    },

    checkAchievements: () => {
      const { achievements, accounts, drops, goals, user, settings } = get()
      const computed = computeUnlockedAchievements(accounts, drops, goals, settings)
      const progressById = new Map(computed.map(a => [a.achievement.id, a]))
      let unlockedAny = false

      const updatedAchievements = ACHIEVEMENT_CATALOG.map(catalogItem => {
        const existing = achievements.find(a => a.id === catalogItem.id)
        const computedItem = progressById.get(catalogItem.id)
        const progress = computedItem?.progress ?? existing?.progress ?? 0
        const unlocked = progress >= 100
        if (unlocked && existing && !existing.unlocked) unlockedAny = true
        return {
          id: catalogItem.id,
          name: catalogItem.name_pt,
          description: catalogItem.desc_pt,
          category: catalogItem.category,
          maxProgress: 100,
          progress,
          unlocked,
          unlockedAt: unlocked ? (existing?.unlockedAt ?? computedItem?.unlockedAt ?? new Date().toISOString()) : existing?.unlockedAt,
        }
      })

      set({ achievements: updatedAchievements })
      storage.saveAchievements(updatedAchievements)
      syncToFirestore(user, 'achievements', 'list', { list: updatedAchievements } as any, settings.firebaseSyncEnabled !== false)

      if (unlockedAny) {
        toast.success(settings.language === 'en' ? 'New achievement unlocked!' : 'Nova conquista desbloqueada!')
      }
    },

    // ── UI ───────────────────────────────────────────────────────────────────

    setCurrentPage: (page) => set({ currentPage: page, sidebarOpen: false }),
    openModal: (type, data = null) => set({ modalType: type, modalData: data }),
    closeModal: () => set({ modalType: null, modalData: null }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setLoading: (loading) => set({ isLoading: loading }),

    // ── Hydration ────────────────────────────────────────────────────────────

    hydrate: () => {
      const snapshot = loadLocalSnapshot()
      const collection = rebuildCollectionFromHistory(snapshot.drops, snapshot.cases, snapshot.collection)
      set({ ...snapshot, collection })
      storage.saveCollection(collection)
    },

    hydrateCloud: async (user) => {
      if (user.provider !== 'google' || !isFirebaseReady()) {
        get().hydrate()
        return
      }

      const localSnapshot = loadLocalSnapshot()
      const localCollection = rebuildCollectionFromHistory(localSnapshot.drops, localSnapshot.cases, localSnapshot.collection)
      const currentOwnerHasData = storage.hasCurrentOwnerData()
      set({ ...localSnapshot, collection: localCollection, rankings: [] })

      let cloudAccounts: CSAccount[]
      let cloudDrops: Drop[]
      let cloudGoals: Goal[]
      let cloudSettings: Array<AppSettings & { id?: string }>
      let cloudCollection: CollectionItem[]
      let cloudCases: CaseOpeningLog[]
      let cloudFriends: Friend[]
      let cloudFriendRequests: FriendRequest[]
      let cloudAchievements: Array<{ id?: string; list?: Achievement[] }>
      let cloudGamification: Array<GamificationState & { id?: string }>

      try {
        ;[
          cloudAccounts,
          cloudDrops,
          cloudGoals,
          cloudSettings,
          cloudCollection,
          cloudCases,
          cloudFriends,
          cloudFriendRequests,
          cloudAchievements,
          cloudGamification,
        ] = await Promise.all([
          firestoreLoadCollection<CSAccount>(user.uid, 'accounts'),
          firestoreLoadCollection<Drop>(user.uid, 'drops'),
          firestoreLoadCollection<Goal>(user.uid, 'goals'),
          firestoreLoadCollection<AppSettings & { id?: string }>(user.uid, 'settings'),
          firestoreLoadCollection<CollectionItem>(user.uid, 'collection'),
          firestoreLoadCollection<CaseOpeningLog>(user.uid, 'cases'),
          firestoreLoadCollection<Friend>(user.uid, 'friends'),
          firestoreLoadCollection<FriendRequest>(user.uid, 'friendRequests'),
          firestoreLoadCollection<{ id?: string; list?: Achievement[] }>(user.uid, 'achievements'),
          firestoreLoadCollection<GamificationState & { id?: string }>(user.uid, 'gamification'),
        ])
      } catch (e) {
        logger.error('[Store] Firestore load failed:', e)
        set({ ...localSnapshot, collection: localCollection })
        throw e
      }

      const cloudIsEmpty =
        cloudAccounts.length === 0 &&
        cloudDrops.length === 0 &&
        cloudGoals.length === 0 &&
        cloudCollection.length === 0 &&
        cloudCases.length === 0

      if (cloudIsEmpty && currentOwnerHasData && (
        localSnapshot.accounts.length > 0 ||
        localSnapshot.drops.length > 0 ||
        localSnapshot.goals.length > 0 ||
        localSnapshot.cases.length > 0
      )) {
        const snapshot = { ...localSnapshot, collection: localCollection }
        set(snapshot)
        await syncLocalSnapshotToFirestore(user, snapshot).catch(e => {
          logger.error('[Store] Initial upload to Firestore failed:', e)
          throw e
        })
        publishPublicProfileSnapshot(get())
        return
      }

      const settings: AppSettings = cloudSettings[0]
        ? {
            ...localSnapshot.settings,
            ...cloudSettings[0],
            theme: { ...localSnapshot.settings.theme, ...(cloudSettings[0].theme ?? {}) },
            gamification: {
              ...DEFAULT_SETTINGS.gamification!,
              ...(localSnapshot.settings.gamification ?? {}),
              ...(cloudSettings[0].gamification ?? {}),
            },
            privacy: {
              ...DEFAULT_SETTINGS.privacy!,
              ...(localSnapshot.settings.privacy ?? {}),
              ...(cloudSettings[0].privacy ?? {}),
            },
            profile: { ...(localSnapshot.settings.profile ?? {}), ...(cloudSettings[0].profile ?? {}) },
          }
        : localSnapshot.settings
      delete (settings as { id?: string }).id
      if (!settings.friendCode) settings.friendCode = generateFriendCode(user)

      const achievementsDoc = cloudAchievements.find(doc => Array.isArray(doc.list))
      const achievements = achievementsDoc?.list?.length ? achievementsDoc.list : localSnapshot.achievements
      const gamification = cloudGamification[0]
        ? { ...localSnapshot.gamification, ...cloudGamification[0] }
        : localSnapshot.gamification
      delete (gamification as { id?: string }).id

      const collection = rebuildCollectionFromHistory(cloudDrops, cloudCases, cloudCollection)

      set({
        accounts: cloudAccounts,
        drops: cloudDrops,
        goals: cloudGoals,
        settings,
        collection,
        cases: cloudCases,
        friends: cloudFriends,
        friendRequests: cloudFriendRequests,
        achievements,
        gamification,
        rankings: [],
      })
      storage.saveAccounts(cloudAccounts)
      storage.saveDrops(cloudDrops)
      storage.saveGoals(cloudGoals)
      storage.saveSettings(settings)
      storage.saveCollection(collection)
      storage.saveCases(cloudCases)
      storage.saveFriends(cloudFriends)
      storage.saveFriendRequests(cloudFriendRequests)
      storage.saveAchievements(achievements)
      storage.saveGamificationState(gamification)
      await firestoreSaveDoc(user.uid, 'settings', 'app', settings as unknown as Record<string, unknown>)
        .catch(e => logger.error('[Store] Settings friend code sync failed:', e))
      await Promise.all(collection.map(item =>
        firestoreSaveDoc(user.uid, 'collection', item.marketHashName, item as unknown as Record<string, unknown>),
      )).catch(e => logger.error('[Store] Collection backfill sync failed:', e))
      publishPublicProfileSnapshot(get())
    },

    reset: () => {
      syncErrorToastShown = false
      storage.clearAll()
      try { localStorage.removeItem('lootflow_session') } catch {}
      set({
        accounts: [],
        drops: [],
        goals: [],
        settings: storage.loadSettings(),
        collection: [],
        cases: [],
        friends: [],
        friendRequests: [],
        achievements: DEFAULT_ACHIEVEMENTS,
        gamification: storage.loadGamificationState(),
        rankings: [],
        user: null,
        authMode: 'local',
        authReady: true,
        currentPage: 'dashboard',
      })
    },
  })),
)

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectAccounts = (s: AppState) => s.accounts
export const selectDrops = (s: AppState) => s.drops
export const selectGoals = (s: AppState) => s.goals
export const selectSettings = (s: AppState) => s.settings
export const selectUser = (s: AppState) => s.user
export const selectCurrentPage = (s: AppState) => s.currentPage
export const selectModal = (s: AppState) => ({ type: s.modalType, data: s.modalData })
