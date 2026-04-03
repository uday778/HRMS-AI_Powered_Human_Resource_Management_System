import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Mail, Lock, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role) => {
    if (role === 'admin') { setEmail('admin@hrms.com'); setPassword('admin123') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px'}} />

      <div className="relative w-full max-w-md animate-fadeup">
        {/* Logo card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl ai-badge flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <div className="text-left">
              <div className="font-display font-bold text-white text-2xl leading-none">HRMS</div>
              <div className="text-xs text-white/50 mt-0.5">AI-Powered Platform</div>
            </div>
          </div>
          <p className="text-white/60 text-sm">Sign in to your workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com" required
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <div className="spinner w-4 h-4 border-white/30 border-t-white" />}
              Sign In
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">Quick demo access</p>
            <button
              onClick={() => fillDemo('admin')}
              className="w-full py-2 text-xs border border-border rounded-lg hover:bg-muted transition-all text-muted-foreground"
            >
              Fill Admin Credentials
            </button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Run <code className="bg-muted px-1 rounded font-mono">POST /api/auth/seed-admin</code> first to create admin
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
