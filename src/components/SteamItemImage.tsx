import { useState, useEffect } from 'react'
import { Package } from 'lucide-react'

interface Props {
  imageUrl?: string
  alt?: string
  size?: number
  className?: string
}

/**
 * Renderiza imagem do item Steam com fallback automático entre CDNs.
 * Steam tem 3 CDNs principais que servem o mesmo asset:
 *   1. community.fastly.steamstatic.com (mais novo)
 *   2. community.akamaihd.net (legado)
 *   3. steamcommunity-a.akamaihd.net (alternativo)
 *
 * Se a primeira URL falhar (404 ou bloqueio), tenta as próximas automaticamente.
 */
export function SteamItemImage({ imageUrl, alt = '', size = 64, className = '' }: Props) {
  const [errorCount, setErrorCount] = useState(0)

  useEffect(() => { setErrorCount(0) }, [imageUrl])

  if (!imageUrl) {
    return <Package size={Math.min(size / 3, 20)} className="text-slate-600" />
  }

  // Extrai o hash da URL pra reconstruir com CDN diferente
  const hashMatch = imageUrl.match(/\/economy\/image\/([^/]+)/)
  const hash = hashMatch?.[1]

  // Constrói lista de URLs a tentar (sempre tem ao menos a original)
  const urls: string[] = [imageUrl]
  if (hash) {
    urls.push(`https://community.akamaihd.net/economy/image/${hash}/${size * 2}fx${size * 2}f`)
    urls.push(`https://steamcommunity-a.akamaihd.net/economy/image/${hash}/${size * 2}fx${size * 2}f`)
  }

  if (errorCount >= urls.length) {
    return <Package size={Math.min(size / 3, 20)} className="text-slate-600" />
  }

  return (
    <img
      src={urls[errorCount]}
      alt={alt}
      className={`w-full h-full object-contain ${className}`}
      loading="lazy"
      onError={() => setErrorCount(c => c + 1)}
    />
  )
}
