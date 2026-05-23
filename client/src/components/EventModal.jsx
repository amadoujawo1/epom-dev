import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

function parseAttendees(raw) {
  if (!raw) return '';
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(', ') : String(raw);
  } catch { return String(raw); }
}

function splitAttendees(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

export default function EventModal({ isOpen, onClose, onSave, event }) {
  const { t } = useLanguage();
  const isEdit = !!event;

  const TYPE_OPTIONS = [
    { value: 'meeting',  label: t('type_meeting'),  icon: '👥' },
    { value: 'briefing', label: t('type_briefing'), icon: '📢' },
    { value: 'travel',   label: t('type_travel'),   icon: '✈️' },
    { value: 'training', label: t('type_training'), icon: '🎓' },
    { value: 'other',    label: t('type_other'),    icon: '📅' },
  ];

  const PRIORITY_OPTIONS = [
    { value: 'Low',      labelKey: 'priority_low',      color: '#22c55e' },
    { value: 'Medium',   labelKey: 'priority_medium',   color: '#f59e0b' },
    { value: 'High',     labelKey: 'priority_high',     color: '#ef4444' },
    { value: 'Critical', labelKey: 'priority_critical', color: '#7c3aed' },
  ];

  const [form, setForm] = useState({
    title: '', description: '', date: '', startTime: '', endTime: '',
    type: 'meeting', recurrence: 'none', location: '',
    meeting_link: '', priority: 'Medium',
    mandatory_attendees: '', optional_attendees: '',
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
    if (!form.date || !form.startTime || !form.endTime) return;
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
  const mandList = splitAttendees(form.mandatory_attendees);
  const optList = splitAttendees(form.optional_attendees);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel event-modal-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-icon">{selectedType.icon}</div>
            <div>
              <div className="modal-title">{isEdit ? t('event_edit_title') : t('event_new_title')}</div>
              <div className="modal-subtitle">{isEdit ? t('event_edit_sub') : t('event_new_sub')}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        {/* Tabs */}
        <div className="event-modal-tabs">
          {['details', 'people', 'notes'].map(tab => (
            <button
              key={tab}
              type="button"
              className={`event-modal-tab ${activeSection === tab ? 'active' : ''}`}
              onClick={() => setActiveSection(tab)}
            >
              {tab === 'details' && t('tab_details')}
              {tab === 'people' && t('tab_people')}
              {tab === 'notes' && t('tab_notes')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* ── DETAILS ── */}
            {activeSection === 'details' && (
              <div className="event-section">
                <div className="form-group">
                  <label>{t('event_title_label')} <span className="req">*</span></label>
                  <input
                    name="title"
                    placeholder={t('event_title_placeholder')}
                    value={form.title}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>{t('event_type_label')}</label>
                  <div className="type-pill-group">
                    {TYPE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`type-pill ${form.type === opt.value ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({ ...prev, type: opt.value }))}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t('event_date_label')} <span className="req">*</span></label>
                    <input type="date" name="date" value={form.date} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>{t('priority')}</label>
                    <div className="priority-pill-group">
                      {PRIORITY_OPTIONS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          className={`priority-pill ${form.priority === p.value ? 'active' : ''}`}
                          style={{ '--p-color': p.color }}
                          onClick={() => setForm(prev => ({ ...prev, priority: p.value }))}
                        >
                          {t(p.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>{t('event_start_time')} <span className="req">*</span></label>
                    <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
                  </div>
                  <div className="form-group">
                    <label>{t('event_end_time')} <span className="req">*</span></label>
                    <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
                  </div>
                </div>

                <div className="form-group">
                  <label>{t('event_recurrence')}</label>
                  <select name="recurrence" value={form.recurrence} onChange={handleChange}>
                    <option value="none">{t('recurrence_none')}</option>
                    <option value="daily">{t('recurrence_daily')}</option>
                    <option value="weekly">{t('recurrence_weekly')}</option>
                    <option value="monthly">{t('recurrence_monthly')}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('location')}</label>
                  <input name="location" placeholder={t('event_location_placeholder')} value={form.location} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label>{t('event_link_label')}</label>
                  <input name="meeting_link" placeholder={t('event_link_placeholder')} value={form.meeting_link} onChange={handleChange} type="url" />
                </div>
              </div>
            )}

            {/* ── PEOPLE ── */}
            {activeSection === 'people' && (
              <div className="event-section">
                <div className="attendees-hint">{t('attendees_hint')}</div>

                <div className="form-group">
                  <label>
                    <span className="attendee-label-dot" style={{ background: '#ef4444' }}></span>
                    {t('mandatory_attendees')}
                  </label>
                  <textarea
                    name="mandatory_attendees"
                    placeholder="john.doe@example.com, Jane Smith, …"
                    value={form.mandatory_attendees}
                    onChange={handleChange}
                    rows={3}
                  />
                  {mandList.length > 0 && (
                    <div className="attendee-chips">
                      {mandList.map((a, i) => <span key={i} className="attendee-chip mandatory">{a}</span>)}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    <span className="attendee-label-dot" style={{ background: '#6366f1' }}></span>
                    {t('optional_attendees')}
                  </label>
                  <textarea
                    name="optional_attendees"
                    placeholder="john.doe@example.com, Jane Smith, …"
                    value={form.optional_attendees}
                    onChange={handleChange}
                    rows={3}
                  />
                  {optList.length > 0 && (
                    <div className="attendee-chips">
                      {optList.map((a, i) => <span key={i} className="attendee-chip optional">{a}</span>)}
                    </div>
                  )}
                </div>

                {(mandList.length + optList.length) > 0 && (
                  <div className="attendee-summary">
                    {t('attendee_total', { n: mandList.length + optList.length })}
                  </div>
                )}
              </div>
            )}

            {/* ── NOTES ── */}
            {activeSection === 'notes' && (
              <div className="event-section">
                <div className="form-group">
                  <label>{t('agenda_label')}</label>
                  <textarea
                    name="description"
                    placeholder={t('agenda_placeholder')}
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
            <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary">
              {isEdit ? t('save_changes') : t('create_event_btn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
