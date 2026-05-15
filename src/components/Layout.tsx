import React, { type ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Package, BarChart3, Target,
  Settings, X, LogOut, ChevronRight, Zap,
  TrendingUp,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { Avatar, ProfileModal, useProfileDisplay } from './ProfileModal'
import type { Page } from '../lib/types'

// ─── Nav Config ───────────────────────────────────────────────────────────────

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard; badge?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'accounts', label: 'Contas', icon: Users },
  { id: 'drops', label: 'Drops', icon: Package },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'settings', label: 'Configurações', icon: Settings },
]

// ─── Sidebar Item ─────────────────────────────────────────────────────────────

interface SidebarItemProps {
  item: typeof NAV_ITEMS[0]
  active: boolean
  compact: boolean
  onClick: () => void
}

function SidebarItem({ item, active, compact, onClick }: SidebarItemProps) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
        'font-body text-sm relative group',
        active
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-slate-500 hover:text-slate-200 hover:bg-[#131c2e] border border-transparent',
        compact && 'justify-center px-2',
      )}
    >
      <Icon className={cn('shrink-0', active ? 'w-4.5 h-4.5' : 'w-4.5 h-4.5')} size={18} />
      {!compact && (
        <span className="flex-1 text-left truncate">{item.label}</span>
      )}
      {active && !compact && (
        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
      )}
      {compact && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-200 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
          {item.label}
        </div>
      )}
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

function Sidebar({ mobile, onClose }: SidebarProps) {
  const currentPage = useStore(s => s.currentPage)
  const setCurrentPage = useStore(s => s.setCurrentPage)
  const settings = useStore(s => s.settings)
  const accounts = useStore(s => s.accounts)
  const drops = useStore(s => s.drops)
  const { user, logout } = useAuth()
  const compact = !mobile && settings.theme.sidebarCompact
  const { displayName, photoURL, email, showEmail } = useProfileDisplay()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleNav = (page: Page) => {
    setCurrentPage(page)
    onClose?.()
  }

  const activeAccounts = accounts.filter(a => a.active).length
  const currentWeekId = new Date().toISOString().slice(0, 10) // approximation

  return (
    <div className={cn(
      'flex flex-col h-full',
      mobile ? 'w-full' : compact ? 'w-16' : 'w-60',
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-white/[0.09]',
        compact && 'justify-center px-2',
      )}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center shrink-0 shadow-glow">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        {!compact && (
          <div>
            <p className="font-display font-bold text-slate-100 text-base leading-none">LootFlow</p>
            <p className="text-[10px] text-slate-600 font-body mt-0.5">CS2 Analytics</p>
          </div>
        )}
        {mobile && (
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Stats */}
      {!compact && (
        <div className="mx-3 mt-4 p-3 rounded-xl bg-[#111827] border border-white/[0.08]">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-body mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Esta semana</span>
          </div>
          <div className="flex gap-3">
            <div>
              <p className="font-mono text-sm font-medium text-slate-200">{activeAccounts}</p>
              <p className="text-[10px] text-slate-600">contas</p>
            </div>
            <div className="w-px bg-white/[0.06]" />
            <div>
              <p className="font-mono text-sm font-medium text-slate-200">
                {activeAccounts * 2}
              </p>
              <p className="text-[10px] text-slate-600">drops alvo</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <SidebarItem
            key={item.id}
            item={item}
            active={currentPage === item.id}
            compact={compact}
            onClick={() => handleNav(item.id)}
          />
        ))}
      </nav>

      {/* User */}
      <div className={cn('px-3 py-4 border-t border-white/[0.09]', compact && 'px-2')}>
        <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
        <div className={cn('flex items-center gap-3 p-2.5 rounded-xl', compact && 'justify-center')}>
          <button
            onClick={() => setProfileOpen(true)}
            title="Editar perfil"
            className="relative shrink-0 rounded-full ring-2 ring-transparent hover:ring-primary/50 transition-all"
          >
            <Avatar photoURL={photoURL} displayName={displayName} size={28} />
          </button>
          {!compact && (
            <>
              <button onClick={() => setProfileOpen(true)} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
                <p className="text-xs font-body font-medium text-slate-300 truncate">{displayName}</p>
                <p className="text-[10px] text-slate-600 truncate">
                  {user?.isAnonymous ? 'Modo offline' : showEmail ? email : '••••••••'}
                </p>
              </button>
              <button onClick={logout} className="text-slate-600 hover:text-loss transition-colors p-1" title="Sair">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Header ────────────────────────────────────────────────────────────

function MobileHeader() {
  const currentPage = useStore(s => s.currentPage)
  const currentItem = NAV_ITEMS.find(i => i.id === currentPage)
  const { logout } = useAuth()
  const { displayName, photoURL } = useProfileDisplay()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="lg:hidden flex items-center justify-between px-4 border-b border-white/[0.09] bg-[#07090f]/92 backdrop-blur-xl sticky top-0 z-30 h-16">
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-primary/30 flex items-center justify-center shadow-glow">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-600 font-body">LootFlow</p>
          <span className="font-display font-bold text-slate-100 text-base">
            {currentItem?.label ?? 'Dashboard'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setProfileOpen(true)}
          title="Editar perfil"
          className="rounded-full ring-2 ring-transparent hover:ring-primary/50 active:ring-primary/50 transition-all"
        >
          <Avatar photoURL={photoURL} displayName={displayName} size={32} />
        </button>
        <button
          onClick={logout}
          aria-label="Sair da conta"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0c1018] text-slate-500 transition-colors active:text-loss"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

function MobileBottomNav() {
  const currentPage = useStore(s => s.currentPage)
  const setCurrentPage = useStore(s => s.setCurrentPage)

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.09] bg-[#080b12]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-6 gap-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                'flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-500 active:bg-[#111827] active:text-slate-200',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate px-0.5 leading-none">
                {item.id === 'dashboard' ? 'Home' : item.id === 'analytics' ? 'Dados' : item.id === 'settings' ? 'Ajustes' : item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: ReactNode }) {
  const sidebarOpen = useStore(s => s.sidebarOpen)
  const setSidebarOpen = useStore(s => s.setSidebarOpen)
  const settings = useStore(s => s.settings)
  const currentPage = useStore(s => s.currentPage)
  const compact = settings.theme.sidebarCompact

  return (
    <div className="flex h-full bg-[#07090f]">
      {/* Desktop Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col shrink-0',
        'border-r border-white/[0.09]',
        'sticky top-0 h-screen overflow-hidden',
        'bg-[#07090f]',
        compact ? 'w-16' : 'w-60',
      )}>
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#0d1117] border-r border-white/[0.08] flex flex-col"
            >
              <Sidebar mobile onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <MobileHeader />
        <div className="flex-1 overflow-y-auto mobile-scroll">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={settings.theme.animations ? { opacity: 0, y: 8 } : {}}
              animate={{ opacity: 1, y: 0 }}
              exit={settings.theme.animations ? { opacity: 0, y: -8 } : {}}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="min-h-full pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <MobileBottomNav />
      </main>
    </div>
  )
}

export default Layout
