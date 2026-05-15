import React, { forwardRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

// ─── Button ───────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  icon?: React.ComponentType<{ size?: string | number; className?: string }>
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon: Icon, children, className, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 hover:border-primary/50 hover:shadow-glow',
      secondary: 'bg-[#1a2235] border border-white/10 text-slate-200 hover:bg-[#1e2d45] hover:border-white/20',
      ghost: 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2235]',
      danger: 'bg-loss/10 border border-loss/25 text-loss hover:bg-loss/20',
      success: 'bg-profit/10 border border-profit/25 text-profit hover:bg-profit/20',
    }
    const sizes = {
      sm: 'h-7 px-3 text-xs gap-1.5 rounded-lg',
      md: 'h-9 px-4 text-sm gap-2 rounded-xl',
      lg: 'h-11 px-6 text-base gap-2.5 rounded-xl',
      icon: 'h-9 w-9 rounded-xl',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-body font-medium',
          'transition-all duration-150 cursor-pointer select-none',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <>
            {Icon && <Icon size={size === 'sm' ? 13 : 15} />}
            {children}
          </>
        )}
      </button>
    )
  },
)
Button.displayName = 'Button'

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  glass?: boolean
  hover?: boolean
  glow?: string
  onClick?: () => void
}

export function Card({ children, className, glass = true, hover, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={glow ? { boxShadow: `0 0 24px ${glow}` } : undefined}
      className={cn(
        'rounded-2xl border border-white/[0.08]',
        glass ? 'lf-card' : 'bg-[#0c1018]',
        hover && 'cursor-pointer hover:bg-[#111827] hover:border-white/[0.15] transition-all duration-200',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ size?: string | number; className?: string }>

interface StatCardProps {
  label: string
  value: string
  sub?: string
  subColor?: string
  icon?: ReactNode | IconComponent
  iconBg?: string
  delay?: number
  color?: 'primary' | 'profit' | 'loss' | 'gold' | 'default'
}

const statColorMap: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  profit: 'bg-profit/10 text-profit',
  loss: 'bg-loss/10 text-loss',
  gold: 'bg-gold/10 text-gold',
  default: 'bg-white/5 text-slate-400',
}

export function StatCard({ label, value, sub, subColor, icon, iconBg, delay = 0, color = 'default' }: StatCardProps) {
  // lucide-react icons are forwardRef (typeof === 'object'), not plain functions
  // React.isValidElement catches already-rendered JSX; otherwise try createElement
  const IconEl = !icon ? null
    : React.isValidElement(icon) ? icon
    : React.createElement(icon as IconComponent, { size: 18 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-body uppercase tracking-wider mb-2">{label}</p>
            <p className="font-mono text-xl sm:text-2xl font-medium text-slate-100 leading-none">{value}</p>
            {sub && (
              <p className={cn('text-xs mt-1.5 font-body', subColor ?? 'text-slate-500')}>{sub}</p>
            )}
          </div>
          {IconEl && (
            <div className={cn('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', iconBg ?? statColorMap[color])}>
              {IconEl}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-slate-400 font-body font-medium">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none w-4 h-4">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-10 rounded-xl border bg-[#111827] text-slate-200 text-sm font-body',
            'border-white/[0.1] placeholder:text-slate-600',
            'focus:outline-none focus:border-primary/60 focus:bg-[#1a2235] focus:ring-1 focus:ring-primary/20',
            'transition-all duration-150',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            leftIcon ? 'pl-9' : 'px-3.5',
            rightIcon ? 'pr-9' : 'pr-3.5',
            error && 'border-loss/50 focus:border-loss/70',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-loss">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  ),
)
Input.displayName = 'Input'

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-slate-400 font-body font-medium">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-xl border bg-[#111827] text-slate-200 text-sm font-body px-3.5 py-2.5',
          'border-white/[0.08] placeholder:text-slate-600 resize-none',
          'focus:outline-none focus:border-primary/50 focus:bg-white/[0.06]',
          'transition-all duration-150 min-h-[80px]',
          className,
        )}
        {...props}
      />
    </div>
  ),
)
Textarea.displayName = 'Textarea'

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-slate-400 font-body font-medium">{label}</label>}
      <select
        ref={ref}
        className={cn(
          'w-full h-10 rounded-xl border bg-[#111827] text-slate-200 text-sm font-body px-3.5',
          'border-white/[0.1]',
          'focus:outline-none focus:border-primary/60',
          'transition-all duration-150 cursor-pointer',
          '[&>option]:bg-[#111827]',
          className,
        )}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  ),
)
Select.displayName = 'Select'

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode
  color?: 'default' | 'green' | 'red' | 'gold' | 'blue' | 'purple'
  size?: 'sm' | 'md'
}

export function Badge({ children, color = 'default', size = 'sm' }: BadgeProps) {
  const colors = {
    default: 'bg-[#1a2235] text-slate-300 border-white/10',
    green: 'bg-profit/10 text-profit border-profit/20',
    red: 'bg-loss/10 text-loss border-loss/20',
    gold: 'bg-gold/10 text-gold border-gold/20',
    blue: 'bg-primary/10 text-primary border-primary/20',
    purple: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  }
  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded-md',
    md: 'text-xs px-2 py-1 rounded-lg',
  }
  return (
    <span className={cn('inline-flex items-center border font-body font-medium', colors[color], sizes[size])}>
      {children}
    </span>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open?: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}

export function Modal({ open = true, onClose, title, children, width, size, footer }: ModalProps) {
  const widthClass = width ?? (size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg')
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 pointer-events-none sm:items-center sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 28 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 16 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className={cn(
                'w-full pointer-events-auto',
                'bg-[#0d1117] border border-white/[0.08] rounded-t-2xl shadow-modal sm:rounded-2xl',
                'max-h-[92vh] sm:max-h-none',
                widthClass,
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.09] sm:px-6">
                <h2 className="font-display text-base font-bold text-slate-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#1e2d45] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5 max-h-[70vh] overflow-y-auto sm:px-6">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="px-5 py-4 border-t border-white/[0.09] flex items-center justify-end gap-2 sm:px-6">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressProps {
  value: number // 0-100
  color?: string
  size?: 'sm' | 'md'
  animate?: boolean
}

export function Progress({ value, color = '#38bdf8', size = 'sm', animate = true }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('w-full rounded-full bg-white/[0.06] overflow-hidden', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={animate ? { width: 0 } : { width: `${pct}%` }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      />
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked?: boolean
  value?: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, value, onChange, label, disabled }: ToggleProps) {
  const isOn = checked ?? value ?? false
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-40 cursor-not-allowed')}>
      <button
        role="switch"
        aria-checked={isOn}
        disabled={disabled}
        onClick={() => onChange(!isOn)}
        className={cn(
          'relative w-10 h-5.5 rounded-full transition-colors duration-200 outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary/50',
          isOn ? 'bg-primary/80' : 'bg-white/10',
        )}
        style={{ height: '22px' }}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white',
            'shadow-sm transition-transform duration-200',
            isOn ? 'translate-x-[18px]' : 'translate-x-0',
          )}
        />
      </button>
      {label && <span className="text-sm text-slate-300 font-body">{label}</span>}
    </label>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

type IconComponent2 = React.ComponentType<{ size?: string | number; className?: string }>

interface EmptyProps {
  icon: ReactNode | IconComponent2
  title: string
  description?: string
  action?: ReactNode | { label: string; onClick: () => void }
}

export function Empty({ icon, title, description, action }: EmptyProps) {
  const IconEl = !icon ? null
    : React.isValidElement(icon) ? icon
    : React.createElement(icon as IconComponent2, { size: 28 })

  const ActionEl = action && typeof action === 'object' && !React.isValidElement(action) && 'label' in (action as object)
    ? <Button onClick={(action as { label: string; onClick: () => void }).onClick} variant="primary" size="sm">
        {(action as { label: string; onClick: () => void }).label}
      </Button>
    : action as ReactNode

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-white/[0.07] flex items-center justify-center mb-4 text-slate-500">
        {IconEl}
      </div>
      <p className="font-display font-bold text-slate-300 mb-1">{title}</p>
      {description && <p className="text-sm text-slate-500 font-body max-w-xs">{description}</p>}
      {ActionEl && <div className="mt-5">{ActionEl}</div>}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg bg-[#131c2e] animate-pulse', className)} />
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-white/[0.06]', className)} />
}

// ─── Tooltip wrapper (CSS only) ───────────────────────────────────────────────

interface TooltipProps {
  content: string
  children: ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-200 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 font-body">
        {content}
      </div>
    </div>
  )
}
