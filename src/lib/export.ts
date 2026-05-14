import * as XLSX from 'xlsx'
import type { CSAccount, Drop, AppSettings } from './types'
import { calcCashout } from './calculations'
import { formatDate, getWeekLabel } from './utils'
import { PRIME_COST_BRL } from './config'

// ─── CSV Export ───────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h]
          const str = val == null ? '' : String(val)
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
        })
        .join(','),
    ),
  ]
  return lines.join('\n')
}

function downloadText(content: string, filename: string, mime = 'text/csv;charset=utf-8;'): void {
  const blob = new Blob(['\ufeff' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Build Drop Rows ──────────────────────────────────────────────────────────

function buildDropRows(
  drops: Drop[],
  accounts: CSAccount[],
  settings: AppSettings,
) {
  const accountMap = new Map(accounts.map(a => [a.id, a]))

  return drops
    .sort((a, b) => b.weekId.localeCompare(a.weekId))
    .map(drop => {
      const account = accountMap.get(drop.accountId)
      const cashout = drop.cashoutValue ?? calcCashout(drop.steamValue, settings.cashoutRate)
      return {
        Semana: getWeekLabel(drop.weekId),
        Conta: account?.name ?? 'Desconhecida',
        'Drop #': drop.dropNumber,
        Item: drop.item.name,
        'Valor Steam (R$)': drop.steamValue.toFixed(2),
        'Valor Cashout (R$)': cashout.toFixed(2),
        Vendido: drop.sold ? 'Sim' : 'Não',
        'Data Venda': drop.soldAt ? formatDate(drop.soldAt) : '',
        'Data Registro': formatDate(drop.createdAt),
        Nota: drop.note ?? '',
      }
    })
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function exportDropsCSV(
  drops: Drop[],
  accounts: CSAccount[],
  settings: AppSettings,
): void {
  const rows = buildDropRows(drops, accounts, settings)
  const csv = toCSV(rows)
  downloadText(csv, `lootflow_drops_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportDropsXLSX(
  drops: Drop[],
  accounts: CSAccount[],
  settings: AppSettings,
): void {
  const dropsRows = buildDropRows(drops, accounts, settings)

  const accountRows = accounts.map(a => ({
    Nome: a.name,
    'Steam ID': a.steamId ?? '',
    Ativa: a.active ? 'Sim' : 'Não',
    'Custo (R$)': PRIME_COST_BRL.toFixed(2),
    'Tipo Custo': 'Prime',
    'Criada em': formatDate(a.createdAt),
    Nota: a.note ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const wsDrops = XLSX.utils.json_to_sheet(dropsRows)
  const wsAccounts = XLSX.utils.json_to_sheet(accountRows)

  // Column widths
  wsDrops['!cols'] = [
    { wch: 16 }, { wch: 20 }, { wch: 8 }, { wch: 40 },
    { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ]
  wsAccounts['!cols'] = [
    { wch: 20 }, { wch: 18 }, { wch: 8 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(wb, wsDrops, 'Drops')
  XLSX.utils.book_append_sheet(wb, wsAccounts, 'Contas')

  XLSX.writeFile(wb, `lootflow_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportBackupJSON(data: unknown): void {
  const json = JSON.stringify(data, null, 2)
  downloadText(json, `lootflow_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
}
