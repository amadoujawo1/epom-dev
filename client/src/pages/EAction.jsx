import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'

export default function EAction({ searchQuery, notify }) {
  const { t } = useLanguage()
  const [stats, setStats] = useState(null)
  const [actions, setActions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', owner: '', due: '', priority: 'medium' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadAll() }, [])

  function loadAll() {
    apiFetch('/api/actions/stats').then(setStats).catch(() =>
      setStats({ in_progress: 0, overdue: 0, due_this_week: 0, completed: 0, pending: 0 })
    )
    apiFetch('/api/actions').then(setActions).catch(() => {
      setActions([])
      notify && notify(t('failed_load_actions'), 'error')
    })
  }

  function refreshStats() {
    apiFetch('/api/actions/stats').then(setStats).catch(() => {})
  }

  const q = (searchQuery || '').toLowerCase()
  const filtered = actions.filter(a =>
    a.title?.toLowerCase().includes(q) || a.owner?.toLowerCase().includes(q)
  )

  const inProgress = filtered.filter(a => a.status === 'in_progress' || a.status === 'pending')
  const overdue = filtered.filter(a => a.status === 'overdue')
  const completed = filtered.filter(a => a.status === 'completed')

  function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) { notify && notify(t('title_required'), 'error'); return }
    setSubmitting(true)
    apiFetch('/api/actions', { method: 'POST', body: JSON.stringify(form) })
      .then(newA => {
        setActions(prev => [newA, ...prev])
        setShowForm(false)
        setForm({ title: '', owner: '', due: '', priority: 'medium' })
        refreshStats()
        notify && notify(t('directive_created'), 'success')
      })
      .catch(() => notify && notify(t('failed_create'), 'error'))
      .finally(() => setSubmitting(false))
  }

  function toggleStatus(a) {
    const nextStatus = a.status === 'completed' ? 'in_progress' : 'completed'
    apiFetch(`/api/actions/${a.id}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) })
      .then(updated => {
        setActions(prev => prev.map(x => x.id === a.id ? updated : x))
        refreshStats()
        notify && notify(t('directive_created'), 'success')
      })
      .catch(() => notify && notify(t('failed_update'), 'error'))
  }

  function deleteAction(id) {
    if (!confirm(t('delete_directive_confirm'))) return
    apiFetch(`/api/actions/${id}`, { method: 'DELETE' })
      .then(() => {
        setActions(prev => prev.filter(a => a.id !== id))
        refreshStats()
        notify && notify(t('directive_deleted'), 'success')
      })
      .catch(() => notify && notify(t('failed_delete'), 'error'))
  }

  const STAT_CARDS = [
    { labelKey: 'stat_in_progress', val: stats?.in_progress ?? 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '⏳' },
    { labelKey: 'stat_overdue', val: stats?.overdue ?? 0, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '🔥' },
    { labelKey: 'stat_due_week', val: stats?.due_this_week ?? 0, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: '📅' },
    { labelKey: 'stat_completed', val: stats?.completed ?? 0, color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '✅' },
  ]

  return (
    <div className="eaction-page">
      {/* Stats row */}
      <div className="dashboard-summary">
        {STAT_CARDS.map(({ labelKey, val, color, bg, icon }) => (
          <div key={labelKey} className="summary-card">
            <div className="summary-icon" style={{ background: bg }}>
              <span style={{ fontSize: '20px' }}>{icon}</span>
            </div>
            <div className="summary-info">
              <span className="summary-label">{t(labelKey)}</span>
              <div className="summary-val" style={{ color }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div className="card-title">{t('eaction_title')}</div>
            <div className="card-subtitle">{t('eaction_sub')}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={loadAll}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              {t('refresh')}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t('new_directive')}
            </button>
          </div>
        </div>
      </div>

      {/* New Directive Form */}
      {showForm && (
        <div className="note-form-panel">
          <div className="note-form-header">
            <span>{t('new_directive')}</span>
          </div>
          <form onSubmit={submit}>
            <div className="note-form-body">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('title')} <span className="req">*</span></label>
                  <input
                    placeholder={t('directive_title_placeholder')}
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('owner')}</label>
                  <input
                    placeholder={t('owner_placeholder')}
                    value={form.owner}
                    onChange={e => setForm({ ...form, owner: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('due_date')}</label>
                  <input
                    type="date"
                    value={form.due}
                    onChange={e => setForm({ ...form, due: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>{t('priority')}</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">{t('priority_low')}</option>
                    <option value="medium">{t('priority_medium')}</option>
                    <option value="high">{t('priority_high')}</option>
                    <option value="critical">{t('priority_critical')}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="note-form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? <><span className="btn-spinner" /> {t('creating')}</> : t('create_directive')}
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        <KanbanCol title={t('col_in_progress')} color="#f59e0b" actions={inProgress} onToggle={toggleStatus} onDelete={deleteAction} t={t} />
        <KanbanCol title={t('col_overdue')} color="#ef4444" actions={overdue} onToggle={toggleStatus} onDelete={deleteAction} t={t} />
        <KanbanCol title={t('col_completed')} color="#10b981" actions={completed} onToggle={toggleStatus} onDelete={deleteAction} isCompleted t={t} />
      </div>
    </div>
  )
}

function KanbanCol({ title, color, actions, onToggle, onDelete, isCompleted, t }) {
  return (
    <div className="kanban-col">
      <div className="kanban-col-header">
        <span className="kanban-col-dot" style={{ background: color }} />
        <span className="kanban-col-title">{title}</span>
        <span className="kanban-col-count">{actions.length}</span>
      </div>
      <div className="kanban-col-body">
        {actions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            {t('no_items')}
          </div>
        ) : (
          actions.map(a => <ActionCard key={a.id} action={a} onToggle={onToggle} onDelete={onDelete} isCompleted={isCompleted} t={t} />)
        )}
      </div>
    </div>
  )
}

function ActionCard({ action: a, onToggle, onDelete, isCompleted, t }) {
  const isOverdue = a.due && new Date(a.due) < new Date() && a.status !== 'completed'
  return (
    <div className={`action-card ${isCompleted ? 'completed' : ''}`}>
      <div className="action-card-title">{a.title}</div>
      <div className="action-card-meta">
        {a.owner && (
          <span className="action-meta-chip">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {a.owner}
          </span>
        )}
        {a.due && (
          <span className="action-meta-chip" style={{ color: isOverdue ? 'var(--error)' : 'var(--text-muted)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {a.due}
          </span>
        )}
        {a.priority && (
          <span className={`badge ${getPriorityBadge(a.priority)}`}>{a.priority}</span>
        )}
      </div>
      <div className="action-card-footer">
        <button className="btn btn-xs btn-outline" onClick={() => onToggle(a)} style={{ flex: 1 }}>
          {isCompleted ? t('reopen') : t('complete')}
        </button>
        <button className="btn btn-xs btn-danger" onClick={() => onDelete(a.id)}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
      </div>
    </div>
  )
}

function getPriorityBadge(p) {
  const map = { low: 'badge-success', medium: 'badge-pending', high: 'badge-warning', critical: 'badge-error' }
  return map[p?.toLowerCase()] || 'badge-pending'
}
