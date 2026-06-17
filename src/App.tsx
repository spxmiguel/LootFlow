import React, { lazy, Suspense, useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LegalModal, type LegalType } from './components/LegalModal'

const STORAGE_CONSENT_KEY = 'lootflow_storage_consent'

function StorageBanner({ onDismiss }: { onDismiss: () => void }) {
  const [legalModal, setLegalModal] = useState<LegalType | null>(null)
  return (
    <>
      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-[#11161d]/95 border-t border-white/[0.08] backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <p className="flex-1 min-w-0">
          O LootFlow usa <strong className="text-slate-300">localStorage</strong> para salvar seus dados localmente.
          Limpar cache ou dados do navegador pode apagar tudo; exporte um backup JSON em Configurações. Nenhum dado é coletado sem sua ação.{' '}
          <button onClick={() => setLegalModal('privacy')} className="underline underline-offset-2 hover:text-slate-200 transition-colors">
            Saiba mais
          </button>
        </p>
        <button
          onClick={onDismiss}
          className="shrink-0 px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 font-medium transition-colors"
        >
          Entendi
        </button>
      </div>
    </>
  )
}
const AuthPage = lazy(() => import('./pages/AuthPage'))
// ?electron-auth=1 → always show the OAuth callback screen, even if logged in
const ELECTRON_AUTH_PARAM = new URLSearchParams(window.location.search).get('electron-auth') === '1'
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Drops = lazy(() => import('./pages/Drops'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Goals = lazy(() => import('./pages/Goals'))
const Settings = lazy(() => import('./pages/Settings'))
const Collection = lazy(() => import('./pages/Collection'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Friends = lazy(() => import('./pages/Friends'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[#0d1117] text-sm text-slate-500">
      Carregando LootFlow...
    </div>
  )
}

function PageContent() {
  const currentPage = useStore(s => s.currentPage)
  const pages: Record<string, React.ComponentType> = {
    dashboard: Dashboard, accounts: Accounts, drops: Drops,
    analytics: Analytics, goals: Goals, settings: Settings,
    collection: Collection, achievements: Achievements, friends: Friends, rankings: Friends,
  }
  const Component = pages[currentPage] ?? Dashboard
  return (
    <ErrorBoundary page={currentPage}>
      <Component />
    </ErrorBoundary>
  )
}

function ThemeInjector() {
  const theme = useStore(s => s.settings.theme)
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', theme.primaryColor)
    document.documentElement.style.setProperty('--color-accent', theme.accentColor)
    document.documentElement.dataset.glass = theme.glassmorphism ? 'on' : 'off'
    document.documentElement.dataset.animations = theme.animations ? 'on' : 'off'
  }, [theme.primaryColor, theme.accentColor, theme.glassmorphism, theme.animations])
  return null
}

export default function App() {
  const { isLoggedIn, authReady } = useAuth()
  const animations = useStore(s => s.settings.theme.animations)
  const [storageConsent, setStorageConsent] = useState(() =>
    localStorage.getItem(STORAGE_CONSENT_KEY) === 'true'
  )
  const isPublicProfile = window.location.pathname.startsWith('/u/')

  const dismissBanner = () => {
    localStorage.setItem(STORAGE_CONSENT_KEY, 'true')
    setStorageConsent(true)
  }

  return (
    <MotionConfig reducedMotion={animations ? 'never' : 'always'}>
      {!storageConsent && <StorageBanner onDismiss={dismissBanner} />}
      <ThemeInjector />
      <Toaster position="top-right" gutter={8}
        toastOptions={{
          duration: 3000,
          style: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '13px' },
        }}
      />
      {isPublicProfile ? (
        <ErrorBoundary page="profile">
          <Suspense fallback={<PageFallback />}>
            <PublicProfile />
          </Suspense>
        </ErrorBoundary>
      ) : ELECTRON_AUTH_PARAM ? (
        // ?electron-auth=1 → always render AuthPage (shows ElectronCallbackScreen)
        // regardless of login state — user may already be signed in on this browser
        <ErrorBoundary page="auth">
          <Suspense fallback={<PageFallback />}>
            <AuthPage />
          </Suspense>
        </ErrorBoundary>
      ) : !authReady ? (
        <PageFallback />
      ) : !isLoggedIn ? (
        <ErrorBoundary page="auth">
          <Suspense fallback={<PageFallback />}>
            <AuthPage />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <Layout>
          <Suspense fallback={<PageFallback />}>
            <PageContent />
          </Suspense>
        </Layout>
      )}
    </MotionConfig>
  )
}
