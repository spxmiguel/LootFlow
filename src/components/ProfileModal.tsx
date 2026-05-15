import { useState } from 'react'
import { User, Camera, Trash2, Eye, EyeOff, Check, AlertTriangle, X, Info } from 'lucide-react'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { Modal, Button, Input, Toggle } from './ui'
import toast from 'react-hot-toast'

// ─── Avatar component (shared with Layout) ───────────────────────────────────

interface AvatarProps {
  photoURL?: string | null
  displayName?: string | null
  size?: number
  className?: string
}

export function Avatar({ photoURL, displayName, size = 32, className = '' }: AvatarProps) {
  const initial = (displayName ?? 'L')[0].toUpperCase()
  const style = { width: size, height: size }

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        className={`rounded-full object-cover bg-primary/20 ${className}`}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
      />
    )
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0 ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initial}</span>
    </div>
  )
}

// ─── Hook: resolved profile display values ────────────────────────────────────

export function useProfileDisplay() {
  const user = useStore(s => s.user)
  const profile = useStore(s => s.settings.profile)

  const displayName = profile?.displayName?.trim() || user?.displayName || 'Usuário'
  const photoURL = profile?.photoRemoved
    ? null
    : (profile?.customPhotoURL?.trim() || user?.photoURL || null)
  const email = user?.email ?? null
  const showEmail = !profile?.hideEmail && !!email

  return { displayName, photoURL, email, showEmail }
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user } = useAuth()
  const updateProfile = useStore(s => s.updateProfile)
  const profile = useStore(s => s.settings.profile)
  const { displayName, photoURL, email, showEmail } = useProfileDisplay()

  const [name, setName] = useState(profile?.displayName ?? user?.displayName ?? '')
  const [customPhotoURL, setCustomPhotoURL] = useState(profile?.customPhotoURL ?? '')
  const [hideEmail, setHideEmail] = useState(profile?.hideEmail ?? false)
  const [photoRemoved, setPhotoRemoved] = useState(profile?.photoRemoved ?? false)
  const [confirmRemovePhoto, setConfirmRemovePhoto] = useState(false)
  const [saving, setSaving] = useState(false)

  const effectivePhoto = photoRemoved
    ? null
    : (customPhotoURL.trim() || user?.photoURL || null)

  function handleRemovePhoto() {
    if (!confirmRemovePhoto) {
      setConfirmRemovePhoto(true)
      return
    }
    setPhotoRemoved(true)
    setCustomPhotoURL('')
    setConfirmRemovePhoto(false)
    toast('Foto removida — salve para confirmar.', { icon: '🗑️' })
  }

  function handleRestorePhoto() {
    setPhotoRemoved(false)
    setCustomPhotoURL('')
  }

  async function handleSave() {
    setSaving(true)
    try {
      updateProfile({
        displayName: name.trim() || undefined,
        hideEmail,
        photoRemoved,
        customPhotoURL: photoRemoved ? '' : (customPhotoURL.trim() || undefined),
      })
      toast.success('Perfil atualizado!')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    updateProfile({
      displayName: undefined,
      hideEmail: false,
      photoRemoved: false,
      customPhotoURL: undefined,
    })
    setName(user?.displayName ?? '')
    setCustomPhotoURL('')
    setHideEmail(false)
    setPhotoRemoved(false)
    toast.success('Perfil restaurado ao padrão.')
  }

  const hasGooglePhoto = !!(user?.photoURL)
  const isGoogleUser = user?.provider === 'google'

  const footer = (
    <div className="flex items-center gap-2 w-full">
      <button
        onClick={handleReset}
        className="text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
      >
        Restaurar padrão
      </button>
      <div className="flex-1" />
      <Button variant="ghost" onClick={onClose} size="sm">Cancelar</Button>
      <Button onClick={handleSave} size="sm" disabled={saving} icon={Check}>
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Editar Perfil" size="sm" footer={footer}>
      <div className="space-y-5">

        {/* ── Preview avatar ── */}
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="relative">
            <Avatar photoURL={effectivePhoto} displayName={name || displayName} size={80} />
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#0d1117] border border-white/[0.1]">
              <Camera size={12} className="text-slate-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">{name || displayName}</p>
            {showEmail && !hideEmail && (
              <p className="text-xs text-slate-500 mt-0.5">{email}</p>
            )}
            {hideEmail && email && (
              <p className="text-xs text-slate-600 mt-0.5 italic">email oculto</p>
            )}
          </div>
        </div>

        {/* ── Display name ── */}
        <div>
          <Input
            label="Nome de exibição"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={user?.displayName ?? 'Seu nome'}
            maxLength={60}
          />
          {isGoogleUser && (
            <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
              <Info size={10} />
              Altera apenas no LootFlow, não na sua conta Google.
            </p>
          )}
        </div>

        {/* ── Email visibility ── */}
        {isGoogleUser && email && (
          <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-[#111827] border border-white/[0.06]">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {hideEmail ? <EyeOff size={13} className="text-slate-400" /> : <Eye size={13} className="text-slate-400" />}
                <p className="text-sm text-white">Ocultar email</p>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{email}</p>
            </div>
            <Toggle value={hideEmail} onChange={setHideEmail} />
          </div>
        )}

        {/* ── Custom photo URL ── */}
        {!photoRemoved && (
          <div>
            <Input
              label="URL da foto personalizada (opcional)"
              value={customPhotoURL}
              onChange={e => { setCustomPhotoURL(e.target.value) }}
              placeholder="https://exemplo.com/foto.jpg"
              maxLength={500}
            />
            <p className="text-[10px] text-slate-600 mt-1">
              Deixe vazio para usar a foto do Google{hasGooglePhoto ? ' (padrão)' : ''}.
            </p>
          </div>
        )}

        {/* ── Remove / restore photo ── */}
        {hasGooglePhoto && (
          <div className="space-y-2">
            {!photoRemoved ? (
              <div className="p-3 rounded-xl bg-[#111827] border border-white/[0.06] space-y-2">
                <p className="text-xs text-slate-400 font-medium">Remover foto de perfil</p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Remove a exibição da foto do Google em todo o app e na nuvem. Conforme a LGPD,
                  você tem direito de minimizar os dados exibidos.
                  A foto original continua na sua conta Google — para removê-la por completo,
                  acesse <span className="text-slate-400">myaccount.google.com</span>.
                </p>
                <button
                  onClick={handleRemovePhoto}
                  className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    confirmRemovePhoto
                      ? 'bg-loss/20 border border-loss/40 text-loss'
                      : 'bg-[#1a2235] border border-white/[0.08] text-slate-400 hover:text-white'
                  }`}
                >
                  {confirmRemovePhoto ? <AlertTriangle size={12} /> : <Trash2 size={12} />}
                  {confirmRemovePhoto ? 'Confirmar remoção' : 'Remover foto'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#111827] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <X size={12} className="text-loss" />
                  Foto removida — aparecerão suas iniciais
                </div>
                <button onClick={handleRestorePhoto} className="text-xs text-primary hover:underline">
                  Restaurar
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </Modal>
  )
}
