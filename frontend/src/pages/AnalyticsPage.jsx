import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Card, Button, PageHeader, StatCard, AiBadge, Spinner } from '../components/ui'
import { Users, TrendingDown, Briefcase, Clock, Sparkles } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null)
  const [funnel, setFunnel] = useState([])
  const [insights, setInsights] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/recruitment-funnel')
    ]).then(([ov, fn]) => {
      setOverview(ov.data)
      setFunnel(fn.data)
    }).finally(() => setLoading(false))
  }, [])

  const generateInsights = async () => {
    setGenerating(true)
    const res = await api.post('/analytics/ai-insights')
    setInsights(res.data.insights)
    setGenerating(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="HR Analytics"
        subtitle="Workforce insights and data"
        action={
          <Button variant="ai" onClick={generateInsights} loading={generating}>
            <Sparkles size={15} /> Generate AI Insights
          </Button>
        }
      />

      {insights && (
        <Card className="mb-8 p-6 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AiBadge>AI Monthly Insights</AiBadge>
          </div>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{insights}</div>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Headcount" value={overview.total_employees} icon={Users} color="primary" />
        <StatCard label="Attrition Rate" value={`${overview.attrition_rate}%`} icon={TrendingDown} color="danger" />
        <StatCard label="Open Positions" value={overview.open_positions} icon={Briefcase} color="warning" />
        <StatCard label="Avg Tenure" value={`${overview.avg_tenure_years}y`} icon={Clock} color="success" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Headcount by dept - bar */}
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Headcount by Department</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={overview.by_department} barSize={28}>
              <XAxis dataKey="department" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(246 80% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Dept pie */}
        <Card className="p-6">
          <h3 className="font-display font-semibold mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={overview.by_department} dataKey="count" nameKey="department" cx="50%" cy="50%" outerRadius={80} label={({ department, percent }) => `${department} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {overview.by_department.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recruitment funnel */}
      <Card className="p-6 mb-8">
        <h3 className="font-display font-semibold mb-4">Recruitment Funnel</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnel} layout="vertical" barSize={20}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Summary table */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Active Employees</div>
          <div className="text-3xl font-display font-bold">{overview.active_employees}</div>
          <div className="text-xs text-muted-foreground mt-1">of {overview.total_employees} total</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Leave Utilization</div>
          <div className="text-3xl font-display font-bold">{overview.leave_utilization_rate}%</div>
          <div className="text-xs text-muted-foreground mt-1">approved / total requests</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Total Hired</div>
          <div className="text-3xl font-display font-bold">{overview.total_hired}</div>
          <div className="text-xs text-muted-foreground mt-1">from {overview.filled_positions} closed jobs</div>
        </Card>
      </div>
    </div>
  )
}
