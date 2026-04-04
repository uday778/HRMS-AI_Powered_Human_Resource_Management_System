import { useEffect, useState } from 'react'
import api from '../lib/api'
import {
  Card, Button, Input, Select, Modal, PageHeader,
  Badge, AiBadge, Spinner, EmptyState
} from '../components/ui'
import { Plus, Search, Download, Sparkles, Edit, UserX, FileUp, User } from 'lucide-react'

const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Product']

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(null)
  const [showDoc, setShowDoc] = useState(null)
  const [bioLoading, setBioLoading] = useState(null)

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (deptFilter) params.department = deptFilter
      const res = await api.get('/employees', { params })
      setEmployees(res.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchEmployees() }, [search, deptFilter])

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this employee?')) return
    await api.delete(`/employees/${id}`)
    fetchEmployees()
  }

  const handleGenerateBio = async (id) => {
    setBioLoading(id)
    try {
      const res = await api.post(`/employees/${id}/generate-bio`)
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, bio: res.data.bio } : e))
    } finally { setBioLoading(null) }
  }

  const handleExport = () => {
    window.open('/api/employees/export-csv', '_blank')
  }

  return (
    <div className="animate-fadeup">
      <PageHeader
        title="Employees"
        subtitle="Manage your workforce"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} size="sm">
              <Download size={15} /> Export CSV
            </Button>
            <Button onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add Employee
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search name, email, skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        <Card>
          {employees.length === 0 ? (
            <EmptyState icon={User} title="No employees found" desc="Add your first employee to get started." />
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                          {emp.name[0]}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><Badge variant="muted">{emp.department || '—'}</Badge></td>
                    <td className="text-muted-foreground">{emp.designation || '—'}</td>
                    <td className="text-muted-foreground">{emp.joining_date || '—'}</td>
                    <td>
                      <Badge variant={emp.is_active ? 'success' : 'danger'}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleGenerateBio(emp.id)}
                          title="Generate AI Bio"
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                          disabled={bioLoading === emp.id}
                        >
                          {bioLoading === emp.id ? <div className="spinner w-4 h-4" /> : <Sparkles size={15} />}
                        </button>
                        <button
                          onClick={() => setShowEdit(emp)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => setShowDoc(emp)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <FileUp size={15} />
                        </button>
                        {emp.is_active && (
                          <button
                            onClick={() => handleDeactivate(emp.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* AI Bios panel */}
      {employees.some(e => e.bio) && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <AiBadge>AI-Generated Bios</AiBadge>
          </div>
          {employees.filter(e => e.bio).map(emp => (
            <Card key={emp.id} className="p-4">
              <div className="font-medium text-sm mb-1">{emp.name}</div>
              <p className="text-sm text-muted-foreground">{emp.bio}</p>
            </Card>
          ))}
        </div>
      )}

      <AddEmployeeModal open={showAdd} onClose={() => setShowAdd(false)} onSave={fetchEmployees} />
      {showEdit && <EditEmployeeModal emp={showEdit} onClose={() => setShowEdit(null)} onSave={fetchEmployees} />}
      {showDoc && <UploadDocModal emp={showDoc} onClose={() => setShowDoc(null)} />}
    </div>
  )
}
function AddEmployeeModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', email: '', designation: '', department: '',
    joining_date: '', contact: '', skills: '', password: 'pass123', role: 'employee'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Step 1 — Create user account
      let userId = null
      try {
        const userRes = await api.post('/auth/register', {
          email: form.email,
          password: form.password,
          role: form.role
        })
        userId = userRes.data.id
      } catch (err) {
        // User might already exist — try to continue
        console.log('User may already exist:', err.response?.data?.detail)
      }

      // Step 2 — Create employee linked to user
      await api.post('/employees', {
        name: form.name,
        email: form.email,
        designation: form.designation,
        department: form.department,
        joining_date: form.joining_date,
        contact: form.contact,
        skills: form.skills,
        user_id: userId
      })

      onSave()
      onClose()
      setForm({
        name: '', email: '', designation: '', department: '',
        joining_date: '', contact: '', skills: '', password: 'pass123', role: 'employee'
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating employee')
    } finally {
      setLoading(false) 
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Employee" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} required />
          <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
          <Input label="Designation" value={form.designation} onChange={e => set('designation', e.target.value)} />
          <Select label="Department" value={form.department} onChange={e => set('department', e.target.value)}>
            <option value="">Select department</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </Select>
          <Input label="Joining Date" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
          <Input label="Contact" value={form.contact} onChange={e => set('contact', e.target.value)} />
          <Input label="Login Password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Default: pass123" />
          <Select label="Role" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <Input label="Skills (comma-separated)" value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="React, Python, SQL" />
        <div className="bg-accent/50 rounded-lg p-3 text-xs text-muted-foreground">
          Employee will be able to login with their email and the password you set above.
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Employee</Button>
        </div>
      </form>
    </Modal>
  )
}

function EditEmployeeModal({ emp, onClose, onSave }) {
  const [form, setForm] = useState({ name: emp.name, designation: emp.designation || '', department: emp.department || '', contact: emp.contact || '', skills: emp.skills || '' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/employees/${emp.id}`, form)
      onSave(); onClose()
    } finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit — ${emp.name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} />
          <Input label="Designation" value={form.designation} onChange={e => set('designation', e.target.value)} />
          <Select label="Department" value={form.department} onChange={e => set('department', e.target.value)}>
            <option value="">Select</option>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </Select>
          <Input label="Contact" value={form.contact} onChange={e => set('contact', e.target.value)} />
        </div>
        <Input label="Skills" value={form.skills} onChange={e => set('skills', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Save Changes</Button>
        </div>
      </form>
    </Modal>
  )
}

function UploadDocModal({ emp, onClose }) {
  const [file, setFile] = useState(null)
  const [docType, setDocType] = useState('Offer Letter')
  const [loading, setLoading] = useState(false)

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('doc_type', docType)
    try {
      await api.post(`/employees/${emp.id}/upload-document`, form)
      alert('Document uploaded successfully')
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Upload Document — ${emp.name}`}>
      <form onSubmit={handleUpload} className="space-y-4">
        <Select label="Document Type" value={docType} onChange={e => setDocType(e.target.value)}>
          {['Offer Letter', 'ID Proof', 'Contract', 'NDA', 'Other'].map(t => <option key={t}>{t}</option>)}
        </Select>
        <div>
          <label className="text-sm font-medium block mb-1.5">File</label>
          <input type="file" onChange={e => setFile(e.target.files[0])} className="text-sm" accept=".pdf,.doc,.docx,.png,.jpg" />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading} disabled={!file}><FileUp size={15} /> Upload</Button>
        </div>
      </form>
    </Modal>
  )
}
