import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Card, Button, Input, Select, Textarea, Modal, PageHeader,
  AiBadge, RatingStars, Spinner, EmptyState, Badge
} from '../components/ui'
import { Plus, Star, Sparkles, AlertTriangle, CheckSquare } from 'lucide-react'

export default function PerformancePage() {
  const { isAdmin, isManager } = useAuth()
  const [cycles, setCycles] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [allReviews, setAllReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewCycle, setShowNewCycle] = useState(false)
  const [showSelfReview, setShowSelfReview] = useState(false)
  const [showMgrReview, setShowMgrReview] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    const [cr] = await Promise.all([api.get('/performance/cycles')])
    setCycles(cr.data)
    if (isAdmin) {
      const er = await api.get('/employees')
      setEmployees(er.data)
    }
    setLoading(false)
  }

  const fetchAllReviews = async (cycleId) => {
    if (!isManager) return
    const res = await api.get(`/performance/all-reviews/${cycleId}`)
    setAllReviews(res.data)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { if (selectedCycle) fetchAllReviews(selectedCycle.id) }, [selectedCycle])

  if (loading) return <Spinner />

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="Performance Reviews"
        subtitle="AI-powered review cycles with smart summaries"
        action={
          isAdmin && <Button onClick={() => setShowNewCycle(true)}><Plus size={15} /> New Cycle</Button>
        }
      />

      {/* Cycle selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {cycles.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCycle(c)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCycle?.id === c.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {c.name} · {c.period}
          </button>
        ))}
        {cycles.length === 0 && (
          <p className="text-muted-foreground text-sm">No review cycles yet. {isAdmin && 'Create one to get started.'}</p>
        )}
      </div>

      {selectedCycle && (
        <>
          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <Button variant="outline" onClick={() => setShowSelfReview(true)}>
              <CheckSquare size={15} /> Submit Self-Review
            </Button>
            {isManager && (
              <Button variant="outline" onClick={() => setShowMgrReview(true)}>
                <Star size={15} /> Submit Manager Review
              </Button>
            )}
          </div>

          {/* All reviews table (manager/admin view) */}
          {isManager && allReviews.length > 0 && (
            <Card className="mb-6">
              <div className="p-4 border-b border-border flex items-center gap-2">
                <h3 className="font-semibold">Review Results</h3>
                <AiBadge>AI Summaries</AiBadge>
              </div>
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Avg Rating</th>
                    <th>AI Flags</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allReviews.map(r => (
                    <tr key={r.employee_id}>
                      <td className="font-medium">{r.employee_name}</td>
                      <td><Badge variant="muted">{r.department || '—'}</Badge></td>
                      <td><RatingStars value={r.avg_rating} /></td>
                      <td>
                        {r.ai_flags ? (
                          <div className="flex items-center gap-1 text-amber-600 text-xs">
                            <AlertTriangle size={12} /> Mismatch
                          </div>
                        ) : <span className="text-xs text-emerald-600">✓ Aligned</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedReview(r)}
                          className="text-primary text-sm hover:underline"
                        >View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {allReviews.length === 0 && isManager && (
            <EmptyState icon={Star} title="No reviews yet" desc="Reviews will appear here once submitted." />
          )}
        </>
      )}

      {/* Modals */}
      {showNewCycle && <NewCycleModal onClose={() => setShowNewCycle(false)} onSave={fetchData} />}
      {showSelfReview && selectedCycle && (
        <SelfReviewModal cycle={selectedCycle} onClose={() => setShowSelfReview(false)} />
      )}
      {showMgrReview && selectedCycle && (
        <ManagerReviewModal cycle={selectedCycle} employees={employees} onClose={() => setShowMgrReview(false)} onSave={() => fetchAllReviews(selectedCycle.id)} />
      )}
      {selectedReview && (
        <ReviewDetailModal review={selectedReview} cycle={selectedCycle} onClose={() => setSelectedReview(null)} />
      )}
    </div>
  )
}

function NewCycleModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await api.post('/performance/cycles', { name, period })
    onSave(); onClose()
    setLoading(false)
  }

  return (
    <Modal open={true} onClose={onClose} title="New Review Cycle">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Cycle Name *" value={name} onChange={e => setName(e.target.value)} placeholder="Q2 2025 Review" required />
        <Input label="Period" value={period} onChange={e => setPeriod(e.target.value)} placeholder="April – June 2025" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Cycle</Button>
        </div>
      </form>
    </Modal>
  )
}

function SelfReviewModal({ cycle, onClose }) {
  const [form, setForm] = useState({ achievements: '', challenges: '', goals_next: '', rating: 3 })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await api.post('/performance/self-review', { cycle_id: cycle.id, ...form, rating: Number(form.rating) })
    alert('Self-review submitted successfully!')
    onClose()
    setLoading(false)
  }

  return (
    <Modal open={true} onClose={onClose} title={`Self-Review — ${cycle.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea label="Achievements *" rows={3} value={form.achievements} onChange={e => set('achievements', e.target.value)} placeholder="Key accomplishments this period..." required />
        <Textarea label="Challenges" rows={3} value={form.challenges} onChange={e => set('challenges', e.target.value)} placeholder="Obstacles faced..." />
        <Textarea label="Goals for Next Period" rows={3} value={form.goals_next} onChange={e => set('goals_next', e.target.value)} placeholder="What you want to achieve..." />
        <div>
          <label className="text-sm font-medium block mb-2">Self-Rating: {form.rating}/5</label>
          <input type="range" min={1} max={5} step={0.5} value={form.rating} onChange={e => set('rating', e.target.value)} className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 - Needs Improvement</span><span>5 - Exceptional</span>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Submit Review</Button>
        </div>
      </form>
    </Modal>
  )
}

function ManagerReviewModal({ cycle, employees, onClose, onSave }) {
  const [empId, setEmpId] = useState('')
  const [ratings, setRatings] = useState({ quality: 3, delivery: 3, communication: 3, initiative: 3, teamwork: 3 })
  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState(false)
  const setR = (k, v) => setRatings(r => ({ ...r, [k]: Number(v) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!empId) return alert('Select an employee')
    setLoading(true)
    try {
      const res = await api.post('/performance/manager-review', {
        cycle_id: cycle.id, employee_id: Number(empId), ...ratings, comments
      })
      alert('Manager review submitted with AI summary!')
      onSave(); onClose()
    } finally { setLoading(false) }
  }

  const PARAMS = ['quality', 'delivery', 'communication', 'initiative', 'teamwork']

  return (
    <Modal open={true} onClose={onClose} title={`Manager Review — ${cycle.name}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-accent/50 rounded-lg p-3 text-sm flex gap-2 text-muted-foreground">
          <Sparkles size={15} className="text-primary flex-shrink-0 mt-0.5" />
          AI will generate a balanced performance summary and flag any rating mismatches.
        </div>
        <Select label="Employee *" value={empId} onChange={e => setEmpId(e.target.value)}>
          <option value="">Select employee</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
        <div className="space-y-3">
          <label className="text-sm font-medium">Performance Ratings (1–5)</label>
          {PARAMS.map(param => (
            <div key={param} className="flex items-center gap-4">
              <span className="text-sm capitalize w-32">{param}</span>
              <input type="range" min={1} max={5} step={0.5} value={ratings[param]}
                onChange={e => setR(param, e.target.value)} className="flex-1 accent-primary" />
              <span className="text-sm font-semibold w-8">{ratings[param]}</span>
            </div>
          ))}
        </div>
        <Textarea label="Comments" rows={3} value={comments} onChange={e => setComments(e.target.value)} placeholder="Overall observations..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} variant="ai"><Sparkles size={14} /> Submit & Generate AI Summary</Button>
        </div>
      </form>
    </Modal>
  )
}

function ReviewDetailModal({ review, cycle, onClose }) {
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    api.get(`/performance/review/${cycle.id}/${review.employee_id}`).then(r => setDetail(r.data))
  }, [])

  return (
    <Modal open={true} onClose={onClose} title={`${review.employee_name} — Review Detail`} size="xl">
      {!detail ? <Spinner /> : (
        <div className="space-y-5">
          {detail.manager_review?.ai_summary && (
            <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <AiBadge>AI-Generated Summary</AiBadge>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{detail.manager_review.ai_summary}</p>
            </div>
          )}

          {detail.manager_review?.ai_flags && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Rating Mismatch Detected</span>
              </div>
              <p className="text-sm text-amber-700">{detail.manager_review.ai_flags}</p>
            </div>
          )}

          {detail.manager_review?.ai_actions?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2"><AiBadge>Development Actions</AiBadge></div>
              <ul className="space-y-2">
                {detail.manager_review.ai_actions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-primary font-bold">{i + 1}.</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {detail.self_review && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Self-Assessment</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Achievements:</span> {detail.self_review.achievements}</div>
                  <div><span className="text-muted-foreground">Challenges:</span> {detail.self_review.challenges}</div>
                  <div><span className="text-muted-foreground">Goals:</span> {detail.self_review.goals_next}</div>
                  <div><span className="text-muted-foreground">Self-rating:</span> <RatingStars value={detail.self_review.rating} /></div>
                </div>
              </div>
            )}
            {detail.manager_review && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Manager Ratings</h4>
                <div className="space-y-1">
                  {['quality', 'delivery', 'communication', 'initiative', 'teamwork'].map(k => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{k}</span>
                      <RatingStars value={detail.manager_review[k]} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
