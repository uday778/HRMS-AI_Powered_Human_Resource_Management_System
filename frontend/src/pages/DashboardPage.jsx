import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { StatCard, Card, Spinner, AiBadge, Button } from '../components/ui'
import { Users, Briefcase, Calendar, Star, TrendingUp, Sparkles, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

export default function DashboardPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [funnel, setFunnel] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/recruitment-funnel')
      ]).then(([ov, fn]) => {
        setOverview(ov.data)
        setFunnel(fn.data)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isAdmin])

  if (loading) return <Spinner />

  return (
    <div className="animate-fadeup">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Good morning! 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, <strong>{user?.email}</strong> — <span className="capitalize">{user?.role}</span>
        </p>
      </div>

      {isAdmin && overview ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total Employees" value={overview.total_employees} icon={Users} color="primary" />
            <StatCard label="Active" value={overview.active_employees} icon={TrendingUp} color="success" />
            <StatCard label="Open Positions" value={overview.open_positions} icon={Briefcase} color="warning" />
            <StatCard label="Attrition Rate" value={`${overview.attrition_rate}%`} icon={Star} color="danger" trend="vs last quarter" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Dept headcount */}
            <Card className="p-6">
              <h3 className="font-display font-semibold mb-4">Headcount by Department</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overview.by_department} barSize={28}>
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(246 80% 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Recruitment funnel */}
            <Card className="p-6">
              <h3 className="font-display font-semibold mb-4">Recruitment Pipeline</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnel} layout="vertical" barSize={18}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="p-5 text-center">
              <div className="text-2xl font-display font-bold text-foreground">{overview.avg_tenure_years}y</div>
              <div className="text-sm text-muted-foreground mt-1">Avg Tenure</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-2xl font-display font-bold text-foreground">{overview.leave_utilization_rate}%</div>
              <div className="text-sm text-muted-foreground mt-1">Leave Utilization</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-2xl font-display font-bold text-foreground">{overview.total_hired}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Hired</div>
            </Card>
          </div>
        </>
      ) : (
        /* Non-admin dashboard */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="p-6 card-hover cursor-pointer" onClick={() => navigate('/leaves')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Calendar size={20} className="text-amber-600" />
              </div>
              <h3 className="font-semibold">Leave & Attendance</h3>
            </div>
            <p className="text-sm text-muted-foreground">Apply for leave, view your balance and attendance records.</p>
            <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">Go to Leave <ArrowRight size={14} /></div>
          </Card>
          <Card className="p-6 card-hover cursor-pointer" onClick={() => navigate('/performance')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Star size={20} className="text-primary" />
              </div>
              <h3 className="font-semibold">Performance Review</h3>
            </div>
            <p className="text-sm text-muted-foreground">Submit self-assessment and view AI-generated review summaries.</p>
            <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">Go to Performance <ArrowRight size={14} /></div>
          </Card>
          <Card className="p-6 card-hover cursor-pointer" onClick={() => navigate('/onboarding')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Sparkles size={20} className="text-emerald-600" />
              </div>
              <h3 className="font-semibold">Onboarding & AI Chat</h3>
            </div>
            <p className="text-sm text-muted-foreground">Your onboarding checklist and AI HR chatbot for policy questions.</p>
            <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">Go to Onboarding <ArrowRight size={14} /></div>
          </Card>
          <Card className="p-6 card-hover cursor-pointer" onClick={() => navigate('/org-chart')}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
              <h3 className="font-semibold">Org Chart</h3>
            </div>
            <p className="text-sm text-muted-foreground">View the company organisation chart and team structure.</p>
            <div className="flex items-center gap-1 text-primary text-sm font-medium mt-4">View Org Chart <ArrowRight size={14} /></div>
          </Card>
        </div>
      )}

      {/* AI Feature callout */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl ai-badge flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold">AI-Powered Features</h3>
              <AiBadge>Groq LLM</AiBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              This HRMS uses Groq's LLM to score resumes, generate interview questions, summarize performance reviews, answer HR policy questions, and generate insights — all in real-time.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
