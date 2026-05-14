import { logger } from '../lib/logger'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { CSAccount, Drop, Goal, AppSettings, AppUser, Page, ModalType } from '../lib/types'
import { storage } from '../lib/storage'
import { generateId, getAccountColor } from '../lib/utils'
import {
  isFirebaseReady, firestoreSaveDoc, firestoreDeleteDoc,
  firestoreLoadCollection,
} from '../lib/firebase'

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

function syncToFirestore(
  user: AppUser | null,
  collection: string,
  docId: string,
  data: Record<string, unknown>,
) {
  if (user?.provider === 'google' && isFirebaseReady()) {
    firestoreSaveDoc(user.uid, collection, docId, data).catch(logger.error)
  }
}

function deleteFromFirestore(user: AppUser | null, collection: string, docId: string) {
  if (user?.provider === 'google' && isFirebaseReady()) {
    firestoreDeleteDoc(user.uid, collection, docId).catch(logger.error)
  }
}

async function syncLocalSnapshotToFirestore(user: AppUser, snapshot: {
  accounts: CSAccount[]
  drops: Drop[]
  goals: Goal[]
  settings: AppSettings
}) {
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
    firestoreSaveDoc(user.uid, 'settings', 'app', snapshot.settings as unknown as Record<string, unknown>),
  ])
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
    currentPage: 'dashboard',
    modalType: null,
    modalData: null,
    sidebarOpen: false,
    isLoading: false,

    // ── Auth ────────────────────────────────────────────────────────────────

    setUser: (user) => set({ user }),
    setAuthMode: (authMode) => set({ authMode }),
    setAuthReady: (authReady) => set({ authReady }),

    // ── Accounts ────────────────────────────────────────────────────────────

    addAccount: (data) => {
      const { accounts, user } = get()
      const account: CSAccount = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
        color: getAccountColor(accounts.length),
      }
      const updated = [...accounts, account]
      set({ accounts: updated })
      storage.saveAccounts(updated)
      syncToFirestore(user, 'accounts', account.id, account as unknown as Record<string, unknown>)
      return account
    },

    updateAccount: (id, updates) => {
      const { accounts, user } = get()
      const updated = accounts.map(a => a.id === id ? { ...a, ...updates } : a)
      set({ accounts: updated })
      storage.saveAccounts(updated)
      const acct = updated.find(a => a.id === id)
      if (acct) syncToFirestore(user, 'accounts', id, acct as unknown as Record<string, unknown>)
    },

    deleteAccount: (id) => {
      const { accounts, drops, user } = get()
      const updatedAccounts = accounts.filter(a => a.id !== id)
      const updatedDrops = drops.filter(d => d.accountId !== id)
      const removedDrops = drops.filter(d => d.accountId === id)
      set({ accounts: updatedAccounts, drops: updatedDrops })
      storage.saveAccounts(updatedAccounts)
      storage.saveDrops(updatedDrops)
      deleteFromFirestore(user, 'accounts', id)
      removedDrops.forEach(d => deleteFromFirestore(user, 'drops', d.id))
    },

    toggleAccountActive: (id) => {
      const { accounts } = get()
      const account = accounts.find(a => a.id === id)
      if (account) get().updateAccount(id, { active: !account.active })
    },

    // ── Drops ────────────────────────────────────────────────────────────────

    addDrop: (data) => {
      const { drops, user } = get()
      const drop: Drop = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }
      const updated = [...drops, drop]
      set({ drops: updated })
      storage.saveDrops(updated)
      syncToFirestore(user, 'drops', drop.id, drop as unknown as Record<string, unknown>)
      return drop
    },

    updateDrop: (id, updates) => {
      const { drops, user } = get()
      const updated = drops.map(d => d.id === id ? { ...d, ...updates } : d)
      set({ drops: updated })
      storage.saveDrops(updated)
      const drop = updated.find(d => d.id === id)
      if (drop) syncToFirestore(user, 'drops', id, drop as unknown as Record<string, unknown>)
    },

    deleteDrop: (id) => {
      const { drops, user } = get()
      const updated = drops.filter(d => d.id !== id)
      set({ drops: updated })
      storage.saveDrops(updated)
      deleteFromFirestore(user, 'drops', id)
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
      const { goals, user } = get()
      const goal: Goal = {
        ...data,
        id: generateId(),
        createdAt: new Date().toISOString(),
      }
      const updated = [...goals, goal]
      set({ goals: updated })
      storage.saveGoals(updated)
      syncToFirestore(user, 'goals', goal.id, goal as unknown as Record<string, unknown>)
    },

    updateGoal: (id, updates) => {
      const { goals, user } = get()
      const updated = goals.map(g => g.id === id ? { ...g, ...updates } : g)
      set({ goals: updated })
      storage.saveGoals(updated)
      const goal = updated.find(g => g.id === id)
      if (goal) syncToFirestore(user, 'goals', id, goal as unknown as Record<string, unknown>)
    },

    deleteGoal: (id) => {
      const { goals, user } = get()
      const updated = goals.filter(g => g.id !== id)
      set({ goals: updated })
      storage.saveGoals(updated)
      deleteFromFirestore(user, 'goals', id)
    },

    // ── Settings ─────────────────────────────────────────────────────────────

    updateSettings: (updates) => {
      const { settings: current, user } = get()
      const updated = { ...current, ...updates }
      set({ settings: updated })
      storage.saveSettings(updated)
      syncToFirestore(user, 'settings', 'app', updated as unknown as Record<string, unknown>)
    },

    updateTheme: (updates) => {
      const { settings: current, user } = get()
      const updated = { ...current, theme: { ...current.theme, ...updates } }
      set({ settings: updated })
      storage.saveSettings(updated)
      syncToFirestore(user, 'settings', 'app', updated as unknown as Record<string, unknown>)
    },

    // ── UI ───────────────────────────────────────────────────────────────────

    setCurrentPage: (page) => set({ currentPage: page, sidebarOpen: false }),
    openModal: (type, data = null) => set({ modalType: type, modalData: data }),
    closeModal: () => set({ modalType: null, modalData: null }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setLoading: (loading) => set({ isLoading: loading }),

    // ── Hydration ────────────────────────────────────────────────────────────

    hydrate: () => {
      set({
        accounts: storage.loadAccounts(),
        drops: storage.loadDrops(),
        goals: storage.loadGoals(),
        settings: storage.loadSettings(),
      })
    },

    hydrateCloud: async (user) => {
      if (user.provider !== 'google') {
        get().hydrate()
        return
      }
      if (!isFirebaseReady()) {
        // Firebase não inicializado — tenta inicializar
        try {
          const { FIREBASE_CONFIG } = await import('../lib/config')
          const { initFirebase } = await import('../lib/firebase')
          initFirebase(FIREBASE_CONFIG)
        } catch {
          get().hydrate()
          return
        }
        if (!isFirebaseReady()) {
          get().hydrate()
          return
        }
      }

      const localSnapshot = {
        accounts: storage.loadAccounts(),
        drops: storage.loadDrops(),
        goals: storage.loadGoals(),
        settings: storage.loadSettings(),
      }

      const [cloudAccounts, cloudDrops, cloudGoals, cloudSettings] = await Promise.all([
        firestoreLoadCollection<CSAccount>(user.uid, 'accounts'),
        firestoreLoadCollection<Drop>(user.uid, 'drops'),
        firestoreLoadCollection<Goal>(user.uid, 'goals'),
        firestoreLoadCollection<AppSettings & { id?: string }>(user.uid, 'settings'),
      ])

      const cloudIsEmpty = cloudAccounts.length === 0 && cloudDrops.length === 0 && cloudGoals.length === 0
      if (cloudIsEmpty && (localSnapshot.accounts.length > 0 || localSnapshot.drops.length > 0 || localSnapshot.goals.length > 0)) {
        set(localSnapshot)
        await syncLocalSnapshotToFirestore(user, localSnapshot)
        return
      }

      const settings = cloudSettings[0]
        ? {
            ...localSnapshot.settings,
            ...cloudSettings[0],
            theme: { ...localSnapshot.settings.theme, ...(cloudSettings[0].theme ?? {}) },
          }
        : localSnapshot.settings
      delete (settings as { id?: string }).id

      set({
        accounts: cloudAccounts,
        drops: cloudDrops,
        goals: cloudGoals,
        settings,
      })
      storage.saveAccounts(cloudAccounts)
      storage.saveDrops(cloudDrops)
      storage.saveGoals(cloudGoals)
      storage.saveSettings(settings)
    },

    reset: () => {
      storage.clearAll()
      try { localStorage.removeItem('lootflow_session') } catch {}
      set({
        accounts: [],
        drops: [],
        goals: [],
        settings: storage.loadSettings(),
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
