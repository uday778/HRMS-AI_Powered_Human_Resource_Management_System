import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useEffect, useRef } from 'react'

export function cn(...inputs) { return twMerge(clsx(inputs)) }

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-card rounded-xl border border-border shadow-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function Badge({ variant = 'default', children, className }) {
  const variants = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    muted: 'bg-muted text-muted-foreground',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full', variants[variant], className)}>
      {children}
    </span>
  )
}

export function Button({ variant = 'primary', size = 'md', className, children, loading, ...props }) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
    secondary: 'bg-secondary text-foreground hover:bg-secondary/80',
    outline: 'border border-border bg-transparent hover:bg-muted text-foreground',
    danger: 'bg-destructive text-white hover:bg-destructive/90',
    ghost: 'bg-transparent hover:bg-muted text-foreground',
    ai: 'ai-badge text-white hover:opacity-90 shadow-md',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <div className="spinner w-4 h-4" />}
      {children}
    </button>
  )
}

export function Input({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <input
        className={cn(
          'w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'placeholder:text-muted-foreground transition-all',
          error && 'border-destructive focus:ring-destructive/30',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'transition-all',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <textarea
        className={cn(
          'w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'placeholder:text-muted-foreground transition-all resize-none',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  const scrollRef = useRef(null)

  // Always scroll to top when modal opens
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [open])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal box */}
      <div className={cn(
        'relative bg-card w-full border border-border shadow-2xl rounded-2xl animate-fadeup',
        'flex flex-col',
        sizes[size],
        'max-h-[90vh]'
      )}>
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0 bg-card rounded-t-2xl">
          <h2 className="font-display font-semibold text-base sm:text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content — always starts from top */}
        <div
          ref={scrollRef}
          className="overflow-y-auto flex-1 px-5 py-5"
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, trend, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <Card className="p-4 sm:p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl sm:text-3xl font-display font-bold text-foreground">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="spinner" />
    </div>
  )
}

export function AiBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ai-badge text-white">
      <span>✦</span> {children}
    </span>
  )
}

export function ScoreBar({ value, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="score-bar flex-1">
        <div className="score-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-semibold w-10 text-right" style={{ color }}>{Math.round(value)}%</span>
    </div>
  )
}

export function StageChip({ stage }) {
  const map = {
    Applied: 'muted',
    Screening: 'blue',
    Interview: 'purple',
    Offer: 'warning',
    Hired: 'success',
    Rejected: 'danger',
  }
  return <Badge variant={map[stage] || 'muted'}>{stage}</Badge>
}

export function LeaveStatusChip({ status }) {
  const map = { Pending: 'warning', Approved: 'success', Rejected: 'danger' }
  return <Badge variant={map[status] || 'muted'}>{status}</Badge>
}

export function RatingStars({ value, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(max)].map((_, i) => (
        <span key={i} className={i < Math.round(value) ? 'rating-star' : 'text-muted'}>★</span>
      ))}
      <span className="ml-1 text-sm text-muted-foreground">{value?.toFixed(1)}</span>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon size={22} className="text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
    </div>
  )
}

export function ResponsiveTable({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full data-table min-w-[500px]">
        {children}
      </table>
    </div>
  )
}