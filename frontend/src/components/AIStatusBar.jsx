import React, { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://127.0.0.1:8000/api/v1/health';

/**
 * AIStatusBar — Thanh kiểm tra trạng thái AI tự động.
 * Hiển thị trạng thái của Ollama LLM và Faster-Whisper STT.
 * Tự kiểm tra mỗi 30 giây, và có nút kiểm tra thủ công.
 */
const AIStatusBar = () => {
  const [status, setStatus] = useState(null);       // null = chưa kiểm tra
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false); // Hiển thị chi tiết

  const checkAI = useCallback(async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      // Timeout 6 giây — nếu backend không phản hồi, báo lỗi kết nối
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`Backend lỗi (HTTP ${res.status})`);
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus({
          overall_ok: false,
          _network_error: true,
          _error_message: 'Không kết nối được tới Backend (http://127.0.0.1:8000). Hãy kiểm tra server đã chạy chưa.',
          llm: { ok: false, model_found: false, message: 'Không thể kiểm tra — Backend không phản hồi' },
          stt: { ok: false, model_loaded: false, message: 'Không thể kiểm tra — Backend không phản hồi' }
        });
      } else {
        setStatus({
          overall_ok: false,
          _network_error: true,
          _error_message: 'Không kết nối được tới Backend (http://127.0.0.1:8000). Hãy kiểm tra server đã chạy chưa.',
          llm: { ok: false, model_found: false, message: 'Không thể kiểm tra' },
          stt: { ok: false, model_loaded: false, message: 'Không thể kiểm tra' }
        });
      }
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  // Tự động kiểm tra khi mount và mỗi 30 giây
  useEffect(() => {
    checkAI();
    const interval = setInterval(checkAI, 30000);
    return () => clearInterval(interval);
  }, [checkAI]);

  // ---- Helpers ----
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getOverallColor = () => {
    if (!status) return '#8b8b8b';
    if (status.overall_ok) return '#34a853';
    const llmOk = status.llm?.ok;
    const sttOk = status.stt?.ok;
    if (llmOk || sttOk) return '#f59e0b'; // Cảnh báo vàng — một phần hoạt động
    return '#ea4335'; // Đỏ — cả hai đều lỗi
  };

  const getOverallLabel = () => {
    if (!status) return 'Đang kiểm tra AI...';
    if (status._network_error) return 'Hệ thống không kết nối được tới Backend';
    if (status.overall_ok) return 'Tất cả AI đang hoạt động bình thường';
    const llmOk = status.llm?.ok && status.llm?.model_found;
    const sttOk = status.stt?.ok;
    if (!llmOk && sttOk) return 'Hệ thống không nhận diện được AI tóm tắt (Ollama chưa chạy)';
    if (llmOk && !sttOk) return 'Hệ thống không nhận diện được AI bóc băng (Whisper lỗi)';
    return 'Hệ thống không nhận diện được AI — Kiểm tra Ollama và Whisper';
  };

  const getDotStyle = (ok, pulse = false) => ({
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    background: ok ? '#34a853' : '#ea4335',
    flexShrink: 0,
    boxShadow: ok && pulse ? '0 0 0 3px rgba(52, 168, 83, 0.25)' : 'none',
    animation: ok && pulse ? 'pulse-green 2s infinite' : 'none'
  });

  const overallColor = getOverallColor();
  const isOk = status?.overall_ok;

  return (
    <div style={{
      borderRadius: '12px',
      border: `1px solid ${isOk ? '#bbf7d0' : '#fecaca'}`,
      background: isOk ? '#f0fdf4' : '#fff5f5',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      marginBottom: '20px'
    }}>
      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 168, 83, 0.4); }
          50% { box-shadow: 0 0 0 5px rgba(52, 168, 83, 0); }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .ai-status-row:hover {
          background: rgba(0,0,0,0.03);
        }
      `}</style>

      {/* ---- Summary Row ---- */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', cursor: 'pointer', userSelect: 'none'
        }}
        onClick={() => setIsExpanded(v => !v)}
      >
        {/* Dot tổng trạng thái */}
        {isChecking ? (
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            border: '2px solid #ccc', borderTopColor: overallColor,
            animation: 'rotate 0.8s linear infinite', flexShrink: 0
          }} />
        ) : (
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: `${overallColor}22`, border: `2px solid ${overallColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: overallColor }} />
          </div>
        )}

        {/* Label */}
        <span style={{
          fontSize: '13px', fontWeight: '600',
          color: isOk ? '#15803d' : '#b91c1c', flex: 1
        }}>
          {isChecking && !status ? 'Đang kiểm tra trạng thái AI...' : getOverallLabel()}
        </span>

        {/* Nút kiểm tra lại + timestamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastChecked && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {formatTime(lastChecked)}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); checkAI(); }}
            disabled={isChecking}
            title="Kiểm tra lại ngay"
            style={{
              background: 'none', border: `1px solid ${overallColor}55`,
              borderRadius: '6px', padding: '4px 10px', cursor: isChecking ? 'not-allowed' : 'pointer',
              fontSize: '12px', color: overallColor, fontWeight: '500',
              transition: 'all 0.2s', opacity: isChecking ? 0.6 : 1,
              fontFamily: 'var(--font-family)'
            }}
          >
            {isChecking ? 'Đang kiểm tra...' : '🔄 Kiểm tra lại'}
          </button>

          {/* Toggle expand */}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            style={{ color: '#6b7280', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* ---- Detail Panel ---- */}
      {isExpanded && status && (
        <div style={{
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}>

          {/* Network error special message */}
          {status._network_error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: '#fef2f2', border: '1px solid #fecaca',
              fontSize: '13px', color: '#991b1b', display: 'flex', gap: '8px', alignItems: 'flex-start'
            }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🔌</span>
              <div>
                <strong>Lỗi kết nối Backend</strong>
                <p style={{ margin: '4px 0 0', color: '#7f1d1d' }}>{status._error_message}</p>
              </div>
            </div>
          )}

          {/* LLM Row */}
          <ServiceRow
            icon="🤖"
            name="AI Tóm tắt (Ollama / Llama)"
            ok={status.llm?.ok && status.llm?.model_found}
            warning={status.llm?.ok && !status.llm?.model_found}
            message={status.llm?.message}
            models={status.llm?.models}
          />

          {/* STT Row */}
          <ServiceRow
            icon="🎙️"
            name="AI Bóc băng (Faster-Whisper)"
            ok={status.stt?.ok}
            warning={status.stt?.ok && !status.stt?.model_loaded}
            message={status.stt?.message}
          />

          {/* Guide khi có lỗi */}
          {!status.overall_ok && !status._network_error && (
            <div style={{
              marginTop: '4px', padding: '10px 14px', borderRadius: '8px',
              background: '#fffbeb', border: '1px solid #fde68a',
              fontSize: '12px', color: '#92400e'
            }}>
              <strong>💡 Hướng dẫn khắc phục:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: '18px', lineHeight: '1.8' }}>
                {!status.llm?.ok && (
                  <li>Khởi động Ollama: mở terminal → gõ <code style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>ollama serve</code></li>
                )}
                {status.llm?.ok && !status.llm?.model_found && (
                  <li>Cài model LLM: <code style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>ollama pull llama3.2</code></li>
                )}
                {!status.stt?.ok && (
                  <li>Cài Faster-Whisper: <code style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: '3px' }}>pip install faster-whisper</code></li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


/** Component hiển thị 1 dòng service (LLM hoặc STT) */
const ServiceRow = ({ icon, name, ok, warning, message, models }) => {
  const statusColor = ok ? '#15803d' : warning ? '#b45309' : '#b91c1c';
  const statusBg = ok ? '#dcfce7' : warning ? '#fef3c7' : '#fee2e2';
  const statusLabel = ok ? 'Hoạt động' : warning ? 'Cảnh báo' : 'Lỗi';

  return (
    <div className="ai-status-row" style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 12px', borderRadius: '8px',
      background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)',
      transition: 'background 0.15s'
    }}>
      <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{name}</span>
          <span style={{
            fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
            background: statusBg, color: statusColor
          }}>
            {statusLabel}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{message}</p>
        {models && models.length > 0 && (
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>
            Models đã cài: {models.slice(0, 5).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default AIStatusBar;
