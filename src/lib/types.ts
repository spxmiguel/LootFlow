// ─── Core Entity Types ─────────────────────────────────────────────────────

export interface CSAccount {
  id: string;
  name: string;
  steamId?: string;
  active: boolean;
  cost: number;           // custo de aquisição da conta Prime (fixo)
  createdAt: string;      // ISO date
  note?: string;
  color?: string;         // display color for charts
  avatarUrl?: string;     // imagem opcional da conta Steam/CS
}

export interface SteamItem {
  name: string;
  marketHashName: string;
  imageUrl: string;
  cachedSteamValue?: number;
  cachedAt?: string;
}

export type WearCondition = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'

export interface Drop {
  id: string;
  accountId: string;
  weekId: string;         // YYYY-MM-DD of that week's Tuesday
  dropNumber: 1 | 2;     // max 2 per account per week
  item: SteamItem;
  steamValue: number;     // value from Steam Market (BRL)
  cashoutValue?: number;  // user-entered actual sale value
  wear?: WearCondition;   // skin wear condition (weapons only)
  float?: number;         // float value 0.0–1.0 (weapons only)
  sold: boolean;
  soldAt?: string;        // ISO date
  note?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  type: 'revenue' | 'profit' | 'drops' | 'cashout';
  deadline?: string;      // ISO date
  color: string;
  createdAt: string;
  targetItem?: SteamItem; // item CS2 que a meta representa (opcional)
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface ThemeConfig {
  primaryColor: string;   // hex
  accentColor: string;    // hex
  glassmorphism: boolean;
  animations: boolean;
  sidebarCompact: boolean;
}

// Profile overrides — stored in settings so they sync to Firestore
// and persist across devices. These override the values from Google OAuth.
export interface ProfileOverride {
  displayName?: string      // custom name shown in UI
  hideEmail?: boolean       // hide email under avatar in sidebar/header
  photoRemoved?: boolean    // true = always show initials (user removed photo)
  customPhotoURL?: string   // custom avatar URL provided by user
}

export interface AppSettings {
  cashoutRate: number;            // 0-100, e.g. 85 = 85% of Steam value
  currency: 'BRL';               // always BRL — Steam prices fetched in R$
  weeklyGoalAmount: number;
  firebaseConfig?: FirebaseConfig;
  firebaseSyncEnabled: boolean;  // when false, no data is sent to Firestore
  theme: ThemeConfig;
  showOnboarding: boolean;
  profile?: ProfileOverride;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
  provider: 'google' | 'local';
}

// ─── Analytics / Computed ────────────────────────────────────────────────────

export interface AccountStats {
  account: CSAccount;
  totalDrops: number;
  totalSteamValue: number;
  totalCashout: number;
  soldDrops: number;
  unsoldDrops: number;
  investedCost: number;
  roiPercent: number;         // (cashout / cost - 1) * 100
  paybackMultiplier: number;  // cashout / cost
  isPaidBack: boolean;
  remainingPayback: number;   // cost - cashout (0 if paid)
  weeklyAvgCashout: number;
  bestDrop?: Drop;
}

export interface WeekStats {
  weekId: string;
  label: string;
  totalDrops: number;
  completedAccounts: number;  // accounts with 2 drops
  totalSteamValue: number;
  totalCashout: number;
  soldDrops: number;
  drops: Drop[];
}

export interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  currentWeekDrops: number;
  currentWeekTarget: number; // activeAccounts * 2
  totalDropsAllTime: number;
  totalSteamValueAllTime: number;
  totalCashoutAllTime: number;
  totalInvestedAllTime: number;
  overallROI: number;
  weeklyStats: WeekStats[];
  accountStats: AccountStats[];
  bestWeek?: WeekStats;
  recentDrops: Drop[];
}

// ─── Steam Search ─────────────────────────────────────────────────────────────

export interface SteamSearchResult {
  name: string;
  hashName: string;
  imageUrl: string;
  sellPrice?: number;       // lowest_price parsed
  sellListings?: number;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type Page =
  | 'dashboard'
  | 'accounts'
  | 'drops'
  | 'analytics'
  | 'goals'
  | 'settings';

export type ModalType =
  | 'add-account'
  | 'edit-account'
  | 'add-drop'
  | 'edit-drop'
  | 'add-goal'
  | 'edit-goal'
  | 'firebase-config'
  | 'export'
  | null;
