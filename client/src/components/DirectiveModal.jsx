import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function DirectiveModal({ isOpen, onClose, onSave, submitting, action }) {
  const { t } = useLanguage();
  const [personnel, setPersonnel] = useState([]);
  
  const [form, setForm] = useState({
    title: '',
    owner: '',
    due: '',
    priority: 'Medium'
  });

  useEffect(() => {
    // Fetch personnel
    fetch('/api/personnel', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPersonnel(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (action) {
        setForm({
          title: action.title || '',
          owner: action.owner || '',
          due: action.due || action.due_date ? new Date(action.due || action.due_date).toISOString().split('T')[0] : '',
          priority: action.priority || 'Medium'
        });
      } else {
        setForm({
          title: '',
          owner: '',
          due: '',
          priority: 'Medium'
        });
      }
    }
  }, [isOpen, action]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  if (!isOpen) return null;

  const PRIORITY_OPTIONS = [
    { value: 'Low',      labelKey: 'priority_low',      color: '#22c55e' },
    { value: 'Medium',   labelKey: 'priority_medium',   color: '#f59e0b' },
    { value: 'High',     labelKey: 'priority_high',     color: '#ef4444' },
    { value: 'Critical', labelKey: 'priority_critical', color: '#7c3aed' },
  ];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-icon">⚡</div>
            <div>
              <div className="modal-title">{action ? t('edit_directive') || 'EDIT DIRECTIVE' : t('new_directive').toUpperCase()}</div>
              <div className="modal-subtitle">{t('eaction_sub')}</div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>{t('title')} <span className="req">*</span></label>
              <input
                name="title"
                placeholder={t('directive_title_placeholder')}
                value={form.title}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>{t('owner')} (Responsible Person)</label>
              <select
                name="owner"
                value={form.owner}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)' }}
              >
                <option value="">-- {t('unassigned')} --</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.username}>{p.name} ({p.username})</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('due_date')}</label>
                <input
                  type="date"
                  name="due"
                  value={form.due}
                  onChange={handleChange}
                />
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
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('saving') || 'Saving...' : (action ? t('save_changes') || 'Save Changes' : t('create_directive'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
