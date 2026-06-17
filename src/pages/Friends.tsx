import { useEffect, useMemo, useState } from 'react'
import { Crown, Lock, Plus, RefreshCw, Send, Trash2, UserCheck, Users } from 'lucide-react'
import { useStore } from '../store'
import { Button, Card, Empty, Input, Badge } from '../components/ui'
import { useT } from '../hooks/useT'
import { DEFAULT_SETTINGS } from '../lib/storage'
import toast from 'react-hot-toast'

function fallbackFriendCode(uid: string): string {
  let hash = 0
  for (const char of uid) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return `LF-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`
}

export default function Friends() {
  const t = useT()
  const {
    user,
    authMode,
    settings,
    friends,
    friendRequests,
    rankings,
    gamification,
    addFriend,
    removeFriend,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    fetchRankings,
    updateSettings,
  } = useStore()
  const [friendCode, setFriendCode] = useState('')
  const [requestCode, setRequestCode] = useState('')
  const [busy, setBusy] = useState(false)
  const onlineEnabled = authMode === 'firebase' && user?.provider === 'google'
  const rankingsEnabled = onlineEnabled && settings.gamification?.showRankings === true && !settings.liteMode

  const ownCode = useMemo(() => {
    if (settings.friendCode) return settings.friendCode
    const base = user?.uid ?? 'LOCAL'
    return fallbackFriendCode(base)
  }, [settings.friendCode, user?.uid])

  useEffect(() => {
    if (rankingsEnabled) void fetchRankings()
  }, [fetchRankings, rankingsEnabled])

  async function handleAddFriend() {
    if (!friendCode.trim()) return
    setBusy(true)
    try {
      await addFriend(friendCode.trim())
      setFriendCode('')
    } finally {
      setBusy(false)
    }
  }

  async function handleRequest() {
    if (!requestCode.trim()) return
    setBusy(true)
    try {
      await sendFriendRequest(requestCode.trim())
      setRequestCode('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 pb-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('friends.title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{t('friends.subtitle')}</p>
        </div>
        <Card className="p-4 min-w-[260px]">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('friends.friend_code')}</p>
          <p className="mt-1 font-mono text-lg font-bold text-primary">{ownCode}</p>
          <p className="mt-1 text-xs text-slate-600">{t('friends.friend_code_hint')}</p>
        </Card>
      </div>

      {!onlineEnabled && (
        <Card className="p-4 border-gold/20 bg-gold/5">
          <div className="flex items-start gap-3">
            <Lock size={16} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <p className="text-sm font-semibold text-slate-100">{t('friends.offline_title')}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('friends.offline_desc')}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">{t('friends.add_title')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('friends.add_desc')}</p>
            </div>
            <Users size={18} className="text-slate-500" />
          </div>
          <div className="flex gap-2">
            <Input
              value={friendCode}
              onChange={e => setFriendCode(e.target.value.toUpperCase())}
              placeholder="FALLEN123"
              disabled={!onlineEnabled}
            />
            <Button icon={Plus} onClick={handleAddFriend} disabled={!onlineEnabled || busy || !friendCode.trim()}>
              {t('friends.add_button')}
            </Button>
          </div>

          <div className="pt-3 border-t border-white/[0.025]">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">{t('friends.list_title')}</h3>
            {friends.length === 0 ? (
              <Empty icon={Users} title={t('friends.empty_title')} description={t('friends.empty_desc')} />
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.025] bg-[#111827]/50 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{friend.name}</p>
                      <p className="text-xs text-slate-500">Level {friend.level} · {friend.xp} XP</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFriend(friend.id)} aria-label={t('friends.remove')}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">{t('friends.requests_title')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t('friends.requests_desc')}</p>
            </div>
            <Send size={18} className="text-slate-500" />
          </div>
          <div className="flex gap-2">
            <Input
              value={requestCode}
              onChange={e => setRequestCode(e.target.value.toUpperCase())}
              placeholder="KNG999"
              disabled={!onlineEnabled}
            />
            <Button icon={Send} onClick={handleRequest} disabled={!onlineEnabled || busy || !requestCode.trim()}>
              {t('friends.request_button')}
            </Button>
          </div>
          <div className="space-y-2">
            {friendRequests.length === 0 ? (
              <p className="text-xs text-slate-600">{t('friends.no_requests')}</p>
            ) : friendRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.025] bg-[#111827]/50 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{request.senderName}</p>
                  <p className="text-xs text-slate-500">{request.type === 'incoming' ? t('friends.incoming') : t('friends.outgoing')}</p>
                </div>
                {request.type === 'incoming' ? (
                  <div className="flex gap-2">
                    <Button size="sm" icon={UserCheck} onClick={() => acceptFriendRequest(request.id)}>{t('friends.accept')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => declineFriendRequest(request.id)}>{t('friends.decline')}</Button>
                  </div>
                ) : (
                  <Badge>{t('friends.pending')}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{t('friends.rankings_title')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('friends.rankings_desc')}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            disabled={!rankingsEnabled}
            onClick={() => {
              void fetchRankings()
              toast.success(t('friends.rankings_refreshed'))
            }}
          >
            {t('friends.refresh')}
          </Button>
        </div>

        {!rankingsEnabled ? (
          <div className="rounded-xl border border-white/[0.025] bg-[#111827]/40 p-4 text-sm text-slate-500 space-y-3">
            <p>{!onlineEnabled ? t('friends.rankings_disabled_offline') : t('friends.rankings_disabled')}</p>
            {onlineEnabled && (
              <Button
                size="sm"
                icon={Crown}
                onClick={() => updateSettings({
                  liteMode: false,
                  gamification: {
                    ...DEFAULT_SETTINGS.gamification!,
                    ...(settings.gamification ?? {}),
                    showRankings: true,
                  },
                })}
              >
                {t('friends.rankings_enable')}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-600 border-b border-white/[0.025]">
                  <th className="py-2 pr-3">{t('friends.rank_col_player')}</th>
                  <th className="py-2 px-3 text-right">{t('friends.rank_col_xp')}</th>
                  <th className="py-2 px-3 text-right">{t('friends.rank_col_level')}</th>
                  <th className="py-2 px-3 text-right">{t('friends.rank_col_drops')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {rankings.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{entry.name}</p>
                          <p className="text-xs text-slate-600">{entry.activeTitle ?? gamification.activeTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{entry.xp}</td>
                    <td className="py-3 px-3 text-right font-mono text-primary">{entry.level}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-400">{entry.totalDrops}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankings.length === 0 && (
              <Empty icon={Crown} title={t('friends.rankings_empty_title')} description={t('friends.rankings_empty_desc')} />
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
