import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../config';
import { DEFAULT_TEMPLATES } from '../config/templates';
import { useNotification } from '../contexts/NotificationContext';

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

const SUMMARY_LANGUAGE_OPTIONS = [
  { value: '',   label: 'Giữ nguyên (theo transcript)' },
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語 (Nhật)' },
  { value: 'ko', label: '한국어 (Hàn)' },
  { value: 'zh', label: '中文 (Trung)' },
  { value: 'th', label: 'ภาษาไทย (Thái)' },
];

// ─── Priority badge config ───────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'Cao',    color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.08)',   icon: <circle cx="12" cy="12" r="10" fill="currentColor"/> },
  medium: { label: 'Vừa',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)',   icon: <circle cx="12" cy="12" r="10" fill="currentColor"/> },
  low:    { label: 'Thấp',  color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)',   icon: <circle cx="12" cy="12" r="10" fill="currentColor"/> },
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
  { main: '#2383E2', bg: 'rgba(35, 131, 226, 0.06)', border: 'rgba(35, 131, 226, 0.15)' },
  { main: '#d946ef', bg: 'rgba(217, 70, 239, 0.06)', border: 'rgba(217, 70, 239, 0.15)' },
  { main: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.06)', border: 'rgba(14, 165, 233, 0.15)' },
  { main: '#10b981', bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.15)' },
  { main: '#f43f5e', bg: 'rgba(244, 63, 94, 0.06)', border: 'rgba(244, 63, 94, 0.15)' },
  { main: '#f59e0b', bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.15)' },
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

// Utility parser to reconstruct speaker chunks from raw text
const parseTranscriptToChunks = (text) => {
  if (!text) return [];
  const lines = text.split('\n');
  const parsedChunks = [];
  
  lines.forEach(line => {
    if (!line.trim()) return;
    
    // 1. Làm sạch mốc thời gian (timestamp) ở đầu dòng nếu có (ví dụ: 00:06, [00:15], - 00:06...)
    const cleanLine = line.replace(/^\s*(?:-\s*)?(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?|(?:\d{1,2}:\d{2}(?::\d{2})?))\s*[-–—]?\s*/, '');
    
    // Pattern 1: Matches [Speaker X]: Text... or [Name]: Text...
    const bracketMatch = cleanLine.match(/^\[([^\]]+)\]:\s*(.*)$/);
    if (bracketMatch) {
      parsedChunks.push({
        speaker: bracketMatch[1].replace(/[*[\]]/g, '').trim(),
        text: bracketMatch[2].trim()
      });
      return;
    }
    
    // Pattern 2: Matches **Speaker X**: Text... or **Name**: Text...
    const boldMatch = cleanLine.match(/^\*\*([^*:]+)\*\*:\s*(.*)$/);
    if (boldMatch) {
      parsedChunks.push({
        speaker: boldMatch[1].trim(),
        text: boldMatch[2].trim()
      });
      return;
    }
    
    // Pattern 3: Matches Speaker X: Text... or Name: Text...
    const colonMatch = cleanLine.match(/^([^:]+):\s*(.*)$/);
    if (colonMatch && !colonMatch[1].includes('[')) {
      parsedChunks.push({
        speaker: colonMatch[1].replace(/[*[\]]/g, '').trim(),
        text: colonMatch[2].trim()
      });
      return;
    }
    
    // Fallback: If no match, add to the previous chunk, or add as Speaker Unknown
    if (parsedChunks.length > 0) {
      parsedChunks[parsedChunks.length - 1].text += '\n' + cleanLine.trim();
    } else {
      parsedChunks.push({
        speaker: "Người nói",
        text: cleanLine.trim()
      });
    }
  });
  
  return parsedChunks;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MeetingSummary = ({ meetingId, activeTranscript, activeChunks, viewingSummaryId, token, meetingInfo, onSaveStateChange }) => {
  const { notify, confirm } = useNotification();
  const [summaryData, setSummaryData]       = useState(null);
  const [summaryDataOriginal, setSummaryDataOriginal] = useState(null);
  const [showOriginalLanguage, setShowOriginalLanguage] = useState(false);
  const [isLoading, setIsLoading]           = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');
  const [errorType, setErrorType]           = useState('');
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [isSaved, setIsSaved]               = useState(false);
  const [aiProvider, setAiProvider]         = useState('gemini'); 
  const [targetSummaryLanguage, setTargetSummaryLanguage] = useState('');
  const [editableTranscript, setEditableTranscript] = useState('');
  const [transcriptChunks, setTranscriptChunks]   = useState([]);
  const [activeTab, setActiveTab]           = useState('summary'); 
  const [viewMode, setViewMode]             = useState('bubbles'); // 'bubbles' or 'raw'
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (onSaveStateChange) {
      onSaveStateChange(isSaved);
    }
  }, [isSaved, onSaveStateChange]);

  useEffect(() => { if (viewingSummaryId) loadSavedSummary(viewingSummaryId); }, [viewingSummaryId]);

  useEffect(() => {
    if (activeTranscript) {
      setEditableTranscript(activeTranscript);
      if (activeChunks && activeChunks.length > 0) {
        setTranscriptChunks(activeChunks);
      } else {
        setTranscriptChunks(parseTranscriptToChunks(activeTranscript));
      }
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
    setIsLoading(true);
    setErrorMsg('');
    setErrorType('');
    setSummaryData(null);
    setSummaryDataOriginal(null);
    setShowOriginalLanguage(false);
    setIsSaved(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${mId}/summary`, { headers });
      if (!res.ok) throw new Error(`server:${res.status}`);
      const data = await res.json();
      setSummaryData(data.summary);
      if (data.transcript) {
        setEditableTranscript(data.transcript);
        if (data.chunks && data.chunks.length > 0) {
          setTranscriptChunks(data.chunks);
        } else {
          setTranscriptChunks(parseTranscriptToChunks(data.transcript));
        }
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

  const handleViewModeChange = (mode) => {
    if (mode === 'bubbles') {
      setTranscriptChunks(parseTranscriptToChunks(editableTranscript));
    }
    setViewMode(mode);
  };

  const handleStartSummarize = async (overrideProvider) => {
    if (!editableTranscript && !activeTranscript) return;
    setIsLoading(true); setErrorMsg(''); setErrorType(''); setLoadingSeconds(0); setIsSaved(false);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const parsedMeetingId = parseInt(meetingId, 10);
      const finalMeetingId = isNaN(parsedMeetingId) ? null : parsedMeetingId;

      // Đọc Mẫu Prompt Mặc Định từ LocalStorage để truyền cấu trúc chỉ thị AI
      let customPromptText = null;
      const defaultTemplateId = localStorage.getItem('meetingmind_default_template') || 'weekly-sync';
      const defaultTemplate = DEFAULT_TEMPLATES.find(t => t.id === defaultTemplateId);
      if (defaultTemplate) {
        customPromptText = defaultTemplate.prompt;
      }

      const payload = {
        transcript: editableTranscript || activeTranscript,
        meeting_id: finalMeetingId,
        ai_provider: overrideProvider || aiProvider,
        custom_prompt: customPromptText,
        // Chỉ dịch phần nội dung tóm tắt (summary_text)
        target_language: targetSummaryLanguage
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/summarize`, {
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
      const translatedOrDefault = responseData.data;
      const original = responseData.data_original || null;
      setSummaryData({
        ...translatedOrDefault,
        id: responseData.saved_id
      });
      setSummaryDataOriginal(original);
      // Nếu có target_language thì mặc định hiển thị bản dịch; còn không thì hiển thị bản hiện tại
      setShowOriginalLanguage(false);
      setActiveTab('summary');
      if (responseData.saved_id) setIsSaved(true);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setErrorType('network'); setErrorMsg('Không kết nối được tới Backend.');
      } else { setErrorType('ai'); setErrorMsg(err.message || 'Lỗi kết nối tới LLM.'); }
    } finally { setIsLoading(false); }
  };

  const toggleActionItem = async (uid) => {
    if (!summaryData) return;
    const oldSummaryData = { ...summaryData };
    const oldOriginal = summaryDataOriginal ? { ...summaryDataOriginal } : null;
    const updated = summaryData.action_items.map((item, i) =>
      (item.id || i) === uid ? { ...item, completed: !item.completed } : item
    );
    
    // Cập nhật trạng thái React trước để có phản hồi UI nhanh (UX)
    setSummaryData({ ...summaryData, action_items: updated });
    if (summaryDataOriginal?.action_items) {
      const updatedOriginal = summaryDataOriginal.action_items.map((item, i) =>
        (item.id || i) === uid ? { ...item, completed: !item.completed } : item
      );
      setSummaryDataOriginal({ ...summaryDataOriginal, action_items: updatedOriginal });
    }
    
    // Đồng bộ với Backend
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const parsedMeetingId = parseInt(meetingId, 10);
      if (isNaN(parsedMeetingId)) return;
      
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${parsedMeetingId}/summary`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          action_items: updated
        })
      });
      
      if (!res.ok) throw new Error('Cập nhật trạng thái công việc thất bại');
      setIsSaved(true);
    } catch (err) {
      console.error("Lỗi khi lưu trạng thái task:", err);
      // Hoàn tác lại trạng thái UI nếu lưu thất bại
      setSummaryData(oldSummaryData);
      if (oldOriginal) setSummaryDataOriginal(oldOriginal);
      notify("Không thể lưu trạng thái công việc. Vui lòng kiểm tra kết nối.", "error");
    }
  };

  const deleteActionItem = async (uid) => {
    if (!summaryData) return;
    
    // Xác nhận trước khi xóa (UI/UX)
    const confirmed = await confirm("Bạn có chắc chắn muốn xóa công việc này không?", "Xác nhận xóa công việc");
    if (!confirmed) return;
    
    const oldSummaryData = { ...summaryData };
    const oldOriginal = summaryDataOriginal ? { ...summaryDataOriginal } : null;
    const updated = summaryData.action_items.filter((item, i) => (item.id || i) !== uid);
    
    // Cập nhật trạng thái React trước
    setSummaryData({ ...summaryData, action_items: updated });
    if (summaryDataOriginal?.action_items) {
      const updatedOriginal = summaryDataOriginal.action_items.filter((item, i) => (item.id || i) !== uid);
      setSummaryDataOriginal({ ...summaryDataOriginal, action_items: updatedOriginal });
    }
    
    // Đồng bộ với Backend
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const parsedMeetingId = parseInt(meetingId, 10);
      if (isNaN(parsedMeetingId)) return;
      
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${parsedMeetingId}/summary`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          action_items: updated
        })
      });
      
      if (!res.ok) throw new Error('Xóa công việc thất bại');
      setIsSaved(true);
      notify("Đã xóa công việc thành công", "success");
    } catch (err) {
      console.error("Lỗi khi xóa task:", err);
      // Hoàn tác lại trạng thái UI nếu lưu thất bại
      setSummaryData(oldSummaryData);
      if (oldOriginal) setSummaryDataOriginal(oldOriginal);
      notify("Không thể xóa công việc. Vui lòng kiểm tra kết nối.", "error");
    }
  };

  const startEditing = () => {
    if (showOriginalLanguage) setShowOriginalLanguage(false);
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
      
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${parsedMeetingId}/summary`, {
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
      // Sau khi chỉnh sửa, bản gốc không còn chắc chắn đồng bộ
      setSummaryDataOriginal(null);
      setShowOriginalLanguage(false);
      setIsEditing(false);
      setIsSaved(true);
      notify("Đã lưu thay đổi thành công", "success");
    } catch (err) {
      notify("Lỗi khi lưu: " + err.message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveSummaryToDb = async () => {
    if (!summaryData) return;
    setIsLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const parsedMeetingId = parseInt(meetingId, 10);
      if (isNaN(parsedMeetingId)) {
        throw new Error("Không tìm thấy ID cuộc họp hợp lệ.");
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${parsedMeetingId}/summary`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          summary_text: summaryData.summary_text,
          decisions: summaryData.decisions,
          action_items: summaryData.action_items
        })
      });
      
      if (!res.ok) throw new Error('Không thể lưu cuộc họp lên máy chủ.');
      
      setIsSaved(true);
      notify("Đã lưu cuộc họp và đồng bộ công việc lên Kanban thành công!", "success");
    } catch (err) {
      notify("Lỗi lưu cuộc họp: " + err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTxt = () => {
    if (!displayedSummaryData) return;
    const title = meetingInfo?.meetingName || meetingId || 'Meeting';
    let t = `KẾT QUẢ CUỘC HỌP: ${title}\n${'='.repeat(50)}\n\n`;
    if (meetingInfo) {
      if (meetingInfo.host) t += `Chủ trì:  ${meetingInfo.host}\n`;
      if (meetingInfo.participants) t += `Tham dự: ${meetingInfo.participants}\n`;
      t += '\n';
    }
    t += `1. TÓM TẮT\n${'-'.repeat(30)}\n${displayedSummaryData.summary_text}\n\n`;
    t += `2. CÁC QUYẾT ĐỊNH\n${'-'.repeat(30)}\n`;
    (displayedSummaryData.decisions || []).forEach((d, i) => {
      if (typeof d === 'string') { t += `${i+1}. ${d}\n`; }
      else { t += `${i+1}. [${d.subject}] ${d.action} → ${d.outcome}\n`; }
    });
    if (!(displayedSummaryData.decisions || []).length) t += 'Không có quyết định nào được chốt.\n';
    t += `\n3. ACTION ITEMS\n${'-'.repeat(30)}\n`;
    (displayedSummaryData.action_items || []).forEach(item => {
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

  const handleExportMarkdown = () => {
    if (!displayedSummaryData) return;
    const title = meetingInfo?.meetingName || meetingId || 'Meeting';
    let md = `# BIÊN BẢN CUỘC HỌP: ${title}\n\n`;
    if (meetingInfo) {
      if (meetingInfo.host) md += `**Người chủ trì:** ${meetingInfo.host}  \n`;
      if (meetingInfo.participants) md += `**Thành phần tham dự:** ${meetingInfo.participants}  \n`;
      md += '\n';
    }
    md += `## 1. Tóm Tắt Cuộc Họp\n${displayedSummaryData.summary_text}\n\n`;
    
    if (keyTopics && keyTopics.length > 0) {
      md += `**Chủ đề chính:** ${keyTopics.map(t => `\`${t}\``).join(', ')}\n\n`;
    }
    
    md += `## 2. Các Quyết Định Được Chốt\n`;
    if (decisions.length > 0) {
      decisions.forEach((d, i) => {
        if (typeof d === 'string') {
          md += `${i + 1}. ${d}\n`;
        } else {
          md += `${i + 1}. **[${d.subject}]** ${d.action} → *Kết quả:* ${d.outcome}\n`;
        }
      });
    } else {
      md += `*Không có quyết định nào.*\n`;
    }
    md += `\n## 3. Danh Sách Công Việc (Action Items)\n`;
    if (actionItems.length > 0) {
      actionItems.forEach(item => {
        const chk = item.completed ? '[x]' : '[ ]';
        const pri = item.priority ? `**[${item.priority.toUpperCase()}]** ` : '';
        md += `- ${chk} ${pri}${item.task_name} (Phụ trách: \`${item.assignee || 'Trống'}\` | Hạn: \`${item.deadline || 'Trống'}\`)\n`;
      });
    } else {
      md += `*Không có công việc nào được phân công.*\n`;
    }
    
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `BienBanHop_${title.replace(/\s+/g, '_')}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDocx = () => {
    if (!displayedSummaryData) return;
    const title = meetingInfo?.meetingName || meetingId || 'Meeting';
    
    // Tạo cấu trúc HTML có style chuyên nghiệp để MS Word đọc trực tiếp
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta charset="utf-8"><title>${title}</title>`;
    html += `<style>
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; line-height: 1.6; padding: 20px; }
      h1 { color: #1a73e8; font-size: 24pt; border-bottom: 2px solid #1a73e8; padding-bottom: 10px; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; }
      h2 { color: #1a73e8; font-size: 16pt; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; font-weight: bold; }
      .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; background-color: #f8f9fa; }
      .meta-table td { padding: 10px; border: 1px solid #e5e7eb; font-size: 10.5pt; }
      .meta-label { font-weight: bold; color: #5f6368; width: 150px; }
      .section-card { padding: 15px; border-left: 6px solid #1a73e8; background-color: #f8f9fa; margin-bottom: 20px; border-radius: 4px; }
      .section-card--blue { border-left-color: #1a73e8; }
      .section-card--green { border-left-color: #2e7d32; }
      .section-card--red { border-left-color: #d32f2f; }
      .section-card--purple { border-left-color: #7b1fa2; }
      .task-item { margin-bottom: 10px; font-size: 11pt; }
      .task-item.completed { text-decoration: line-through; color: #888888; }
    </style></head><body>`;
    
    html += `<h1>BIÊN BẢN CUỘC HỌP</h1>`;
    
    // Metadata table
    html += `<table class="meta-table">`;
    html += `<tr><td class="meta-label">Tiêu đề</td><td><b>${title}</b></td></tr>`;
    if (meetingInfo) {
      if (meetingInfo.host) html += `<tr><td class="meta-label">Người chủ trì</td><td>${meetingInfo.host}</td></tr>`;
      if (meetingInfo.participants) html += `<tr><td class="meta-label">Thành phần</td><td>${meetingInfo.participants}</td></tr>`;
    }
    html += `<tr><td class="meta-label">Ngày tạo</td><td>${new Date().toLocaleDateString('vi-VN')}</td></tr>`;
    html += `</table>`;
    
    // Section 1: Summary
    html += `<div class="section-card section-card--blue">`;
    html += `<h2>1. Tóm Tắt Nội Dung</h2>`;
    html += `<p>${displayedSummaryData.summary_text.replace(/\n/g, '<br>')}</p>`;
    if (keyTopics && keyTopics.length > 0) {
      html += `<p><b>Chủ đề chính:</b> ${keyTopics.join(', ')}</p>`;
    }
    html += `</div>`;
    
    // Section 2: Decisions
    html += `<div class="section-card section-card--green">`;
    html += `<h2>2. Quyết Định Được Thống Nhất</h2>`;
    if (decisions.length > 0) {
      html += `<ol>`;
      decisions.forEach(d => {
        if (typeof d === 'string') {
          html += `<li>${d}</li>`;
        } else {
          html += `<li><b>[${d.subject}]</b> ${d.action} &rarr; <i>Kết quả:</i> ${d.outcome}</li>`;
        }
      });
      html += `</ol>`;
    } else {
      html += `<p><i>Không có quyết định thống nhất nào được ghi nhận.</i></p>`;
    }
    html += `</div>`;
    
    // Section 3: Action Items
    html += `<div class="section-card section-card--red">`;
    html += `<h2>3. Danh Sách Công Việc Bàn Giao</h2>`;
    if (actionItems.length > 0) {
      html += `<ul>`;
      actionItems.forEach(item => {
        const completedText = item.completed ? ' (Đã hoàn thành)' : ' (Chưa hoàn thành)';
        const priorityText = item.priority ? ` [Độ ưu tiên: ${item.priority.toUpperCase()}]` : '';
        html += `<li class="task-item ${item.completed ? 'completed' : ''}">`;
        html += `<b>${item.task_name}</b>${priorityText} <br> &nbsp;&nbsp;&nbsp;&nbsp; Phụ trách: <u>${item.assignee || 'Trống'}</u> | Hạn: <u>${item.deadline || 'Trống'}</u> ${completedText}`;
        html += `</li>`;
      });
      html += `</ul>`;
    } else {
      html += `<p><i>Không có công việc nào được bàn giao.</i></p>`;
    }
    html += `</div>`;
    
    // Section 4: Speaker stats
    const stats = calculateSpeakerInsights();
    if (stats.length > 0) {
      html += `<div class="section-card section-card--purple">`;
      html += `<h2>4. Tỷ Lệ Phát Biểu Của Thành Viên</h2>`;
      html += `<ul>`;
      stats.forEach(item => {
        html += `<li><b>${item.speaker}</b>: ${item.percentage}% (${item.charCount.toLocaleString()} ký tự nói)</li>`;
      });
      html += `</ul>`;
      html += `</div>`;
    }
    
    // Add Signature table for Word
    html += `<table style="width: 100%; margin-top: 50px; border-collapse: collapse; border: none;">`;
    html += `<tr style="border: none;">`;
    html += `<td style="width: 50%; text-align: center; border: none; font-size: 11pt; padding: 10px;">`;
    html += `<b>NGƯỜI GHI BIÊN BẢN</b><br>`;
    html += `<span style="color: #666666; font-size: 9.5pt;">(Ký, ghi rõ họ tên)</span>`;
    html += `<br><br><br><br>`;
    html += `___________________________`;
    html += `</td>`;
    html += `<td style="width: 50%; text-align: center; border: none; font-size: 11pt; padding: 10px;">`;
    html += `<b>CHỦ TRÌ CUỘC HỌP</b><br>`;
    html += `<span style="color: #666666; font-size: 9.5pt;">(Ký, ghi rõ họ tên)</span>`;
    html += `<br><br><br><br>`;
    html += `___________________________`;
    html += `</td>`;
    html += `</tr>`;
    html += `</table>`;
    
    html += `</body></html>`;
    
    // Download as a word document blob
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `BienBanHop_${title.replace(/\s+/g, '_')}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  const calculateSpeakerInsights = () => {
    if (!transcriptChunks || transcriptChunks.length === 0) return [];
    
    const speakerStats = {};
    let totalLength = 0;
    
    transcriptChunks.forEach(chunk => {
      const speaker = chunk.speaker || 'Người nói ẩn danh';
      const length = chunk.text ? chunk.text.trim().length : 0;
      if (length > 0) {
        speakerStats[speaker] = (speakerStats[speaker] || 0) + length;
        totalLength += length;
      }
    });
    
    if (totalLength === 0) return [];
    
    return Object.keys(speakerStats).map(speaker => {
      const charCount = speakerStats[speaker];
      const percentage = Math.round((charCount / totalLength) * 100);
      return {
        speaker,
        charCount,
        percentage
      };
    }).sort((a, b) => b.charCount - a.charCount);
  };

  const renderSpeakerInsights = () => {
    const stats = calculateSpeakerInsights();
    if (stats.length === 0) return null;
    
    const allSpeakers = [...new Set(transcriptChunks.map(c => c.speaker))];
    
    return (
      <div className="summary__section summary__section--purple" style={{ 
        borderLeftColor: 'var(--primary-500)',
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="summary__section-header" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="summary__section-icon" style={{ color: 'var(--primary-500)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/></svg>
          </span>
          <span className="summary__section-title" style={{ color: 'var(--primary-500)' }}>Phân Tích Tương Tác & Thời Lượng Phát Biểu</span>
        </div>
        
        <p style={{ margin: '0 0 var(--space-3) 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Biểu đồ tỷ lệ đóng góp ý kiến của từng thành viên dựa trên khối lượng từ ngữ phát biểu trong bản bóc băng
        </p>

        {/* Stacked bar chart */}
        <div style={{ 
          height: '16px', 
          width: '100%', 
          display: 'flex', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          background: 'var(--bg-surface-hover)',
          marginBottom: 'var(--space-4)',
          border: '1px solid var(--border-default)'
        }}>
          {stats.map((item, idx) => {
            const style = getSpeakerStyle(item.speaker, allSpeakers);
            return (
              <div 
                key={idx}
                style={{
                  width: `${item.percentage}%`,
                  height: '100%',
                  background: style.main,
                  transition: 'width 0.5s ease',
                  cursor: 'pointer'
                }}
                title={`${item.speaker}: ${item.percentage}%`}
              />
            );
          })}
        </div>

        {/* Legend grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
          {stats.map((item, idx) => {
            const style = getSpeakerStyle(item.speaker, allSpeakers);
            return (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: 'var(--space-2) var(--space-3)', 
                background: 'var(--bg-surface-hover)', 
                borderRadius: '8px',
                border: '1px solid var(--border-default)'
              }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  background: style.main,
                  boxShadow: `0 0 8px ${style.main}`
                }} />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{item.speaker}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{item.charCount.toLocaleString()} ký tự nói</span>
                </div>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{item.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const title = meetingInfo?.meetingName || meetingId || 'Chưa đặt tên';
  
  const displayedSummaryData = (showOriginalLanguage && summaryDataOriginal) ? summaryDataOriginal : summaryData;

  // Data for viewing
  const decisions = displayedSummaryData?.decisions || [];
  const actionItems = displayedSummaryData?.action_items || [];
  const keyTopics = displayedSummaryData?.key_topics || [];
  const completedCount = actionItems.filter(i => i.completed).length;
  const hasSummary = !!displayedSummaryData;

  const canToggleLanguage = !!summaryDataOriginal;
  const toggleLanguageView = () => {
    if (!canToggleLanguage) return;
    if (isEditing) {
      setIsEditing(false);
      setEditFormData(null);
    }
    setShowOriginalLanguage(v => !v);
  };

  const renderAiSelector = () => {
    return (
      <div className="glass-panel desktop-only-full-width" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 'var(--space-4)', 
        padding: 'var(--space-5)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', marginBottom: 'var(--space-1)' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-primary)' }}>Lựa chọn Công cụ AI</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Chọn mô hình phù hợp với nhu cầu và cấu hình máy của bạn</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', width: '100%' }}>
          {/* Gemini Option */}
          <div 
            onClick={() => setAiProvider('gemini')}
            style={{
              padding: 'var(--space-4)',
              background: aiProvider === 'gemini' ? 'var(--google-blue-bg)' : 'transparent',
              border: aiProvider === 'gemini' ? '2.5px solid var(--google-blue)' : '1.5px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: aiProvider === 'gemini' ? 'translateY(-2px)' : 'none',
              boxShadow: aiProvider === 'gemini' ? '0 4px 12px rgba(26,115,232,0.12)' : 'none',
            }}
          >
            <span style={{ fontWeight: 700, color: aiProvider === 'gemini' ? 'var(--google-blue)' : 'var(--text-primary)', fontSize: 'var(--text-sm)', letterSpacing: '0.2px' }}>Gemini Cloud API</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>Xử lý siêu nhanh, chính xác tối đa, cần Internet</span>
          </div>

          {/* Ollama Option */}
          <div 
            onClick={() => setAiProvider('ollama')}
            style={{
              padding: 'var(--space-4)',
              background: aiProvider === 'ollama' ? 'var(--google-blue-bg)' : 'transparent',
              border: aiProvider === 'ollama' ? '2.5px solid var(--google-blue)' : '1.5px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: aiProvider === 'ollama' ? 'translateY(-2px)' : 'none',
              boxShadow: aiProvider === 'ollama' ? '0 4px 12px rgba(26,115,232,0.12)' : 'none',
            }}
          >
            <span style={{ fontWeight: 700, color: aiProvider === 'ollama' ? 'var(--google-blue)' : 'var(--text-primary)', fontSize: 'var(--text-sm)', letterSpacing: '0.2px' }}>Ollama Local AI</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.4 }}>Bảo mật 100%, chạy offline (Qwen 2.5)</span>
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Ngôn ngữ bản tóm tắt
          </label>
          <select
            value={targetSummaryLanguage}
            onChange={(e) => setTargetSummaryLanguage(e.target.value)}
            className="mm-input"
            style={{ width: '100%' }}
          >
            {SUMMARY_LANGUAGE_OPTIONS.map(opt => (
              <option key={opt.value || 'keep'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            Dịch “Tóm tắt”, “Quyết định” và “Công việc”. Có thể bật xem ngôn ngữ gốc sau khi tóm tắt.
          </div>
        </div>

        <button 
          className="mm-btn mm-btn--lg mm-btn--primary" 
          onClick={() => handleStartSummarize()} 
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}
        >
          <IconZap /> Bắt đầu Tóm tắt bằng {aiProvider === 'gemini' ? 'Gemini' : 'Ollama'}
        </button>
      </div>
    );
  };

  return (
    <div className="summary">
      <style>{`
        /* Screen vs Print handling */
        @media screen {
          .print-only-container {
            display: none !important;
          }
        }

        @media print {
          /* Hide the entire screen application and UI elements */
          #root, .summary, .setup-form, .app, header, nav, footer, .no-print, button, .mm-tabs, 
          .setup-form-columns, .setup-form-left, .setup-form-right, .recorder, .mm-modal, 
          .summary__header, .summary__actions, .mm-badge, .desktop-only-tab-btn, .mobile-only-tabs,
          .mobile-only-ai-selector, .desktop-only-ai-selector {
            display: none !important;
          }
          
          /* Show only the print container and force block layout */
          .print-only-container {
            display: block !important;
            background: #ffffff !important;
            color: #111827 !important;
            font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;
            font-size: 11pt !important;
            line-height: 1.5 !important;
            padding: 10px !important;
            width: 100% !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #1a73e8;
            padding-bottom: 12px;
          }
          
          .print-header h1 {
            font-size: 20pt;
            font-weight: bold;
            color: #1a73e8;
            margin: 0 0 6px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .print-subtitle {
            font-size: 9.5pt;
            color: #4b5563;
            font-style: italic;
          }
          
          /* Metadata Grid */
          .print-meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 10pt;
            background: #f9fafb;
          }
          
          .print-meta-table td {
            border: 1px solid #d1d5db;
            padding: 8px 12px;
            vertical-align: middle;
          }
          
          .print-meta-label {
            font-weight: bold;
            color: #374151;
            background: #f3f4f6;
            width: 130px;
          }
          
          .print-meta-value {
            color: #111827;
          }
          
          /* Sections */
          .print-section {
            margin-bottom: 22px;
            page-break-inside: avoid;
          }
          
          .print-section-title {
            font-size: 12pt;
            font-weight: bold;
            color: #1a73e8;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 6px;
            margin: 0 0 10px 0;
            text-transform: uppercase;
          }
          
          .print-section-content {
            font-size: 10.5pt;
            line-height: 1.6;
            color: #1f2937;
            padding: 0 4px;
          }
          
          /* Tables */
          .print-tasks-table, .print-speaker-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            font-size: 9.5pt;
          }
          
          .print-tasks-table th, .print-speaker-table th {
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            font-weight: bold;
            color: #374151;
            text-align: center;
          }
          
          .print-tasks-table td, .print-speaker-table td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            vertical-align: middle;
          }
          
          .print-tasks-table tr.completed td {
            text-decoration: line-through;
            color: #9ca3af;
          }
          
          /* Badges */
          .print-priority-badge {
            display: inline-block;
            padding: 1px 6px;
            border-radius: 10px;
            font-size: 7.5pt;
            font-weight: bold;
            margin-left: 8px;
            text-transform: uppercase;
            border: 1px solid currentColor;
          }
          
          .print-priority-high {
            color: #f43f5e;
            background: #fff5f5;
          }
          
          .print-priority-medium {
            color: #f59e0b;
            background: #fffbeb;
          }
          
          .print-priority-low {
            color: #10b981;
            background: #f0fdf4;
          }
          
          /* Signatures */
          .print-signatures-container {
            margin-top: 35px;
            page-break-inside: avoid;
          }
          
          .print-signature-date {
            text-align: right;
            font-size: 10pt;
            margin-bottom: 20px;
            font-style: italic;
            color: #374151;
          }
          
          .print-signatures {
            display: flex;
            justify-content: space-between;
            width: 100%;
          }
          
          .signature-col {
            width: 45%;
            text-align: center;
          }
          
          .signature-title {
            font-weight: bold;
            font-size: 10.5pt;
            color: #111827;
            margin-bottom: 55px;
            text-transform: uppercase;
          }
          
          .signature-space {
            font-size: 9pt;
            color: #6b7280;
          }
        }
      `}</style>
      <div className="summary__header no-print">
        <div className="summary__title">Kết quả Khai thác ({title})</div>
        <div className="summary__actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isSaved ? (
            <span className="mm-badge mm-badge--saved" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconSave/> Đã lưu</span>
          ) : (
            displayedSummaryData && (
              <button 
                className="mm-btn mm-btn--sm mm-btn--success animate-pulse" 
                onClick={handleSaveSummaryToDb}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  padding: '6px 14px', 
                  background: 'var(--success-500)', 
                  color: 'white', 
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <IconSave /> Lưu kết quả
              </button>
            )
          )}

          {canToggleLanguage && (
            <button
              className="mm-btn mm-btn--sm mm-btn--ghost"
              onClick={toggleLanguageView}
              title={showOriginalLanguage ? 'Đang hiển thị ngôn ngữ gốc' : 'Đang hiển thị bản dịch'}
            >
              {showOriginalLanguage ? 'Hiển thị bản dịch' : 'Hiển thị ngôn ngữ gốc'}
            </button>
          )}
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
              background: 'none', border: 'none', padding: 'var(--space-3) var(--space-4)', 
              color: activeTab === 'transcript' ? 'var(--primary-500)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'transcript' ? '2px solid var(--primary-500)' : '2px solid transparent',
              fontWeight: activeTab === 'transcript' ? 600 : 500,
              cursor: 'pointer', fontSize: 'var(--text-md)'
            }}
            onClick={() => setActiveTab('transcript')}
          >
            Văn bản bóc băng
          </button>
          {hasSummary && (
            <>
              <button 
                style={{ 
                  background: 'none', border: 'none', padding: 'var(--space-3) var(--space-4)', 
                  color: activeTab === 'summary' ? 'var(--primary-500)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'summary' ? '2px solid var(--primary-500)' : '2px solid transparent',
                  fontWeight: activeTab === 'summary' ? 600 : 500,
                  cursor: 'pointer', fontSize: 'var(--text-md)'
                }}
                onClick={() => setActiveTab('summary')}
              >
                Kết quả Tóm tắt
              </button>
              <button 
                className="desktop-only-tab-btn"
                style={{ 
                  background: 'none', border: 'none', padding: 'var(--space-3) var(--space-4)', 
                  color: activeTab === 'split' ? 'var(--primary-500)' : 'var(--text-secondary)',
                  borderBottom: activeTab === 'split' ? '2px solid var(--primary-500)' : '2px solid transparent',
                  fontWeight: activeTab === 'split' ? 600 : 500,
                  cursor: 'pointer', fontSize: 'var(--text-md)'
                }}
                onClick={() => setActiveTab('split')}
              >
                Xem song song
              </button>
            </>
          )}
        </div>
      )}

      {!hasSummary && !editableTranscript && !isLoading && !errorMsg && (
        <div className="mm-empty no-print glass-panel">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <div className="mm-empty__title">Chưa có dữ liệu tóm tắt</div>
          <div className="mm-empty__desc">Vui lòng ghi âm hoặc tải file lên. Khi đã bóc băng xong, bạn có thể chạy AI để tóm tắt.</div>
        </div>
      )}

      {editableTranscript && !isLoading && !errorMsg && (
        <div className={(activeTab === 'split' || !hasSummary) ? "summary-desktop-split" : "summary-desktop-single"}>
          
          {/* CỘT TRÁI: Transcript Section */}
          {(activeTab === 'transcript' || activeTab === 'split' || !hasSummary) && (
            <div className={`summary-split-left ${hasSummary && activeTab !== 'transcript' && activeTab !== 'split' ? 'summary-mobile-tab-inactive' : ''}`}>
            <div className="mm-card" style={{ padding: 'var(--space-4)', border: '1px solid var(--border-default)', boxShadow: 'none', display: 'flex', flexDirection: 'column', height: '100%', margin: 0 }}>
              <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  {viewMode === 'bubbles' ? (
                    <span>Bạn có thể <b>click vào tên người nói</b> để đổi tên.</span>
                  ) : (
                    <span>Chế độ <b>Chỉnh sửa văn bản thô</b>.</span>
                  )}
                </span>
                
                {/* View Mode Segmented Control */}
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--bg-surface-hover)',
                  padding: '3px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                }}>
                  <button
                    onClick={() => handleViewModeChange('bubbles')}
                    style={{
                      background: viewMode === 'bubbles' ? 'var(--bg-surface)' : 'transparent',
                      border: 'none',
                      color: viewMode === 'bubbles' ? 'var(--primary-500)' : 'var(--text-secondary)',
                      padding: '4px 12px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      boxShadow: viewMode === 'bubbles' ? 'var(--shadow-xs)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    Bong bóng
                  </button>
                  <button
                    onClick={() => handleViewModeChange('raw')}
                    style={{
                      background: viewMode === 'raw' ? 'var(--bg-surface)' : 'transparent',
                      border: 'none',
                      color: viewMode === 'raw' ? 'var(--primary-500)' : 'var(--text-secondary)',
                      padding: '4px 12px',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      boxShadow: viewMode === 'raw' ? 'var(--shadow-xs)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                  >
                    Văn bản thô
                  </button>
                </div>
              </div>
              {viewMode === 'bubbles' && transcriptChunks.length > 0 ? (
                <div className="transcript-bubbles animate-fade-in" style={{ 
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', 
                  flex: 1, overflowY: 'auto', padding: 'var(--space-4)',
                  background: 'var(--bg-body)', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  maxHeight: 'calc(100vh - var(--header-height) - 180px)',
                  boxSizing: 'border-box'
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
                    width: '100%', flex: 1, minHeight: '350px', padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                    background: 'var(--bg-body)', color: 'var(--text-primary)',
                    fontFamily: 'inherit', fontSize: 'var(--text-md)', lineHeight: 1.6, resize: 'vertical'
                  }}
                />
              )}
            </div>

            {/* Trên Mobile: Nếu chưa có summaryData, hiển thị AI selector ở cuối cột này */}
            {!hasSummary && (
              <div className="mobile-only-ai-selector" style={{ marginTop: 'var(--space-4)' }}>
                {renderAiSelector()}
              </div>
            )}
          </div>
          )}

          {/* CỘT PHẢI: Summary Section hoặc AI Selector */}
          {(activeTab === 'summary' || activeTab === 'split' || !hasSummary) && (
            <div className={`summary-split-right ${hasSummary && activeTab !== 'summary' && activeTab !== 'split' ? 'summary-mobile-tab-inactive' : ''}`}>
            
            {/* Trường hợp 1: Đã có summaryData */}
            {hasSummary ? (
              <div className="summary__sections animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    *Dữ liệu sinh từ AI, nên kiểm tra lại.
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {!isEditing ? (
                      <>
                        <button className="mm-btn mm-btn--sm mm-btn--primary" onClick={startEditing}><IconEdit/> Sửa</button>
                        <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={handleExportTxt}><IconFileText/> Xuất TXT</button>
                        <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={handleExportMarkdown} style={{ background: 'var(--primary-600)', color: 'white', borderColor: 'var(--primary-600)' }}><IconFileText/> Xuất MD</button>
                        <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={handleExportDocx} style={{ background: 'var(--success-600)', color: 'white', borderColor: 'var(--success-600)' }}><IconFileText/> Xuất Word</button>
                        <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={() => window.print()} style={{ color: 'var(--danger-500)', borderColor: 'var(--danger-500)' }}>Xuất PDF / In</button>
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
                      style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '8px', border: '1px solid var(--primary-300)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    />
                  ) : (
                    <p className="summary__text" style={{ whiteSpace: 'pre-line' }}>{displayedSummaryData.summary_text}</p>
                  )}
                  <KeyTopicTags topics={keyTopics} />
                </div>

                {/* 2. Quyết định */}
                <div className="summary__section summary__section--green">
                  <div className="summary__section-header">
                    <span className="summary__section-icon" style={{ color: 'var(--google-green)' }}><IconTarget /></span>
                    <span className="summary__section-title" style={{ color: 'var(--google-green)' }}>Các Quyết Định Được Chốt</span>
                  </div>
                  <div style={{ marginTop: 'var(--space-2)' }}>
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
                          <div key={uid} className={`summary__action-item ${item.completed ? 'summary__action-item--done' : ''}`} style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            transition: 'all 0.3s ease', cursor: 'default' 
                          }}>
                            <label style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                className="summary__action-check"
                                checked={!!item.completed}
                                onChange={() => toggleActionItem(uid)}
                                style={{ marginRight: 'var(--space-4)' }}
                              />
                              <div className="summary__action-info" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                                  <span className="summary__action-name">{item.task_name}</span>
                                  <PriorityBadge priority={item.priority} />
                                </div>
                                <div className="summary__action-meta">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconUser/> {item.assignee || 'Trống'}</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><IconCalendar/> {item.deadline || 'Trống'}</span>
                                </div>
                              </div>
                            </label>
                            
                            <button 
                              className="mm-btn mm-btn--sm mm-btn--danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                deleteActionItem(uid);
                              }}
                              style={{ 
                                padding: '6px', minWidth: 'auto', borderRadius: '50%',
                                background: 'transparent', color: 'var(--text-tertiary)',
                                border: 'none', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifycontent: 'center', marginLeft: '8px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = 'var(--google-red)';
                                e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = 'var(--text-tertiary)';
                                e.currentTarget.style.background = 'transparent';
                              }}
                              title="Xóa công việc"
                            >
                              <IconTrash />
                            </button>
                          </div>
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
                {!isEditing && renderSpeakerInsights()}
              </div>
            ) : (
              /* Trường hợp 2: Chưa có summaryData -> Hiển thị AI Selector ở cột phải (trên Desktop) */
              <div className="desktop-only-ai-selector">
                {renderAiSelector()}
              </div>
            )}

          </div>
          )}

        </div>
      )}

      {/* DÀNH RIÊNG CHO IN ẤN (Tự động kích hoạt khi chọn Xuất PDF / In) */}
      <div className="print-only-container">
        <div className="print-header">
          <h1>BIÊN BẢN CUỘC HỌP</h1>
          <div className="print-subtitle">Hệ thống tóm tắt & quản lý cuộc họp MeetingMind AI</div>
        </div>
        
        <table className="print-meta-table">
          <tbody>
            <tr>
              <td className="print-meta-label">Tên cuộc họp</td>
              <td className="print-meta-value" colSpan={3}><strong>{title}</strong></td>
            </tr>
            <tr>
              <td className="print-meta-label">Người chủ trì</td>
              <td className="print-meta-value">{meetingInfo?.host || 'Chưa xác định'}</td>
              <td className="print-meta-label">Ngày họp</td>
              <td className="print-meta-value">{meetingInfo?.date || new Date().toLocaleDateString('vi-VN')}</td>
            </tr>
            <tr>
              <td className="print-meta-label">Người tham dự</td>
              <td className="print-meta-value" colSpan={3}>{meetingInfo?.participants || 'Chưa xác định'}</td>
            </tr>
          </tbody>
        </table>

        {summaryData ? (
          <>
            <div className="print-section">
              <h2 className="print-section-title">1. TÓM TẮT NỘI DUNG CUỘC HỌP</h2>
              <div className="print-section-content" style={{ whiteSpace: 'pre-line' }}>
                {displayedSummaryData.summary_text}
              </div>
              {keyTopics && keyTopics.length > 0 && (
                <div style={{ marginTop: '12px', fontSize: '10.5pt', color: '#4b5563' }}>
                  <strong>Chủ đề cốt lõi:</strong> {keyTopics.join(', ')}
                </div>
              )}
            </div>

            <div className="print-section">
              <h2 className="print-section-title">2. CÁC QUYẾT ĐỊNH ĐÃ THỐNG NHẤT</h2>
              <div className="print-section-content">
                {decisions.length > 0 ? (
                  <ol style={{ margin: '0', paddingLeft: '20px' }}>
                    {decisions.map((d, i) => {
                      if (typeof d === 'string') {
                        return <li key={i} style={{ marginBottom: '8px' }}>{d}</li>;
                      }
                      return (
                        <li key={i} style={{ marginBottom: '8px' }}>
                          <strong>[{d.subject}]</strong> {d.action} {d.outcome && <span>&rarr; <em>Kết quả:</em> {d.outcome}</span>}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <p style={{ fontStyle: 'italic', margin: '0' }}>Không có quyết định nào được ghi nhận.</p>
                )}
              </div>
            </div>

            <div className="print-section">
              <h2 className="print-section-title">3. DANH SÁCH CÔNG VIỆC BÀN GIAO (ACTION ITEMS)</h2>
              <div className="print-section-content">
                {actionItems.length > 0 ? (
                  <table className="print-tasks-table">
                    <thead>
                      <tr>
                        <th style={{ width: '5%' }}>STT</th>
                        <th style={{ width: '45%' }}>Nội dung công việc</th>
                        <th style={{ width: '20%' }}>Người phụ trách</th>
                        <th style={{ width: '15%' }}>Hạn hoàn thành</th>
                        <th style={{ width: '15%' }}>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionItems.map((item, idx) => (
                        <tr key={idx} className={item.completed ? 'completed' : ''}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td>
                            <strong>{item.task_name}</strong>
                            {item.priority && (
                              <span className={`print-priority-badge print-priority-${item.priority}`}>
                                {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Vừa' : 'Thấp'}
                              </span>
                            )}
                          </td>
                          <td>{item.assignee || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{item.deadline || '—'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.completed ? '#10b981' : '#f59e0b' }}>
                            {item.completed ? 'Đã xong' : 'Chưa xong'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontStyle: 'italic', margin: '0' }}>Không có công việc nào được bàn giao.</p>
                )}
              </div>
            </div>

            {calculateSpeakerInsights().length > 0 && (
              <div className="print-section">
                <h2 className="print-section-title">4. THỐNG KÊ TỶ LỆ PHÁT BIỂU</h2>
                <div className="print-section-content">
                  <table className="print-speaker-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>STT</th>
                        <th style={{ width: '45%' }}>Thành viên phát biểu</th>
                        <th style={{ width: '25%' }}>Khối lượng phát biểu (Ký tự)</th>
                        <th style={{ width: '20%' }}>Tỷ lệ đóng góp (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateSpeakerInsights().map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td><strong>{item.speaker}</strong></td>
                          <td style={{ textAlign: 'right' }}>{item.charCount.toLocaleString()}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="print-signatures-container">
              <div className="print-signature-date">
                <em>Hà Nội, Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</em>
              </div>
              <div className="print-signatures">
                <div className="signature-col">
                  <p className="signature-title">THƯ KÝ / NGƯỜI GHI BIÊN BẢN</p>
                  <p className="signature-space">(Ký và ghi rõ họ tên)</p>
                </div>
                <div className="signature-col">
                  <p className="signature-title">CHỦ TRÌ CUỘC HỌP</p>
                  <p className="signature-space">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="print-no-data" style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }}>
            Chưa có dữ liệu tóm tắt cho cuộc họp này.
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingSummary;
