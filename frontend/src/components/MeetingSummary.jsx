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
    
    // Pattern 1: Matches [Speaker X]: Text... or [Name]: Text...
    const bracketMatch = line.match(/^\[([^\]]+)\]:\s*(.*)$/);
    if (bracketMatch) {
      parsedChunks.push({
        speaker: bracketMatch[1].trim(),
        text: bracketMatch[2].trim()
      });
      return;
    }
    
    // Pattern 2: Matches Speaker X: Text... or Name: Text...
    const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (colonMatch && !colonMatch[1].includes('[')) {
      parsedChunks.push({
        speaker: colonMatch[1].trim(),
        text: colonMatch[2].trim()
      });
      return;
    }
    
    // Fallback: If no match, add to the previous chunk, or add as Speaker Unknown
    if (parsedChunks.length > 0) {
      parsedChunks[parsedChunks.length - 1].text += '\n' + line.trim();
    } else {
      parsedChunks.push({
        speaker: "Người nói",
        text: line.trim()
      });
    }
  });
  
  return parsedChunks;
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MeetingSummary = ({ meetingId, activeTranscript, activeChunks, viewingSummaryId, token, meetingInfo }) => {
  const { notify, confirm } = useNotification();
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
  const [viewMode, setViewMode]             = useState('bubbles'); // 'bubbles' or 'raw'
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    setIsLoading(true); setErrorMsg(''); setErrorType(''); setSummaryData(null); setIsSaved(true);
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
        custom_prompt: customPromptText
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
      setSummaryData({
        ...responseData.data,
        id: responseData.saved_id
      });
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
    const updated = summaryData.action_items.map((item, i) =>
      (item.id || i) === uid ? { ...item, completed: !item.completed } : item
    );
    
    // Cập nhật trạng thái React trước để có phản hồi UI nhanh (UX)
    setSummaryData({ ...summaryData, action_items: updated });
    
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
      notify("Không thể lưu trạng thái công việc. Vui lòng kiểm tra kết nối.", "error");
    }
  };

  const deleteActionItem = async (uid) => {
    if (!summaryData) return;
    
    // Xác nhận trước khi xóa (UI/UX)
    const confirmed = await confirm("Bạn có chắc chắn muốn xóa công việc này không?", "Xác nhận xóa công việc");
    if (!confirmed) return;
    
    const oldSummaryData = { ...summaryData };
    const updated = summaryData.action_items.filter((item, i) => (item.id || i) !== uid);
    
    // Cập nhật trạng thái React trước
    setSummaryData({ ...summaryData, action_items: updated });
    
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
      notify("Không thể xóa công việc. Vui lòng kiểm tra kết nối.", "error");
    }
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
      setIsEditing(false);
      setIsSaved(true);
      notify("Đã lưu thay đổi thành công", "success");
    } catch (err) {
      notify("Lỗi khi lưu: " + err.message, "error");
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
  const hasSummary = !!(summaryData && summaryData.id);

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
                      style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '8px', border: '1px solid var(--primary-300)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                    />
                  ) : (
                    <p className="summary__text" style={{ whiteSpace: 'pre-line' }}>{summaryData.summary_text}</p>
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
    </div>
  );
};

export default MeetingSummary;
