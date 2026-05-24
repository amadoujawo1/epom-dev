import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { apiFetch } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import DocumentModal from '../components/DocumentModal';
import './EInfo.css';

// ── Standardized Document Templates ──────────────────────────────────────────
const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const isoDate = new Date().toISOString().slice(0, 10);

const TEMPLATES = [
  {
    id: 'briefing_note',
    name: 'Briefing Note',
    icon: '📋',
    desc: 'Standard tactical intelligence briefing',
    category: 'Draft Documents',
    doc_type: 'Briefing Note',
    content: `# BRIEFING NOTE\n\n**Classification:** UNCLASSIFIED  \n**Date:** ${today}  \n**Subject:**  \n\n---\n\n## 1. SITUATION\n\n\n## 2. BACKGROUND\n\n\n## 3. KEY FACTS\n\n- \n- \n- \n\n## 4. ANALYSIS\n\n\n## 5. RECOMMENDATIONS\n\n1. \n2. \n\n## 6. CONCLUSION\n\n\n---\n*Prepared by: [Name]*  \n*Distribution: [Recipients]*`,
  },
  {
    id: 'sitrep',
    name: 'SITREP',
    icon: '🎯',
    desc: 'Situation Report',
    category: 'Draft Documents',
    doc_type: 'SITREP',
    content: `# SITUATION REPORT (SITREP)\n\n**DTG:** ${isoDate}  \n**From:**  \n**To:**  \n**Classification:** UNCLASSIFIED\n\n---\n\n## 1. SITUATION OVERVIEW\n\n\n## 2. FRIENDLY FORCES\n\n\n## 3. THREAT ASSESSMENT\n\n\n## 4. CURRENT STATUS\n\n| Item | Status | Notes |\n|------|--------|-------|\n| | | |\n\n## 5. IMMEDIATE ACTIONS REQUIRED\n\n- [ ] \n- [ ] \n\n## 6. NEXT UPDATE\n\n---\n*Report prepared by: [Name]*`,
  },
  {
    id: 'decision_memo',
    name: 'Decision Memo',
    icon: '⚖️',
    desc: 'Decision memorandum for approval',
    category: 'Pending Approval',
    doc_type: 'Decision Memo',
    content: `# DECISION MEMORANDUM\n\n**Date:** ${today}  \n**To:** [Decision Authority]  \n**From:** [Requesting Office]  \n**Subject:**  \n\n---\n\n## DECISION REQUIRED\n\n\n## BACKGROUND\n\n\n## OPTIONS CONSIDERED\n\n### Option 1:\n**Pros:**  \n**Cons:**\n\n### Option 2:\n**Pros:**  \n**Cons:**\n\n## RECOMMENDATION\n\n\n## RESOURCE IMPLICATIONS\n\n\n---\n**Approved:** ☐ Yes  ☐ No  ☐ With Modifications\n\n**Signature:** _________________________  \n**Date:** ___________`,
  },
  {
    id: 'meeting_minutes',
    name: 'Meeting Minutes',
    icon: '📝',
    desc: 'Structured meeting record',
    category: 'Draft Documents',
    doc_type: 'Meeting Minutes',
    content: `# MEETING MINUTES\n\n**Meeting:**  \n**Date:** ${today}  \n**Time:**  \n**Location:**  \n**Chair:**  \n\n---\n\n## ATTENDEES\n\n| Name | Department | Role |\n|------|------------|------|\n| | | |\n\n## AGENDA ITEMS\n\n### 1.\n**Discussion:**  \n**Decision:**  \n**Action Items:**\n- [ ] [Owner] — [Task] by [Date]\n\n### 2.\n**Discussion:**  \n**Decision:**  \n**Action Items:**\n- [ ] \n\n## ACTION ITEMS SUMMARY\n\n| # | Action | Owner | Due Date | Status |\n|---|--------|-------|----------|--------|\n| 1 | | | | Pending |\n\n## NEXT MEETING\n\n**Date:**  \n**Location:**  \n\n---\n*Minutes recorded by: [Name]*`,
  },
  {
    id: 'after_action',
    name: 'After-Action Review',
    icon: '🔍',
    desc: 'Post-operation review & lessons learned',
    category: 'Draft Documents',
    doc_type: 'After-Action Review',
    content: `# AFTER-ACTION REVIEW (AAR)\n\n**Operation/Event:**  \n**Date of Review:** ${today}  \n**Facilitator:**  \n\n---\n\n## 1. WHAT WAS PLANNED?\n\n\n## 2. WHAT ACTUALLY HAPPENED?\n\n\n## 3. WHAT WENT WELL?\n\n| Observation | Why It Worked | Sustain? |\n|-------------|---------------|----------|\n| | | Yes/No |\n\n## 4. WHAT COULD BE IMPROVED?\n\n| Observation | Root Cause | Improvement Action |\n|-------------|------------|--------------------|\n| | | |\n\n## 5. LESSONS LEARNED\n\n1. \n2. \n3. \n\n---\n*AAR facilitated by: [Name]*`,
  },
  {
    id: 'intel_report',
    name: 'Intelligence Report',
    icon: '🔐',
    desc: 'Formal intelligence assessment',
    category: 'Secure Archive',
    doc_type: 'Intelligence Report',
    content: `# INTELLIGENCE REPORT\n\n**Report ID:** IR-${Date.now().toString().slice(-6)}  \n**Classification:**  \n**Date:** ${today}  \n**Prepared by:**  \n\n---\n\n## EXECUTIVE SUMMARY\n\n\n## SOURCE RELIABILITY\n\n**Source:**  \n**Reliability Rating:** A / B / C / D / E / F  \n**Information Rating:** 1 / 2 / 3 / 4 / 5 / 6\n\n## INFORMATION\n\n\n## ASSESSMENT\n\n\n## IMPLICATIONS\n\n\n## INFORMATION GAPS\n\n- \n- \n\n---\n*This document contains sensitive information. Handle accordingly.*`,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_COLORS = {
  High:   { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', border: 'rgba(239,68,68,0.15)' },
  Medium: { bg: 'rgba(245,158,11,0.08)',  color: '#f59e0b', border: 'rgba(245,158,11,0.15)' },
  Low:    { bg: 'rgba(16,185,129,0.08)',  color: '#10b981', border: 'rgba(16,185,129,0.15)' },
};

const STATUS_META = {
  Draft:            { label: 'Draft',            color: '#94a3b8', icon: '✏️' },
  'Pending Approval': { label: 'Pending',         color: '#f59e0b', icon: '⏳' },
  Approved:         { label: 'Approved',          color: '#10b981', icon: '✅' },
  Rejected:         { label: 'Rejected',          color: '#ef4444', icon: '❌' },
  Archived:         { label: 'Archived',          color: '#6366f1', icon: '🔒' },
};

const CATEGORIES_KEYS = [
  { key: 'cat_all',     dbVal: 'All Documents' },
  { key: 'cat_draft',   dbVal: 'Draft Documents' },
  { key: 'cat_pending', dbVal: 'Pending Approval' },
  { key: 'cat_archive', dbVal: 'Secure Archive' },
];

const CAT_ICONS = {
  cat_all: '📁', cat_draft: '✏️', cat_pending: '⏳', cat_archive: '🔒',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EInfo({ searchQuery, notify }) {
  const { t } = useLanguage();

  // Stored user for role checks
  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })();
  const isAdmin = storedUser?.role === 'Admin';

  // State
  const [docs, setDocs] = useState([]);
  const [categoryKey, setCategoryKey] = useState('cat_all');
  const [sideTab, setSideTab] = useState('categories'); // 'categories' | 'templates'
  const [q, setQ] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // doc id being actioned
  const [viewDoc, setViewDoc] = useState(null); // doc id for fullscreen view
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [briefingOpen, setBriefingOpen] = useState(true);

  const [initialFormData, setInitialFormData] = useState(null);

  // ── Data fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    apiFetch('/api/documents').then(setDocs).catch(err => {
      setDocs([]);
      notify && notify(err.message || t('failed_load_docs'), 'error');
    });
    // Fetch upcoming meetings (next 48h) for auto-briefing
    apiFetch('/api/calendar').then(events => {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      const upcoming = (events || []).filter(ev => {
        const start = new Date(ev.start_time);
        return start >= now && start <= in48h;
      }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      setUpcomingMeetings(upcoming);
    }).catch(() => {});
  }, []);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const activeCatDbVal = CATEGORIES_KEYS.find(c => c.key === categoryKey)?.dbVal || 'All Documents';
  const searchTerm = (searchQuery || q || '').toLowerCase();

  const filteredDocs = docs.filter(d => {
    const matchesCat = categoryKey === 'cat_all' || d.category === activeCatDbVal;
    const matchesSearch = !searchTerm ||
      d.title?.toLowerCase().includes(searchTerm) ||
      d.content?.toLowerCase().includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  // ── Create document ─────────────────────────────────────────────────────────
  function handleSaveDocument(formData) {
    setSubmitting(true);
    const data = new FormData();
    data.append('title', formData.title);
    data.append('content', formData.content);
    data.append('priority', formData.priority);
    data.append('category', formData.category);
    if (formData.file) data.append('file', formData.file);

    apiFetch('/api/documents', { method: 'POST', body: data })
      .then(newDoc => {
        setDocs(prev => [newDoc, ...prev]);
        setIsModalOpen(false);
        setInitialFormData(null);
        notify && notify(t('doc_created'), 'success');
      })
      .catch(() => notify && notify(t('failed_create_doc'), 'error'))
      .finally(() => setSubmitting(false));
  }

  // ── Load template into form ─────────────────────────────────────────────────
  function useTemplate(tpl) {
    setInitialFormData({ 
      title: tpl.name, 
      content: tpl.content, 
      priority: 'Medium', 
      category: tpl.category, 
      file: null 
    });
    setIsModalOpen(true);
    notify && notify(`Template "${tpl.name}" loaded`, 'success');
  }

  function generateBriefing(ev) {
    const briefingTpl = TEMPLATES.find(t => t.id === 'briefing_note');
    const meetingInfo = `
## MEETING DETAILS
- **Title:** ${ev.title}
- **Date:** ${fmtDate(ev.start_time)}
- **Time:** ${fmtTime(ev.start_time)} – ${fmtTime(ev.end_time)}
- **Location:** ${ev.location || 'N/A'}
- **Type:** ${ev.type?.toUpperCase() || 'N/A'}

## OBJECTIVES
${ev.description || 'To be defined...'}

---\n`;
    
    setInitialFormData({ 
      title: `Briefing: ${ev.title}`, 
      content: briefingTpl.content.replace('## 1. SITUATION', `## 1. SITUATION\n\n${meetingInfo}`),
      priority: ev.priority || 'Medium', 
      category: 'Draft Documents', 
      file: null 
    });
    setIsModalOpen(true);
    notify && notify(`Auto-briefing generated for "${ev.title}"`, 'success');
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  function deleteDoc(id) {
    if (!confirm(t('delete_doc_confirm'))) return;
    apiFetch(`/api/documents/${id}`, { method: 'DELETE' })
      .then(() => { setDocs(prev => prev.filter(d => d.id !== id)); notify && notify(t('doc_deleted'), 'success'); })
      .catch(() => notify && notify(t('failed_delete_doc'), 'error'));
  }

  // ── Approval workflow ───────────────────────────────────────────────────────
  async function docAction(id, action) {
    setActionLoading(id + action);
    try {
      const updated = await apiFetch(`/api/documents/${id}/${action}`, { method: 'POST' });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, ...updated } : d));
      const labels = { 'submit-approval': 'Submitted for approval', approve: 'Document approved', reject: 'Document rejected', archive: 'Document archived' };
      notify && notify(labels[action] || 'Done', action === 'reject' ? 'error' : 'success');
    } catch (err) {
      notify && notify(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // ── View document modal ─────────────────────────────────────────────────────
  const viewingDoc = viewDoc !== null ? docs.find(d => d.id === viewDoc) : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="einfo-page">

      {/* ── Auto-Briefing Banner ── */}
      {upcomingMeetings.length > 0 && (
        <div className="briefing-banner" onClick={() => setBriefingOpen(v => !v)}>
          <div className="briefing-banner-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="briefing-pulse" />
              <span className="briefing-banner-title">
                🗓 AUTO-BRIEFING · {upcomingMeetings.length} MEETING{upcomingMeetings.length > 1 ? 'S' : ''} IN NEXT 48H
              </span>
            </div>
            <span className="briefing-toggle-icon">{briefingOpen ? '▲' : '▼'}</span>
          </div>
          {briefingOpen && (
            <div className="briefing-meetings-list" onClick={e => e.stopPropagation()}>
              {upcomingMeetings.map(ev => (
                <div key={ev.id} className="briefing-meeting-item">
                  <div className="briefing-meeting-dot" style={{
                    background: ev.priority === 'High' ? '#ef4444' : ev.priority === 'Medium' ? '#f59e0b' : '#6366f1'
                  }} />
                  <div className="briefing-meeting-info">
                    <div className="briefing-meeting-title">{ev.title}</div>
                    <div className="briefing-meeting-meta">
                      <span>📅 {fmtDate(ev.start_time)}</span>
                      <span>🕐 {fmtTime(ev.start_time)} – {fmtTime(ev.end_time)}</span>
                      {ev.location && <span>📍 {ev.location}</span>}
                      {ev.type && <span className="briefing-type-badge">{ev.type.toUpperCase()}</span>}
                    </div>
                    {ev.description && (
                      <div className="briefing-meeting-desc">{ev.description}</div>
                    )}
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ marginTop: '10px', fontSize: '11px', padding: '4px 10px' }}
                      onClick={(e) => { e.stopPropagation(); generateBriefing(ev); }}
                    >
                      📝 {t('generate_briefing')}
                    </button>
                  </div>
                  <span className="briefing-priority-badge" style={{
                    color: ev.priority === 'High' ? '#ef4444' : ev.priority === 'Medium' ? '#f59e0b' : '#6366f1',
                    background: ev.priority === 'High' ? 'rgba(239,68,68,0.1)' : ev.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                    border: `1px solid ${ev.priority === 'High' ? 'rgba(239,68,68,0.25)' : ev.priority === 'Medium' ? 'rgba(245,158,11,0.25)' : 'rgba(99,102,241,0.25)'}`,
                  }}>{ev.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder={t('search_docs')} value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: '28px', width: '160px', height: '32px', fontSize: 'var(--fs-xs)', borderRadius: '8px' }} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setInitialFormData(null); setIsModalOpen(true); }}>
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>{t('new_document')}</>
            </button>
          </div>
        </div>
      </div>

      <div className="einfo-layout">

        {/* ── Sidebar ── */}
        <aside className="einfo-sidebar-panel">

          {/* Sidebar Tab Switcher */}
          <div className="card" style={{ padding: '6px' }}>
            <div className="einfo-side-tabs">
              <button
                className={`einfo-side-tab ${sideTab === 'categories' ? 'active' : ''}`}
                onClick={() => setSideTab('categories')}
              >📂 {t('categories')}</button>
              <button
                className={`einfo-side-tab ${sideTab === 'templates' ? 'active' : ''}`}
                onClick={() => setSideTab('templates')}
              >🗂 {t('templates_label')}</button>
            </div>
          </div>

          {sideTab === 'categories' && (
            <>
              {/* Category List */}
              <div className="card" style={{ padding: '14px 16px' }}>
                <div className="section-label">{t('categories')}</div>
                <ul className="einfo-cat-list">
                  {CATEGORIES_KEYS.map(({ key, dbVal }) => (
                    <li
                      key={key}
                      className={`einfo-cat-item ${key === categoryKey ? 'active' : ''}`}
                      onClick={() => setCategoryKey(key)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{CAT_ICONS[key]}</span>
                        {t(key)}
                      </span>
                      <span className="badge badge-pending" style={{ fontSize: '10px' }}>
                        {key === 'cat_all' ? docs.length : docs.filter(d => d.category === dbVal).length}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Stats */}
              <div className="card" style={{ padding: '14px 16px' }}>
                <div className="section-label">{t('quick_stats')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { labelKey: 'stat_total_docs', val: docs.length, color: 'var(--primary)' },
                    { labelKey: 'stat_drafts', val: docs.filter(d => d.category === 'Draft Documents').length, color: 'var(--warning)' },
                    { labelKey: 'stat_pending', val: docs.filter(d => d.category === 'Pending Approval' || d.status === 'Pending Approval').length, color: '#f59e0b' },
                    { labelKey: 'stat_archived', val: docs.filter(d => d.category === 'Secure Archive').length, color: 'var(--success)' },
                  ].map(({ labelKey, val, color }) => (
                    <div key={labelKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t(labelKey)}</span>
                      <span style={{ fontWeight: 700, color, fontFamily: 'var(--font-title)', fontSize: '15px' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Principles */}
              <div className="card" style={{ padding: '14px 16px', background: 'linear-gradient(140deg, #0f172a 0%, #1e2d50 100%)', borderColor: 'rgba(99,102,241,0.2)' }}>
                <div className="section-label" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('key_principles')}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '2px' }}>
                  {['principle_1', 'principle_2', 'principle_3'].map(key => (
                    <div key={key} style={{ display: 'flex', gap: '8px', fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                      <span style={{ color: '#10b981', marginTop: '1px', flexShrink: 0 }}>✓</span>
                      {t(key)}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {sideTab === 'templates' && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div className="section-label">{t('templates_label')}</div>
              <div className="section-sublabel" style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                {t('templates_desc')}
              </div>
              <div className="einfo-templates-list">
                {TEMPLATES.map(tpl => (
                  <div key={tpl.id} className="template-card" onClick={() => useTemplate(tpl)}>
                    <div className="template-icon">{tpl.icon}</div>
                    <div className="template-info">
                      <div className="template-name">{tpl.name}</div>
                      <div className="template-desc">{tpl.desc}</div>
                    </div>
                    <div className="template-arrow">›</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ── Main Content ── */}
        <section>

          {/* Document Cards */}
          {filteredDocs.length === 0 ? (
            <div className="card">
              <div className="empty">{docs.length === 0 ? t('no_docs_yet') : t('no_docs_filter')}</div>
            </div>
          ) : (
            <div className="doc-cards-grid">
              {filteredDocs.map(d => {
                const pc = PRIORITY_COLORS[d.priority] || PRIORITY_COLORS.Low;
                const sm = STATUS_META[d.status] || STATUS_META.Draft;
                const isLoading = (id, act) => actionLoading === id + act;
                const isOwner = storedUser?.id === d.uploaded_by;

                return (
                  <div key={d.id} className={`doc-card ${d.category === 'Secure Archive' ? 'doc-card-archived' : ''}`}>
                    {/* Card Header */}
                    <div className="doc-card-header">
                      <div className="doc-card-title" onClick={() => setViewDoc(d.id)} style={{ cursor: 'pointer' }}>
                        {d.category === 'Secure Archive' && <span style={{ marginRight: '5px' }}>🔒</span>}
                        {d.title}
                      </div>
                      <button className="btn btn-xs btn-danger" onClick={() => deleteDoc(d.id)} title={t('delete')} style={{ flexShrink: 0 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>

                    {/* Content preview */}
                    {d.content && (
                      <div className="doc-card-content" onClick={() => setViewDoc(d.id)} style={{ cursor: 'pointer' }}>
                        {d.content.replace(/#+\s|[*_`]/g, '').slice(0, 120)}{d.content.length > 120 ? '…' : ''}
                      </div>
                    )}

                    {/* Uploader & date */}
                    {d.uploader_name && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        By {d.uploader_name} · {fmtDate(d.created)}
                      </div>
                    )}

                    {/* Footer badges */}
                    <div className="doc-card-footer">
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Status badge */}
                        <span className="badge" style={{
                          background: `${sm.color}18`, color: sm.color,
                          border: `1px solid ${sm.color}33`, fontSize: '10px',
                        }}>
                          {sm.icon} {sm.label}
                        </span>
                        {/* Priority badge */}
                        <span className="badge" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, fontSize: '10px' }}>
                          {d.priority || 'Low'}
                        </span>
                        {/* Category badge */}
                        {d.category && d.category !== 'All Documents' && (
                          <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                            {d.category.split(' ')[0]}
                          </span>
                        )}
                        {/* Encrypted badge */}
                        {d.category === 'Secure Archive' && (
                          <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', fontSize: '10px' }}>
                            🔐 Encrypted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Workflow Action Buttons ── */}
                    <div className="doc-workflow-actions">
                      {/* View button */}
                      <button className="btn btn-xs btn-outline" onClick={() => setViewDoc(d.id)}>
                        👁 {t('view')}
                      </button>

                      {/* Submit for Approval (Draft → Pending, by owner or admin) */}
                      {(d.status === 'Draft' || !d.status) && (isOwner || isAdmin) && (
                        <button
                          className="btn btn-xs btn-warning"
                          disabled={!!actionLoading}
                          onClick={() => docAction(d.id, 'submit-approval')}
                        >
                          {isLoading(d.id, 'submit-approval') ? '…' : `⬆ ${t('submit_approval')}`}
                        </button>
                      )}

                      {/* Approve / Reject (Pending → Approved/Rejected, Admin only) */}
                      {d.status === 'Pending Approval' && isAdmin && (
                        <>
                          <button
                            className="btn btn-xs btn-success"
                            disabled={!!actionLoading}
                            onClick={() => docAction(d.id, 'approve')}
                          >
                            {isLoading(d.id, 'approve') ? '…' : `✅ ${t('approve')}`}
                          </button>
                          <button
                            className="btn btn-xs btn-danger"
                            disabled={!!actionLoading}
                            onClick={() => docAction(d.id, 'reject')}
                          >
                            {isLoading(d.id, 'reject') ? '…' : `❌ ${t('reject')}`}
                          </button>
                        </>
                      )}

                      {/* Archive (Approved, Admin only) */}
                      {d.status === 'Approved' && isAdmin && d.category !== 'Secure Archive' && (
                        <button
                          className="btn btn-xs btn-archive"
                          disabled={!!actionLoading}
                          onClick={() => docAction(d.id, 'archive')}
                        >
                          {isLoading(d.id, 'archive') ? '…' : `🔒 ${t('archive')}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Document Viewer Modal ── */}
      {viewingDoc && (
        <div className="modal-backdrop" onClick={() => setViewDoc(null)}>
          <div className="doc-view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-info">
                <div style={{ fontSize: '20px' }}>
                  {viewingDoc.category === 'Secure Archive' ? '🔒' : '📄'}
                </div>
                <div>
                  <div className="modal-title">{viewingDoc.title}</div>
                  <div className="modal-subtitle">
                    {viewingDoc.doc_type && <span style={{ marginRight: '10px' }}>{viewingDoc.doc_type}</span>}
                    {fmtDate(viewingDoc.created)}
                  </div>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setViewDoc(null)}>✕</button>
            </div>
            <div className="doc-view-body">
              {viewingDoc.content
                ? <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: marked(viewingDoc.content) }} />
                : <div className="empty">No content</div>
              }
            </div>
            <div className="doc-view-footer">
              <span className="badge" style={{ background: `${(STATUS_META[viewingDoc.status] || STATUS_META.Draft).color}18`, color: (STATUS_META[viewingDoc.status] || STATUS_META.Draft).color, border: `1px solid ${(STATUS_META[viewingDoc.status] || STATUS_META.Draft).color}33` }}>
                {(STATUS_META[viewingDoc.status] || STATUS_META.Draft).icon} {viewingDoc.status || 'Draft'}
              </span>
              {viewingDoc.category === 'Secure Archive' && (
                <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                  🔐 Secure Archive
                </span>
              )}
              <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setViewDoc(null)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Document Modal ── */}
      <DocumentModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setInitialFormData(null); }}
        onSave={handleSaveDocument}
        submitting={submitting}
        categories={CATEGORIES_KEYS}
        initialData={initialFormData}
      />
    </div>
  );
}
