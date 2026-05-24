import * as XLSX from 'xlsx'
import type { CSAccount, Drop, AppSettings } from './types'
import { calcCashout } from './calculations'
import { formatDate, getWeekLabel } from './utils'
import { PRIME_COST_BRL } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat  = 'csv' | 'xlsx' | 'txt'
export type ExportFilter  = 'all' | 'sold' | 'unsold'
export type ExportColumns = 'all' | 'minimal' | 'with-dates'
export type ExportCurrency = 'BRL' | 'USD'

export interface ExportOptions {
  format:       ExportFormat
  filter:       ExportFilter
  columns:      ExportColumns
  currency:     ExportCurrency
  usdRate?:     number   // defaults to settings.usdRate ?? 5.2
  includeTotal: boolean
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format:       'csv',
  filter:       'all',
  columns:      'all',
  currency:     'BRL',
  includeTotal: true,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadText(content: string, filename: string, mime = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob(['﻿' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

function sym(c: ExportCurrency): string { return c === 'USD' ? '$' : 'R$' }

function conv(brl: number, c: ExportCurrency, rate: number): number {
  return c === 'USD' ? Math.round(brl / rate * 100) / 100 : brl
}

function fmtMoney(val: number): string { return val.toFixed(2) }

// ─── Filter & resolve ─────────────────────────────────────────────────────────

function applyFilter(drops: Drop[], filter: ExportFilter): Drop[] {
  const sorted = [...drops].sort((a, b) => b.weekId.localeCompare(a.weekId))
  if (filter === 'sold')   return sorted.filter(d => d.sold)
  if (filter === 'unsold') return sorted.filter(d => !d.sold)
  return sorted
}

// ─── CSV / XLSX row builder ───────────────────────────────────────────────────

function buildRows(
  drops: Drop[],
  accounts: CSAccount[],
  settings: AppSettings,
  opts: ExportOptions,
): Record<string, unknown>[] {
  const accountMap = new Map(accounts.map(a => [a.id, a]))
  const rate = opts.usdRate ?? settings.usdRate ?? 5.2
  const currency = opts.currency
  const S = sym(currency)

  const filtered = applyFilter(drops, opts.filter)

  const rows = filtered.map(drop => {
    const account = accountMap.get(drop.accountId)
    const grossBRL   = drop.steamValue
    const cashoutBRL = drop.cashoutValue ?? calcCashout(drop.steamValue, settings.cashoutRate)
    const gross   = conv(grossBRL,   currency, rate)
    const cashout = conv(cashoutBRL, currency, rate)

    const row: Record<string, unknown> = {
      Week:      getWeekLabel(drop.weekId),
      Account:   account?.name ?? 'Unknown',
      'Drop #':  drop.dropNumber,
      Item:      drop.item?.name ?? '',
    }

    if (opts.columns !== 'minimal') {
      row[`Gross (${S})`]   = fmtMoney(gross)
      row[`Cashout (${S})`] = fmtMoney(cashout)
      row['Sold']           = drop.sold ? 'Yes' : 'No'
    }

    if (opts.columns === 'with-dates' || opts.columns === 'all') {
      row['Sale Date']   = drop.soldAt    ? formatDate(drop.soldAt)    : ''
      row['Created At']  = formatDate(drop.createdAt)
    }

    if (opts.columns === 'all') {
      row['Note'] = drop.note ?? ''
    }

    return row
  })

  if (opts.includeTotal && rows.length > 0 && opts.columns !== 'minimal') {
    const S2 = sym(currency)
    const grossKey   = `Gross (${S2})`
    const cashoutKey = `Cashout (${S2})`
    const totalGross   = rows.reduce((s, r) => s + parseFloat(String(r[grossKey]   ?? 0)), 0)
    const totalCashout = rows.reduce((s, r) => s + parseFloat(String(r[cashoutKey] ?? 0)), 0)
    const totalRow: Record<string, unknown> = {}
    Object.keys(rows[0]).forEach((k, i) => {
      if (i === 0)               totalRow[k] = `TOTAL (${rows.length} drops)`
      else if (k === grossKey)   totalRow[k] = fmtMoney(totalGross)
      else if (k === cashoutKey) totalRow[k] = fmtMoney(totalCashout)
      else                       totalRow[k] = ''
    })
    rows.push(totalRow)
  }

  return rows
}

// ─── TXT builder ─────────────────────────────────────────────────────────────

function buildTxt(
  drops: Drop[],
  accounts: CSAccount[],
  settings: AppSettings,
  opts: ExportOptions,
): string {
  const accountMap = new Map(accounts.map(a => [a.id, a]))
  const rate     = opts.usdRate ?? settings.usdRate ?? 5.2
  const currency = opts.currency
  const S        = sym(currency)
  const filtered = applyFilter(drops, opts.filter)
  const lang     = settings.language ?? 'pt'
  const isEN     = lang === 'en'
  const today    = new Date().toLocaleDateString(isEN ? 'en-US' : 'pt-BR')

  const SEP  = '─'.repeat(56)
  const DSEP = '═'.repeat(56)

  const filterLabel = isEN
    ? (opts.filter === 'all' ? 'all' : opts.filter === 'sold' ? 'sold' : 'unsold')
    : (opts.filter === 'all' ? 'todos' : opts.filter === 'sold' ? 'vendidos' : 'não vendidos')

  const lines: string[] = [
    DSEP,
    '  LOOTFLOW — CS2 Drop Export',
    DSEP,
    `  ${isEN ? 'Date' : 'Data'}: ${today}`,
    `  Drops: ${filtered.length}  ·  ${isEN ? 'Currency' : 'Moeda'}: ${currency}  ·  ${isEN ? 'Filter' : 'Filtro'}: ${filterLabel}`,
    '',
  ]

  // Group by week
  const byWeek = new Map<string, Drop[]>()
  for (const d of filtered) {
    if (!byWeek.has(d.weekId)) byWeek.set(d.weekId, [])
    byWeek.get(d.weekId)!.push(d)
  }

  let totalGross   = 0
  let totalCashout = 0
  let totalItems   = 0

  for (const [weekId, weekDrops] of byWeek) {
    const label = getWeekLabel(weekId)
    lines.push(`${SEP}`)
    lines.push(`  📅 ${label}`)
    lines.push(`${SEP}`)

    for (const drop of weekDrops) {
      const account    = accountMap.get(drop.accountId)
      const grossBRL   = drop.steamValue
      const cashoutBRL = drop.cashoutValue ?? calcCashout(grossBRL, settings.cashoutRate)
      const gross   = conv(grossBRL,   currency, rate)
      const cashout = conv(cashoutBRL, currency, rate)
      totalGross   += gross
      totalCashout += cashout
      totalItems++

      lines.push(`  #${drop.dropNumber}  ${account?.name ?? 'Unknown'}`)

      if (opts.columns !== 'minimal' || drop.item?.name) {
        if (drop.item?.name) {
          lines.push(`      Item: ${drop.item.name}`)
        }
      }

      if (opts.columns !== 'minimal') {
        const soldStr = drop.sold
          ? (isEN ? '✓ Sold' : '✓ Vendido')
          : (isEN ? '○ Unsold' : '○ Não vendido')
        const grossLabel   = isEN ? 'Gross'    : 'Bruto'
        const cashoutLabel = isEN ? 'Cashout'  : 'Cashout'
        lines.push(`      ${grossLabel}: ${S} ${fmtMoney(gross)}   ${cashoutLabel}: ${S} ${fmtMoney(cashout)}   ${soldStr}`)
      }

      if ((opts.columns === 'with-dates' || opts.columns === 'all') && drop.soldAt) {
        lines.push(`      ${isEN ? 'Sale date' : 'Data venda'}: ${formatDate(drop.soldAt)}`)
      }
      if (opts.columns === 'with-dates' || opts.columns === 'all') {
        lines.push(`      ${isEN ? 'Registered' : 'Registro'}: ${formatDate(drop.createdAt)}`)
      }
      if (opts.columns === 'all' && drop.note) {
        lines.push(`      ${isEN ? 'Note' : 'Nota'}: ${drop.note}`)
      }
      lines.push('')
    }
  }

  if (opts.includeTotal && opts.columns !== 'minimal') {
    lines.push(DSEP)
    lines.push(`  TOTAL`)
    lines.push(`  ${isEN ? 'Items' : 'Itens'}: ${totalItems}`)
    lines.push(`  ${isEN ? 'Total gross'   : 'Bruto total'}:   ${S} ${fmtMoney(totalGross)}`)
    lines.push(`  ${isEN ? 'Total cashout' : 'Cashout total'}: ${S} ${fmtMoney(totalCashout)}`)
    lines.push(DSEP)
  }

  return lines.join('\n')
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportDrops(
  drops: Drop[],
  accounts: CSAccount[],
  settings: AppSettings,
  opts: ExportOptions,
): void {
  const today     = new Date().toISOString().slice(0, 10)
  const rateSuffix = opts.currency === 'USD' ? '_usd' : ''
  const base      = `lootflow_drops_${today}${rateSuffix}`

  if (opts.format === 'txt') {
    const txt = buildTxt(drops, accounts, settings, opts)
    downloadText(txt, `${base}.txt`, 'text/plain;charset=utf-8;')
    return
  }

  const rows = buildRows(drops, accounts, settings, opts)

  if (opts.format === 'csv') {
    downloadText(toCSV(rows), `${base}.csv`)
    return
  }

  // xlsx
  const rate = opts.usdRate ?? settings.usdRate ?? 5.2
  const S    = sym(opts.currency)
  const accountRows = accounts.map(a => ({
    Name:                    a.name,
    'Steam ID':              a.steamId ?? '',
    Active:                  a.active ? 'Yes' : 'No',
    [`Cost (${S})`]:         fmtMoney(conv(PRIME_COST_BRL, opts.currency, rate)),
    'Cost Type':             'Prime',
    'Created At':            formatDate(a.createdAt),
    Note:                    a.note ?? '',
  }))

  const wb       = XLSX.utils.book_new()
  const wsDrops  = XLSX.utils.json_to_sheet(rows)
  const wsAccounts = XLSX.utils.json_to_sheet(accountRows)

  wsDrops['!cols'] = [
    { wch: 16 }, { wch: 20 }, { wch: 8 }, { wch: 40 },
    { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ]
  wsAccounts['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 8 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(wb, wsDrops,    'Drops')
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Accounts')
  XLSX.writeFile(wb, `lootflow_export_${today}${rateSuffix}.xlsx`)
}

// ─── JSON backup (separate — always full) ─────────────────────────────────────

export function exportBackupJSON(data: unknown): void {
  const json  = JSON.stringify(data, null, 2)
  const today = new Date().toISOString().slice(0, 10)
  downloadText(json, `lootflow_backup_${today}.json`, 'application/json')
}

// ─── Backward-compat shims ────────────────────────────────────────────────────

export function exportDropsCSV(drops: Drop[], accounts: CSAccount[], settings: AppSettings): void {
  exportDrops(drops, accounts, settings, { ...DEFAULT_EXPORT_OPTIONS, format: 'csv', currency: (settings.currency as ExportCurrency) ?? 'BRL' })
}

export function exportDropsXLSX(drops: Drop[], accounts: CSAccount[], settings: AppSettings): void {
  exportDrops(drops, accounts, settings, { ...DEFAULT_EXPORT_OPTIONS, format: 'xlsx', currency: (settings.currency as ExportCurrency) ?? 'BRL' })
}
