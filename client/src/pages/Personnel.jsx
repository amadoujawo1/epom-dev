import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
}

const AVATAR_COLORS = [
  ['#6366f1', '#4f46e5'], ['#10b981', '#059669'], ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'], ['#8b5cf6', '#7c3aed'], ['#06b6d4', '#0891b2'],
]

function avatarGradient(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length || 0
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`
}

export default function Personnel({ searchQuery, notify }) {
  const [people, setPeople]     = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '', username: '', email: '', department: '', role: '', status: 'Active',
    password: '', confirmPassword: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadPersonnel() }, [])

  function loadPersonnel() {
    setLoading(true)
    apiFetch('/api/personnel')
      .then(setPeople)
      .catch(() => { setPeople([]); notify('Failed to load personnel', 'error') })
      .finally(() => setLoading(false))
  }

  const filtered = people.filter(p =>
    [p.name, p.username, p.department, p.role, p.email].some(v =>
      v?.toLowerCase().includes((searchQuery || '').toLowerCase())
    )
  )

  const stats = {
    total: people.length,
    active: people.filter(p => p.status === 'Active' || !p.status).length,
    inactive: people.filter(p => p.status === 'Inactive').length,
  }

  function openForm(person = null) {
    if (person) {
      setEditingId(person.id)
      setForm({
        name: person.name || '',
        username: person.username || '',
        email: person.email || '',
        department: person.department || '',
        role: person.role || '',
        status: person.status || 'Active',
        password: '',
        confirmPassword: '',
      })
    } else {
      setEditingId(null)
      setForm({
        name: '', username: '', email: '', department: '', role: '', status: 'Active',
        password: '', confirmPassword: '',
      })
    }
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditingId(null) }

  function submit(e) {
    e.preventDefault()
    const { password, confirmPassword, ...fields } = form

    const username = (fields.username || '').trim().toLowerCase()
    if (!username) {
      notify('Username is required', 'error')
      return
    }
    if (username.length < 3) {
      notify('Username must be at least 3 characters', 'error')
      return
    }

    if (!editingId) {
      if (!password) {
        notify('Password is required', 'error')
        return
      }
      if (password.length < 6) {
        notify('Password must be at least 6 characters', 'error')
        return
      }
    }

    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        notify('Passwords do not match', 'error')
        return
      }
      if (password.length < 6) {
        notify('Password must be at least 6 characters', 'error')
        return
      }
    }

    const payload = { ...fields, username }
    if (password) payload.password = password

    setSubmitting(true)
    const method = editingId ? 'PUT' : 'POST'
    const url    = editingId ? `/api/personnel/${editingId}` : '/api/personnel'
    apiFetch(url, { method, body: JSON.stringify(payload) })
      .then(p => {
        setPeople(prev => editingId ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev])
        notify(editingId ? 'Personnel updated' : 'Personnel added', 'success')
        closeForm()
      })
      .catch(() => notify(editingId ? 'Failed to update' : 'Failed to add', 'error'))
      .finally(() => setSubmitting(false))
  }

  function toggleStatus(person) {
    const newStatus = person.status === 'Active' ? 'Inactive' : 'Active'
    apiFetch(`/api/personnel/${person.id}`, { method: 'PUT', body: JSON.stringify({ ...person, status: newStatus }) })
      .then(p => { setPeople(prev => prev.map(x => x.id === p.id ? p : x)); notify(`Marked ${newStatus}`, 'success') })
      .catch(() => notify('Failed to update status', 'error'))
  }

  function deletePerson(id) {
    if (!confirm('Delete this personnel record?')) return
    apiFetch(`/api/personnel/${id}`, { method: 'DELETE' })
      .then(() => { setPeople(prev => prev.filter(p => p.id !== id)); notify('Personnel deleted', 'success') })
      .catch(() => notify('Failed to delete', 'error'))
  }

  return (
    <div className="personnel-page">
      {/* ── Header card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="personnel-header">
          <div>
            <div className="card-title">Personnel Management</div>
            <p className="personnel-subtitle">Administrative control over user roles, access, and org hierarchy.</p>
          </div>
          <button className="btn btn-primary" onClick={() => openForm()}>
            <span>＋</span> Add Personnel
          </button>
        </div>

        <div className="personnel-stats-row">
          <div className="pstat-card pstat-total">
            <div className="pstat-num">{stats.total}</div>
            <div className="pstat-label">👥 Total</div>
          </div>
          <div className="pstat-card pstat-active">
            <div className="pstat-num">{stats.active}</div>
            <div className="pstat-label">✅ Active</div>
          </div>
          <div className="pstat-card pstat-inactive">
            <div className="pstat-num">{stats.inactive}</div>
            <div className="pstat-label">⛔ Inactive</div>
          </div>
        </div>
      </div>

      {/* ── Table / empty / loading ── */}
      {loading ? (
        <div className="card personnel-loading">
          <div className="loading-spinner-lg" />
          <span>Loading personnel…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card personnel-empty">
          <div className="empty-icon">👤</div>
          <div className="empty-title">{people.length === 0 ? 'No personnel yet' : 'No results found'}</div>
          <div className="empty-sub">
            {people.length === 0
              ? 'Start by adding the first team member.'
              : 'Try adjusting your search.'}
          </div>
          {people.length === 0 && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openForm()}>
              Add First Personnel
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Username</th>
                <th>Contact</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ opacity: p.status === 'Inactive' ? 0.65 : 1 }}>
                  <td>
                    <div className="employee-cell">
                      <div className="emp-avatar" style={{ background: avatarGradient(p.name) }}>
                        {getInitials(p.name)}
                      </div>
                      <span className="emp-name">{p.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="personnel-username">{p.username ? `@${p.username}` : '—'}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email || '—'}</td>
                  <td>{p.department || '—'}</td>
                  <td>
                    <span className="role-pill">{p.role || 'User'}</span>
                  </td>
                  <td>
                    <span
                      className={`badge ${p.status === 'Active' ? 'badge-success' : 'badge-error'}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleStatus(p)}
                      title="Click to toggle"
                    >
                      {p.status || 'Active'}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="tbl-btn tbl-edit" onClick={() => openForm(p)}>✏️ Edit</button>
                      <button className="tbl-btn tbl-del" onClick={() => deletePerson(p.id)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Premium Modal ── */}
      {showForm && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="personnel-modal" onClick={e => e.stopPropagation()}>

            {/* Modal header gradient bar */}
            <div className="modal-header-bar">
              <div className="modal-header-content">
                <div className="modal-header-icon">
                  {editingId ? '✏️' : '➕'}
                </div>
                <div>
                  <div className="modal-title">{editingId ? 'Edit Personnel' : 'Add New Personnel'}</div>
                  <div className="modal-subtitle">{editingId ? 'Update personnel record details' : 'Register a new team member'}</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={closeForm} type="button">✕</button>
            </div>

            <form onSubmit={submit} className="modal-body personnel-modal-form">

              <div className="personnel-modal-scroll">
                <div className="avatar-preview-row">
                  <div
                    className="modal-avatar"
                    style={{ background: form.name ? avatarGradient(form.name) : 'var(--border-color)' }}
                  >
                    {form.name ? getInitials(form.name) : '?'}
                  </div>
                  <div className="avatar-preview-info">
                    <div className="avatar-preview-name">{form.name || 'Full name here'}</div>
                    <div className="avatar-preview-role">
                      @{form.username || 'username'} · {form.role || 'Role'} · {form.department || 'Department'}
                    </div>
                  </div>
                </div>

                <div className="modal-form-grid">

                  <div className="modal-section-label">Profile</div>

                  <div className="field-group">
                    <div className="field-icon">👤</div>
                    <div className="field-inner">
                      <label className="field-label">Full Name <span className="req">*</span></label>
                      <input
                        className="field-input"
                        placeholder="e.g. Jane Doe"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="field-icon">@</div>
                    <div className="field-inner">
                      <label className="field-label">Username <span className="req">*</span></label>
                      <input
                        className="field-input"
                        placeholder="e.g. jane.doe"
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })}
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="field-group field-group--full">
                    <div className="field-icon">✉️</div>
                    <div className="field-inner">
                      <label className="field-label">Email Address</label>
                      <input
                        className="field-input"
                        type="email"
                        placeholder="name@organization.gov"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="modal-section-label">Role &amp; Access</div>

                  <div className="field-group">
                    <div className="field-icon">🏢</div>
                    <div className="field-inner">
                      <label className="field-label">Department</label>
                      <input
                        className="field-input"
                        placeholder="e.g. Operations"
                        value={form.department}
                        onChange={e => setForm({ ...form, department: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="field-icon">🎖️</div>
                    <div className="field-inner">
                      <label className="field-label">Role / Title</label>
                      <input
                        className="field-input"
                        placeholder="e.g. Analyst"
                        value={form.role}
                        onChange={e => setForm({ ...form, role: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="field-icon">🔒</div>
                    <div className="field-inner">
                      <label className="field-label">
                        Password {!editingId && <span className="req">*</span>}
                      </label>
                      <input
                        className="field-input"
                        type="password"
                        placeholder={editingId ? 'Unchanged if blank' : 'Min. 6 characters'}
                        value={form.password}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        required={!editingId}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <div className="field-icon">🔒</div>
                    <div className="field-inner">
                      <label className="field-label">
                        Confirm Password {!editingId && <span className="req">*</span>}
                      </label>
                      <input
                        className="field-input"
                        type="password"
                        placeholder={editingId ? 'Unchanged if blank' : 'Re-enter password'}
                        value={form.confirmPassword}
                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                        required={!editingId}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="field-group field-group--status">
                    <div className="field-icon">🔆</div>
                    <div className="field-inner">
                      <label className="field-label">Status</label>
                      <div className="status-toggle-group">
                        {['Active', 'Inactive'].map(s => (
                          <button
                            key={s}
                            type="button"
                            className={`status-pill ${form.status === s ? (s === 'Active' ? 'pill-active' : 'pill-inactive') : 'pill-off'}`}
                            onClick={() => setForm({ ...form, status: s })}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? <><span className="btn-spinner" /> Saving…</>
                    : editingId ? '💾 Update Record' : '✚ Create Record'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
