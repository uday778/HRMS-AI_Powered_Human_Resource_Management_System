import { useEffect, useState } from 'react'
import api from '../lib/api'
import {
  Card, Button, Input, Select, Textarea, Modal,
  PageHeader, Badge, AiBadge, Spinner, EmptyState
} from '../components/ui'
import { FileText, Sparkles, Download, Send, Plus, Eye, Check } from 'lucide-react'

export default function OfferLettersPage() {
  const [letters, setLetters] = useState([])
  const [templates, setTemplates] = useState([])
  const [candidates, setCandidates] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showPreview, setShowPreview] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lr, tr, er] = await Promise.all([
        api.get('/offer-letters/list'),
        api.get('/offer-letters/templates'),
        api.get('/employees'),
      ])
      setLetters(lr.data)
      setTemplates(tr.data)
      setEmployees(er.data)
    } finally { setLoading(false) }
  }

  const seedTemplates = async () => {
    await api.post('/offer-letters/seed-templates')
    fetchData()
  }

  const handleDownloadPdf = async (id, name) => {
    const res = await api.get(`/offer-letters/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `Offer_Letter_${name?.replace(' ', '_')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSend = async (id, email) => {
    if (!confirm(`Send offer letter to ${email}?`)) return
    await api.post(`/offer-letters/${id}/send`)
    alert('Offer letter sent successfully!')
    fetchData()
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <Spinner />

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="Offer Letters"
        subtitle="AI-generated professional offer letters"
        action={
          <div className="flex gap-2 flex-wrap">
            {templates.length === 0 && (
              <Button variant="outline" size="sm" onClick={seedTemplates}>
                Seed Templates
              </Button>
            )}
            <Button onClick={() => setShowGenerate(true)}>
              <Plus size={15} /> Generate Offer Letter
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{letters.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Letters</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">
            {letters.filter(l => l.status === 'sent').length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Sent</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {letters.filter(l => l.status === 'draft').length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Drafts</div>
        </Card>
      </div>

      {/* Letters list */}
      {letters.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No offer letters yet"
          desc="Generate your first AI offer letter using the button above."
        />
      ) : (
        <div className="space-y-3">
          {letters.map(letter => (
            <Card key={letter.id} className="p-4 card-hover">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{letter.recipient_name || 'Unknown'}</div>
                    <div className="text-sm text-muted-foreground">{letter.role} · {letter.recipient_email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={letter.status === 'sent' ? 'success' : 'warning'}>
                        {letter.status === 'sent' ? '✓ Sent' : '⏳ Draft'}
                      </Badge>
                      {letter.joining_date && (
                        <span className="text-xs text-muted-foreground">Joining: {letter.joining_date}</span>
                      )}
                      {letter.salary > 0 && (
                        <span className="text-xs text-muted-foreground">₹{letter.salary?.toLocaleString()}/yr</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setShowPreview(letter)}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Preview"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(letter.id, letter.recipient_name)}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                    title="Download PDF"
                  >
                    <Download size={15} />
                  </button>
                  {letter.status !== 'sent' && letter.recipient_email && (
                    <button
                      onClick={() => handleSend(letter.id, letter.recipient_email)}
                      className="p-2 rounded-lg hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors"
                      title="Send Email"
                    >
                      <Send size={15} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showGenerate && (
        <GenerateModal
          templates={templates}
          employees={employees}
          onClose={() => setShowGenerate(false)}
          onSave={fetchData}
        />
      )}

      {showPreview && (
        <PreviewModal
          letter={showPreview}
          onClose={() => setShowPreview(null)}
          onDownload={() => handleDownloadPdf(showPreview.id, showPreview.recipient_name)}
          onSend={() => handleSend(showPreview.id, showPreview.recipient_email)}
        />
      )}
    </div>
  )
}

function GenerateModal({ templates, employees, onClose, onSave }) {
  const [form, setForm] = useState({
    candidate_name: '',
    email: '',
    role: '',
    department: '',
    salary: '',
    joining_date: '',
    template_id: '',
    employee_id: '',
  })
  const [generatedContent, setGeneratedContent] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1=form, 2=preview

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSelectEmployee = (empId) => {
    const emp = employees.find(e => e.id === Number(empId))
    if (emp) {
      set('candidate_name', emp.name)
      set('email', emp.email)
      set('role', emp.designation || '')
      set('department', emp.department || '')
      set('employee_id', empId)
    }
  }

  const handleGenerate = async () => {
    if (!form.candidate_name || !form.email || !form.role || !form.joining_date) {
      setError('Please fill Name, Email, Role, and Joining Date')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const res = await api.post('/offer-letters/generate', {
        ...form,
        salary: Number(form.salary) || 0,
        template_id: form.template_id ? Number(form.template_id) : null,
        employee_id: form.employee_id ? Number(form.employee_id) : null,
      })
      setGeneratedContent(res.data.content)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Generation failed')
    } finally { setGenerating(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/offer-letters/save', {
        ...form,
        salary: Number(form.salary) || 0,
        generated_content: generatedContent,
        template_id: form.template_id ? Number(form.template_id) : null,
        employee_id: form.employee_id ? Number(form.employee_id) : null,
      })
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleSaveAndSend = async () => {
    setSending(true)
    try {
      const res = await api.post('/offer-letters/save', {
        ...form,
        salary: Number(form.salary) || 0,
        generated_content: generatedContent,
        template_id: form.template_id ? Number(form.template_id) : null,
        employee_id: form.employee_id ? Number(form.employee_id) : null,
      })
      await api.post(`/offer-letters/${res.data.id}/send`)
      alert(`Offer letter sent to ${form.email}!`)
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Send failed')
    } finally { setSending(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Generate Offer Letter" size="xl">
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-accent/50 rounded-lg p-3 text-sm text-muted-foreground flex gap-2">
            <Sparkles size={15} className="text-primary flex-shrink-0 mt-0.5" />
            AI will generate a professional, formal offer letter using your inputs and the selected template.
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Pre-fill from employee */}
          {employees.length > 0 && (
            <Select label="Pre-fill from Employee (optional)" value={form.employee_id} onChange={e => handleSelectEmployee(e.target.value)}>
              <option value="">Select existing employee</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.designation}</option>)}
            </Select>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Candidate Full Name *" value={form.candidate_name} onChange={e => set('candidate_name', e.target.value)} placeholder="John Doe" required />
            <Input label="Email Address *" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@email.com" required />
            <Input label="Role / Designation *" value={form.role} onChange={e => set('role', e.target.value)} placeholder="Senior Software Engineer" required />
            <Input label="Department" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Engineering" />
            <Input label="Annual Salary (₹)" type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="800000" />
            <Input label="Joining Date *" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} required />
          </div>

          <Select label="Template (optional)" value={form.template_id} onChange={e => set('template_id', e.target.value)}>
            <option value="">Default template</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="ai" onClick={handleGenerate} loading={generating} className="w-full sm:w-auto">
              <Sparkles size={15} /> Generate with AI
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AiBadge>AI Generated</AiBadge>
              <span className="text-sm text-muted-foreground">Review and edit before saving</span>
            </div>
            <button onClick={() => setStep(1)} className="text-sm text-primary hover:underline">← Edit Details</button>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Editable preview */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Offer Letter Preview (Editable)</span>
            </div>
            <textarea
              value={generatedContent}
              onChange={e => setGeneratedContent(e.target.value)}
              className="w-full h-[400px] p-5 text-sm font-mono leading-relaxed focus:outline-none resize-none bg-white"
              placeholder="Generated content will appear here..."
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-border">
            <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="outline" onClick={handleSave} loading={saving} className="w-full sm:w-auto">
              <Check size={15} /> Save as Draft
            </Button>
            <Button onClick={handleSaveAndSend} loading={sending} className="w-full sm:w-auto">
              <Send size={15} /> Save & Send Email
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function PreviewModal({ letter, onClose, onDownload, onSend }) {
  return (
    <Modal open={true} onClose={onClose} title={`Offer Letter — ${letter.recipient_name}`} size="xl">
      <div className="space-y-4">
        {/* Meta info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Role</div>
            <div className="text-sm font-medium mt-0.5">{letter.role}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Joining Date</div>
            <div className="text-sm font-medium mt-0.5">{letter.joining_date || '—'}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="mt-0.5">
              <Badge variant={letter.status === 'sent' ? 'success' : 'warning'}>{letter.status}</Badge>
            </div>
          </div>
        </div>

        {/* Letter content */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/30 px-4 py-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Letter Content</span>
          </div>
          <div className="p-5 max-h-[400px] overflow-y-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {letter.generated_content}
            </pre>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Close</Button>
          <Button variant="outline" onClick={onDownload} className="w-full sm:w-auto">
            <Download size={15} /> Download PDF
          </Button>
          {letter.status !== 'sent' && (
            <Button onClick={() => { onSend(); onClose() }} className="w-full sm:w-auto">
              <Send size={15} /> Send Email
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
