import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, X, Package,
  Trash2, DollarSign, AlertCircle, Calendar, HelpCircle, Zap, Filter,
} from 'lucide-react'
import { useStore } from '../store'
import { formatCurrency, getCurrentWeekId, getWeekLabel, getWeekIdForDate } from '../lib/utils'
import { Button, Card, Input, Modal, Empty } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { MarketplaceLinks } from '../components/MarketplaceLinks'
import { searchSteamMarket, getSteamItemPrice } from '../lib/steam'
import { useT } from '../hooks/useT'
import type { Drop, SteamItem, WearCondition } from '../lib/types'

// ─── Item type detection ──────────────────────────────────────────────────────

type ItemType = 'weapon' | 'case' | 'sticker' | 'other'

function detectItemType(name: string): ItemType {
  const lower = name.toLowerCase()
  if (lower.includes('case') || lower.includes('package')) return 'case'
  if (lower.startsWith('sticker') || lower.startsWith('sealed graffiti') || lower.startsWith('patch') || lower.startsWith('music kit')) return 'sticker'
  if (name.includes(' | ')) return 'weapon'
  return 'other'
}

// ─── Bilingual search ─────────────────────────────────────────────────────────

// Portuguese keywords that map to an item type — checked first so "caixa" shows
// all cases even if the word "caixa" isn't in the item name.
const TYPE_PT_ALIASES: Record<ItemType, string[]> = {
  case:    ['caixa', 'caixas', 'pacote', 'pacotes'],
  weapon:  ['arma', 'armas', 'faca', 'facas', 'luva', 'luvas', 'pele', 'peles'],
  sticker: ['adesivo', 'adesivos', 'grafite', 'grafiti', 'remendo', 'remendos', 'kit de música', 'kit musica'],
  other:   ['outros', 'outro'],
}

// Portuguese → English word replacements for free-text name search.
// Applied to the query before matching against item names.
const PT_TO_EN_WORDS: [string, string][] = [
  ['pesadelos', 'nightmares'], ['pesadelo', 'nightmare'],
  ['sonhos', 'dreams'], ['sonho', 'dream'],
  ['sombra', 'shadow'], ['sombras', 'shadows'],
  ['fogo', 'fire'], ['gelo', 'ice'],
  ['cobra', 'snake'], ['lobo', 'wolf'],
  ['leão', 'lion'], ['leao', 'lion'],
  ['dragão', 'dragon'], ['dragao', 'dragon'],
  ['sangue', 'blood'], ['água', 'water'], ['agua', 'water'],
  ['fantasma', 'ghost'], ['fantasmas', 'ghosts'],
  ['inferno', 'inferno'], ['lendário', 'legendary'], ['lendario', 'legendary'],
  ['floresta', 'forest'], ['deserto', 'desert'],
  ['horizonte', 'horizon'], ['anarchy', 'anarchy'],
  ['azul', 'blue'], ['vermelho', 'red'], ['verde', 'green'],
  ['roxo', 'purple'], ['amarelo', 'yellow'], ['laranja', 'orange'],
  ['preto', 'black'], ['branco', 'white'],
  ['caixa', 'case'], ['caixas', 'case'],
  ['arma', 'weapon'], ['armas', 'weapon'],
  ['adesivo', 'sticker'], ['adesivos', 'sticker'],
  ['grafite', 'graffiti'], ['grafiti', 'graffiti'],
  ['luva', 'glove'], ['luvas', 'gloves'],
  ['faca', 'knife'], ['facas', 'knife'],
]

function normalizeQueryPT(query: string): string {
  let q = query.toLowerCase()
  for (const [pt, en] of PT_TO_EN_WORDS) {
    if (q === pt) return en
    q = q.replace(new RegExp(`\\b${pt}\\b`, 'g'), en)
  }
  return q
}

function matchesSearch(itemName: string, itemType: ItemType, query: string): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true

  // Check PT type aliases (e.g. "caixa" → all cases)
  for (const [type, aliases] of Object.entries(TYPE_PT_ALIASES) as [ItemType, string[]][]) {
    if (aliases.includes(q) && itemType === type) return true
  }

  const lower = itemName.toLowerCase()
  // Direct name match
  if (lower.includes(q)) return true
  // PT→EN translated query match
  const normalized = normalizeQueryPT(q)
  if (normalized !== q && lower.includes(normalized)) return true

  return false
}

// ─── Steam Item Picker ────────────────────────────────────────────────────────

interface ItemPickerProps {
  label: string
  value: SteamItem | null
  steamValue: string
  onItemChange: (item: SteamItem | null) => void
  onValueChange: (v: string) => void
  cashoutRate: number
  currency: 'BRL' | 'USD'
  optional?: boolean
}

function ItemPicker({ label, value, steamValue, onItemChange, onValueChange, cashoutRate, currency, optional }: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ name: string; hashName: string; imageUrl: string; sellPrice?: number }>>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const r = await searchSteamMarket(normalizeQueryPT(q))
      setResults(r.slice(0, 8))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSelect = useCallback(async (r: { name: string; hashName: string; imageUrl: string; sellPrice?: number }) => {
    setOpen(false)
    setQuery('')
    setResults([])
    const item: SteamItem = {
      name: r.name,
      marketHashName: r.hashName,
      imageUrl: r.imageUrl ?? '',
    }
    onItemChange(item)
    if (r.sellPrice && r.sellPrice > 0) {
      onValueChange(r.sellPrice.toFixed(2))
    } else {
      try {
        const priceData = await getSteamItemPrice(r.hashName)
        const price = priceData?.lowestPrice ?? priceData?.medianPrice ?? 0
        if (price > 0) onValueChange(price.toFixed(2))
      } catch { /* ignore */ }
    }
  }, [onItemChange, onValueChange])

  const cashout = parseFloat(steamValue) > 0 ? parseFloat(steamValue) * cashoutRate / 100 : 0

  return (
    <div className="p-4 rounded-xl bg-[#0d1117] border border-white/[0.08] space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label} {optional && <span className="text-slate-600 normal-case font-normal">(opcional)</span>}
      </p>

      {value ? (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#111827] flex-shrink-0 flex items-center justify-center overflow-hidden">
            <SteamItemImage imageUrl={value.imageUrl} alt={value.name} size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{value.name}</p>
            {cashout > 0 && <p className="text-xs text-slate-500">Cashout: {formatCurrency(cashout, currency)}</p>}
          </div>
          <button onClick={() => { onItemChange(null); onValueChange('') }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#1a2235] transition-colors">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Pesquisar item CS2..."
            autoComplete="off"
            className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm pl-9 pr-4 focus:outline-none focus:border-primary/60 transition-all placeholder:text-slate-600"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-primary/60 border-t-transparent rounded-full animate-spin" />
          )}
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0d1117] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl">
              {results.map((r, i) => (
                <button key={i} onMouseDown={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#111827] text-left transition-colors border-b border-white/[0.04] last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-[#111827] flex-shrink-0 overflow-hidden flex items-center justify-center">
                    <SteamItemImage imageUrl={r.imageUrl} alt={r.name} size={32} />
                  </div>
                  <span className="text-sm text-white truncate flex-1">{r.name}</span>
                  {r.sellPrice ? <span className="text-xs font-mono text-profit flex-shrink-0">{formatCurrency(r.sellPrice, currency)}</span> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <DollarSign size={13} className="text-slate-500 flex-shrink-0" />
        <input
          type="number"
          min="0"
          step="0.01"
          value={steamValue}
          onChange={e => onValueChange(e.target.value)}
          placeholder={`Valor bruto (${currency === 'USD' ? '$' : 'R$'})`}
          className="flex-1 h-8 rounded-lg border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60 transition-all placeholder:text-slate-600"
        />
        {parseFloat(steamValue) > 0 && (
          <span className="text-xs text-profit font-mono whitespace-nowrap">
            → {formatCurrency(cashout, currency)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Float Input ──────────────────────────────────────────────────────────────

function FloatInput({ float, onFloatChange }: { float: string; onFloatChange: (f: string) => void }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <input
        type="number"
        min="0"
        max="1"
        step="0.0001"
        value={float}
        onChange={e => onFloatChange(e.target.value)}
        placeholder="Float (opcional, ex: 0.1234)"
        className="flex-1 h-8 rounded-lg border border-white/[0.1] bg-[#111827] text-slate-200 text-xs px-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
      />
      {float && parseFloat(float) >= 0 && parseFloat(float) <= 1 && (
        <span className="text-[11px] font-mono text-slate-400">{parseFloat(float).toFixed(4)}</span>
      )}
    </div>
  )
}

// ─── Drop Registration Modal ──────────────────────────────────────────────────

interface DropModalProps {
  onSave: (drops: Array<Omit<Drop, 'id' | 'createdAt'>>) => void
  onClose: () => void
}

type DateMode = 'this-week' | 'manual' | 'unknown'

function DropModal({ onSave, onClose }: DropModalProps) {
  const { accounts, drops, settings } = useStore()
  const t = useT()
  const currency = settings.currency
  const activeAccounts = accounts.filter(a => a.active)
  const currentWid = getCurrentWeekId()

  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? '')
  const [dateMode, setDateMode] = useState<DateMode>('this-week')
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [item1, setItem1] = useState<SteamItem | null>(null)
  const [value1, setValue1] = useState('')
  const [float1, setFloat1] = useState('')
  const [item2, setItem2] = useState<SteamItem | null>(null)
  const [value2, setValue2] = useState('')
  const [float2, setFloat2] = useState('')
  const [error, setError] = useState('')

  const weekId = dateMode === 'this-week'
    ? currentWid
    : dateMode === 'manual'
    ? getWeekIdForDate(new Date(manualDate + 'T12:00:00'))
    : 'unknown'

  const existingDrops = drops.filter(d => d.accountId === accountId && d.weekId === weekId)
  const slotsLeft = 2 - existingDrops.length

  function handleSave() {
    setError('')
    if (!accountId) { setError('Selecione uma conta'); return }
    if (!item1 && !item2) { setError('Registre pelo menos 1 item'); return }
    if (slotsLeft <= 0) { setError('Essa conta já tem 2 drops nessa semana'); return }

    const rate = settings.cashoutRate / 100
    const toSave: Array<Omit<Drop, 'id' | 'createdAt'>> = []

    const firstDropNum = existingDrops.length === 0 ? 1 : 2

    if (item1 && slotsLeft >= 1) {
      const sv = parseFloat(value1) || 0
      const f1 = parseFloat(float1)
      toSave.push({
        accountId, weekId,
        dropNumber: firstDropNum as 1 | 2,
        item: item1,
        steamValue: sv,
        cashoutValue: sv > 0 ? parseFloat((sv * rate).toFixed(2)) : undefined,
        float: !isNaN(f1) && f1 >= 0 && f1 <= 1 && float1 !== '' ? f1 : undefined,
        sold: false,
      })
    }
    if (item2 && slotsLeft >= 2 && existingDrops.length === 0) {
      const sv = parseFloat(value2) || 0
      const f2 = parseFloat(float2)
      toSave.push({
        accountId, weekId,
        dropNumber: 2,
        item: item2,
        steamValue: sv,
        cashoutValue: sv > 0 ? parseFloat((sv * rate).toFixed(2)) : undefined,
        float: !isNaN(f2) && f2 >= 0 && f2 <= 1 && float2 !== '' ? f2 : undefined,
        sold: false,
      })
    }

    if (toSave.length === 0) { setError(t('drops.no_valid_item')); return }
    onSave(toSave)
  }

  const total1 = parseFloat(value1) || 0
  const total2 = parseFloat(value2) || 0
  const totalCashout = (total1 + total2) * settings.cashoutRate / 100

  const footer = (
    <div className="flex gap-3 w-full">
      <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
      <Button onClick={handleSave} className="flex-1" disabled={slotsLeft <= 0}>
        Registrar
      </Button>
    </div>
  )

  return (
    <Modal open onClose={onClose} title={t('drops.register_title')} size="md" footer={footer}>
      <div className="space-y-4">
        {/* Conta */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">Conta *</label>
          <select
            value={accountId}
            onChange={e => { setAccountId(e.target.value); setItem1(null); setValue1(''); setFloat1(''); setItem2(null); setValue2(''); setFloat2('') }}
            className="w-full h-10 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
          >
            {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Quando foi o drop */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">Quando foi?</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {([
              { mode: 'this-week' as DateMode, icon: Zap,        label: 'Esta semana' },
              { mode: 'manual'    as DateMode, icon: Calendar,   label: 'Escolher data' },
              { mode: 'unknown'   as DateMode, icon: HelpCircle, label: 'Não lembro' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateMode(mode)}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                  dateMode === mode
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-white/[0.08] bg-[#111827] text-slate-400 hover:border-white/[0.16] hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {dateMode === 'this-week' && (
            <p className="text-xs text-slate-500 px-1">{getWeekLabel(currentWid)}</p>
          )}
          {dateMode === 'manual' && (
            <div className="space-y-1">
              <input
                type="date"
                value={manualDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setManualDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
              />
              {manualDate && (
                <p className="text-xs text-slate-500 px-1">
                  Semana: {getWeekLabel(getWeekIdForDate(new Date(manualDate + 'T12:00:00')))}
                </p>
              )}
            </div>
          )}
          {dateMode === 'unknown' && (
            <p className="text-xs text-slate-500 px-1">Drop salvo sem data — não entra nos gráficos semanais.</p>
          )}
        </div>

        {/* Status */}
        {slotsLeft <= 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-loss/10 border border-loss/20 text-loss text-sm">
            <AlertCircle size={14} />
            Essa conta já tem 2 drops nessa semana.
          </div>
        ) : slotsLeft === 1 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold text-xs">
            <AlertCircle size={13} />
            Já tem 1 drop nessa semana — só mais 1 disponível.
          </div>
        )}

        {/* Item pickers */}
        {slotsLeft > 0 && (
          <>
            <ItemPicker
              label="Item 1"
              value={item1}
              steamValue={value1}
              onItemChange={i => { setItem1(i); if (!i) setFloat1('') }}
              onValueChange={setValue1}
              cashoutRate={settings.cashoutRate}
              currency={currency}
            />
            {item1 && detectItemType(item1.name) === 'weapon' && (
              <FloatInput float={float1} onFloatChange={setFloat1} />
            )}
            {slotsLeft >= 2 && existingDrops.length === 0 && (
              <>
                <ItemPicker
                  label="Item 2"
                  optional
                  value={item2}
                  steamValue={value2}
                  onItemChange={i => { setItem2(i); if (!i) setFloat2('') }}
                  onValueChange={setValue2}
                  cashoutRate={settings.cashoutRate}
                  currency={currency}
                />
                {item2 && detectItemType(item2.name) === 'weapon' && (
                  <FloatInput float={float2} onFloatChange={setFloat2} />
                )}
              </>
            )}
          </>
        )}

        {/* Summary */}
        {totalCashout > 0 && (
          <div className="p-3 rounded-xl bg-profit/10 border border-profit/20">
            <p className="text-xs text-slate-400 mb-1">Cashout estimado total</p>
            <p className="text-profit font-mono font-bold text-base">
              {formatCurrency(totalCashout, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              com taxa de {settings.cashoutRate}%
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-loss flex items-center gap-1">
            <AlertCircle size={12} />{error}
          </p>
        )}
      </div>
    </Modal>
  )
}

// ─── Sell Modal ───────────────────────────────────────────────────────────────

function SellModal({ drop, onSave, onClose }: { drop: Drop; onSave: (id: string, v: number) => void; onClose: () => void }) {
  const { settings } = useStore()
  const t = useT()
  const currency = settings.currency
  const [value, setValue] = useState((drop.steamValue * settings.cashoutRate / 100).toFixed(2))
  const parsed = parseFloat(value)
  const valid = Number.isFinite(parsed) && parsed >= 0
  return (
    <Modal open onClose={onClose} title="Registrar Venda">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.08]">
          <p className="text-sm font-medium text-white">{drop.item?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">Bruto: {formatCurrency(drop.steamValue, currency)}</p>
        </div>
        <Input label={`${t('drops.received_value')} (${currency === 'USD' ? '$' : 'R$'})`} type="number" min="0" step="0.01"
          value={value} onChange={e => setValue(e.target.value)}
          error={!valid && value !== '' ? 'Informe um valor válido' : undefined} />
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button variant="success" disabled={!valid}
            onClick={() => { if (valid) onSave(drop.id, parsed) }} className="flex-1">
            Confirmar Venda
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Drop Card ────────────────────────────────────────────────────────────────

function DropCard({ drop, accountName, accountColor, cashoutRate, currency, onDelete, onSell, index }: {
  drop: Drop; accountName: string; accountColor: string
  cashoutRate: number; currency: 'BRL' | 'USD'; index: number
  onDelete: () => void; onSell: () => void
}) {
  const cashout = drop.cashoutValue ?? drop.steamValue * cashoutRate / 100
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accountColor }} />
          <span className="text-xs text-slate-400">{accountName}</span>
          <span className="text-[10px] bg-[#1a2235] text-slate-500 px-1.5 py-0.5 rounded-md">Drop {drop.dropNumber}</span>
          {drop.sold && <span className="text-[10px] bg-profit/20 text-profit px-1.5 py-0.5 rounded-full">Vendido</span>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!drop.sold && (
            <button onClick={onSell}
              className="text-[11px] text-slate-500 hover:text-profit hover:bg-profit/10 px-2 py-1 rounded-lg transition-colors">
              Vender
            </button>
          )}
          <button onClick={onDelete} aria-label="Deletar drop"
            className="p-1.5 rounded-lg text-slate-600 hover:text-loss hover:bg-loss/10 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0d1117] border border-white/[0.06] mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center flex-shrink-0 overflow-hidden">
          <SteamItemImage imageUrl={drop.item?.imageUrl} alt={drop.item?.name} size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white font-medium leading-tight truncate">{drop.item?.name || '—'}</p>
          {drop.float != null && (
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">{drop.float.toFixed(4)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Cashout</p>
          <p className="font-mono font-semibold text-profit">{formatCurrency(cashout, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Bruto</p>
          <p className="font-mono text-sm text-slate-400">{formatCurrency(drop.steamValue, currency)}</p>
        </div>
      </div>
    </Card>
    </motion.div>
  )
}

// ─── Week Divider ─────────────────────────────────────────────────────────────

function WeekDivider({ weekId, cashout, count, isCurrentWeek, currency }: {
  weekId: string; cashout: number; count: number; isCurrentWeek: boolean; currency: 'BRL' | 'USD'
}) {
  const label = weekId === 'unknown'
    ? 'Sem data'
    : isCurrentWeek
    ? `Esta semana · ${getWeekLabel(weekId)}`
    : getWeekLabel(weekId)

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-white/[0.06]" />
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        {cashout > 0 && weekId !== 'unknown' && (
          <span className="text-xs text-profit font-mono">{formatCurrency(cashout, currency)}</span>
        )}
        <span className="text-[10px] text-slate-600">{count} drop{count !== 1 ? 's' : ''}</span>
      </div>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'sold' | 'unsold'
type FilterType = 'all' | 'weapon' | 'case' | 'sticker' | 'other'

export default function Drops() {
  const { accounts, drops, settings, addDrop, deleteDrop, markDropSold } = useStore()
  const t = useT()
  const currency = settings.currency
  const [showModal, setShowModal] = useState(false)
  const [sellingDrop, setSellingDrop] = useState<Drop | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [filterAccount, setFilterAccount] = useState('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')

  const currentWid = getCurrentWeekId()

  const hasActiveFilters = search || filterAccount !== 'all' || filterStatus !== 'all' || filterType !== 'all'

  const filtered = useMemo(() => {
    return drops.filter(d => {
      if (filterAccount !== 'all' && d.accountId !== filterAccount) return false
      if (filterStatus === 'sold' && !d.sold) return false
      if (filterStatus === 'unsold' && d.sold) return false
      const type = detectItemType(d.item?.name ?? '')
      if (search && !matchesSearch(d.item?.name ?? '', type, search)) return false
      if (filterType !== 'all' && type !== filterType) return false
      return true
    })
  }, [drops, filterAccount, filterStatus, search, filterType])

  const grouped = useMemo(() => {
    const map = new Map<string, Drop[]>()
    filtered.forEach(d => {
      if (!map.has(d.weekId)) map.set(d.weekId, [])
      map.get(d.weekId)!.push(d)
    })
    return [...map.entries()]
      .sort(([a], [b]) => {
        if (a === 'unknown') return 1
        if (b === 'unknown') return -1
        return b.localeCompare(a)
      })
      .map(([weekId, wdrops]) => ({
        weekId,
        drops: wdrops.sort((a, b) => a.accountId.localeCompare(b.accountId) || a.dropNumber - b.dropNumber),
        cashout: wdrops.reduce((s, d) => s + (d.cashoutValue ?? d.steamValue * settings.cashoutRate / 100), 0),
      }))
  }, [filtered, settings.cashoutRate])

  const totalCashout = useMemo(
    () => drops.reduce((s, d) => s + (d.cashoutValue ?? d.steamValue * settings.cashoutRate / 100), 0),
    [drops, settings.cashoutRate]
  )

  function handleSaveDrops(newDrops: Array<Omit<Drop, 'id' | 'createdAt'>>) {
    newDrops.forEach(d => addDrop(d))
    setShowModal(false)
  }

  function clearFilters() {
    setSearch('')
    setFilterAccount('all')
    setFilterStatus('all')
    setFilterType('all')
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Drops</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {drops.length} drops · cashout total{' '}
            <span className="text-profit font-mono">{formatCurrency(totalCashout, currency)}</span>
          </p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowModal(true)} className="shrink-0">
          <span className="hidden sm:inline">Registrar Drops</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
      </div>

      {/* Search + filter toggle */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por item..."
              className="w-full h-10 rounded-xl border border-white/[0.1] bg-[#11161d] text-slate-200 text-sm pl-9 pr-9 focus:outline-none focus:border-primary/60 placeholder:text-slate-600 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-white transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 h-10 px-3 rounded-xl border text-sm font-medium transition-all ${
              showFilters || (hasActiveFilters && !search)
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-white/[0.1] bg-[#11161d] text-slate-400 hover:text-slate-200 hover:border-white/[0.2]'
            }`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="rounded-xl border border-white/[0.08] bg-[#11161d] p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl bg-[#111827] border border-white/[0.1] text-slate-300 focus:outline-none focus:border-primary/60"
              >
                <option value="all">Todas as contas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                className="h-9 px-3 text-xs rounded-xl bg-[#111827] border border-white/[0.1] text-slate-300 focus:outline-none focus:border-primary/60"
              >
                <option value="all">Qualquer status</option>
                <option value="unsold">Não vendido</option>
                <option value="sold">Vendido</option>
              </select>

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
                className="h-9 px-3 text-xs rounded-xl bg-[#111827] border border-white/[0.1] text-slate-300 focus:outline-none focus:border-primary/60"
              >
                <option value="all">Qualquer tipo</option>
                <option value="weapon">Armas</option>
                <option value="case">Caixas</option>
                <option value="sticker">Sticker / Graffiti</option>
                <option value="other">Outros</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-0.5">
                <p className="text-xs text-slate-500">
                  {filtered.length} de {drops.length} drops
                </p>
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {drops.length === 0 ? (
        <Empty
          icon={Package}
          title={t('drops.empty_title')}
          description="Registre os itens recebidos. Você pode registrar até 2 por conta por semana."
          action={{ label: 'Registrar Drops', onClick: () => setShowModal(true) }}
        />
      ) : grouped.length === 0 ? (
        <Empty
          icon={Search}
          title={t('drops.empty_filtered')}
          description={t('drops.empty_filtered_desc')}
          action={{ label: 'Limpar filtros', onClick: clearFilters }}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ weekId, drops: wdrops, cashout }) => (
            <div key={weekId}>
              <WeekDivider
                weekId={weekId}
                cashout={cashout}
                count={wdrops.length}
                isCurrentWeek={weekId === currentWid}
                currency={currency}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                {wdrops.map((drop, i) => {
                  const acct = accounts.find(a => a.id === drop.accountId)
                  return (
                    <DropCard
                      key={drop.id}
                      drop={drop}
                      index={i}
                      accountName={acct?.name ?? '?'}
                      accountColor={acct?.color ?? '#64748b'}
                      cashoutRate={settings.cashoutRate}
                      currency={currency}
                      onDelete={() => deleteDrop(drop.id)}
                      onSell={() => setSellingDrop(drop)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <MarketplaceLinks />

      <AnimatePresence>
        {showModal && (
          accounts.filter(a => a.active).length === 0 ? (
            <Modal open onClose={() => setShowModal(false)} title="Sem contas ativas">
              <div className="text-center py-4 space-y-3">
                <p className="text-slate-400">Adicione uma conta ativa antes de registrar drops.</p>
                <Button onClick={() => { setShowModal(false); useStore.getState().setCurrentPage('accounts') }}>
                  Ir para Contas
                </Button>
              </div>
            </Modal>
          ) : (
            <DropModal onSave={handleSaveDrops} onClose={() => setShowModal(false)} />
          )
        )}
        {sellingDrop && (
          <SellModal drop={sellingDrop} onSave={(id, v) => { markDropSold(id, v); setSellingDrop(null) }} onClose={() => setSellingDrop(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
