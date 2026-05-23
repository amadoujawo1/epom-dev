import React, { useEffect, useState } from 'react'
import { apiFetch } from '../utils/api'

function Sparkline({ values = [], color = '#6366f1', width = 120, height = 32 }) {
  if (!values || values.length === 0) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const len = values.length
  const step = width / Math.max(len - 1, 1)
  const points = values.map((v, i) => {
    const x = i * step
    const y = max === min ? height / 2 : height - ((v - min) / (max - min)) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Reports() {
  const [stats, setStats] = useState({})
  const [overview, setOverview] = useState(null)
  const [range, setRange] = useState('30')

  useEffect(() => {
    loadData()
  }, [range])

  function loadData() {
    apiFetch('/api/actions/stats')
      .then(setStats)
      .catch(() => setStats({}))

    apiFetch('/api/stats')
      .then(setOverview)
      .catch(() => setOverview(null))
  }

  function exportCSV() {
    const rows = [
      ['metric', 'value'],
      ['pending', stats.pending || 0],
      ['in_progress', stats.in_progress || 0],
      ['completed', stats.completed || 0],
      ['overdue', stats.overdue || 0],
      ['due_this_week', stats.due_this_week || 0]
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'epom-report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // small demo data for sparklines
  const demoTrend = [3,5,2,6,8,7,9,6,8,10,9]

  return (
    <div className="reports-page">
      <div className="header card">
        <div>
          <h2>Reports & Analytics</h2>
          <p className="muted">Analytics on time utilization, information volume, and decision execution.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={range} onChange={e => setRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button className="btn btn-outline" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-primary" onClick={loadData}>Refresh</button>
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric card">
          <div className="metric-top">
            <div className="metric-title">In Progress</div>
            <div className="metric-value">{stats.in_progress ?? '—'}</div>
          </div>
          <div className="metric-bottom">
            <Sparkline values={demoTrend} color="#6366f1" />
            <div className="metric-desc">Active directives currently in execution.</div>
          </div>
        </div>

        <div className="metric card">
          <div className="metric-top">
            <div className="metric-title">Overdue</div>
            <div className="metric-value">{stats.overdue ?? '—'}</div>
          </div>
          <div className="metric-bottom">
            <Sparkline values={demoTrend.map(v => Math.max(0, v - 2))} color="#ef4444" />
            <div className="metric-desc">Actions past their due date needing attention.</div>
          </div>
        </div>

        <div className="metric card">
          <div className="metric-top">
            <div className="metric-title">Completed</div>
            <div className="metric-value">{stats.completed ?? '—'}</div>
          </div>
          <div className="metric-bottom">
            <Sparkline values={demoTrend.map(v => Math.min(10, v + 2))} color="#10b981" />
            <div className="metric-desc">Completed directives over the selected period.</div>
          </div>
        </div>
      </div>

      <div className="analytics card">
        <h3>AI-Assisted Workflow Analytics</h3>
        <div className="anomaly">{overview ? `System: ${overview.environment || 'Operational'}` : 'Loading overview...'}</div>
        <div style={{ marginTop: 12 }}>
          <div className="report-block">
            <strong>Personnel:</strong> {overview ? overview.personnel : '—'}
          </div>
          <div className="report-block">
            <strong>Documents:</strong> {overview ? overview.documents : '—'}
          </div>
          <div className="report-block">
            <strong>Events:</strong> {overview ? overview.events : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}
