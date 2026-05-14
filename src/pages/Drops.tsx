import { useState, useMemo, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, Search, X, Package,
  Trash2, DollarSign, AlertCircle,
} from 'lucide-react'
import { useStore } from '../store'
import { formatCurrency, getCurrentWeekId, getWeekLabel, getPreviousWeeks, cn } from '../lib/utils'
import { Button, Card, Input, Modal, Empty } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { searchSteamMarket, getSteamItemPrice } from '../lib/steam'
import type { Drop, SteamItem } from '../lib/types'

// ─── Steam Item Picker ────────────────────────────────────────────────────────

interface ItemPickerProps {
  label: string
  value: SteamItem | null
  steamValue: string
  onItemChange: (item: SteamItem | null) => void
  onValueChange: (v: string) => void
  cashoutRate: number
  optional?: boolean
}

function ItemPicker({ label, value, steamValue, onItemChange, onValueChange, cashoutRate, optional }: ItemPickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ name: string; hashName: string; imageUrl: string; sellPrice?: number }>>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const r = await searchSteamMarket(q)
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
            {cashout > 0 && <p className="text-xs text-slate-500">Cashout: {formatCurrency(cashout)}</p>}
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
                  {r.sellPrice ? <span className="text-xs font-mono text-profit flex-shrink-0">{formatCurrency(r.sellPrice)}</span> : null}
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
          placeholder="Valor Steam (R$)"
          className="flex-1 h-8 rounded-lg border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60 transition-all placeholder:text-slate-600"
        />
        {parseFloat(steamValue) > 0 && (
          <span className="text-xs text-profit font-mono whitespace-nowrap">
            → {formatCurrency(cashout)}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Drop Registration Modal ──────────────────────────────────────────────────

interface DropModalProps {
  onSave: (drops: Array<Omit<Drop, 'id' | 'createdAt'>>) => void
  onClose: () => void
}

function DropModal({ onSave, onClose }: DropModalProps) {
  const { accounts, drops, settings } = useStore()
  const activeAccounts = accounts.filter(a => a.active)
  const weeks = getPreviousWeeks(8)
  const currentWid = getCurrentWeekId()

  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? '')
  const [dateMode, setDateMode] = useState<'current' | 'pick' | 'unknown'>('current')
  const [weekId, setWeekId] = useState(currentWid)
  const [item1, setItem1] = useState<SteamItem | null>(null)
  const [value1, setValue1] = useState('')
  const [item2, setItem2] = useState<SteamItem | null>(null)
  const [value2, setValue2] = useState('')
  const [error, setError] = useState('')

  // "não lembro" usa weekId especial que não afeta gráficos
  const effectiveWeekId = dateMode === 'unknown' ? 'unknown' : weekId
  const existingDrops = dateMode === 'unknown' ? [] : drops.filter(d => d.accountId === accountId && d.weekId === weekId)
  const slotsLeft = dateMode === 'unknown' ? 2 : 2 - existingDrops.length

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
      toSave.push({
        accountId, weekId: effectiveWeekId,
        dropNumber: firstDropNum as 1 | 2,
        item: item1,
        steamValue: sv,
        cashoutValue: sv > 0 ? parseFloat((sv * rate).toFixed(2)) : undefined,
        sold: false,
      })
    }
    if (item2 && slotsLeft >= 2 && existingDrops.length === 0) {
      const sv = parseFloat(value2) || 0
      toSave.push({
        accountId, weekId: effectiveWeekId,
        dropNumber: 2,
        item: item2,
        steamValue: sv,
        cashoutValue: sv > 0 ? parseFloat((sv * rate).toFixed(2)) : undefined,
        sold: false,
      })
    }

    if (toSave.length === 0) { setError('Nenhum item válido'); return }
    onSave(toSave)
  }

  const total1 = parseFloat(value1) || 0
  const total2 = parseFloat(value2) || 0
  const totalCashout = (total1 + total2) * settings.cashoutRate / 100

  return (
    <Modal open onClose={onClose} title="Registrar Drops da Semana" size="md">
      <div className="space-y-4">
        {/* Account + Week selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Conta *</label>
            <select
              value={accountId}
              onChange={e => { setAccountId(e.target.value); setItem1(null); setValue1(''); setItem2(null); setValue2('') }}
              className="w-full h-10 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
            >
              {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Semana</label>
            <div className="flex gap-1.5 mb-2">
              {([
                { mode: 'current' as const, label: 'Esta semana' },
                { mode: 'pick' as const, label: 'Escolher' },
                { mode: 'unknown' as const, label: 'Não lembro' },
              ]).map(opt => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => { setDateMode(opt.mode); if (opt.mode === 'current') setWeekId(currentWid) }}
                  className={cn(
                    'flex-1 text-[11px] py-1.5 rounded-lg font-medium transition-all',
                    dateMode === opt.mode
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-[#111827] text-slate-500 border border-white/[0.06] hover:text-slate-300',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {dateMode === 'pick' && (
              <select
                value={weekId}
                onChange={e => setWeekId(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/[0.1] bg-[#111827] text-slate-200 text-sm px-3 focus:outline-none focus:border-primary/60"
              >
                {weeks.map(w => (
                  <option key={w} value={w}>
                    {w === currentWid ? '★ Esta semana' : getWeekLabel(w)}
                  </option>
                ))}
              </select>
            )}
            {dateMode === 'unknown' && (
              <p className="text-[11px] text-slate-600 italic">Drop registrado sem data — não afeta gráficos.</p>
            )}
          </div>
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
              onItemChange={setItem1}
              onValueChange={setValue1}
              cashoutRate={settings.cashoutRate}
              
            />
            {slotsLeft >= 2 && existingDrops.length === 0 && (
              <ItemPicker
                label="Item 2"
                optional
                value={item2}
                steamValue={value2}
                onItemChange={setItem2}
                onValueChange={setValue2}
                cashoutRate={settings.cashoutRate}
                
              />
            )}
          </>
        )}

        {/* Summary */}
        {totalCashout > 0 && (
          <div className="p-3 rounded-xl bg-profit/10 border border-profit/20">
            <p className="text-xs text-slate-400 mb-1">Cashout estimado total</p>
            <p className="text-profit font-mono font-bold text-base">
              {formatCurrency(totalCashout)}
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

        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} className="flex-1" disabled={slotsLeft <= 0}>
            Registrar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Sell Modal ───────────────────────────────────────────────────────────────

function SellModal({ drop, onSave, onClose }: { drop: Drop; onSave: (id: string, v: number) => void; onClose: () => void }) {
  const { settings } = useStore()
  const [value, setValue] = useState((drop.steamValue * settings.cashoutRate / 100).toFixed(2))
  return (
    <Modal open onClose={onClose} title="Registrar Venda">
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.08]">
          <p className="text-sm font-medium text-white">{drop.item.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">Steam: {formatCurrency(drop.steamValue)}</p>
        </div>
        <Input label="Valor recebido (R$)" type="number" min="0" step="0.01"
          value={value} onChange={e => setValue(e.target.value)} />
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button variant="success" onClick={() => onSave(drop.id, parseFloat(value))} className="flex-1">
            Confirmar Venda
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Drop Card ────────────────────────────────────────────────────────────────

function DropCard({ drop, accountName, accountColor, cashoutRate, onDelete, onSell }: {
  drop: Drop; accountName: string; accountColor: string
  cashoutRate: number
  onDelete: () => void; onSell: () => void
}) {
  const cashout = drop.cashoutValue ?? drop.steamValue * cashoutRate / 100
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accountColor }} />
          <span className="text-xs text-slate-400">{accountName}</span>
          <span className="text-[10px] bg-[#1a2235] text-slate-500 px-1.5 py-0.5 rounded-md">Drop {drop.dropNumber}</span>
          {drop.sold && <span className="text-[10px] bg-profit/20 text-profit px-1.5 py-0.5 rounded-full">Vendido</span>}
        </div>
        <div className="flex gap-1">
          {!drop.sold && (
            <button onClick={onSell}
              className="text-[11px] text-slate-500 hover:text-profit hover:bg-profit/10 px-2 py-1 rounded-lg transition-colors">
              Vender
            </button>
          )}
          <button onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-600 hover:text-loss hover:bg-loss/10 transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0d1117] border border-white/[0.06] mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#111827] flex items-center justify-center flex-shrink-0 overflow-hidden">
          <SteamItemImage imageUrl={drop.item.imageUrl} alt={drop.item.name} size={40} />
        </div>
        <p className="text-sm text-white font-medium leading-tight">{drop.item.name}</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Cashout</p>
          <p className="font-mono font-semibold text-profit">{formatCurrency(cashout)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 mb-0.5">Steam</p>
          <p className="font-mono text-sm text-slate-400">{formatCurrency(drop.steamValue)}</p>
        </div>
      </div>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Drops() {
  const { accounts, drops, settings, addDrop, deleteDrop, markDropSold } = useStore()
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekId())
  const [filterAccount, setFilterAccount] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [sellingDrop, setSellingDrop] = useState<Drop | null>(null)

  const weeks = getPreviousWeeks(8)
  const weekIdx = weeks.indexOf(selectedWeek)
  const currentWid = getCurrentWeekId()

  const filteredDrops = useMemo(() =>
    drops
      .filter(d => (d.weekId === selectedWeek || d.weekId === 'unknown') && (filterAccount === 'all' || d.accountId === filterAccount))
      .sort((a, b) => a.accountId.localeCompare(b.accountId) || a.dropNumber - b.dropNumber),
    [drops, selectedWeek, filterAccount]
  )

  const weekCashout = filteredDrops.reduce((s, d) => s + (d.cashoutValue ?? d.steamValue * settings.cashoutRate / 100), 0)

  function handleSaveDrops(newDrops: Array<Omit<Drop, 'id' | 'createdAt'>>) {
    newDrops.forEach(d => addDrop(d))
    setShowModal(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Drops</h1>
          <p className="text-slate-500 text-sm mt-0.5">{drops.length} drops no total</p>
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowModal(true)} className="shrink-0">
          <span className="hidden sm:inline">Registrar Drops</span>
          <span className="sm:hidden">Registrar</span>
        </Button>
      </div>

      {/* Week navigation */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1018] p-3">
        <div className="grid grid-cols-[36px_1fr_36px] items-center gap-2">
          <button
            onClick={() => weekIdx < weeks.length - 1 && setSelectedWeek(weeks[weekIdx + 1])}
            disabled={weekIdx >= weeks.length - 1}
            className="h-9 rounded-xl text-slate-500 hover:text-white hover:bg-[#1a2235] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} className="mx-auto" />
          </button>
          <span className="min-w-0 text-center text-sm font-medium text-white">
            {selectedWeek === currentWid ? `Esta semana · ${getWeekLabel(selectedWeek)}` : getWeekLabel(selectedWeek)}
          </span>
          <button
            onClick={() => weekIdx > 0 && setSelectedWeek(weeks[weekIdx - 1])}
            disabled={weekIdx <= 0}
            className="h-9 rounded-xl text-slate-500 hover:text-white hover:bg-[#1a2235] disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} className="mx-auto" />
          </button>
        </div>
        <select
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
          className="mt-3 h-10 w-full px-3 text-sm rounded-xl bg-[#111827] border border-white/[0.1] text-slate-300 focus:outline-none sm:mt-0 sm:ml-2 sm:h-8 sm:w-auto sm:text-xs"
        >
          <option value="all">Todas as contas</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {filteredDrops.length > 0 && (
          <span className="mt-3 block text-xs text-slate-500 sm:mt-0 sm:ml-auto sm:inline">
            Cashout: <span className="text-profit font-mono">{formatCurrency(weekCashout)}</span>
          </span>
        )}
      </div>

      {/* Drops */}
      {filteredDrops.length === 0 ? (
        <Empty
          icon={Package}
          title="Nenhum drop nessa semana"
          description="Registre os itens recebidos. Você pode registrar até 2 por conta por semana."
          action={{ label: 'Registrar Drops', onClick: () => setShowModal(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredDrops.map(drop => {
            const acct = accounts.find(a => a.id === drop.accountId)
            return (
              <DropCard
                key={drop.id}
                drop={drop}
                accountName={acct?.name ?? '?'}
                accountColor={acct?.color ?? '#64748b'}
                cashoutRate={settings.cashoutRate}
                
                onDelete={() => deleteDrop(drop.id)}
                onSell={() => setSellingDrop(drop)}
              />
            )
          })}
        </div>
      )}

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
