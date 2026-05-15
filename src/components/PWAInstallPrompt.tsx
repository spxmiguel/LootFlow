import { useEffect, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

const DISMISSED_KEY = 'lootflow_pwa_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed or already installed
    if (localStorage.getItem(DISMISSED_KEY) || isInStandaloneMode()) return

    const isIosDevice = isIOS()
    setIos(isIosDevice)

    if (isIosDevice) {
      // iOS doesn't fire beforeinstallprompt — show guide after a short delay
      const t = setTimeout(() => setShow(true), 2_000)
      return () => clearTimeout(t)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setDeferredPrompt(null)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm lg:bottom-4">
      <div className="relative bg-[#0d1117] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/60 p-4">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="p-2 rounded-xl bg-primary/10 text-primary flex-shrink-0">
            <Smartphone size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Instalar LootFlow</p>
            {ios ? (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Toque em <strong className="text-slate-300">Compartilhar</strong> e depois{' '}
                <strong className="text-slate-300">Adicionar à Tela de Início</strong> para usar como app.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Instale como app para acesso rápido, sem precisar abrir o navegador.
              </p>
            )}
          </div>
        </div>

        {!ios && deferredPrompt && (
          <button
            onClick={install}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Instalar agora
          </button>
        )}
      </div>
    </div>
  )
}
