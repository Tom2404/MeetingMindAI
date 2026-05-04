import React, { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://127.0.0.1:8000/api/v1/health';

/**
 * AIStatusBar — Thanh kiểm tra trạng thái AI tự động.
 * Hiển thị trạng thái của Ollama LLM và Faster-Whisper STT.
 */
const AIStatusBar = () => {
  const [status, setStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const checkAI = useCallback(async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`Backend lỗi (HTTP ${res.status})`);
      setStatus(await res.json());
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      setStatus({
        overall_ok: false, _network_error: true,
        _error_message: 'Không kết nối được tới Backend. Hãy kiểm tra server.',
        llm: { ok: false, model_found: false, message: isAbort ? 'Backend không phản hồi' : 'Không thể kiểm tra' },
        stt: { ok: false, model_loaded: false, message: isAbort ? 'Backend không phản hồi' : 'Không thể kiểm tra' }
      });
    } finally { setIsChecking(false); setLastChecked(new Date()); }
  }, []);

  useEffect(() => { checkAI(); const i = setInterval(checkAI, 30000); return () => clearInterval(i); }, [checkAI]);

  const formatTime = (date) => date ? date.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '';

  const isOk = status?.overall_ok;
  const llmOk = status?.llm?.ok && status?.llm?.model_found;
  const sttOk = status?.stt?.ok;

  const getLabel = () => {
    if (!status) return 'Đang kiểm tra AI...';
    if (status._network_error) return 'Không kết nối được tới Backend';
    if (status.overall_ok) return 'Tất cả AI đang hoạt động bình thường';
    if (!llmOk && sttOk) return 'AI tóm tắt (Ollama) chưa chạy';
    if (llmOk && !sttOk) return 'AI bóc băng (Whisper) lỗi';
    return 'Hệ thống AI không hoạt động';
  };

  return (
    <div className={`ai-status ${isOk ? 'ai-status--ok' : 'ai-status--error'}`}>
      {/* Summary */}
      <div className="ai-status__summary" onClick={() => setIsExpanded(v => !v)}>
        {isChecking ? (
          <div className="mm-spinner mm-spinner--sm" style={{
            borderColor: isOk ? 'var(--success-200)' : 'var(--danger-200)',
            borderTopColor: isOk ? 'var(--success-500)' : 'var(--danger-500)'
          }}></div>
        ) : (
          <span className={`mm-dot ${isOk ? 'mm-dot--success mm-dot--pulse' : 'mm-dot--danger'}`}
            style={{ width:12, height:12 }}></span>
        )}

        <span className={`ai-status__label ${isOk ? 'ai-status__label--ok' : 'ai-status__label--error'}`}>
          {isChecking && !status ? 'Đang kiểm tra trạng thái AI...' : getLabel()}
        </span>

        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
          {lastChecked && <span style={{ fontSize:'var(--text-xs)', color:'var(--text-tertiary)' }}>{formatTime(lastChecked)}</span>}
          <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={(e) => { e.stopPropagation(); checkAI(); }}
            disabled={isChecking} style={{ fontSize:'var(--text-xs)' }}>
            {isChecking ? '...' : '🔄 Kiểm tra'}
          </button>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ color:'var(--text-tertiary)', transform:isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition:'transform 0.2s' }}>
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Detail */}
      {isExpanded && status && (
        <div className="ai-status__detail">
          {status._network_error && (
            <div className="mm-alert mm-alert--danger">
              <span className="mm-alert__icon">🔌</span>
              <div className="mm-alert__content">
                <span className="mm-alert__title">Lỗi kết nối Backend</span>
                <span className="mm-alert__message">{status._error_message}</span>
              </div>
            </div>
          )}

          <ServiceRow icon="🤖" name="AI Tóm tắt (Ollama / Llama)" ok={llmOk}
            warning={status.llm?.ok && !status.llm?.model_found}
            message={status.llm?.message} models={status.llm?.models} />

          <ServiceRow icon="🎙️" name="AI Bóc băng (Faster-Whisper)" ok={sttOk}
            warning={status.stt?.ok && !status.stt?.model_loaded}
            message={status.stt?.message} />

          {!status.overall_ok && !status._network_error && (
            <div className="ai-status__guide">
              <strong>💡 Hướng dẫn khắc phục:</strong>
              <ul>
                {!status.llm?.ok && <li>Khởi động Ollama: <code>ollama serve</code></li>}
                {status.llm?.ok && !status.llm?.model_found && <li>Cài model: <code>ollama pull llama3.2</code></li>}
                {!status.stt?.ok && <li>Cài Whisper: <code>pip install faster-whisper</code></li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ServiceRow = ({ icon, name, ok, warning, message, models }) => {
  const variant = ok ? 'success' : warning ? 'warning' : 'danger';
  const label = ok ? 'Hoạt động' : warning ? 'Cảnh báo' : 'Lỗi';
  return (
    <div className="ai-status__row">
      <span style={{ fontSize:18, lineHeight:1, marginTop:1 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)', marginBottom:3 }}>
          <span style={{ fontSize:'var(--text-sm)', fontWeight:600, color:'var(--text-primary)' }}>{name}</span>
          <span className={`mm-badge mm-badge--${variant}`}>{label}</span>
        </div>
        <p style={{ margin:0, fontSize:'var(--text-xs)', color:'var(--text-secondary)', lineHeight:1.5 }}>{message}</p>
        {models?.length > 0 && (
          <p style={{ margin:'4px 0 0', fontSize:11, color:'var(--text-tertiary)' }}>
            Models: {models.slice(0, 5).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default AIStatusBar;
