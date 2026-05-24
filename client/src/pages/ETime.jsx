import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import EventModal from '../components/EventModal';
import { getEventColor } from '../utils/eventColors';
import { useLanguage } from '../context/LanguageContext';

function buildCalendar(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDay = first.getDay()
  const weeks = []
  let week = new Array(7).fill(null)
  let day = 1
  for (let i = 0; i < startDay; i++) week[i] = null
  for (let i = startDay; i < 7; i++) week[i] = day++
  weeks.push(week)
  while (day <= last.getDate()) {
    week = new Array(7).fill(null)
    for (let i = 0; i < 7 && day <= last.getDate(); i++) week[i] = day++
    weeks.push(week)
  }
  return weeks
}

export default function ETime({ searchQuery, notify }) {
  const { t, lang } = useLanguage()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [strategicFilter, setStrategicFilter] = useState(false)
  const [protectedFilter, setProtectedFilter] = useState(false)

  useEffect(() => { fetchEvents() }, [month, year])

  function fetchEvents() {
    apiFetch('/api/calendar?month=' + (month + 1) + '&year=' + year)
      .then(setEvents)
      .catch(err => {
        setEvents([])
        console.error(err)
        if (notify) notify(t('failed_load_events'), 'error')
      })
  }

  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                         ev.description?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                         ev.location?.toLowerCase().includes((searchQuery || '').toLowerCase())
    const matchesType = typeFilter === 'all' || ev.type === typeFilter
    const matchesPriority = priorityFilter === 'all' || ev.priority === priorityFilter
    const matchesStrategic = !strategicFilter || ev.is_strategic
    const matchesProtected = !protectedFilter || ev.is_protected
    return matchesSearch && matchesType && matchesPriority && matchesStrategic && matchesProtected
  })

  const totalMonthEvents = events.length
  const meetingsCount = events.filter(e => e.type === 'meeting').length
  const briefingsCount = events.filter(e => e.type === 'briefing').length
  const travelCount = events.filter(e => e.type === 'travel').length

  const upcomingEvent = events
    .filter(e => new Date(e.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0]

  function openCreate() { setSelectedEvent(null); setShowForm(true) }
  function openEdit(event) { setSelectedEvent(event); setShowForm(true) }

  function handleSave(payload) {
    const method = selectedEvent ? 'PUT' : 'POST'
    const url = selectedEvent ? `/api/calendar/${selectedEvent.id}` : '/api/calendar'
    apiFetch(url, { method, body: JSON.stringify(payload) })
      .then(() => {
        fetchEvents()
        setShowForm(false)
        setSelectedEvent(null)
        if (notify) notify(t(selectedEvent ? 'event_updated' : 'event_scheduled'), 'success')
      })
      .catch(err => {
        console.error(err)
        if (notify) notify(t('failed_save_event'), 'error')
      })
  }

  function deleteEvent(id) {
    if (!confirm(t('delete_doc_confirm'))) return
    apiFetch(`/api/calendar/${id}`, { method: 'DELETE' })
      .then(() => {
        fetchEvents()
        if (notify) notify(t('event_deleted'), 'success')
      })
      .catch(err => {
        console.error(err)
        if (notify) notify(t('failed_delete_event'), 'error')
      })
  }

  const weeks = buildCalendar(year, month)
  const days_short = t('days_short')

  const monthName = new Date(year, month).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' }).toUpperCase()

  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting': return '👥'
      case 'briefing': return '📢'
      case 'travel': return '✈️'
      default: return '📅'
    }
  }

  return (
    <div className="etime-page">
      {/* Header */}
      <div className="etime-header-section">
        <div className="month-title-wrapper">
          <h1 className="month-title">{monthName}</h1>
          <div className="year-subtitle">{t('etime_schedule_sub', { year })}</div>
        </div>
        <div className="cal-controls">
          <div className="segmented-control">
            <button className={`segmented-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              {t('grid_view')}
            </button>
            <button className={`segmented-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              {t('timeline')}
            </button>
          </div>
          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => setMonth(prev => prev === 0 ? 11 : prev - 1)}>←</button>
            <button className="today-btn" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()) }}>{t('today')}</button>
            <button className="nav-btn" onClick={() => setMonth(prev => prev === 11 ? 0 : prev + 1)}>→</button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>{t('establish_meeting')}</button>
        </div>
      </div>

      <EventModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        event={selectedEvent}
      />

      {/* Main layout */}
      <div className="etime-main-layout">
        {/* Sidebar */}
        <aside className="etime-sidebar">
          <div className="sidebar-card">
            <div className="sidebar-title">{t('filters')}</div>
            <div className="filter-group">
              <button className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
                <span>📅</span> {t('all_types')}
              </button>
              <button className={`filter-btn ${typeFilter === 'meeting' ? 'active' : ''}`} onClick={() => setTypeFilter('meeting')}>
                <span>👥</span> {t('meetings')} ({meetingsCount})
              </button>
              <button className={`filter-btn ${typeFilter === 'briefing' ? 'active' : ''}`} onClick={() => setTypeFilter('briefing')}>
                <span>📢</span> {t('briefings')} ({briefingsCount})
              </button>
              <button className={`filter-btn ${typeFilter === 'travel' ? 'active' : ''}`} onClick={() => setTypeFilter('travel')}>
                <span>✈️</span> {t('travel')} ({travelCount})
              </button>
            </div>

            <div className="sidebar-title" style={{ marginTop: '20px' }}>{t('priority')}</div>
            <div className="filter-group">
              <button className={`filter-btn ${priorityFilter === 'all' ? 'active' : ''}`} onClick={() => setPriorityFilter('all')}>
                {t('all_priorities')}
              </button>
              <button className={`filter-btn ${priorityFilter === 'High' ? 'active' : ''}`} onClick={() => setPriorityFilter('High')}>
                {t('priority_high_label')}
              </button>
              <button className={`filter-btn ${priorityFilter === 'Medium' ? 'active' : ''}`} onClick={() => setPriorityFilter('Medium')}>
                {t('priority_medium_label')}
              </button>
              <button className={`filter-btn ${priorityFilter === 'Low' ? 'active' : ''}`} onClick={() => setPriorityFilter('Low')}>
                {t('priority_low_label')}
              </button>
            </div>

            <div className="sidebar-title" style={{ marginTop: '20px' }}>{t('special_filters')}</div>
            <div className="filter-group">
              <button className={`filter-btn ${strategicFilter ? 'active' : ''}`} onClick={() => setStrategicFilter(!strategicFilter)}>
                <span>🎯</span> {t('strategic_priority')}
              </button>
              <button className={`filter-btn ${protectedFilter ? 'active' : ''}`} onClick={() => setProtectedFilter(!protectedFilter)}>
                <span>🛡️</span> {t('protected_slot')}
              </button>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-title">{t('monthly_brief')}</div>
            <div className="sidebar-stats">
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'var(--primary)' }}></span>
                  {t('total_scheduled')}
                </span>
                <span className="stat-count">{totalMonthEvents}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'hsl(210, 70%, 70%)' }}></span>
                  {t('meetings')}
                </span>
                <span className="stat-count">{meetingsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'hsl(45, 80%, 70%)' }}></span>
                  {t('briefings')}
                </span>
                <span className="stat-count">{briefingsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'hsl(340, 70%, 80%)' }}></span>
                  {t('travel')}
                </span>
                <span className="stat-count">{travelCount}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-title">{t('next_directive')}</div>
            <div className="upcoming-widget">
              {upcomingEvent ? (
                <div className="upcoming-card" style={{ '--event-color': getEventColor(upcomingEvent.type) }}>
                  <span className="upcoming-time">
                    {new Date(upcomingEvent.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                    {new Date(upcomingEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="upcoming-name" title={upcomingEvent.title}>
                    {getTypeIcon(upcomingEvent.type)} {upcomingEvent.title}
                  </span>
                </div>
              ) : (
                <div className="upcoming-empty">{t('no_upcoming')}</div>
              )}
            </div>
          </div>
        </aside>

        {/* Calendar */}
        <section className="calendar-card">
          {viewMode === 'grid' && (
            <div className="cal-grid">
              {days_short.map(d => (
                <div className="cal-day-header" key={d}>{d}</div>
              ))}
              {weeks.map((w, i) => (
                <React.Fragment key={i}>
                  {w.map((d, j) => {
                    const isToday = d && d === now.getDate() && month === now.getMonth() && year === now.getFullYear()
                    const cellClass = d ? `cal-cell ${isToday ? 'today' : ''}` : 'cal-cell empty-cell'
                    return (
                      <div className={cellClass} key={j}>
                        {d && <div className="cal-date">{d}</div>}
                        <div className="day-events">
                          {d && filteredEvents
                            .filter(ev => new Date(ev.start_time).getDate() === d)
                            .map(ev => {
                              const color = getEventColor(ev.type)
                              const pillBg = color.includes('hsl') ? color.replace('hsl', 'hsla').replace(')', ', 0.12)') : color
                              const pillBorder = `1px solid ${color.includes('hsl') ? color.replace('hsl', 'hsla').replace(')', ', 0.25)') : color}`
                              const pillColor = color.includes('hsl') ? color.replace('70%', '35%').replace('80%', '40%') : '#333'
                              return (
                                <div
                                  className="cal-event-pill"
                                  key={ev.id}
                                  style={{ background: pillBg, border: pillBorder, borderLeft: `3px solid ${color}`, color: pillColor }}
                                  title={`${ev.type?.toUpperCase()}\n${ev.priority || 'Medium'}\n${ev.description || ''}`}
                                  onDoubleClick={() => openEdit(ev)}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                                    <span>{getTypeIcon(ev.type)}</span>
                                    <span className="event-title-text" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                                    {ev.is_strategic && <span title={t('strategic_priority')}>🎯</span>}
                                    {ev.is_protected && <span title={t('protected_slot')}>🛡️</span>}
                                  </div>
                                  <button
                                    className="cal-event-delete-btn"
                                    onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id) }}
                                    title={t('delete')}
                                  >×</button>
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="etime-list-container">
              {filteredEvents.length === 0 ? (
                <div className="list-empty-state">
                  <div className="list-empty-icon">📅</div>
                  <div className="list-empty-title">{t('no_events_found')}</div>
                  <div className="list-empty-subtitle">{t('adjust_filters')}</div>
                </div>
              ) : (
                filteredEvents
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .map(ev => {
                    const eventColor = getEventColor(ev.type)
                    const startTimeStr = new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    const endTimeStr = ev.end_time ? new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
                    const dateStr = new Date(ev.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                    return (
                      <div key={ev.id} className="timeline-event-card" style={{ '--event-color': eventColor }}>
                        <div className="timeline-time-info">
                          <span className="timeline-date">{dateStr}</span>
                          <span className="timeline-time">{startTimeStr} {endTimeStr && `- ${endTimeStr}`}</span>
                        </div>
                        <div className="timeline-main-content">
                          <div className="timeline-title-wrap">
                            <h3 className="timeline-title">{ev.title}</h3>
                            <span className="type-badge" style={{ background: eventColor.replace('hsl', 'hsla').replace(')', ', 0.15)'), color: eventColor.replace('70%', '35%').replace('80%', '40%') }}>
                              {getTypeIcon(ev.type)} {ev.type}
                            </span>
                            {ev.priority && (
                              <span className={`priority-badge priority-${ev.priority.toLowerCase()}`}>{ev.priority}</span>
                            )}
                            {ev.is_strategic && <span className="type-badge" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>🎯 {t('strategic_priority')}</span>}
                            {ev.is_protected && <span className="type-badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>🛡️ {t('protected_slot')}</span>}
                          </div>
                          {ev.description && <p className="timeline-desc">{ev.description}</p>}
                          <div className="timeline-meta">
                            {ev.location && <span className="meta-item">📍 {ev.location}</span>}
                            {ev.meeting_link && (
                              <span className="meta-item">
                                🔗 <a href={ev.meeting_link} target="_blank" rel="noopener noreferrer" className="meta-link">Join Meeting</a>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="timeline-actions">
                          <button className="btn-icon" onClick={() => openEdit(ev)} title={t('edit')}>✏️</button>
                          <button className="btn-icon btn-delete" onClick={() => deleteEvent(ev.id)} title={t('delete')}>🗑️</button>
                        </div>
                      </div>
                    )
                  })
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
