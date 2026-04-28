import React, { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/meetings';

const MeetingHistory = ({ token, onViewSummary }) => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Không thể tải danh sách cuộc họp');
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status, hasSummary) => {
    const styles = {
      completed: { bg: '#e6f4ea', color: '#137333', text: hasSummary ? '✅ Đã tóm tắt' : '✅ Đã bóc băng' },
      processing: { bg: '#fef7e0', color: '#b06000', text: '⏳ Đang xử lý' },
      recording: { bg: '#e8f0fe', color: '#1967d2', text: '🎙️ Đang ghi' },
      failed: { bg: '#fce8e6', color: '#c5221f', text: '❌ Thất bại' }
    };
    const s = styles[status] || styles.processing;
    return (
      <span style={{
        padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
        background: s.bg, color: s.color, whiteSpace: 'nowrap'
      }}>
        {s.text}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { 
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        <div style={{
          width: '32px', height: '32px',
          border: '3px solid #e2e8f0', borderTopColor: '#667eea',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px'
        }}></div>
        <p>Đang tải lịch sử cuộc họp...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', background: '#fff5f5', color: '#c53030', borderRadius: '10px', textAlign: 'center' }}>
        <p>{error}</p>
        <button onClick={fetchHistory} style={{
          marginTop: '10px', padding: '8px 16px', background: '#c53030', color: '#fff',
          border: 'none', borderRadius: '6px', cursor: 'pointer'
        }}>Thử lại</button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div style={{
        textAlign: 'center', padding: '48px 20px', color: 'var(--text-secondary)',
        background: '#f8f9fa', borderRadius: '12px', border: '1px dashed #dadce0'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 19H11V17H13V19ZM13 15H11V5H13V15Z" fill="currentColor"/>
        </svg>
        <p style={{ fontSize: '15px' }}>Chưa có cuộc họp nào được lưu.</p>
        <p style={{ fontSize: '13px', marginTop: '4px' }}>Hãy tải lên file âm thanh hoặc ghi âm trực tuyến để bắt đầu.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Tổng cộng: <strong>{meetings.length}</strong> cuộc họp
        </span>
        <button onClick={fetchHistory} style={{
          background: 'none', border: '1px solid var(--border-color)', padding: '6px 12px',
          borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)',
          transition: 'all 0.2s'
        }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
        >
          🔄 Làm mới
        </button>
      </div>

      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)', borderRadius: '10px',
            cursor: meeting.has_summary ? 'pointer' : 'default',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
          onClick={() => meeting.has_summary && onViewSummary && onViewSummary(meeting.id)}
          onMouseOver={(e) => {
            if (meeting.has_summary) {
              e.currentTarget.style.borderColor = '#667eea';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.15)';
            }
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {meeting.title || `Cuộc họp #${meeting.id}`}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              📅 {formatDate(meeting.created_at)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getStatusBadge(meeting.status, meeting.has_summary)}
            {meeting.has_summary && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#667eea' }}>
                <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/>
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MeetingHistory;
