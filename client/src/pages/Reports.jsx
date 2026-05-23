import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

function Sparkline({ values = [], color = '#6366f1', width = 100, height = 28 }) {
  if (!values || values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const len = values.length
  const step = width / Math.max(len - 1, 1)
  const points = values.map((v, i) => {
    const x = i * step
    const y = max === min ? height / 2 : height - ((v - min) / (max - min)) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const areaPoints = `0,${height} ${points} ${(len - 1) * step},${height}`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#sg-${color.replace('#', '')})`} points={areaPoints} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Reports({ notify }) {
  const [stats, setStats] = useState({})
  const [overview, setOverview] = useState(null)
  const [range, setRange] = useState('30')

  useEffect(() => { loadData() }, [range])

  function loadData() {
    apiFetch('/api/actions/stats').then(setStats).catch(() => setStats({}))
    apiFetch('/api/stats').then(setOverview).catch(() => setOverview(null))
  }

  function exportCSV() {
    const rows = [
      ['metric', 'value'],
      ['pending', stats.pending || 0],
      ['in_progress', stats.in_progress || 0],
      ['completed', stats.completed || 0],
      ['overdue', stats.overdue || 0],
      ['due_this_week', stats.due_this_week || 0],
      ['total_personnel', overview?.personnel || 0],
      ['total_documents', overview?.documents || 0],
      ['total_events', overview?.events || 0],
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `epom-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify && notify('Report exported', 'success')
  }

  const demoTrend = [3, 5, 2, 6, 8, 7, 9, 6, 8, 10, 9]

  const METRIC_CARDS = [
    {
      label: 'In Progress',
      val: stats.in_progress ?? '—',
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.08)',
      trend: demoTrend,
      desc: 'Active directives currently in execution.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      label: 'Overdue',
      val: stats.overdue ?? '—',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.08)',
      trend: demoTrend.map(v => Math.max(0, v - 2)),
      desc: 'Actions past their deadline requiring attention.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    },
    {
      label: 'Completed',
      val: stats.completed ?? '—',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
      trend: demoTrend.map(v => Math.min(12, v + 1)),
      desc: 'Successfully executed directives.',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12"/></svg>,
    },
  ]

  const completionRate = stats.completed && stats.in_progress
    ? Math.round((stats.completed / (stats.completed + (stats.in_progress || 0) + (stats.overdue || 0))) * 100)
    : 0

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="reports-header">
          <div>
            <div className="card-title">Reports & Analytics</div>
            <div className="card-subtitle">Analytics on time utilization, information volume, and decision execution</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select value={range} onChange={e => setRange(e.target.value)} style={{ width: 'auto', padding: '7px 12px' }}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button className="btn btn-outline btn-sm" onClick={exportCSV}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={loadData}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="metrics-row">
        {METRIC_CARDS.map(({ label, val, color, bg, trend, desc, icon }) => (
          <div key={label} className="metric-card">
            <div className="metric-top">
              <div>
                <div className="metric-title">{label}</div>
                <div className="metric-value" style={{ color }}>{val}</div>
              </div>
              <div className="metric-icon" style={{ background: bg, color }}>
                {icon}
              </div>
            </div>
            <div className="metric-bottom">
              <div className="metric-desc">{desc}</div>
              <Sparkline values={trend} color={color} />
            </div>
          </div>
        ))}
      </div>

      {/* Overview Grid */}
      <div className="dashboard-grid">
        {/* System Overview */}
        <div className="card analytics-card">
          <div className="card-header">
            <div>
              <div className="card-title">System Overview</div>
              <div className="card-subtitle">Live resource metrics</div>
            </div>
            <span
              className="badge badge-success"
              style={{ fontSize: '10px' }}
            >
              {overview ? `${overview.environment || 'Operational'}` : 'Loading…'}
            </span>
          </div>

          {[
            { label: 'Personnel', val: overview?.personnel ?? '—', color: '#6366f1', icon: '👥' },
            { label: 'Documents', val: overview?.documents ?? '—', color: '#f59e0b', icon: '📁' },
            { label: 'Events', val: overview?.events ?? '—', color: '#10b981', icon: '📅' },
            { label: 'Actions', val: overview?.actions ?? '—', color: '#ef4444', icon: '⚡' },
          ].map(({ label, val, color, icon }) => (
            <div key={label} className="report-block">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                <span>{icon}</span>
                <strong>{label}</strong>
              </div>
              <span style={{ fontFamily: 'var(--font-title)', fontWeight: 800, fontSize: '18px', color }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Action Performance */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Action Performance</div>
              <div className="card-subtitle">Completion rate analysis</div>
            </div>
          </div>

          {/* Completion Rate */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-title)',
              fontSize: '48px',
              fontWeight: 800,
              color: completionRate >= 70 ? '#10b981' : completionRate >= 40 ? '#f59e0b' : '#ef4444',
              lineHeight: 1,
            }}>
              {completionRate}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Completion Rate</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Pending', val: stats.pending ?? 0, total: (stats.pending || 0) + (stats.in_progress || 0) + (stats.completed || 0) + (stats.overdue || 0), color: '#6366f1' },
              { label: 'In Progress', val: stats.in_progress ?? 0, total: (stats.pending || 0) + (stats.in_progress || 0) + (stats.completed || 0) + (stats.overdue || 0), color: '#f59e0b' },
              { label: 'Completed', val: stats.completed ?? 0, total: (stats.pending || 0) + (stats.in_progress || 0) + (stats.completed || 0) + (stats.overdue || 0), color: '#10b981' },
              { label: 'Overdue', val: stats.overdue ?? 0, total: (stats.pending || 0) + (stats.in_progress || 0) + (stats.completed || 0) + (stats.overdue || 0), color: '#ef4444' },
            ].map(({ label, val, total, color }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color }}>{val}</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.round((val / Math.max(total, 1)) * 100)}%`,
                      background: color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Due This Week */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Due This Week</div>
          <span className="badge badge-warning">{stats.due_this_week ?? 0} items</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1,
            minWidth: '200px',
            padding: '16px',
            background: stats.due_this_week > 0 ? 'rgba(245,158,11,0.08)' : 'var(--bg)',
            borderRadius: '12px',
            border: `1px solid ${stats.due_this_week > 0 ? 'rgba(245,158,11,0.2)' : 'var(--border-color)'}`,
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '36px', fontWeight: 800, color: stats.due_this_week > 0 ? '#f59e0b' : 'var(--text-muted)', lineHeight: 1 }}>
              {stats.due_this_week ?? 0}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.due_this_week > 0 ? 'Actions need attention this week' : 'No urgent items due this week'}
            </div>
          </div>
          <div style={{ flex: 2, minWidth: '200px' }}>
            <Sparkline values={demoTrend} color="#f59e0b" width={200} height={40} />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Weekly trend (last {range} days)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
