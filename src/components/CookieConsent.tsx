import { useState, useEffect } from 'react'
import { Shield } from 'lucide-react'

const CONSENT_KEY = 'lootflow_lgpd_consent'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) setShow(true)
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 max-w-lg mx-auto animate-in slide-in-from-bottom-4">
      <div className="bg-[#0d1117] border border-white/[0.12] rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <Shield size={18} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 font-medium mb-1">Privacidade & LGPD</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              O LootFlow salva seus dados de drops apenas no seu navegador (localStorage) ou na nuvem via Google Firebase quando você faz login.
              Não coletamos IP, cookies de rastreamento, nem compartilhamos dados com terceiros.
              Ao continuar, você concorda com o armazenamento local dos seus dados de uso.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={accept}
                className="px-4 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors"
              >
                Entendi e aceito
              </button>
              <a
                href="https://github.com/spxmiguel/LootFlow#-segurança"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-slate-500 text-xs hover:text-slate-300 transition-colors"
              >
                Saiba mais
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
