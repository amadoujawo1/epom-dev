import React, { useEffect, useState } from 'react'
import EAction from './pages/EAction'
import EInfo from './pages/EInfo'
import Personnel from './pages/Personnel'
import ETime from './pages/ETime'
import Reports from './pages/Reports'
import Login from './pages/Login'
import { apiFetch } from './utils/api'

function loadStoredUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

function getDisplayName(user) {
  if (!user) return 'User'
  const full = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return full || user.username || 'User'
}

function getUserInitials(user) {
  const name = getDisplayName(user)
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
}

const NAV_ITEMS = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    id: 'personnel', label: 'Personnel',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    id: 'etime', label: 'e-Time',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  },
  {
    id: 'einfo', label: 'e-Info',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  },
  {
    id: 'eaction', label: 'e-Action',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  },
  {
    id: 'reports', label: 'Reports',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  },
]

const PAGE_NAMES = {
  dashboard: 'Dashboard',
  personnel: 'Personnel',
  etime: 'e-Time Calendar',
  einfo: 'e-Info Documents',
  eaction: 'e-Action Board',
  reports: 'Reports & Analytics',
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState(loadStoredUser)
  const [showProfile, setShowProfile] = useState(false)
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark')
  const [notifications, setNotifications] = useState([])

  const notify = (message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3500)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const fetchStats = () => {
    apiFetch('/api/stats').then(setStats).catch(() => {})
  }

  useEffect(() => {
    if (!token) return
    apiFetch('/api/auth/me').then(user => {
      setCurrentUser(user)
      localStorage.setItem('user', JSON.stringify(user))
    }).catch(() => {})
    fetchStats()
  }, [token])

  useEffect(() => {
    if (token) fetchStats()
  }, [page])

  useEffect(() => {
    const interval = setInterval(() => { if (token) fetchStats() }, 30000)
    return () => clearInterval(interval)
  }, [token])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
    setShowProfile(false)
    setToken(null)
  }

  if (!token) return <Login onLogin={() => setToken(localStorage.getItem('token'))} />

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const completedPct = stats?.action_stats
    ? Math.round((stats.action_stats.completed / Math.max(stats.actions || 1, 1)) * 100)
    : 0

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="logo-box">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Africa_%28orthographic_projection%29.svg" alt="ePOM" className="icon-africa" />
            </div>
            <div>
              <span className="brand-name">ePOM</span>
              <span className="brand-tag">Tactical Node v2.2</span>
            </div>
          </div>
          <button className="btn-digi">DIGI DELIVERY</button>
        </div>

        <div className="sidebar-section-label">Navigation</div>

        <nav>
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="user-card"
            onClick={() => setShowProfile(true)}
            title="View profile"
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setShowProfile(true)}
          >
            <div className="avatar">{getUserInitials(currentUser)}</div>
            <div className="user-info">
              <span className="user-name">{getDisplayName(currentUser)}</span>
              <span className="user-role">{currentUser?.role || 'User'}</span>
            </div>
            <div
              className="logout-icon"
              onClick={e => { e.stopPropagation(); logout() }}
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{PAGE_NAMES[page]}</div>
          </div>
          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder="Search tasks, docs, personnel…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="top-controls">
            <button className="ctrl-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle theme">
              {isDarkMode
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <button className="ctrl-btn" title="Notifications">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {stats?.action_stats?.overdue > 0 && <span className="notif-dot" />}
            </button>
            <button className="ctrl-btn" onClick={() => setShowProfile(true)} title="Profile">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          </div>
        </header>

        <div className="content-body">
          {/* Notifications */}
          <div className="notifications-container">
            {notifications.map(n => (
              <div key={n.id} className={`notification ${n.type}`}>
                {n.type === 'success' ? '✓ ' : n.type === 'error' ? '✕ ' : 'ℹ '}
                {n.message}
              </div>
            ))}
          </div>

          {/* ── Dashboard ── */}
          {page === 'dashboard' && (
            <section className="dashboard">
              <div className="dashboard-header">
                <div>
                  <div className="dashboard-greeting">Good {getTimeGreeting()}, {getDisplayName(currentUser).split(' ')[0]} 👋</div>
                  <div className="dashboard-date">{dateStr}</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={fetchStats}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  Refresh
                </button>
              </div>

              {/* KPI Cards */}
              <div className="dashboard-summary">
                <div className="summary-card" onClick={() => setPage('einfo')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#fef3c7' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Documents</span>
                    <div className="summary-val">{stats?.documents ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('personnel')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#dbeafe' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Personnel</span>
                    <div className="summary-val">{stats?.personnel ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('eaction')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#ffedd5' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Active Actions</span>
                    <div className="summary-val">{stats?.actions ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('etime')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#f0fdf4' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">Events</span>
                    <div className="summary-val">{stats?.events ?? '—'}</div>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="dashboard-grid">

                {/* Intelligence Hub */}
                <div className="card dark-card">
                  <div className="card-title" style={{ color: '#fff', marginBottom: '4px' }}>
                    <span style={{ marginRight: '6px' }}>✦</span> Intelligence Hub
                  </div>
                  <div className="card-subtitle" style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '16px' }}>Strategic Overview</div>
                  <div className="hub-section">
                    <span className="section-label" style={{ color: 'rgba(255,255,255,0.35)' }}>INSIGHTS</span>
                    <div className="insight-box" style={{ marginBottom: '12px' }}>
                      {stats?.action_stats?.pending > 0
                        ? `You have ${stats.action_stats.pending} pending directive${stats.action_stats.pending > 1 ? 's' : ''} requiring attention.`
                        : 'Your directive queue is clear. All systems operational.'}
                    </div>
                  </div>
                  <div className="ai-status" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <div>
                      <div>AI-FILTERING ACTIVE</div>
                      <div style={{ fontSize: '11px', opacity: 0.75, fontWeight: 400, marginTop: '1px' }}>
                        {stats?.action_stats?.overdue > 0
                          ? `Alert: ${stats.action_stats.overdue} overdue item${stats.action_stats.overdue > 1 ? 's' : ''} detected.`
                          : 'Proactively filtering by priorities.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Progress */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Task Progress</div>
                      <div className="card-subtitle">Directives completion overview</div>
                    </div>
                    <span className="badge badge-pending">{stats?.actions || 0} Total</span>
                  </div>
                  <div className="progress-grid">
                    <div className="chart-container">
                      <div className="donut-wrapper">
                        <svg className="donut-svg" viewBox="0 0 110 110">
                          <circle className="donut-bg" cx="55" cy="55" r="45" />
                          <circle
                            className="donut-completed"
                            cx="55" cy="55" r="45"
                            strokeDasharray={`${completedPct * 2.827} 282.7`}
                            strokeDashoffset="0"
                          />
                        </svg>
                        <div className="donut-center">
                          <span className="donut-pct">{completedPct}%</span>
                          <span className="donut-label">Done</span>
                        </div>
                      </div>
                    </div>
                    <div className="priority-section">
                      <span className="section-label">EVENTS BY PRIORITY</span>
                      <div className="priority-bars">
                        {[
                          { label: 'LOW', val: stats?.event_stats?.low, color: '#94a3b8' },
                          { label: 'MEDIUM', val: stats?.event_stats?.medium, color: '#a855f7' },
                          { label: 'HIGH', val: stats?.event_stats?.high, color: '#f59e0b' },
                          { label: 'CRITICAL', val: stats?.event_stats?.critical, color: '#ef4444' },
                        ].map(({ label, val, color }) => (
                          <div className="priority-row" key={label}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{label}</span>
                            <div className="progress-bar-bg">
                              <div className="progress-fill" style={{
                                width: `${Math.round(((val || 0) / Math.max(stats?.events || 1, 1)) * 100)}%`,
                                background: color
                              }} />
                            </div>
                            <span style={{ color: 'var(--text-main)', fontWeight: 700, textAlign: 'right' }}>{val || 0}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Status */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <div className="card-header">
                    <div>
                      <div className="card-title">Operational Status</div>
                      <div className="card-subtitle">Real-time system metrics</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setPage('eaction')}>View All Actions</button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { label: 'Pending', val: stats?.action_stats?.pending ?? 0, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                      { label: 'In Progress', val: stats?.action_stats?.in_progress ?? 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                      { label: 'Completed', val: stats?.action_stats?.completed ?? 0, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                      { label: 'Overdue', val: stats?.action_stats?.overdue ?? 0, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                    ].map(({ label, val, color, bg }) => (
                      <div key={label} style={{
                        padding: '14px 16px',
                        background: bg,
                        borderRadius: '12px',
                        border: `1px solid ${color}22`,
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: '26px', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {page === 'personnel' && <Personnel searchQuery={searchQuery} notify={notify} />}
          {page === 'etime' && <ETime searchQuery={searchQuery} notify={notify} />}
          {page === 'eaction' && <EAction searchQuery={searchQuery} notify={notify} />}
          {page === 'einfo' && <EInfo searchQuery={searchQuery} notify={notify} />}
          {page === 'reports' && <Reports searchQuery={searchQuery} notify={notify} />}
        </div>
      </main>

      {/* ── Profile Modal ── */}
      {showProfile && currentUser && (
        <div className="modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <div className="modal-header-icon profile-modal-avatar">{getUserInitials(currentUser)}</div>
                <div>
                  <div className="modal-title">My Profile</div>
                  <div className="modal-subtitle">@{currentUser.username}</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            <div className="profile-modal-body">
              <div className="profile-detail-grid">
                {[
                  { label: 'Full Name', val: getDisplayName(currentUser) },
                  { label: 'Username', val: `@${currentUser.username}` },
                  { label: 'Email', val: currentUser.email || '—' },
                  { label: 'Role', val: currentUser.role || '—' },
                  { label: 'Department', val: currentUser.department || '—' },
                ].map(({ label, val }) => (
                  <div className="profile-detail" key={label}>
                    <span className="profile-detail-label">{label}</span>
                    <span className="profile-detail-value">{val}</span>
                  </div>
                ))}
                <div className="profile-detail">
                  <span className="profile-detail-label">Status</span>
                  <span className={`badge ${currentUser.is_active !== false ? 'badge-success' : 'badge-error'}`}>
                    {currentUser.is_active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowProfile(false)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={logout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
