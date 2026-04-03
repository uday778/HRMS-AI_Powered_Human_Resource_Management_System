import { useEffect, useState } from 'react'
import api from '../lib/api'
import {
  Card, Button, Input, Select, Textarea, Modal, PageHeader,
  Badge, StageChip, ScoreBar, AiBadge, Spinner, EmptyState
} from '../components/ui'
import { Plus, Briefcase, Upload, ChevronRight, Sparkles, RotateCcw, Users } from 'lucide-react'

const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)
  const [showAddCand, setShowAddCand] = useState(false)
  const [selectedCand, setSelectedCand] = useState(null)

  const fetchJobs = async () => {
    setLoading(true)
    const res = await api.get('/recruitment/jobs')
    setJobs(res.data)
    setLoading(false)
  }

  const fetchCandidates = async (jobId) => {
    const res = await api.get(`/recruitment/jobs/${jobId}/candidates`)
    setCandidates(res.data)
  }

  useEffect(() => { fetchJobs() }, [])

  useEffect(() => {
    if (selectedJob) fetchCandidates(selectedJob.id)
    else setCandidates([])
  }, [selectedJob])

  const updateStage = async (candId, stage) => {
    await api.put(`/recruitment/candidates/${candId}/stage`, { stage })
    fetchCandidates(selectedJob.id)
  }

  const rescore = async (candId) => {
    await api.post(`/recruitment/candidates/${candId}/rescore`)
    fetchCandidates(selectedJob.id)
    if (selectedCand?.id === candId) {
      const res = await api.get(`/recruitment/candidates/${candId}`)
      setSelectedCand(res.data)
    }
  }

  const closeJob = async (jobId) => {
    if (!confirm('Close this job posting?')) return
    await api.delete(`/recruitment/jobs/${jobId}`)
    fetchJobs()
    if (selectedJob?.id === jobId) setSelectedJob(null)
  }

  if (loading) return <Spinner />

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="Recruitment & ATS"
        subtitle="Manage job postings and candidate pipeline"
        action={<Button onClick={() => setShowAddJob(true)}><Plus size={15} /> New Job</Button>}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Job list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Job Postings</h3>
          {jobs.length === 0 && <EmptyState icon={Briefcase} title="No jobs" desc="Create your first job posting." />}
          {jobs.map(job => (
            <Card
              key={job.id}
              className={`p-4 cursor-pointer card-hover transition-all ${selectedJob?.id === job.id ? 'border-primary/50 bg-accent' : ''}`}
              onClick={() => setSelectedJob(job)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-sm">{job.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{job.department} · {job.experience_level}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Users size={11} /> {job.candidate_count} candidates
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={job.is_open ? 'success' : 'muted'}>{job.is_open ? 'Open' : 'Closed'}</Badge>
                  {job.is_open && (
                    <button onClick={(e) => { e.stopPropagation(); closeJob(job.id) }}
                      className="text-xs text-destructive hover:underline">Close</button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Candidates */}
        <div className="col-span-2">
          {!selectedJob ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              ← Select a job to see candidates
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold">{selectedJob.title}</h3>
                  <p className="text-sm text-muted-foreground">{candidates.length} candidates</p>
                </div>
                <Button size="sm" onClick={() => setShowAddCand(true)}>
                  <Upload size={14} /> Add Candidate
                </Button>
              </div>

              {/* Pipeline kanban header */}
              <div className="flex gap-1 mb-4 overflow-x-auto">
                {STAGES.map(stage => {
                  const count = candidates.filter(c => c.stage === stage).length
                  return (
                    <div key={stage} className="flex-1 min-w-[80px] text-center text-xs py-1 rounded-lg bg-muted text-muted-foreground">
                      <div className="font-semibold">{stage}</div>
                      <div className="text-base font-bold text-foreground">{count}</div>
                    </div>
                  )
                })}
              </div>

              {/* Candidates list */}
              <div className="space-y-3">
                {candidates.length === 0 && (
                  <EmptyState icon={Users} title="No candidates" desc="Upload resumes to start. AI will auto-score them." />
                )}
                {candidates.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0)).map(cand => (
                  <Card key={cand.id} className="p-4 card-hover cursor-pointer" onClick={() => setSelectedCand(cand)}>
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {cand.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="font-medium">{cand.name}</span>
                            <span className="text-sm text-muted-foreground ml-2">{cand.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {cand.ai_score != null && <AiBadge>{cand.ai_score}% match</AiBadge>}
                            <StageChip stage={cand.stage} />
                          </div>
                        </div>
                        {cand.ai_score != null && (
                          <div className="mt-2">
                            <ScoreBar value={cand.ai_score} />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddJobModal open={showAddJob} onClose={() => setShowAddJob(false)} onSave={fetchJobs} />
      {selectedJob && (
        <AddCandidateModal
          open={showAddCand} job={selectedJob}
          onClose={() => setShowAddCand(false)}
          onSave={() => fetchCandidates(selectedJob.id)}
        />
      )}
      {selectedCand && (
        <CandidateDetailModal
          cand={selectedCand}
          onClose={() => setSelectedCand(null)}
          onStageChange={updateStage}
          onRescore={rescore}
        />
      )}
    </div>
  )
}

function AddJobModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', department: '', description: '', required_skills: '', experience_level: 'Mid-level' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try { await api.post('/recruitment/jobs', form); onSave(); onClose() }
    finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Job Posting" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Job Title *" value={form.title} onChange={e => set('title', e.target.value)} required />
          <Input label="Department" value={form.department} onChange={e => set('department', e.target.value)} />
          <Select label="Experience Level" value={form.experience_level} onChange={e => set('experience_level', e.target.value)}>
            {['Entry-level', 'Mid-level', 'Senior', 'Lead', 'Manager'].map(l => <option key={l}>{l}</option>)}
          </Select>
          <Input label="Required Skills" value={form.required_skills} onChange={e => set('required_skills', e.target.value)} placeholder="React, Node.js, SQL" />
        </div>
        <Textarea label="Job Description *" rows={5} value={form.description} onChange={e => set('description', e.target.value)} required placeholder="Describe the role, responsibilities, and requirements..." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Job</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddCandidateModal({ open, job, onClose, onSave }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Please upload a resume')
    setLoading(true)
    const form = new FormData()
    form.append('name', name)
    form.append('email', email)
    form.append('resume', file)
    try {
      await api.post(`/recruitment/jobs/${job.id}/candidates`, form)
      onSave(); onClose()
      setName(''); setEmail(''); setFile(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error adding candidate')
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Candidate">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-accent/50 rounded-lg p-3 text-sm text-muted-foreground flex gap-2">
          <Sparkles size={15} className="text-primary flex-shrink-0 mt-0.5" />
          AI will automatically score the resume against the JD and generate interview questions.
        </div>
        <Input label="Full Name *" value={name} onChange={e => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <div>
          <label className="text-sm font-medium block mb-1.5">Resume (PDF) *</label>
          <input type="file" accept=".pdf,.txt,.doc" onChange={e => setFile(e.target.files[0])} className="text-sm" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}><Upload size={14} /> Upload & Score</Button>
        </div>
      </form>
    </Modal>
  )
}

function CandidateDetailModal({ cand, onClose, onStageChange, onRescore }) {
  const [stage, setStage] = useState(cand.stage)
  const [rescoring, setRescoring] = useState(false)

  const handleStageChange = async (newStage) => {
    setStage(newStage)
    await onStageChange(cand.id, newStage)
  }

  const handleRescore = async () => {
    setRescoring(true)
    await onRescore(cand.id)
    setRescoring(false)
  }

  return (
    <Modal open={true} onClose={onClose} title={cand.name} size="lg">
      <div className="space-y-5">
        {/* Stage selector */}
        <div>
          <label className="text-sm font-medium block mb-2">Pipeline Stage</label>
          <div className="flex flex-wrap gap-2">
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${stage === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* AI Score */}
        {cand.ai_score != null ? (
          <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AiBadge>AI Score</AiBadge>
                <span className="font-display font-bold text-2xl">{cand.ai_score}%</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRescore} loading={rescoring}>
                <RotateCcw size={13} /> Re-score
              </Button>
            </div>
            <ScoreBar value={cand.ai_score} />
            {cand.ai_reasoning && <p className="text-sm text-muted-foreground mt-3">{cand.ai_reasoning}</p>}

            <div className="grid grid-cols-2 gap-4 mt-4">
              {cand.ai_strengths?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-emerald-700 mb-1.5">✓ Strengths</div>
                  <ul className="space-y-1">
                    {cand.ai_strengths.map((s, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-emerald-500">•</span>{s}</li>)}
                  </ul>
                </div>
              )}
              {cand.ai_gaps?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-600 mb-1.5">✗ Gaps</div>
                  <ul className="space-y-1">
                    {cand.ai_gaps.map((g, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-red-400">•</span>{g}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">No AI score yet.</div>
        )}

        {/* Interview Questions */}
        {cand.ai_questions?.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AiBadge>Interview Questions</AiBadge>
            </div>
            <ol className="space-y-2">
              {cand.ai_questions.map((q, i) => (
                <li key={i} className="text-sm flex gap-3">
                  <span className="text-primary font-bold w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-foreground">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  )
}
