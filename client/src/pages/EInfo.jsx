import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { apiFetch } from '../utils/api'
import './EInfoEnhancements.css'
import './EInfoNewFeatures.css'
const CATEGORIES = ['All Documents', 'Draft Documents', 'Pending Approval', 'Secure Archive']

export default function EInfo({ searchQuery }) {
  const [docs, setDocs] = useState([])
  const [category, setCategory] = useState('All Documents')
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', priority: 'Low', category: 'All Documents', file: null });

  useEffect(() => {
    apiFetch('/api/documents')
      .then(setDocs)
      .catch(err => {
        console.error(err)
        setDocs([])
      })
  }, [])

  const filteredDocs = docs.filter(d => {
    const matchesCategory = category === 'All Documents' || d.category === category;
    const matchesSearch = 
      d.title?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase()) ||
      d.content?.toLowerCase().includes(((searchQuery || q) || '').toLowerCase());
    return matchesCategory && matchesSearch;
  })

function submit(e) {
  e.preventDefault();
  const data = new FormData();
  data.append('title', form.title);
  data.append('content', form.content);
  data.append('priority', form.priority);
  data.append('category', form.category);
  if (form.file) data.append('file', form.file);
  apiFetch('/api/documents', {
    method: 'POST',
    body: data
  })
    .then(newDoc => {
      setDocs(prev => [newDoc, ...prev]);
      setShowForm(false);
      setForm({ title: '', content: '', priority: 'Low', category: 'All Documents', file: null });
    })
    .catch(err => {
      console.error(err);
    });
}

  function deleteDoc(id) {
    if (!confirm('Are you sure?')) return
    apiFetch(`/api/documents/${id}`, { method: 'DELETE' })
      .then(() => setDocs(prev => prev.filter(d => d.id !== id)))
      .catch(err => console.error(err))
  }

  return (
    <div className="einfo-page">
      <div className="einfo-columns" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <div className="hub-label">CATEGORY</div>
            <ul className="doc-list" style={{ marginTop: '16px' }}>
              {CATEGORIES.map(c => (
                <li 
                  key={c} 
                  className={c === category ? 'active' : ''} 
                  onClick={() => setCategory(c)}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', padding: '12px', 
                    borderRadius: '8px', cursor: 'pointer', background: c === category ? 'rgba(108, 92, 231, 0.05)' : 'transparent',
                    color: c === category ? 'var(--primary)' : 'inherit', fontWeight: c === category ? 700 : 500
                  }}
                >
                  {c} <span className="badge badge-pending">{docs.filter(d => d.category === c).length}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <div className="hub-label">STRATEGIC INFORMATION</div>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li style={{ fontSize: '14px', display: 'flex', gap: '8px' }}>✅ The leader receives relevant information at the right time</li>
              <li style={{ fontSize: '14px', display: 'flex', gap: '8px' }}>✅ Standardized briefing notes and decision notes</li>
              <li style={{ fontSize: '14px', display: 'flex', gap: '8px' }}>✅ Filtering: the office proactively commissions necessary briefings</li>
            </ul>
          </div>
        </aside>

        <section className="card">
          <div className="card-header">
            <div className="card-title">RECENT DOCUMENTS</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                placeholder="Search notes..." 
                value={q} 
                onChange={e => setQ(e.target.value)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #eef2f7', background: '#f8fafc' }}
              />
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ NEW NOTE</button>
            </div>
          </div>

          <div className="recent-body">
            {showForm && (
              <form className="note-form" style={{ marginBottom: '24px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }} onSubmit={submit}>
                <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="note-input" />
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="priority-select">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="priority-select">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <textarea placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="note-textarea" />
                <input type="file" onChange={e => setForm({ ...form, file: e.target.files[0] })} className="file-input" />
                {showPreview && (
                  <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(form.content) }} />
                )}
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit">Create</button>
                  <button className="btn btn-outline" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="btn btn-outline" type="button" onClick={() => setShowPreview(prev => !prev)}>{showPreview ? 'Hide' : 'Preview'} Markdown</button>
                </div>
              </form>
            )}

            {!showForm && filteredDocs.length === 0 && (
              <div className="empty">No documents found. Click '+ New Note' to create one.</div>
            )}

            {!showForm && filteredDocs.length > 0 && (
                <ul className="doc-list">
                  {filteredDocs.map(d => (
                    <li key={d.id} className="doc-item">
                      <div className="doc-header">
                        <div className="doc-title">{d.title}</div>
                        <button className="btn-delete" onClick={() => deleteDoc(d.id)}>Delete</button>
                      </div>
                      <div className="doc-meta">{d.category} • {new Date(d.created).toLocaleDateString()}</div>
                      <div className="doc-content">{d.content}</div>
                    </li>
                  ))}
                </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
