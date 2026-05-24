import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function DirectiveModal({ isOpen, onClose, onSave, submitting }) {
  const { t } = useLanguage();
  
  const [form, setForm] = useState({
    title: '',
    owner: '',
    due: '',
    priority: 'Medium'
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        title: '',
        owner: '',
        due: '',
        priority: 'Medium'
      });
    }
  }, [isOpen]);

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
              <div className="modal-title">{t('new_directive').toUpperCase()}</div>
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
              <label>{t('owner')}</label>
              <input
                name="owner"
                placeholder={t('owner_placeholder')}
                value={form.owner}
                onChange={handleChange}
              />
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
              {submitting ? t('creating') : t('create_directive')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
