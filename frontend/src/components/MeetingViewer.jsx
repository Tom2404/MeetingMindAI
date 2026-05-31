import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../config/api';

const parseJoinInfo = () => {
  if (typeof window === 'undefined') return { meetingCode: null, token: null };
  const parts = window.location.pathname.split('/').filter(Boolean);
  const meetingCode = parts[0] === 'join' ? parts[1] : null;
  const sp = new URLSearchParams(window.location.search);
  const token = sp.get('token');
  return { meetingCode, token };
};

const MeetingViewer = () => {
  const { meetingCode, token } = useMemo(() => parseJoinInfo(), []);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | processing | completed | failed | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!meetingCode || !token) {
      setStatus('error');
      setError('Link không hợp lệ (thiếu Meeting ID hoặc token).');
      return;
    }

    let interval = null;
    let stopped = false;

    const fetchViewer = async () => {
      try {
        const res = await fetch(`${API_BASE}/meetings/public/${encodeURIComponent(meetingCode)}/summary?token=${encodeURIComponent(token)}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          setStatus('error');
          setError(payload.detail || 'Không thể tải nội dung cuộc họp.');
          return;
        }
        if (stopped) return;
        setData(payload);
        setStatus(payload.status || 'processing');
        setError('');
      } catch {
        setStatus('error');
        setError('Không kết nối được tới Backend.');
      }
    };

    fetchViewer();
    interval = setInterval(fetchViewer, 3000);

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
    };
  }, [meetingCode, token]);

  if (status === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg-body)', padding: 24 }}>
        <div className="mm-card" style={{ maxWidth: 720, width: '100%' }}>
          <div className="mm-card__header">
            <div className="mm-card__title">Không thể mở cuộc họp</div>
          </div>
          <div className="mm-alert mm-alert--danger">
            <span className="mm-alert__icon">⚠️</span>
            <span className="mm-alert__message">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  const meetingTitle = data?.meeting?.title || meetingCode || 'Cuộc họp';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', padding: 24 }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="mm-card">
          <div className="mm-card__header">
            <div>
              <div className="mm-card__title">Chế độ xem (Viewer)</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
                {meetingTitle} — Meeting ID: <strong>{meetingCode}</strong>
              </div>
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            *Bạn chỉ có quyền xem transcript/tóm tắt sau xử lý. Không thể ghi âm hoặc tải file lên.
          </div>
        </div>

        {(status === 'loading' || status === 'processing') && (
          <div className="mm-card" style={{ textAlign: 'center' }}>
            <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin: '0 auto 12px' }}></div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Hệ thống đang xử lý. Trang sẽ tự cập nhật khi có transcript/tóm tắt.
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="mm-alert mm-alert--danger">
            <span className="mm-alert__icon">❌</span>
            <span className="mm-alert__message">Cuộc họp xử lý thất bại. Vui lòng liên hệ người chủ trì.</span>
          </div>
        )}

        {status === 'completed' && (
          <>
            <div className="mm-card">
              <div className="mm-card__header">
                <div className="mm-card__title">Bản tóm tắt</div>
              </div>
              {data?.summary?.summary_text ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{data.summary.summary_text}</div>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>Chưa có bản tóm tắt.</div>
              )}
            </div>

            <div className="mm-card">
              <div className="mm-card__header">
                <div className="mm-card__title">Các quyết định</div>
              </div>
              {(data?.summary?.decisions || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(data.summary.decisions || []).map((item, idx) => (
                    <div key={idx} style={{ padding: 12, border: '1px solid var(--border-default)', borderRadius: 10 }}>
                      {typeof item === 'string' ? item : `${item.subject || ''} - ${item.action || ''} - ${item.outcome || ''}`}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>Không có quyết định được ghi nhận.</div>
              )}
            </div>

            <div className="mm-card">
              <div className="mm-card__header">
                <div className="mm-card__title">Action items</div>
              </div>
              {(data?.summary?.action_items || []).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(data.summary.action_items || []).map((item, idx) => (
                    <div key={idx} style={{ padding: 12, border: '1px solid var(--border-default)', borderRadius: 10 }}>
                      <div style={{ fontWeight: 600 }}>{item.task_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        👤 {item.assignee || 'Unknown'} | 📅 {item.deadline || 'Trống'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>Không có action item.</div>
              )}
            </div>

            <div className="mm-card">
              <div className="mm-card__header">
                <div className="mm-card__title">Transcript</div>
              </div>
              {data?.transcript ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{data.transcript}</div>
              ) : (
                <div style={{ color: 'var(--text-secondary)' }}>Chưa có transcript.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MeetingViewer;

