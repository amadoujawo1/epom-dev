import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

export default function EAction({ searchQuery, notify }) {
  const [stats, setStats] = useState(null)
  const [actions, setActions] = useState([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', owner: '', due: '' })

  useEffect(() => {
    apiFetch('/api/actions/stats')
      .then(setStats)
      .catch(err => {
        console.error(err)
        setStats({ in_progress: 0, overdue: 0, due_this_week: 0, completed: 0 })
      })
    apiFetch('/api/actions')
      .then(setActions)
      .catch(err => {
        console.error(err)
        notify('Failed to load actions', 'error')
      })
  }, [])

  const filteredActions = actions.filter(a => 
    a.title?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase()) ||
    a.owner?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase())
  )

  function search() {
    apiFetch('/api/actions?q=' + encodeURIComponent(q))
      .then(setActions)
      .catch(err => {
        console.error(err)
        notify('Search failed', 'error')
      })
  }

  function submit(e) {
    e.preventDefault()
    apiFetch('/api/actions', {
      method: 'POST',
      body: JSON.stringify(form)
    })
      .then(newA => {
        setActions(prev => [newA, ...prev])
        setShowForm(false)
        setForm({ title: '', owner: '', due: '' })
        refreshStats()
        notify('Directive created', 'success')
      })
      .catch(err => {
        console.error(err)
        notify('Failed to create directive', 'error')
      })
  }

  function toggleStatus(a) {
    const nextStatus = a.status === 'completed' ? 'in_progress' : 'completed'
    apiFetch(`/api/actions/${a.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: nextStatus })
    })
      .then(updated => {
        setActions(prev => prev.map(x => x.id === a.id ? updated : x))
        refreshStats()
        notify(`Action marked as ${nextStatus.replace('_', ' ')}`, 'success')
      })
      .catch(err => {
        console.error(err)
        notify('Failed to update status', 'error')
      })
  }

  function deleteAction(id) {
    if (!confirm('Are you sure?')) return
    apiFetch(`/api/actions/${id}`, { method: 'DELETE' })
      .then(() => {
        setActions(prev => prev.filter(a => a.id !== id))
        refreshStats()
        notify('Action deleted', 'success')
      })
      .catch(err => {
        console.error(err)
        notify('Failed to delete action', 'error')
      })
  }

  function refreshStats() {
    apiFetch('/api/actions/stats')
      .then(setStats)
      .catch(err => console.error(err))
  }

  return (
    <div className="eaction-page">
      <div className="dashboard-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#e0f2fe' }}>⌛</div>
          <div>
            <div className="hub-label">IN PROGRESS</div>
            <div className="summary-val">{stats ? stats.in_progress : 0}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#fee2e2' }}>🔥</div>
          <div>
            <div className="hub-label">OVERDUE</div>
            <div className="summary-val">{stats ? stats.overdue : 0}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#e0f2fe' }}>📅</div>
          <div>
            <div className="hub-label">DUE THIS WEEK</div>
            <div className="summary-val">{stats ? stats.due_this_week : 0}</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#dcfce7' }}>✅</div>
          <div>
            <div className="hub-label">COMPLETED</div>
            <div className="summary-val">{stats ? stats.completed : 0}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="card-title">ACTIVE DECISIONS & ACTIONS</div>
            <span className="badge badge-pending">TOTAL: {actions.length}</span>
          </div>
          <div className="panel-controls">
            <input placeholder="Search tasks, projects..." value={q} onChange={e => setQ(e.target.value)} />
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ NEW DIRECTIVE</button>
            <button className="btn btn-outline">AUDIT REPORT</button>
          </div>
        </div>

        {showForm && (
          <form className="new-form" style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }} onSubmit={submit}>
            <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input placeholder="Owner" value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} />
            <input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} />
            <button className="btn btn-primary" type="submit">Create</button>
            <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        )}

        <div className="table-container">
          {filteredActions.length === 0 ? (
            <div className="empty">NO ACTIVE DIRECTIVES FOUND.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Directives / Projects</th>
                  <th>Ownership</th>
                  <th>Timeline</th>
                  <th>Current Status</th>
                  <th>Administrative</th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.map(a => (
                  <tr key={a.id} className={a.status === 'completed' ? 'row-completed' : ''}>
                    <td>{a.title}</td>
                    <td>{a.owner}</td>
                    <td>{a.due}</td>
                    <td>
                      <span className={`badge ${a.status}`}>{a.status.replace('_', ' ').toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => toggleStatus(a)}>
                          {a.status === 'completed' ? 'Undo' : 'Complete'}
                        </button>
                        <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }} onClick={() => deleteAction(a.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
