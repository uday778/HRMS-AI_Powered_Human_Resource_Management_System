import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, Briefcase, Calendar, Star,
  BookOpen, BarChart3, GitBranch, LogOut, Sparkles, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/employees', icon: Users, label: 'Employees', adminOnly: true },
  { to: '/org-chart', icon: GitBranch, label: 'Org Chart' },
  { to: '/recruitment', icon: Briefcase, label: 'Recruitment', adminOnly: true },
  { to: '/leaves', icon: Calendar, label: 'Leave & Attendance' },
  { to: '/performance', icon: Star, label: 'Performance' },
  { to: '/onboarding', icon: BookOpen, label: 'Onboarding' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', adminOnly: true },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="sidebar w-64 flex-shrink-0 flex flex-col h-full overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <div className="w-8 h-8 rounded-lg ai-badge flex items-center justify-center flex-shrink-0">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-none">HRMS</div>
            <div className="text-xs text-white/40 mt-0.5">AI-Powered</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary/20 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={14} className="opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 pb-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{user?.email}</div>
              <div className="text-xs text-white/40 capitalize">{user?.role}</div>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white/70 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
