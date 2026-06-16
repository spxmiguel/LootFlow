import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Users, TrendingUp, Package,
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Check,
} from 'lucide-react'
import { useStore } from '../store'
import { calcAccountStats } from '../lib/calculations'
import { formatCurrency, formatPercent, generateId, cn } from '../lib/utils'
import {
  Button, Card, Badge, Modal, Input, Textarea,
  Empty, Progress, Divider, ImageUploadButton,
} from '../components/ui'
import { getPrimeCostBRL, getPrimeCostBRLSync, fetchSteamProfileAvatar } from '../lib/steam'
import { useT } from '../hooks/useT'
import toast from 'react-hot-toast'

// ─── Account Form ─────────────────────────────────────────────────────────────

interface AccountFormData {
  name: string
  steamId: string
  avatarUrl: string
  note: string
}

const emptyForm: AccountFormData = {
  name: '',
  steamId: '',
  avatarUrl: '',
  note: '',
}

function AccountModal({
  open, onClose, initial, editId,
}: {
  open: boolean
  onClose: () => void
  initial?: AccountFormData
  editId?: string
}) {
  const { addAccount, updateAccount, settings } = useStore()
  const t = useT()
  const currency = settings.currency
  const [form, setForm] = useState<AccountFormData>(initial ?? emptyForm)
  const [errors, setErrors] = useState<Partial<AccountFormData>>({})
  const [primeCostBRL, setPrimeCostBRL] = useState<number>(getPrimeCostBRLSync())
  const [fetchingAvatar, setFetchingAvatar] = useState(false)

  React.useEffect(() => {
    setForm(initial ?? emptyForm)
    setErrors({})
  }, [open, initial])

  useEffect(() => {
    if (open) {
      getPrimeCostBRL().then(v => setPrimeCostBRL(v)).catch(() => {})
    }
  }, [open])

  // Auto-fetch Steam avatar when a valid Steam URL or Steam64 ID is entered
  useEffect(() => {
    const id = form.steamId.trim()
    const isSteamUrl = /steamcommunity\.com\/(profiles|id)\//.test(id)
    const isSteam64 = /^7656119\d{10}$/.test(id)
    if (!id || (!isSteamUrl && !isSteam64)) return
    if (form.avatarUrl.trim()) return  // don't overwrite manually set avatar

    let cancelled = false
    setFetchingAvatar(true)
    fetchSteamProfileAvatar(id)
      .then(url => {
        if (!cancelled && url) {
          setForm(p => ({ ...p, avatarUrl: url }))
          toast.success('Foto de perfil detectada!')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setFetchingAvatar(false) })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.steamId])

  const validate = () => {
    const e: Partial<AccountFormData> = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = {
      name: form.name.trim(),
      steamId: form.steamId.trim() || undefined,
      avatarUrl: form.avatarUrl.trim() || undefined,
      cost: primeCostBRL,
      note: form.note.trim() || undefined,
      prime: true,
      active: true,
    }
    if (editId) {
      updateAccount(editId, data)
      toast.success(t('accounts.toast_updated'))
    } else {
      addAccount(data)
      toast.success(t('accounts.toast_added'))
    }
    onClose()
  }

  const f = (field: keyof AccountFormData, value: string) => {
    setForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: undefined }))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editId ? t('accounts.title_edit') : t('accounts.title_add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('accounts.delete_modal_cancel')}</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editId ? t('goals.goal_form_btn_save_edit') : (settings.language === 'en' ? 'Add' : 'Adicionar')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={t('accounts.input_name')}
          value={form.name}
          onChange={e => f('name', e.target.value)}
          placeholder={t('accounts.placeholder_name')}
          error={errors.name ? t('accounts.validation_name') : undefined}
          maxLength={60}
        />
        <Input
          label={t('accounts.input_steam_id')}
          value={form.steamId}
          onChange={e => f('steamId', e.target.value)}
          placeholder={t('accounts.placeholder_steam_id')}
          maxLength={64}
        />
        <div>
          <Input
            label={fetchingAvatar ? t('accounts.input_avatar_fetching') : t('accounts.input_avatar_optional')}
            value={form.avatarUrl.startsWith('data:') ? '' : form.avatarUrl}
            onChange={e => f('avatarUrl', e.target.value)}
            placeholder={t('accounts.placeholder_avatar')}
            maxLength={500}
          />
          <div className="flex items-center gap-2 mt-2">
            <ImageUploadButton onSelect={dataUrl => f('avatarUrl', dataUrl)} />
            {form.avatarUrl.startsWith('data:') && (
              <span className="flex items-center gap-1 text-[11px] text-profit">
                <Check size={12} /> {t('accounts.avatar_attached')}
              </span>
            )}
          </div>
        </div>
        <Divider />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#111827] border border-white/[0.04]">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{t('accounts.prime_cost')}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-base font-mono font-bold text-primary">
                {formatCurrency(primeCostBRL, currency)}
              </p>
              <p className="text-xs text-slate-600 font-mono">{settings.language === 'en' ? 'fixed value' : 'valor fixo'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full">Prime</span>
          </div>
        </div>
        <Textarea
          label={t('accounts.input_note')}
          value={form.note}
          onChange={e => f('note', e.target.value)}
          placeholder={t('accounts.placeholder_note')}
          maxLength={200}
        />
        <div className="p-3 rounded-xl bg-primary/[0.05] border border-primary/10">
          <p className="text-xs text-slate-500 font-body">
            {t('accounts.prime_notice')}
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteModal({
  open, onClose, onConfirm, name,
}: { open: boolean; onClose: () => void; onConfirm: () => void; name: string }) {
  const t = useT()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('accounts.delete_modal_title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('accounts.delete_modal_cancel')}</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>{t('accounts.delete_modal_confirm')}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-300 font-body">
        {t('accounts.delete_modal_desc', { name })}
      </p>
    </Modal>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────

interface AccountCardProps {
  stats: ReturnType<typeof calcAccountStats>
  currency: 'BRL' | 'USD'
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  index: number
}

function AccountCard({ stats: as, currency, onEdit, onDelete, onToggle, index }: AccountCardProps) {
  const t = useT()
  const paybackProgress = as.isPaidBack ? 100 : (as.totalCashout / as.investedCost) * 100
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Card className={cn('p-5 bg-gradient-to-br from-[#11161d] to-[#141922] relative overflow-hidden transition-all duration-300 hover:border-white/[0.05] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] border-white/[0.025]', !as.account.active && 'opacity-50')}>
        {as.isPaidBack && (
          <div className="absolute -inset-px border border-primary/10 rounded-2xl pointer-events-none" />
        )}

        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            {as.account.avatarUrl ? (
              <img
                src={as.account.avatarUrl}
                alt={as.account.name}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full border border-white/[0.04] object-cover shrink-0 ring-2 ring-white/[0.02]"
              />
            ) : (
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 uppercase text-[10px] font-bold text-slate-200"
                style={{ backgroundColor: as.account.color ?? '#38bdf8', border: `1px solid ${as.account.color ?? '#38bdf8'}15` }}
              >
                {as.account.name.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-display font-bold text-slate-200 truncate text-sm sm:text-base leading-snug">{as.account.name}</p>
              </div>
              {as.account.steamId ? (
                <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate max-w-[120px] sm:max-w-[160px]">{as.account.steamId}</p>
              ) : (
                <p className="text-[9px] text-slate-600 font-body mt-0.5">{t('accounts.no_steam_id')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggle}
              className="text-slate-500 hover:text-primary transition-colors p-2.5 rounded-lg hover:bg-white/[0.02]"
              aria-label={as.account.active ? t('accounts.btn_deactivate') : t('accounts.btn_activate')}
              title={as.account.active ? t('accounts.btn_deactivate') : t('accounts.btn_activate')}
            >
              {as.account.active
                ? <ToggleRight className="w-5 h-5 text-primary" size={20} />
                : <ToggleLeft className="w-5 h-5" size={20} />
              }
            </button>
            <button
              onClick={onEdit}
              aria-label={t('accounts.btn_edit')}
              title={t('accounts.btn_edit')}
              className="text-slate-500 hover:text-slate-200 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              aria-label={t('accounts.btn_delete')}
              title={t('accounts.btn_delete')}
              className="text-slate-500 hover:text-loss p-2.5 rounded-lg hover:bg-loss/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 p-2.5 rounded-xl bg-[#0e121a]/80 border border-white/[0.02]">
          <div>
            <p className="text-[9px] text-slate-500 font-semibold font-body uppercase tracking-wider">{t('dash.rankings.col_drops')}</p>
            <p className="font-mono text-sm font-bold text-slate-200 mt-0.5">{as.totalDrops}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-semibold font-body uppercase tracking-wider">{t('dash.rankings.col_cashout')}</p>
            <p className="font-mono text-sm font-bold text-profit mt-0.5">
              {formatCurrency(as.totalCashout, currency)}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-semibold font-body uppercase tracking-wider">{t('dash.rankings.col_roi')}</p>
            <p className={cn('font-mono text-sm font-bold mt-0.5', as.roiPercent > 0 ? 'text-profit' : as.roiPercent < 0 ? 'text-loss' : 'text-slate-400')}>
              {as.roiPercent === Infinity ? '∞' : `${as.roiPercent >= 0 ? '+' : ''}${formatPercent(as.roiPercent, 0)}`}
            </p>
          </div>
        </div>

        {/* Payback */}
        <div>
          <div className="flex justify-between text-[10px] font-body mb-1.5">
            <span className="text-slate-500 font-medium">{t('accounts.payback')}</span>
            <span className={cn('font-semibold font-mono', as.isPaidBack ? 'text-profit' : 'text-slate-400')}>
              {as.isPaidBack
                ? t('accounts.payback_paid')
                : t('accounts.payback_remaining', { progress: paybackProgress.toFixed(0), remaining: formatCurrency(as.remainingPayback, currency) })
              }
            </span>
          </div>
          <Progress
            value={as.isPaidBack ? 100 : paybackProgress}
            color={as.isPaidBack ? '#4ade80' : as.account.color ?? '#3b82f6'}
          />
        </div>

        {as.account.note && (
          <p className="text-[11px] text-slate-500 font-body mt-3 italic bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">"{as.account.note}"</p>
        )}
      </Card>
    </motion.div>
  )
}

// ─── Accounts Page ────────────────────────────────────────────────────────────

export function Accounts() {
  const { accounts, drops, settings, toggleAccountActive, deleteAccount, openModal } = useStore()
  const t = useT()
  const currency = settings.currency
  const [showAdd, setShowAdd] = useState(false)
  const [editData, setEditData] = useState<{ id: string; form: AccountFormData } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const accountStats = useMemo(
    () => accounts.map(a => calcAccountStats(a, drops, settings)),
    [accounts, drops, settings],
  )

  const recentlyAdded = useMemo(() => {
    return [...accountStats]
      .sort((a, b) => (b.account.createdAt ?? '').localeCompare(a.account.createdAt ?? ''))
      .slice(0, 3)
  }, [accountStats])

  const handleEdit = (id: string) => {
    const acc = accounts.find(a => a.id === id)
    if (!acc) return
    setEditData({
      id,
      form: {
        name: acc.name,
        steamId: acc.steamId ?? '',
        avatarUrl: acc.avatarUrl ?? '',
        note: acc.note ?? '',
      },
    })
  }

  const handleDelete = (id: string) => {
    const acc = accounts.find(a => a.id === id)
    if (acc) setDeleteTarget({ id, name: acc.name })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">{t('accounts.title')}</h1>
          <p className="text-sm text-slate-500 font-body mt-0.5">
            {accounts.length} {t('accounts.total_badge')} · {accounts.filter(a => a.active).length} {t('accounts.active_badge')}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('dash.empty.action_add_account')}</span>
        </Button>
      </div>

      {/* Summary bar */}
      {accountStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            {
              label: t('accounts.col_total_drops'),
              value: accountStats.reduce((s, a) => s + a.totalDrops, 0).toString(),
              icon: <Package className="w-4 h-4 text-gold" />,
            },
            {
              label: t('accounts.col_total_cashout'),
              value: formatCurrency(accountStats.reduce((s, a) => s + a.totalCashout, 0), currency),
              icon: <TrendingUp className="w-4 h-4 text-profit" />,
            },
            {
              label: t('accounts.col_paid_accounts'),
              value: `${accountStats.filter(a => a.isPaidBack).length}/${accounts.length}`,
              icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
            },
          ].map(item => (
            <Card key={item.label} className="p-4 flex items-center gap-3 border-white/[0.025]">
              <div className="w-9 h-9 rounded-xl bg-[#131c2e] flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-body">{item.label}</p>
                <p className="font-mono text-sm font-medium text-slate-200">{item.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Account List */}
      {accounts.length === 0 ? (
        <Empty
          icon={<Users className="w-8 h-8" />}
          title={t('accounts.empty_title')}
          description={t('accounts.empty_desc')}
          action={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> {t('dash.empty.action_add_account')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {accountStats.map((as, i) => (
              <AccountCard
                key={as.account.id}
                stats={as}
                currency={settings.currency}
                index={i}
                onEdit={() => handleEdit(as.account.id)}
                onDelete={() => handleDelete(as.account.id)}
                onToggle={() => toggleAccountActive(as.account.id)}
              />
            ))}
          </div>

          {/* Recently Added Accounts Section */}
          {recentlyAdded.length > 0 && (
            <div className="mt-12 border-t border-white/[0.03] pt-8">
              <h2 className="font-display text-base font-bold text-slate-200 mb-4 tracking-wide">{t('accounts.recently_added')}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentlyAdded.map(as => (
                  <div key={`recent-${as.account.id}`} className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.025] hover:border-white/[0.04] hover:bg-white/[0.02] flex items-center justify-between gap-3 transition-all duration-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {as.account.avatarUrl ? (
                        <img
                          src={as.account.avatarUrl}
                          alt={as.account.name}
                          className="h-7 w-7 rounded-full object-cover shrink-0 border border-white/[0.04]"
                        />
                      ) : (
                        <div
                          className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 uppercase text-[8px] font-bold text-slate-200 font-body"
                          style={{ backgroundColor: as.account.color ?? '#3b82f6' }}
                        >
                          {as.account.name.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-body text-xs font-semibold text-slate-200 truncate">{as.account.name}</p>
                        <p className="text-[9px] text-slate-500 font-body mt-0.5">
                          {t('accounts.created_at')} {settings.language === 'en' ? new Date(as.account.createdAt).toLocaleDateString('en-US') : new Date(as.account.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge color={as.isPaidBack ? 'green' : 'default'}>
                        {as.isPaidBack ? t('accounts.paid') : `${(as.totalCashout / as.investedCost * 100).toFixed(0)}% ${t('accounts.payback_suffix')}`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AccountModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
      <AccountModal
        open={!!editData}
        onClose={() => setEditData(null)}
        initial={editData?.form}
        editId={editData?.id}
      />
      <DeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteAccount(deleteTarget.id)
            toast.success(t('accounts.toast_deleted'))
          }
        }}
        name={deleteTarget?.name ?? ''}
      />
    </div>
  )
}

export default Accounts
