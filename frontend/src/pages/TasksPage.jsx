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
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'

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
    if (statusFilter === 'pending') return !t.completed;
    if (statusFilter === 'completed') return t.completed;
    return true;
  });

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'var(--danger-500)';
    if (priority === 'medium') return 'var(--warning-500)';
    if (priority === 'low') return 'var(--success-500)';
    return 'var(--text-tertiary)';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Công Việc</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-2) 0 0' }}>Tổng hợp tất cả Action Items từ các cuộc họp</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button 
            className={`mm-btn mm-btn--sm ${statusFilter === 'all' ? 'mm-btn--primary' : 'mm-btn--ghost'}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả
          </button>
          <button 
            className={`mm-btn mm-btn--sm ${statusFilter === 'pending' ? 'mm-btn--primary' : 'mm-btn--ghost'}`}
            onClick={() => setStatusFilter('pending')}
          >
            Chưa xong
          </button>
          <button 
            className={`mm-btn mm-btn--sm ${statusFilter === 'completed' ? 'mm-btn--primary' : 'mm-btn--ghost'}`}
            onClick={() => setStatusFilter('completed')}
          >
            Đã xong
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="mm-alert mm-alert--danger">
          <div className="mm-alert__content">
            <span className="mm-alert__title">Lỗi tải dữ liệu</span>
            <span className="mm-alert__message">{error}</span>
          </div>
          <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={fetchTasks}>Thử lại</button>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="mm-empty glass-panel">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1" style={{ marginBottom: 'var(--space-4)' }}>
            <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="mm-empty__title">Không có công việc nào</div>
          <div className="mm-empty__desc">Bạn đã hoàn thành mọi thứ hoặc chưa có dữ liệu từ các cuộc họp.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {filteredTasks.map((task, idx) => (
            <div key={`${task.meeting_id}-${task.item_index}`} className="bento-card hover-card" style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={!!task.completed}
                onChange={() => toggleTaskStatus(task.meeting_id, task.item_index, task.completed)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary-500)' }}
              />
              <div style={{ flex: 1, opacity: task.completed ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ 
                    fontSize: 'var(--text-lg)', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    marginBottom: 'var(--space-1)'
                  }}>
                    {task.task_name}
                  </div>
                  {task.priority && (
                    <span style={{ 
                      fontSize: 'var(--text-xs)', 
                      fontWeight: 600, 
                      padding: '2px 8px', 
                      borderRadius: 'var(--radius-full)',
                      color: getPriorityColor(task.priority),
                      background: `color-mix(in srgb, ${getPriorityColor(task.priority)} 15%, transparent)`
                    }}>
                      {task.priority.toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {task.assignee || 'Chưa phân công'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {task.deadline || 'Không có hạn'}
                  </span>
                  <span 
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--primary-500)' }}
                    onClick={() => navigate(`/history/${task.meeting_id}`)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    {task.meeting_title}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .hover-card {
          transition: transform 0.2s, background 0.2s;
        }
        .hover-card:hover {
          transform: translateY(-2px);
          background: var(--bg-surface-hover);
        }
      `}</style>
    </div>
  );
};

export default TasksPage;
