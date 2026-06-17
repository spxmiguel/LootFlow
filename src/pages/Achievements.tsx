import { useMemo, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { Search, Trophy, Lock } from 'lucide-react'
import { useStore } from '../store'
import { Card, Badge, Empty } from '../components/ui'
import { ACHIEVEMENTS, computeUnlockedAchievements, TIER_COLORS, type AchievementTier } from '../lib/achievements'
import { cn } from '../lib/utils'
import { useT } from '../hooks/useT'

type IconComponent = React.ComponentType<{ className?: string; size?: number | string }>

function iconFor(name: string): IconComponent {
  return ((LucideIcons as unknown as Record<string, IconComponent>)[name] ?? Trophy) as IconComponent
}

const tierBadge: Record<AchievementTier, 'default' | 'green' | 'red' | 'gold' | 'blue' | 'purple'> = {
  bronze: 'default',
  silver: 'blue',
  gold: 'gold',
  diamond: 'purple',
}

export default function Achievements() {
  const t = useT()
  const { accounts, drops, goals, cases, collection, gamification, settings } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const hidden = settings.liteMode || settings.gamification?.showAchievements === false

  const computed = useMemo(
    () => computeUnlockedAchievements(accounts, drops, goals, settings, cases, collection, gamification),
    [accounts, drops, goals, settings, cases, collection, gamification],
  )
  const progressById = useMemo(() => new Map(computed.map(item => [item.achievement.id, item])), [computed])
  const categories = useMemo(() => ['all', ...Array.from(new Set(ACHIEVEMENTS.map(a => a.category))).sort()], [])

  const achievements = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ACHIEVEMENTS.map(achievement => {
      const progress = progressById.get(achievement.id)?.progress ?? 0
      return { achievement, progress }
    }).filter(({ achievement }) => {
      if (category !== 'all' && achievement.category !== category) return false
      if (!q) return true
      return [
        achievement.name_pt,
        achievement.name_en,
        achievement.desc_pt,
        achievement.desc_en,
        achievement.id,
      ].some(value => value.toLowerCase().includes(q))
    })
  }, [category, progressById, query])

  const completed = computed.filter(item => item.progress >= 100).length
  const percent = Math.round((completed / ACHIEVEMENTS.length) * 100)

  if (hidden) {
    return (
      <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">
        <Empty
          icon={Lock}
          title={t('achievements.hidden_title')}
          description={t('achievements.hidden_desc')}
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('achievements.title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('achievements.subtitle', { total: ACHIEVEMENTS.length })}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 min-w-[300px]">
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('achievements.completed')}</p>
            <p className="mt-1 font-mono text-lg font-bold text-primary">{completed}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('achievements.total')}</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-100">{ACHIEVEMENTS.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('achievements.progress')}</p>
            <p className="mt-1 font-mono text-lg font-bold text-profit">{percent}%</p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('achievements.search_placeholder')}
            className="w-full h-10 rounded-xl border border-white/[0.05] bg-[#11161d] text-slate-200 text-sm pl-9 pr-3 focus:outline-none focus:border-primary/60 placeholder:text-slate-600"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="h-10 min-w-[180px] rounded-xl border border-white/[0.05] bg-[#11161d] text-slate-300 text-sm px-3 focus:outline-none focus:border-primary/60"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? t('achievements.category_all') : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {achievements.map(({ achievement, progress }) => {
          const Icon = iconFor(achievement.icon)
          const done = progress >= 100
          return (
            <Card key={achievement.id} className={cn('p-4 transition-colors', done ? 'border-primary/25' : 'border-white/[0.025]')}>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center',
                    done ? 'bg-primary/10 border-primary/20' : 'bg-[#111827] border-white/[0.04]',
                  )}
                  style={{ color: done ? 'var(--color-primary)' : TIER_COLORS[achievement.tier] }}
                >
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {settings.language === 'en' ? achievement.name_en : achievement.name_pt}
                    </p>
                    <Badge color={tierBadge[achievement.tier]}>{achievement.tier}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {settings.language === 'en' ? achievement.desc_en : achievement.desc_pt}
                  </p>
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', done ? 'bg-primary' : 'bg-slate-600')}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
                    <span>{achievement.category}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
