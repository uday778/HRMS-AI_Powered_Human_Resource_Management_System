import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X, Check, CheckCheck, Trash2, AlertTriangle, Info, Zap } from 'lucide-react'
import api from '../lib/api'

const TYPE_CONFIG = {
  critical: {
    icon: Zap,
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-100',
    badge: 'bg-red-500',
    dot: 'bg-red-500',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-50 border-amber-100',
    badge: 'bg-amber-500',
    dot: 'bg-amber-400',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-50 border-blue-100',
    badge: 'bg-blue-500',
    dot: 'bg-blue-400',
    label: 'Info',
  },
}

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const panelRef = useRef(null)
  const navigate = useNavigate()

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch {}
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications')
      // Sort: critical first, then by date
      const sorted = res.data.sort((a, b) => {
        const priority = { critical: 0, warning: 1, info: 2 }
        if (priority[a.type] !== priority[b.type]) return priority[a.type] - priority[b.type]
        return new Date(b.created_at) - new Date(a.created_at)
      })
      setNotifications(sorted)
      setUnreadCount(sorted.filter(n => !n.is_read).length)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  // Poll every 30 seconds
  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Fetch full list when panel opens
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRead = async (notif) => {
    if (!notif.is_read) {
      await api.put(`/notifications/${notif.id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      )
      setUnreadCount(c => Math.max(0, c - 1))
    }
    if (notif.action_url) {
      setOpen(false)
      navigate(notif.action_url)
    }
  }

  const handleMarkAllRead = async () => {
    await api.put('/notifications/mark-all-read')
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    await api.delete(`/notifications/${id}`)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => {
      const notif = notifications.find(n => n.id === id)
      return notif && !notif.is_read ? Math.max(0, prev - 1) : prev
    })
  }

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications.filter(n => n.type === filter)

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors group"
        title="Notifications"
      >
        <Bell
          size={18}
          className={`transition-all ${open ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-11 w-[360px] max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-fadeup">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-purple-500/5">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-primary" />
              <span className="font-display font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all read"
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-border bg-muted/30 overflow-x-auto">
            {['all', 'unread', 'critical', 'warning', 'info'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'all' && ` (${notifications.length})`}
                {f === 'unread' && ` (${notifications.filter(n => !n.is_read).length})`}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto max-h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Bell size={20} className="text-muted-foreground" />
                </div>
                <p className="font-medium text-sm text-foreground mb-1">No notifications</p>
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              filtered.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info
                const Icon = cfg.icon
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleRead(notif)}
                    className={`relative flex gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-all hover:bg-muted/40 group ${
                      !notif.is_read ? 'bg-accent/20' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    )}

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border ${cfg.bg}`}>
                      <Icon size={14} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-tight ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {notif.action_url && (
                          <span className="text-[10px] text-primary font-medium">
                            Click to view →
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(e, notif.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 self-start mt-1"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-center">
              <p className="text-xs text-muted-foreground">
                {notifications.length} total · {unreadCount} unread
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}