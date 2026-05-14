import { useState, useCallback, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { searchSteamMarket, getSteamItemPrice } from '../lib/steam'
import type { SteamSearchResult } from '../lib/types'

interface UseSteamSearchReturn {
  query: string
  results: SteamSearchResult[]
  isSearching: boolean
  selectedItem: SteamSearchResult | null
  fetchingPrice: boolean
  setQuery: (q: string) => void
  selectItem: (item: SteamSearchResult) => Promise<void>
  clearSelection: () => void
  clearResults: () => void
}

export function useSteamSearch(): UseSteamSearchReturn {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<SteamSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<SteamSearchResult | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const doSearch = useDebouncedCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const res = await searchSteamMarket(q, 12)
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, 400)

  const setQuery = useCallback((q: string) => {
    setQueryState(q)
    if (!q.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    doSearch(q)
  }, [doSearch])

  const selectItem = useCallback(async (item: SteamSearchResult) => {
    setSelectedItem(item)
    setResults([])
    setQueryState(item.name)

    // If we already have a price, no need to fetch
    if (item.sellPrice != null) return

    setFetchingPrice(true)
    try {
      const priceData = await getSteamItemPrice(item.hashName)
      if (priceData) {
        setSelectedItem(prev => prev ? {
          ...prev,
          sellPrice: priceData.lowestPrice,
        } : prev)
      }
    } catch {}
    finally {
      setFetchingPrice(false)
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItem(null)
    setQueryState('')
    setResults([])
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  return {
    query,
    results,
    isSearching,
    selectedItem,
    fetchingPrice,
    setQuery,
    selectItem,
    clearSelection,
    clearResults,
  }
}
