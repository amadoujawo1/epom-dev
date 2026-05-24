import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { marked } from 'marked';

export default function DocumentModal({ isOpen, onClose, onSave, submitting, categories, templates, initialData }) {
  const { t } = useLanguage();
  
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'Low',
    category: 'Draft Documents',
    file: null
  });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm(initialData);
      } else {
        setForm({
          title: '',
          content: '',
          priority: 'Low',
          category: 'Draft Documents',
          file: null
        });
      }
      setShowPreview(false);
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'file') {
      setForm(prev => ({ ...prev, file: files[0] }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-icon">📄</div>
            <div>
              <div className="modal-title">{t('new_document').toUpperCase()}</div>
              <div className="modal-subtitle">{t('einfo_desc')}</div>
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
                placeholder={t('doc_title_placeholder')}
                value={form.title}
                onChange={handleChange}
                required
                autoFocus
              />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label>{t('priority')}</label>
                <select name="priority" value={form.priority} onChange={handleChange}>
                  <option value="Low">{t('priority_low')}</option>
                  <option value="Medium">{t('priority_medium')}</option>
                  <option value="High">{t('priority_high')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('category')}</label>
                <select name="category" value={form.category} onChange={handleChange}>
                  {categories.map(({ key, dbVal }) => (
                    <option key={key} value={dbVal}>{t(key)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{t('doc_content_label')}</label>
              <textarea
                name="content"
                placeholder={t('doc_content_placeholder')}
                value={form.content}
                onChange={handleChange}
                style={{ minHeight: '160px', fontFamily: 'monospace' }}
              />
            </div>

            {showPreview && form.content && (
              <div className="markdown-preview" style={{ 
                marginTop: '10px', 
                padding: '15px', 
                background: 'var(--bg-alt)', 
                borderRadius: '8px',
                border: '1px solid var(--border)',
                maxHeight: '200px',
                overflowY: 'auto'
              }} dangerouslySetInnerHTML={{ __html: marked(form.content) }} />
            )}

            <div className="form-group">
              <label>{t('attach_file')}</label>
              <input type="file" name="file" onChange={handleChange} />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px' }}>
            <button type="button" className="btn btn-outline" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? t('hide_preview') : t('preview_md')}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>{t('cancel')}</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? t('saving') : t('create_document')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
