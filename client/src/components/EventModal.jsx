import React, { useState, useEffect } from 'react';
import './EventModal.css';
import { marked } from 'marked';

/**
 * EventModal – reusable modal for creating or editing an event.
 * Props:
 *   isOpen (bool) – show/hide modal
 *   onClose (func) – called when modal should be dismissed
 *   onSave (func) – called with event payload when user submits
 *   event (object|null) – if provided, modal works in edit mode and pre‑fills fields
 */
export default function EventModal({ isOpen, onClose, onSave, event }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.start_time ? event.start_time.slice(0, 10) : '', // YYYY‑MM‑DD
    startTime: event?.start_time ? event.start_time.slice(11, 16) : '', // HH:MM
    endTime: event?.end_time ? event.end_time.slice(11, 16) : '',
    type: event?.type || 'meeting',
    recurrence: event?.recurrence || 'none',
    location: event?.location || '',
    meetingLink: event?.meeting_link || ''
  });
  const [showPreview, setShowPreview] = useState(false);

  // Reset form when modal opens/closes or event changes
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
      meetingLink: event?.meeting_link || ''
    });
    setShowPreview(false);
  }, [isOpen, event]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Build ISO strings for start/end if date & time provided
    const { date, startTime, endTime } = form;
    const payload = { ...form };
    if (date) {
      if (startTime) payload.start_time = `${date}T${startTime}:00`;
      if (endTime) payload.end_time = `${date}T${endTime}:00`;
    }
    // Clean up temporary fields before sending to backend
    delete payload.startTime;
    delete payload.endTime;
    delete payload.date;
    onSave(payload);
  };

  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">{isEdit ? 'Edit Event' : 'Create Event'}</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            name="title"
            placeholder="Event Title"
            value={form.title}
            onChange={handleChange}
            required
          />
          <textarea
            name="description"
            placeholder="Description (markdown)"
            value={form.description}
            onChange={handleChange}
            rows={4}
          />
          <div className="preview-toggle">
            <label>
              <input
                type="checkbox"
                checked={showPreview}
                onChange={() => setShowPreview((p) => !p)}
              />
              Show Preview
            </label>
          </div>
          {showPreview && (
            <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(form.description || '') }} />
          )}
          <input type="date" name="date" value={form.date} onChange={handleChange} required />
          <input type="time" name="startTime" value={form.startTime} onChange={handleChange} required />
          <input type="time" name="endTime" value={form.endTime} onChange={handleChange} required />
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="meeting">Meeting</option>
            <option value="briefing">Briefing</option>
            <option value="travel">Travel</option>
          </select>
          <select name="recurrence" value={form.recurrence} onChange={handleChange}>
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
          <input name="meetingLink" placeholder="Meeting Link" value={form.meetingLink} onChange={handleChange} />
          <div className="modal-actions">
            <button type="submit" className="btn-primary">{isEdit ? 'Save' : 'Create'}</button>
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
