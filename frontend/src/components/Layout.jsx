import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, Briefcase, Calendar, Star,
  BookOpen, BarChart3, GitBranch, LogOut, Sparkles,
  ChevronRight, Key, Menu, X, Mail, Bell
} from 'lucide-react'
import NotificationCenter from './NotificationCenter'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/employees', icon: Users, label: 'Employees', adminOnly: true },
  { to: '/org-chart', icon: GitBranch, label: 'Org Chart' },
  { to: '/recruitment', icon: Briefcase, label: 'Recruitment', adminOnly: true },
  { to: '/leaves', icon: Calendar, label: 'Leave & Attendance' },
  { to: '/performance', icon: Star, label: 'Performance' },
  { to: '/onboarding', icon: BookOpen, label: 'Onboarding' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', adminOnly: true },
  { to: '/offer-letters', icon: Mail, label: 'Offer Letters', adminOnly: true },
]

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const handleChangePassword = () => { navigate('/change-password'); setSidebarOpen(false) }

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg ai-badge flex items-center justify-center flex-shrink-0">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <div className="font-display font-bold text-white text-lg leading-none">HRMS</div>
          <div className="text-xs text-white/40 mt-0.5">AI-Powered</div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={() => setSidebarOpen(false)}
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

      {/* User — bottom of sidebar, NO notification bell here */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{user?.email}</div>
            <div className="text-xs text-white/40 capitalize">{user?.role}</div>
          </div>
          <button
            onClick={handleChangePassword}
            title="Change Password"
            className="text-white/30 hover:text-white/70 transition-colors p-1"
          >
            <Key size={14} />
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-white/30 hover:text-white/70 transition-colors p-1"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        sidebar flex-shrink-0 flex flex-col h-full
        fixed lg:relative z-40 lg:z-auto
        transition-transform duration-300 ease-in-out w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar — always visible, contains notification bell */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 bg-card border-b border-border flex-shrink-0 z-20">
          {/* Left — hamburger on mobile */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu size={20} />
            </button>
            {/* Mobile logo */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-6 h-6 rounded-lg ai-badge flex items-center justify-center">
                <Sparkles size={12} className="text-white" />
              </div>
              <span className="font-display font-bold text-sm">HRMS</span>
            </div>
          </div>

          {/* Right — notification bell + actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notification bell — prominent in top right */}
            <div className="relative">
              <NotificationCenter />
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

            {/* User avatar + actions */}
            <div className="flex items-center gap-1">
              <div className="hidden sm:flex items-center gap-2 mr-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-muted-foreground hidden md:block">{user?.email}</span>
              </div>
              <button
                onClick={handleChangePassword}
                title="Change Password"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Key size={16} />
              </button>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}