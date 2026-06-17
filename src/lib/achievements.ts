import type { CSAccount, Drop, Goal, AppSettings, CaseOpeningLog, CollectionItem, GamificationState } from './types'
import { calcCashout, calcDashboardStats, calcGoalProgress, calcWeekStats } from './calculations'
import { getCurrentWeekId } from './utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond'

export interface Achievement {
  id: string
  icon: string          // Lucide icon name (e.g. 'Package', 'Trophy')
  tier: AchievementTier
  name_pt: string
  name_en: string
  desc_pt: string
  desc_en: string
  category: string
}

export interface UnlockedAchievement {
  achievement: Achievement
  unlockedAt: string   // ISO date
  progress: number     // 0–100
}

// ─── 357 Achievements ─────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  // ── DROPS: Milestones de Quantidade (30 achievements) ─────────────────────
  { id: 'drop_1',    icon: 'Package',       tier: 'bronze',  category: 'drops', name_pt: 'Primeiro Drop',       name_en: 'First Drop',         desc_pt: 'Registre 1 drop',            desc_en: 'Register 1 drop' },
  { id: 'drop_5',    icon: 'Layers',        tier: 'bronze',  category: 'drops', name_pt: '5 Drops',             name_en: '5 Drops',            desc_pt: 'Registre 5 drops',           desc_en: 'Register 5 drops' },
  { id: 'drop_10',   icon: 'PackageOpen',   tier: 'bronze',  category: 'drops', name_pt: '10 Drops',            name_en: '10 Drops',           desc_pt: 'Registre 10 drops',          desc_en: 'Register 10 drops' },
  { id: 'drop_20',   icon: 'Box',           tier: 'bronze',  category: 'drops', name_pt: '20 Drops',            name_en: '20 Drops',           desc_pt: 'Registre 20 drops',          desc_en: 'Register 20 drops' },
  { id: 'drop_30',   icon: 'Boxes',         tier: 'bronze',  category: 'drops', name_pt: '30 Drops',            name_en: '30 Drops',           desc_pt: 'Registre 30 drops',          desc_en: 'Register 30 drops' },
  { id: 'drop_40',   icon: 'Archive',       tier: 'bronze',  category: 'drops', name_pt: '40 Drops',            name_en: '40 Drops',           desc_pt: 'Registre 40 drops',          desc_en: 'Register 40 drops' },
  { id: 'drop_50',   icon: 'ArchiveX',      tier: 'silver',  category: 'drops', name_pt: '50 Drops',            name_en: '50 Drops',           desc_pt: 'Registre 50 drops',          desc_en: 'Register 50 drops' },
  { id: 'drop_75',   icon: 'Warehouse',     tier: 'silver',  category: 'drops', name_pt: '75 Drops',            name_en: '75 Drops',           desc_pt: 'Registre 75 drops',          desc_en: 'Register 75 drops' },
  { id: 'drop_100',  icon: 'Trophy',        tier: 'gold',    category: 'drops', name_pt: '100 Drops',           name_en: '100 Drops',          desc_pt: 'Registre 100 drops',         desc_en: 'Register 100 drops' },
  { id: 'drop_150',  icon: 'Award',         tier: 'gold',    category: 'drops', name_pt: '150 Drops',           name_en: '150 Drops',          desc_pt: 'Registre 150 drops',         desc_en: 'Register 150 drops' },
  { id: 'drop_200',  icon: 'Medal',         tier: 'gold',    category: 'drops', name_pt: '200 Drops',           name_en: '200 Drops',          desc_pt: 'Registre 200 drops',         desc_en: 'Register 200 drops' },
  { id: 'drop_250',  icon: 'Gem',           tier: 'gold',    category: 'drops', name_pt: '250 Drops',           name_en: '250 Drops',          desc_pt: 'Registre 250 drops',         desc_en: 'Register 250 drops' },
  { id: 'drop_300',  icon: 'Star',          tier: 'gold',    category: 'drops', name_pt: '300 Drops',           name_en: '300 Drops',          desc_pt: 'Registre 300 drops',         desc_en: 'Register 300 drops' },
  { id: 'drop_400',  icon: 'Stars',         tier: 'diamond', category: 'drops', name_pt: '400 Drops',           name_en: '400 Drops',          desc_pt: 'Registre 400 drops',         desc_en: 'Register 400 drops' },
  { id: 'drop_500',  icon: 'Crown',         tier: 'diamond', category: 'drops', name_pt: '500 Drops',           name_en: '500 Drops',          desc_pt: 'Registre 500 drops',         desc_en: 'Register 500 drops' },
  { id: 'drop_750',  icon: 'FlameKindling', tier: 'diamond', category: 'drops', name_pt: '750 Drops',           name_en: '750 Drops',          desc_pt: 'Registre 750 drops',         desc_en: 'Register 750 drops' },
  { id: 'drop_1000', icon: 'Sparkles',      tier: 'diamond', category: 'drops', name_pt: 'Lenda dos Drops',     name_en: 'Drop Legend',        desc_pt: '1000 drops registrados',     desc_en: '1000 drops registered' },
  { id: 'drop_day_2',   icon: 'CalendarDays',  tier: 'bronze',  category: 'drops', name_pt: 'Dupla do Dia',     name_en: 'Daily Double',       desc_pt: '2 drops em um dia',          desc_en: '2 drops in one day' },
  { id: 'drop_week_full', icon: 'CalendarCheck', tier: 'silver', category: 'drops', name_pt: 'Semana Cheia',  name_en: 'Full Week',          desc_pt: '4 drops em uma semana',      desc_en: '4 drops in one week' },
  { id: 'drop_same_week_all', icon: 'CheckSquare', tier: 'gold', category: 'drops', name_pt: 'Sincronizado', name_en: 'Synchronized',      desc_pt: 'Todas as contas com drop na mesma semana', desc_en: 'All accounts dropped same week' },
  { id: 'drop_unknown_5',  icon: 'HelpCircle', tier: 'bronze', category: 'drops', name_pt: 'Sem Memória',    name_en: 'No Memory',          desc_pt: '5 drops sem data',           desc_en: '5 drops without date' },
  { id: 'drop_one_account_10', icon: 'User', tier: 'bronze', category: 'drops', name_pt: 'Dedicado',         name_en: 'Dedicated',          desc_pt: '10 drops em uma conta',      desc_en: '10 drops on one account' },
  { id: 'drop_one_account_50', icon: 'UserCheck', tier: 'silver', category: 'drops', name_pt: 'Veterano',    name_en: 'Veteran',            desc_pt: '50 drops em uma conta',      desc_en: '50 drops on one account' },
  { id: 'drop_multi_account', icon: 'Users', tier: 'bronze', category: 'drops', name_pt: 'Multi-conta',      name_en: 'Multi-account',      desc_pt: 'Drops em 3+ contas',         desc_en: 'Drops on 3+ accounts' },
  { id: 'drop_sold_1',  icon: 'ShoppingBag',  tier: 'bronze',  category: 'drops', name_pt: 'Primeira Venda',  name_en: 'First Sale',         desc_pt: 'Venda 1 drop',               desc_en: 'Sell 1 drop' },
  { id: 'drop_sold_10', icon: 'ShoppingCart', tier: 'silver',  category: 'drops', name_pt: '10 Vendas',       name_en: '10 Sales',           desc_pt: 'Venda 10 drops',             desc_en: 'Sell 10 drops' },
  { id: 'drop_sold_50', icon: 'Store',        tier: 'gold',    category: 'drops', name_pt: 'Merchant',        name_en: 'Merchant',           desc_pt: 'Venda 50 drops',             desc_en: 'Sell 50 drops' },
  { id: 'drop_sold_100',icon: 'Building2',    tier: 'diamond', category: 'drops', name_pt: 'Magnata',         name_en: 'Magnate',            desc_pt: 'Venda 100 drops',            desc_en: 'Sell 100 drops' },
  { id: 'drop_all_sold',icon: 'CheckCircle2', tier: 'gold',    category: 'drops', name_pt: 'Limpa-estoque',   name_en: 'Stock Cleaner',      desc_pt: 'Venda todos os drops',       desc_en: 'Sell all drops' },
  { id: 'drop_zero_unsold',icon: 'MinusCircle',tier: 'silver', category: 'drops', name_pt: 'Sem Pendências',  name_en: 'No Pending',         desc_pt: '0 drops não vendidos',       desc_en: '0 unsold drops' },

  // ── VALOR: Cashout e ROI (25 achievements) ────────────────────────────────
  { id: 'cashout_r10',   icon: 'DollarSign',  tier: 'bronze',  category: 'value', name_pt: 'Primeiro Real',    name_en: 'First Buck',         desc_pt: 'R$10 em cashout total',      desc_en: 'R$10 total cashout' },
  { id: 'cashout_r50',   icon: 'Banknote',    tier: 'bronze',  category: 'value', name_pt: 'Cinquentão',       name_en: 'Fifty Bucks',        desc_pt: 'R$50 em cashout total',      desc_en: 'R$50 total cashout' },
  { id: 'cashout_r100',  icon: 'Wallet',      tier: 'silver',  category: 'value', name_pt: 'Centena',          name_en: 'Century',            desc_pt: 'R$100 em cashout total',     desc_en: 'R$100 total cashout' },
  { id: 'cashout_r250',  icon: 'PiggyBank',   tier: 'silver',  category: 'value', name_pt: 'Cofrinho',         name_en: 'Piggy Bank',         desc_pt: 'R$250 em cashout total',     desc_en: 'R$250 total cashout' },
  { id: 'cashout_r500',  icon: 'TrendingUp',  tier: 'gold',    category: 'value', name_pt: 'Crescendo',        name_en: 'Growing',            desc_pt: 'R$500 em cashout total',     desc_en: 'R$500 total cashout' },
  { id: 'cashout_r1000', icon: 'BarChart3',   tier: 'gold',    category: 'value', name_pt: 'Milhar',           name_en: 'Thousand',           desc_pt: 'R$1000 em cashout total',    desc_en: 'R$1000 total cashout' },
  { id: 'cashout_r2500', icon: 'BarChart4',   tier: 'diamond', category: 'value', name_pt: 'Investidor',       name_en: 'Investor',           desc_pt: 'R$2500 em cashout total',    desc_en: 'R$2500 total cashout' },
  { id: 'cashout_r5000', icon: 'LineChart',   tier: 'diamond', category: 'value', name_pt: 'Milionário do CS', name_en: 'CS Millionaire',     desc_pt: 'R$5000 em cashout total',    desc_en: 'R$5000 total cashout' },
  { id: 'single_drop_r25', icon: 'Zap',       tier: 'bronze',  category: 'value', name_pt: 'Drop Valioso',     name_en: 'Valuable Drop',      desc_pt: 'Um drop com cashout R$25+',  desc_en: 'Single drop R$25+ cashout' },
  { id: 'single_drop_r50', icon: 'Flame',     tier: 'silver',  category: 'value', name_pt: 'Drop de Prata',    name_en: 'Silver Drop',        desc_pt: 'Um drop com cashout R$50+',  desc_en: 'Single drop R$50+ cashout' },
  { id: 'single_drop_r100',icon: 'Sword',     tier: 'gold',    category: 'value', name_pt: 'Drop de Ouro',     name_en: 'Gold Drop',          desc_pt: 'Um drop com cashout R$100+', desc_en: 'Single drop R$100+ cashout' },
  { id: 'single_drop_r200',icon: 'Gem',       tier: 'diamond', category: 'value', name_pt: 'Drop Diamante',    name_en: 'Diamond Drop',       desc_pt: 'Um drop com cashout R$200+', desc_en: 'Single drop R$200+ cashout' },
  { id: 'single_drop_r500',icon: 'Crown',     tier: 'diamond', category: 'value', name_pt: 'Jackpot',          name_en: 'Jackpot',            desc_pt: 'Um drop com cashout R$500+', desc_en: 'Single drop R$500+ cashout' },
  { id: 'roi_zero',     icon: 'Minus',        tier: 'bronze',  category: 'value', name_pt: 'Sem Prejuízo',     name_en: 'No Loss',            desc_pt: 'ROI acima de 0%',            desc_en: 'ROI above 0%' },
  { id: 'roi_50',       icon: 'ArrowUpRight', tier: 'silver',  category: 'value', name_pt: 'ROI 50%',          name_en: 'ROI 50%',            desc_pt: 'ROI geral acima de 50%',     desc_en: 'Overall ROI above 50%' },
  { id: 'roi_100',      icon: 'TrendingUp',   tier: 'gold',    category: 'value', name_pt: 'ROI 100%',         name_en: 'ROI 100%',           desc_pt: 'ROI geral acima de 100%',    desc_en: 'Overall ROI above 100%' },
  { id: 'roi_200',      icon: 'Rocket',       tier: 'diamond', category: 'value', name_pt: 'Lua!',             name_en: 'To the Moon!',       desc_pt: 'ROI geral acima de 200%',    desc_en: 'Overall ROI above 200%' },
  { id: 'payback_1',    icon: 'RefreshCw',    tier: 'silver',  category: 'value', name_pt: 'Payback!',         name_en: 'Payback!',           desc_pt: '1 conta atingiu payback',    desc_en: '1 account reached payback' },
  { id: 'payback_3',    icon: 'RefreshCcw',   tier: 'gold',    category: 'value', name_pt: 'Triple Payback',   name_en: 'Triple Payback',     desc_pt: '3 contas atingiram payback', desc_en: '3 accounts reached payback' },
  { id: 'payback_5',    icon: 'Infinity',     tier: 'diamond', category: 'value', name_pt: 'Payback Master',   name_en: 'Payback Master',     desc_pt: '5 contas atingiram payback', desc_en: '5 accounts reached payback' },
  { id: 'week_cashout_r50', icon: 'Calendar', tier: 'silver',  category: 'value', name_pt: 'Semana Rica',      name_en: 'Rich Week',          desc_pt: 'R$50+ de cashout em 1 semana', desc_en: 'R$50+ cashout in 1 week' },
  { id: 'week_cashout_r100',icon: 'CalendarRange', tier: 'gold', category: 'value', name_pt: 'Semana Premium', name_en: 'Premium Week',       desc_pt: 'R$100+ de cashout em 1 semana', desc_en: 'R$100+ cashout in 1 week' },
  { id: 'profit_month', icon: 'CalendarCheck2', tier: 'gold', category: 'value', name_pt: 'Mês Lucrativo',    name_en: 'Profitable Month',   desc_pt: 'ROI positivo por 4 semanas seguidas', desc_en: 'Positive ROI for 4 weeks' },
  { id: 'cashout_streak_3', icon: 'BarChart2', tier: 'silver', category: 'value', name_pt: 'Em Alta',          name_en: 'On the Rise',        desc_pt: '3 semanas seguidas com cashout crescente', desc_en: '3 weeks increasing cashout' },
  { id: 'avg_drop_r20', icon: 'Target',        tier: 'silver', category: 'value', name_pt: 'Consistente',      name_en: 'Consistent',         desc_pt: 'Média de R$20+ por drop',    desc_en: 'Average R$20+ per drop' },

  // ── STREAKS: Sequências Semanais (20 achievements) ────────────────────────
  { id: 'streak_2',    icon: 'Zap',          tier: 'bronze',  category: 'streak', name_pt: 'Sequência de 2',   name_en: '2-Week Streak',      desc_pt: 'Drops em 2 semanas seguidas',  desc_en: 'Drops in 2 consecutive weeks' },
  { id: 'streak_3',    icon: 'ZapOff',       tier: 'bronze',  category: 'streak', name_pt: 'Sequência de 3',   name_en: '3-Week Streak',      desc_pt: 'Drops em 3 semanas seguidas',  desc_en: 'Drops in 3 consecutive weeks' },
  { id: 'streak_4',    icon: 'Flame',        tier: 'silver',  category: 'streak', name_pt: 'Sequência de 4',   name_en: '4-Week Streak',      desc_pt: 'Drops em 4 semanas seguidas',  desc_en: 'Drops in 4 consecutive weeks' },
  { id: 'streak_6',    icon: 'FlameKindling',tier: 'silver',  category: 'streak', name_pt: 'Sequência de 6',   name_en: '6-Week Streak',      desc_pt: 'Drops em 6 semanas seguidas',  desc_en: 'Drops in 6 consecutive weeks' },
  { id: 'streak_8',    icon: 'Sparkles',     tier: 'gold',    category: 'streak', name_pt: 'Sequência de 8',   name_en: '8-Week Streak',      desc_pt: 'Drops em 8 semanas seguidas',  desc_en: 'Drops in 8 consecutive weeks' },
  { id: 'streak_12',   icon: 'TrendingUp',   tier: 'gold',    category: 'streak', name_pt: 'Sequência de 12',  name_en: '12-Week Streak',     desc_pt: 'Drops em 12 semanas seguidas', desc_en: 'Drops in 12 consecutive weeks' },
  { id: 'streak_16',   icon: 'ArrowUpRight', tier: 'gold',    category: 'streak', name_pt: 'Sequência de 16',  name_en: '16-Week Streak',     desc_pt: 'Drops em 16 semanas seguidas', desc_en: 'Drops in 16 consecutive weeks' },
  { id: 'streak_20',   icon: 'Trophy',       tier: 'gold',    category: 'streak', name_pt: 'Sequência de 20',  name_en: '20-Week Streak',     desc_pt: 'Drops em 20 semanas seguidas', desc_en: 'Drops in 20 consecutive weeks' },
  { id: 'streak_26',   icon: 'Award',        tier: 'diamond', category: 'streak', name_pt: 'Meio Ano',         name_en: 'Half Year',          desc_pt: 'Drops em 26 semanas seguidas', desc_en: 'Drops in 26 consecutive weeks' },
  { id: 'streak_36',   icon: 'Star',         tier: 'diamond', category: 'streak', name_pt: '9 Meses On',       name_en: '9 Months On',        desc_pt: 'Drops em 36 semanas seguidas', desc_en: 'Drops in 36 consecutive weeks' },
  { id: 'streak_52',   icon: 'Crown',        tier: 'diamond', category: 'streak', name_pt: 'Um Ano Inteiro',   name_en: 'Full Year',          desc_pt: 'Drops em 52 semanas seguidas', desc_en: 'Drops in 52 consecutive weeks' },
  { id: 'perfect_week_1',   icon: 'CheckCircle',   tier: 'bronze', category: 'streak', name_pt: 'Semana Perfeita',  name_en: 'Perfect Week',   desc_pt: '1 semana perfeita',  desc_en: '1 perfect week' },
  { id: 'perfect_week_3',   icon: 'CheckCircle2',  tier: 'silver', category: 'streak', name_pt: '3 Semanas Perfeitas', name_en: '3 Perfect Weeks', desc_pt: '3 semanas perfeitas', desc_en: '3 perfect weeks' },
  { id: 'perfect_week_5',   icon: 'ShieldCheck',   tier: 'silver', category: 'streak', name_pt: '5 Semanas Perfeitas', name_en: '5 Perfect Weeks', desc_pt: '5 semanas perfeitas', desc_en: '5 perfect weeks' },
  { id: 'perfect_week_10',  icon: 'Shield',        tier: 'gold',   category: 'streak', name_pt: '10 Semanas Perfeitas', name_en: '10 Perfect Weeks', desc_pt: '10 semanas perfeitas', desc_en: '10 perfect weeks' },
  { id: 'perfect_week_25',  icon: 'ShieldHalf',    tier: 'gold',   category: 'streak', name_pt: '25 Semanas Perfeitas', name_en: '25 Perfect Weeks', desc_pt: '25 semanas perfeitas', desc_en: '25 perfect weeks' },
  { id: 'perfect_week_50',  icon: 'Gem',           tier: 'diamond',category: 'streak', name_pt: '50 Semanas Perfeitas', name_en: '50 Perfect Weeks', desc_pt: '50 semanas perfeitas', desc_en: '50 perfect weeks' },
  { id: 'perfect_week_100', icon: 'Sparkles',      tier: 'diamond',category: 'streak', name_pt: '100 Semanas Perfeitas', name_en: '100 Perfect Weeks', desc_pt: '100 semanas perfeitas', desc_en: '100 perfect weeks' },
  { id: 'streak_comeback',  icon: 'RotateCcw',     tier: 'bronze', category: 'streak', name_pt: 'De Volta!',    name_en: 'Comeback!',          desc_pt: 'Volta após 4 semanas sem drops', desc_en: 'Return after 4 weeks without drops' },
  { id: 'streak_comeback_long', icon: 'RefreshCw', tier: 'silver', category: 'streak', name_pt: 'Ressurreição', name_en: 'Resurrection',      desc_pt: 'Volta após 8+ semanas sem drops', desc_en: 'Return after 8+ weeks without drops' },

  // ── CONTAS: Gerenciamento (20 achievements) ───────────────────────────────
  { id: 'account_1',   icon: 'User',         tier: 'bronze',  category: 'accounts', name_pt: 'Primeira Conta',  name_en: 'First Account',      desc_pt: 'Adicione 1 conta',           desc_en: 'Add 1 account' },
  { id: 'account_2',   icon: 'UserPlus',     tier: 'bronze',  category: 'accounts', name_pt: 'Dupla',           name_en: 'Duo',                desc_pt: 'Adicione 2 contas',          desc_en: 'Add 2 accounts' },
  { id: 'account_3',   icon: 'Users',        tier: 'bronze',  category: 'accounts', name_pt: 'Trio',            name_en: 'Trio',               desc_pt: 'Adicione 3 contas',          desc_en: 'Add 3 accounts' },
  { id: 'account_5',   icon: 'UsersRound',   tier: 'silver',  category: 'accounts', name_pt: 'Time de 5',       name_en: 'Team of 5',          desc_pt: 'Adicione 5 contas',          desc_en: 'Add 5 accounts' },
  { id: 'account_10',  icon: 'UserCog',      tier: 'gold',    category: 'accounts', name_pt: 'Fazendeiro',      name_en: 'Farmer',             desc_pt: 'Adicione 10 contas',         desc_en: 'Add 10 accounts' },
  { id: 'account_20',  icon: 'Building',     tier: 'gold',    category: 'accounts', name_pt: 'Empresa',         name_en: 'Company',            desc_pt: 'Adicione 20 contas',         desc_en: 'Add 20 accounts' },
  { id: 'account_50',  icon: 'Building2',    tier: 'diamond', category: 'accounts', name_pt: 'Conglomerado',    name_en: 'Conglomerate',       desc_pt: 'Adicione 50 contas',         desc_en: 'Add 50 accounts' },
  { id: 'account_all_prime', icon: 'Shield', tier: 'silver',  category: 'accounts', name_pt: 'Prime Máximo',    name_en: 'Max Prime',          desc_pt: 'Todas as contas com Prime',  desc_en: 'All accounts with Prime' },
  { id: 'account_all_drops', icon: 'CheckSquare', tier: 'gold', category: 'accounts', name_pt: 'Todos Farmando', name_en: 'All Farming',      desc_pt: 'Todas as contas com drop esta semana', desc_en: 'All accounts dropped this week' },
  { id: 'account_all_payback', icon: 'RefreshCcw', tier: 'diamond', category: 'accounts', name_pt: 'Payback Geral', name_en: 'Total Payback',  desc_pt: 'Todas as contas com payback', desc_en: 'All accounts with payback' },
  { id: 'account_named', icon: 'Tag',        tier: 'bronze',  category: 'accounts', name_pt: 'Identificado',    name_en: 'Identified',         desc_pt: 'Nomeie uma conta',           desc_en: 'Name an account' },
  { id: 'account_avatar', icon: 'Image',     tier: 'bronze',  category: 'accounts', name_pt: 'Com Rosto',       name_en: 'With a Face',        desc_pt: 'Adicione avatar a uma conta', desc_en: 'Add avatar to an account' },
  { id: 'account_color', icon: 'Palette',    tier: 'bronze',  category: 'accounts', name_pt: 'Colorido',        name_en: 'Colorful',           desc_pt: 'Personalize a cor de uma conta', desc_en: 'Customize account color' },
  { id: 'account_oldest_1y', icon: 'Clock',  tier: 'gold',    category: 'accounts', name_pt: '1 Ano de Conta',  name_en: '1 Year Account',     desc_pt: 'Uma conta com 1+ ano de drops', desc_en: 'An account with 1+ year of drops' },
  { id: 'account_oldest_2y', icon: 'Timer',  tier: 'diamond', category: 'accounts', name_pt: '2 Anos de Conta', name_en: '2 Year Account',     desc_pt: 'Uma conta com 2+ anos de drops', desc_en: 'An account with 2+ year of drops' },
  { id: 'account_balance_r100', icon: 'Wallet', tier: 'silver', category: 'accounts', name_pt: 'Saldo R$100', name_en: 'Balance R$100',       desc_pt: 'Uma conta com R$100+ de cashout', desc_en: 'One account with R$100+ cashout' },
  { id: 'account_balance_r500', icon: 'PiggyBank', tier: 'gold', category: 'accounts', name_pt: 'Saldo R$500', name_en: 'Balance R$500',      desc_pt: 'Uma conta com R$500+ de cashout', desc_en: 'One account with R$500+ cashout' },
  { id: 'account_active_7', icon: 'Activity', tier: 'gold',   category: 'accounts', name_pt: '7 Ativas',        name_en: '7 Active',           desc_pt: '7+ contas ativas',           desc_en: '7+ active accounts' },
  { id: 'account_inactive', icon: 'UserMinus', tier: 'bronze', category: 'accounts', name_pt: 'Gerenciando',    name_en: 'Managing',           desc_pt: 'Desative uma conta',         desc_en: 'Deactivate an account' },
  { id: 'account_5_same_week', icon: 'CalendarRange', tier: 'diamond', category: 'accounts', name_pt: 'Sincronizado', name_en: 'In Sync', desc_pt: '5 contas com drop na mesma semana', desc_en: '5 accounts dropped same week' },

  // ── METAS: Sistema de Goals (20 achievements) ─────────────────────────────
  { id: 'goal_created_1', icon: 'Target',      tier: 'bronze',  category: 'goals', name_pt: 'Primeiro Objetivo', name_en: 'First Goal',       desc_pt: 'Crie 1 meta',               desc_en: 'Create 1 goal' },
  { id: 'goal_created_5', icon: 'Crosshair',   tier: 'silver',  category: 'goals', name_pt: '5 Metas Criadas',   name_en: '5 Goals Created',  desc_pt: 'Crie 5 metas',              desc_en: 'Create 5 goals' },
  { id: 'goal_created_10',icon: 'Swords',      tier: 'gold',    category: 'goals', name_pt: '10 Metas',          name_en: '10 Goals',         desc_pt: 'Crie 10 metas',             desc_en: 'Create 10 goals' },
  { id: 'goal_completed_1', icon: 'CheckCircle', tier: 'bronze', category: 'goals', name_pt: 'Meta Alcançada',  name_en: 'Goal Reached',     desc_pt: 'Complete 1 meta',            desc_en: 'Complete 1 goal' },
  { id: 'goal_completed_3', icon: 'CheckCircle2', tier: 'silver', category: 'goals', name_pt: '3 Metas Cumpridas', name_en: '3 Goals Done', desc_pt: 'Complete 3 metas',           desc_en: 'Complete 3 goals' },
  { id: 'goal_completed_5', icon: 'CircleCheck', tier: 'silver', category: 'goals', name_pt: '5 Metas Cumpridas', name_en: '5 Goals Done', desc_pt: 'Complete 5 metas',           desc_en: 'Complete 5 goals' },
  { id: 'goal_completed_10',icon: 'ListChecks', tier: 'gold',    category: 'goals', name_pt: '10 Metas Cumpridas', name_en: '10 Goals Done', desc_pt: 'Complete 10 metas',          desc_en: 'Complete 10 goals' },
  { id: 'goal_all_done',    icon: 'Trophy',    tier: 'gold',    category: 'goals', name_pt: 'Todas as Metas',    name_en: 'All Goals',        desc_pt: 'Complete todas as metas ativas', desc_en: 'Complete all active goals' },
  { id: 'goal_payback_type', icon: 'RefreshCw', tier: 'silver', category: 'goals', name_pt: 'Meta de Payback',  name_en: 'Payback Goal',     desc_pt: 'Complete uma meta de payback', desc_en: 'Complete a payback goal' },
  { id: 'goal_cashout_type', icon: 'DollarSign', tier: 'silver', category: 'goals', name_pt: 'Meta de Cashout', name_en: 'Cashout Goal',     desc_pt: 'Complete uma meta de cashout', desc_en: 'Complete a cashout goal' },
  { id: 'goal_drops_type',   icon: 'Package',  tier: 'silver',  category: 'goals', name_pt: 'Meta de Drops',    name_en: 'Drops Goal',       desc_pt: 'Complete uma meta de drops', desc_en: 'Complete a drops goal' },
  { id: 'goal_roi_type',     icon: 'BarChart2', tier: 'silver', category: 'goals', name_pt: 'Meta de ROI',      name_en: 'ROI Goal',         desc_pt: 'Complete uma meta de ROI',   desc_en: 'Complete an ROI goal' },
  { id: 'goal_early',       icon: 'Timer',     tier: 'gold',    category: 'goals', name_pt: 'Adiantado',        name_en: 'Ahead of Schedule', desc_pt: 'Complete meta 2 semanas antes', desc_en: 'Complete goal 2 weeks early' },
  { id: 'goal_streak_3',    icon: 'ListOrdered', tier: 'gold',  category: 'goals', name_pt: '3 Metas Seguidas', name_en: '3 Goals in a Row', desc_pt: 'Complete 3 metas consecutivas', desc_en: 'Complete 3 goals in a row' },
  { id: 'goal_bigvalue',    icon: 'TrendingUp', tier: 'gold',   category: 'goals', name_pt: 'Meta Ambiciosa',   name_en: 'Ambitious Goal',   desc_pt: 'Crie meta de R$500+',        desc_en: 'Create a R$500+ goal' },
  { id: 'goal_fast',        icon: 'Gauge',     tier: 'silver',  category: 'goals', name_pt: 'Rápido',           name_en: 'Fast',             desc_pt: 'Complete meta em menos de 4 semanas', desc_en: 'Complete goal in under 4 weeks' },
  { id: 'goal_perfect',     icon: 'Star',      tier: 'diamond', category: 'goals', name_pt: 'Perfeição',        name_en: 'Perfection',       desc_pt: 'Complete 5 metas seguidas',  desc_en: 'Complete 5 consecutive goals' },
  { id: 'goal_multi',       icon: 'Layout',    tier: 'gold',    category: 'goals', name_pt: 'Multitarefa',      name_en: 'Multitasker',      desc_pt: 'Tenha 3+ metas ativas',      desc_en: 'Have 3+ active goals' },
  { id: 'goal_overperform', icon: 'Rocket',    tier: 'gold',    category: 'goals', name_pt: 'Acima da Meta',    name_en: 'Overperformer',    desc_pt: 'Supere uma meta em 50%',     desc_en: 'Beat a goal by 50%' },
  { id: 'goal_delete',      icon: 'Trash2',    tier: 'bronze',  category: 'goals', name_pt: 'Mudança de Planos', name_en: 'Change of Plans', desc_pt: 'Delete uma meta',            desc_en: 'Delete a goal' },

  // ── CONQUISTAS ESPECIAIS: Semanais Perfeitas com variações (20) ───────────
  { id: 'full_house_2',  icon: 'Home',         tier: 'silver',  category: 'special', name_pt: 'Casa Cheia',      name_en: 'Full House',       desc_pt: '2+ contas com drop na mesma semana', desc_en: '2+ accounts dropped same week' },
  { id: 'full_house_5',  icon: 'Building',     tier: 'gold',    category: 'special', name_pt: 'Bloco Cheio',     name_en: 'Full Block',       desc_pt: '5+ contas com drop na mesma semana', desc_en: '5+ accounts dropped same week' },
  { id: 'full_house_10', icon: 'Landmark',     tier: 'diamond', category: 'special', name_pt: 'City Drop',       name_en: 'City Drop',        desc_pt: '10+ contas com drop na mesma semana', desc_en: '10+ accounts dropped same week' },
  { id: 'drop_same_day', icon: 'Sun',          tier: 'bronze',  category: 'special', name_pt: 'Dia D',           name_en: 'D-Day',            desc_pt: '2+ drops registrados no mesmo dia', desc_en: '2+ drops registered same day' },
  { id: 'drop_monday',   icon: 'Sunrise',      tier: 'bronze',  category: 'special', name_pt: 'Segunda Grind',   name_en: 'Monday Grind',     desc_pt: 'Drop registrado numa segunda-feira', desc_en: 'Drop registered on a Monday' },
  { id: 'drop_weekend',  icon: 'Umbrella',     tier: 'bronze',  category: 'special', name_pt: 'Fim de Semana',   name_en: 'Weekend Warrior',  desc_pt: 'Drop registrado no fim de semana', desc_en: 'Drop registered on weekend' },
  { id: 'all_drops_sold', icon: 'ShoppingBag', tier: 'gold',    category: 'special', name_pt: 'Estoque Zero',    name_en: 'Zero Inventory',   desc_pt: 'Venda todos os drops registrados', desc_en: 'Sell all registered drops' },
  { id: 'ten_sales_week', icon: 'ShoppingCart', tier: 'diamond', category: 'special', name_pt: 'Semana de Vendas', name_en: 'Sales Week',      desc_pt: '10 vendas em uma semana',    desc_en: '10 sales in one week' },
  { id: 'high_value_week',icon: 'BadgeDollarSign', tier: 'gold', category: 'special', name_pt: 'Semana Premium', name_en: 'Premium Week',     desc_pt: 'R$200+ de cashout em 1 semana', desc_en: 'R$200+ cashout in 1 week' },
  { id: 'zero_loss',     icon: 'ShieldCheck',  tier: 'gold',    category: 'special', name_pt: 'Sem Perdas',      name_en: 'No Losses',        desc_pt: 'Nunca teve ROI negativo',    desc_en: 'Never had negative ROI' },
  { id: 'consistent_10w', icon: 'Activity',    tier: 'gold',    category: 'special', name_pt: '10 Semanas Consistente', name_en: '10 Weeks Consistent', desc_pt: 'Drop toda semana por 10 semanas', desc_en: 'Drop every week for 10 weeks' },
  { id: 'drop_5_accounts_one_day', icon: 'Zap', tier: 'diamond', category: 'special', name_pt: 'Flash Farm',    name_en: 'Flash Farm',       desc_pt: 'Drops de 5 contas no mesmo dia', desc_en: '5 accounts dropped same day' },
  { id: 'early_adopter', icon: 'Rocket',       tier: 'gold',    category: 'special', name_pt: 'Early Adopter',   name_en: 'Early Adopter',    desc_pt: 'Um dos primeiros usuários',  desc_en: 'One of the early users' },
  { id: 'veteran',       icon: 'Shield',       tier: 'diamond', category: 'special', name_pt: 'Veterano',        name_en: 'Veteran',          desc_pt: '1 ano usando o LootFlow',    desc_en: '1 year using LootFlow' },
  { id: 'legend',        icon: 'Crown',        tier: 'diamond', category: 'special', name_pt: 'Lenda',           name_en: 'Legend',           desc_pt: '2 anos usando o LootFlow',   desc_en: '2 years using LootFlow' },
  { id: 'drop_anniversary', icon: 'PartyPopper', tier: 'gold',  category: 'special', name_pt: 'Aniversário',    name_en: 'Anniversary',      desc_pt: 'Drop no aniversário do LootFlow', desc_en: 'Drop on LootFlow anniversary' },
  { id: 'lucky_seven',   icon: 'Dice5',        tier: 'silver',  category: 'special', name_pt: 'Lucky Seven',     name_en: 'Lucky Seven',      desc_pt: '7 drops em 7 dias',          desc_en: '7 drops in 7 days' },
  { id: 'no_break',      icon: 'Battery',      tier: 'diamond', category: 'special', name_pt: 'Sem Pausas',      name_en: 'No Breaks',        desc_pt: 'Nunca ficou 2 semanas sem drop', desc_en: 'Never went 2 weeks without a drop' },
  { id: 'perfect_month', icon: 'CalendarCheck2', tier: 'diamond', category: 'special', name_pt: 'Mês Perfeito',  name_en: 'Perfect Month',    desc_pt: 'Todas as semanas de um mês com drop', desc_en: 'All weeks of a month with drop' },
  { id: 'new_year_drop', icon: 'Sparkles',     tier: 'silver',  category: 'special', name_pt: 'Ano Novo',        name_en: 'New Year',         desc_pt: 'Drop na primeira semana do ano', desc_en: 'Drop in first week of the year' },

  // ── CUSTOMIZAÇÃO E APP (20 achievements) ──────────────────────────────────
  { id: 'settings_first', icon: 'Settings',    tier: 'bronze',  category: 'app', name_pt: 'Personalizando',    name_en: 'Personalizing',    desc_pt: 'Acesse as configurações',    desc_en: 'Access settings' },
  { id: 'theme_changed',  icon: 'Palette',     tier: 'bronze',  category: 'app', name_pt: 'Estiloso',          name_en: 'Stylish',          desc_pt: 'Mude a cor do tema',         desc_en: 'Change theme color' },
  { id: 'language_en',    icon: 'Globe',       tier: 'bronze',  category: 'app', name_pt: 'Bilíngue',          name_en: 'Bilingual',        desc_pt: 'Use o app em inglês',        desc_en: 'Use the app in English' },
  { id: 'export_csv',     icon: 'FileText',    tier: 'bronze',  category: 'app', name_pt: 'Exportador',        name_en: 'Exporter',         desc_pt: 'Exporte seus dados em CSV',  desc_en: 'Export data as CSV' },
  { id: 'export_json',    icon: 'FileJson',    tier: 'silver',  category: 'app', name_pt: 'Backup Feito',      name_en: 'Backup Done',      desc_pt: 'Exporte backup em JSON',     desc_en: 'Export JSON backup' },
  { id: 'import_data',    icon: 'FileInput',   tier: 'silver',  category: 'app', name_pt: 'Importador',        name_en: 'Importer',         desc_pt: 'Importe dados de backup',    desc_en: 'Import backup data' },
  { id: 'firebase_sync',  icon: 'Cloud',       tier: 'silver',  category: 'app', name_pt: 'Na Nuvem',          name_en: 'In the Cloud',     desc_pt: 'Sincronize com Firebase',    desc_en: 'Sync with Firebase' },
  { id: 'analytics_visit', icon: 'BarChart3',  tier: 'bronze',  category: 'app', name_pt: 'Analista',          name_en: 'Analyst',          desc_pt: 'Acesse a página de análises', desc_en: 'Visit analytics page' },
  { id: 'goals_visit',    icon: 'Target',      tier: 'bronze',  category: 'app', name_pt: 'Planejador',        name_en: 'Planner',          desc_pt: 'Acesse a página de metas',   desc_en: 'Visit goals page' },
  { id: 'profile_set',    icon: 'UserCircle',  tier: 'bronze',  category: 'app', name_pt: 'Identificado',      name_en: 'Identified',       desc_pt: 'Configure seu perfil',       desc_en: 'Set up your profile' },
  { id: 'notifications_on', icon: 'Bell',      tier: 'bronze',  category: 'app', name_pt: 'Notificado',        name_en: 'Notified',         desc_pt: 'Ative as notificações',      desc_en: 'Enable notifications' },
  { id: 'lite_mode_tried',  icon: 'Minimize2', tier: 'bronze',  category: 'app', name_pt: 'Simplificando',     name_en: 'Simplifying',      desc_pt: 'Experimente o Lite Mode',    desc_en: 'Try Lite Mode' },
  { id: 'compact_sidebar',  icon: 'PanelLeft', tier: 'bronze',  category: 'app', name_pt: 'Minimalista',       name_en: 'Minimalist',       desc_pt: 'Use a sidebar compacta',     desc_en: 'Use compact sidebar' },
  { id: 'heatmap_view',  icon: 'Grid3x3',      tier: 'bronze',  category: 'app', name_pt: 'Vendo o Padrão',    name_en: 'Seeing the Pattern', desc_pt: 'Veja o heatmap de atividade', desc_en: 'View the activity heatmap' },
  { id: 'cashout_set',   icon: 'Percent',      tier: 'bronze',  category: 'app', name_pt: 'Calculando',        name_en: 'Calculating',      desc_pt: 'Configure sua taxa de cashout', desc_en: 'Set your cashout rate' },
  { id: 'usd_mode',     icon: 'DollarSign',    tier: 'bronze',  category: 'app', name_pt: 'Em Dólar',          name_en: 'In Dollars',       desc_pt: 'Use o app em USD',           desc_en: 'Use the app in USD' },
  { id: 'dark_themed',  icon: 'Moon',          tier: 'bronze',  category: 'app', name_pt: 'Modo Escuro',       name_en: 'Dark Mode',        desc_pt: 'Use o tema escuro',          desc_en: 'Use dark theme' },
  { id: 'filter_used',  icon: 'Filter',        tier: 'bronze',  category: 'app', name_pt: 'Filtrador',         name_en: 'Filter User',      desc_pt: 'Use os filtros de drops',    desc_en: 'Use drop filters' },
  { id: 'search_used',  icon: 'Search',        tier: 'bronze',  category: 'app', name_pt: 'Investigador',      name_en: 'Investigator',     desc_pt: 'Use a busca de drops',       desc_en: 'Use drop search' },
  { id: 'lootflow_2y',  icon: 'Infinity',      tier: 'diamond', category: 'app', name_pt: 'Forever LootFlow',  name_en: 'Forever LootFlow', desc_pt: '2 anos de conta LootFlow',   desc_en: '2 years on LootFlow' },

  // ── COLECAO E ITENS (25 achievements) ─────────────────────────────────────
  { id: 'item_first',    icon: 'Sword',        tier: 'bronze',  category: 'collection', name_pt: 'Primeiro Item',   name_en: 'First Item',      desc_pt: 'Seu primeiro item na coleção', desc_en: 'First item in collection' },
  { id: 'item_10',       icon: 'Swords',       tier: 'bronze',  category: 'collection', name_pt: '10 Itens',        name_en: '10 Items',        desc_pt: '10 itens na coleção',      desc_en: '10 items in collection' },
  { id: 'item_25',       icon: 'Package',      tier: 'silver',  category: 'collection', name_pt: '25 Itens',        name_en: '25 Items',        desc_pt: '25 itens na coleção',      desc_en: '25 items in collection' },
  { id: 'item_50',       icon: 'PackageOpen',  tier: 'silver',  category: 'collection', name_pt: '50 Itens',        name_en: '50 Items',        desc_pt: '50 itens na coleção',      desc_en: '50 items in collection' },
  { id: 'item_100',      icon: 'Warehouse',    tier: 'gold',    category: 'collection', name_pt: '100 Itens',       name_en: '100 Items',       desc_pt: '100 itens na coleção',     desc_en: '100 items in collection' },
  { id: 'item_200',      icon: 'Boxes',        tier: 'gold',    category: 'collection', name_pt: '200 Itens',       name_en: '200 Items',       desc_pt: '200 itens na coleção',     desc_en: '200 items in collection' },
  { id: 'item_500',      icon: 'Building2',    tier: 'diamond', category: 'collection', name_pt: '500 Itens',       name_en: '500 Items',       desc_pt: '500 itens na coleção',     desc_en: '500 items in collection' },
  { id: 'item_unique_5', icon: 'LayoutGrid',   tier: 'bronze',  category: 'collection', name_pt: '5 Únicos',        name_en: '5 Unique',        desc_pt: '5 itens únicos',           desc_en: '5 unique items' },
  { id: 'item_unique_20',icon: 'Grid3x3',      tier: 'silver',  category: 'collection', name_pt: '20 Únicos',       name_en: '20 Unique',       desc_pt: '20 itens únicos',          desc_en: '20 unique items' },
  { id: 'item_unique_50',icon: 'LayoutTemplate',tier: 'gold',   category: 'collection', name_pt: '50 Únicos',       name_en: '50 Unique',       desc_pt: '50 itens únicos',          desc_en: '50 unique items' },
  { id: 'item_knife',    icon: 'Scissors',     tier: 'gold',    category: 'collection', name_pt: 'Faca!',           name_en: 'Knife!',          desc_pt: 'Receba uma faca como drop',  desc_en: 'Get a knife as drop' },
  { id: 'item_gloves',   icon: 'Hand',         tier: 'gold',    category: 'collection', name_pt: 'Luvas!',          name_en: 'Gloves!',         desc_pt: 'Receba luvas como drop',     desc_en: 'Get gloves as drop' },
  { id: 'item_case',     icon: 'Box',          tier: 'bronze',  category: 'collection', name_pt: 'Caixinha',        name_en: 'Little Box',      desc_pt: 'Receba uma caixa como drop', desc_en: 'Get a case as drop' },
  { id: 'item_sticker',  icon: 'Sticker',      tier: 'bronze',  category: 'collection', name_pt: 'Stickerizado',    name_en: 'Stickerized',     desc_pt: 'Receba um sticker como drop', desc_en: 'Get a sticker as drop' },
  { id: 'item_agent',    icon: 'UserCircle2',  tier: 'silver',  category: 'collection', name_pt: 'Agente Especial', name_en: 'Special Agent',   desc_pt: 'Receba um agente como drop', desc_en: 'Get an agent as drop' },
  { id: 'item_music_kit',icon: 'Music',        tier: 'silver',  category: 'collection', name_pt: 'DJ do CS',        name_en: 'CS DJ',           desc_pt: 'Receba um music kit',        desc_en: 'Get a music kit' },
  { id: 'item_covert',   icon: 'AlertTriangle', tier: 'diamond', category: 'collection', name_pt: 'Coverto!',       name_en: 'Covert!',         desc_pt: 'Receba um item Covert',      desc_en: 'Get a Covert item' },
  { id: 'item_fn',       icon: 'Sparkles',     tier: 'gold',    category: 'collection', name_pt: 'Factory New',     name_en: 'Factory New',     desc_pt: 'Item com wear Factory New',  desc_en: 'Item with Factory New wear' },
  { id: 'item_bs',       icon: 'Hammer',       tier: 'bronze',  category: 'collection', name_pt: 'Battle Scarred',  name_en: 'Battle Scarred',  desc_pt: 'Item com wear Battle Scarred', desc_en: 'Item with Battle Scarred wear' },
  { id: 'item_low_float',icon: 'Gauge',        tier: 'diamond', category: 'collection', name_pt: 'Impecável',       name_en: 'Flawless',        desc_pt: 'Item com float abaixo de 0.01', desc_en: 'Item with float below 0.01' },
  { id: 'item_StatTrak', icon: 'Cpu',          tier: 'gold',    category: 'collection', name_pt: 'StatTrak!',       name_en: 'StatTrak!',       desc_pt: 'Receba um item StatTrak',    desc_en: 'Get a StatTrak item' },
  { id: 'item_same_3',   icon: 'Copy',         tier: 'silver',  category: 'collection', name_pt: 'Repeteco',        name_en: 'Repeated',        desc_pt: '3x o mesmo item',            desc_en: '3 of the same item' },
  { id: 'item_same_5',   icon: 'CopyPlus',     tier: 'gold',    category: 'collection', name_pt: 'Combo',           name_en: 'Combo',           desc_pt: '5x o mesmo item',            desc_en: '5 of the same item' },
  { id: 'item_worth_r500', icon: 'TrendingUp', tier: 'diamond', category: 'collection', name_pt: 'Item Valioso',   name_en: 'Valuable Item',   desc_pt: 'Item com valor acima de R$500', desc_en: 'Item worth over R$500' },
  { id: 'item_collection_complete', icon: 'BookOpen', tier: 'diamond', category: 'collection', name_pt: 'Colecionador', name_en: 'Collector', desc_pt: 'Colete 100 itens diferentes', desc_en: 'Collect 100 different items' },

  // ── SOCIAL E RANKING (15 achievements) ────────────────────────────────────
  { id: 'friend_add_1',   icon: 'UserPlus',    tier: 'bronze',  category: 'social', name_pt: 'Amigo Adicionado',  name_en: 'Friend Added',     desc_pt: 'Adicione 1 amigo',           desc_en: 'Add 1 friend' },
  { id: 'friend_add_5',   icon: 'Users',       tier: 'silver',  category: 'social', name_pt: '5 Amigos',          name_en: '5 Friends',        desc_pt: 'Adicione 5 amigos',          desc_en: 'Add 5 friends' },
  { id: 'friend_add_10',  icon: 'UsersRound',  tier: 'gold',    category: 'social', name_pt: 'Popular',           name_en: 'Popular',          desc_pt: 'Adicione 10 amigos',         desc_en: 'Add 10 friends' },
  { id: 'rank_top_10',    icon: 'ListOrdered', tier: 'silver',  category: 'social', name_pt: 'Top 10',            name_en: 'Top 10',           desc_pt: 'Entre no top 10 do ranking', desc_en: 'Enter top 10 ranking' },
  { id: 'rank_top_3',     icon: 'Medal',       tier: 'gold',    category: 'social', name_pt: 'Top 3',             name_en: 'Top 3',            desc_pt: 'Entre no top 3 do ranking',  desc_en: 'Enter top 3 ranking' },
  { id: 'rank_first',     icon: 'Crown',       tier: 'diamond', category: 'social', name_pt: 'Número 1',          name_en: 'Number 1',         desc_pt: 'Seja #1 do ranking',         desc_en: 'Be #1 in rankings' },
  { id: 'profile_public', icon: 'Globe',       tier: 'bronze',  category: 'social', name_pt: 'Perfil Público',    name_en: 'Public Profile',   desc_pt: 'Torne seu perfil público',   desc_en: 'Make your profile public' },
  { id: 'profile_visited',icon: 'Eye',         tier: 'silver',  category: 'social', name_pt: 'Visitado',          name_en: 'Visited',          desc_pt: 'Perfil visitado por alguém', desc_en: 'Profile visited by someone' },
  { id: 'title_equipped', icon: 'Tag',         tier: 'bronze',  category: 'social', name_pt: 'Com Título',        name_en: 'Titled',           desc_pt: 'Equipe um título',           desc_en: 'Equip a title' },
  { id: 'request_sent',   icon: 'Send',        tier: 'bronze',  category: 'social', name_pt: 'Convite Enviado',   name_en: 'Invite Sent',      desc_pt: 'Envie pedido de amizade',    desc_en: 'Send a friend request' },
  { id: 'request_accept', icon: 'UserCheck',   tier: 'bronze',  category: 'social', name_pt: 'Amizade!',          name_en: 'Friendship!',      desc_pt: 'Aceite um pedido de amizade', desc_en: 'Accept a friend request' },
  { id: 'friend_drop_same_week', icon: 'CalendarDays', tier: 'silver', category: 'social', name_pt: 'Sincronizados', name_en: 'In Sync', desc_pt: 'Drop na mesma semana que um amigo', desc_en: 'Drop same week as a friend' },
  { id: 'leaderboard_weekly', icon: 'BarChart2', tier: 'gold',  category: 'social', name_pt: 'Semana Rankeada',   name_en: 'Ranked Week',      desc_pt: 'Apareça no leaderboard semanal', desc_en: 'Appear on weekly leaderboard' },
  { id: 'social_100xp',   icon: 'Sparkles',    tier: 'silver',  category: 'social', name_pt: '100 XP Social',     name_en: '100 Social XP',   desc_pt: '100 XP de atividades sociais', desc_en: '100 XP from social activities' },
  { id: 'social_share',   icon: 'Share2',      tier: 'bronze',  category: 'social', name_pt: 'Compartilhado',     name_en: 'Shared',           desc_pt: 'Compartilhe seu perfil',     desc_en: 'Share your profile' },

  // ── ABERTURA DE CAIXAS (20 achievements) ──────────────────────────────────
  { id: 'case_first',    icon: 'Gift',         tier: 'bronze',  category: 'cases', name_pt: 'Primeira Caixa',    name_en: 'First Case',       desc_pt: 'Abra 1 caixa',              desc_en: 'Open 1 case' },
  { id: 'case_5',        icon: 'Package',      tier: 'bronze',  category: 'cases', name_pt: '5 Caixas',          name_en: '5 Cases',          desc_pt: 'Abra 5 caixas',             desc_en: 'Open 5 cases' },
  { id: 'case_10',       icon: 'PackageOpen',  tier: 'bronze',  category: 'cases', name_pt: '10 Caixas',         name_en: '10 Cases',         desc_pt: 'Abra 10 caixas',            desc_en: 'Open 10 cases' },
  { id: 'case_25',       icon: 'Box',          tier: 'silver',  category: 'cases', name_pt: '25 Caixas',         name_en: '25 Cases',         desc_pt: 'Abra 25 caixas',            desc_en: 'Open 25 cases' },
  { id: 'case_50',       icon: 'Boxes',        tier: 'silver',  category: 'cases', name_pt: '50 Caixas',         name_en: '50 Cases',         desc_pt: 'Abra 50 caixas',            desc_en: 'Open 50 cases' },
  { id: 'case_100',      icon: 'Warehouse',    tier: 'gold',    category: 'cases', name_pt: '100 Caixas',        name_en: '100 Cases',        desc_pt: 'Abra 100 caixas',           desc_en: 'Open 100 cases' },
  { id: 'case_200',      icon: 'Building2',    tier: 'gold',    category: 'cases', name_pt: '200 Caixas',        name_en: '200 Cases',        desc_pt: 'Abra 200 caixas',           desc_en: 'Open 200 cases' },
  { id: 'case_500',      icon: 'Crown',        tier: 'diamond', category: 'cases', name_pt: '500 Caixas',        name_en: '500 Cases',        desc_pt: 'Abra 500 caixas',           desc_en: 'Open 500 cases' },
  { id: 'case_profit',   icon: 'TrendingUp',   tier: 'silver',  category: 'cases', name_pt: 'Lucrativo',         name_en: 'Profitable',       desc_pt: 'Item de caixa supera custo', desc_en: 'Case item exceeds key cost' },
  { id: 'case_loss_10',  icon: 'TrendingDown', tier: 'bronze',  category: 'cases', name_pt: 'No Prejuízo',       name_en: 'In the Red',       desc_pt: '10 caixas com prejuízo',    desc_en: '10 losing cases' },
  { id: 'case_lucky',    icon: 'Dice5',        tier: 'gold',    category: 'cases', name_pt: 'Sortudo!',          name_en: 'Lucky!',           desc_pt: 'Item 10x o valor da chave',  desc_en: 'Item 10x key price' },
  { id: 'case_mega_lucky',icon: 'Sparkles',    tier: 'diamond', category: 'cases', name_pt: 'Mega Sortudo!',     name_en: 'Mega Lucky!',      desc_pt: 'Item 50x o valor da chave',  desc_en: 'Item 50x key price' },
  { id: 'case_sold_all', icon: 'ShoppingBag',  tier: 'silver',  category: 'cases', name_pt: 'Vendeu Tudo',       name_en: 'Sold Everything',  desc_pt: 'Venda todos os itens de caixas', desc_en: 'Sell all case items' },
  { id: 'case_roi_pos',  icon: 'BarChart2',    tier: 'gold',    category: 'cases', name_pt: 'ROI Positivo Caixa', name_en: 'Positive Case ROI', desc_pt: 'ROI positivo em caixas',   desc_en: 'Positive ROI on cases' },
  { id: 'case_knife_open', icon: 'Scissors',   tier: 'diamond', category: 'cases', name_pt: 'Faca na Caixa!',   name_en: 'Knife Unboxed!',   desc_pt: 'Retire uma faca de uma caixa', desc_en: 'Unbox a knife from a case' },
  { id: 'case_gloves_open', icon: 'Hand',      tier: 'diamond', category: 'cases', name_pt: 'Luvas na Caixa!',  name_en: 'Gloves Unboxed!',  desc_pt: 'Retire luvas de uma caixa',  desc_en: 'Unbox gloves from a case' },
  { id: 'case_covert_open', icon: 'AlertTriangle', tier: 'gold', category: 'cases', name_pt: 'Covert da Caixa', name_en: 'Covert Unboxed',  desc_pt: 'Retire um Covert de caixa',  desc_en: 'Unbox a Covert item' },
  { id: 'case_stattrak_open', icon: 'Cpu',     tier: 'gold',    category: 'cases', name_pt: 'StatTrak na Caixa', name_en: 'StatTrak Unboxed', desc_pt: 'Retire um StatTrak de caixa', desc_en: 'Unbox a StatTrak item' },
  { id: 'case_streak_7', icon: 'Flame',        tier: 'gold',    category: 'cases', name_pt: '7 Dias de Caixas',  name_en: '7 Day Streak',     desc_pt: 'Abra caixas por 7 dias seguidos', desc_en: 'Open cases 7 days in a row' },
  { id: 'case_budget',   icon: 'Wallet',       tier: 'silver',  category: 'cases', name_pt: 'No Orçamento',      name_en: 'On Budget',        desc_pt: 'Gaste R$100+ em caixas',    desc_en: 'Spend R$100+ on cases' },

  // ── XP E NIVEL (20 achievements) ──────────────────────────────────────────
  { id: 'xp_first',     icon: 'Star',          tier: 'bronze',  category: 'xp', name_pt: 'Primeiro XP',          name_en: 'First XP',         desc_pt: 'Ganhe qualquer XP',          desc_en: 'Earn any XP' },
  { id: 'level_2',      icon: 'ArrowUp',       tier: 'bronze',  category: 'xp', name_pt: 'Nível 2',              name_en: 'Level 2',          desc_pt: 'Alcance o nível 2',          desc_en: 'Reach level 2' },
  { id: 'level_3',      icon: 'ArrowUpCircle', tier: 'bronze',  category: 'xp', name_pt: 'Nível 3',              name_en: 'Level 3',          desc_pt: 'Alcance o nível 3',          desc_en: 'Reach level 3' },
  { id: 'level_5',      icon: 'ChevronsUp',    tier: 'silver',  category: 'xp', name_pt: 'Nível 5',              name_en: 'Level 5',          desc_pt: 'Alcance o nível 5',          desc_en: 'Reach level 5' },
  { id: 'level_7',      icon: 'TrendingUp',    tier: 'silver',  category: 'xp', name_pt: 'Nível 7',              name_en: 'Level 7',          desc_pt: 'Alcance o nível 7',          desc_en: 'Reach level 7' },
  { id: 'level_10',     icon: 'Award',         tier: 'gold',    category: 'xp', name_pt: 'Nível 10',             name_en: 'Level 10',         desc_pt: 'Alcance o nível 10',         desc_en: 'Reach level 10' },
  { id: 'level_15',     icon: 'Medal',         tier: 'gold',    category: 'xp', name_pt: 'Nível 15',             name_en: 'Level 15',         desc_pt: 'Alcance o nível 15',         desc_en: 'Reach level 15' },
  { id: 'level_20',     icon: 'Trophy',        tier: 'gold',    category: 'xp', name_pt: 'Nível 20',             name_en: 'Level 20',         desc_pt: 'Alcance o nível 20',         desc_en: 'Reach level 20' },
  { id: 'level_30',     icon: 'Crown',         tier: 'diamond', category: 'xp', name_pt: 'Nível 30',             name_en: 'Level 30',         desc_pt: 'Alcance o nível 30',         desc_en: 'Reach level 30' },
  { id: 'level_50',     icon: 'Gem',           tier: 'diamond', category: 'xp', name_pt: 'Nível 50',             name_en: 'Level 50',         desc_pt: 'Alcance o nível 50',         desc_en: 'Reach level 50' },
  { id: 'level_100',    icon: 'Sparkles',      tier: 'diamond', category: 'xp', name_pt: 'Nível 100',            name_en: 'Level 100',        desc_pt: 'Alcance o nível 100',        desc_en: 'Reach level 100' },
  { id: 'xp_100',       icon: 'Zap',           tier: 'bronze',  category: 'xp', name_pt: '100 XP',              name_en: '100 XP',           desc_pt: 'Acumule 100 XP',             desc_en: 'Accumulate 100 XP' },
  { id: 'xp_500',       icon: 'ZapOff',        tier: 'silver',  category: 'xp', name_pt: '500 XP',              name_en: '500 XP',           desc_pt: 'Acumule 500 XP',             desc_en: 'Accumulate 500 XP' },
  { id: 'xp_1000',      icon: 'Flame',         tier: 'silver',  category: 'xp', name_pt: '1000 XP',             name_en: '1000 XP',          desc_pt: 'Acumule 1000 XP',            desc_en: 'Accumulate 1000 XP' },
  { id: 'xp_5000',      icon: 'FlameKindling', tier: 'gold',    category: 'xp', name_pt: '5000 XP',             name_en: '5000 XP',          desc_pt: 'Acumule 5000 XP',            desc_en: 'Accumulate 5000 XP' },
  { id: 'xp_10000',     icon: 'TrendingUp',    tier: 'gold',    category: 'xp', name_pt: '10.000 XP',           name_en: '10,000 XP',        desc_pt: 'Acumule 10.000 XP',          desc_en: 'Accumulate 10,000 XP' },
  { id: 'xp_50000',     icon: 'BarChart4',     tier: 'diamond', category: 'xp', name_pt: '50.000 XP',           name_en: '50,000 XP',        desc_pt: 'Acumule 50.000 XP',          desc_en: 'Accumulate 50,000 XP' },
  { id: 'title_first',  icon: 'Tag',           tier: 'bronze',  category: 'xp', name_pt: 'Primeiro Título',      name_en: 'First Title',      desc_pt: 'Desbloqueie um título',      desc_en: 'Unlock a title' },
  { id: 'title_5',      icon: 'Tags',          tier: 'silver',  category: 'xp', name_pt: '5 Títulos',            name_en: '5 Titles',         desc_pt: 'Desbloqueie 5 títulos',      desc_en: 'Unlock 5 titles' },
  { id: 'title_all',    icon: 'Crown',         tier: 'diamond', category: 'xp', name_pt: 'Todos os Títulos',     name_en: 'All Titles',       desc_pt: 'Desbloqueie todos os títulos', desc_en: 'Unlock all titles' },

  // ── ANÁLISE E INSIGHTS (15 achievements) ──────────────────────────────────
  { id: 'insight_first', icon: 'Lightbulb',    tier: 'bronze',  category: 'insights', name_pt: 'Primeiro Insight', name_en: 'First Insight',   desc_pt: 'Veja seu primeiro insight',  desc_en: 'See your first insight' },
  { id: 'heatmap_green', icon: 'Calendar',     tier: 'silver',  category: 'insights', name_pt: 'Heatmap Verde',    name_en: 'Green Heatmap',   desc_pt: '80%+ dos dias ativos',       desc_en: '80%+ active days' },
  { id: 'analytics_30',  icon: 'BarChart3',    tier: 'silver',  category: 'insights', name_pt: '30 Dias de Dados', name_en: '30 Days of Data', desc_pt: '30 dias de histórico',       desc_en: '30 days of history' },
  { id: 'analytics_90',  icon: 'BarChart4',    tier: 'gold',    category: 'insights', name_pt: '90 Dias de Dados', name_en: '90 Days of Data', desc_pt: '90 dias de histórico',       desc_en: '90 days of history' },
  { id: 'analytics_180', icon: 'LineChart',    tier: 'gold',    category: 'insights', name_pt: '6 Meses de Dados', name_en: '6 Months Data',   desc_pt: '6 meses de histórico',       desc_en: '6 months of history' },
  { id: 'analytics_365', icon: 'TrendingUp',   tier: 'diamond', category: 'insights', name_pt: '1 Ano de Dados',   name_en: '1 Year of Data',  desc_pt: '1 ano de histórico',         desc_en: '1 year of history' },
  { id: 'eta_accurate',  icon: 'Clock',        tier: 'gold',    category: 'insights', name_pt: 'Pontual',          name_en: 'Punctual',        desc_pt: 'Meta atingida na semana prevista', desc_en: 'Goal met on predicted week' },
  { id: 'avg_weekly',    icon: 'Activity',     tier: 'silver',  category: 'insights', name_pt: 'Na Média',         name_en: 'On Average',      desc_pt: 'Média semanal consistente por 8 semanas', desc_en: 'Consistent weekly avg for 8 weeks' },
  { id: 'hall_of_fame',  icon: 'Star',         tier: 'gold',    category: 'insights', name_pt: 'Hall da Fama',     name_en: 'Hall of Fame',    desc_pt: 'Entre no Hall da Fama',      desc_en: 'Enter the Hall of Fame' },
  { id: 'top_earner',    icon: 'DollarSign',   tier: 'gold',    category: 'insights', name_pt: 'Top Earner',       name_en: 'Top Earner',      desc_pt: 'Semana com maior cashout',   desc_en: 'Week with highest cashout' },
  { id: 'predict_payback', icon: 'Target',     tier: 'silver',  category: 'insights', name_pt: 'Previsto!',       name_en: 'Predicted!',      desc_pt: 'Veja a previsão de payback', desc_en: 'View payback prediction' },
  { id: 'multi_insights', icon: 'LayoutDashboard', tier: 'gold', category: 'insights', name_pt: 'Painel de Insights', name_en: 'Insights Panel', desc_pt: 'Veja 5+ insights diferentes', desc_en: 'View 5+ different insights' },
  { id: 'insight_streak', icon: 'Flame',       tier: 'gold',    category: 'insights', name_pt: 'Insights Diários', name_en: 'Daily Insights',  desc_pt: 'Acesse o app por 7 dias seguidos', desc_en: 'Access app 7 days in a row' },
  { id: 'best_drop_week', icon: 'Trophy',      tier: 'diamond', category: 'insights', name_pt: 'Melhor Semana',    name_en: 'Best Week',       desc_pt: 'Bata seu próprio recorde semanal de cashout', desc_en: 'Beat your weekly cashout record' },
  { id: 'roi_growth',    icon: 'TrendingUp',   tier: 'gold',    category: 'insights', name_pt: 'Crescendo Sempre', name_en: 'Always Growing',  desc_pt: 'ROI crescente por 4 semanas', desc_en: 'Growing ROI for 4 weeks' },

  // ── SECRETAS / EASTER EGGS (20 achievements) ──────────────────────────────
  { id: 'secret_night', icon: 'Moon',          tier: 'silver',  category: 'secret', name_pt: 'Coruja',           name_en: 'Night Owl',        desc_pt: 'Drop registrado depois da meia-noite', desc_en: 'Drop registered after midnight' },
  { id: 'secret_early', icon: 'Sunrise',       tier: 'silver',  category: 'secret', name_pt: 'Madrugada',        name_en: 'Early Bird',       desc_pt: 'Drop registrado antes das 6h', desc_en: 'Drop registered before 6am' },
  { id: 'secret_newyear', icon: 'PartyPopper', tier: 'gold',    category: 'secret', name_pt: 'Feliz Ano Novo!',  name_en: 'Happy New Year!',  desc_pt: 'Drop no dia 01/01',          desc_en: 'Drop on Jan 1st' },
  { id: 'secret_dec25', icon: 'Gift',          tier: 'gold',    category: 'secret', name_pt: 'Feliz Natal!',     name_en: 'Merry Christmas!', desc_pt: 'Drop no dia 25/12',          desc_en: 'Drop on Dec 25th' },
  { id: 'secret_420',   icon: 'Leaf',          tier: 'diamond', category: 'secret', name_pt: '420',              name_en: '420',              desc_pt: '420 drops registrados',      desc_en: '420 drops registered' },
  { id: 'secret_69',    icon: 'Heart',         tier: 'gold',    category: 'secret', name_pt: 'Nice',             name_en: 'Nice',             desc_pt: '69 drops registrados',       desc_en: '69 drops registered' },
  { id: 'secret_1337',  icon: 'Code',          tier: 'diamond', category: 'secret', name_pt: 'L33T',             name_en: 'L33T',             desc_pt: '1337 drops registrados',     desc_en: '1337 drops registered' },
  { id: 'secret_7777',  icon: 'Dice5',         tier: 'diamond', category: 'secret', name_pt: '7777',             name_en: '7777',             desc_pt: '7777 de cashout total',      desc_en: 'R$7777 total cashout' },
  { id: 'secret_all_bronze', icon: 'Medal',    tier: 'silver',  category: 'secret', name_pt: 'Caçador Bronze',   name_en: 'Bronze Hunter',    desc_pt: 'Todas conquistas bronze',    desc_en: 'All bronze achievements' },
  { id: 'secret_all_silver', icon: 'Award',    tier: 'gold',    category: 'secret', name_pt: 'Caçador Prata',    name_en: 'Silver Hunter',    desc_pt: 'Todas conquistas silver',    desc_en: 'All silver achievements' },
  { id: 'secret_all_gold',   icon: 'Trophy',   tier: 'diamond', category: 'secret', name_pt: 'Caçador Ouro',     name_en: 'Gold Hunter',      desc_pt: 'Todas conquistas ouro',      desc_en: 'All gold achievements' },
  { id: 'secret_collector',  icon: 'Gem',      tier: 'diamond', category: 'secret', name_pt: 'Caçador Total',    name_en: 'Achievement Hunter', desc_pt: '200+ conquistas desbloqueadas', desc_en: '200+ achievements unlocked' },
  { id: 'secret_pi',    icon: 'Circle',        tier: 'silver',  category: 'secret', name_pt: 'Pi',               name_en: 'Pi',               desc_pt: '314 drops registrados',      desc_en: '314 drops registered' },
  { id: 'secret_fibonacci', icon: 'Cpu',       tier: 'gold',    category: 'secret', name_pt: 'Fibonacci',        name_en: 'Fibonacci',        desc_pt: 'Sequência Fibonacci de drops: 1,1,2,3,5', desc_en: 'Fibonacci drop sequence' },
  { id: 'secret_rich',  icon: 'Crown',         tier: 'diamond', category: 'secret', name_pt: 'Rico de CS',       name_en: 'CS Rich',          desc_pt: 'R$10.000 total em cashout',  desc_en: 'R$10,000 total cashout' },
  { id: 'secret_speed', icon: 'Gauge',         tier: 'gold',    category: 'secret', name_pt: 'Veloz',            name_en: 'Speed Runner',     desc_pt: 'Payback em menos de 4 semanas', desc_en: 'Payback in under 4 weeks' },
  { id: 'secret_grind', icon: 'Hammer',        tier: 'diamond', category: 'secret', name_pt: 'Grinder',          name_en: 'Grinder',          desc_pt: 'Drop todos os dias por 7 dias seguidos', desc_en: 'Drop every day for 7 days' },
  { id: 'secret_patience', icon: 'Hourglass',  tier: 'gold',    category: 'secret', name_pt: 'Paciência',        name_en: 'Patience',         desc_pt: 'Conta com 52+ semanas sem payback', desc_en: 'Account 52+ weeks without payback' },
  { id: 'secret_comeback2', icon: 'RotateCcw', tier: 'gold',    category: 'secret', name_pt: 'Fênix',            name_en: 'Phoenix',          desc_pt: 'Drop após 6+ meses de inatividade', desc_en: 'Drop after 6+ months inactive' },
  { id: 'secret_allcats', icon: 'LayoutGrid',  tier: 'diamond', category: 'secret', name_pt: 'Completo',         name_en: 'Complete',         desc_pt: 'Conquista em todas as categorias', desc_en: 'Achievement in all categories' },

  // ── EXTRAS / MAIS DROPS, VALOR, SEMANAS (62 para completar 357) ──────────
  { id: 'drop_25',       icon: 'Package',      tier: 'bronze',  category: 'drops', name_pt: '25 Drops',           name_en: '25 Drops',         desc_pt: 'Registre 25 drops',          desc_en: 'Register 25 drops' },
  { id: 'drop_60',       icon: 'Archive',      tier: 'silver',  category: 'drops', name_pt: '60 Drops',           name_en: '60 Drops',         desc_pt: 'Registre 60 drops',          desc_en: 'Register 60 drops' },
  { id: 'drop_80',       icon: 'Boxes',        tier: 'silver',  category: 'drops', name_pt: '80 Drops',           name_en: '80 Drops',         desc_pt: 'Registre 80 drops',          desc_en: 'Register 80 drops' },
  { id: 'drop_125',      icon: 'LayersIcon',   tier: 'gold',    category: 'drops', name_pt: '125 Drops',          name_en: '125 Drops',        desc_pt: 'Registre 125 drops',         desc_en: 'Register 125 drops' },
  { id: 'drop_175',      icon: 'Award',        tier: 'gold',    category: 'drops', name_pt: '175 Drops',          name_en: '175 Drops',        desc_pt: 'Registre 175 drops',         desc_en: 'Register 175 drops' },
  { id: 'drop_225',      icon: 'Medal',        tier: 'gold',    category: 'drops', name_pt: '225 Drops',          name_en: '225 Drops',        desc_pt: 'Registre 225 drops',         desc_en: 'Register 225 drops' },
  { id: 'drop_350',      icon: 'Star',         tier: 'diamond', category: 'drops', name_pt: '350 Drops',          name_en: '350 Drops',        desc_pt: 'Registre 350 drops',         desc_en: 'Register 350 drops' },
  { id: 'drop_450',      icon: 'Stars',        tier: 'diamond', category: 'drops', name_pt: '450 Drops',          name_en: '450 Drops',        desc_pt: 'Registre 450 drops',         desc_en: 'Register 450 drops' },
  { id: 'cashout_r75',   icon: 'DollarSign',   tier: 'bronze',  category: 'value', name_pt: 'R$75',               name_en: 'R$75',             desc_pt: 'R$75 em cashout total',      desc_en: 'R$75 total cashout' },
  { id: 'cashout_r150',  icon: 'Banknote',     tier: 'silver',  category: 'value', name_pt: 'R$150',              name_en: 'R$150',            desc_pt: 'R$150 em cashout total',     desc_en: 'R$150 total cashout' },
  { id: 'cashout_r200',  icon: 'Wallet',       tier: 'silver',  category: 'value', name_pt: 'R$200',              name_en: 'R$200',            desc_pt: 'R$200 em cashout total',     desc_en: 'R$200 total cashout' },
  { id: 'cashout_r350',  icon: 'PiggyBank',    tier: 'silver',  category: 'value', name_pt: 'R$350',              name_en: 'R$350',            desc_pt: 'R$350 em cashout total',     desc_en: 'R$350 total cashout' },
  { id: 'cashout_r750',  icon: 'TrendingUp',   tier: 'gold',    category: 'value', name_pt: 'R$750',              name_en: 'R$750',            desc_pt: 'R$750 em cashout total',     desc_en: 'R$750 total cashout' },
  { id: 'cashout_r1500', icon: 'BarChart3',    tier: 'gold',    category: 'value', name_pt: 'R$1500',             name_en: 'R$1500',           desc_pt: 'R$1500 em cashout total',    desc_en: 'R$1500 total cashout' },
  { id: 'cashout_r3000', icon: 'BarChart4',    tier: 'diamond', category: 'value', name_pt: 'R$3000',             name_en: 'R$3000',           desc_pt: 'R$3000 em cashout total',    desc_en: 'R$3000 total cashout' },
  { id: 'streak_10',     icon: 'Flame',        tier: 'gold',    category: 'streak', name_pt: 'Sequência de 10', name_en: '10-Week Streak',     desc_pt: 'Drops em 10 semanas seguidas', desc_en: 'Drops in 10 consecutive weeks' },
  { id: 'streak_14',     icon: 'FlameKindling',tier: 'gold',    category: 'streak', name_pt: 'Sequência de 14', name_en: '14-Week Streak',     desc_pt: 'Drops em 14 semanas seguidas', desc_en: 'Drops in 14 consecutive weeks' },
  { id: 'streak_18',     icon: 'Sparkles',     tier: 'gold',    category: 'streak', name_pt: 'Sequência de 18', name_en: '18-Week Streak',     desc_pt: 'Drops em 18 semanas seguidas', desc_en: 'Drops in 18 consecutive weeks' },
  { id: 'streak_24',     icon: 'TrendingUp',   tier: 'gold',    category: 'streak', name_pt: 'Sequência de 24', name_en: '24-Week Streak',     desc_pt: 'Drops em 24 semanas seguidas', desc_en: 'Drops in 24 consecutive weeks' },
  { id: 'streak_30',     icon: 'Trophy',       tier: 'diamond', category: 'streak', name_pt: 'Sequência de 30', name_en: '30-Week Streak',     desc_pt: 'Drops em 30 semanas seguidas', desc_en: 'Drops in 30 consecutive weeks' },
  { id: 'streak_40',     icon: 'Award',        tier: 'diamond', category: 'streak', name_pt: 'Sequência de 40', name_en: '40-Week Streak',     desc_pt: 'Drops em 40 semanas seguidas', desc_en: 'Drops in 40 consecutive weeks' },
  { id: 'account_4',    icon: 'Users',         tier: 'bronze',  category: 'accounts', name_pt: 'Quarteto',      name_en: 'Quartet',          desc_pt: 'Adicione 4 contas',          desc_en: 'Add 4 accounts' },
  { id: 'account_7',    icon: 'UsersRound',    tier: 'silver',  category: 'accounts', name_pt: 'Time de 7',     name_en: 'Team of 7',        desc_pt: 'Adicione 7 contas',          desc_en: 'Add 7 accounts' },
  { id: 'account_15',   icon: 'Building',      tier: 'gold',    category: 'accounts', name_pt: 'Equipe Grande', name_en: 'Big Team',         desc_pt: 'Adicione 15 contas',         desc_en: 'Add 15 accounts' },
  { id: 'account_30',   icon: 'Building2',     tier: 'gold',    category: 'accounts', name_pt: 'Corporação',    name_en: 'Corporation',      desc_pt: 'Adicione 30 contas',         desc_en: 'Add 30 accounts' },
  { id: 'goal_created_3', icon: 'Crosshair',   tier: 'bronze',  category: 'goals', name_pt: '3 Metas',         name_en: '3 Goals',          desc_pt: 'Crie 3 metas',              desc_en: 'Create 3 goals' },
  { id: 'goal_completed_2', icon: 'CheckCircle', tier: 'bronze', category: 'goals', name_pt: '2 Metas Cumpridas', name_en: '2 Goals Done', desc_pt: 'Complete 2 metas',           desc_en: 'Complete 2 goals' },
  { id: 'goal_completed_7', icon: 'ListChecks', tier: 'gold',   category: 'goals', name_pt: '7 Metas Cumpridas', name_en: '7 Goals Done', desc_pt: 'Complete 7 metas',           desc_en: 'Complete 7 goals' },
  { id: 'case_3',        icon: 'Box',           tier: 'bronze', category: 'cases', name_pt: '3 Caixas',         name_en: '3 Cases',          desc_pt: 'Abra 3 caixas',              desc_en: 'Open 3 cases' },
  { id: 'case_15',       icon: 'Package',       tier: 'bronze', category: 'cases', name_pt: '15 Caixas',        name_en: '15 Cases',         desc_pt: 'Abra 15 caixas',            desc_en: 'Open 15 cases' },
  { id: 'case_35',       icon: 'PackageOpen',   tier: 'silver', category: 'cases', name_pt: '35 Caixas',        name_en: '35 Cases',         desc_pt: 'Abra 35 caixas',            desc_en: 'Open 35 cases' },
  { id: 'case_75',       icon: 'Boxes',         tier: 'silver', category: 'cases', name_pt: '75 Caixas',        name_en: '75 Cases',         desc_pt: 'Abra 75 caixas',            desc_en: 'Open 75 cases' },
  { id: 'case_150',      icon: 'Warehouse',     tier: 'gold',   category: 'cases', name_pt: '150 Caixas',       name_en: '150 Cases',        desc_pt: 'Abra 150 caixas',           desc_en: 'Open 150 cases' },
  { id: 'case_300',      icon: 'Building2',     tier: 'gold',   category: 'cases', name_pt: '300 Caixas',       name_en: '300 Cases',        desc_pt: 'Abra 300 caixas',           desc_en: 'Open 300 cases' },
  { id: 'level_4',       icon: 'ArrowUpCircle', tier: 'bronze', category: 'xp',   name_pt: 'Nível 4',           name_en: 'Level 4',          desc_pt: 'Alcance o nível 4',          desc_en: 'Reach level 4' },
  { id: 'level_6',       icon: 'ChevronsUp',    tier: 'silver', category: 'xp',   name_pt: 'Nível 6',           name_en: 'Level 6',          desc_pt: 'Alcance o nível 6',          desc_en: 'Reach level 6' },
  { id: 'level_8',       icon: 'TrendingUp',    tier: 'silver', category: 'xp',   name_pt: 'Nível 8',           name_en: 'Level 8',          desc_pt: 'Alcance o nível 8',          desc_en: 'Reach level 8' },
  { id: 'level_12',      icon: 'Award',         tier: 'gold',   category: 'xp',   name_pt: 'Nível 12',          name_en: 'Level 12',         desc_pt: 'Alcance o nível 12',         desc_en: 'Reach level 12' },
  { id: 'level_25',      icon: 'Medal',         tier: 'gold',   category: 'xp',   name_pt: 'Nível 25',          name_en: 'Level 25',         desc_pt: 'Alcance o nível 25',         desc_en: 'Reach level 25' },
  { id: 'level_40',      icon: 'Trophy',        tier: 'diamond',category: 'xp',   name_pt: 'Nível 40',          name_en: 'Level 40',         desc_pt: 'Alcance o nível 40',         desc_en: 'Reach level 40' },
  { id: 'level_75',      icon: 'Crown',         tier: 'diamond',category: 'xp',   name_pt: 'Nível 75',          name_en: 'Level 75',         desc_pt: 'Alcance o nível 75',         desc_en: 'Reach level 75' },
  { id: 'xp_250',        icon: 'Zap',           tier: 'bronze', category: 'xp',   name_pt: '250 XP',            name_en: '250 XP',           desc_pt: 'Acumule 250 XP',             desc_en: 'Accumulate 250 XP' },
  { id: 'xp_750',        icon: 'ZapOff',        tier: 'silver', category: 'xp',   name_pt: '750 XP',            name_en: '750 XP',           desc_pt: 'Acumule 750 XP',             desc_en: 'Accumulate 750 XP' },
  { id: 'xp_2500',       icon: 'Flame',         tier: 'gold',   category: 'xp',   name_pt: '2500 XP',           name_en: '2500 XP',          desc_pt: 'Acumule 2500 XP',            desc_en: 'Accumulate 2500 XP' },
  { id: 'xp_25000',      icon: 'FlameKindling', tier: 'diamond',category: 'xp',   name_pt: '25.000 XP',         name_en: '25,000 XP',        desc_pt: 'Acumule 25.000 XP',          desc_en: 'Accumulate 25,000 XP' },
  { id: 'friend_add_3',  icon: 'Users',         tier: 'bronze', category: 'social', name_pt: '3 Amigos',        name_en: '3 Friends',        desc_pt: 'Adicione 3 amigos',          desc_en: 'Add 3 friends' },
  { id: 'friend_add_7',  icon: 'UsersRound',    tier: 'silver', category: 'social', name_pt: '7 Amigos',        name_en: '7 Friends',        desc_pt: 'Adicione 7 amigos',          desc_en: 'Add 7 friends' },
  { id: 'perfect_week_2', icon: 'CheckCircle',  tier: 'bronze', category: 'streak', name_pt: '2 Semanas Perfeitas', name_en: '2 Perfect Weeks', desc_pt: '2 semanas perfeitas', desc_en: '2 perfect weeks' },
  { id: 'perfect_week_7', icon: 'ShieldCheck',  tier: 'silver', category: 'streak', name_pt: '7 Semanas Perfeitas', name_en: '7 Perfect Weeks', desc_pt: '7 semanas perfeitas', desc_en: '7 perfect weeks' },
  { id: 'perfect_week_15', icon: 'Shield',      tier: 'gold',   category: 'streak', name_pt: '15 Semanas Perfeitas', name_en: '15 Perfect Weeks', desc_pt: '15 semanas perfeitas', desc_en: '15 perfect weeks' },
  { id: 'perfect_week_20', icon: 'ShieldHalf',  tier: 'gold',   category: 'streak', name_pt: '20 Semanas Perfeitas', name_en: '20 Perfect Weeks', desc_pt: '20 semanas perfeitas', desc_en: '20 perfect weeks' },
  { id: 'perfect_week_30', icon: 'Gem',         tier: 'diamond',category: 'streak', name_pt: '30 Semanas Perfeitas', name_en: '30 Perfect Weeks', desc_pt: '30 semanas perfeitas', desc_en: '30 perfect weeks' },
  { id: 'item_unique_10', icon: 'LayoutGrid',   tier: 'bronze', category: 'collection', name_pt: '10 Únicos',     name_en: '10 Unique',       desc_pt: '10 itens únicos',          desc_en: '10 unique items' },
  { id: 'item_unique_30', icon: 'Grid3x3',      tier: 'silver', category: 'collection', name_pt: '30 Únicos',     name_en: '30 Unique',       desc_pt: '30 itens únicos',          desc_en: '30 unique items' },
  { id: 'item_5',         icon: 'Package',      tier: 'bronze', category: 'collection', name_pt: '5 Itens',       name_en: '5 Items',         desc_pt: '5 itens na coleção',       desc_en: '5 items in collection' },
  { id: 'item_75',        icon: 'Boxes',        tier: 'silver', category: 'collection', name_pt: '75 Itens',      name_en: '75 Items',        desc_pt: '75 itens na coleção',      desc_en: '75 items in collection' },
  { id: 'item_150',       icon: 'Building',     tier: 'gold',   category: 'collection', name_pt: '150 Itens',     name_en: '150 Items',       desc_pt: '150 itens na coleção',     desc_en: '150 items in collection' },
  { id: 'item_300',       icon: 'Building2',    tier: 'gold',   category: 'collection', name_pt: '300 Itens',     name_en: '300 Items',       desc_pt: '300 itens na coleção',     desc_en: '300 items in collection' },
  { id: 'analytics_45',   icon: 'BarChart3',   tier: 'silver', category: 'insights', name_pt: '45 Dias de Dados', name_en: '45 Days of Data', desc_pt: '45 dias de histórico',     desc_en: '45 days of history' },
  { id: 'analytics_120',  icon: 'BarChart4',   tier: 'gold',   category: 'insights', name_pt: '4 Meses de Dados', name_en: '4 Months Data',  desc_pt: '4 meses de histórico',     desc_en: '4 months of history' },
  { id: 'analytics_270',  icon: 'LineChart',   tier: 'gold',   category: 'insights', name_pt: '9 Meses de Dados', name_en: '9 Months Data',  desc_pt: '9 meses de histórico',     desc_en: '9 months of history' },
  { id: 'weekly_efficiency_70', icon: 'Gauge', tier: 'bronze', category: 'efficiency', name_pt: '70% Eficiente', name_en: '70% Efficient', desc_pt: 'Complete 70% da semana', desc_en: 'Complete 70% of the week' },
  { id: 'weekly_efficiency_80', icon: 'GaugeCircle', tier: 'silver', category: 'efficiency', name_pt: '80% Eficiente', name_en: '80% Efficient', desc_pt: 'Complete 80% da semana', desc_en: 'Complete 80% of the week' },
  { id: 'weekly_efficiency_90', icon: 'Activity', tier: 'gold', category: 'efficiency', name_pt: '90% Eficiente', name_en: '90% Efficient', desc_pt: 'Complete 90% da semana', desc_en: 'Complete 90% of the week' },
  { id: 'weekly_efficiency_100', icon: 'CheckCircle2', tier: 'diamond', category: 'efficiency', name_pt: '100% Eficiente', name_en: '100% Efficient', desc_pt: 'Complete 100% da semana', desc_en: 'Complete 100% of the week' },
  { id: 'unknown_date_1', icon: 'HelpCircle', tier: 'bronze', category: 'drops', name_pt: 'Sem Data', name_en: 'No Date', desc_pt: 'Registre 1 drop sem data', desc_en: 'Register 1 drop without date' },
  { id: 'unknown_date_10', icon: 'CircleHelp', tier: 'silver', category: 'drops', name_pt: '10 Sem Data', name_en: '10 No-Date Drops', desc_pt: 'Registre 10 drops sem data', desc_en: 'Register 10 drops without dates' },
  { id: 'manual_backfill_1', icon: 'CalendarPlus', tier: 'bronze', category: 'drops', name_pt: 'Registro Antigo', name_en: 'Backfilled Drop', desc_pt: 'Registre 1 drop com data antiga', desc_en: 'Register 1 backfilled drop' },
  { id: 'manual_backfill_5', icon: 'CalendarClock', tier: 'silver', category: 'drops', name_pt: 'Historiador', name_en: 'Historian', desc_pt: 'Registre 5 drops com data antiga', desc_en: 'Register 5 backfilled drops' },
  { id: 'collection_value_50', icon: 'WalletCards', tier: 'bronze', category: 'collection', name_pt: 'Coleção R$50', name_en: 'R$50 Collection', desc_pt: 'Maior item descoberto vale R$50+', desc_en: 'Top discovered item worth R$50+' },
  { id: 'collection_value_100', icon: 'Gem', tier: 'silver', category: 'collection', name_pt: 'Coleção R$100', name_en: 'R$100 Collection', desc_pt: 'Maior item descoberto vale R$100+', desc_en: 'Top discovered item worth R$100+' },
  { id: 'collection_value_250', icon: 'Diamond', tier: 'gold', category: 'collection', name_pt: 'Coleção R$250', name_en: 'R$250 Collection', desc_pt: 'Maior item descoberto vale R$250+', desc_en: 'Top discovered item worth R$250+' },
  { id: 'collection_value_500', icon: 'Crown', tier: 'diamond', category: 'collection', name_pt: 'Coleção R$500', name_en: 'R$500 Collection', desc_pt: 'Maior item descoberto vale R$500+', desc_en: 'Top discovered item worth R$500+' },
  { id: 'case_loss_first', icon: 'TrendingDown', tier: 'bronze', category: 'cases', name_pt: 'Primeiro Prejuízo', name_en: 'First Case Loss', desc_pt: 'Tenha 1 abertura com prejuízo', desc_en: 'Log 1 losing case opening' },
  { id: 'case_profit_5', icon: 'TrendingUp', tier: 'gold', category: 'cases', name_pt: '5 Caixas Lucrativas', name_en: '5 Profitable Cases', desc_pt: 'Tenha 5 aberturas lucrativas', desc_en: 'Log 5 profitable openings' },
  { id: 'case_roi_25', icon: 'Percent', tier: 'silver', category: 'cases', name_pt: 'ROI Caixa 25%', name_en: '25% Case ROI', desc_pt: 'Alcance 25% de ROI em caixas', desc_en: 'Reach 25% ROI on cases' },
  { id: 'case_roi_50', icon: 'BadgePercent', tier: 'gold', category: 'cases', name_pt: 'ROI Caixa 50%', name_en: '50% Case ROI', desc_pt: 'Alcance 50% de ROI em caixas', desc_en: 'Reach 50% ROI on cases' },
  { id: 'case_stattrak_5', icon: 'Cpu', tier: 'gold', category: 'cases', name_pt: '5 StatTrak', name_en: '5 StatTrak', desc_pt: 'Abra 5 itens StatTrak', desc_en: 'Open 5 StatTrak items' },
  { id: 'case_wear_fn_5', icon: 'Sparkles', tier: 'gold', category: 'cases', name_pt: '5 Factory New', name_en: '5 Factory New', desc_pt: 'Abra 5 itens Factory New', desc_en: 'Open 5 Factory New items' },
  { id: 'privacy_private', icon: 'Lock', tier: 'bronze', category: 'privacy', name_pt: 'Perfil Privado', name_en: 'Private Profile', desc_pt: 'Use perfil privado', desc_en: 'Use a private profile' },
  { id: 'lite_mode_enabled', icon: 'Minimize2', tier: 'bronze', category: 'privacy', name_pt: 'Modo Lite', name_en: 'Lite Mode', desc_pt: 'Ative o Lite Mode', desc_en: 'Enable Lite Mode' },
  { id: 'profile_named', icon: 'UserPen', tier: 'bronze', category: 'privacy', name_pt: 'Nome Próprio', name_en: 'Custom Name', desc_pt: 'Defina um nome de exibição', desc_en: 'Set a display name' },
  { id: 'rankings_enabled', icon: 'ListOrdered', tier: 'silver', category: 'social', name_pt: 'Rankings Ativos', name_en: 'Rankings Enabled', desc_pt: 'Ative rankings de amigos', desc_en: 'Enable friend rankings' },
  { id: 'active_account_1', icon: 'UserCheck', tier: 'bronze', category: 'accounts', name_pt: 'Conta Ativa', name_en: 'Active Account', desc_pt: 'Tenha 1 conta ativa', desc_en: 'Have 1 active account' },
  { id: 'active_account_5', icon: 'UsersRound', tier: 'silver', category: 'accounts', name_pt: '5 Ativas', name_en: '5 Active Accounts', desc_pt: 'Tenha 5 contas ativas', desc_en: 'Have 5 active accounts' },
  { id: 'goal_forecast_week', icon: 'CalendarClock', tier: 'silver', category: 'goals', name_pt: 'Meta da Semana', name_en: 'Weekly Forecast', desc_pt: 'Tenha meta de cashout semanal', desc_en: 'Have a weekly cashout goal' },
  { id: 'heatmap_30_days', icon: 'Grid3x3', tier: 'silver', category: 'insights', name_pt: '30 Dias no Mapa', name_en: '30 Days on Map', desc_pt: 'Registre atividade em 30 dias diferentes', desc_en: 'Register activity on 30 different days' },
]

// ─── Helpers internos ─────────────────────────────────────────────────────────

/** Retorna o valor de cashout efetivo de um drop */
function dropCashoutValue(drop: Drop, cashoutRate: number): number {
  return drop.cashoutValue ?? calcCashout(drop.steamValue, cashoutRate)
}

/**
 * Calcula o streak máximo de semanas consecutivas com drops.
 */
function calcMaxWeeklyStreak(drops: Drop[]): { maxStreak: number } {
  const weekIdSet = new Set(drops.map(d => d.weekId))
  const sortedWeeks = [...weekIdSet].filter(w => w !== 'unknown').sort()

  if (sortedWeeks.length === 0) return { maxStreak: 0 }

  let maxStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedWeeks.length; i++) {
    const prev = new Date(sortedWeeks[i - 1]).getTime()
    const curr = new Date(sortedWeeks[i]).getTime()
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)

    if (diffDays === 7) {
      currentStreak++
      if (currentStreak > maxStreak) maxStreak = currentStreak
    } else {
      currentStreak = 1
    }
  }

  return { maxStreak }
}

function earliestDropDate(drops: Drop[]): string {
  if (drops.length === 0) return new Date().toISOString()
  return drops.reduce((oldest, d) => {
    const date = d.createdAt ?? d.registeredAt ?? ''
    return date < oldest ? date : oldest
  }, drops[0].createdAt ?? drops[0].registeredAt ?? new Date().toISOString())
}

function nthDropDate(drops: Drop[], n: number): string {
  const sorted = [...drops].sort((a, b) =>
    (a.createdAt ?? a.registeredAt ?? '').localeCompare(b.createdAt ?? b.registeredAt ?? '')
  )
  const target = sorted[Math.min(n - 1, sorted.length - 1)]
  return target?.createdAt ?? target?.registeredAt ?? new Date().toISOString()
}

// ─── Computação Principal ─────────────────────────────────────────────────────

export function computeUnlockedAchievements(
  accounts: CSAccount[],
  drops: Drop[],
  goals: Goal[],
  settings: AppSettings,
  cases: CaseOpeningLog[] = [],
  collection: CollectionItem[] = [],
  gamification?: GamificationState,
): UnlockedAchievement[] {
  const unlocked: UnlockedAchievement[] = []
  const rate = settings.cashoutRate
  const now = new Date().toISOString()

  const dashStats = calcDashboardStats(accounts, drops, goals, settings)
  const currentWeekId = getCurrentWeekId()
  const currentWeekStats = calcWeekStats(currentWeekId, drops, accounts, settings)

  const unlock = (id: string, unlockedAt: string, progress: number) => {
    const achievement = ACHIEVEMENTS.find(a => a.id === id)
    if (!achievement) return
    unlocked.push({ achievement, unlockedAt, progress: Math.min(100, Math.round(progress)) })
  }

  const totalDrops = drops.length
  const dropValues = drops.map(d => ({
    value: dropCashoutValue(d, rate),
    date: d.createdAt ?? d.registeredAt ?? now,
  }))
  const totalCashout = dropValues.reduce((s, d) => s + d.value, 0)
  const activeAccounts = accounts.filter(a => a.active)
  const { maxStreak } = calcMaxWeeklyStreak(drops)
  const soldDrops = drops.filter(d => d.sold).length
  const paidBackAccounts = dashStats.accountStats.filter(s => s.isPaidBack)
  const knownWeekIds = [...new Set(drops.map(d => d.weekId).filter(w => w !== 'unknown'))]
  const bestWeeklyEfficiency = knownWeekIds.reduce((best, weekId) => {
    const target = activeAccounts.length * 2
    if (target <= 0) return best
    const count = drops.filter(d => d.weekId === weekId).length
    return Math.max(best, Math.min(100, (count / target) * 100))
  }, 0)
  const unknownDateDrops = drops.filter(d => d.weekId === 'unknown').length
  const currentWeekStart = new Date(currentWeekId).getTime()
  const manualBackfillDrops = drops.filter(d => {
    if (d.weekId === 'unknown' || d.weekId === currentWeekId) return false
    const date = new Date(d.createdAt ?? d.registeredAt ?? '').getTime()
    return Number.isFinite(date) && date < currentWeekStart
  }).length
  const discoveredItems = collection.length > 0
    ? collection
    : [...new Map(drops.map(d => [d.item.marketHashName, {
        marketHashName: d.item.marketHashName,
        name: d.item.name,
        imageUrl: d.item.imageUrl,
        count: 1,
        firstSeen: d.createdAt,
        lastSeen: d.createdAt,
        maxValueSeen: d.steamValue,
      } as CollectionItem])).values()]
  const highestCollectionValue = discoveredItems.reduce((best, item) => Math.max(best, item.maxValueSeen), 0)
  const activeAccountCount = activeAccounts.length
  const totalCaseCost = cases.reduce((sum, c) => sum + (c.casePriceAtOpen ?? 0) + (c.keyPriceAtOpen ?? c.keyPrice ?? 0), 0)
  const totalCaseValue = cases.reduce((sum, c) => sum + (c.receivedValueAtOpen ?? c.obtainedValue ?? 0), 0)
  const caseProfitLoss = cases.map(c => c.profitLoss ?? ((c.receivedValueAtOpen ?? c.obtainedValue ?? 0) - (c.casePriceAtOpen ?? 0) - (c.keyPriceAtOpen ?? c.keyPrice ?? 0)))
  const profitableCases = caseProfitLoss.filter(v => v > 0).length
  const losingCases = caseProfitLoss.filter(v => v < 0).length
  const caseRoi = totalCaseCost > 0 ? ((totalCaseValue / totalCaseCost) - 1) * 100 : 0

  // ─── Drop Count Milestones
  const dropMilestones: [string, number][] = [
    ['drop_1', 1], ['drop_5', 5], ['drop_10', 10], ['drop_20', 20], ['drop_25', 25],
    ['drop_30', 30], ['drop_40', 40], ['drop_50', 50], ['drop_60', 60], ['drop_75', 75],
    ['drop_80', 80], ['drop_100', 100], ['drop_125', 125], ['drop_150', 150], ['drop_175', 175],
    ['drop_200', 200], ['drop_225', 225], ['drop_250', 250], ['drop_300', 300], ['drop_350', 350],
    ['drop_400', 400], ['drop_450', 450], ['drop_500', 500], ['drop_750', 750], ['drop_1000', 1000],
  ]
  dropMilestones.forEach(([id, target]) => {
    unlock(id, totalDrops >= target ? nthDropDate(drops, target) : now, (totalDrops / target) * 100)
  })

  // Secret drop counts
  if (totalDrops === 69 || totalDrops > 69) unlock('secret_69', totalDrops >= 69 ? nthDropDate(drops, 69) : now, totalDrops >= 69 ? 100 : (totalDrops / 69) * 100)
  if (totalDrops >= 314) unlock('secret_pi', nthDropDate(drops, 314), 100)
  else unlock('secret_pi', now, (totalDrops / 314) * 100)
  if (totalDrops >= 420) unlock('secret_420', nthDropDate(drops, 420), 100)
  else unlock('secret_420', now, (totalDrops / 420) * 100)
  if (totalDrops >= 1337) unlock('secret_1337', nthDropDate(drops, 1337), 100)
  else unlock('secret_1337', now, (totalDrops / 1337) * 100)

  // ─── Sales
  const salesMilestones: [string, number][] = [
    ['drop_sold_1', 1], ['drop_sold_10', 10], ['drop_sold_50', 50], ['drop_sold_100', 100],
  ]
  salesMilestones.forEach(([id, target]) => {
    unlock(id, soldDrops >= target ? now : now, (soldDrops / target) * 100)
  })
  unlock('drop_all_sold', now, drops.length > 0 && soldDrops === drops.length ? 100 : drops.length > 0 ? (soldDrops / drops.length) * 100 : 0)
  unlock('drop_zero_unsold', now, drops.length > 0 && drops.filter(d => !d.sold).length === 0 ? 100 : 0)
  unlock('all_drops_sold', now, drops.length > 0 && soldDrops === drops.length ? 100 : drops.length > 0 ? (soldDrops / drops.length) * 100 : 0)

  // ─── Cashout Milestones
  const cashMilestones: [string, number][] = [
    ['cashout_r10', 10], ['cashout_r50', 50], ['cashout_r75', 75], ['cashout_r100', 100],
    ['cashout_r150', 150], ['cashout_r200', 200], ['cashout_r250', 250], ['cashout_r350', 350],
    ['cashout_r500', 500], ['cashout_r750', 750], ['cashout_r1000', 1000], ['cashout_r1500', 1500],
    ['cashout_r2500', 2500], ['cashout_r3000', 3000], ['cashout_r5000', 5000],
  ]
  cashMilestones.forEach(([id, target]) => {
    unlock(id, totalCashout >= target ? now : now, (totalCashout / target) * 100)
  })
  if (totalCashout >= 7777) unlock('secret_7777', now, 100)
  else unlock('secret_7777', now, (totalCashout / 7777) * 100)
  if (totalCashout >= 10000) unlock('secret_rich', now, 100)
  else unlock('secret_rich', now, (totalCashout / 10000) * 100)

  // ─── Single Drop High Value
  const singleValueMilestones: [string, number][] = [
    ['single_drop_r25', 25], ['single_drop_r50', 50], ['single_drop_r100', 100],
    ['single_drop_r200', 200], ['single_drop_r500', 500],
  ]
  const bestSingle = dropValues.length > 0 ? Math.max(...dropValues.map(d => d.value)) : 0
  singleValueMilestones.forEach(([id, target]) => {
    const hit = dropValues.find(d => d.value >= target)
    unlock(id, hit ? hit.date : now, (bestSingle / target) * 100)
  })

  // ─── ROI
  const overallROI = dashStats.overallROI
  unlock('roi_zero', now, overallROI > 0 ? 100 : Math.max(0, 100 + overallROI))
  unlock('roi_50', now, overallROI >= 50 ? 100 : Math.max(0, (overallROI / 50) * 100))
  unlock('roi_100', now, overallROI >= 100 ? 100 : Math.max(0, (overallROI / 100) * 100))
  unlock('roi_200', now, overallROI >= 200 ? 100 : Math.max(0, (overallROI / 200) * 100))

  // ─── Payback
  unlock('payback_1', paidBackAccounts.length >= 1 ? earliestDropDate(drops.filter(d => paidBackAccounts.some(s => s.account.id === d.accountId))) : now, paidBackAccounts.length >= 1 ? 100 : dashStats.accountStats.length > 0 ? Math.max(...dashStats.accountStats.map(s => s.paybackMultiplier * 100)) : 0)
  unlock('payback_3', now, Math.min(100, (paidBackAccounts.length / 3) * 100))
  unlock('payback_5', now, Math.min(100, (paidBackAccounts.length / 5) * 100))

  // ─── Streaks
  const streakMilestones: [string, number][] = [
    ['streak_2', 2], ['streak_3', 3], ['streak_4', 4], ['streak_6', 6],
    ['streak_8', 8], ['streak_10', 10], ['streak_12', 12], ['streak_14', 14],
    ['streak_16', 16], ['streak_18', 18], ['streak_20', 20], ['streak_24', 24],
    ['streak_26', 26], ['streak_30', 30], ['streak_36', 36], ['streak_40', 40],
    ['streak_52', 52],
  ]
  streakMilestones.forEach(([id, target]) => {
    unlock(id, maxStreak >= target ? now : now, (Math.min(maxStreak, target) / target) * 100)
  })

  // ─── Goals
  const goalProgresses = goals.map(g => calcGoalProgress(g, dashStats, currentWeekStats))
  const completedGoals = goalProgresses.filter(p => p >= 100).length
  unlock('goal_created_1', goals.length >= 1 ? now : now, goals.length >= 1 ? 100 : 0)
  unlock('goal_created_3', now, Math.min(100, (goals.length / 3) * 100))
  unlock('goal_created_5', now, Math.min(100, (goals.length / 5) * 100))
  unlock('goal_created_10', now, Math.min(100, (goals.length / 10) * 100))
  unlock('goal_completed_1', now, completedGoals >= 1 ? 100 : goals.length > 0 ? Math.max(...goalProgresses, 0) : 0)
  unlock('goal_completed_2', now, Math.min(100, (completedGoals / 2) * 100))
  unlock('goal_completed_3', now, Math.min(100, (completedGoals / 3) * 100))
  unlock('goal_completed_5', now, Math.min(100, (completedGoals / 5) * 100))
  unlock('goal_completed_7', now, Math.min(100, (completedGoals / 7) * 100))
  unlock('goal_completed_10', now, Math.min(100, (completedGoals / 10) * 100))
  unlock('goal_all_done', now, goals.length >= 2 && completedGoals === goals.length ? 100 : goals.length > 0 ? (completedGoals / Math.max(1, goals.length)) * 100 : 0)
  unlock('goal_multi', now, goals.length >= 3 ? 100 : (goals.length / 3) * 100)
  unlock('goal_delete', now, 0) // can't detect without history

  // ─── Accounts
  const accountMilestones: [string, number][] = [
    ['account_1', 1], ['account_2', 2], ['account_3', 3], ['account_4', 4],
    ['account_5', 5], ['account_7', 7], ['account_10', 10], ['account_15', 15],
    ['account_20', 20], ['account_30', 30], ['account_50', 50],
  ]
  accountMilestones.forEach(([id, target]) => {
    unlock(id, accounts.length >= target ? now : now, Math.min(100, (accounts.length / target) * 100))
  })
  unlock('account_all_drops', now, (() => {
    if (activeAccounts.length === 0) return 0
    const weekDrops = drops.filter(d => d.weekId === currentWeekId)
    const accountsWithDrops = new Set(weekDrops.map(d => d.accountId))
    const allCompleted = activeAccounts.every(a => accountsWithDrops.has(a.id))
    return allCompleted ? 100 : (activeAccounts.filter(a => accountsWithDrops.has(a.id)).length / activeAccounts.length) * 100
  })())

  // ─── Full House (all active accounts drop same week)
  if (activeAccounts.length > 0) {
    const weekIds = [...new Set(drops.filter(d => d.weekId !== 'unknown').map(d => d.weekId))]
    let bestPct = 0, fullHouseFound = false
    for (const wid of weekIds) {
      const wDrops = drops.filter(d => d.weekId === wid)
      const accsWithDrops = new Set(wDrops.map(d => d.accountId))
      const pct = (activeAccounts.filter(a => accsWithDrops.has(a.id)).length / activeAccounts.length) * 100
      if (pct > bestPct) bestPct = pct
      if (pct === 100) { fullHouseFound = true; break }
    }
    unlock('full_house_2', now, activeAccounts.length >= 2 && bestPct >= 100 ? 100 : Math.min(100, (bestPct / 100) * 100))
    unlock('full_house_5', now, activeAccounts.length >= 5 && bestPct >= 100 ? 100 : 0)
    unlock('full_house_10', now, activeAccounts.length >= 10 && bestPct >= 100 ? 100 : 0)
    unlock('account_all_drops', now, bestPct)
    void fullHouseFound // used above
  } else {
    unlock('full_house_2', now, 0)
    unlock('full_house_5', now, 0)
    unlock('full_house_10', now, 0)
  }

  // ─── Analytics time-based
  const sortedDropDates = drops.filter(d => d.createdAt).map(d => d.createdAt!).sort()
  if (sortedDropDates.length >= 2) {
    const oldest = new Date(sortedDropDates[0])
    const newest = new Date(sortedDropDates[sortedDropDates.length - 1])
    const daysDiff = (newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24)
    const analyticsMilestones: [string, number][] = [
      ['analytics_30', 30], ['analytics_45', 45], ['analytics_90', 90],
      ['analytics_120', 120], ['analytics_180', 180], ['analytics_270', 270], ['analytics_365', 365],
    ]
    analyticsMilestones.forEach(([id, target]) => {
      unlock(id, daysDiff >= target ? now : now, Math.min(100, (daysDiff / target) * 100))
    })
  }

  // ─── Collection discovery
  const itemMilestones: [string, number][] = [
    ['item_first', 1], ['item_5', 5], ['item_10', 10], ['item_25', 25],
    ['item_50', 50], ['item_75', 75], ['item_100', 100], ['item_150', 150],
    ['item_200', 200], ['item_300', 300], ['item_500', 500],
    ['item_unique_5', 5], ['item_unique_10', 10], ['item_unique_20', 20],
    ['item_unique_30', 30], ['item_unique_50', 50],
  ]
  itemMilestones.forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (discoveredItems.length / target) * 100))
  })
  ;([
    ['collection_value_50', 50], ['collection_value_100', 100],
    ['collection_value_250', 250], ['collection_value_500', 500],
  ] as [string, number][]).forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (highestCollectionValue / target) * 100))
  })

  // ─── Case openings
  ;([
    ['case_first', 1], ['case_3', 3], ['case_5', 5], ['case_10', 10],
    ['case_15', 15], ['case_25', 25], ['case_35', 35], ['case_50', 50],
    ['case_75', 75], ['case_100', 100], ['case_150', 150], ['case_200', 200],
    ['case_300', 300], ['case_500', 500],
  ] as [string, number][]).forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (cases.length / target) * 100))
  })
  unlock('case_profit', now, profitableCases >= 1 ? 100 : 0)
  unlock('case_loss_10', now, Math.min(100, (losingCases / 10) * 100))
  unlock('case_loss_first', now, losingCases >= 1 ? 100 : 0)
  unlock('case_profit_5', now, Math.min(100, (profitableCases / 5) * 100))
  unlock('case_roi_pos', now, caseRoi > 0 ? 100 : Math.max(0, 50 + caseRoi))
  unlock('case_roi_25', now, caseRoi >= 25 ? 100 : Math.max(0, (caseRoi / 25) * 100))
  unlock('case_roi_50', now, caseRoi >= 50 ? 100 : Math.max(0, (caseRoi / 50) * 100))
  unlock('case_lucky', now, cases.some(c => (c.receivedValueAtOpen ?? c.obtainedValue ?? 0) >= (c.keyPriceAtOpen ?? c.keyPrice ?? 0) * 10) ? 100 : 0)
  unlock('case_mega_lucky', now, cases.some(c => (c.receivedValueAtOpen ?? c.obtainedValue ?? 0) >= (c.keyPriceAtOpen ?? c.keyPrice ?? 0) * 50) ? 100 : 0)
  unlock('case_stattrak_open', now, cases.some(c => c.statTrak) ? 100 : 0)
  unlock('case_stattrak_5', now, Math.min(100, (cases.filter(c => c.statTrak).length / 5) * 100))
  unlock('case_wear_fn_5', now, Math.min(100, (cases.filter(c => c.wear === 'FN').length / 5) * 100))

  // ─── XP, perfect weeks, settings and privacy
  const totalXp = gamification?.totalXP ?? 0
  const level = gamification?.level ?? 1
  const perfectWeeks = gamification?.totalPerfectWeeks ?? 0
  ;([
    ['xp_first', 1], ['xp_100', 100], ['xp_250', 250], ['xp_500', 500],
    ['xp_750', 750], ['xp_1000', 1000], ['xp_2500', 2500], ['xp_5000', 5000],
    ['xp_10000', 10000], ['xp_25000', 25000], ['xp_50000', 50000],
  ] as [string, number][]).forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (totalXp / target) * 100))
  })
  ;([
    ['level_2', 2], ['level_3', 3], ['level_4', 4], ['level_5', 5], ['level_6', 6],
    ['level_7', 7], ['level_8', 8], ['level_10', 10], ['level_12', 12],
    ['level_15', 15], ['level_20', 20], ['level_25', 25], ['level_30', 30],
    ['level_40', 40], ['level_50', 50], ['level_75', 75], ['level_100', 100],
  ] as [string, number][]).forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (level / target) * 100))
  })
  ;([
    ['perfect_week_1', 1], ['perfect_week_2', 2], ['perfect_week_3', 3],
    ['perfect_week_5', 5], ['perfect_week_7', 7], ['perfect_week_10', 10],
    ['perfect_week_15', 15], ['perfect_week_20', 20], ['perfect_week_25', 25],
    ['perfect_week_30', 30], ['perfect_week_50', 50], ['perfect_week_100', 100],
  ] as [string, number][]).forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (perfectWeeks / target) * 100))
  })
  ;([
    ['weekly_efficiency_70', 70], ['weekly_efficiency_80', 80],
    ['weekly_efficiency_90', 90], ['weekly_efficiency_100', 100],
  ] as [string, number][]).forEach(([id, target]) => {
    unlock(id, now, Math.min(100, (bestWeeklyEfficiency / target) * 100))
  })
  unlock('unknown_date_1', now, unknownDateDrops >= 1 ? 100 : 0)
  unlock('unknown_date_10', now, Math.min(100, (unknownDateDrops / 10) * 100))
  unlock('manual_backfill_1', now, manualBackfillDrops >= 1 ? 100 : 0)
  unlock('manual_backfill_5', now, Math.min(100, (manualBackfillDrops / 5) * 100))
  unlock('privacy_private', now, settings.profilePrivacy === 'private' ? 100 : 0)
  unlock('lite_mode_enabled', now, settings.liteMode ? 100 : 0)
  unlock('profile_named', now, settings.profile?.displayName ? 100 : 0)
  unlock('rankings_enabled', now, settings.gamification?.showRankings ? 100 : 0)
  unlock('active_account_1', now, activeAccountCount >= 1 ? 100 : 0)
  unlock('active_account_5', now, Math.min(100, (activeAccountCount / 5) * 100))
  unlock('goal_forecast_week', now, goals.some(g => g.type === 'cashout') ? 100 : 0)
  unlock('heatmap_30_days', now, Math.min(100, ([...new Set(drops.map(d => (d.createdAt ?? d.registeredAt ?? '').slice(0, 10)).filter(Boolean))].length / 30) * 100))

  return unlocked
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  diamond: '#b9f2ff',
}

export function getCompletedAchievements(all: UnlockedAchievement[]): UnlockedAchievement[] {
  return all.filter(a => a.progress >= 100)
}

export function getInProgressAchievements(all: UnlockedAchievement[]): UnlockedAchievement[] {
  return all.filter(a => a.progress > 0 && a.progress < 100)
}
