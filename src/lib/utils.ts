import { format, parseISO, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ─── Tailwind Merge Helper ───────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Week System (CS2 resets every Tuesday) ──────────────────────────────────

export function getWeekIdForDate(date: Date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  // Days back to most recent Tuesday.
  // Sun=5, Mon=6, Tue=0, Wed=1, Thu=2, Fri=3, Sat=4
  const daysBack = day === 0 ? 5 : (day - 2 + 7) % 7
  d.setDate(d.getDate() - daysBack)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function getCurrentWeekId(): string {
  return getWeekIdForDate(new Date())
}

export function getWeekRange(weekId: string): { start: Date; end: Date } {
  const start = startOfDay(parseISO(weekId))
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return { start, end }
}

export function getWeekLabel(weekId: string): string {
  try {
    const { start, end } = getWeekRange(weekId)
    return `${format(start, 'dd/MM', { locale: ptBR })} – ${format(end, 'dd/MM/yy', { locale: ptBR })}`
  } catch {
    return weekId
  }
}

export function getPreviousWeeks(count: number): string[] {
  const weeks: string[] = []
  const today = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i * 7)
    weeks.push(getWeekIdForDate(d))
  }
  return [...new Set(weeks)].sort((a, b) => b.localeCompare(a))
}

// ─── Currency Formatting ─────────────────────────────────────────────────────

// Sempre em R$ — Steam Market é consultado com currency=7 (BRL)
export function formatCurrency(value: number, _currency?: string): string {
  const safe = value == null || isNaN(value) ? 0 : value
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe)
}

export function formatCurrencyCompact(value: number, _currency?: string): string {
  const safe = value == null || isNaN(value) ? 0 : value
  if (Math.abs(safe) >= 1000) {
    return `R$ ${(safe / 1000).toFixed(1)}k`
  }
  return formatCurrency(safe)
}

// Steam API retorna preços formatados em BRL: "R$ 52,40", "R$52,40", "52,40"
// Converte sempre para float em Reais
export function parseSteamPrice(priceStr: string | undefined): number {
  if (!priceStr) return 0
  // Remove "R$", espaços, pontos de milhar — mantém vírgula como decimal
  const cleaned = priceStr
    .replace(/R\$\s*/gi, '')   // remove R$
    .replace(/\s/g, '')         // remove espaços
    .replace(/\./g, '')         // remove pontos (milhar)
    .replace(',', '.')          // vírgula → ponto decimal
  const value = parseFloat(cleaned)
  return isNaN(value) ? 0 : value
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return isoDate
  }
}

export function formatDateRelative(isoDate: string): string {
  try {
    const date = parseISO(isoDate)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays} dias atrás`
    return formatDate(isoDate)
  } catch {
    return isoDate
  }
}

// ─── ID Generation ────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Percentage ───────────────────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

// ─── Account Colors ───────────────────────────────────────────────────────────

export const ACCOUNT_COLORS = [
  '#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#a78bfa',
  '#fb923c', '#34d399', '#e879f9', '#60a5fa', '#f472b6',
]

export function getAccountColor(index: number): string {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
}

// ─── ROI color helper ─────────────────────────────────────────────────────────

export function roiColorClass(roi: number): string {
  if (roi > 0) return 'text-profit'
  if (roi < 0) return 'text-loss'
  return 'text-slate-400'
}
