import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
          'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background',
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
          'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background',
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
          'w-full px-3 py-2 text-sm rounded-lg border border-input bg-background',
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
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-card rounded-2xl shadow-2xl w-full border border-border animate-fadeup', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
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
    <Card className="p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-display font-bold text-foreground">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon size={20} />
        </div>
      </div>
    </Card>
  )
}

export function Spinner() {
  return <div className="flex items-center justify-center p-8"><div className="spinner" /></div>
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
      <span className="text-sm font-semibold" style={{ color }}>{Math.round(value)}%</span>
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon size={24} className="text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
