import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { apiFetch } from '../utils/api'

const CATEGORIES = ['All Documents', 'Draft Documents', 'Pending Approval', 'Secure Archive']

const CAT_ICONS = {
  'All Documents': '📁',
  'Draft Documents': '✏️',
  'Pending Approval': '⏳',
  'Secure Archive': '🔒',
}

const PRIORITY_COLORS = {
  High: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'rgba(239,68,68,0.15)' },
  Medium: { bg: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
  Low: { bg: 'rgba(16,185,129,0.08)', color: '#10b981', border: 'rgba(16,185,129,0.15)' },
}

export default function EInfo({ searchQuery, notify }) {
  const [docs, setDocs] = useState([])
  const [category, setCategory] = useState('All Documents')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'Low', category: 'All Documents', file: null })

  useEffect(() => {
    apiFetch('/api/documents').then(setDocs).catch(() => setDocs([]))
  }, [])

  const filteredDocs = docs.filter(d => {
    const matchesCategory = category === 'All Documents' || d.category === category
    const matchesSearch = d.title?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase()) ||
      d.content?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase())
    return matchesCategory && matchesSearch
  })

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { notify && notify('Title is required', 'error'); return }
    setSubmitting(true)
    const data = new FormData()
    data.append('title', form.title)
    data.append('content', form.content)
    data.append('priority', form.priority)
    data.append('category', form.category)
    if (form.file) data.append('file', form.file)
    apiFetch('/api/documents', { method: 'POST', body: data })
      .then(newDoc => {
        setDocs(prev => [newDoc, ...prev])
        setShowForm(false)
        setShowPreview(false)
        setForm({ title: '', content: '', priority: 'Low', category: 'All Documents', file: null })
        notify && notify('Document created', 'success')
      })
      .catch(() => notify && notify('Failed to create document', 'error'))
      .finally(() => setSubmitting(false))
  }

  function deleteDoc(id) {
    if (!confirm('Delete this document?')) return
    apiFetch(`/api/documents/${id}`, { method: 'DELETE' })
      .then(() => {
        setDocs(prev => prev.filter(d => d.id !== id))
        notify && notify('Document deleted', 'success')
      })
      .catch(() => notify && notify('Failed to delete', 'error'))
  }

  return (
    <div className="einfo-page">
      {/* Page header */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="card-title">Strategic Information</div>
            <div className="card-subtitle">Briefing notes, decision docs, and secure archives</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder="Search documents…"
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ paddingLeft: '32px', width: '200px' }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Close' : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Document
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="einfo-layout">
        {/* Sidebar */}
        <aside className="einfo-sidebar-panel">
          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="section-label">Categories</div>
            <ul className="einfo-cat-list">
              {CATEGORIES.map(c => (
                <li
                  key={c}
                  className={`einfo-cat-item ${c === category ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{CAT_ICONS[c]}</span>
                    {c}
                  </span>
                  <span className="badge badge-pending" style={{ fontSize: '10px' }}>
                    {c === 'All Documents' ? docs.length : docs.filter(d => d.category === c).length}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="section-label">Quick Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Total Docs', val: docs.length, color: 'var(--primary)' },
                { label: 'Drafts', val: docs.filter(d => d.category === 'Draft Documents').length, color: 'var(--warning)' },
                { label: 'Pending', val: docs.filter(d => d.category === 'Pending Approval').length, color: '#f59e0b' },
                { label: 'Archived', val: docs.filter(d => d.category === 'Secure Archive').length, color: 'var(--success)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-title)', fontSize: '15px' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px', background: 'linear-gradient(140deg, #0f172a 0%, #1e2d50 100%)', borderColor: 'rgba(99,102,241,0.2)' }}>
            <div className="section-label" style={{ color: 'rgba(255,255,255,0.35)' }}>Key Principles</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '2px' }}>
              {[
                'Right information at the right time',
                'Standardized briefing notes',
                'Proactive filtering',
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                  <span style={{ color: '#10b981', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section>
          {/* Create form */}
          {showForm && (
            <div className="note-form-panel" style={{ marginBottom: '16px' }}>
              <div className="note-form-header">New Document</div>
              <form onSubmit={submit}>
                <div className="note-form-body">
                  <div className="form-group">
                    <label>Title <span className="req">*</span></label>
                    <input
                      placeholder="Document title…"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Priority</label>
                      <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Content (Markdown supported)</label>
                    <textarea
                      placeholder="Write your document content here… Markdown is supported."
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                      style={{ minHeight: '120px' }}
                    />
                  </div>
                  {showPreview && form.content && (
                    <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(form.content) }} />
                  )}
                  <div className="form-group">
                    <label>Attach File (optional)</label>
                    <input type="file" onChange={e => setForm({ ...form, file: e.target.files[0] })} />
                  </div>
                </div>
                <div className="note-form-actions">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? <><span className="btn-spinner" /> Saving…</> : 'Create Document'}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPreview(v => !v)}>
                    {showPreview ? 'Hide Preview' : 'Preview MD'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setShowPreview(false) }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Doc cards */}
          {filteredDocs.length === 0 ? (
            <div className="card">
              <div className="empty">
                {docs.length === 0
                  ? 'No documents yet. Click "New Document" to create one.'
                  : 'No documents match your search or filter.'}
              </div>
            </div>
          ) : (
            <div className="doc-cards-grid">
              {filteredDocs.map(d => {
                const pc = PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.Low
                return (
                  <div key={d.id} className="doc-card">
                    <div className="doc-card-header">
                      <div className="doc-card-title">{d.title}</div>
                      <button
                        className="btn btn-xs btn-danger"
                        onClick={() => deleteDoc(d.id)}
                        title="Delete"
                        style={{ flexShrink: 0 }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                    {d.content && (
                      <div className="doc-card-content">{d.content}</div>
                    )}
                    <div className="doc-card-footer">
                      <span className="doc-card-date">
                        {new Date(d.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <span
                          className="badge"
                          style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, fontSize: '10px' }}
                        >
                          {d.priority || 'Low'}
                        </span>
                        {d.category && d.category !== 'All Documents' && (
                          <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                            {d.category.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
