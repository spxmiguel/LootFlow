import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, X, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'
import { useSteamSearch } from '../hooks/useSteamSearch'
import type { SteamSearchResult } from '../lib/types'

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ResultRow({
  item,
  onSelect,
  focused,
}: {
  item: SteamSearchResult
  onSelect: (item: SteamSearchResult) => void
  focused: boolean
}) {
  return (
    <button
      onClick={() => onSelect(item)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
        focused ? 'bg-white/[0.08]' : 'hover:bg-[#131c2e]',
      )}
    >
      {/* Item Image */}
      <div className="w-10 h-10 rounded-lg bg-[#131c2e] border border-white/[0.07] shrink-0 overflow-hidden flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-6 h-6 rounded bg-white/10" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200 font-body truncate">{item.name}</p>
        {item.sellListings != null && (
          <p className="text-[10px] text-slate-600 font-body">{item.sellListings.toLocaleString()} listagens</p>
        )}
      </div>

      {/* Price */}
      {item.sellPrice != null && item.sellPrice > 0 && (
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm font-medium text-profit">
            {formatCurrency(item.sellPrice)}
          </p>
          <p className="text-[10px] text-slate-600">min</p>
        </div>
      )}
    </button>
  )
}

// ─── Selected Item Display ────────────────────────────────────────────────────

interface SelectedDisplayProps {
  item: SteamSearchResult
  fetchingPrice: boolean
  onClear: () => void
  currency: 'BRL'
}

export function SelectedItemDisplay({ item, fetchingPrice, onClear, currency }: SelectedDisplayProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-profit/[0.05] border border-profit/20">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          className="w-12 h-12 object-contain shrink-0 rounded-lg bg-[#131c2e]"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-body font-medium text-slate-200 truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {fetchingPrice ? (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Buscando preço...
            </span>
          ) : item.sellPrice != null && item.sellPrice > 0 ? (
            <span className="font-mono text-sm font-medium text-profit">
              {formatCurrency(item.sellPrice, currency)}
            </span>
          ) : (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-gold" />
              Preço indisponível
            </span>
          )}
          <a
            href={`https://steamcommunity.com/market/listings/730/${encodeURIComponent(item.hashName)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
        <button
          onClick={onClear}
          className="text-slate-600 hover:text-slate-200 p-1 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SteamSearchProps {
  onSelect: (item: SteamSearchResult, price: number) => void
  currency?: 'BRL'
  placeholder?: string
  className?: string
}

export function SteamSearch({
  onSelect,
  currency = 'BRL',
  placeholder = 'Buscar item no Steam Market...',
  className,
}: SteamSearchProps) {
  const {
    query, results, isSearching, selectedItem,
    fetchingPrice, setQuery, selectItem, clearSelection,
  } = useSteamSearch()

  const [showResults, setShowResults] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setShowResults(results.length > 0 && !selectedItem)
    setFocusedIndex(-1)
  }, [results, selectedItem])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = async (item: SteamSearchResult) => {
    setShowResults(false)
    await selectItem(item)

    // Wait a tick for price to update
    setTimeout(() => {
      const updated = useSteamSearch
      const price = item.sellPrice ?? 0
      onSelect(item, price)
    }, 100)
  }

  // Re-call onSelect when price becomes available
  useEffect(() => {
    if (selectedItem?.sellPrice != null && !fetchingPrice) {
      onSelect(selectedItem, selectedItem.sellPrice)
    }
  }, [selectedItem?.sellPrice, fetchingPrice])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      handleSelect(results[focusedIndex])
    } else if (e.key === 'Escape') {
      setShowResults(false)
    }
  }

  if (selectedItem) {
    return (
      <SelectedItemDisplay
        item={selectedItem}
        fetchingPrice={fetchingPrice}
        onClear={clearSelection}
        currency={currency}
      />
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-slate-500" />
          )}
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className={cn(
            'w-full h-10 pl-9 pr-9 rounded-xl border bg-[#111827] text-slate-200 text-sm font-body',
            'border-white/[0.08] placeholder:text-slate-600',
            'focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-primary/20',
            'transition-all duration-150',
          )}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Hint */}
      {!query && (
        <p className="text-[10px] text-slate-600 mt-1.5 font-body">
          Dados de preço: Steam Community Market (BRL)
        </p>
      )}

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
            className={cn(
              'absolute z-50 w-full mt-1.5 rounded-xl overflow-hidden',
              'bg-[#0d1117] border border-white/[0.1] shadow-modal',
              'max-h-72 overflow-y-auto',
            )}
          >
            {results.map((item, idx) => (
              <div key={item.hashName}>
                {idx > 0 && <div className="h-px bg-[#111827]" />}
                <ResultRow
                  item={item}
                  onSelect={handleSelect}
                  focused={focusedIndex === idx}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
