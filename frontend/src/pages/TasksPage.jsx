import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import { gsap } from 'gsap';
import { useNotification } from '../contexts/NotificationContext';

const TasksPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { notify, confirm } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search & Local Storage Kanban states
  const [searchQuery, setSearchQuery] = useState('');
  const [inProgressIds, setInProgressIds] = useState([]);
  const [activeDragColumn, setActiveDragColumn] = useState(null); // 'todo', 'inprogress', 'done'

  // Task Edit Modal States
  const [editingTask, setEditingTask] = useState(null); // Task object being edited
  const [editForm, setEditForm] = useState({ task_name: '', assignee: '', deadline: '', priority: 'medium' });

  const boardRef = useRef(null);

  // Load In Progress IDs from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('meetingmind_in_progress');
    if (saved) {
      try {
        setInProgressIds(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi đọc LocalStorage", e);
      }
    }
  }, []);

  // Fetch tasks on mount
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

  // Save In Progress IDs to LocalStorage & State
  const saveInProgress = (ids) => {
    localStorage.setItem('meetingmind_in_progress', JSON.stringify(ids));
    setInProgressIds(ids);
  };

  // Move task to target column
  const moveTask = async (meetingId, itemIndex, targetColumn) => {
    const taskId = `${meetingId}-${itemIndex}`;
    let updatedInProgress = [...inProgressIds];
    let newCompletedStatus = false;

    if (targetColumn === 'todo') {
      newCompletedStatus = false;
      updatedInProgress = updatedInProgress.filter(id => id !== taskId);
    } else if (targetColumn === 'inprogress') {
      newCompletedStatus = false;
      if (!updatedInProgress.includes(taskId)) {
        updatedInProgress.push(taskId);
      }
    } else if (targetColumn === 'done') {
      newCompletedStatus = true;
      updatedInProgress = updatedInProgress.filter(id => id !== taskId);
    }

    // Optimistic UI Update in React
    setTasks(prev => prev.map(t => 
      (t.meeting_id === meetingId && t.item_index === itemIndex) 
        ? { ...t, completed: newCompletedStatus } 
        : t
    ));
    saveInProgress(updatedInProgress);

    // Call API to sync status
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${meetingId}/action-items/${itemIndex}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ completed: newCompletedStatus })
      });
      if (!res.ok) throw new Error('Lỗi cập nhật API');
    } catch (err) {
      console.error(err);
      fetchTasks(); // Revert back by refetching on error
    }
  };

  // Task Handlers for Edit and Delete
  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditForm({
      task_name: task.task_name || '',
      assignee: task.assignee || '',
      deadline: task.deadline || '',
      priority: task.priority || 'medium'
    });
  };

  const handleCloseEdit = () => {
    setEditingTask(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    
    // Cập nhật Optimistic trên giao diện
    setTasks(prev => prev.map(t => 
      (t.meeting_id === editingTask.meeting_id && t.item_index === editingTask.item_index)
        ? { ...t, ...editForm }
        : t
    ));
    setEditingTask(null);

    // Gửi dữ liệu cập nhật về Backend
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${editingTask.meeting_id}/action-items/${editingTask.item_index}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error("Lỗi cập nhật task");
      notify("Đã cập nhật công việc thành công", "success");
    } catch (err) {
      console.error(err);
      notify("Không thể lưu thay đổi vào cơ sở dữ liệu", "error");
      fetchTasks();
    }
  };

  const handleDeleteTask = async (meetingId, itemIndex) => {
    const confirmed = await confirm(
      "Bạn có chắc chắn muốn xóa vĩnh viễn công việc này khỏi cuộc họp không?",
      "Xác nhận xóa công việc"
    );
    if (!confirmed) return;
    
    // Chạy hiệu ứng trượt mờ co lại card trước khi xóa khỏi state
    const cardEl = document.getElementById(`task-card-${meetingId}-${itemIndex}`);
    if (cardEl) {
      await gsap.to(cardEl, {
        opacity: 0,
        scale: 0.9,
        y: 15,
        duration: 0.25,
        ease: 'power2.in'
      });
    }

    // Xóa Optimistic trên UI
    setTasks(prev => prev.filter(t => !(t.meeting_id === meetingId && t.item_index === itemIndex)));

    // Gọi API xóa ở Backend
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${meetingId}/action-items/${itemIndex}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Lỗi xóa task");
      notify("Đã xóa công việc thành công", "success");
    } catch (err) {
      console.error(err);
      notify("Không thể xóa công việc khỏi cơ sở dữ liệu", "error");
      fetchTasks();
    }
  };

  // Drag and drop mechanics
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      meeting_id: task.meeting_id,
      item_index: task.item_index
    }));
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setActiveDragColumn(null);
  };

  const handleDragOver = (e, column) => {
    e.preventDefault();
    if (activeDragColumn !== column) {
      setActiveDragColumn(column);
    }
  };

  const handleDragLeave = (e) => {
    setActiveDragColumn(null);
  };

  const handleDrop = (e, targetColumn) => {
    e.preventDefault();
    setActiveDragColumn(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      moveTask(data.meeting_id, data.item_index, targetColumn);

      // Trigger GSAP feedback nẩy card khi thả thành công
      setTimeout(() => {
        const droppedEl = document.getElementById(`task-card-${data.meeting_id}-${data.item_index}`);
        if (droppedEl) {
          gsap.fromTo(droppedEl, 
            { scale: 0.94, y: -5 }, 
            { scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.6)' }
          );
        }
      }, 50);

    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'var(--danger-500)';
    if (priority === 'medium') return 'var(--warning-500)';
    if (priority === 'low') return 'var(--success-500)';
    return 'var(--text-tertiary)';
  };

  const getPriorityLabel = (priority) => {
    if (priority === 'high') return 'Cao';
    if (priority === 'medium') return 'Vừa';
    if (priority === 'low') return 'Thấp';
    return 'Thường';
  };

  // Separate tasks into 3 columns
  const todoList = tasks.filter(t => !t.completed && !inProgressIds.includes(`${t.meeting_id}-${t.item_index}`));
  const inProgressList = tasks.filter(t => !t.completed && inProgressIds.includes(`${t.meeting_id}-${t.item_index}`));
  const doneList = tasks.filter(t => t.completed);

  // Search filtering helper
  const filterBySearch = (list) => {
    if (!searchQuery || searchQuery.trim().length === 0) return list;
    const query = searchQuery.toLowerCase().trim();
    return list.filter(t => 
      t.task_name?.toLowerCase().includes(query) ||
      t.assignee?.toLowerCase().includes(query) ||
      t.meeting_title?.toLowerCase().includes(query)
    );
  };

  const filteredTodo = filterBySearch(todoList);
  const filteredInProgress = filterBySearch(inProgressList);
  const filteredDone = filterBySearch(doneList);

  // Staggered load on bento column containers
  useEffect(() => {
    if (!isLoading && tasks.length > 0) {
      const ctx = gsap.context(() => {
        gsap.fromTo('.kanban-column', 
          { y: 30, opacity: 0 }, 
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1 }
        );
      }, boardRef);
      return () => ctx.revert();
    }
  }, [isLoading]);

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>Bảng Công Việc (Kanban)</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>Kéo thả các thẻ nhiệm vụ để phân loại và cập nhật tiến độ cuộc họp nhanh chóng.</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="glass-panel" style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Tìm kiếm công việc, người thực hiện, cuộc họp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-body)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--google-blue)';
              e.target.style.boxShadow = '0 0 0 3px rgba(35, 131, 226, 0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-default)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <button 
          onClick={fetchTasks} 
          className="mm-btn mm-btn--secondary mm-btn--sm"
          style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Làm mới
        </button>
      </div>

      {/* Kanban Board Container */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Đang tải bảng công việc...</p>
        </div>
      ) : error ? (
        <div className="mm-alert mm-alert--danger glass-panel">
          <div className="mm-alert__content">
            <span className="mm-alert__title">Lỗi kết nối</span>
            <span className="mm-alert__message">{error}</span>
          </div>
          <button className="mm-btn mm-btn--sm mm-btn--danger" style={{ marginTop: '12px' }} onClick={fetchTasks}>Thử lại</button>
        </div>
      ) : (
        <div className="kanban-board" ref={boardRef}>
          
          {/* Column 1: TO DO */}
          <div 
            className={`kanban-column ${activeDragColumn === 'todo' ? 'kanban-column--hovered' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'todo')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'todo')}
            style={{ borderTop: '4px solid var(--text-tertiary)' }}
          >
            <div className="kanban-column__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="kanban-column__dot" style={{ backgroundColor: 'var(--text-tertiary)' }}></span>
                <span className="kanban-column__title">Cần làm</span>
                <span className="kanban-column__badge">{filteredTodo.length}</span>
              </div>
            </div>
            
            <div className="kanban-column__list">
              {filteredTodo.length === 0 ? (
                <div className="kanban-empty">Không có công việc</div>
              ) : (
                filteredTodo.map(t => (
                  <TaskCard 
                    key={`${t.meeting_id}-${t.item_index}`} 
                    task={t} 
                    onDragStart={(e) => handleDragStart(e, t)} 
                    onDragEnd={handleDragEnd} 
                    onClickNavigate={() => navigate(`/history/${t.meeting_id}`)} 
                    priorityColor={getPriorityColor(t.priority)} 
                    priorityLabel={getPriorityLabel(t.priority)} 
                    onToggleStatus={() => moveTask(t.meeting_id, t.item_index, 'done')}
                    onEdit={() => handleOpenEdit(t)}
                    onDelete={() => handleDeleteTask(t.meeting_id, t.item_index)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div 
            className={`kanban-column ${activeDragColumn === 'inprogress' ? 'kanban-column--hovered' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'inprogress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'inprogress')}
            style={{ borderTop: '4px solid var(--warning-500)' }}
          >
            <div className="kanban-column__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="kanban-column__dot" style={{ backgroundColor: 'var(--warning-500)' }}></span>
                <span className="kanban-column__title">Đang thực hiện</span>
                <span className="kanban-column__badge">{filteredInProgress.length}</span>
              </div>
            </div>

            <div className="kanban-column__list">
              {filteredInProgress.length === 0 ? (
                <div className="kanban-empty">Kéo thẻ vào đây để bắt đầu</div>
              ) : (
                filteredInProgress.map(t => (
                  <TaskCard 
                    key={`${t.meeting_id}-${t.item_index}`} 
                    task={t} 
                    onDragStart={(e) => handleDragStart(e, t)} 
                    onDragEnd={handleDragEnd} 
                    onClickNavigate={() => navigate(`/history/${t.meeting_id}`)} 
                    priorityColor={getPriorityColor(t.priority)} 
                    priorityLabel={getPriorityLabel(t.priority)} 
                    onToggleStatus={() => moveTask(t.meeting_id, t.item_index, 'done')}
                    onEdit={() => handleOpenEdit(t)}
                    onDelete={() => handleDeleteTask(t.meeting_id, t.item_index)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: DONE */}
          <div 
            className={`kanban-column ${activeDragColumn === 'done' ? 'kanban-column--hovered' : ''}`}
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
            style={{ borderTop: '4px solid var(--success-500)' }}
          >
            <div className="kanban-column__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="kanban-column__dot" style={{ backgroundColor: 'var(--success-500)' }}></span>
                <span className="kanban-column__title">Đã hoàn thành</span>
                <span className="kanban-column__badge">{filteredDone.length}</span>
              </div>
            </div>

            <div className="kanban-column__list">
              {filteredDone.length === 0 ? (
                <div className="kanban-empty">Không có công việc đã xong</div>
              ) : (
                filteredDone.map(t => (
                  <TaskCard 
                    key={`${t.meeting_id}-${t.item_index}`} 
                    task={t} 
                    onDragStart={(e) => handleDragStart(e, t)} 
                    onDragEnd={handleDragEnd} 
                    onClickNavigate={() => navigate(`/history/${t.meeting_id}`)} 
                    priorityColor={getPriorityColor(t.priority)} 
                    priorityLabel={getPriorityLabel(t.priority)} 
                    onToggleStatus={() => moveTask(t.meeting_id, t.item_index, 'todo')}
                    onEdit={() => handleOpenEdit(t)}
                    onDelete={() => handleDeleteTask(t.meeting_id, t.item_index)}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Edit Task Modal Dialog */}
      {editingTask && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            width: '100%',
            maxWidth: '420px',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-3)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Chỉnh sửa công việc</span>
              <button 
                onClick={handleCloseEdit}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Task Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Tên công việc</label>
                <input 
                  type="text"
                  required
                  value={editForm.task_name}
                  onChange={e => setEditForm({ ...editForm, task_name: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-body)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Assignee */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Người phụ trách</label>
                <input 
                  type="text"
                  value={editForm.assignee}
                  onChange={e => setEditForm({ ...editForm, assignee: e.target.value })}
                  placeholder="Chưa gán..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-body)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Deadline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Hạn chót</label>
                <input 
                  type="text"
                  value={editForm.deadline}
                  onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                  placeholder="Hạn chót..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-body)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Priority */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Độ ưu tiên</label>
                <select
                  value={editForm.priority}
                  onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-body)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                    outline: 'none'
                  }}
                >
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button 
                  type="button" 
                  onClick={handleCloseEdit}
                  className="mm-btn mm-btn--secondary mm-btn--sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="mm-btn mm-btn--primary mm-btn--sm"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Tag Encapsulation */}
      <style>{`
        .kanban-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-5);
          align-items: start;
        }
        @media (max-width: 960px) {
          .kanban-board {
            grid-template-columns: 1fr;
            gap: var(--space-6);
          }
        }
        .kanban-column {
          background: rgba(245, 245, 244, 0.4);
          border-radius: var(--radius-xl);
          border: 1px solid var(--border-default);
          padding: var(--space-4);
          min-height: 520px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          transition: all 0.25s ease-out;
        }
        [data-theme="dark"] .kanban-column {
          background: rgba(32, 32, 32, 0.45);
        }
        .kanban-column--hovered {
          background: rgba(35, 131, 226, 0.05) !important;
          border-color: var(--google-blue);
          box-shadow: 0 0 15px rgba(35, 131, 226, 0.08);
        }
        .kanban-column__header {
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--border-default);
        }
        .kanban-column__dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .kanban-column__title {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--text-primary);
          font-family: var(--font-display);
        }
        .kanban-column__badge {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-tertiary);
          background: var(--bg-surface-hover);
          padding: 2px 7px;
          border-radius: 9999px;
          border: 1px solid var(--border-default);
        }
        .kanban-column__list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        .kanban-empty {
          border: 1px dashed var(--border-default);
          border-radius: var(--radius-lg);
          padding: var(--space-8) var(--space-2);
          text-align: center;
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          margin-top: auto;
          margin-bottom: auto;
        }
        .kanban-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          box-shadow: var(--shadow-xs);
          cursor: grab;
          user-select: none;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
        }
        .kanban-card:active {
          cursor: grabbing;
        }
        .kanban-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          border-color: var(--border-hover);
        }
        .kanban-card:hover .kanban-card__actions {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

// Encapsulated Task Card Component
const TaskCard = ({ task, onDragStart, onDragEnd, onClickNavigate, priorityColor, priorityLabel, onToggleStatus, onEdit, onDelete }) => {
  return (
    <div 
      id={`task-card-${task.meeting_id}-${task.item_index}`}
      className="kanban-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ borderLeft: `4px solid ${priorityColor}` }}
    >
      {/* Floating Action Buttons revealed on hover */}
      <div 
        className="kanban-card__actions"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          opacity: 0,
          transition: 'opacity 0.2s ease',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-sm)',
          padding: '2px',
          boxShadow: 'var(--shadow-xs)',
          border: '1px solid var(--border-default)'
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
            borderRadius: '4px', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--google-blue)'; e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          title="Sửa công việc"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
            borderRadius: '4px', transition: 'all 0.15s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--google-red)'; e.currentTarget.style.background = 'rgba(244, 63, 94, 0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          title="Xóa công việc"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {/* Row 1: Checkbox & Name */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', paddingRight: '28px' }}>
        <input 
          type="checkbox"
          checked={!!task.completed}
          onChange={onToggleStatus}
          style={{ width: '16px', height: '16px', marginTop: '2px', cursor: 'pointer', accentColor: 'var(--google-blue)', flexShrink: 0 }}
        />
        <div style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ 
            fontSize: 'var(--text-sm)', 
            fontWeight: 600, 
            color: 'var(--text-primary)',
            textDecoration: task.completed ? 'line-through' : 'none',
            opacity: task.completed ? 0.6 : 1,
            lineHeight: 1.4,
            display: 'block'
          }}>
            {task.task_name}
          </span>
        </div>
      </div>

      {/* Row 2: Badges (Priority, Assignee) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        <span style={{ 
          fontSize: '9px', 
          fontWeight: 700, 
          padding: '1px 6px', 
          borderRadius: '4px',
          color: priorityColor,
          background: `color-mix(in srgb, ${priorityColor} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${priorityColor} 16%, transparent)`,
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          {priorityLabel}
        </span>

        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {task.assignee || 'Chưa rõ'}
        </span>

        {task.deadline && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {task.deadline}
          </span>
        )}
      </div>

      {/* Row 3: Meeting Link Tag */}
      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '6px', display: 'flex', justifyContent: 'flex-start' }}>
        <span 
          onClick={(e) => { e.stopPropagation(); onClickNavigate(); }}
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '3px', 
            cursor: 'pointer', 
            color: 'var(--primary-500)', 
            background: 'var(--bg-surface-hover)', 
            padding: '1px 6px', 
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 500,
            border: '1px solid var(--border-default)',
            transition: 'all 0.15s'
          }}
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
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          {task.meeting_title}
        </span>
      </div>
    </div>
  );
};

export default TasksPage;
