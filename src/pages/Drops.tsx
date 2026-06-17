import { useState, useMemo, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, Search, X, Package,
  Trash2, DollarSign, AlertCircle, Calendar, HelpCircle, Zap, Filter, Edit2,
  PackageOpen, Check,
} from 'lucide-react'
import { useStore } from '../store'
import { cn, formatCurrency, getCurrentWeekId, getWeekLabel, getWeekIdForDate, getWeekRange } from '../lib/utils'
import { Button, Card, Input, Modal, Empty } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { searchSteamMarket, getSteamItemPrice } from '../lib/steam'
import { useT } from '../hooks/useT'
import toast from 'react-hot-toast'
import type { CaseOpeningLog, Drop, SteamItem, WearCondition } from '../lib/types'

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
  const t = useT()

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
    <div className="p-4 rounded-xl bg-[#0d1117] border border-white/[0.04] space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label} {optional && <span className="text-slate-600 normal-case font-normal">{t('drops.register_modal_input_item_optional')}</span>}
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
            placeholder={t('drops.register_modal_placeholder_search_item')}
            autoComplete="off"
            maxLength={80}
            className="w-full h-9 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm pl-9 pr-4 focus:outline-none focus:border-primary/60 transition-all placeholder:text-slate-600"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-primary/60 border-t-transparent rounded-full animate-spin" />
          )}
          {open && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#0d1117] border border-white/[0.04] rounded-xl overflow-hidden shadow-2xl">
              {results.map((r, i) => (
                <button key={i} onMouseDown={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#111827] text-left transition-colors border-b border-white/[0.02] last:border-0">
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
          placeholder={`${t('drops.placeholder_value')} (${currency === 'USD' ? '$' : 'R$'})`}
          className="flex-1 h-8 rounded-lg border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60 transition-all placeholder:text-slate-600"
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
  const t = useT()
  return (
    <div className="flex items-center gap-2 px-1">
      <input
        type="number"
        min="0"
        max="1"
        step="0.0001"
        value={float}
        onChange={e => onFloatChange(e.target.value)}
        placeholder={t('drops.register_modal_placeholder_float')}
        className="flex-1 h-8 rounded-lg border border-white/[0.05] bg-[#111827] text-slate-200 text-xs px-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
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

  const existingDrops = weekId === 'unknown'
    ? []
    : drops.filter(d => d.accountId === accountId && d.weekId === weekId)
  // When date is unknown, there is no weekly limit (we don't know the week)
  const slotsLeft = weekId === 'unknown' ? Infinity : 2 - existingDrops.length

  function handleSave() {
    setError('')
    if (!accountId) { setError(t('drops.register_modal_validation_account')); return }
    if (!item1 && !item2) { setError(t('drops.register_modal_validation_item')); return }
    if (slotsLeft !== Infinity && slotsLeft <= 0) { setError(t('drops.register_modal_validation_limit')); return }

    const rate = settings.cashoutRate / 100
    const toSave: Array<Omit<Drop, 'id' | 'createdAt'>> = []

    const firstDropNum = existingDrops.length === 0 ? 1 : 2
    const usdRate = settings.usdRate || 5.2

    if (item1 && (slotsLeft === Infinity || slotsLeft >= 1)) {
      let sv = parseFloat(value1) || 0
      if (currency === 'USD') sv = sv * usdRate
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
    if (item2 && (slotsLeft === Infinity || (slotsLeft >= 2 && existingDrops.length === 0))) {
      let sv = parseFloat(value2) || 0
      if (currency === 'USD') sv = sv * usdRate
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

  const raw1 = parseFloat(value1) || 0
  const raw2 = parseFloat(value2) || 0
  const usdRate = settings.usdRate || 5.2
  const total1 = currency === 'USD' ? raw1 * usdRate : raw1
  const total2 = currency === 'USD' ? raw2 * usdRate : raw2
  const totalCashout = (total1 + total2) * settings.cashoutRate / 100

  const footer = (
    <div className="flex gap-3 w-full">
      <Button variant="ghost" onClick={onClose} className="flex-1">{t('accounts.delete_modal_cancel')}</Button>
      <Button onClick={handleSave} className="flex-1" disabled={slotsLeft <= 0}>
        {t('dash.register_short')}
      </Button>
    </div>
  )

  return (
    <Modal open onClose={onClose} title={t('drops.register_title')} size="md" footer={footer}>
      <div className="space-y-4">
        {/* Conta */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5">{t('drops.register_modal_input_account')}</label>
          <select
            value={accountId}
            onChange={e => { setAccountId(e.target.value); setItem1(null); setValue1(''); setFloat1(''); setItem2(null); setValue2(''); setFloat2('') }}
            className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
          >
            {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Quando foi o drop */}
        <div>
          <label className="text-xs text-slate-400 block mb-2">{t('drops.register_modal_input_when')}</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {([
              { mode: 'this-week' as DateMode, icon: Zap,        label: t('drops.register_modal_when_this_week') },
              { mode: 'manual'    as DateMode, icon: Calendar,   label: t('drops.register_modal_when_manual') },
              { mode: 'unknown'   as DateMode, icon: HelpCircle, label: t('drops.register_modal_when_unknown') },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateMode(mode)}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                  dateMode === mode
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-white/[0.04] bg-[#111827] text-slate-400 hover:border-white/[0.08] hover:text-slate-200'
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
                className="w-full h-9 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
              />
              {manualDate && (
                <p className="text-xs text-slate-500 px-1">
                  {settings.language === 'en' ? 'Week:' : 'Semana:'} {getWeekLabel(getWeekIdForDate(new Date(manualDate + 'T12:00:00')))}
                </p>
              )}
            </div>
          )}
          {dateMode === 'unknown' && (
            <p className="text-xs text-slate-500 px-1">{t('drops.register_modal_when_unknown_hint')}</p>
          )}
        </div>

        {/* Status */}
        {slotsLeft !== Infinity && slotsLeft <= 0 ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-loss/10 border border-loss/20 text-loss text-sm">
            <AlertCircle size={14} />
            {t('drops.register_modal_limit_reached')}
          </div>
        ) : slotsLeft !== Infinity && slotsLeft === 1 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold text-xs">
            <AlertCircle size={13} />
            {t('drops.register_modal_limit_one')}
          </div>
        )}

        {/* Item pickers */}
        {(slotsLeft === Infinity || slotsLeft > 0) && (
          <>
            <ItemPicker
              label={t('drops.register_modal_input_item_label', { n: 1 })}
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
            {(slotsLeft === Infinity || (slotsLeft >= 2 && existingDrops.length === 0)) && (
              <>
                <ItemPicker
                  label={t('drops.register_modal_input_item_label', { n: 2 })}
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
            <p className="text-xs text-slate-400 mb-1">{t('drops.register_modal_est_cashout')}</p>
            <p className="text-profit font-mono font-bold text-base">
              {formatCurrency(totalCashout, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('drops.register_modal_rate_hint', { rate: settings.cashoutRate })}
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
  const usdRate = settings.usdRate || 5.2

  // Estimated cashout in BRL
  const estimatedBRL = drop.steamValue * settings.cashoutRate / 100
  // Convert to USD if currency is USD
  const initialValue = currency === 'USD' ? (estimatedBRL / usdRate).toFixed(2) : estimatedBRL.toFixed(2)

  const [value, setValue] = useState(initialValue)
  const parsed = parseFloat(value)
  const valid = Number.isFinite(parsed) && parsed >= 0
  return (
    <Modal open onClose={onClose} title={t('drops.sell_modal_title')}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.04]">
          <p className="text-sm font-medium text-white">{drop.item?.name || '—'}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('drops.gross')}: {formatCurrency(drop.steamValue, currency)}</p>
        </div>
        <Input label={`${t('drops.received_value')} (${currency === 'USD' ? '$' : 'R$'})`} type="number" min="0" step="0.01"
          value={value} onChange={e => setValue(e.target.value)}
          error={!valid && value !== '' ? t('drops.sell_modal_validation_value') : undefined} />
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">{t('accounts.delete_modal_cancel')}</Button>
          <Button variant="success" disabled={!valid}
            onClick={() => {
              if (valid) {
                // If USD, convert input back to BRL for the DB
                const finalValue = currency === 'USD' ? parsed * usdRate : parsed
                onSave(drop.id, parseFloat(finalValue.toFixed(2)))
              }
            }} className="flex-1">
            {t('drops.sell_modal_confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Case Opening Modal ──────────────────────────────────────────────────────

function CaseOpeningModal({ drop, onSave, onClose }: {
  drop: Drop
  onSave: (data: Omit<CaseOpeningLog, 'id' | 'createdAt'>) => void
  onClose: () => void
}) {
  const { settings } = useStore()
  const t = useT()
  const currency = settings.currency
  const usdRate = settings.usdRate || 5.2
  const toDisplay = (valueBRL: number) => currency === 'USD' ? (valueBRL / usdRate).toFixed(2) : valueBRL.toFixed(2)
  const toBRL = (value: string) => {
    const parsed = parseFloat(value) || 0
    return currency === 'USD' ? parsed * usdRate : parsed
  }

  const [caseValue, setCaseValue] = useState(toDisplay(drop.steamValue || 0))
  const [keyValue, setKeyValue] = useState(toDisplay(13.99))
  const [receivedItem, setReceivedItem] = useState<SteamItem | null>(null)
  const [receivedValue, setReceivedValue] = useState('')
  const [wear, setWear] = useState<WearCondition>('FT')
  const [statTrak, setStatTrak] = useState(false)
  const [loadingCasePrice, setLoadingCasePrice] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (drop.steamValue > 0) return
    let cancelled = false
    setLoadingCasePrice(true)
    getSteamItemPrice(drop.item.marketHashName)
      .then(price => {
        if (cancelled) return
        const value = price?.lowestPrice ?? price?.medianPrice ?? 0
        if (value > 0) setCaseValue(toDisplay(value))
      })
      .finally(() => {
        if (!cancelled) setLoadingCasePrice(false)
      })
    return () => { cancelled = true }
  }, [drop.item.marketHashName, drop.steamValue])

  const caseBRL = toBRL(caseValue)
  const keyBRL = toBRL(keyValue)
  const receivedBRL = toBRL(receivedValue)
  const profitLoss = receivedBRL - caseBRL - keyBRL
  const valid = receivedItem && receivedBRL >= 0 && caseBRL >= 0 && keyBRL >= 0

  function handleSave() {
    setError('')
    if (!receivedItem) { setError(t('drops.case_modal_validation_item')); return }
    if (!Number.isFinite(profitLoss)) { setError(t('drops.case_modal_validation_values')); return }
    onSave({
      dropId: drop.id,
      caseItem: drop.item,
      casePriceAtOpen: parseFloat(caseBRL.toFixed(2)),
      keyPriceAtOpen: parseFloat(keyBRL.toFixed(2)),
      keyPrice: parseFloat(keyBRL.toFixed(2)),
      obtainedItem: receivedItem,
      receivedItem,
      obtainedValue: parseFloat(receivedBRL.toFixed(2)),
      receivedValueAtOpen: parseFloat(receivedBRL.toFixed(2)),
      openedAt: new Date().toISOString(),
      profitLoss: parseFloat(profitLoss.toFixed(2)),
      wear,
      statTrak,
      sold: false,
    })
  }

  return (
    <Modal open onClose={onClose} title={t('drops.case_modal_title')} size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-[#111827]/60 p-3">
          <div className="h-12 w-12 rounded-lg bg-[#0d1117] border border-white/[0.04] overflow-hidden flex items-center justify-center">
            <SteamItemImage imageUrl={drop.item.imageUrl} alt={drop.item.name} size={48} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{drop.item.name}</p>
            <p className="text-xs text-slate-500">{t('drops.case_modal_case_locked')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('drops.case_modal_case_value', { currency: currency === 'USD' ? '$' : 'R$' })}
            type="number"
            min="0"
            step="0.01"
            value={caseValue}
            onChange={e => setCaseValue(e.target.value)}
            hint={loadingCasePrice ? t('drops.case_modal_loading_price') : undefined}
          />
          <Input
            label={t('drops.case_modal_key_value', { currency: currency === 'USD' ? '$' : 'R$' })}
            type="number"
            min="0"
            step="0.01"
            value={keyValue}
            onChange={e => setKeyValue(e.target.value)}
          />
        </div>

        <ItemPicker
          label={t('drops.case_modal_received_item')}
          value={receivedItem}
          steamValue={receivedValue}
          onItemChange={setReceivedItem}
          onValueChange={setReceivedValue}
          cashoutRate={100}
          currency={currency}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">{t('drops.case_modal_wear')}</label>
            <select
              value={wear}
              onChange={e => setWear(e.target.value as WearCondition)}
              className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
            >
              <option value="FN">Factory New</option>
              <option value="MW">Minimal Wear</option>
              <option value="FT">Field-Tested</option>
              <option value="WW">Well-Worn</option>
              <option value="BS">Battle-Scarred</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setStatTrak(v => !v)}
            className={cn(
              'mt-6 h-10 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-2',
              statTrak
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-white/[0.05] bg-[#111827] text-slate-400 hover:text-slate-200',
            )}
          >
            {statTrak && <Check size={14} />}
            StatTrak
          </button>
        </div>

        <div className={cn(
          'rounded-xl border p-4',
          profitLoss >= 0 ? 'border-profit/20 bg-profit/5' : 'border-loss/20 bg-loss/5',
        )}>
          <p className="text-xs text-slate-500">{t('drops.case_modal_profit_loss')}</p>
          <p className={cn('mt-1 font-mono text-xl font-bold', profitLoss >= 0 ? 'text-profit' : 'text-loss')}>
            {formatCurrency(profitLoss, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {t('drops.case_modal_formula')}
          </p>
        </div>

        {error && <p className="text-xs text-loss flex items-center gap-1"><AlertCircle size={12} />{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">{t('accounts.delete_modal_cancel')}</Button>
          <Button onClick={handleSave} disabled={!valid} className="flex-1">{t('drops.case_modal_save')}</Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Edit Drop Modal ─────────────────────────────────────────────────────────

function EditDropModal({ drop, onSave, onClose }: {
  drop: Drop; onSave: (id: string, updates: Partial<Drop>) => void; onClose: () => void
}) {
  const { accounts, settings } = useStore()
  const t = useT()
  const currency = settings.currency

  const [accountId, setAccountId] = useState(drop.accountId)
  const [dateMode, setDateMode] = useState<DateMode>(() => {
    if (drop.weekId === 'unknown') return 'unknown'
    const currentWid = getCurrentWeekId()
    if (drop.weekId === currentWid) return 'this-week'
    return 'manual'
  })
  
  const [manualDate, setManualDate] = useState(() => {
    const dateStr = drop.createdAt ?? drop.registeredAt ?? new Date().toISOString()
    return dateStr.slice(0, 10)
  })

  const usdRate = settings.usdRate || 5.2

  // Load steamValue and cashoutValue converted if currency is USD
  const initialSteamValue = currency === 'USD' ? (drop.steamValue / usdRate).toFixed(2) : drop.steamValue.toString()
  const initialCashoutValue = drop.cashoutValue != null
    ? (currency === 'USD' ? (drop.cashoutValue / usdRate).toFixed(2) : drop.cashoutValue.toString())
    : ''

  const [steamValue, setSteamValue] = useState(initialSteamValue)
  const [cashoutValue, setCashoutValue] = useState(initialCashoutValue)
  const [float, setFloat] = useState(drop.float != null ? drop.float.toString() : '')
  const [error, setError] = useState('')

  function handleSave() {
    setError('')
    if (!accountId) { setError(t('drops.register_modal_validation_account')); return }
    let sv = parseFloat(steamValue)
    if (isNaN(sv) || sv < 0) { setError(t('drops.edit_modal_validation_gross')); return }

    const calculatedWeekId = dateMode === 'this-week'
      ? getCurrentWeekId()
      : dateMode === 'manual'
      ? getWeekIdForDate(new Date(manualDate + 'T12:00:00'))
      : 'unknown'

    let cv = parseFloat(cashoutValue)
    const fl = parseFloat(float)

    // Convert values back to BRL if currency is USD
    if (currency === 'USD') {
      sv = sv * usdRate
      if (!isNaN(cv) && cashoutValue !== '') {
        cv = cv * usdRate
      }
    }

    const updates: Partial<Drop> = {
      accountId,
      weekId: calculatedWeekId,
      steamValue: sv,
      cashoutValue: !isNaN(cv) && cashoutValue !== '' ? cv : undefined,
      float: !isNaN(fl) && fl >= 0 && fl <= 1 && float !== '' ? fl : undefined,
    }

    if (dateMode === 'manual' && manualDate) {
      updates.createdAt = new Date(manualDate + 'T12:00:00').toISOString()
    } else if (dateMode === 'this-week') {
      const { start, end } = getWeekRange(getCurrentWeekId())
      const curDate = new Date(drop.createdAt)
      if (curDate < start || curDate >= end) {
        updates.createdAt = new Date().toISOString()
      }
    }

    onSave(drop.id, updates)
  }

  return (
    <Modal open onClose={onClose} title={t('drops.edit_modal_title')} size="md">
      <div className="space-y-4">
        {/* Conta */}
        <div>
          <label className="text-xs text-slate-400 block mb-1.5 font-medium uppercase tracking-wider">{t('drops.register_modal_input_account')}</label>
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
          >
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} {!a.active ? `(${t('dash.rankings.status_inactive')})` : ''}</option>)}
          </select>
        </div>

        {/* Quando foi o drop */}
        <div>
          <label className="text-xs text-slate-400 block mb-2 font-medium uppercase tracking-wider">{t('drops.register_modal_input_when')}</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {([
              { mode: 'this-week' as DateMode, icon: Zap,        label: t('drops.register_modal_when_this_week') },
              { mode: 'manual'    as DateMode, icon: Calendar,   label: t('drops.register_modal_when_manual') },
              { mode: 'unknown'   as DateMode, icon: HelpCircle, label: t('drops.register_modal_when_unknown') },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDateMode(mode)}
                className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                  dateMode === mode
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-white/[0.04] bg-[#111827] text-slate-400 hover:border-white/[0.08] hover:text-slate-200'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {dateMode === 'this-week' && (
            <p className="text-xs text-slate-500 px-1">{getWeekLabel(getCurrentWeekId())}</p>
          )}
          {dateMode === 'manual' && (
            <div className="space-y-1">
              <input
                type="date"
                value={manualDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setManualDate(e.target.value)}
                className="w-full h-9 rounded-xl border border-white/[0.05] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
              />
              {manualDate && (
                <p className="text-xs text-slate-500 px-1">
                  {settings.language === 'en' ? 'Week:' : 'Semana:'} {getWeekLabel(getWeekIdForDate(new Date(manualDate + 'T12:00:00')))}
                </p>
              )}
            </div>
          )}
          {dateMode === 'unknown' && (
            <p className="text-xs text-slate-500 px-1">{t('drops.register_modal_when_unknown_hint')}</p>
          )}
        </div>

        {/* Valores */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('drops.edit_modal_input_gross', { currency: currency === 'USD' ? '$' : 'R$' })}
            type="number"
            min="0"
            step="0.01"
            value={steamValue}
            onChange={e => setSteamValue(e.target.value)}
          />
          <Input
            label={t('drops.edit_modal_input_cashout', { currency: currency === 'USD' ? '$' : 'R$' })}
            type="number"
            min="0"
            step="0.01"
            value={cashoutValue}
            placeholder={settings.language === 'en' ? 'Optional' : 'Opcional'}
            onChange={e => setCashoutValue(e.target.value)}
          />
        </div>

        {/* Float */}
        {detectItemType(drop.item?.name ?? '') === 'weapon' && (
          <Input
            label={t('drops.edit_modal_input_float')}
            type="number"
            min="0"
            max="1"
            step="0.0001"
            value={float}
            onChange={e => setFloat(e.target.value)}
          />
        )}

        {error && (
          <p className="text-xs text-loss flex items-center gap-1">
            <AlertCircle size={12} />{error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">{t('accounts.delete_modal_cancel')}</Button>
          <Button onClick={handleSave} className="flex-1">
            {t('drops.edit_modal_save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Drop Card ────────────────────────────────────────────────────────────────

// ─── Rarity Helper ─────────────────────────────────────────────────────────────

function getRarityColor(name: string, value: number): { border: string; glow: string; badge: string; color: string; bg: string } {
  const lower = name.toLowerCase()
  if (lower.includes('stattrak')) {
    return { border: 'border-orange-500/40', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.12)]', badge: 'orange', color: '#f97316', bg: 'from-orange-500/5 to-transparent' }
  }
  if (lower.includes('covert') || value >= 100) {
    return { border: 'border-red-500/40', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.12)]', badge: 'red', color: '#ef4444', bg: 'from-red-500/5 to-transparent' }
  }
  if (lower.includes('classified') || value >= 30) {
    return { border: 'border-purple-500/40', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.12)]', badge: 'purple', color: '#a855f7', bg: 'from-purple-500/5 to-transparent' }
  }
  if (lower.includes('restricted') || value >= 10) {
    return { border: 'border-pink-500/40', glow: 'shadow-[0_0_15px_rgba(236,72,153,0.12)]', badge: 'pink', color: '#ec4899', bg: 'from-pink-500/5 to-transparent' }
  }
  if (lower.includes('mil-spec') || lower.includes('militar') || value >= 3) {
    return { border: 'border-blue-500/40', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.12)]', badge: 'blue', color: '#3b82f6', bg: 'from-blue-500/5 to-transparent' }
  }
  if (lower.includes('case') || lower.includes('caixa')) {
    return { border: 'border-yellow-500/20', glow: 'shadow-[0_0_10px_rgba(234,179,8,0.08)]', badge: 'gold', color: '#eab308', bg: 'from-yellow-500/3 to-transparent' }
  }
  return { border: 'border-slate-500/15', glow: '', badge: 'default', color: '#64748b', bg: 'from-slate-500/3 to-transparent' }
}

// ─── Drop Card ────────────────────────────────────────────────────────────────

function DropCard({ drop, accountName, accountAvatar, accountColor, cashoutRate, currency, onDelete, onSell, onEdit, onOpenCase, caseOpened, index }: {
  drop: Drop; accountName: string; accountAvatar?: string; accountColor: string
  cashoutRate: number; currency: 'BRL' | 'USD'; index: number
  onDelete: () => void; onSell: () => void; onEdit: () => void
  onOpenCase?: () => void; caseOpened?: boolean
}) {
  const cashout = drop.cashoutValue ?? drop.steamValue * cashoutRate / 100
  const rarity = getRarityColor(drop.item?.name ?? '', drop.steamValue)
  const t = useT()
  const isCaseDrop = detectItemType(drop.item?.name ?? '') === 'case'
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="relative pl-6 sm:pl-8 group"
    >
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-6 sm:w-8 h-px bg-white/[0.04] group-hover:bg-primary/20 transition-colors" />
      <span
        className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/20 transition-all duration-300 group-hover:scale-125"
        style={{ backgroundColor: rarity.color }}
      />

      <Card className={cn(
        'p-4 relative overflow-hidden transition-all duration-300 hover:border-white/[0.06] border-white/[0.025]',
        rarity.border, rarity.glow, rarity.bg
      )}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {accountAvatar ? (
              <img src={accountAvatar} alt={accountName} className="w-5 h-5 rounded-full object-cover border border-white/[0.04]" />
            ) : (
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-200 border border-white/[0.04] uppercase" style={{ backgroundColor: accountColor }}>
                {accountName.slice(0, 2)}
              </div>
            )}
            <span className="text-xs text-slate-400 font-body">{accountName}</span>
            <span className="text-[9px] bg-white/[0.03] border border-white/[0.03] text-slate-500 px-1.5 py-0.5 rounded-md font-body">{t('dash.rankings.col_drops')} {drop.dropNumber}</span>
            {drop.sold && <span className="text-[9px] bg-profit/15 text-profit px-1.5 py-0.5 rounded-full font-semibold font-body">{t('common.sold')}</span>}
          </div>
          <div className="flex gap-1.5 items-center flex-shrink-0">
            {isCaseDrop && (
              <button
                onClick={onOpenCase}
                disabled={caseOpened}
                className={cn(
                  'text-[10px] font-semibold px-3 py-2 rounded-lg transition-colors font-body inline-flex items-center gap-1.5',
                  caseOpened
                    ? 'text-slate-600 bg-white/[0.02] cursor-not-allowed'
                    : 'text-gold hover:text-gold hover:bg-gold/10',
                )}
              >
                <PackageOpen size={12} />
                {caseOpened ? t('drops.case_opened') : t('drops.open_case')}
              </button>
            )}
            {!drop.sold && (
              <button onClick={onSell}
                className="text-[10px] font-semibold text-slate-400 hover:text-profit hover:bg-profit/10 px-3 py-2 rounded-lg transition-colors font-body">
                {t('drops.btn_sell')}
              </button>
            )}
            <button onClick={onEdit} aria-label={t('drops.edit_modal_title')}
              className="p-2.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.03] transition-colors">
              <Edit2 size={12} />
            </button>
            <button onClick={onDelete} aria-label={t('accounts.btn_delete')}
              className="p-2.5 rounded-lg text-slate-500 hover:text-loss hover:bg-loss/10 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0d1117]/60 border border-white/[0.02] mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/[0.03]">
            <SteamItemImage imageUrl={drop.item?.imageUrl} alt={drop.item?.name} size={40} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm text-slate-100 font-bold leading-tight truncate font-body">{drop.item?.name || '—'}</p>
            {drop.float != null && (
              <span className="text-[9px] font-mono text-slate-500 mt-1 block">Float: {drop.float.toFixed(4)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-body">Cashout</p>
            <p className="font-mono text-xs sm:text-sm font-bold text-profit mt-0.5">{formatCurrency(cashout, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-body">{t('drops.gross')}</p>
            <p className="font-mono text-xs font-semibold text-slate-400 mt-0.5">{formatCurrency(drop.steamValue, currency)}</p>
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
  const t = useT()
  const label = weekId === 'unknown'
    ? t('drops.timeline_no_date')
    : isCurrentWeek
    ? `${t('drops.timeline_active_cycle')} · ${getWeekLabel(weekId)}`
    : getWeekLabel(weekId)

  return (
    <div className="relative pl-6 sm:pl-8 py-2">
      <span className="absolute left-[-4.5px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0d1117] border-2 border-white/20" />
      
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-300 tracking-wide font-body uppercase">{label}</span>
        <span className="h-px flex-1 bg-white/[0.02]" />
        <div className="flex items-center gap-2 shrink-0">
          {cashout > 0 && weekId !== 'unknown' && (
            <span className="text-xs text-profit font-mono font-bold bg-profit/5 border border-profit/5 px-2 py-0.5 rounded-md font-body">
              {formatCurrency(cashout, currency)}
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-body">{count} {count === 1 ? t('drops.timeline_drop_suffix') : t('drops.timeline_drops_suffix')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Minor Drops Table (Compact View) ──────────────────────────────────────────

interface MinorDropsTableProps {
  drops: Drop[]
  accounts: any[]
  currency: 'BRL' | 'USD'
  cashoutRate: number
  onEdit: (d: Drop) => void
  onDelete: (d: Drop) => void
  onSell: (d: Drop) => void
}

function MinorDropsTable({ drops, accounts, currency, cashoutRate, onEdit, onDelete, onSell }: MinorDropsTableProps) {
  const t = useT()
  return (
    <div className="relative pl-6 sm:pl-8 mt-2">
      <Card className="bg-white/[0.01] border-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[9px] text-slate-500 font-bold uppercase tracking-wider border-b border-white/[0.02] font-body bg-[#11161d]/20">
                <th className="py-2.5 px-4">{t('drops.table_col_account')}</th>
                <th className="py-2.5 px-3">{t('drops.table_col_item')}</th>
                <th className="py-2.5 px-3 text-right">{t('drops.table_col_gross')}</th>
                <th className="py-2.5 px-3 text-right">{t('drops.table_col_cashout')}</th>
                <th className="py-2.5 px-4 text-right">{t('drops.table_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02] text-xs">
              {drops.map(drop => {
                const acct = accounts.find(a => a.id === drop.accountId)
                const cashout = drop.cashoutValue ?? drop.steamValue * cashoutRate / 100
                
                return (
                  <tr key={drop.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="py-2 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {acct?.avatarUrl ? (
                          <img src={acct.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-white/[0.03]" />
                        ) : (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-200" style={{ backgroundColor: acct?.color ?? '#64748b' }}>
                            {acct?.name?.slice(0, 2).toUpperCase() ?? '?'}
                          </div>
                        )}
                        <span className="font-semibold text-slate-400 font-body">{acct?.name ?? 'Conta'}</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#111827] overflow-hidden flex items-center justify-center border border-white/[0.03] shrink-0">
                          <SteamItemImage imageUrl={drop.item?.imageUrl} alt={drop.item?.name} size={24} />
                        </div>
                        <span className="truncate text-slate-300 font-medium font-body max-w-[180px]" title={drop.item?.name}>
                          {drop.item?.name || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      {formatCurrency(drop.steamValue, currency)}
                    </td>

                    <td className="py-2 px-3 text-right font-mono text-profit font-semibold">
                      {formatCurrency(cashout, currency)}
                    </td>

                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {!drop.sold && (
                          <button onClick={() => onSell(drop)}
                            className="text-[9px] font-bold text-slate-400 hover:text-profit px-2 py-1 rounded bg-white/[0.02] border border-white/[0.04] hover:bg-profit/10 hover:border-profit/20 transition-all font-body">
                            {t('drops.btn_sell')}
                          </button>
                        )}
                        {drop.sold && (
                          <span className="text-[9px] font-semibold text-profit bg-profit/10 px-1.5 py-0.5 rounded font-body">{t('common.sold')}</span>
                        )}
                        <button onClick={() => onEdit(drop)} aria-label={t('drops.edit_modal_title')}
                          className="p-2 rounded text-slate-500 hover:text-slate-200 transition-colors">
                          <Edit2 size={10} />
                        </button>
                        <button onClick={() => onDelete(drop)} aria-label={t('accounts.btn_delete')}
                          className="p-2 rounded text-slate-500 hover:text-loss transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'sold' | 'unsold'
type FilterType = 'all' | 'weapon' | 'case' | 'sticker' | 'other'

export default function Drops() {
  const { accounts, drops, cases, settings, addDrop, deleteDrop, markDropSold, updateDrop, addCaseOpening } = useStore()
  const t = useT()
  const currency = settings.currency
  const [showModal, setShowModal] = useState(false)
  const [sellingDrop, setSellingDrop] = useState<Drop | null>(null)
  const [editingDrop, setEditingDrop] = useState<Drop | null>(null)
  const [openingDrop, setOpeningDrop] = useState<Drop | null>(null)
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
    if (newDrops.length === 1) {
      toast.success(t('drops.toast_drop_added'))
    } else {
      toast.success(t('drops.toast_drops_added', { count: newDrops.length }))
    }
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
          <h1 className="text-xl font-bold text-white">{t('nav.drops')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {t('drops.total_drops_and_cashout', { count: drops.length })}{' '}
            <span className="text-profit font-mono">{formatCurrency(totalCashout, currency)}</span>
          </p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowModal(true)} className="shrink-0">
          <span className="hidden sm:inline">{t('dash.register')}</span>
          <span className="sm:hidden">{t('dash.register_short')}</span>
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
              placeholder={t('drops.input_search_placeholder')}
              className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#11161d] text-slate-200 text-sm pl-9 pr-9 focus:outline-none focus:border-primary/60 placeholder:text-slate-600 transition-colors"
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
                : 'border-white/[0.05] bg-[#11161d] text-slate-400 hover:text-slate-200 hover:border-white/[0.1]'
            }`}
          >
            <Filter size={14} />
            <span className="hidden sm:inline">{t('drops.btn_filters')}</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="rounded-xl border border-white/[0.04] bg-[#11161d] p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl bg-[#111827] border border-white/[0.05] text-slate-300 focus:outline-none focus:border-primary/60"
              >
                <option value="all">{t('drops.filter_all_accounts')}</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as FilterStatus)}
                className="h-9 px-3 text-xs rounded-xl bg-[#111827] border border-white/[0.05] text-slate-300 focus:outline-none focus:border-primary/60"
              >
                <option value="all">{t('drops.filter_any_status')}</option>
                <option value="unsold">{t('drops.filter_unsold')}</option>
                <option value="sold">{t('drops.filter_sold')}</option>
              </select>

              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as FilterType)}
                className="h-9 px-3 text-xs rounded-xl bg-[#111827] border border-white/[0.05] text-slate-300 focus:outline-none focus:border-primary/60"
              >
                <option value="all">{t('drops.filter_any_type')}</option>
                <option value="weapon">{t('drops.filter_weapons')}</option>
                <option value="case">{t('drops.filter_cases')}</option>
                <option value="sticker">{t('drops.filter_stickers')}</option>
                <option value="other">{t('drops.filter_others')}</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-0.5">
                <p className="text-xs text-slate-500">
                  {t('drops.filter_stats', { filtered: filtered.length, total: drops.length })}
                </p>
                <button onClick={clearFilters} className="text-xs text-primary hover:underline">
                  {t('drops.btn_clear_filters')}
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
          description={t('drops.empty_desc_default')}
          action={{ label: t('dash.register'), onClick: () => setShowModal(true) }}
        />
      ) : grouped.length === 0 ? (
        <Empty
          icon={Search}
          title={t('drops.empty_filtered')}
          description={t('drops.empty_filtered_desc')}
          action={{ label: t('drops.btn_clear_filters'), onClick: clearFilters }}
        />
      ) : (
        <div className="relative border-l border-white/[0.03] ml-2.5 sm:ml-3 pl-0 space-y-8 py-2">
          {grouped.map(({ weekId, drops: wdrops, cashout }) => {
            return (
              <div key={weekId} className="space-y-4">
                <WeekDivider
                  weekId={weekId}
                  cashout={cashout}
                  count={wdrops.length}
                  isCurrentWeek={weekId === currentWid}
                  currency={currency}
                />
                
                {wdrops.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {wdrops.map((drop, i) => {
                      const acct = accounts.find(a => a.id === drop.accountId)
                      return (
                        <DropCard
                          key={drop.id}
                          drop={drop}
                          index={i}
                          accountName={acct?.name ?? '?'}
                          accountAvatar={acct?.avatarUrl}
                          accountColor={acct?.color ?? '#64748b'}
                          cashoutRate={settings.cashoutRate}
                          currency={currency}
                          onDelete={() => { deleteDrop(drop.id); toast.success(t('drops.toast_drop_deleted')) }}
                          onSell={() => setSellingDrop(drop)}
                          onEdit={() => setEditingDrop(drop)}
                          onOpenCase={() => setOpeningDrop(drop)}
                          caseOpened={cases.some(c => c.dropId === drop.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          accounts.filter(a => a.active).length === 0 ? (
            <Modal open onClose={() => setShowModal(false)} title={t('drops.modal_no_active_accounts_title')}>
              <div className="text-center py-4 space-y-3">
                <p className="text-slate-400">{t('drops.modal_no_active_accounts_desc')}</p>
                <Button onClick={() => { setShowModal(false); useStore.getState().setCurrentPage('accounts') }}>
                  {t('drops.modal_no_active_accounts_action')}
                </Button>
              </div>
            </Modal>
          ) : (
            <DropModal onSave={handleSaveDrops} onClose={() => setShowModal(false)} />
          )
        )}
        {sellingDrop && (
          <SellModal drop={sellingDrop} onSave={(id, v) => { markDropSold(id, v); setSellingDrop(null); toast.success(t('drops.toast_drop_sold')) }} onClose={() => setSellingDrop(null)} />
        )}
        {editingDrop && (
          <EditDropModal drop={editingDrop} onSave={(id, updates) => { updateDrop(id, updates); setEditingDrop(null); toast.success(t('drops.toast_drop_updated')) }} onClose={() => setEditingDrop(null)} />
        )}
        {openingDrop && (
          <CaseOpeningModal
            drop={openingDrop}
            onSave={(data) => {
              addCaseOpening(data)
              setOpeningDrop(null)
              toast.success(t('drops.case_modal_toast_saved'))
            }}
            onClose={() => setOpeningDrop(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
