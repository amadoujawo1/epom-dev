import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'
import { useLanguage } from '../context/LanguageContext'
import DirectiveModal from '../components/DirectiveModal'

export default function EAction({ searchQuery, notify }) {
  const { t } = useLanguage()
  const [stats, setStats] = useState(null)
  const [actions, setActions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [localSearch, setLocalSearch] = useState('')

  // Current user info for access control
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()
  const isAdmin = user?.role === 'Admin'

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

  function fetchReport() {
    apiFetch('/api/actions/report')
      .then(data => {
        setReportData(data)
        setShowReport(true)
      })
      .catch(() => notify && notify(t('failed_generate_report'), 'error'))
  }

  function refreshStats() {
    apiFetch('/api/actions/stats').then(setStats).catch(() => {})
  }

  const q = (searchQuery || localSearch || '').toLowerCase()
  const filtered = actions.filter(a =>
    (a.title || '').toLowerCase().includes(q) || 
    (a.owner || '').toLowerCase().includes(q) || 
    (a.project_name || '').toLowerCase().includes(q)
  )

  function handleSaveDirective(formData) {
    setSubmitting(true)
    apiFetch('/api/actions', { method: 'POST', body: JSON.stringify(formData) })
      .then(newA => {
        setActions(prev => [newA, ...prev])
        setShowForm(false)
        refreshStats()
        notify && notify(t('directive_created'), 'success')
      })
      .catch(() => notify && notify(t('failed_create'), 'error'))
      .finally(() => setSubmitting(false))
  }

  function toggleStatus(a) {
    const nextStatus = (a.status === 'Completed' || a.status === 'completed') ? 'In Progress' : 'Completed'
    apiFetch(`/api/actions/${a.id}`, { method: 'PUT', body: JSON.stringify({ status: nextStatus }) })
      .then(updated => {
        setActions(prev => prev.map(x => x.id === a.id ? updated : x))
        refreshStats()
        notify && notify(t('directive_updated'), 'success')
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
    { labelKey: 'stat_in_progress', val: stats?.in_progress ?? 0, color: '#0f172a', bg: '#fff', icon: '⌛' },
    { labelKey: 'stat_overdue', val: stats?.overdue ?? 0, color: '#ef4444', bg: '#fff', icon: '🔥' },
    { labelKey: 'stat_due_week', val: stats?.due_this_week ?? 0, color: '#6366f1', bg: '#fff', icon: '🗓️' },
    { labelKey: 'stat_completed', val: stats?.completed ?? 0, color: '#10b981', bg: '#fff', icon: '✅' },
  ]

  return (
    <div className="eaction-page">
      {/* Stats row */}
      <div className="dashboard-summary" style={{ marginBottom: '24px' }}>
        {STAT_CARDS.map(({ labelKey, val, color, bg, icon }) => (
          <div key={labelKey} className="summary-card" style={{ background: bg, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: 'none', padding: '24px' }}>
            <div className="summary-icon" style={{ background: 'transparent', fontSize: '24px' }}>
              <span>{icon}</span>
            </div>
            <div className="summary-info">
              <span className="summary-label" style={{ fontSize: 'var(--fs-xs)', letterSpacing: '0.8px', color: '#94a3b8' }}>{t(labelKey).toUpperCase()}</span>
              <div className="summary-val" style={{ color: '#0f172a', fontSize: 'var(--fs-4xl)', fontWeight: 800 }}>{val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', borderRadius: '24px' }}>
        {/* Header Section */}
        <div style={{ padding: '32px 32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: 'var(--fs-2xl)', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.2px' }}>
              {t('active_decisions_actions')}
            </h2>
            <span style={{ background: '#0f172a', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: 'var(--fs-xs)', fontWeight: 800 }}>
              TOTAL: {actions.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="search-container" style={{ maxWidth: '320px', margin: 0 }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input 
                placeholder={t('search_tasks_projects')} 
                value={searchQuery || localSearch} 
                onChange={e => setLocalSearch(e.target.value)} 
                style={{ background: '#f8fafc', borderRadius: '12px', height: '48px', paddingLeft: '44px', border: '1px solid #e2e8f0', fontSize: 'var(--fs-sm)' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowForm(true)}
                style={{ borderRadius: '12px', height: '48px', padding: '0 24px', fontWeight: 700, fontSize: 'var(--fs-xs)', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', boxShadow: '0 4px 14px rgba(88, 66, 255, 0.25)' }}
              >
                <span style={{ fontSize: 'var(--fs-xl)' }}>+</span> {t('new_directive').toUpperCase()}
              </button>

              <button 
                className="btn" 
                onClick={fetchReport}
                style={{ background: '#fff', color: '#0f172a', borderRadius: '12px', height: '48px', padding: '0 24px', fontWeight: 700, fontSize: 'var(--fs-xs)', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                {t('audit_report').toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        {/* List Header & Body */}
        <div style={{ padding: '0 0 32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#fafbfc', borderBottom: '1px solid #f1f5f9' }}>
                {['directives_projects', 'ownership', 'timeline', 'current_status', 'administrative'].map(col => (
                  <th key={col} style={{ padding: '16px 32px', fontSize: 'var(--fs-xs)', fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {t(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8', fontSize: 'var(--fs-md)', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {t('no_active_directives_found').toUpperCase()}
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const isCompleted = a.status?.toLowerCase() === 'completed';
                  const canModify = isAdmin || (user?.id === a.assigned_to);

                  return (
                    <tr key={a.id} className="action-row-hover" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 'var(--fs-md)', marginBottom: '4px', textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>{a.title}</div>
                        <div style={{ fontSize: 'var(--fs-sm)', color: '#94a3b8' }}>{a.project_name || 'General Operations'}</div>
                      </td>
                      
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="avatar" style={{ width: '28px', height: '28px', fontSize: 'var(--fs-2xs)', background: 'var(--primary-light)', color: 'var(--primary-main)' }}>{(a.owner || 'U').slice(0, 2).toUpperCase()}</div>
                          <span style={{ fontWeight: 600, color: '#334155', fontSize: 'var(--fs-sm)' }}>{a.owner || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '20px 32px', color: '#64748b', fontSize: 'var(--fs-sm)', fontWeight: 500 }}>
                        {a.due ? new Date(a.due).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                      </td>

                      <td style={{ padding: '20px 32px' }}>
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          fontSize: 'var(--fs-xs)', 
                          fontWeight: 700, 
                          textTransform: 'uppercase',
                          background: isCompleted ? '#ecfdf5' : '#fff7ed',
                          color: isCompleted ? '#10b981' : '#f59e0b',
                          border: `1px solid ${isCompleted ? '#d1fae5' : '#ffedd5'}`
                        }}>
                          {a.status}
                        </span>
                      </td>

                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="ctrl-btn" 
                            onClick={() => canModify && toggleStatus(a)} 
                            title={!canModify ? t('unauthorized_complete') : (isCompleted ? t('reopen') : t('complete'))}
                            disabled={!canModify}
                            style={{ 
                              border: '1px solid #e2e8f0', 
                              borderRadius: '8px', 
                              padding: '6px',
                              opacity: canModify ? 1 : 0.4,
                              cursor: canModify ? 'pointer' : 'not-allowed'
                            }}
                          >
                            {isCompleted ? '↩️' : '✅'}
                          </button>
                          {isAdmin && (
                            <button className="ctrl-btn" style={{ color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', padding: '6px' }} onClick={() => deleteAction(a.id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DirectiveModal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        onSave={handleSaveDirective}
        submitting={submitting}
      />

      {/* Exception Report Modal */}
      {showReport && reportData && (
        <div className="modal-backdrop" onClick={() => setShowReport(false)}>
          <div className="modal-panel" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📉 {t('exception_report')}</div>
              <button className="modal-close-btn" onClick={() => setShowReport(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '20px', padding: '12px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>🚨 {t('overdue_directives')} ({reportData.overdue.length})</div>
                {reportData.overdue.length === 0 ? <div style={{ fontSize: '12px' }}>{t('no_overdue_items')}</div> : (
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                    {reportData.overdue.map(a => (
                      <li key={a.id} style={{ marginBottom: '4px' }}>
                        <strong>{a.title}</strong> — <span style={{ color: 'var(--text-muted)' }}>{a.owner}</span>
                        <div style={{ fontSize: '11px', color: '#ef4444' }}>Due: {new Date(a.due).toLocaleDateString()}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ padding: '12px', background: 'rgba(124,58,237,0.05)', borderRadius: '8px', border: '1px solid rgba(124,58,237,0.1)' }}>
                <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: '8px' }}>⚡ {t('critical_pending_directives')} ({reportData.critical_pending.length})</div>
                {reportData.critical_pending.length === 0 ? <div style={{ fontSize: '12px' }}>{t('no_critical_items')}</div> : (
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                    {reportData.critical_pending.map(a => (
                      <li key={a.id} style={{ marginBottom: '4px' }}>
                        <strong>{a.title}</strong> — <span style={{ color: 'var(--text-muted)' }}>{a.owner}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px' }}>
              <button className="btn btn-outline btn-sm" onClick={() => window.print()}>{t('print_report')}</button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowReport(false)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
