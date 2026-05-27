import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import API_BASE_URL from '../config';

const API_BASE = `${API_BASE_URL}/api/v1/meetings`;

const MeetingHistory = ({ token, onViewSummary }) => {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'summarized', 'raw', 'processing', 'failed'

  // Refs for Animations
  const totalMeetingsRef = useRef(null);
  const totalSummarizedRef = useRef(null);

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

  const handleDelete = async (e, meetingId) => {
    e.stopPropagation(); // Ngăn kích hoạt onClick xem chi tiết
    if (!window.confirm("Bạn có chắc chắn muốn xóa cuộc họp này và toàn bộ dữ liệu tóm tắt/bóc băng liên quan không?")) return;
    
    try {
      // Áp dụng hoạt cảnh GSAP trượt và thu nhỏ biến mất mượt mà trước khi xoá khỏi state
      const cardEl = document.querySelector(`.history-card-${meetingId}`);
      if (cardEl) {
        await gsap.to(cardEl, {
          opacity: 0,
          x: -40,
          height: 0,
          paddingTop: 0,
          paddingBottom: 0,
          marginTop: 0,
          marginBottom: 0,
          borderWidth: 0,
          duration: 0.35,
          ease: 'power3.inOut'
        });
      }
      
      const response = await fetch(`${API_BASE}/${meetingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Không thể xóa cuộc họp khỏi hệ thống');
      
      // Cập nhật lại danh sách local
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
    } catch (err) {
      alert(err.message || 'Gặp lỗi trong quá trình xóa dữ liệu');
      fetchHistory(); // Tải lại danh sách nếu animation chạy lỗi mà api thất bại
    }
  };

  const getStatusBadge = (status, hasSummary) => {
    const map = {
      completed: { cls: hasSummary ? 'mm-badge--success' : 'mm-badge--info', text: hasSummary ? 'Đã tóm tắt' : 'Đã bóc băng' },
      processing: { cls: 'mm-badge--warning', text: 'Đang xử lý' },
      recording: { cls: 'mm-badge--info', text: 'Đang ghi' },
      failed: { cls: 'mm-badge--danger', text: 'Thất bại' }
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

  // Filter Logic
  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = (m.title || `Cuộc họp #${m.id}`).toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'summarized') return matchesSearch && m.has_summary;
    if (statusFilter === 'raw') return matchesSearch && !m.has_summary && m.status === 'completed';
    if (statusFilter === 'processing') return matchesSearch && (m.status === 'processing' || m.status === 'recording');
    if (statusFilter === 'failed') return matchesSearch && m.status === 'failed';
    
    return matchesSearch;
  });

  // KPI Calculations
  const totalCount = meetings.length;
  const summarizedCount = meetings.filter(m => m.has_summary).length;
  const totalDurationSeconds = meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0);

  const formatTotalDuration = (seconds) => {
    if (!seconds) return '0 phút';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} giờ ${m} phút`;
    return `${m} phút`;
  };

  // Staggered entrance for cards when filteredMeetings changes
  useEffect(() => {
    if (filteredMeetings.length > 0) {
      gsap.fromTo('.history__item', 
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.04, overwrite: 'auto' }
      );
    }
  }, [filteredMeetings.length, statusFilter]);

  // Number Counter Animations on initial data load
  useEffect(() => {
    if (meetings.length > 0) {
      gsap.fromTo(totalMeetingsRef.current, 
        { textContent: 0 }, 
        { textContent: totalCount, duration: 1.2, ease: 'power2.out', snap: { textContent: 1 } }
      );
      gsap.fromTo(totalSummarizedRef.current, 
        { textContent: 0 }, 
        { textContent: summarizedCount, duration: 1.2, ease: 'power2.out', snap: { textContent: 1 } }
      );
    }
  }, [meetings.length]);

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
      <div className="mm-alert mm-alert--danger" style={{ textAlign:'center', flexDirection:'column', alignItems:'center', padding: 'var(--space-6)' }}>
        <p>{error}</p>
        <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={fetchHistory} style={{ marginTop:'var(--space-3)' }}>Thử lại</button>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="mm-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)', marginBottom: '16px' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <div className="mm-empty__title">Chưa có cuộc họp nào được lưu</div>
        <div className="mm-empty__desc">Hãy tải lên file âm thanh hoặc ghi âm trực tuyến để bắt đầu lưu trữ lịch sử đàm thoại.</div>
      </div>
    );
  }

  return (
    <div>
      {/* 1. Dashboard KPI Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)'
      }}>
        {/* Card 1: Total Meetings */}
        <div className="glass-panel" style={{
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-default)',
          borderLeft: '4.5px solid var(--google-blue)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng Cuộc Họp</span>
          <span ref={totalMeetingsRef} style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--google-blue)' }}>{totalCount}</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Cuộc thảo luận đã lưu</span>
        </div>

        {/* Card 2: Summarized Count */}
        <div className="glass-panel" style={{
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-default)',
          borderLeft: '4.5px solid var(--google-green)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Đã Tóm Tắt AI</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span ref={totalSummarizedRef} style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--google-green)' }}>{summarizedCount}</span>
            {totalCount > 0 && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                ({Math.round((summarizedCount / totalCount) * 100)}%)
              </span>
            )}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Đã khai thác tri thức</span>
        </div>

        {/* Card 3: Total Duration */}
        <div className="glass-panel" style={{
          padding: 'var(--space-4)',
          background: 'var(--bg-surface)',
          border: '1.5px solid var(--border-default)',
          borderLeft: '4.5px solid var(--google-red)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xs)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tổng Thời Lượng</span>
          <span style={{ fontSize: 'var(--text-md)', fontWeight: 800, color: 'var(--google-red)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', height: '36px', display: 'flex', alignItems: 'center' }}>
            {formatTotalDuration(totalDurationSeconds)}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Tổng thời gian đàm thoại bóc băng</span>
        </div>
      </div>

      {/* 2. Search and Filters Bar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        background: 'var(--bg-surface-hover)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        marginBottom: 'var(--space-5)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', width: '100%', alignItems: 'center', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input
            type="text"
            placeholder="Tìm nhanh cuộc họp theo tiêu đề hoặc từ khóa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-body)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: 'var(--text-sm)',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--google-blue)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-default)'}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute', right: '12px', background: 'none', border: 'none', 
                color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'summarized', label: 'Đã tóm tắt' },
            { id: 'raw', label: 'Chỉ bóc băng' },
            { id: 'processing', label: 'Đang xử lý' },
            { id: 'failed', label: 'Thất bại' }
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              style={{
                background: statusFilter === filter.id ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid',
                borderColor: statusFilter === filter.id ? 'var(--border-default)' : 'transparent',
                color: statusFilter === filter.id ? 'var(--primary-500)' : 'var(--text-secondary)',
                padding: '6px 14px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                boxShadow: statusFilter === filter.id ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (statusFilter !== filter.id) e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                if (statusFilter !== filter.id) e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. History List */}
      <div className="history__header">
        <span className="history__count">Tổng số kết quả: <strong>{filteredMeetings.length}</strong> cuộc họp</span>
        <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={fetchHistory}>Làm mới</button>
      </div>

      <div className="history__list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {filteredMeetings.map((meeting) => (
          <div
            key={meeting.id}
            className={`history__item history-card-${meeting.id}`}
            onClick={() => (meeting.has_summary || meeting.status === 'completed') && onViewSummary && onViewSummary(meeting.id)}
            style={{ 
              cursor: (meeting.has_summary || meeting.status === 'completed') ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s',
              overflow: 'hidden'
            }}
          >
            <div style={{ flex:1, marginRight: 'var(--space-4)' }}>
              <div className="history__item-title" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {meeting.title || `Cuộc họp #${meeting.id}`}
              </div>
              <div className="history__item-date" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span>{formatDate(meeting.created_at)}</span>
                {meeting.duration_seconds > 0 && (
                  <>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span>Thời lượng: {formatTotalDuration(meeting.duration_seconds)}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="history__item-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
              {getStatusBadge(meeting.status, meeting.has_summary)}
              
              {/* Thao tác xóa cuộc họp trực tiếp */}
              <button
                onClick={(e) => handleDelete(e, meeting.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  marginLeft: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--google-red)';
                  e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                  e.currentTarget.style.background = 'transparent';
                }}
                title="Xóa cuộc họp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>

              {(meeting.has_summary || meeting.status === 'completed') && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color:'var(--primary-400)', marginLeft: '2px' }}>
                  <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor"/>
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State when filtered results are 0 */}
      {filteredMeetings.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--space-10) var(--space-4)', 
          color: 'var(--text-secondary)', 
          background: 'var(--bg-surface-hover)', 
          borderRadius: 'var(--radius-lg)', 
          border: '1.5px dashed var(--border-default)',
          marginTop: 'var(--space-2)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 'var(--space-2)', opacity: 0.6 }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', color: 'var(--text-primary)', marginBottom: '4px' }}>Không tìm thấy kết quả phù hợp</div>
          <div style={{ fontSize: 'var(--text-xs)' }}>Hãy thử thay đổi từ khóa tìm kiếm hoặc bấm bộ lọc trạng thái khác.</div>
        </div>
      )}
    </div>
  );
};

export default MeetingHistory;
