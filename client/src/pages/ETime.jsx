import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import EventModal from '../components/EventModal';
import { getEventColor } from '../utils/eventColors';

function buildCalendar(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startDay = first.getDay() // 0-6
  const weeks = []
  let week = new Array(7).fill(null)
  let day = 1
  for (let i = 0; i < startDay; i++) week[i] = null
  for (let i = startDay; i < 7; i++) {
    week[i] = day++
  }
  weeks.push(week)
  while (day <= last.getDate()) {
    week = new Array(7).fill(null)
    for (let i = 0; i < 7 && day <= last.getDate(); i++) {
      week[i] = day++
    }
    weeks.push(week)
  }
  return weeks
}

export default function ETime({ searchQuery, notify }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [selectedEvent, setSelectedEvent] = useState(null)
  
  // New Filter States
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    fetchEvents()
  }, [month, year])

  function fetchEvents() {
    apiFetch('/api/calendar?month=' + (month + 1) + '&year=' + year)
      .then(setEvents)
      .catch(err => {
        setEvents([])
        console.error(err)
        if (notify) notify('Failed to load events', 'error')
      })
  }

  // Filter events based on search query, type filter, and priority filter
  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.title?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                         ev.description?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                         ev.location?.toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesType = typeFilter === 'all' || ev.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || ev.priority === priorityFilter;
    return matchesSearch && matchesType && matchesPriority;
  })

  // Monthly stats computed reactively
  const totalMonthEvents = events.length;
  const meetingsCount = events.filter(e => e.type === 'meeting').length;
  const briefingsCount = events.filter(e => e.type === 'briefing').length;
  const travelCount = events.filter(e => e.type === 'travel').length;

  // Next upcoming event (today or future)
  const upcomingEvent = events
    .filter(e => new Date(e.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];

  function openCreate() {
    setSelectedEvent(null);
    setShowForm(true);
  }

  function openEdit(event) {
    setSelectedEvent(event);
    setShowForm(true);
  }

  function handleSave(payload) {
    const method = selectedEvent ? 'PUT' : 'POST';
    const url = selectedEvent ? `/api/calendar/${selectedEvent.id}` : '/api/calendar';
    apiFetch(url, { method, body: JSON.stringify(payload) })
      .then(() => {
        fetchEvents();
        setShowForm(false);
        setSelectedEvent(null);
        if (notify) notify(selectedEvent ? 'Event updated' : 'Event scheduled', 'success')
      })
      .catch(err => {
        console.error(err);
        if (notify) notify('Failed to save event', 'error')
      });
  }

  function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event?')) return
    apiFetch(`/api/calendar/${id}`, { method: 'DELETE' })
      .then(() => {
        fetchEvents();
        if (notify) notify('Event deleted', 'success')
      })
      .catch(err => {
        console.error(err)
        if (notify) notify('Failed to delete event', 'error')
      })
  }

  const weeks = buildCalendar(year, month)

  // Helpers to get icon by event type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting': return '👥';
      case 'briefing': return '📢';
      case 'travel': return '✈️';
      default: return '📅';
    }
  }

  return (
    <div className="etime-page">
      {/* --- Premium Header --- */}
      <div className="etime-header-section">
        <div className="month-title-wrapper">
          <h1 className="month-title">
            {new Date(year, month).toLocaleString('default', { month: 'long' }).toUpperCase()}
          </h1>
          <div className="year-subtitle">Operational Schedule · {year}</div>
        </div>
        <div className="cal-controls">
          <div className="segmented-control">
            <button 
              className={`segmented-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
            >
              GRID VIEW
            </button>
            <button 
              className={`segmented-btn ${viewMode === 'list' ? 'active' : ''}`} 
              onClick={() => setViewMode('list')}
            >
              TIMELINE
            </button>
          </div>
          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => setMonth(prev => prev === 0 ? 11 : prev - 1)}>←</button>
            <button className="today-btn" onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}>TODAY</button>
            <button className="nav-btn" onClick={() => setMonth(prev => prev === 11 ? 0 : prev + 1)}>→</button>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>✚ ESTABLISH MEETING</button>
        </div>
      </div>

      <EventModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        event={selectedEvent}
      />

      {/* --- Main Grid & Sidebar Layout --- */}
      <div className="etime-main-layout">
        
        {/* --- Left Sidebar Filter & Statistics Panel --- */}
        <aside className="etime-sidebar">
          
          <div className="sidebar-card">
            <div className="sidebar-title">Filters</div>
            <div className="filter-group">
              <button className={`filter-btn ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>
                <span>📅</span> All Types
              </button>
              <button className={`filter-btn ${typeFilter === 'meeting' ? 'active' : ''}`} onClick={() => setTypeFilter('meeting')}>
                <span>👥</span> Meetings ({meetingsCount})
              </button>
              <button className={`filter-btn ${typeFilter === 'briefing' ? 'active' : ''}`} onClick={() => setTypeFilter('briefing')}>
                <span>📢</span> Briefings ({briefingsCount})
              </button>
              <button className={`filter-btn ${typeFilter === 'travel' ? 'active' : ''}`} onClick={() => setTypeFilter('travel')}>
                <span>✈️</span> Travel ({travelCount})
              </button>
            </div>
            
            <div className="sidebar-title" style={{ marginTop: '20px' }}>Priority</div>
            <div className="filter-group">
              <button className={`filter-btn ${priorityFilter === 'all' ? 'active' : ''}`} onClick={() => setPriorityFilter('all')}>
                All Priorities
              </button>
              <button className={`filter-btn ${priorityFilter === 'High' ? 'active' : ''}`} onClick={() => setPriorityFilter('High')}>
                🔴 High Priority
              </button>
              <button className={`filter-btn ${priorityFilter === 'Medium' ? 'active' : ''}`} onClick={() => setPriorityFilter('Medium')}>
                🟡 Medium Priority
              </button>
              <button className={`filter-btn ${priorityFilter === 'Low' ? 'active' : ''}`} onClick={() => setPriorityFilter('Low')}>
                ⚪ Low Priority
              </button>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-title">Monthly Brief</div>
            <div className="sidebar-stats">
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'var(--primary)' }}></span>
                  Total Scheduled
                </span>
                <span className="stat-count">{totalMonthEvents}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'hsl(210, 70%, 70%)' }}></span>
                  Meetings
                </span>
                <span className="stat-count">{meetingsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'hsl(45, 80%, 70%)' }}></span>
                  Briefings
                </span>
                <span className="stat-count">{briefingsCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label-wrap">
                  <span className="stat-dot" style={{ background: 'hsl(340, 70%, 80%)' }}></span>
                  Travel
                </span>
                <span className="stat-count">{travelCount}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <div className="sidebar-title">Next Directive</div>
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
                <div className="upcoming-empty">No upcoming events scheduled.</div>
              )}
            </div>
          </div>

        </aside>

        {/* --- Main Content Section --- */}
        <section className="calendar-card">
          
          {/* --- Grid View Mode --- */}
          {viewMode === 'grid' && (
            <div className="cal-grid">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                <div className="cal-day-header" key={d}>{d}</div>
              ))}
              {weeks.map((w, i) => (
                <React.Fragment key={i}>
                  {w.map((d, j) => {
                    const isToday = d && d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                    const cellClass = d ? `cal-cell ${isToday ? 'today' : ''}` : 'cal-cell empty-cell';
                    
                    return (
                      <div className={cellClass} key={j}>
                        {d && <div className="cal-date">{d}</div>}
                        <div className="day-events">
                          {d && filteredEvents
                            .filter(ev => new Date(ev.start_time).getDate() === d)
                            .map(ev => {
                              const color = getEventColor(ev.type);
                              const pillBg = color.includes('hsl') ? color.replace('hsl', 'hsla').replace(')', ', 0.12)') : color;
                              const pillBorder = `1px solid ${color.includes('hsl') ? color.replace('hsl', 'hsla').replace(')', ', 0.25)') : color}`;
                              const pillColor = color.includes('hsl') ? color.replace('70%', '35%').replace('80%', '40%') : '#333';
                              
                              return (
                                <div 
                                  className="cal-event-pill" 
                                  key={ev.id} 
                                  style={{
                                    background: pillBg,
                                    border: pillBorder,
                                    borderLeft: `3px solid ${color}`,
                                    color: pillColor,
                                  }} 
                                  title={`Type: ${ev.type.toUpperCase()}\nPriority: ${ev.priority || 'Medium'}\n${ev.description || ''}`} 
                                  onDoubleClick={() => openEdit(ev)}
                                >
                                  <span>{getTypeIcon(ev.type)} {ev.title}</span>
                                  <button 
                                    className="cal-event-delete-btn" 
                                    onClick={(e) => { e.stopPropagation(); deleteEvent(ev.id); }}
                                    title="Delete event"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* --- List/Timeline View Mode --- */}
          {viewMode === 'list' && (
            <div className="etime-list-container">
              {filteredEvents.length === 0 ? (
                <div className="list-empty-state">
                  <div className="list-empty-icon">📅</div>
                  <div className="list-empty-title">No events found</div>
                  <div className="list-empty-subtitle">Try adjusting your filters or search query.</div>
                </div>
              ) : (
                filteredEvents
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .map(ev => {
                    const eventColor = getEventColor(ev.type);
                    const startTimeStr = new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const endTimeStr = ev.end_time ? new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
                    const dateStr = new Date(ev.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                    
                    return (
                      <div key={ev.id} className="timeline-event-card" style={{ '--event-color': eventColor }}>
                        <div className="timeline-time-info">
                          <span className="timeline-date">{dateStr}</span>
                          <span className="timeline-time">{startTimeStr} {endTimeStr && `- ${endTimeStr}`}</span>
                        </div>
                        
                        <div className="timeline-main-content">
                          <div className="timeline-title-wrap">
                            <h3 className="timeline-title">{ev.title}</h3>
                            <span 
                              className="type-badge" 
                              style={{ 
                                background: eventColor.replace('hsl', 'hsla').replace(')', ', 0.15)'), 
                                color: eventColor.replace('70%', '35%').replace('80%', '40%') 
                              }}
                            >
                              {getTypeIcon(ev.type)} {ev.type}
                            </span>
                            {ev.priority && (
                              <span className={`priority-badge priority-${ev.priority.toLowerCase()}`}>
                                {ev.priority}
                              </span>
                            )}
                          </div>
                          {ev.description && <p className="timeline-desc">{ev.description}</p>}
                          
                          <div className="timeline-meta">
                            {ev.location && (
                              <span className="meta-item">📍 {ev.location}</span>
                            )}
                            {ev.meeting_link && (
                              <span className="meta-item">
                                🔗 <a href={ev.meeting_link} target="_blank" rel="noopener noreferrer" className="meta-link">Join Meeting</a>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="timeline-actions">
                          <button className="btn-icon" onClick={() => openEdit(ev)} title="Edit Event">✏️</button>
                          <button className="btn-icon btn-delete" onClick={() => deleteEvent(ev.id)} title="Delete Event">🗑️</button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

        </section>

      </div>
    </div>
  )
}
