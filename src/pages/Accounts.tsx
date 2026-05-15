import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Pencil, Trash2, Users, TrendingUp, Package,
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  Image as ImageIcon,
} from 'lucide-react'
import { useStore } from '../store'
import { calcAccountStats } from '../lib/calculations'
import { formatCurrency, formatPercent, generateId, cn } from '../lib/utils'
import {
  Button, Card, Badge, Modal, Input, Textarea,
  Empty, Progress, Divider,
} from '../components/ui'
import { getPrimeCostBRL, getPrimeCostBRLSync } from '../lib/steam'
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
  const { addAccount, updateAccount } = useStore()
  const [form, setForm] = useState<AccountFormData>(initial ?? emptyForm)
  const [errors, setErrors] = useState<Partial<AccountFormData>>({})
  // Custo Prime fixo em BRL.
  const [primeCostBRL, setPrimeCostBRL] = useState<number>(getPrimeCostBRLSync())

  React.useEffect(() => {
    setForm(initial ?? emptyForm)
    setErrors({})
  }, [open, initial])

  // Mantém o mesmo fluxo caso o valor fixo mude no config.
  useEffect(() => {
    if (open) {
      getPrimeCostBRL().then(v => setPrimeCostBRL(v)).catch(() => {})
    }
  }, [open])

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
      toast.success('Conta atualizada!')
    } else {
      addAccount(data)
      toast.success('Conta adicionada!')
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
      title={editId ? 'Editar Conta' : 'Nova Conta CS2'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editId ? 'Salvar' : 'Adicionar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome da conta *"
          value={form.name}
          onChange={e => f('name', e.target.value)}
          placeholder="ex: Conta Prime 1"
          error={errors.name}
          maxLength={60}
        />
        <Input
          label="Steam ID / Username (opcional)"
          value={form.steamId}
          onChange={e => f('steamId', e.target.value)}
          placeholder="76561198..."
          maxLength={64}
        />
        <Input
          label="Foto da conta (URL opcional)"
          value={form.avatarUrl}
          onChange={e => f('avatarUrl', e.target.value)}
          placeholder="https://..."
          maxLength={500}
        />
        <Divider />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#111827] border border-white/[0.08]">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Custo Prime CS2</p>
            <div className="flex items-baseline gap-2">
              <p className="text-base font-mono font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(primeCostBRL)}
              </p>
              <p className="text-xs text-slate-600 font-mono">valor fixo</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full">Prime</span>
          </div>
        </div>
        <Textarea
          label="Nota (opcional)"
          value={form.note}
          onChange={e => f('note', e.target.value)}
          placeholder="Detalhes, observações..."
        />
        <div className="p-3 rounded-xl bg-primary/[0.05] border border-primary/10">
          <p className="text-xs text-slate-500 font-body">
            Todas as contas são consideradas <strong className="text-slate-300">Prime</strong>, com reset de drops toda <strong className="text-slate-300">terça-feira</strong>.
            Cada conta pode receber até <strong className="text-slate-300">2 drops por semana</strong>.
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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deletar Conta"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose() }}>Deletar</Button>
        </>
      }
    >
      <p className="text-sm text-slate-300 font-body">
        Tem certeza que quer deletar <strong className="text-slate-100">"{name}"</strong>?
        Todos os drops dessa conta também serão removidos. Essa ação não pode ser desfeita.
      </p>
    </Modal>
  )
}

// ─── Account Card ─────────────────────────────────────────────────────────────

interface AccountCardProps {
  stats: ReturnType<typeof calcAccountStats>
  currency: 'BRL'
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  index: number
}

function AccountCard({ stats: as, currency, onEdit, onDelete, onToggle, index }: AccountCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Card className={cn('p-5', !as.account.active && 'opacity-60')}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {as.account.avatarUrl ? (
              <img
                src={as.account.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-xl border border-white/[0.08] object-cover shrink-0"
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold text-[#07090f]"
                style={{ backgroundColor: as.account.color ?? '#38bdf8' }}
              >
                <ImageIcon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-bold text-slate-200 truncate">{as.account.name}</p>
              {as.account.steamId && (
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">{as.account.steamId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onToggle}
              className="text-slate-500 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-[#1a2235]"
              title={as.account.active ? 'Desativar' : 'Ativar'}
            >
              {as.account.active
                ? <ToggleRight className="w-4.5 h-4.5 text-profit" size={18} />
                : <ToggleLeft className="w-4.5 h-4.5" size={18} />
              }
            </button>
            <button
              onClick={onEdit}
              aria-label="Editar conta"
              title="Editar"
              className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#1a2235] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              aria-label="Deletar conta"
              title="Deletar"
              className="text-slate-500 hover:text-loss p-1.5 rounded-lg hover:bg-loss/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">Drops</p>
            <p className="font-mono text-base font-medium text-slate-200 mt-0.5">{as.totalDrops}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">Cashout</p>
            <p className="font-mono text-base font-medium text-profit mt-0.5">
              {formatCurrency(as.totalCashout, currency)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-600 font-body uppercase tracking-wider">ROI</p>
            <p className={cn('font-mono text-base font-medium mt-0.5', as.roiPercent > 0 ? 'text-profit' : as.roiPercent < 0 ? 'text-loss' : 'text-slate-400')}>
              {as.roiPercent === Infinity ? '∞' : formatPercent(as.roiPercent, 0)}
            </p>
          </div>
        </div>

        {/* Payback */}
        <div>
          <div className="flex justify-between text-[10px] font-body mb-1.5">
            <span className="text-slate-600">Payback</span>
            <span className={cn('font-medium', as.isPaidBack ? 'text-profit' : 'text-slate-400')}>
              {as.isPaidBack
                ? '✓ Pago'
                : `Faltam ${formatCurrency(as.remainingPayback, currency)}`
              }
            </span>
          </div>
          <Progress
            value={as.isPaidBack ? 100 : (as.totalCashout / as.investedCost) * 100}
            color={as.isPaidBack ? '#4ade80' : as.account.color ?? '#38bdf8'}
          />
        </div>

        {as.account.note && (
          <p className="text-xs text-slate-600 font-body mt-3 italic">"{as.account.note}"</p>
        )}
      </Card>
    </motion.div>
  )
}

// ─── Accounts Page ────────────────────────────────────────────────────────────

export function Accounts() {
  const { accounts, drops, settings, toggleAccountActive, deleteAccount, openModal } = useStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editData, setEditData] = useState<{ id: string; form: AccountFormData } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const accountStats = useMemo(
    () => accounts.map(a => calcAccountStats(a, drops, settings)),
    [accounts, drops, settings],
  )

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
          <h1 className="font-display text-2xl font-bold text-slate-100">Contas CS2</h1>
          <p className="text-sm text-slate-500 font-body mt-0.5">
            {accounts.length} total · {accounts.filter(a => a.active).length} ativas
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)} className="shrink-0">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Adicionar Conta</span>
        </Button>
      </div>

      {/* Summary bar */}
      {accountStats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[
            {
              label: 'Total drops',
              value: accountStats.reduce((s, a) => s + a.totalDrops, 0).toString(),
              icon: <Package className="w-4 h-4 text-gold" />,
            },
            {
              label: 'Cashout total',
              value: formatCurrency(accountStats.reduce((s, a) => s + a.totalCashout, 0)),
              icon: <TrendingUp className="w-4 h-4 text-profit" />,
            },
            {
              label: 'Contas pagas',
              value: `${accountStats.filter(a => a.isPaidBack).length}/${accounts.length}`,
              icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
            },
          ].map(item => (
            <Card key={item.label} className="p-4 flex items-center gap-3">
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
          title="Nenhuma conta ainda"
          description="Adicione suas contas CS2 Prime para começar a trackear seus drops"
          action={
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Adicionar Conta
            </Button>
          }
        />
      ) : (
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
            toast.success('Conta deletada')
          }
        }}
        name={deleteTarget?.name ?? ''}
      />
    </div>
  )
}

export default Accounts
