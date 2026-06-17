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
  registeredAt?: string;  // fallback para drops criados pelo bot
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

export interface DaySchedule {
  enabled: boolean;
  activeStart: string;    // "HH:MM" — começa a mandar a partir de
  activeEnd: string;      // "HH:MM" — para de mandar depois de
}

export interface WhatsAppSettings {
  phone: string;           // E.164 sem +, ex: "5511999999999"
  enabled: boolean;
  // Novo: schedule por dia da semana (substitui remindDays + quietHours)
  schedule?: { [day: number]: DaySchedule };
  // Legacy — mantidos para retrocompatibilidade
  quietStart?: string;
  quietEnd?: string;
  remindDays?: number[];
  encheSaco: boolean;
  encheSacoInterval: number;    // minutos entre lembretes (30, 60, 90, 120...)
  weeklySummary: boolean;
  xingamentos: boolean;
  enabledXingamentos?: number[];  // undefined = todos ativos; [] = nenhum
  verified?: boolean;
  verifyCode?: string;
  lastReminderAt?: string;
  consentAt?: string;       // ISO timestamp — quando usuário consentiu coleta do telefone (LGPD Art. 7, I)
}

export interface GamificationSettings {
  showInsights: boolean;          // painel de insights automáticos
  showHeatmap: boolean;           // heatmap de atividade estilo GitHub
  showTimeline: boolean;          // timeline de eventos
  showAchievements: boolean;      // sistema de conquistas
  showHallOfFame: boolean;        // hall da fama
  showPerfectWeek?: boolean;
  showLevels?: boolean;
  showTitles?: boolean;
  showRankings?: boolean;
  showCollection?: boolean;
  showCaseTracker?: boolean;
}

export interface PrivacySettings {
  hideProfile?: boolean;
  hideStatistics?: boolean;
  hideAchievements?: boolean;
  hideCollection?: boolean;
  hideTotalProfit?: boolean;
  hideAccounts?: boolean;
  hideHistory?: boolean;
}

export interface AppSettings {
  cashoutRate: number;            // 0-100, e.g. 85 = 85% of Steam value
  currency: 'BRL' | 'USD';       // display currency (Steam prices fetched in R$; USD = converted)
  usdRate?: number;               // BRL→USD rate (default 5.2, user can override)
  language?: 'pt' | 'en';        // UI language (auto-detected from browser if not set)
  weeklyGoalAmount: number;
  firebaseConfig?: FirebaseConfig;
  firebaseSyncEnabled: boolean;  // when false, no data is sent to Firestore
  theme: ThemeConfig;
  showOnboarding: boolean;
  liteMode?: boolean;
  profile?: ProfileOverride;
  whatsapp?: WhatsAppSettings;   // notificações via bot WhatsApp
  gamification?: GamificationSettings;  // toggles de gamificação/retenção
  privacy?: PrivacySettings;
  profilePrivacy?: 'public' | 'private' | 'friends';
  friendCode?: string;
}

// ─── Notificações (fila Firestore lida pelo bot) ─────────────────────────────

export interface BotNotification {
  type: 'test' | 'drop_registered' | 'weekly_summary'
  createdAt: string   // ISO
  payload?: Record<string, unknown>
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
  | 'settings'
  | 'collection'
  | 'friends'
  | 'rankings'
  | 'achievements';

export type ModalType =
  | 'add-account'
  | 'edit-account'
  | 'add-drop'
  | 'edit-drop'
  | 'add-goal'
  | 'edit-goal'
  | 'firebase-config'
  | 'export'
  | 'add-case-opening'
  | 'friend-request'
  | 'view-public-profile'
  | null;

// ─── LootFlow 2.0 Feature Entity Types ────────────────────────────────────────

export interface CollectionItem {
  marketHashName: string;
  name: string;
  imageUrl: string;
  count: number;
  firstSeen: string; // ISO date
  lastSeen: string; // ISO date
  maxValueSeen: number; // in BRL
}

export interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  activeTitle?: string;
  level: number;
  xp: number;
  totalDrops?: number;
  friendCode: string;
}

export interface FriendRequest {
  id: string;
  participantIds: string[];
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderFriendCode: string;
  senderActiveTitle?: string;
  senderLevel?: number;
  senderXp?: number;
  senderTotalDrops?: number;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  recipientFriendCode: string;
  recipientActiveTitle?: string;
  recipientLevel?: number;
  recipientXp?: number;
  recipientTotalDrops?: number;
  type: 'incoming' | 'outgoing';
  createdAt: string; // ISO date
}

export interface Friendship {
  id: string;
  memberIds: string[];
  memberProfiles: Record<string, Friend>;
  acceptedBy: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatarUrl?: string;
  activeTitle?: string;
  level: number;
  xp: number;
  totalDrops: number;
}

export interface PublicProfileSummary {
  uid: string;
  friendCode: string;
  name?: string;
  avatarUrl?: string;
  activeTitle?: string;
  level?: number;
  xp?: number;
  totalDrops?: number;
  totalCases?: number;
  collectionCount?: number;
  perfectWeeks?: number;
  showProfile: boolean;
  allowRankings: boolean;
  showStatistics: boolean;
  showCollection: boolean;
  showProfit: boolean;
  totalProfit?: number;
  updatedAt: string;
}

export interface CaseOpeningLog {
  id: string;
  dropId?: string;
  caseItem: SteamItem;
  casePriceAtOpen?: number; // BRL
  keyPriceAtOpen?: number; // BRL
  keyPrice: number; // BRL, legacy alias for keyPriceAtOpen
  obtainedItem: SteamItem;
  receivedItem?: SteamItem;
  obtainedValue: number; // BRL, legacy alias for receivedValueAtOpen
  receivedValueAtOpen?: number; // BRL
  openedAt?: string; // ISO date
  profitLoss?: number; // BRL
  wear?: WearCondition;
  statTrak?: boolean;
  sold: boolean;
  soldValue?: number; // BRL
  createdAt: string; // ISO date
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: string;
}

export interface GamificationState {
  totalPerfectWeeks: number;
  currentPerfectWeekStreak: number;
  bestPerfectWeekStreak: number;
  totalXP: number;
  level: number;
  levelProgress: number;
  activeTitle?: string;
  unlockedTitles: string[];
  completedPerfectWeeks?: string[];
  xpAwardedWeeks?: Record<string, number>;
}
