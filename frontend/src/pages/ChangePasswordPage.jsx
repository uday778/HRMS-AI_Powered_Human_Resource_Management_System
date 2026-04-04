import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

export default function ChangePasswordPage() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPass.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }
    if (newPass !== confirm) {
      setError('New passwords do not match')
      return
    }
    if (current === newPass) {
      setError('New password must be different from current password')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: current,
        new_password: newPass
      })
      setSuccess('Password changed successfully! Redirecting...')
      updateUser({ must_change_password: false })
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h1 className="font-display font-bold text-white text-2xl">Change Your Password</h1>
          <p className="text-white/50 text-sm mt-2">
            {user?.must_change_password
              ? 'Your admin has set a temporary password. Please set a new one to continue.'
              : 'Update your account password below.'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Force change notice */}
          {user?.must_change_password && (
            <div className="mb-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 flex gap-2">
              <span>⚠️</span>
              <span>You must change your temporary password before accessing the system.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength indicator */}
              {newPass && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                        newPass.length >= i * 2
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-blue-400' : 'bg-emerald-400'
                          : 'bg-muted'
                      }`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {newPass.length < 6 ? 'Too short' : newPass.length < 8 ? 'Fair' : newPass.length < 10 ? 'Good' : 'Strong'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className={`w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 transition-all ${
                    confirm && newPass !== confirm
                      ? 'border-destructive focus:ring-destructive/30'
                      : confirm && newPass === confirm
                      ? 'border-emerald-400 focus:ring-emerald-400/30'
                      : 'border-input focus:ring-primary/50'
                  }`}
                />
                {confirm && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                    {newPass === confirm ? '✅' : '❌'}
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || newPass !== confirm || newPass.length < 6}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <div className="spinner w-4 h-4 border-white/30 border-t-white" />}
              <ShieldCheck size={16} />
              Change Password
            </button>

            {/* Skip only if not forced */}
            {!user?.must_change_password && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel — go back
              </button>
            )}

            {user?.must_change_password && (
              <button
                type="button"
                onClick={() => { logout(); navigate('/login') }}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout instead
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}