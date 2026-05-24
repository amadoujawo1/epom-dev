import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

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
  const { t } = useLanguage()
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
      .catch(err => { 
        setPeople([]); 
        notify(err.message || 'Failed to load personnel', 'error') 
      })
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
      .catch(err => notify(err.message || (editingId ? 'Failed to update' : 'Failed to add'), 'error'))
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
      {/* ── Main Container ── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', borderRadius: '24px' }}>
        {/* Header Section */}
        <div style={{ padding: '32px 32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>
              {t('page_personnel')}
            </h2>
            <span style={{ background: '#0f172a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: 'var(--fs-xs)', fontWeight: 800 }}>
              TOTAL: {people.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="search-container" style={{ maxWidth: '320px', margin: 0 }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                placeholder={t('search_placeholder')} 
                value={searchQuery || ''} 
                readOnly
                style={{ background: '#f8fafc', borderRadius: '12px', height: '48px', paddingLeft: '44px', border: '1px solid #e2e8f0', fontSize: 'var(--fs-sm)' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => openForm()}
                style={{ borderRadius: '12px', height: '48px', padding: '0 24px', fontWeight: 700, fontSize: 'var(--fs-xs)', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', boxShadow: '0 4px 14px rgba(88, 66, 255, 0.25)' }}
              >
                <span style={{ fontSize: 'var(--fs-xl)' }}>+</span> ADD PERSONNEL
              </button>
            </div>
          </div>
        </div>

        {/* ── Table / empty / loading ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="loading-spinner-lg" style={{ margin: '0 auto 16px' }} />
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>Loading personnel…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 'var(--fs-md)', fontWeight: 600, letterSpacing: '0.5px' }}>
            {people.length === 0 ? 'NO PERSONNEL RECORDS FOUND.' : 'NO RESULTS MATCH YOUR SEARCH.'}
          </div>
        ) : (
          <div style={{ padding: '0 0 32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Employee', 'Username', 'Department', 'Role', 'Status', 'Actions'].map(col => (
                    <th key={col} style={{ padding: '16px 32px', fontSize: 'var(--fs-xs)', fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="action-row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', opacity: p.status === 'Inactive' ? 0.6 : 1 }}>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="avatar" style={{ width: '36px', height: '36px', fontSize: 'var(--fs-sm)', background: avatarGradient(p.name) }}>
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--fs-md)' }}>{p.name}</div>
                          <div style={{ fontSize: 'var(--fs-xs)', color: '#94a3b8' }}>{p.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '20px 32px' }}>
                      <span style={{ fontWeight: 600, color: '#64748b', fontSize: 'var(--fs-sm)' }}>@{p.username}</span>
                    </td>

                    <td style={{ padding: '20px 32px', color: '#334155', fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                      {p.department || '—'}
                    </td>

                    <td style={{ padding: '20px 32px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        background: '#f1f5f9', 
                        color: '#475569',
                        textTransform: 'uppercase'
                      }}>
                        {p.role || 'User'}
                      </span>
                    </td>

                    <td style={{ padding: '20px 32px' }}>
                      <span 
                        onClick={() => toggleStatus(p)}
                        style={{ 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          fontSize: 'var(--fs-xs)', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          background: p.status === 'Active' ? '#ecfdf5' : '#fff1f2',
                          color: p.status === 'Active' ? '#10b981' : '#f43f5e',
                          border: `1px solid ${p.status === 'Active' ? '#d1fae5' : '#ffe4e6'}`,
                          cursor: 'pointer'
                        }}
                      >
                        {p.status || 'Active'}
                      </span>
                    </td>

                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="ctrl-btn" onClick={() => openForm(p)} title="Edit" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px' }}>
                          ✏️
                        </button>
                        <button className="ctrl-btn" style={{ color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', padding: '6px' }} onClick={() => deletePerson(p.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

                  <div className="field-group field-group--full">
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
