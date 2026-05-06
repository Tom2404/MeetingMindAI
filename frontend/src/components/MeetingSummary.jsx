import React, { useState, useEffect, useRef } from 'react';

// ─── Priority badge config ───────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: 'Cao',    color: '#ea4335', bg: 'rgba(234,67,53,0.10)',   icon: '🔴' },
  medium: { label: 'Vừa',   color: '#fbbc04', bg: 'rgba(251,188,4,0.12)',   icon: '🟡' },
  low:    { label: 'Thấp',  color: '#34a853', bg: 'rgba(52,168,83,0.10)',   icon: '🟢' },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

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
      {cfg.icon} {cfg.label}
    </span>
  );
};

const KeyTopicTags = ({ topics = [] }) => {
  if (!topics.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
      {topics.map((t, i) => (
        <span key={i} style={{
          fontSize: 'var(--text-xs)', fontWeight: 600,
          padding: '3px 10px', borderRadius: 'var(--radius-full)',
          background: 'var(--bg-surface-hover)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
          letterSpacing: '0.01em',
        }}>
          📌 {t}
        </span>
      ))}
    </div>
  );
};

const SPEAKER_COLORS = [
  { main: '#1a73e8', bg: 'rgba(26, 115, 232, 0.06)', border: 'rgba(26, 115, 232, 0.15)' }, // Blue
  { main: '#ea4335', bg: 'rgba(234, 67, 53, 0.06)', border: 'rgba(234, 67, 53, 0.15)' }, // Red
  { main: '#fbbc04', bg: 'rgba(251, 188, 4, 0.08)', border: 'rgba(251, 188, 4, 0.2)' },  // Yellow
  { main: '#34a853', bg: 'rgba(52, 168, 83, 0.06)', border: 'rgba(52, 168, 83, 0.15)' }, // Green
  { main: '#a142f4', bg: 'rgba(161, 66, 244, 0.06)', border: 'rgba(161, 66, 244, 0.15)' }, // Purple
  { main: '#00acc1', bg: 'rgba(0, 172, 193, 0.06)', border: 'rgba(0, 172, 193, 0.15)' }, // Cyan
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
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '85%',
    alignSelf: isLeft ? 'flex-start' : 'flex-end',
    marginBottom: 'var(--space-4)',
  };

  const contentStyles = {
    padding: 'var(--space-3) var(--space-4)',
    borderRadius: 'var(--radius-lg)',
    fontSize: 'var(--text-md)',
    lineHeight: 1.6,
    background: style.bg,
    border: `1px solid ${style.border}`,
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-sm)',
    borderTopLeftRadius: isLeft ? '2px' : 'var(--radius-lg)',
    borderTopRightRadius: isLeft ? 'var(--radius-lg)' : '2px',
  };

  const speakerLabelStyles = {
    fontSize: 'var(--text-xs)',
    fontWeight: 700,
    color: style.main,
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexDirection: isLeft ? 'row' : 'row-reverse',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={bubbleStyles}>
        <div style={speakerLabelStyles}>
          <div style={{ 
            width: 28, height: 28, borderRadius: '50%', 
            background: style.main,
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, flexShrink: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            {speakerId.charAt(0).toUpperCase()}
          </div>
          
          {isEditing ? (
            <input 
              autoFocus
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
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
        <div style={contentStyles}>
          {chunk.text}
        </div>
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
  const [aiProvider, setAiProvider]         = useState('gemini'); // Default to gemini for diarization
  const [editableTranscript, setEditableTranscript] = useState('');
  const [transcriptChunks, setTranscriptChunks]   = useState([]);
  const [activeTab, setActiveTab]           = useState('summary'); // 'transcript' or 'summary'
  const lastProcessedTranscript             = useRef(null);

  useEffect(() => { if (viewingSummaryId) loadSavedSummary(viewingSummaryId); }, [viewingSummaryId]);

  useEffect(() => {
    if (activeTranscript) {
      setEditableTranscript(activeTranscript);
      if (activeChunks) {
        setTranscriptChunks(activeChunks);
      }
      if (!summaryData) {
        setActiveTab('transcript');
      }
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
        if (data.chunks && data.chunks.length > 0) {
          setTranscriptChunks(data.chunks);
        } else {
          setTranscriptChunks([]);
        }
      }
      // Nếu chưa có ID summary (nghĩa là backend trả về placeholder), thì tự động mở tab văn bản
      if (data.summary && data.summary.id) {
        setActiveTab('summary');
      } else {
        setActiveTab('transcript');
      }
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
    
    // 1. Cập nhật danh sách chunks (đổi tên cho tất cả các đoạn của người đó)
    const updatedChunks = transcriptChunks.map(chunk => 
      chunk.speaker === oldName ? { ...chunk, speaker: newName } : chunk
    );
    setTranscriptChunks(updatedChunks);
    
    // 2. Cập nhật lại chuỗi văn bản thô để LLM hiểu đúng ngữ cảnh tên mới
    const updatedFullText = updatedChunks.map(c => `[${c.speaker}]: ${c.text}`).join('\n');
    setEditableTranscript(updatedFullText);
    
    console.log(`[UI] Đã đổi tên người nói: ${oldName} -> ${newName}`);
  };

  const handleStartSummarize = async (overrideProvider) => {
    if (!activeTranscript) return;
    setIsLoading(true); setErrorMsg(''); setErrorType(''); setLoadingSeconds(0); setIsSaved(false);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const payload = {
        transcript: editableTranscript || activeTranscript,
        meeting_id: meetingId || null,
        ai_provider: overrideProvider || aiProvider
      };

      const res = await fetch('http://127.0.0.1:8000/api/v1/meetings/summarize', {
        method: 'POST', headers,
        body: JSON.stringify(payload),
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
    if (summaryData.key_topics?.length) {
      t += `CHỦ ĐỀ CHÍNH: ${summaryData.key_topics.join(' • ')}\n\n`;
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
    if (summaryData.processing_metadata) {
      t += `\n${'='.repeat(50)}\nXử lý bởi: ${summaryData.processing_metadata.model_used} | ${summaryData.processing_metadata.timestamp}\n`;
    }
    const blob = new Blob([t], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Summary_${title}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => window.print();

  const title = meetingInfo?.meetingName || meetingId || 'Test';
  const decisions = summaryData?.decisions || [];
  const actionItems = summaryData?.action_items || [];
  const keyTopics = summaryData?.key_topics || [];
  const completedCount = actionItems.filter(i => i.completed).length;

  return (
    <div className="summary">
      {/* ── Header ── */}
      <div className="summary__header no-print">
        <div className="summary__title">Kết quả Khai thác ({title})</div>
        <div className="summary__actions">
          {isSaved && <span className="mm-badge mm-badge--saved">💾 Đã lưu</span>}
        </div>
      </div>

      {/* ── Loading ── */}
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
              <p className="summary__loading-sub">*AI đang đọc và phân tích transcript — trích xuất quyết định & công việc</p>
            </>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {errorMsg && (
        <div className={`mm-alert mm-alert--${errorType === 'network' ? 'info' : errorType === 'ai' ? 'warning' : 'danger'}`}
          style={{ marginTop: 'var(--space-5)' }}>
          <span className="mm-alert__icon">
            {errorType === 'network' ? '🔌' : errorType === 'ai' ? '🤖' : '⚠️'}
          </span>
          <div className="mm-alert__content">
            <span className="mm-alert__title">
              {errorType === 'network' && 'Không kết nối được Backend'}
              {errorType === 'ai'      && 'Không nhận diện được AI'}
              {errorType === 'server'  && 'Lỗi xử lý phía máy chủ'}
              {!errorType              && 'Lỗi hệ thống'}
            </span>
            <span className="mm-alert__message">{errorMsg}</span>
          </div>
          <button className="mm-btn mm-btn--sm mm-btn--danger"
            onClick={viewingSummaryId ? () => loadSavedSummary(viewingSummaryId) : () => handleStartSummarize()}>
            Thử lại
          </button>
        </div>
      )}

      {/* ── Tabs (nếu có nội dung) ── */}
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

      {/* ── Empty State ── */}
      {!summaryData && !editableTranscript && !isLoading && !errorMsg && (
        <div className="mm-empty no-print">
          <div className="mm-empty__icon">📝</div>
          <div className="mm-empty__title">Chưa có dữ liệu tóm tắt</div>
          <div className="mm-empty__desc">Vui lòng ghi âm hoặc tải file lên. Khi đã bóc băng xong, bạn có thể chạy AI để tóm tắt.</div>
        </div>
      )}

      {/* ── Transcript Content ── */}
      {activeTab === 'transcript' && editableTranscript && !isLoading && !errorMsg && (
        <div className="transcript-section animate-fade-in">
          <div className="mm-card" style={{ padding: 'var(--space-4)', border: '1px solid var(--border-default)', boxShadow: 'none' }}>
            <div style={{ marginBottom: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Bạn có thể <b>click vào tên người nói</b> để đổi tên và chỉnh sửa nội dung văn bản.</span>
              <span style={{ fontWeight: 600, background: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                {editableTranscript.length} ký tự
              </span>
            </div>
            {transcriptChunks.length > 0 ? (
              <div className="transcript-bubbles" style={{ 
                display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', 
                maxHeight: '600px', overflowY: 'auto', padding: 'var(--space-4)',
                background: 'var(--bg-body)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-default)',
                scrollBehavior: 'smooth'
              }}>
                {transcriptChunks.map((chunk, i) => (
                  <TranscriptBubble 
                    key={i} 
                    chunk={chunk} 
                    index={i} 
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
                  fontFamily: 'inherit', fontSize: 'var(--text-md)', lineHeight: 1.6,
                  resize: 'vertical', outline: 'none'
                }}
                placeholder="Nội dung bóc băng sẽ hiển thị ở đây..."
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-400)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
              />
            )}
          </div>
          
          {/* Hybrid Provider Selector & Summarize Button */}
          {!summaryData && (
            <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', background: 'var(--bg-surface-hover)', padding: 'var(--space-1)', borderRadius: 'var(--radius-full)' }}>
                <button 
                  className={`mm-btn mm-btn--sm ${aiProvider === 'ollama' ? 'mm-btn--primary' : 'mm-btn--ghost'}`}
                  style={{ borderRadius: 'var(--radius-full)' }}
                  onClick={() => setAiProvider('ollama')}
                >
                  🔒 Local (An Toàn)
                </button>
                <button 
                  className={`mm-btn mm-btn--sm ${aiProvider === 'gemini' ? 'mm-btn--primary' : 'mm-btn--ghost'}`}
                  style={{ borderRadius: 'var(--radius-full)' }}
                  onClick={() => setAiProvider('gemini')}
                >
                  ☁️ Cloud (Thông minh)
                </button>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', maxWidth: '300px', textAlign: 'center' }}>
                {aiProvider === 'ollama' 
                  ? '*Bảo mật tuyệt đối 100%, chạy hoàn toàn trên máy tính của bạn.' 
                  : '*Tốc độ cực nhanh và nhận diện Tiếng Việt xuất sắc bằng AI đám mây.'}
              </p>
              <button 
                className="mm-btn mm-btn--lg mm-btn--primary" 
                onClick={() => handleStartSummarize()}
                style={{ marginTop: 'var(--space-2)' }}
              >
                ✨ Bắt đầu Tóm tắt bằng {aiProvider === 'ollama' ? 'Local AI' : 'Gemini AI'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Summary Content ── */}
      {activeTab === 'summary' && summaryData && !isLoading && (
        <div className="summary__sections">

          {/* Export bar */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              *Dữ liệu sinh từ AI, nên kiểm tra lại.
              {summaryData.processing_metadata && (
                <> &nbsp;|&nbsp; Model: <strong>{summaryData.processing_metadata.model_used}</strong></>
              )}
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={handleExportTxt}>📄 Xuất TXT</button>
              <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={handleExportPdf}>🖨 In</button>
            </div>
          </div>

          {/* ── 1. Summary + Key Topics ── */}
          <div className="summary__section summary__section--blue">
            <div className="summary__section-header">
              <span className="summary__section-icon">📝</span>
              <span className="summary__section-title" style={{ color: 'var(--google-blue)' }}>Tóm Tắt Tự Động</span>
            </div>
            <p className="summary__text">{summaryData.summary_text}</p>
            <KeyTopicTags topics={keyTopics} />
          </div>

          {/* ── 2. Decisions (structured cards) ── */}
          <div className="summary__section summary__section--green">
            <div className="summary__section-header">
              <span className="summary__section-icon">🎯</span>
              <span className="summary__section-title" style={{ color: 'var(--google-green)' }}>
                Các Quyết Định Được Chốt
                {decisions.length > 0 && (
                  <span style={{
                    marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700,
                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: 'rgba(52,168,83,0.15)', color: 'var(--google-green)',
                  }}>
                    {decisions.length}
                  </span>
                )}
              </span>
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              {decisions.length > 0
                ? decisions.map((d, i) => <DecisionCard key={i} decision={d} index={i} />)
                : <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', padding: 'var(--space-3)', textAlign: 'center' }}>
                    Không có quyết định nào đủ tiêu chí để ghi nhận.
                  </p>
              }
            </div>
          </div>

          {/* ── 3. Action Items ── */}
          <div className="summary__section summary__section--red">
            <div className="summary__section-header">
              <span className="summary__section-icon">⚡</span>
              <span className="summary__section-title" style={{ color: 'var(--google-red)' }}>
                Action Items
                {actionItems.length > 0 && (
                  <span style={{
                    marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 700,
                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: 'rgba(234,67,53,0.12)', color: 'var(--google-red)',
                  }}>
                    {completedCount}/{actionItems.length}
                  </span>
                )}
              </span>
            </div>
            <div className="summary__action-list">
              {actionItems.length > 0 ? actionItems.map((item, index) => {
                const uid = item.id || index;
                return (
                  <label key={uid} className={`summary__action-item ${item.completed ? 'summary__action-item--done' : ''}`}>
                    <input
                      type="checkbox"
                      className="summary__action-check"
                      checked={!!item.completed}
                      onChange={() => toggleActionItem(uid)}
                    />
                    <div className="summary__action-info" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                        <span className="summary__action-name">{item.task_name}</span>
                        <PriorityBadge priority={item.priority} />
                      </div>
                      <div className="summary__action-meta">
                        <span>👤 {item.assignee || 'Trống'}</span>
                        <span>📅 {item.deadline || 'Trống'}</span>
                      </div>
                    </div>
                  </label>
                );
              }) : (
                <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-4)' }}>
                  Không có công việc cụ thể nào được trích xuất.
                </p>
              )}
            </div>

            {/* Progress bar for action items */}
            {actionItems.length > 0 && (
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
