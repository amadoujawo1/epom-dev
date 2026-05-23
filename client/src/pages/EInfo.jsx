import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { apiFetch } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

export default function EInfo({ searchQuery, notify }) {
  const { t } = useLanguage()

  const CATEGORIES_KEYS = [
    { key: 'cat_all',     dbVal: 'All Documents' },
    { key: 'cat_draft',   dbVal: 'Draft Documents' },
    { key: 'cat_pending', dbVal: 'Pending Approval' },
    { key: 'cat_archive', dbVal: 'Secure Archive' },
  ]
  const CAT_ICONS = {
    cat_all:     '📁',
    cat_draft:   '✏️',
    cat_pending: '⏳',
    cat_archive: '🔒',
  }
  const PRIORITY_COLORS = {
    High:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', border: 'rgba(239,68,68,0.15)' },
    Medium: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
    Low:    { bg: 'rgba(16,185,129,0.08)',  color: '#10b981', border: 'rgba(16,185,129,0.15)' },
  }

  const [docs, setDocs] = useState([])
  const [categoryKey, setCategoryKey] = useState('cat_all')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', priority: 'Low', category: 'All Documents', file: null })

  useEffect(() => {
    apiFetch('/api/documents').then(setDocs).catch(() => setDocs([]))
  }, [])

  const activeCatDbVal = CATEGORIES_KEYS.find(c => c.key === categoryKey)?.dbVal || 'All Documents'

  const filteredDocs = docs.filter(d => {
    const matchesCategory = categoryKey === 'cat_all' || d.category === activeCatDbVal
    const matchesSearch = d.title?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase()) ||
      d.content?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase())
    return matchesCategory && matchesSearch
  })

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { notify && notify(t('title_required'), 'error'); return }
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
        notify && notify(t('doc_created'), 'success')
      })
      .catch(() => notify && notify(t('failed_create_doc'), 'error'))
      .finally(() => setSubmitting(false))
  }

  function deleteDoc(id) {
    if (!confirm(t('delete_doc_confirm'))) return
    apiFetch(`/api/documents/${id}`, { method: 'DELETE' })
      .then(() => {
        setDocs(prev => prev.filter(d => d.id !== id))
        notify && notify(t('doc_deleted'), 'success')
      })
      .catch(() => notify && notify(t('failed_delete_doc'), 'error'))
  }

  return (
    <div className="einfo-page">
      {/* Page header */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="card-title">{t('einfo_title')}</div>
            <div className="card-subtitle">{t('einfo_sub')}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder={t('search_docs')}
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ paddingLeft: '32px', width: '200px' }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(v => !v)}>
              {showForm ? `✕ ${t('close')}` : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {t('new_document')}
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
            <div className="section-label">{t('categories')}</div>
            <ul className="einfo-cat-list">
              {CATEGORIES_KEYS.map(({ key, dbVal }) => (
                <li
                  key={key}
                  className={`einfo-cat-item ${key === categoryKey ? 'active' : ''}`}
                  onClick={() => setCategoryKey(key)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{CAT_ICONS[key]}</span>
                    {t(key)}
                  </span>
                  <span className="badge badge-pending" style={{ fontSize: '10px' }}>
                    {key === 'cat_all' ? docs.length : docs.filter(d => d.category === dbVal).length}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card" style={{ padding: '14px 16px' }}>
            <div className="section-label">{t('quick_stats')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { labelKey: 'stat_total_docs', val: docs.length, color: 'var(--primary)' },
                { labelKey: 'stat_drafts', val: docs.filter(d => d.category === 'Draft Documents').length, color: 'var(--warning)' },
                { labelKey: 'stat_pending', val: docs.filter(d => d.category === 'Pending Approval').length, color: '#f59e0b' },
                { labelKey: 'stat_archived', val: docs.filter(d => d.category === 'Secure Archive').length, color: 'var(--success)' },
              ].map(({ labelKey, val, color }) => (
                <div key={labelKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t(labelKey)}</span>
                  <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-title)', fontSize: '15px' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 16px', background: 'linear-gradient(140deg, #0f172a 0%, #1e2d50 100%)', borderColor: 'rgba(99,102,241,0.2)' }}>
            <div className="section-label" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('key_principles')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '2px' }}>
              {['principle_1', 'principle_2', 'principle_3'].map((key) => (
                <div key={key} style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                  <span style={{ color: '#10b981', marginTop: '1px', flexShrink: 0 }}>✓</span>
                  {t(key)}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <section>
          {showForm && (
            <div className="note-form-panel" style={{ marginBottom: '16px' }}>
              <div className="note-form-header">{t('new_document')}</div>
              <form onSubmit={submit}>
                <div className="note-form-body">
                  <div className="form-group">
                    <label>{t('title')} <span className="req">*</span></label>
                    <input
                      placeholder={t('doc_title_placeholder')}
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{t('priority')}</label>
                      <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                        <option>{t('priority_low')}</option>
                        <option>{t('priority_medium')}</option>
                        <option>{t('priority_high')}</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{t('category')}</label>
                      <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                        {CATEGORIES_KEYS.map(({ key, dbVal }) => (
                          <option key={key} value={dbVal}>{t(key)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{t('doc_content_label')}</label>
                    <textarea
                      placeholder={t('doc_content_placeholder')}
                      value={form.content}
                      onChange={e => setForm({ ...form, content: e.target.value })}
                      style={{ minHeight: '120px' }}
                    />
                  </div>
                  {showPreview && form.content && (
                    <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(form.content) }} />
                  )}
                  <div className="form-group">
                    <label>{t('attach_file')}</label>
                    <input type="file" onChange={e => setForm({ ...form, file: e.target.files[0] })} />
                  </div>
                </div>
                <div className="note-form-actions">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? <><span className="btn-spinner" /> {t('saving')}</> : t('create_document')}
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPreview(v => !v)}>
                    {showPreview ? t('hide_preview') : t('preview_md')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowForm(false); setShowPreview(false) }}>{t('cancel')}</button>
                </div>
              </form>
            </div>
          )}

          {filteredDocs.length === 0 ? (
            <div className="card">
              <div className="empty">
                {docs.length === 0 ? t('no_docs_yet') : t('no_docs_filter')}
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
                      <button className="btn btn-xs btn-danger" onClick={() => deleteDoc(d.id)} title={t('delete')} style={{ flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                    {d.content && <div className="doc-card-content">{d.content}</div>}
                    <div className="doc-card-footer">
                      <span className="doc-card-date">
                        {new Date(d.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <span className="badge" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, fontSize: '10px' }}>
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
