import { useMemo, useState } from 'react'
import { Lock, PackageSearch, Search } from 'lucide-react'
import { useStore } from '../store'
import { Card, Empty, Badge } from '../components/ui'
import { SteamItemImage } from '../components/SteamItemImage'
import { formatCurrency, formatDate } from '../lib/utils'
import { useT } from '../hooks/useT'

export default function Collection() {
  const t = useT()
  const { collection, settings } = useStore()
  const [search, setSearch] = useState('')
  const currency = settings.currency
  const hidden = settings.liteMode || settings.gamification?.showCollection === false

  const discovered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return [...collection]
      .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen))
      .filter(item => !q || item.name.toLowerCase().includes(q))
  }, [collection, search])

  const lockedSlots = Math.max(8, Math.min(16, collection.length > 0 ? Math.ceil(collection.length * 0.4) : 8))
  const totalSeen = collection.reduce((sum, item) => sum + item.count, 0)

  if (hidden) {
    return (
      <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">
        <Empty
          icon={Lock}
          title={t('collection.hidden_title')}
          description={t('collection.hidden_desc')}
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('collection.title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('collection.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 min-w-[220px]">
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('collection.discovered')}</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-100">{collection.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('collection.total_seen')}</p>
            <p className="mt-1 font-mono text-lg font-bold text-primary">{totalSeen}</p>
          </Card>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('collection.search_placeholder')}
          className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#11161d] text-slate-200 text-sm pl-9 pr-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
        />
      </div>

      {collection.length === 0 ? (
        <Empty
          icon={PackageSearch}
          title={t('collection.empty_title')}
          description={t('collection.empty_desc')}
        />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">{t('collection.discovered')}</h2>
              <Badge color="blue">{discovered.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {discovered.map(item => (
                <Card key={item.marketHashName} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-[#111827] border border-white/[0.04] overflow-hidden flex items-center justify-center">
                      <SteamItemImage imageUrl={item.imageUrl} alt={item.name} size={56} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-100 truncate" title={item.name}>{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{t('collection.obtained_count', { count: item.count })}</p>
                      <p className="mt-2 font-mono text-sm text-profit">{formatCurrency(item.maxValueSeen, currency)}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                    <div>
                      <p>{t('collection.first_seen')}</p>
                      <p className="mt-0.5 text-slate-300">{formatDate(item.firstSeen)}</p>
                    </div>
                    <div>
                      <p>{t('collection.last_seen')}</p>
                      <p className="mt-0.5 text-slate-300">{formatDate(item.lastSeen)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">{t('collection.locked')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Array.from({ length: lockedSlots }).map((_, index) => (
                <Card key={index} className="p-4 border-dashed border-white/[0.04] bg-[#0d1117]/50">
                  <div className="aspect-square rounded-xl bg-[#111827]/70 border border-white/[0.03] flex flex-col items-center justify-center gap-2">
                    <Lock size={18} className="text-slate-600" />
                    <p className="font-mono text-sm text-slate-500">???</p>
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-600">{t('collection.not_discovered')}</p>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
