import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  Card, Button, Input, Textarea, Modal, PageHeader,
  AiBadge, Spinner, EmptyState, Badge
} from '../components/ui'
import { Plus, BookOpen, Send, Sparkles, Upload, CheckCircle, Trash2, MessageSquare } from 'lucide-react'

export default function OnboardingPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('checklist')
  const [templates, setTemplates] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedEmp, setSelectedEmp] = useState('')
  const [progress, setProgress] = useState([])
  const [policies, setPolicies] = useState([])
  const [queries, setQueries] = useState([])
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [tr, pr] = await Promise.all([
      api.get('/onboarding/templates'),
      api.get('/onboarding/policies')
    ])
    setTemplates(tr.data)
    setPolicies(pr.data)
    if (isAdmin) {
      const er = await api.get('/employees')
      setEmployees(er.data)
    }
    if (isAdmin) {
      const qr = await api.get('/onboarding/chatbot/top-questions')
      setQueries(qr.data)
    }
    setLoading(false)
  }

  const fetchProgress = async (empId) => {
    if (!empId) return
    const res = await api.get(`/onboarding/progress/${empId}`)
    setProgress(res.data)
  }

  useEffect(() => { fetchData() }, [])
  useEffect(() => { fetchProgress(selectedEmp) }, [selectedEmp])

  const markDone = async (progressId) => {
    await api.put(`/onboarding/progress/${progressId}/complete`)
    fetchProgress(selectedEmp)
  }

  const deletePolicy = async (id) => {
    if (!confirm('Delete this policy document?')) return
    await api.delete(`/onboarding/policies/${id}`)
    fetchData()
  }

  const done = progress.filter(p => p.is_done).length
  const pct = progress.length > 0 ? Math.round((done / progress.length) * 100) : 0

  if (loading) return <Spinner />

  return (
    <div className="animate-fadeup">
      <PageHeader title="Onboarding" subtitle="Checklists, policy docs, and AI HR assistant" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {['checklist', 'policies', 'chatbot', ...(isAdmin ? ['templates', 'insights'] : [])].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-all -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'chatbot' && <span className="flex items-center gap-1"><Sparkles size={13} />AI Chat</span>}
            {t !== 'chatbot' && t}
          </button>
        ))}
      </div>

      {tab === 'checklist' && (
        <div>
          {isAdmin && (
            <div className="flex gap-3 mb-4">
              <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none">
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={() => setShowAssign(true)}>
                <Plus size={14} /> Assign Template
              </Button>
            </div>
          )}

          {progress.length > 0 && (
            <>
              {/* Progress bar */}
              <Card className="p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Onboarding Progress</span>
                  <span className="text-sm font-bold text-primary">{pct}%</span>
                </div>
                <div className="score-bar">
                  <div className="score-fill bg-primary" style={{ width: `${pct}%`, background: 'hsl(var(--primary))' }} />
                </div>
                <div className="text-xs text-muted-foreground mt-1">{done} of {progress.length} tasks completed</div>
              </Card>

              <div className="space-y-2">
                {progress.map(item => (
                  <Card key={item.id} className={`p-4 flex items-start gap-3 ${item.is_done ? 'opacity-60' : ''}`}>
                    <button
                      onClick={() => !item.is_done && markDone(item.id)}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${item.is_done ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-primary'}`}
                    >
                      {item.is_done && <CheckCircle size={12} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${item.is_done ? 'line-through' : ''}`}>{item.title}</div>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {item.due_days && <span>Due: Day {item.due_days}</span>}
                        {item.assignee && <span>Assignee: {item.assignee}</span>}
                        {item.completed_at && <span className="text-emerald-600">Completed {item.completed_at.slice(0, 10)}</span>}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
          {progress.length === 0 && (
            <EmptyState icon={BookOpen} title="No checklist" desc="Select an employee or get assigned an onboarding checklist." />
          )}
        </div>
      )}

      {tab === 'policies' && (
        <div>
          {isAdmin && (
            <div className="mb-4">
              <PolicyUploader onUploaded={fetchData} />
            </div>
          )}
          {policies.length === 0 ? (
            <EmptyState icon={BookOpen} title="No policy documents" desc="Upload PDFs or text files to enable the AI chatbot." />
          ) : (
            <div className="space-y-2">
              {policies.map(doc => (
                <Card key={doc.id} className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{doc.filename}</div>
                    <div className="text-xs text-muted-foreground">Uploaded {doc.uploaded_at?.slice(0, 10)}</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => deletePolicy(doc.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'chatbot' && <ChatbotTab />}

      {tab === 'templates' && isAdmin && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Onboarding Templates</h3>
            <Button size="sm" onClick={() => setShowNewTemplate(true)}><Plus size={14} /> New Template</Button>
          </div>
          <div className="space-y-4">
            {templates.map(tmpl => (
              <Card key={tmpl.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{tmpl.role}</h4>
                  <Badge variant="muted">{tmpl.items.length} items</Badge>
                </div>
                {tmpl.items.length > 0 && (
                  <div className="space-y-1">
                    {tmpl.items.map(item => (
                      <div key={item.id} className="text-sm flex gap-2 text-muted-foreground">
                        <span className="text-primary">•</span> {item.title}
                        <span className="text-xs">(Day {item.due_days}, {item.assignee})</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => setSelectedTemplate(tmpl)} className="text-primary text-sm hover:underline mt-2 block">
                  + Add checklist item
                </button>
              </Card>
            ))}
            {templates.length === 0 && <EmptyState icon={BookOpen} title="No templates" desc="Create a template for each role." />}
          </div>
        </div>
      )}

      {tab === 'insights' && isAdmin && (
        <div>
          <h3 className="font-semibold mb-4">Most Asked Chatbot Questions</h3>
          {queries.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No queries yet" desc="Questions employees ask will appear here." />
          ) : (
            <div className="space-y-2">
              {queries.map(q => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium">{q.question}</p>
                    <Badge variant={q.was_answered ? 'success' : 'warning'}>
                      {q.was_answered ? 'Answered' : 'Escalated'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{q.created_at?.slice(0, 10)}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {showNewTemplate && <NewTemplateModal onClose={() => setShowNewTemplate(false)} onSave={fetchData} />}
      {selectedTemplate && <AddItemModal template={selectedTemplate} onClose={() => setSelectedTemplate(null)} onSave={fetchData} />}
      {showAssign && <AssignModal templates={templates} employees={employees} onClose={() => setShowAssign(false)} onSave={() => fetchProgress(selectedEmp)} />}
    </div>
  )
}

function ChatbotTab() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! I\'m your HR assistant. Ask me anything about company policies, leave rules, or onboarding. I answer only from uploaded policy documents.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    if (!input.trim()) return
    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setLoading(true)
    try {
      const res = await api.post('/onboarding/chatbot', { question })
      setMessages(m => [...m, { role: 'ai', text: res.data.answer }])
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.' }])
    } finally { setLoading(false) }
  }

  return (
    <Card className="flex flex-col h-[500px]">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg ai-badge flex items-center justify-center">
          <Sparkles size={13} className="text-white" />
        </div>
        <span className="font-semibold text-sm">HR AI Assistant</span>
        <AiBadge>RAG-powered</AiBadge>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full ai-badge flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div className={`max-w-[75%] p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full ai-badge flex items-center justify-center mr-2 flex-shrink-0">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="chat-bubble-ai p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about leave policy, onboarding steps, benefits..."
          className="flex-1 px-4 py-2 text-sm rounded-full border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          <Send size={15} />
        </button>
      </div>
    </Card>
  )
}

function PolicyUploader({ onUploaded }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    await api.post('/onboarding/upload-policy', form)
    setFile(null)
    onUploaded()
    setLoading(false)
  }

  return (
    <Card className="p-4 border-dashed border-2 border-border bg-muted/30">
      <div className="flex items-center gap-3">
        <Upload size={16} className="text-muted-foreground" />
        <input type="file" accept=".pdf,.txt" onChange={e => setFile(e.target.files[0])} className="text-sm flex-1" />
        <Button size="sm" onClick={handleUpload} loading={loading} disabled={!file}>Upload Policy</Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Upload PDF or TXT files. The AI chatbot will use these to answer questions.</p>
    </Card>
  )
}

function NewTemplateModal({ onClose, onSave }) {
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await api.post('/onboarding/templates', { role })
    onSave(); onClose()
    setLoading(false)
  }
  return (
    <Modal open={true} onClose={onClose} title="New Onboarding Template">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Role Name *" value={role} onChange={e => setRole(e.target.value)} placeholder="Software Engineer" required />
        <div className="flex justify-end gap-3"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Create</Button></div>
      </form>
    </Modal>
  )
}

function AddItemModal({ template, onClose, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', due_days: 1, assignee: 'HR' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await api.post(`/onboarding/templates/${template.id}/items`, { ...form, due_days: Number(form.due_days) })
    onSave(); onClose()
    setLoading(false)
  }
  return (
    <Modal open={true} onClose={onClose} title={`Add Item — ${template.role}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} required />
        <Textarea label="Description" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Due Day #" type="number" min={1} value={form.due_days} onChange={e => set('due_days', e.target.value)} />
          <Input label="Assignee" value={form.assignee} onChange={e => set('assignee', e.target.value)} />
        </div>
        <div className="flex justify-end gap-3"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading}>Add Item</Button></div>
      </form>
    </Modal>
  )
}

function AssignModal({ templates, employees, onClose, onSave }) {
  const [empId, setEmpId] = useState('')
  const [tmplId, setTmplId] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await api.post('/onboarding/assign', { employee_id: Number(empId), template_id: Number(tmplId) })
    onSave(); onClose()
    setLoading(false)
  }
  return (
    <Modal open={true} onClose={onClose} title="Assign Onboarding Checklist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select label="Employee *" value={empId} onChange={e => setEmpId(e.target.value)}>
          <option value="">Select employee</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select>
        <Select label="Template *" value={tmplId} onChange={e => setTmplId(e.target.value)}>
          <option value="">Select template</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.role}</option>)}
        </Select>
        <div className="flex justify-end gap-3"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" loading={loading} disabled={!empId || !tmplId}>Assign</Button></div>
      </form>
    </Modal>
  )
}
