import React, { useState, useEffect, useRef } from 'react';

// ─── SVG Icons ───
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
const IconSave = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconCancel = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const IconPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTarget = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconZap = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconFileText = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconUser = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconCalendar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconTag = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;

// ─── Priority badge config ───────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'Cao',    color: '#ea4335', bg: 'rgba(234,67,53,0.10)',   icon: <circle cx="12" cy="12" r="10" fill="currentColor"/> },
  medium: { label: 'Vừa',   color: '#fbbc04', bg: 'rgba(251,188,4,0.12)',   icon: <circle cx="12" cy="12" r="10" fill="currentColor"/> },
  low:    { label: 'Thấp',  color: '#34a853', bg: 'rgba(52,168,83,0.10)',   icon: <circle cx="12" cy="12" r="10" fill="currentColor"/> },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const DecisionCard = ({ decision, index }) => {
  if (typeof decision === 'string') {
    return (
      <div style={{ padding: 'var(--space-3)', background: 'var(--bg-body)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
        <span style={{ color: 'var(--google-green)', fontWeight: 700, marginRight: '4px' }}>{index + 1}.</span> {decision}
      </div>
    );
  }
  
  return (
    <div style={{ padding: 'var(--space-3)', background: 'var(--bg-body)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }}>
      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', fontSize: 'var(--text-md)' }}>
        <span style={{ color: 'var(--google-green)', marginRight: '4px' }}>{index + 1}.</span> 
        {decision.subject && `[${decision.subject}] `}{decision.action}
      </div>
      {decision.outcome && (
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          <span style={{ fontWeight: 600 }}>Kết quả/Hệ quả:</span> {decision.outcome}
        </div>
      )}
    </div>
  );
};

const PriorityBadge = ({ priority = 'medium' }) => {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.02em',
      padding: '2px 8px', borderRadius: 'var(--radius-full)',
      color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap',
    }}>
      <svg width="8" height="8" viewBox="0 0 24 24">{cfg.icon}</svg> {cfg.label}
    </span>
  );
};

const KeyTopicTags = ({ topics = [] }) => {
  if (!topics.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
      {topics.map((t, i) => (
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          fontSize: 'var(--text-xs)', fontWeight: 600,
          padding: '3px 10px', borderRadius: 'var(--radius-full)',
          background: 'var(--bg-surface-hover)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
          letterSpacing: '0.01em',
        }}>
          <IconTag /> {t}
        </span>
      ))}
    </div>
  );
};

const SPEAKER_COLORS = [
  { main: '#1a73e8', bg: 'rgba(26, 115, 232, 0.06)', border: 'rgba(26, 115, 232, 0.15)' },
  { main: '#ea4335', bg: 'rgba(234, 67, 53, 0.06)', border: 'rgba(234, 67, 53, 0.15)' },
  { main: '#fbbc04', bg: 'rgba(251, 188, 4, 0.08)', border: 'rgba(251, 188, 4, 0.2)' },
  { main: '#34a853', bg: 'rgba(52, 168, 83, 0.06)', border: 'rgba(52, 168, 83, 0.15)' },
  { main: '#a142f4', bg: 'rgba(161, 66, 244, 0.06)', border: 'rgba(161, 66, 244, 0.15)' },
  { main: '#00acc1', bg: 'rgba(0, 172, 193, 0.06)', border: 'rgba(0, 172, 193, 0.15)' },
];

const getSpeakerStyle = (speakerName, allSpeakers) => {
  const index = allSpeakers.indexOf(speakerName);
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length] || SPEAKER_COLORS[0];
};

const TranscriptBubble = ({ chunk, index, allSpeakers, onSpeakerNameChange }) => {
  const speakerId = chunk.speaker || "Người nói 1";
  const style = getSpeakerStyle(speakerId, allSpeakers);
  const isLeft = allSpeakers.indexOf(speakerId) % 2 === 0;
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(speakerId);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempName.trim() !== speakerId) {
      onSpeakerNameChange(speakerId, tempName.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') {
      setTempName(speakerId);
      setIsEditing(false);
    }
  };

  const bubbleStyles = {
    display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '85%',
    alignSelf: isLeft ? 'flex-start' : 'flex-end', marginBottom: 'var(--space-4)',
  };

  const contentStyles = {
    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--text-md)', lineHeight: 1.6, background: style.bg,
    border: `1px solid ${style.border}`, color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-sm)', borderTopLeftRadius: isLeft ? '2px' : 'var(--radius-lg)',
    borderTopRightRadius: isLeft ? 'var(--radius-lg)' : '2px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={bubbleStyles}>
        <div style={{
          fontSize: 'var(--text-xs)', fontWeight: 700, color: style.main, marginBottom: '2px',
          display: 'flex', alignItems: 'center', gap: '6px', flexDirection: isLeft ? 'row' : 'row-reverse',
        }}>
          <div style={{ 
            width: 28, height: 28, borderRadius: '50%', background: style.main,
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {speakerId.charAt(0).toUpperCase()}
          </div>
          
          {isEditing ? (
            <input 
              autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)}
              onBlur={handleBlur} onKeyDown={handleKeyDown}
              style={{
                background: 'var(--bg-body)', border: `1px solid ${style.main}`,
                color: 'var(--text-primary)', fontSize: 'var(--text-xs)',
                fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                outline: 'none', width: '120px'
              }}
            />
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              style={{ cursor: 'pointer', borderBottom: '1px dashed transparent' }}
              onMouseEnter={e => e.target.style.borderBottomColor = style.main}
              onMouseLeave={e => e.target.style.borderBottomColor = 'transparent'}
              title="Click để đổi tên"
            >
              {speakerId}
            </span>
          )}
        </div>
        <div style={contentStyles}>{chunk.text}</div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MeetingSummary = ({ meetingId, activeTranscript, activeChunks, viewingSummaryId, token, meetingInfo }) => {
  const [summaryData, setSummaryData]       = useState(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');
  const [errorType, setErrorType]           = useState('');
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [isSaved, setIsSaved]               = useState(false);
  const [aiProvider, setAiProvider]         = useState('gemini'); 
  const [editableTranscript, setEditableTranscript] = useState('');
  const [transcriptChunks, setTranscriptChunks]   = useState([]);
  const [activeTab, setActiveTab]           = useState('summary'); 
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => { if (viewingSummaryId) loadSavedSummary(viewingSummaryId); }, [viewingSummaryId]);

  useEffect(() => {
    if (activeTranscript) {
      setEditableTranscript(activeTranscript);
      if (activeChunks) setTranscriptChunks(activeChunks);
      if (!summaryData) setActiveTab('transcript');
    }
  }, [activeTranscript, activeChunks]);

  useEffect(() => {
    let interval = null;
    if (isLoading) { interval = setInterval(() => setLoadingSeconds(p => p + 1), 1000); }
    else { clearInterval(interval); setLoadingSeconds(0); }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadSavedSummary = async (mId) => {
    setIsLoading(true); setErrorMsg(''); setErrorType(''); setSummaryData(null); setIsSaved(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`http://127.0.0.1:8000/api/v1/meetings/${mId}/summary`, { headers });
      if (!res.ok) throw new Error(`server:${res.status}`);
      const data = await res.json();
      setSummaryData(data.summary);
      if (data.transcript) {
        setEditableTranscript(data.transcript);
        if (data.chunks && data.chunks.length > 0) setTranscriptChunks(data.chunks);
        else setTranscriptChunks([]);
      }
      if (data.summary && data.summary.id) setActiveTab('summary');
      else setActiveTab('transcript');
    } catch (err) {
      if (err.message?.startsWith('server:')) {
        setErrorType('server'); setErrorMsg(`Không tải được (mã lỗi ${err.message.replace('server:', '')})`);
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setErrorType('network'); setErrorMsg('Không kết nối được tới Backend.');
      } else {
        setErrorType('server'); setErrorMsg(err.message || 'Không thể tải bản tóm tắt.');
      }
    } finally { setIsLoading(false); }
  };

  const handleSpeakerNameChange = (oldName, newName) => {
    if (!newName || oldName === newName) return;
    const updatedChunks = transcriptChunks.map(chunk => 
      chunk.speaker === oldName ? { ...chunk, speaker: newName } : chunk
    );
    setTranscriptChunks(updatedChunks);
    const updatedFullText = updatedChunks.map(c => `[${c.speaker}]: ${c.text}`).join('\n');
    setEditableTranscript(updatedFullText);
  };

  const handleStartSummarize = async (overrideProvider) => {
    if (!activeTranscript) return;
    setIsLoading(true); setErrorMsg(''); setErrorType(''); setLoadingSeconds(0); setIsSaved(false);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const parsedMeetingId = parseInt(meetingId, 10);
      const finalMeetingId = isNaN(parsedMeetingId) ? null : parsedMeetingId;

      const payload = {
        transcript: editableTranscript || activeTranscript,
        meeting_id: finalMeetingId,
        ai_provider: overrideProvider || aiProvider
      };

      const res = await fetch('http://127.0.0.1:8000/api/v1/meetings/summarize', {
        method: 'POST', headers, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 500) {
          const errData = await res.json().catch(() => ({}));
          const detail = errData.detail || '';
          if (detail.toLowerCase().includes('ollama') || detail.toLowerCase().includes('llm') || detail.toLowerCase().includes('connection')) {
            setErrorType('ai'); setErrorMsg('AI chưa khởi động (Ollama). Kiểm tra thanh trạng thái AI.');
          } else { setErrorType('server'); setErrorMsg(`Lỗi nội bộ. ${detail}`); }
        } else { setErrorType('server'); setErrorMsg(`Lỗi máy chủ (${res.status})`); }
        return;
      }
      const responseData = await res.json();
      setSummaryData(responseData.data);
      setActiveTab('summary');
      if (responseData.saved_id) setIsSaved(true);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setErrorType('network'); setErrorMsg('Không kết nối được tới Backend.');
      } else { setErrorType('ai'); setErrorMsg(err.message || 'Lỗi kết nối tới LLM.'); }
    } finally { setIsLoading(false); }
  };

  const toggleActionItem = (uid) => {
    if (!summaryData) return;
    const updated = summaryData.action_items.map((item, i) =>
      (item.id || i) === uid ? { ...item, completed: !item.completed } : item
    );
    setSummaryData({ ...summaryData, action_items: updated });
    // In real app, we should also call the backend to update status here if needed
  };

  const startEditing = () => {
    setEditFormData(JSON.parse(JSON.stringify(summaryData))); // deep copy
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFormData(null);
  };

  const saveEdits = async () => {
    setIsSavingEdit(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const parsedMeetingId = parseInt(meetingId, 10);
      
      const res = await fetch(`http://127.0.0.1:8000/api/v1/meetings/${parsedMeetingId}/summary`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          summary_text: editFormData.summary_text,
          decisions: editFormData.decisions,
          action_items: editFormData.action_items
        })
      });
      
      if (!res.ok) throw new Error('Cập nhật thất bại');
      
      setSummaryData(editFormData);
      setIsEditing(false);
      setIsSaved(true);
    } catch (err) {
      alert("Lỗi khi lưu: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleExportTxt = () => {
    if (!summaryData) return;
    const title = meetingInfo?.meetingName || meetingId || 'Meeting';
    let t = `KẾT QUẢ CUỘC HỌP: ${title}\n${'='.repeat(50)}\n\n`;
    if (meetingInfo) {
      if (meetingInfo.host) t += `Chủ trì:  ${meetingInfo.host}\n`;
      if (meetingInfo.participants) t += `Tham dự: ${meetingInfo.participants}\n`;
      t += '\n';
    }
    t += `1. TÓM TẮT\n${'-'.repeat(30)}\n${summaryData.summary_text}\n\n`;
    t += `2. CÁC QUYẾT ĐỊNH\n${'-'.repeat(30)}\n`;
    (summaryData.decisions || []).forEach((d, i) => {
      if (typeof d === 'string') { t += `${i+1}. ${d}\n`; }
      else { t += `${i+1}. [${d.subject}] ${d.action} → ${d.outcome}\n`; }
    });
    if (!(summaryData.decisions || []).length) t += 'Không có quyết định nào được chốt.\n';
    t += `\n3. ACTION ITEMS\n${'-'.repeat(30)}\n`;
    (summaryData.action_items || []).forEach(item => {
      const chk = item.completed ? '[x]' : '[ ]';
      const pri = item.priority ? `[${item.priority.toUpperCase()}] ` : '';
      t += `${chk} ${pri}${item.task_name}\n    Phụ trách: ${item.assignee || 'Trống'} | Hạn: ${item.deadline || 'Trống'}\n`;
    });
    const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Summary_${title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const title = meetingInfo?.meetingName || meetingId || 'Chưa đặt tên';
  
  // Data for viewing
  const decisions = summaryData?.decisions || [];
  const actionItems = summaryData?.action_items || [];
  const keyTopics = summaryData?.key_topics || [];
  const completedCount = actionItems.filter(i => i.completed).length;

  return (
    <div className="summary">
      <div className="summary__header no-print">
        <div className="summary__title">Kết quả Khai thác ({title})</div>
        <div className="summary__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSaved && <span className="mm-badge mm-badge--saved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconSave/> Đã lưu</span>}
        </div>
      </div>

      {isLoading && (
        <div className="summary__loading no-print">
          <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin: '0 auto' }} />
          <p className="summary__loading-text">
            {viewingSummaryId ? 'Đang tải bản tóm tắt đã lưu...' : 'AI đang phân tích cuộc họp...'}
          </p>
          {!viewingSummaryId && (
            <>
              <p className="summary__loading-timer">{loadingSeconds} giây</p>
              <div style={{ width: '60%', margin: '0 auto' }}>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${Math.min((loadingSeconds / 30) * 100, 95)}%` }} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {errorMsg && (
        <div className={`mm-alert mm-alert--${errorType === 'network' ? 'info' : errorType === 'ai' ? 'warning' : 'danger'}`}
          style={{ marginTop: 'var(--space-5)' }}>
          <div className="mm-alert__content">
            <span className="mm-alert__title">Lỗi hệ thống</span>
            <span className="mm-alert__message">{errorMsg}</span>
          </div>
          <button className="mm-btn mm-btn--sm mm-btn--danger"
            onClick={viewingSummaryId ? () => loadSavedSummary(viewingSummaryId) : () => handleStartSummarize()}>
            Thử lại
          </button>
        </div>
      )}

      {editableTranscript && !isLoading && !errorMsg && (
        <div className="mm-tabs no-print" style={{ display: 'flex', gap: 'var(--space-4)', borderBottom: '1px solid var(--border-default)', marginBottom: 'var(--space-5)' }}>
          <button 
            style={{ 
              background: 'none', border: 'none', padding: 'var(--space-3) var(--space-2)', 
              color: activeTab === 'transcript' ? 'var(--primary-500)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'transcript' ? '2px solid var(--primary-500)' : '2px solid transparent',
              fontWeight: activeTab === 'transcript' ? 600 : 500,
              cursor: 'pointer', fontSize: 'var(--text-md)'
            }}
            onClick={() => setActiveTab('transcript')}
          >
            Văn bản bóc băng
          </button>
          {summaryData && (
            <button 
              style={{ 
                background: 'none', border: 'none', padding: 'var(--space-3) var(--space-2)', 
                color: activeTab === 'summary' ? 'var(--primary-500)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'summary' ? '2px solid var(--primary-500)' : '2px solid transparent',
                fontWeight: activeTab === 'summary' ? 600 : 500,
                cursor: 'pointer', fontSize: 'var(--text-md)'
              }}
              onClick={() => setActiveTab('summary')}
            >
              Kết quả Tóm tắt
            </button>
          )}
        </div>
      )}

      {!summaryData && !editableTranscript && !isLoading && !errorMsg && (
        <div className="mm-empty no-print glass-panel">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <div className="mm-empty__title">Chưa có dữ liệu tóm tắt</div>
          <div className="mm-empty__desc">Vui lòng ghi âm hoặc tải file lên. Khi đã bóc băng xong, bạn có thể chạy AI để tóm tắt.</div>
        </div>
      )}

      {activeTab === 'transcript' && editableTranscript && !isLoading && !errorMsg && (
        <div className="transcript-section animate-fade-in">
          <div className="mm-card" style={{ padding: 'var(--space-4)', border: '1px solid var(--border-default)', boxShadow: 'none' }}>
            <div style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Bạn có thể <b>click vào tên người nói</b> để đổi tên.</span>
            </div>
            {transcriptChunks.length > 0 ? (
              <div className="transcript-bubbles" style={{ 
                display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', 
                maxHeight: '600px', overflowY: 'auto', padding: 'var(--space-4)',
                background: 'var(--bg-body)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)'
              }}>
                {transcriptChunks.map((chunk, i) => (
                  <TranscriptBubble 
                    key={i} chunk={chunk} index={i} 
                    allSpeakers={[...new Set(transcriptChunks.map(c => c.speaker))]}
                    onSpeakerNameChange={handleSpeakerNameChange}
                  />
                ))}
              </div>
            ) : (
              <textarea
                value={editableTranscript}
                onChange={(e) => setEditableTranscript(e.target.value)}
                style={{
                  width: '100%', minHeight: '300px', padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                  background: 'var(--bg-body)', color: 'var(--text-primary)',
                  fontFamily: 'inherit', fontSize: 'var(--text-md)', lineHeight: 1.6, resize: 'vertical'
                }}
              />
            )}
          </div>
          
          {!summaryData && (
            <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
              <button className="mm-btn mm-btn--lg mm-btn--primary" onClick={() => handleStartSummarize()}>
                <IconZap /> Bắt đầu Tóm tắt bằng AI
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && summaryData && !isLoading && (
        <div className="summary__sections animate-fade-in">
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              *Dữ liệu sinh từ AI, nên kiểm tra lại.
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {!isEditing ? (
                <>
                  <button className="mm-btn mm-btn--sm mm-btn--primary" onClick={startEditing}><IconEdit/> Sửa</button>
                  <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={handleExportTxt}><IconFileText/> Xuất TXT</button>
                  <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={() => window.print()}>In</button>
                </>
              ) : (
                <>
                  <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={cancelEditing}><IconCancel/> Hủy</button>
                  <button className="mm-btn mm-btn--sm mm-btn--success" onClick={saveEdits} disabled={isSavingEdit}>
                    {isSavingEdit ? 'Đang lưu...' : <><IconSave/> Lưu thay đổi</>}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 1. Tóm tắt */}
          <div className="summary__section summary__section--blue">
            <div className="summary__section-header">
              <span className="summary__section-icon" style={{ color: 'var(--google-blue)' }}><IconFileText /></span>
              <span className="summary__section-title" style={{ color: 'var(--google-blue)' }}>Tóm Tắt Tự Động</span>
            </div>
            {isEditing ? (
              <textarea 
                value={editFormData.summary_text}
                onChange={e => setEditFormData({...editFormData, summary_text: e.target.value})}
                style={{ width: '100%', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--primary-300)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            ) : (
              <p className="summary__text">{summaryData.summary_text}</p>
            )}
            <KeyTopicTags topics={keyTopics} />
          </div>

          {/* 2. Quyết định */}
          <div className="summary__section summary__section--green">
            <div className="summary__section-header">
              <span className="summary__section-icon" style={{ color: 'var(--google-green)' }}><IconTarget /></span>
              <span className="summary__section-title" style={{ color: 'var(--google-green)' }}>Các Quyết Định Được Chốt</span>
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              {isEditing ? (
                <div>
                  {(editFormData.decisions || []).map((d, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        value={typeof d === 'string' ? d : d.action} 
                        onChange={e => {
                          const newD = [...editFormData.decisions];
                          if (typeof newD[i] === 'string') newD[i] = e.target.value;
                          else newD[i].action = e.target.value;
                          setEditFormData({...editFormData, decisions: newD});
                        }}
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-default)' }}
                      />
                      <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={() => {
                        const newD = [...editFormData.decisions];
                        newD.splice(i, 1);
                        setEditFormData({...editFormData, decisions: newD});
                      }}><IconTrash/></button>
                    </div>
                  ))}
                  <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={() => {
                    setEditFormData({...editFormData, decisions: [...(editFormData.decisions || []), "Quyết định mới"]});
                  }}><IconPlus/> Thêm quyết định</button>
                </div>
              ) : (
                decisions.length > 0 ? decisions.map((d, i) => <DecisionCard key={i} decision={d} index={i} />)
                : <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', padding: 'var(--space-3)' }}>Không có quyết định nào.</p>
              )}
            </div>
          </div>

          {/* 3. Action Items */}
          <div className="summary__section summary__section--red">
            <div className="summary__section-header">
              <span className="summary__section-icon" style={{ color: 'var(--google-red)' }}><IconZap /></span>
              <span className="summary__section-title" style={{ color: 'var(--google-red)' }}>Action Items</span>
            </div>
            
            {isEditing ? (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(editFormData.action_items || []).map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', background: 'var(--bg-body)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', alignItems: 'center' }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input placeholder="Tên công việc" value={item.task_name} onChange={e => {
                        const newA = [...editFormData.action_items]; newA[i].task_name = e.target.value; setEditFormData({...editFormData, action_items: newA});
                      }} style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-default)' }} />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input placeholder="Người phụ trách" value={item.assignee || ''} onChange={e => {
                          const newA = [...editFormData.action_items]; newA[i].assignee = e.target.value; setEditFormData({...editFormData, action_items: newA});
                        }} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border-default)' }} />
                        <input placeholder="Deadline" value={item.deadline || ''} onChange={e => {
                          const newA = [...editFormData.action_items]; newA[i].deadline = e.target.value; setEditFormData({...editFormData, action_items: newA});
                        }} style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid var(--border-default)' }} />
                      </div>
                    </div>
                    <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={() => {
                      const newA = [...editFormData.action_items]; newA.splice(i, 1); setEditFormData({...editFormData, action_items: newA});
                    }}><IconTrash/></button>
                  </div>
                ))}
                <button className="mm-btn mm-btn--sm mm-btn--secondary" style={{ alignSelf: 'flex-start' }} onClick={() => {
                  setEditFormData({...editFormData, action_items: [...(editFormData.action_items || []), { task_name: 'Công việc mới', assignee: '', deadline: '', completed: false, priority: 'medium' }]});
                }}><IconPlus/> Thêm công việc</button>
              </div>
            ) : (
              <div className="summary__action-list" style={{ marginTop: '16px' }}>
                {actionItems.length > 0 ? actionItems.map((item, index) => {
                  const uid = item.id || index;
                  return (
                    <label key={uid} className={`summary__action-item ${item.completed ? 'summary__action-item--done' : ''}`} style={{ transition: 'all 0.3s ease' }}>
                      <input
                        type="checkbox"
                        className="summary__action-check"
                        checked={!!item.completed}
                        onChange={() => toggleActionItem(uid)}
                      />
                      <div className="summary__action-info" style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                          <span className="summary__action-name" style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.task_name}</span>
                          <PriorityBadge priority={item.priority} />
                        </div>
                        <div className="summary__action-meta">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconUser/> {item.assignee || 'Trống'}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconCalendar/> {item.deadline || 'Trống'}</span>
                        </div>
                      </div>
                    </label>
                  );
                }) : (
                  <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', padding: 'var(--space-4)' }}>Không có công việc nào.</p>
                )}
              </div>
            )}
            
            {!isEditing && actionItems.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', padding: '0 var(--space-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-1)' }}>
                  <span>Tiến độ hoàn thành</span>
                  <span>{Math.round((completedCount / actionItems.length) * 100)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar__fill progress-bar__fill--green"
                    style={{ width: `${(completedCount / actionItems.length) * 100}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingSummary;
