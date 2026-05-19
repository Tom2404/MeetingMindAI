import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';
import MeetingSetup from '../components/MeetingSetup';

const HomePage = () => {
  const { currentUser, token } = useAuth();
  const { setupMeeting } = useMeeting();
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);
  
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    // Fetch meetings for stats and recent list
    fetch('http://127.0.0.1:8000/api/v1/meetings/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && data.meetings) {
        setRecentMeetings(data.meetings.slice(0, 3));
        setStats({
          total: data.meetings.length,
          completed: data.meetings.filter(m => m.status === 'completed' || m.has_summary).length
        });
      }
    })
    .catch(err => console.error(err));
  }, [token]);

  const getGreeting = () => { 
    const h = new Date().getHours(); 
    return h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; 
  };

  const displayName = currentUser?.full_name || currentUser?.username || 'Người dùng';

  const handleSetupConfirm = (info) => { 
    setupMeeting(info);
    setShowSetup(false); 
    navigate('/room');
  };
  
  const getStatusBadge = (status, hasSummary) => {
    const map = {
      completed: { cls: hasSummary ? 'mm-badge--success' : 'mm-badge--info', text: hasSummary ? 'Đã tóm tắt' : 'Đã bóc băng', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> },
      processing: { cls: 'mm-badge--warning', text: 'Đang xử lý', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
      recording: { cls: 'mm-badge--info', text: 'Đang ghi âm', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg> },
      failed: { cls: 'mm-badge--danger', text: 'Thất bại', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> }
    };
    const s = map[status] || map.processing;
    return <span className={`mm-badge ${s.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>{s.icon} {s.text}</span>;
  };

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
    } catch { return dateStr; }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-greeting" style={{ marginBottom: 0 }}>
        <h1 className="page-greeting__hello" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getGreeting()}, {displayName}
        </h1>
        <p className="page-greeting__sub">Không gian làm việc AI của bạn hôm nay thế nào?</p>
      </div>

      <div className="bento-grid">
        {/* Hero Quick Action */}
        <div className="bento-card bento-col-8">
          <div className="bento-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <div className="bento-title">Bắt đầu phiên làm việc mới</div>
          <div className="bento-desc" style={{ marginBottom: 'var(--space-6)', maxWidth: '400px' }}>
            Hệ thống hỗ trợ tải file âm thanh có sẵn hoặc ghi âm trực tiếp để bóc băng và tóm tắt tự động siêu tốc.
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button className="bento-hero-btn" onClick={() => setShowSetup(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Tạo cuộc họp ngay
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="bento-card bento-col-4 glass-panel" style={{ background: 'var(--primary-50)' }}>
          <div className="bento-stat-label">Tổng số cuộc họp</div>
          <div className="bento-stat">{stats.total}</div>
          <div className="bento-desc" style={{ marginTop: 'auto' }}>
            <span style={{ color: 'var(--success-600)', fontWeight: 'bold' }}>{stats.completed}</span> cuộc họp đã được AI xử lý thành công.
          </div>
        </div>

        {/* Recent Meetings */}
        <div className="bento-card bento-col-12">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div className="bento-title" style={{ marginBottom: 0 }}>Gần đây</div>
            <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={() => navigate('/history')}>Xem tất cả →</button>
          </div>
          
          {recentMeetings.length === 0 ? (
            <div className="mm-empty" style={{ padding: 'var(--space-6)' }}>
              Chưa có cuộc họp nào.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentMeetings.map(meeting => (
                <div 
                  key={meeting.id} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => navigate(`/history/${meeting.id}`)}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{meeting.title || `Cuộc họp #${meeting.id}`}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{formatDate(meeting.created_at)}</div>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(meeting.status, meeting.has_summary)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSetup && <MeetingSetup onConfirm={handleSetupConfirm} onCancel={() => setShowSetup(false)} />}
      
      <style>{`
        .hover-card:hover {
          transform: translateX(4px);
          background: var(--bg-surface-hover) !important;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
