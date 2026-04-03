import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Card, Button, Input, Select, Textarea, Modal, PageHeader,
  LeaveStatusChip, Badge, AiBadge, Spinner, EmptyState
} from '../components/ui'
import { Plus, Calendar, CheckCircle, XCircle, Sparkles, AlertTriangle } from 'lucide-react'

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'WFH']
const ATT_STATUSES = ['Present', 'WFH', 'Half Day', 'Absent']

export default function LeavesPage() {
  const { user, isAdmin, isManager } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [employees, setEmployees] = useState([])
  const [balance, setBalance] = useState(null)
  const [calendar, setCalendar] = useState([])
  const [tab, setTab] = useState('leaves')
  const [showApply, setShowApply] = useState(false)
  const [loading, setLoading] = useState(true)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiRisk, setAiRisk] = useState('')
  const [analyzingId, setAnalyzingId] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lr, cr] = await Promise.all([api.get('/leaves'), api.get('/leaves/calendar')])
      setLeaves(lr.data)
      setCalendar(cr.data)
      if (isAdmin) {
        const er = await api.get('/employees')
        setEmployees(er.data)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleDecide = async (id, status, comment = '') => {
    await api.put(`/leaves/${id}/decide`, { status, comment })
    fetchData()
  }

  const handleAnalyzePatterns = async (empId) => {
    setAnalyzingId(empId)
    const res = await api.post(`/leaves/ai/analyze-patterns/${empId}`)
    setAiAnalysis(res.data.analysis)
    setAnalyzingId(null)
  }

  const handleCapacityRisk = async () => {
    const res = await api.post('/leaves/ai/capacity-risk')
    setAiRisk(res.data.risk_assessment)
  }

  if (loading) return <Spinner />

  const pending = leaves.filter(l => l.status === 'Pending')
  const approved = leaves.filter(l => l.status === 'Approved')

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="Leave & Attendance"
        subtitle="Manage team leaves and attendance"
        action={
          <div className="flex gap-2">
            {isManager && (
              <Button variant="outline" size="sm" onClick={handleCapacityRisk}>
                <Sparkles size={14} /> Capacity Risk
              </Button>
            )}
            <Button onClick={() => setShowApply(true)}><Plus size={15} /> Apply Leave</Button>
          </div>
        }
      />

      {aiRisk && (
        <Card className="mb-6 p-4 border-amber-200 bg-amber-50">
          <div className="flex gap-2">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1"><AiBadge>AI Capacity Risk</AiBadge></div>
              <p className="text-sm text-amber-800">{aiRisk}</p>
            </div>
          </div>
        </Card>
      )}

      {aiAnalysis && (
        <Card className="mb-6 p-4 border-primary/20 bg-accent/30">
          <div className="flex gap-2">
            <Sparkles size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2 mb-1"><AiBadge>AI Pattern Analysis</AiBadge></div>
              <p className="text-sm text-foreground">{aiAnalysis}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {['leaves', 'calendar', 'attendance'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-all -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t} {t === 'leaves' && pending.length > 0 && <span className="ml-1 bg-primary text-white text-xs rounded-full px-1.5 py-0.5">{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'leaves' && (
        <Card>
          {leaves.length === 0 ? (
            <EmptyState icon={Calendar} title="No leaves" desc="No leave requests found." />
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => {
                  const emp = employees.find(e => e.id === l.employee_id)
                  return (
                    <tr key={l.id}>
                      <td className="font-medium">{emp?.name || `Employee #${l.employee_id}`}</td>
                      <td><Badge variant="blue">{l.leave_type}</Badge></td>
                      <td className="text-sm text-muted-foreground">{l.start_date} → {l.end_date}</td>
                      <td className="text-sm text-muted-foreground max-w-[200px] truncate">{l.reason}</td>
                      <td><LeaveStatusChip status={l.status} /></td>
                      <td>
                        <div className="flex items-center gap-1">
                          {isManager && l.status === 'Pending' && (
                            <>
                              <button onClick={() => handleDecide(l.id, 'Approved')} className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg">
                                <CheckCircle size={15} />
                              </button>
                              <button onClick={() => handleDecide(l.id, 'Rejected', 'Not approved')} className="p-1.5 hover:bg-red-50 text-destructive rounded-lg">
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          {isAdmin && emp && (
                            <button
                              onClick={() => handleAnalyzePatterns(emp.id)}
                              title="AI Pattern Analysis"
                              className="p-1.5 hover:bg-accent text-muted-foreground hover:text-primary rounded-lg"
                              disabled={analyzingId === emp.id}
                            >
                              {analyzingId === emp.id ? <div className="spinner w-4 h-4" /> : <Sparkles size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'calendar' && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Team Calendar — Approved Leaves</h3>
          {calendar.length === 0 ? (
            <EmptyState icon={Calendar} title="No approved leaves" desc="No team members are on approved leave." />
          ) : (
            <div className="space-y-2">
              {calendar.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {entry.employee_name[0]}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-sm">{entry.employee_name}</span>
                    <span className="text-muted-foreground text-sm ml-2">· {entry.leave_type}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{entry.start_date} → {entry.end_date}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'attendance' && (
        <AttendanceTab employees={employees} isAdmin={isAdmin} />
      )}

      <ApplyLeaveModal open={showApply} onClose={() => setShowApply(false)} onSave={fetchData} isAdmin={isAdmin} employees={employees} />
    </div>
  )
}

function AttendanceTab({ employees, isAdmin }) {
  const [empId, setEmpId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState('Present')
  const [records, setRecords] = useState([])
  const [saving, setSaving] = useState(false)

  const fetchRecords = async (id) => {
    if (!id) return
    const res = await api.get(`/leaves/attendance/${id}`)
    setRecords(res.data)
  }

  const handleMark = async () => {
    if (!empId) return alert('Select an employee')
    setSaving(true)
    await api.post('/leaves/attendance', { employee_id: Number(empId), date, status })
    await fetchRecords(empId)
    setSaving(false)
  }

  const stats = {
    Present: records.filter(r => r.status === 'Present').length,
    WFH: records.filter(r => r.status === 'WFH').length,
    'Half Day': records.filter(r => r.status === 'Half Day').length,
    Absent: records.filter(r => r.status === 'Absent').length,
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 text-sm">Mark Attendance</h3>
          <div className="flex gap-3 flex-wrap">
            <select value={empId} onChange={e => { setEmpId(e.target.value); fetchRecords(e.target.value) }}
              className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none">
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-input bg-background" />
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-input bg-background">
              {ATT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <Button size="sm" onClick={handleMark} loading={saving}>Mark</Button>
          </div>
        </Card>
      )}

      {records.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(stats).map(([k, v]) => (
              <Card key={k} className="p-3 text-center">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-muted-foreground">{k}</div>
              </Card>
            ))}
          </div>
          <Card>
            <table className="w-full data-table">
              <thead><tr><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {records.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>
                      <Badge variant={r.status === 'Present' || r.status === 'WFH' ? 'success' : r.status === 'Absent' ? 'danger' : 'warning'}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}

function ApplyLeaveModal({ open, onClose, onSave, isAdmin, employees }) {
  const [form, setForm] = useState({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' })
  const [empId, setEmpId] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isAdmin && empId) {
        await api.post(`/leaves/admin-apply?employee_id=${empId}`, form)
      } else {
        await api.post('/leaves', form)
      }
      onSave(); onClose()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error applying leave')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdmin && (
          <Select label="Employee" value={empId} onChange={e => setEmpId(e.target.value)}>
            <option value="">My own leave</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        )}
        <Select label="Leave Type" value={form.leave_type} onChange={e => set('leave_type', e.target.value)}>
          {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
          <Input label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} required />
        </div>
        <Textarea label="Reason" rows={3} value={form.reason} onChange={e => set('reason', e.target.value)} required />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Submit Request</Button>
        </div>
      </form>
    </Modal>
  )
}
