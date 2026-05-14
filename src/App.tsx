import React, { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CookieConsent } from './components/CookieConsent'
const AuthPage = lazy(() => import('./pages/AuthPage'))
const WelcomePage = lazy(() => import('./pages/WelcomePage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Accounts = lazy(() => import('./pages/Accounts'))
const Drops = lazy(() => import('./pages/Drops'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Goals = lazy(() => import('./pages/Goals'))
const Settings = lazy(() => import('./pages/Settings'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[#07090f] text-sm text-slate-500">
      Carregando LootFlow...
    </div>
  )
}

function PageContent() {
  const currentPage = useStore(s => s.currentPage)
  const pages: Record<string, React.ComponentType> = {
    dashboard: Dashboard, accounts: Accounts, drops: Drops,
    analytics: Analytics, goals: Goals, settings: Settings,
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
  const { isLoggedIn } = useAuth()
  const animations = useStore(s => s.settings.theme.animations)
  const [showLogin, setShowLogin] = useState(false)

  return (
    <MotionConfig reducedMotion={animations ? 'never' : 'always'}>
      <ThemeInjector />
      <Toaster position="top-right" gutter={8}
        toastOptions={{
          duration: 3000,
          style: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '13px' },
        }}
      />
      <CookieConsent />
      {!isLoggedIn ? (
        <ErrorBoundary page="auth">
          <Suspense fallback={<PageFallback />}>
            {showLogin ? (
              <AuthPage onBack={() => setShowLogin(false)} />
            ) : (
              <WelcomePage onContinue={() => setShowLogin(true)} />
            )}
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
