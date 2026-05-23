import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

const TasksPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/action-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Không thể tải dữ liệu công việc');
      const data = await res.json();
      setTasks(data.action_items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTaskStatus = async (meetingId, itemIndex, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI update
    setTasks(prev => prev.map(t => 
      (t.meeting_id === meetingId && t.item_index === itemIndex) 
        ? { ...t, completed: newStatus } 
        : t
    ));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${meetingId}/action-items/${itemIndex}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ completed: newStatus })
      });
      if (!res.ok) throw new Error('Lỗi cập nhật');
    } catch (err) {
      // Revert if error
      console.error(err);
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter(t => {
    // 1. Lọc theo trạng thái hoàn thành
    if (statusFilter === 'pending' && t.completed) return false;
    if (statusFilter === 'completed' && !t.completed) return false;
    
    // 2. Lọc theo chuỗi tìm kiếm (không phân biệt hoa thường)
    if (searchQuery.strip && searchQuery.strip().length > 0 || searchQuery.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = t.task_name?.toLowerCase().includes(query);
      const matchesAssignee = t.assignee?.toLowerCase().includes(query);
      const matchesMeeting = t.meeting_title?.toLowerCase().includes(query);
      return matchesName || matchesAssignee || matchesMeeting;
    }
    
    return true;
  });

  const getPriorityColor = (priority) => {
    if (priority === 'high') return '#f43f5e'; // Rose đỏ mềm
    if (priority === 'medium') return '#f59e0b'; // Amber vàng ấm
    if (priority === 'low') return '#10b981'; // Emerald xanh lục
    return 'var(--border-default)';
  };

  const getPriorityLabel = (priority) => {
    if (priority === 'high') return 'Cao';
    if (priority === 'medium') return 'Vừa';
    if (priority === 'low') return 'Thấp';
    return 'Trống';
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-5)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Danh Sách Công Việc</h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>Tổng hợp và quản lý tất cả nhiệm vụ được giao từ các cuộc họp của bạn</p>
      </div>

      {/* Search & Filter Bar (Linear Style) */}
      <div style={{ 
        display: 'flex', 
        gap: 'var(--space-3)', 
        marginBottom: 'var(--space-5)', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        background: 'var(--bg-surface)',
        padding: '12px var(--space-4)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Tìm kiếm công việc, người phụ trách, cuộc họp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-body)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--primary-500)';
              e.target.style.boxShadow = '0 0 0 2px rgba(102,126,234,0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-default)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', background: 'var(--bg-body)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
          <button 
            className={`mm-btn mm-btn--sm`}
            style={{ 
              padding: '4px 12px', fontSize: 'var(--text-xs)', height: 'auto',
              background: statusFilter === 'all' ? 'var(--bg-surface)' : 'transparent',
              color: statusFilter === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', boxShadow: statusFilter === 'all' ? 'var(--shadow-xs)' : 'none',
              fontWeight: statusFilter === 'all' ? 600 : 500
            }}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({tasks.length})
          </button>
          <button 
            className={`mm-btn mm-btn--sm`}
            style={{ 
              padding: '4px 12px', fontSize: 'var(--text-xs)', height: 'auto',
              background: statusFilter === 'pending' ? 'var(--bg-surface)' : 'transparent',
              color: statusFilter === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', boxShadow: statusFilter === 'pending' ? 'var(--shadow-xs)' : 'none',
              fontWeight: statusFilter === 'pending' ? 600 : 500
            }}
            onClick={() => setStatusFilter('pending')}
          >
            Chưa xong ({tasks.filter(t => !t.completed).length})
          </button>
          <button 
            className={`mm-btn mm-btn--sm`}
            style={{ 
              padding: '4px 12px', fontSize: 'var(--text-xs)', height: 'auto',
              background: statusFilter === 'completed' ? 'var(--bg-surface)' : 'transparent',
              color: statusFilter === 'completed' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none', boxShadow: statusFilter === 'completed' ? 'var(--shadow-xs)' : 'none',
              fontWeight: statusFilter === 'completed' ? 600 : 500
            }}
            onClick={() => statusFilter !== 'completed' && setStatusFilter('completed') || (() => {})}
          >
            Đã xong ({tasks.filter(t => t.completed).length})
          </button>
        </div>
      </div>

      {/* Main content area */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>Đang tải danh sách công việc...</p>
        </div>
      ) : error ? (
        <div className="mm-alert mm-alert--danger">
          <div className="mm-alert__content">
            <span className="mm-alert__title">Lỗi hệ thống</span>
            <span className="mm-alert__message">{error}</span>
          </div>
          <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={fetchTasks}>Thử lại</button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="mm-empty glass-panel" style={{ padding: 'var(--space-10) 0' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" style={{ marginBottom: 'var(--space-3)' }}>
            <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="mm-empty__title" style={{ fontSize: 'var(--text-md)' }}>Không tìm thấy công việc phù hợp</div>
          <div className="mm-empty__desc" style={{ fontSize: 'var(--text-xs)' }}>Không tìm thấy nhiệm vụ nào khớp với từ khóa tìm kiếm hoặc điều kiện lọc.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filteredTasks.map((task) => {
            const priorityColor = getPriorityColor(task.priority);
            return (
              <div 
                key={`${task.meeting_id}-${task.item_index}`} 
                className="bento-card hover-card" 
                style={{ 
                  padding: '12px var(--space-4)', 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center',
                  borderLeft: `4px solid ${priorityColor}`,
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-default)',
                  borderLeftColor: priorityColor,
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={!!task.completed}
                  onChange={() => toggleTaskStatus(task.meeting_id, task.item_index, task.completed)}
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    cursor: 'pointer', 
                    accentColor: 'var(--primary-500)',
                    flexShrink: 0 
                  }}
                />

                {/* Task Details - Left Aligned */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                  
                  {/* Row 1: Title and Priority Badge aligned closely to the left */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: '15px', 
                      fontWeight: 600, 
                      color: 'var(--text-primary)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.55 : 1,
                      transition: 'opacity 0.2s'
                    }}>
                      {task.task_name}
                    </span>
                    {task.priority && (
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 700, 
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        color: priorityColor,
                        background: `color-mix(in srgb, ${priorityColor} 10%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${priorityColor} 20%, transparent)`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        lineHeight: 1.4
                      }}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Left-Aligned Metadata Row */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {task.assignee || 'Chưa phân công'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {task.deadline || 'Không có hạn'}
                    </span>
                    
                    {/* Meeting Tag Link */}
                    <span 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        cursor: 'pointer', 
                        color: 'var(--primary-500)', 
                        background: 'var(--bg-surface-hover)', 
                        padding: '1px 6px', 
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        border: '1px solid var(--border-default)',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => navigate(`/history/${task.meeting_id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.background = 'var(--primary-500)';
                        e.currentTarget.style.borderColor = 'var(--primary-500)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--primary-500)';
                        e.currentTarget.style.background = 'var(--bg-surface-hover)';
                        e.currentTarget.style.borderColor = 'var(--border-default)';
                      }}
                      title="Đi tới cuộc họp chứa task này"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                      {task.meeting_title}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .hover-card {
          transition: all 0.2s ease-in-out;
        }
        .hover-card:hover {
          transform: translateX(2px);
          background: var(--bg-surface-hover) !important;
          box-shadow: var(--shadow-sm) !important;
        }
      `}</style>
    </div>
  );
};

export default TasksPage;
