import type { Lang } from './i18n'

export const DEFAULT_GAMIFICATION_TITLE = 'Multiple Accounts, One Progress'

export function normalizeGamificationTitle(title: string | undefined): string {
  return title === 'One Account One Dream'
    ? DEFAULT_GAMIFICATION_TITLE
    : (title ?? DEFAULT_GAMIFICATION_TITLE)
}

const TITLE_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  'One Account One Dream': {
    pt: 'Múltiplas contas, um só progresso',
    en: 'Multiple Accounts, One Progress',
  },
  'Multiple Accounts, One Progress': {
    pt: 'Múltiplas contas, um só progresso',
    en: 'Multiple Accounts, One Progress',
  },
  'Valve Employee': {
    pt: 'Funcionário da Valve',
    en: 'Valve Employee',
  },
  'Case Farmer': {
    pt: 'Farmador de caixas',
    en: 'Case Farmer',
  },
  'Lucky Bastard': {
    pt: 'Sortudo demais',
    en: 'Lucky Bastard',
  },
  Collector: {
    pt: 'Colecionador',
    en: 'Collector',
  },
  'Sunday Night Gang': {
    pt: 'Turma de domingo à noite',
    en: 'Sunday Night Gang',
  },
  'Drop Addict': {
    pt: 'Viciado em drops',
    en: 'Drop Addict',
  },
}

export function localizeGamificationTitle(title: string | undefined, lang: Lang): string {
  const normalized = normalizeGamificationTitle(title)
  return TITLE_TRANSLATIONS[normalized]?.[lang] ?? normalized
}
