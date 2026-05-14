import { logger } from './logger'
import type { SteamSearchResult } from './types'
import { PRIME_COST_BRL } from './config'

// ─── Config ───────────────────────────────────────────────────────────────────

const STEAM_APP_ID = 730 // CS2
const CACHE_KEY = 'lootflow_steam_v2'  // v2 — invalida cache antigo com preços em USD errados
const CACHE_TTL = 30 * 60 * 1000 // 30 minutos
const FX_KEY = 'lootflow_fx_v2'
const FX_TTL = 6 * 60 * 60 * 1000 // 6 horas

// CORS proxies (vão tentar em ordem). Como proxy é hospedado nos EUA,
// a Steam ignora ?currency e responde em USD → precisamos detectar e converter.
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
]

// ─── Cache localStorage ──────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; timestamp: number }

function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}:${key}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_KEY}:${key}`)
      return null
    }
    return entry.data
  } catch { return null }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${CACHE_KEY}:${key}`, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {}
}

// ─── Câmbio: USD → BRL ───────────────────────────────────────────────────────
// Steam ignora currency=7 quando IP é dos EUA. Detectamos a moeda e convertemos.

interface FxRates {
  USD: number; EUR: number; GBP: number; RUB: number
  timestamp: number
}

async function fetchFxRates(): Promise<FxRates> {
  // tenta cache primeiro
  try {
    const cached = localStorage.getItem(FX_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as FxRates
      if (Date.now() - parsed.timestamp < FX_TTL) return parsed
    }
  } catch {}

  // AwesomeAPI (BCB) - grátis, sem auth, retorna BRL como destino
  // https://docs.awesomeapi.com.br/api-de-moedas
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,GBP-BRL,RUB-BRL')
    if (res.ok) {
      const data = await res.json()
      const rates: FxRates = {
        USD: parseFloat(data.USDBRL?.bid ?? '5.5'),
        EUR: parseFloat(data.EURBRL?.bid ?? '6.0'),
        GBP: parseFloat(data.GBPBRL?.bid ?? '7.0'),
        RUB: parseFloat(data.RUBBRL?.bid ?? '0.06'),
        timestamp: Date.now(),
      }
      try { localStorage.setItem(FX_KEY, JSON.stringify(rates)) } catch {}
      return rates
    }
  } catch (e) {
    logger.warn('[FX] Failed, using fallback rates:', e)
  }

  // Fallback hardcoded (cotações aproximadas)
  return { USD: 5.50, EUR: 6.00, GBP: 7.00, RUB: 0.06, timestamp: Date.now() }
}

// ─── Currency Detection ──────────────────────────────────────────────────────

interface ParsedPrice {
  amount: number
  currency: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'RUB' | 'UNKNOWN'
}

/**
 * Steam retorna `lowest_price` como string formatada — ex:
 *   "R$ 12,34"  (BRL)
 *   "$2.23"     (USD)
 *   "1,99€"     (EUR)
 *   "£1.50"     (GBP)
 *   "150,00 pуб." (RUB)
 *
 * Esta função detecta a moeda pelo símbolo E faz parse correto do número
 * considerando o formato (1.234,56 vs 1,234.56)
 */
export function parsePriceWithCurrency(priceStr: string | undefined): ParsedPrice {
  if (!priceStr) return { amount: 0, currency: 'UNKNOWN' }

  const s = priceStr.trim()
  let currency: ParsedPrice['currency'] = 'UNKNOWN'

  if (/R\$/i.test(s)) currency = 'BRL'
  else if (/[€]|EUR/i.test(s)) currency = 'EUR'
  else if (/£|GBP/i.test(s)) currency = 'GBP'
  else if (/pуб|руб|RUB/i.test(s)) currency = 'RUB'
  else if (/\$|USD/.test(s)) currency = 'USD'

  // Remove tudo que não é dígito, vírgula ou ponto
  const numStr = s.replace(/[^\d.,]/g, '')
  if (!numStr) return { amount: 0, currency }

  // Decide formato decimal:
  // - BRL/EUR/RUB usam vírgula como decimal: "1.234,56"
  // - USD/GBP usam ponto como decimal: "1,234.56"
  let normalized: string
  if (currency === 'BRL' || currency === 'EUR' || currency === 'RUB') {
    normalized = numStr.replace(/\./g, '').replace(',', '.')
  } else {
    // USD, GBP ou UNKNOWN: assume ponto como decimal
    // remove vírgulas de milhar apenas se houver ponto depois
    if (numStr.includes('.')) {
      normalized = numStr.replace(/,/g, '')
    } else {
      // sem ponto, talvez vírgula seja decimal mesmo
      normalized = numStr.replace(',', '.')
    }
  }

  const amount = parseFloat(normalized)
  return { amount: isNaN(amount) ? 0 : amount, currency }
}

/**
 * Converte qualquer preço para BRL usando câmbio em tempo real.
 * Se já vier em BRL, retorna direto.
 */
export async function convertToBRL(parsed: ParsedPrice): Promise<number> {
  if (parsed.amount <= 0) return 0
  if (parsed.currency === 'BRL') return parsed.amount

  const rates = await fetchFxRates()

  // Steam BR tem preços diferentes da conversão direta de câmbio
  // mas como fallback usamos a taxa atual
  switch (parsed.currency) {
    case 'USD': return parsed.amount * rates.USD
    case 'EUR': return parsed.amount * rates.EUR
    case 'GBP': return parsed.amount * rates.GBP
    case 'RUB': return parsed.amount * rates.RUB
    default:    return parsed.amount * rates.USD // assume USD
  }
}

// ─── Fetch com Proxy Fallback ────────────────────────────────────────────────

async function fetchWithProxy(url: string): Promise<Response> {
  let lastError: Error = new Error('All proxies failed')
  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(url)
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/json' },
      })
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastError = e as Error
    }
  }
  throw lastError
}

// ─── Steam Search ─────────────────────────────────────────────────────────────

interface RawSteamSearchItem {
  name: string
  hash_name: string
  asset_description?: {
    icon_url?: string
    icon_url_large?: string
  }
  sell_price?: number      // integer em centavos da moeda retornada (não confiável p/ BRL via proxy US)
  sell_price_text?: string // string formatada "R$ X" ou "$X" — usar essa pra detectar moeda
  sell_listings?: number
}

export async function searchSteamMarket(
  query: string,
  count = 10,
): Promise<SteamSearchResult[]> {
  if (!query.trim()) return []

  const cacheKey = `search:${query.toLowerCase()}:${count}`
  const cached = getCache<SteamSearchResult[]>(cacheKey)
  if (cached) return cached

  // Mesmo que proxy ignore, mandamos os parâmetros corretos
  const url =
    `https://steamcommunity.com/market/search/render/` +
    `?search_descriptions=0&query=${encodeURIComponent(query)}` +
    `&start=0&count=${count}&country=BR&language=portuguese` +
    `&currency=7&appid=${STEAM_APP_ID}&norender=1`

  try {
    const res = await fetchWithProxy(url)
    const data = await res.json()

    if (!data?.results?.length) return []

    // Processa todos em paralelo (cada um pode precisar conversão de câmbio)
    const results: SteamSearchResult[] = await Promise.all(
      (data.results as RawSteamSearchItem[]).map(async (item) => {
        // Constrói image URL com fallbacks defensivos
        const iconHash =
          item.asset_description?.icon_url ??
          item.asset_description?.icon_url_large ??
          ''
        const imageUrl = buildSteamImageUrl(iconHash, 256)

        // Parse preço com detecção de moeda
        let sellPrice: number | undefined
        if (item.sell_price_text) {
          const parsed = parsePriceWithCurrency(item.sell_price_text)
          if (parsed.amount > 0) {
            sellPrice = await convertToBRL(parsed)
          }
        }

        return {
          name: item.name,
          hashName: item.hash_name,
          imageUrl,
          sellPrice,
          sellListings: item.sell_listings,
        }
      })
    )

    setCache(cacheKey, results)
    return results
  } catch (e) {
    logger.error('[Steam Search] Error:', e)
    return []
  }
}

// ─── Price Lookup ─────────────────────────────────────────────────────────────

export interface SteamPriceData {
  success: boolean
  lowestPrice: number    // já em BRL
  medianPrice: number    // já em BRL
  volume: number
  detectedCurrency: ParsedPrice['currency']
}

export async function getSteamItemPrice(
  marketHashName: string,
): Promise<SteamPriceData | null> {
  const cacheKey = `price:${marketHashName}`
  const cached = getCache<SteamPriceData>(cacheKey)
  if (cached) return cached

  const url =
    `https://steamcommunity.com/market/priceoverview/` +
    `?appid=${STEAM_APP_ID}&currency=7&country=BR` +
    `&market_hash_name=${encodeURIComponent(marketHashName)}`

  try {
    const res = await fetchWithProxy(url)
    const data = await res.json()
    if (!data?.success) return null

    const parsedLowest = parsePriceWithCurrency(data.lowest_price)
    const parsedMedian = parsePriceWithCurrency(data.median_price)

    const lowestPrice = await convertToBRL(parsedLowest)
    const medianPrice = await convertToBRL(parsedMedian)

    const result: SteamPriceData = {
      success: true,
      lowestPrice,
      medianPrice,
      volume: parseInt((data.volume ?? '0').toString().replace(/[,.]/g, '')) || 0,
      detectedCurrency: parsedLowest.currency !== 'UNKNOWN' ? parsedLowest.currency : parsedMedian.currency,
    }

    setCache(cacheKey, result)
    return result
  } catch (e) {
    logger.error('[Steam Price] Error:', e)
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Constrói a URL completa da imagem de um item.
 * Aceita tanto um hash de ícone (que vem da API) quanto uma URL completa.
 * Usa o CDN mais moderno (Fastly) que é mais rápido e estável.
 */
export function buildSteamImageUrl(iconUrlOrHash: string, size = 128): string {
  if (!iconUrlOrHash) return ''
  if (iconUrlOrHash.startsWith('http')) return iconUrlOrHash
  // CDN moderno (Fastly) — mais rápido e confiável que akamaihd legado
  return `https://community.fastly.steamstatic.com/economy/image/${iconUrlOrHash}/${size}fx${size}f`
}

// alias retrocompatível
export const getSteamImageUrl = buildSteamImageUrl

export function clearSteamCache(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_KEY)) keys.push(k)
  }
  keys.forEach(k => localStorage.removeItem(k))
  try { localStorage.removeItem(FX_KEY) } catch {}
}

export function getSteamCacheStats(): { entries: number; sizeKB: number } {
  let entries = 0, size = 0
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(CACHE_KEY)) {
      entries++
      size += (localStorage.getItem(k) ?? '').length
    }
  }
  return { entries, sizeKB: Math.round(size / 1024) }
}

// ─── Prime Cost Utility ───────────────────────────────────────────────────────

/**
 * Retorna o custo fixo do Prime em BRL.
 */
export function getPrimeCostBRLSync(): number {
  return PRIME_COST_BRL
}

/** Mantém a mesma API usada pela tela de contas, mas sem câmbio dinâmico. */
export async function getPrimeCostBRL(): Promise<number> {
  return PRIME_COST_BRL
}
// Faz uma chamada pra esquentar o cache + limpa cache antigo (v1)
if (typeof window !== 'undefined') {
  // limpa cache antigo bugado
  try {
    const oldKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('lootflow_steam_cache') || k === 'lootflow_fx_rates') {
        oldKeys.push(k)
      }
    }
    oldKeys.forEach(k => localStorage.removeItem(k))
  } catch {}

  fetchFxRates().catch(() => {})
}
