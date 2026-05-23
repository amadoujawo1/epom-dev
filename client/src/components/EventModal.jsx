import React, { useState, useEffect } from 'react';

const TYPE_OPTIONS = [
  { value: 'meeting', label: 'Meeting', icon: '👥' },
  { value: 'briefing', label: 'Briefing', icon: '📢' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'training', label: 'Training', icon: '🎓' },
  { value: 'other', label: 'Other', icon: '📅' },
];

const PRIORITY_OPTIONS = [
  { value: 'Low', color: '#22c55e' },
  { value: 'Medium', color: '#f59e0b' },
  { value: 'High', color: '#ef4444' },
  { value: 'Critical', color: '#7c3aed' },
];

function parseAttendees(raw) {
  if (!raw) return '';
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(', ') : String(raw);
  } catch {
    return String(raw);
  }
}

function splitAttendees(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export default function EventModal({ isOpen, onClose, onSave, event }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'meeting',
    recurrence: 'none',
    location: '',
    meeting_link: '',
    priority: 'Medium',
    mandatory_attendees: '',
    optional_attendees: '',
  });
  const [activeSection, setActiveSection] = useState('details');

  useEffect(() => {
    if (!isOpen) return;
    setActiveSection('details');
    setForm({
      title: event?.title || '',
      description: event?.description || '',
      date: event?.start_time ? event.start_time.slice(0, 10) : '',
      startTime: event?.start_time ? event.start_time.slice(11, 16) : '',
      endTime: event?.end_time ? event.end_time.slice(11, 16) : '',
      type: event?.type || 'meeting',
      recurrence: event?.recurrence || 'none',
      location: event?.location || '',
      meeting_link: event?.meeting_link || '',
      priority: event?.priority || 'Medium',
      mandatory_attendees: parseAttendees(event?.mandatory_attendees),
      optional_attendees: parseAttendees(event?.optional_attendees),
    });
  }, [isOpen, event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.startTime || !form.endTime) {
      return;
    }
    const payload = {
      title: form.title,
      description: form.description,
      start_time: `${form.date}T${form.startTime}:00`,
      end_time: `${form.date}T${form.endTime}:00`,
      type: form.type,
      recurrence: form.recurrence,
      location: form.location,
      meeting_link: form.meeting_link,
      priority: form.priority,
      mandatory_attendees: splitAttendees(form.mandatory_attendees),
      optional_attendees: splitAttendees(form.optional_attendees),
    };
    onSave(payload);
  };

  if (!isOpen) return null;

  const selectedType = TYPE_OPTIONS.find(t => t.value === form.type) || TYPE_OPTIONS[0];
  const selectedPriority = PRIORITY_OPTIONS.find(p => p.value === form.priority) || PRIORITY_OPTIONS[1];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel event-modal-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-icon">{selectedType.icon}</div>
            <div>
              <div className="modal-title">{isEdit ? 'Edit Event' : 'Establish Meeting'}</div>
              <div className="modal-subtitle">
                {isEdit ? 'Update event details below' : 'Schedule a new tactical event'}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        {/* Section tabs */}
        <div className="event-modal-tabs">
          {['details', 'people', 'notes'].map(tab => (
            <button
              key={tab}
              type="button"
              className={`event-modal-tab ${activeSection === tab ? 'active' : ''}`}
              onClick={() => setActiveSection(tab)}
            >
              {tab === 'details' && '📋 Details'}
              {tab === 'people' && '👥 Attendees'}
              {tab === 'notes' && '📝 Notes'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* ── DETAILS SECTION ── */}
            {activeSection === 'details' && (
              <div className="event-section">

                {/* Title */}
                <div className="form-group">
                  <label>Event Title <span className="req">*</span></label>
                  <input
                    name="title"
                    placeholder="e.g. Weekly Operations Briefing"
                    value={form.title}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                {/* Type pills */}
                <div className="form-group">
                  <label>Event Type</label>
                  <div className="type-pill-group">
                    {TYPE_OPTIONS.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        className={`type-pill ${form.type === t.value ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, type: t.value }))}
                      >
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date + Priority */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Date <span className="req">*</span></label>
                    <input type="date" name="date" value={form.date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <div className="priority-pill-group">
                      {PRIORITY_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          className={`priority-pill ${form.priority === p.value ? 'active' : ''}`}
                          style={{ '--p-color': p.color }}
                          onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                        >
                          {p.value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Start + End time */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time <span className="req">*</span></label>
                    <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>End Time <span className="req">*</span></label>
                    <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
                  </div>
                </div>

                {/* Recurrence */}
                <div className="form-group">
                  <label>Recurrence</label>
                  <select name="recurrence" value={form.recurrence} onChange={handleChange}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Location + Link */}
                <div className="form-group">
                  <label>Location</label>
                  <input
                    name="location"
                    placeholder="Conference room, building, or address…"
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>Meeting Link</label>
                  <input
                    name="meeting_link"
                    placeholder="https://meet.example.com/…"
                    value={form.meeting_link}
                    onChange={handleChange}
                    type="url"
                  />
                </div>
              </div>
            )}

            {/* ── PEOPLE SECTION ── */}
            {activeSection === 'people' && (
              <div className="event-section">
                <div className="attendees-hint">
                  Enter names or email addresses separated by commas.
                </div>

                <div className="form-group">
                  <label>
                    <span className="attendee-label-dot" style={{ background: '#ef4444' }}></span>
                    Mandatory Attendees
                  </label>
                  <textarea
                    name="mandatory_attendees"
                    placeholder="john.doe@example.com, Jane Smith, …"
                    value={form.mandatory_attendees}
                    onChange={handleChange}
                    rows={3}
                  />
                  {form.mandatory_attendees && (
                    <div className="attendee-chips">
                      {splitAttendees(form.mandatory_attendees).map((a, i) => (
                        <span key={i} className="attendee-chip mandatory">{a}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    <span className="attendee-label-dot" style={{ background: '#6366f1' }}></span>
                    Optional Attendees
                  </label>
                  <textarea
                    name="optional_attendees"
                    placeholder="john.doe@example.com, Jane Smith, …"
                    value={form.optional_attendees}
                    onChange={handleChange}
                    rows={3}
                  />
                  {form.optional_attendees && (
                    <div className="attendee-chips">
                      {splitAttendees(form.optional_attendees).map((a, i) => (
                        <span key={i} className="attendee-chip optional">{a}</span>
                      ))}
                    </div>
                  )}
                </div>

                {(form.mandatory_attendees || form.optional_attendees) && (
                  <div className="attendee-summary">
                    <span>
                      {splitAttendees(form.mandatory_attendees).length + splitAttendees(form.optional_attendees).length} total attendee(s)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── NOTES SECTION ── */}
            {activeSection === 'notes' && (
              <div className="event-section">
                <div className="form-group">
                  <label>Agenda / Notes</label>
                  <textarea
                    name="description"
                    placeholder="Outline the agenda, objectives, or background information…"
                    value={form.description}
                    onChange={handleChange}
                    rows={10}
                    style={{ minHeight: '200px' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? '💾 Save Changes' : '✚ Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
