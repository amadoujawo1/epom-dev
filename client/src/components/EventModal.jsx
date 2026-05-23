import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function EventModal({ isOpen, onClose, onSave, event }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: '', description: '', date: '', startTime: '', endTime: '',
    type: 'meeting', recurrence: 'none', location: '', meetingLink: '', priority: 'Medium'
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setForm({
      title: event?.title || '',
      description: event?.description || '',
      date: event?.start_time ? event.start_time.slice(0, 10) : '',
      startTime: event?.start_time ? event.start_time.slice(11, 16) : '',
      endTime: event?.end_time ? event.end_time.slice(11, 16) : '',
      type: event?.type || 'meeting',
      recurrence: event?.recurrence || 'none',
      location: event?.location || '',
      meetingLink: event?.meeting_link || '',
      priority: event?.priority || 'Medium',
    });
    setShowPreview(false);
  }, [isOpen, event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { date, startTime, endTime, ...rest } = form;
    const payload = { ...rest };
    if (date) {
      if (startTime) payload.start_time = `${date}T${startTime}:00`;
      if (endTime) payload.end_time = `${date}T${endTime}:00`;
    }
    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel modal-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-icon">{isEdit ? '✏️' : '📅'}</div>
            <div>
              <div className="modal-title">{isEdit ? 'Edit Event' : 'New Event'}</div>
              <div className="modal-subtitle">{isEdit ? 'Update event details' : 'Schedule a new event'}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Title <span className="req">*</span></label>
              <input name="title" placeholder="Event title…" value={form.title} onChange={handleChange} required />
            </div>

            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label>Date <span className="req">*</span></label>
                <input type="date" name="date" value={form.date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label>Start Time <span className="req">*</span></label>
                <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>End Time <span className="req">*</span></label>
                <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={form.type} onChange={handleChange}>
                  <option value="meeting">Meeting</option>
                  <option value="briefing">Briefing</option>
                  <option value="travel">Travel</option>
                </select>
              </div>
              <div className="form-group">
                <label>Recurrence</label>
                <select name="recurrence" value={form.recurrence} onChange={handleChange}>
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Location</label>
              <input name="location" placeholder="Location or venue…" value={form.location} onChange={handleChange} />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Meeting Link</label>
              <input name="meetingLink" placeholder="https://…" value={form.meetingLink} onChange={handleChange} />
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Description</label>
              <textarea
                name="description"
                placeholder="Event notes or agenda (Markdown supported)…"
                value={form.description}
                onChange={handleChange}
                rows={3}
                style={{ minHeight: '80px' }}
              />
              <div style={{ marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => setShowPreview(p => !p)}
                >
                  {showPreview ? 'Hide Preview' : 'Preview Markdown'}
                </button>
              </div>
              {showPreview && form.description && (
                <div className="markdown-preview" style={{ marginTop: '8px' }}
                  dangerouslySetInnerHTML={{ __html: marked(form.description) }}
                />
              )}
            </div>
          </div>

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
