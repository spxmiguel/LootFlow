import { useEffect, useState } from 'react'
import { BarChart3, Boxes, Lock, Target, Trophy, UserCircle } from 'lucide-react'
import { useStore } from '../store'
import { Card, Empty, Badge } from '../components/ui'
import { Avatar } from '../components/ProfileModal'
import { firestoreLoadPublicProfile, firestoreLookupFriendCode } from '../lib/firebase'
import { formatCurrency } from '../lib/utils'
import type { PublicProfileSummary } from '../lib/types'
import { useT } from '../hooks/useT'

export default function PublicProfile() {
  const t = useT()
  const { settings, user, gamification, drops, cases, collection } = useStore()
  const slug = decodeURIComponent(window.location.pathname.split('/u/')[1] || '')
  const [profile, setProfile] = useState<PublicProfileSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const codeMatch = await firestoreLookupFriendCode(slug).catch(() => null)
        const remote = await firestoreLoadPublicProfile(codeMatch?.uid ?? slug).catch(() => null)
        if (!cancelled) setProfile(remote)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [slug])

  const ownCode = settings.friendCode?.toUpperCase()
  const isOwnProfile = !!user && (slug === user.uid || (!!ownCode && slug.toUpperCase() === ownCode))
  const ownTotalProfit = drops.reduce((sum, drop) => sum + (drop.cashoutValue ?? drop.steamValue * (settings.cashoutRate / 100)), 0)
  const ownFallback: PublicProfileSummary | null = isOwnProfile
    ? {
        uid: user.uid,
        friendCode: ownCode || user.uid,
        name: settings.profile?.displayName || user.displayName || 'LootFlow',
        avatarUrl: settings.profile?.customPhotoURL || user.photoURL || undefined,
        activeTitle: gamification.activeTitle,
        level: gamification.level,
        xp: gamification.totalXP,
        totalDrops: drops.length,
        totalCases: cases.length,
        collectionCount: collection.length,
        perfectWeeks: gamification.totalPerfectWeeks,
        showProfile: settings.profilePrivacy === 'public' && !(settings.privacy?.hideProfile ?? true),
        allowRankings: settings.gamification?.showRankings === true,
        showStatistics: !(settings.privacy?.hideStatistics ?? false),
        showCollection: !(settings.privacy?.hideCollection ?? true),
        showProfit: !(settings.privacy?.hideTotalProfit ?? true),
        totalProfit: ownTotalProfit,
        updatedAt: new Date().toISOString(),
      }
    : null

  const visibleProfile = profile ?? ownFallback

  if (loading && !visibleProfile) {
    return (
      <div className="min-h-screen bg-[#0d1117] p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Empty icon={UserCircle} title="LootFlow" description="Carregando perfil..." />
        </div>
      </div>
    )
  }

  if (!visibleProfile?.showProfile) {
    return (
      <div className="min-h-screen bg-[#0d1117] p-4 md:p-8">
        <div className="mx-auto max-w-3xl">
          <Empty icon={Lock} title={t('profile.private_title')} description={t('profile.private_desc')} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar photoURL={visibleProfile.avatarUrl ?? null} displayName={visibleProfile.name ?? visibleProfile.friendCode} size={64} />
              <div>
                <h1 className="text-xl font-bold text-white">{visibleProfile.name ?? visibleProfile.friendCode}</h1>
                <p className="text-sm text-slate-500">@{visibleProfile.friendCode}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {visibleProfile.activeTitle && <Badge color="purple">{visibleProfile.activeTitle}</Badge>}
                  {visibleProfile.level && <Badge color="blue">Level {visibleProfile.level}</Badge>}
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-500">
              {t('profile.joined')} LootFlow
            </div>
          </div>
        </Card>

        {visibleProfile.showStatistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">{t('profile.total_drops')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-100">{visibleProfile.totalDrops ?? 0}</p>
            </Card>
            {visibleProfile.showProfit && (
              <Card className="p-4">
                <Target className="h-4 w-4 text-profit" />
                <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">{t('profile.total_profit')}</p>
                <p className="mt-1 font-mono text-xl font-bold text-profit">{formatCurrency(visibleProfile.totalProfit ?? 0, settings.currency)}</p>
              </Card>
            )}
            <Card className="p-4">
              <Trophy className="h-4 w-4 text-gold" />
              <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">{t('profile.perfect_weeks')}</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-100">{visibleProfile.perfectWeeks ?? 0}</p>
            </Card>
            <Card className="p-4">
              <UserCircle className="h-4 w-4 text-purple-400" />
              <p className="mt-3 text-[10px] uppercase tracking-wider text-slate-500">XP</p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-100">{visibleProfile.xp ?? 0}</p>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {visibleProfile.showCollection && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">{t('profile.collection')}</h2>
                <Badge color="blue">{visibleProfile.collectionCount ?? 0}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">{t('profile.collection_desc')}</p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">{t('profile.case_openings')}</h2>
              <Badge color="default">{visibleProfile.totalCases ?? 0}</Badge>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Boxes className="h-5 w-5 text-slate-500" />
              <p className="text-sm text-slate-400">{t('profile.cases_opened', { count: visibleProfile.totalCases ?? 0 })}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
