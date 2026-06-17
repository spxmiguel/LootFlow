/**
 * MarketplaceLinks — affiliate links para plataformas de venda de skins CS2.
 *
 * SUBSTITUA OS REF CODES antes de publicar:
 *   Skinport : https://skinport.com/partner  → troca "lootflow" pelo seu código
 *   CSFloat  : https://csfloat.com/affiliate  → troca "lootflow" pelo seu código
 *   DMarket  : programa de afiliados no painel  → troca "lootflow" pelo seu código
 *   Buff163  : sem programa de afiliados público — link direto
 */
import { ExternalLink } from 'lucide-react'

const MARKETS = [
  {
    name: 'Skinport',
    url: 'https://skinport.com/?r=lootflow',
    color: '#00b3a4',
    desc: 'Venda rápida',
  },
  {
    name: 'CSFloat',
    url: 'https://csfloat.com/?ref=lootflow',
    color: '#5b8af5',
    desc: 'P2P sem taxa',
  },
  {
    name: 'DMarket',
    url: 'https://dmarket.com/?ref=lootflow',
    color: '#ff6b35',
    desc: 'Maior liquidez',
  },
  {
    name: 'Buff163',
    url: 'https://buff.163.com/',
    color: '#e4b94a',
    desc: 'Melhor preço',
  },
]

export function MarketplaceLinks() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d1117]/60 p-3">
      <p className="text-[11px] text-slate-600 font-medium uppercase tracking-widest mb-2.5">
        Onde vender seus drops
      </p>
      <div className="flex flex-wrap gap-2">
        {MARKETS.map(m => (
          <a
            key={m.name}
            href={m.url}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all group"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: m.color }}
            />
            <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
              {m.name}
            </span>
            <span className="text-[10px] text-slate-600 hidden sm:inline">· {m.desc}</span>
            <ExternalLink size={9} className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}
