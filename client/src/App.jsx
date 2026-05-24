import React, { useEffect, useState } from 'react'
import EAction from './pages/EAction'
import EInfo from './pages/EInfo'
import Personnel from './pages/Personnel'
import ETime from './pages/ETime'
import Reports from './pages/Reports'
import Login from './pages/Login'
import { apiFetch } from './utils/api'
import { useLanguage } from './context/LanguageContext'
import logo from './assets/logo.png'

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

export default function App() {
  const { t, lang, setLang } = useLanguage()
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState(loadStoredUser)
  const [showProfile, setShowProfile] = useState(false)
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark')
  const [notifications, setNotifications] = useState([])
  const [recentActions, setRecentActions] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [userNotifications, setUserNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
    apiFetch('/api/actions').then(data => setRecentActions((data || []).slice(0, 5))).catch(() => {})
    apiFetch('/api/notifications').then(data => setUserNotifications(data || [])).catch(() => {})
    apiFetch('/api/calendar').then(data => {
      const now = new Date()
      const upcoming = (data || [])
        .filter(e => new Date(e.start_time) >= now)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
        .slice(0, 5)
      setUpcomingEvents(upcoming)
    }).catch(() => {})
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
    setShowNotifPanel(false)
    setToken(null)
  }

  const markRead = (id) => {
    apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' })
      .then(() => {
        setUserNotifications(prev => prev.filter(n => n.id !== id))
      })
      .catch(() => {})
  }

  if (!token) return <Login onLogin={() => setToken(localStorage.getItem('token'))} />

  const now = new Date()
  const dateStr = now.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  const completedPct = stats?.action_stats
    ? Math.round((stats.action_stats.completed / Math.max(stats.actions || 1, 1)) * 100)
    : 0

  const NAV_ITEMS = [
    {
      id: 'dashboard', label: t('nav_dashboard'),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    },
    {
      id: 'personnel', label: t('nav_personnel'),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
    {
      id: 'etime', label: t('nav_etime'),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    },
    {
      id: 'einfo', label: t('nav_einfo'),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    },
    {
      id: 'eaction', label: t('nav_eaction'),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    },
    {
      id: 'reports', label: t('nav_reports'),
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    },
  ]

  const PAGE_NAMES = {
    dashboard: t('page_dashboard'),
    personnel: t('page_personnel'),
    etime: t('page_etime'),
    einfo: t('page_einfo'),
    eaction: t('page_eaction'),
    reports: t('page_reports'),
  }

  const pendingCount = stats?.action_stats?.pending || 0
  const overdueCount = stats?.action_stats?.overdue || 0

  const intelMessage = pendingCount > 0
    ? t(pendingCount === 1 ? 'intel_pending_single' : 'intel_pending_multi', { n: pendingCount })
    : t('intel_clear')

  const aiMessage = overdueCount > 0
    ? t(overdueCount === 1 ? 'ai_alert_single' : 'ai_alert_multi', { n: overdueCount })
    : t('ai_proactive')

  return (
    <div className={`app ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* ── Mobile Overlay ── */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${isSidebarOpen ? 'show' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="logo-box">
              <img src={logo} alt="ePOM" className="icon-africa" />
            </div>
            <div>
              <span className="brand-name">ePOM</span>
            </div>
          </div>
          <button className="btn-digi">{t('digi_delivery')}</button>
        </div>

        <div className="sidebar-section-label">{t('nav_section')}</div>

        <nav>
          {NAV_ITEMS.map(item => (
            <a
              key={item.id}
              className={page === item.id ? 'active' : ''}
              onClick={() => { setPage(item.id); setIsSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="user-card"
            onClick={() => { setShowProfile(true); setIsSidebarOpen(false); }}
            title={t('profile')}
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
              title={t('sign_out')}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="page-title">{PAGE_NAMES[page]}</div>
          </div>
          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              placeholder={t('search_placeholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="top-controls">
            {/* Language toggle */}
            <button
              className="lang-toggle-btn"
              onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
              title={t('toggle_language')}
            >
              <span className={lang === 'en' ? 'lang-active' : ''}>EN</span>
              <span className="lang-divider">|</span>
              <span className={lang === 'fr' ? 'lang-active' : ''}>FR</span>
            </button>
            <button className="ctrl-btn" onClick={() => setIsDarkMode(!isDarkMode)} title={t('toggle_theme')}>
              {isDarkMode
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <div style={{ position: 'relative' }}>
              <button className="ctrl-btn" onClick={() => setShowNotifPanel(!showNotifPanel)} title={t('notifications')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {userNotifications.filter(n => !n.is_read).length > 0 && <span className="notif-dot" />}
              </button>
              
              {showNotifPanel && (
                <div className="user-notif-panel">
                  <div className="user-notif-header">
                    <span>{t('notifications')}</span>
                    <button className="btn-close-sm" onClick={() => setShowNotifPanel(false)}>✕</button>
                  </div>
                  <div className="user-notif-list">
                    {userNotifications.length === 0 ? (
                      <div className="user-notif-empty">No new notifications</div>
                    ) : (
                      userNotifications.map(n => (
                        <div key={n.id} className={`user-notif-item ${n.is_read ? 'read' : 'unread'}`} onClick={() => {
                          if (n.link) { setPage(n.link.replace('/', '')); setShowNotifPanel(false); }
                          markRead(n.id);
                        }}>
                          <div className="user-notif-msg">{n.message}</div>
                          <div className="user-notif-time">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="ctrl-btn" onClick={() => setShowProfile(true)} title={t('profile')}>
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
                  <div className="dashboard-greeting">{t(getGreetingKey())}, {getDisplayName(currentUser).split(' ')[0]} 👋</div>
                  <div className="dashboard-date">{dateStr}</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={fetchStats}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  {t('refresh')}
                </button>
              </div>

              {/* KPI Cards */}
              <div className="dashboard-summary">
                <div className="summary-card" onClick={() => setPage('einfo')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#fef3c7' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">{t('dash_documents')}</span>
                    <div className="summary-val">{stats?.documents ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('personnel')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#dbeafe' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">{t('dash_personnel')}</span>
                    <div className="summary-val">{stats?.personnel ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('eaction')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#ffedd5' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">{t('dash_active_actions')}</span>
                    <div className="summary-val">{stats?.actions ?? '—'}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('etime')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#f0fdf4' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <div className="summary-info">
                    <span className="summary-label">{t('dash_events')}</span>
                    <div className="summary-val">{stats?.events ?? '—'}</div>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="dashboard-grid">
                {/* Intelligence Hub */}
                <div className="card dark-card">
                  <div className="card-title" style={{ color: '#fff', marginBottom: '4px' }}>
                    <span style={{ marginRight: '6px' }}>✦</span> {t('intel_hub')}
                  </div>
                  <div className="card-subtitle" style={{ color: 'rgba(255,255,255,0.45)', marginBottom: '16px' }}>{t('intel_hub_sub')}</div>
                  <div className="hub-section">
                    <span className="section-label" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('intel_insights')}</span>
                    <div className="insight-box" style={{ marginBottom: '12px' }}>{intelMessage}</div>
                  </div>
                  <div className="ai-status" style={{ background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.2)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <div>
                      <div>{t('ai_filter_active')}</div>
                      <div style={{ fontSize: '11px', opacity: 0.75, fontWeight: 400, marginTop: '1px' }}>{aiMessage}</div>
                    </div>
                  </div>
                </div>

                {/* Task Progress */}
                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">{t('task_progress')}</div>
                      <div className="card-subtitle">{t('task_progress_sub')}</div>
                    </div>
                    <span className="badge badge-pending">{stats?.actions || 0} {t('total')}</span>
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
                          <span className="donut-label">{t('done')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="priority-section">
                      <span className="section-label">{t('events_by_priority')}</span>
                      <div className="priority-bars">
                        {[
                          { labelKey: 'priority_low', val: stats?.event_stats?.low, color: '#94a3b8' },
                          { labelKey: 'priority_medium', val: stats?.event_stats?.medium, color: '#a855f7' },
                          { labelKey: 'priority_high', val: stats?.event_stats?.high, color: '#f59e0b' },
                          { labelKey: 'priority_critical', val: stats?.event_stats?.critical, color: '#ef4444' },
                        ].map(({ labelKey, val, color }) => (
                          <div className="priority-row" key={labelKey}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{t(labelKey).toUpperCase()}</span>
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
                      <div className="card-title">{t('op_status')}</div>
                      <div className="card-subtitle">{t('op_status_sub')}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => setPage('eaction')}>{t('view_all_actions')}</button>
                    </div>
                  </div>
                  <div className="op-status-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { labelKey: 'status_pending', val: stats?.action_stats?.pending ?? 0, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                      { labelKey: 'status_in_progress', val: stats?.action_stats?.in_progress ?? 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                      { labelKey: 'status_completed', val: stats?.action_stats?.completed ?? 0, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                      { labelKey: 'status_overdue', val: stats?.action_stats?.overdue ?? 0, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                    ].map(({ labelKey, val, color, bg }) => (
                      <div key={labelKey} style={{ padding: '14px 16px', background: bg, borderRadius: '12px', border: `1px solid ${color}22` }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{t(labelKey)}</div>
                        <div style={{ fontFamily: 'var(--font-title)', fontSize: '26px', fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Directives Table */}
              <div className="dashboard-section">
                <div className="section-header">
                  <span className="section-label">{t('dash_new_directives')}</span>
                  <button className="btn-text" onClick={() => setPage('eaction')}>{t('dash_view_all')}</button>
                </div>
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-responsive">
                    <table className="directive-table">
                      <thead>
                        <tr>
                          <th>{t('directive')}</th>
                          <th>{t('owner')}</th>
                          <th>{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActions.map(action => (
                          <tr key={action.id}>
                            <td className="font-bold">{action.title}</td>
                            <td>{action.owner}</td>
                            <td>
                              <span className={`badge badge-${action.status === 'Completed' ? 'success' : action.status === 'Overdue' ? 'error' : 'warning'}`}>
                                {action.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Upcoming Events Table */}
              <div className="dashboard-section">
                <div className="section-header">
                  <span className="section-label">{t('dash_upcoming_events')}</span>
                  <button className="btn-text" onClick={() => setPage('etime')}>{t('dash_view_calendar')}</button>
                </div>
                <div className="card" style={{ padding: 0 }}>
                  <div className="table-responsive">
                    <table className="directive-table">
                      <thead>
                        <tr>
                          <th>{t('event')}</th>
                          <th>{t('event_date_label')}</th>
                          <th>{t('event_start_time')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingEvents.length > 0 ? (
                          upcomingEvents.map(event => (
                            <tr key={event.id}>
                              <td className="font-bold">{event.title}</td>
                              <td>{new Date(event.start_time).toLocaleDateString()}</td>
                              <td>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                              {t('dash_no_events')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                  <div className="modal-title">{t('my_profile')}</div>
                  <div className="modal-subtitle">@{currentUser.username}</div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowProfile(false)}>✕</button>
            </div>
            <div className="profile-modal-body">
              <div className="profile-detail-grid">
                {[
                  { labelKey: 'full_name', val: getDisplayName(currentUser) },
                  { labelKey: 'username', val: `@${currentUser.username}` },
                  { labelKey: 'email', val: currentUser.email || '—' },
                  { labelKey: 'role', val: currentUser.role || '—' },
                  { labelKey: 'department', val: currentUser.department || '—' },
                ].map(({ labelKey, val }) => (
                  <div className="profile-detail" key={labelKey}>
                    <span className="profile-detail-label">{t(labelKey)}</span>
                    <span className="profile-detail-value">{val}</span>
                  </div>
                ))}
                <div className="profile-detail">
                  <span className="profile-detail-label">{t('status')}</span>
                  <span className={`badge ${currentUser.is_active !== false ? 'badge-success' : 'badge-error'}`}>
                    {currentUser.is_active !== false ? t('status_active') : t('status_inactive')}
                  </span>
                </div>
              </div>
            </div>
            <div className="profile-modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setShowProfile(false)}>{t('close')}</button>
              <button type="button" className="btn btn-primary" onClick={logout}>{t('sign_out')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'greeting_morning'
  if (h < 18) return 'greeting_afternoon'
  return 'greeting_evening'
}
