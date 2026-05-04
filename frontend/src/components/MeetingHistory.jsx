import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/meetings';

const MeetingHistory = ({ token, onViewSummary }) => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    setIsLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Không thể tải danh sách cuộc họp');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const getStatusBadge = (status, hasSummary) => {
    const map = {
      completed: { cls: hasSummary ? 'mm-badge--success' : 'mm-badge--info', text: hasSummary ? '✅ Đã tóm tắt' : '✅ Đã bóc băng' },
      processing: { cls: 'mm-badge--warning', text: '⏳ Đang xử lý' },
      recording: { cls: 'mm-badge--info', text: '🎙️ Đang ghi' },
      failed: { cls: 'mm-badge--danger', text: '❌ Thất bại' }
    };
    const s = map[status] || map.processing;
    return <span className={`mm-badge ${s.cls}`}>{s.text}</span>;
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    } catch { return dateStr; }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign:'center', padding:'var(--space-10)', color:'var(--text-secondary)' }}>
        <div className="mm-spinner mm-spinner--md mm-spinner--primary" style={{ margin:'0 auto var(--space-3)' }}></div>
        <p>Đang tải lịch sử cuộc họp...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mm-alert mm-alert--danger" style={{ textAlign:'center', flexDirection:'column', alignItems:'center' }}>
        <p>{error}</p>
        <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={fetchHistory} style={{ marginTop:'var(--space-3)' }}>Thử lại</button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="mm-empty">
        <div className="mm-empty__icon">📋</div>
        <div className="mm-empty__title">Chưa có cuộc họp nào được lưu</div>
        <div className="mm-empty__desc">Hãy tải lên file âm thanh hoặc ghi âm trực tuyến để bắt đầu.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="history__header">
        <span className="history__count">Tổng cộng: <strong>{meetings.length}</strong> cuộc họp</span>
        <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={fetchHistory}>🔄 Làm mới</button>
      </div>

      <div className="history__list">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="history__item"
            onClick={() => meeting.has_summary && onViewSummary && onViewSummary(meeting.id)}
            style={{ cursor: meeting.has_summary ? 'pointer' : 'default' }}
          >
            <div style={{ flex:1 }}>
              <div className="history__item-title">{meeting.title || `Cuộc họp #${meeting.id}`}</div>
              <div className="history__item-date">📅 {formatDate(meeting.created_at)}</div>
            </div>
            <div className="history__item-right">
              {getStatusBadge(meeting.status, meeting.has_summary)}
              {meeting.has_summary && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color:'var(--primary-400)' }}>
                  <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/>
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MeetingHistory;
