import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import EventModal from '../components/EventModal';
import { getEventColor } from '../utils/eventColors';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './ETime.css';

const localizer = momentLocalizer(moment);

export default function ETime({ searchQuery, notify }) {
  const { t, lang } = useLanguage()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState('month')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [strategicFilter, setStrategicFilter] = useState(false)
  const [protectedFilter, setProtectedFilter] = useState(false)
  const [currentDate, setCurrentDate] = useState(now)

  useEffect(() => { fetchEvents() }, [month, year])

  function fetchEvents() {
    // Basic fetch without month/year filters so the calendar has all data to switch views.
    apiFetch('/api/calendar')
      .then(setEvents)
      .catch(err => {
        setEvents([])
        console.error(err)
        if (notify) notify(err.message || t('failed_load_events'), 'error')
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

  const rbcEvents = filteredEvents.map(ev => ({
    ...ev,
    start: new Date(ev.start_time),
    end: new Date(ev.end_time),
  }));

  const totalMonthEvents = events.length
  const meetingsCount = events.filter(e => e.type === 'meeting').length
  const briefingsCount = events.filter(e => e.type === 'briefing').length
  const travelCount = events.filter(e => e.type === 'travel').length
  const workshopsCount = events.filter(e => e.type === 'workshop').length

  const upcomingEvent = events
    .filter(e => new Date(e.start_time) >= new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0]

  function openCreate({ start, end }) { 
      setSelectedEvent(start && end ? { start_time: start.toISOString(), end_time: end.toISOString() } : null); 
      setShowForm(true) 
  }
  
  function openEdit(event) { setSelectedEvent(event); setShowForm(true) }

  function handleSave(payload) {
    const method = selectedEvent?.id ? 'PUT' : 'POST'
    const url = selectedEvent?.id ? `/api/calendar/${selectedEvent.id}` : '/api/calendar'
    apiFetch(url, { method, body: JSON.stringify(payload) })
      .then(() => {
        fetchEvents()
        setShowForm(false)
        setSelectedEvent(null)
        if (notify) notify(t(selectedEvent?.id ? 'event_updated' : 'event_scheduled'), 'success')
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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting': return '👥'
      case 'briefing': return '📢'
      case 'travel': return '✈️'
      case 'workshop': return '🛠️'
      case 'workship': return '⛪'
      default: return '📅'
    }
  }

  const eventStyleGetter = (event) => {
      const color = getEventColor(event.type)
      const pillBg = color.includes('hsl') ? color.replace('hsl', 'hsla').replace(')', ', 0.12)') : color
      const pillBorder = `1px solid ${color.includes('hsl') ? color.replace('hsl', 'hsla').replace(')', ', 0.25)') : color}`
      const pillColor = color.includes('hsl') ? color.replace('70%', '35%').replace('80%', '40%') : '#333'
      return {
          style: {
              backgroundColor: pillBg,
              border: pillBorder,
              borderLeft: `3px solid ${color}`,
              color: pillColor,
              borderRadius: '4px',
              padding: '2px 4px',
              display: 'block'
          }
      };
  };

  return (
    <div className="etime-page">
      <div className="etime-header-section">
        <div className="month-title-wrapper">
          <h1 className="month-title">{t('calendar')}</h1>
        </div>
        <div className="cal-controls">
          <button className="btn btn-primary" onClick={() => openCreate({})}>{t('establish_meeting')}</button>
        </div>
      </div>

      <EventModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSave}
        event={selectedEvent}
      />

      <div className="etime-main-layout">
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
              <button className={`filter-btn ${typeFilter === 'workshop' ? 'active' : ''}`} onClick={() => setTypeFilter('workshop')}>
                <span>🛠️</span> {t('type_workshop')} ({workshopsCount})
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

        <section className="calendar-card" style={{ height: '80vh' }}>
            <Calendar
                localizer={localizer}
                events={rbcEvents}
                startAccessor="start"
                endAccessor="end"
                view={viewMode}
                onView={setViewMode}
                date={currentDate}
                onNavigate={setCurrentDate}
                selectable
                onSelectSlot={(slotInfo) => openCreate(slotInfo)}
                onSelectEvent={(event) => openEdit(event)}
                eventPropGetter={eventStyleGetter}
                components={{
                    event: ({ event }) => (
                        <span>
                            {getTypeIcon(event.type)} {event.title}
                        </span>
                    )
                }}
            />
        </section>
      </div>
    </div>
  )
}
