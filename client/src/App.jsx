import React, { useEffect, useState } from 'react'
import EAction from './pages/EAction'
import EInfo from './pages/EInfo'
import Personnel from './pages/Personnel'
import ETime from './pages/ETime'
import Reports from './pages/Reports'
import Login from './pages/Login'
import { apiFetch } from './utils/api'

function loadStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
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
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [currentUser, setCurrentUser] = useState(loadStoredUser)
  const [showProfile, setShowProfile] = useState(false)
  const [ping, setPing] = useState(null)
  const [stats, setStats] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark')
  const [notifications, setNotifications] = useState([])

  const notify = (message, type = 'info') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

const fetchStats = () => {
  apiFetch('/api/stats')
    .then(data => {
      console.log('Fetched stats:', data);
      setStats(data);
    })
    .catch(err => {
      console.error('Error fetching stats:', err);
    });
};

  useEffect(() => {
    if (!token) return;

    apiFetch('/api/auth/me')
      .then(user => {
        setCurrentUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      })
      .catch(() => {});

    fetch('/api/ping')
      .then(r => r.json())
      .then(setPing)
      .catch(() => setPing({ status: 'down' }));

    // Fetch stats on token change and when page is dashboard
    fetchStats();
  }, [page, token]);

  // Periodic refresh of stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
    setShowProfile(false)
    setToken(null)
  }

  if (!token) {
    return <Login onLogin={() => setToken(localStorage.getItem('token'))} />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-box">
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Africa_%28orthographic_projection%29.svg" alt="ePOM" className="icon-africa" />
          </div>
          ePOM
        </div>
        <button className="btn-digi">DIGI DELIVERY</button>
        <nav>
          <a className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>📊 Dashboard</a>
          <a className={page === 'personnel' ? 'active' : ''} onClick={() => setPage('personnel')}>👥 Personnel</a>
          <a className={page === 'etime' ? 'active' : ''} onClick={() => setPage('etime')}>📅 e-Time</a>
          <a className={page === 'einfo' ? 'active' : ''} onClick={() => setPage('einfo')}>📄 e-Info</a>
          <a className={page === 'eaction' ? 'active' : ''} onClick={() => setPage('eaction')}>✅ e-Action</a>
          <a className={page === 'reports' ? 'active' : ''} onClick={() => setPage('reports')}>📈 Reports</a>
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
            >⏻</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="dot">•</span> {page.charAt(0).toUpperCase() + page.slice(1)}
          </div>
          <div className="search-container">
            <input 
              placeholder="Search tasks, docs, or personnel.." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="top-controls">
            <div className="lang-toggle">
              <span className="active">EN</span>
              <span>FR</span>
            </div>
            <button className="control-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button className="control-btn">🔔</button>
            <button className="control-btn">⚙️</button>
          </div>
        </header>

        <div className="content-body">
          <div className="notifications-container">
            {notifications.map(n => (
              <div key={n.id} className={`notification ${n.type}`}>
                {n.message}
              </div>
            ))}
          </div>
          {page === 'dashboard' && (
            <section className="dashboard">
              <div className="dashboard-summary">
                <div className="summary-card" onClick={() => setPage('einfo')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#fef3c7' }}>📁</div>
                  <div className="summary-info">
                    <span className="summary-label">Documents</span>
                    <div className="summary-val">{stats?.documents || 0}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('personnel')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#e0f2fe' }}>👥</div>
                  <div className="summary-info">
                    <span className="summary-label">Personnel</span>
                    <div className="summary-val">{stats?.personnel || 0}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('eaction')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#ffedd5' }}>⚡</div>
                  <div className="summary-info">
                    <span className="summary-label">Active Actions</span>
                    <div className="summary-val">{stats?.actions || 0}</div>
                  </div>
                </div>
                <div className="summary-card" onClick={() => setPage('etime')} style={{ cursor: 'pointer' }}>
                  <div className="summary-icon" style={{ background: '#f1f5f9' }}>📅</div>
                  <div className="summary-info">
                    <span className="summary-label">Events</span>
                    <div className="summary-val">{stats?.events || 0}</div>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card dark">
                  <div className="card-title">✨ Intelligence Hub</div>
                  <div className="hub-section">
                    <div className="hub-label">STRATEGIC INSIGHTS</div>
                    <div className="insight-box">
                      {stats?.action_stats?.pending > 0 
                        ? `You have ${stats.action_stats.pending} pending directives that require attention.`
                        : "Your directive queue is clear. Optimize this time for deep strategic reflection."}
                    </div>
                  </div>
                  <div className="ai-status">
                    🛡️ AI-FILTERING ACTIVE
                    <span style={{ fontSize: '12px', opacity: 0.8, fontWeight: 400 }}>
                      {stats?.action_stats?.overdue > 0 
                        ? `Alert: ${stats.action_stats.overdue} overdue items detected.`
                        : "Proactively filtering schedules based on Presidential Priorities."}
                    </span>
                  </div>
                </div>

                <div className="card">
                  <div className="progress-grid">
                    <div className="chart-section">
                      <div className="hub-label">TASK PROGRESS</div>
                      <div className="chart-container">
                        <div className="donut-mock" style={{ 
                          borderTopColor: stats?.action_stats?.completed > 0 ? '#10b981' : '#f59e0b',
                          borderRightColor: stats?.action_stats?.in_progress > 0 ? '#6c5ce7' : '#f1f5f9'
                        }}></div>
                      </div>
                    </div>
                    <div className="priority-section">
                      <div className="hub-label">EVENTS BY PRIORITY</div>
                      <div className="priority-bars">
                        <div className="priority-row">
                          <span>LOW</span>
                          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(stats?.event_stats?.low / (stats?.events || 1)) * 100}%`, background: '#94a3b8' }}></div></div>
                          <span>{stats?.event_stats?.low || 0}</span>
                        </div>
                        <div className="priority-row">
                          <span>MEDIUM</span>
                          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(stats?.event_stats?.medium / (stats?.events || 1)) * 100}%`, background: '#a855f7' }}></div></div>
                          <span>{stats?.event_stats?.medium || 0}</span>
                        </div>
                        <div className="priority-row">
                          <span>HIGH</span>
                          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(stats?.event_stats?.high / (stats?.events || 1)) * 100}%`, background: '#f59e0b' }}></div></div>
                          <span>{stats?.event_stats?.high || 0}</span>
                        </div>
                        <div className="priority-row">
                          <span>CRITICAL</span>
                          <div className="progress-bar-bg"><div className="progress-fill" style={{ width: `${(stats?.event_stats?.critical / (stats?.events || 1)) * 100}%`, background: '#ef4444' }}></div></div>
                          <span>{stats?.event_stats?.critical || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <div className="card-header">
                    <div>
                      <div className="card-title">Operational Flow</div>
                      <div className="hub-label">REAL-TIME DIRECTIVES</div>
                    </div>
                    <span className="badge badge-pending">{stats?.actions || 0} TOTAL</span>
                  </div>
                  <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Active Directives</div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>Please review the e-Action register for details.</div>
                    <span className="badge badge-pending" style={{ padding: '6px 12px' }}>{stats?.action_stats?.pending || 0} PENDING</span>
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

      {showProfile && currentUser && (
        <div className="modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="modal-header-content">
                <div className="modal-header-icon profile-modal-avatar">
                  {getUserInitials(currentUser)}
                </div>
                <div>
                  <div className="modal-title">My Profile</div>
                  <div className="modal-subtitle">Signed in as @{currentUser.username}</div>
                </div>
              </div>
              <button className="modal-close-btn" type="button" onClick={() => setShowProfile(false)}>✕</button>
            </div>

            <div className="profile-modal-body">
              <div className="profile-detail-grid">
                <div className="profile-detail">
                  <span className="profile-detail-label">Full Name</span>
                  <span className="profile-detail-value">{getDisplayName(currentUser)}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail-label">Username</span>
                  <span className="profile-detail-value">@{currentUser.username}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail-label">Email</span>
                  <span className="profile-detail-value">{currentUser.email || '—'}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail-label">Role</span>
                  <span className="profile-detail-value">{currentUser.role || '—'}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail-label">Department</span>
                  <span className="profile-detail-value">{currentUser.department || '—'}</span>
                </div>
                <div className="profile-detail">
                  <span className="profile-detail-label">Account Status</span>
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
