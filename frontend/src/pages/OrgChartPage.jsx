import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Card, PageHeader, Spinner, EmptyState, Badge } from '../components/ui'
import { GitBranch } from 'lucide-react'

export default function OrgChartPage() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [deptFilter, setDeptFilter] = useState('')

  useEffect(() => {
    api.get('/employees/org-chart').then(r => setNodes(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const departments = [...new Set(nodes.map(n => n.department).filter(Boolean))]
  const filtered = deptFilter ? nodes.filter(n => n.department === deptFilter) : nodes

  // Build tree
  const roots = filtered.filter(n => !n.manager_id || !filtered.find(m => m.id === n.manager_id))
  const getChildren = (id) => filtered.filter(n => n.manager_id === id)

  const DEPT_COLORS = {
    Engineering: '#6366f1', Design: '#ec4899', Marketing: '#f59e0b',
    Sales: '#10b981', HR: '#8b5cf6', Finance: '#3b82f6',
    Operations: '#14b8a6', Product: '#f97316',
  }

  function OrgNode({ node, depth = 0 }) {
    const children = getChildren(node.id)
    const color = DEPT_COLORS[node.department] || '#6366f1'

    return (
      <div className="flex flex-col items-center">
        <div className="org-node" style={{ borderTop: `3px solid ${color}` }}>
          <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold"
            style={{ background: color }}>
            {node.name[0]}
          </div>
          <div className="font-medium text-xs text-foreground">{node.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{node.designation || 'Employee'}</div>
          {node.department && (
            <div className="mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                {node.department}
              </span>
            </div>
          )}
        </div>

        {children.length > 0 && (
          <>
            <div className="w-px h-6 bg-border" />
            <div className="flex gap-6 relative">
              {children.length > 1 && (
                <div className="absolute top-0 left-0 right-0 h-px bg-border" style={{ top: 0 }} />
              )}
              {children.map((child, i) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  <OrgNode node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fadeup">
      <PageHeader title="Organisation Chart" subtitle="Visual team hierarchy" />

      {/* Dept filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setDeptFilter('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${!deptFilter ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
        >All</button>
        {departments.map(d => (
          <button
            key={d}
            onClick={() => setDeptFilter(d)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${deptFilter === d ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >{d}</button>
        ))}
      </div>

      {nodes.length === 0 ? (
        <EmptyState icon={GitBranch} title="No employees" desc="Add employees to see the org chart." />
      ) : (
        <Card className="p-8 overflow-auto">
          {roots.length === 0 ? (
            <EmptyState icon={GitBranch} title="No hierarchy" desc="Set manager relationships to build the org chart." />
          ) : (
            <div className="flex gap-12 justify-center flex-wrap">
              {roots.map(root => (
                <OrgNode key={root.id} node={root} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Legend */}
      {departments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {departments.map(d => (
            <div key={d} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ background: DEPT_COLORS[d] || '#6366f1' }} />
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
