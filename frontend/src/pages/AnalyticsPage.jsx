import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';

// === Icons ===
const IconClock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const IconCalendar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const IconCheckSquare = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const IconAlertCircle = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const IconTrendingUp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const IconUsers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const IconRefresh = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;

const AnalyticsPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [meetingsRes, tasksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/meetings/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/meetings/action-items`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!meetingsRes.ok || !tasksRes.ok) {
        throw new Error('Không thể tải đầy đủ dữ liệu thống kê từ hệ thống.');
      }

      const meetingsData = await meetingsRes.json();
      const tasksData = await tasksRes.json();

      setMeetings(meetingsData.meetings || []);
      setTasks(tasksData.action_items || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalMeetings = meetings.length;
  
  const totalSeconds = meetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0);
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const priorityStats = {
    high: { count: 0, completed: 0 },
    medium: { count: 0, completed: 0 },
    low: { count: 0, completed: 0 },
    none: { count: 0, completed: 0 }
  };

  tasks.forEach(t => {
    const prio = (t.priority || 'none').toLowerCase();
    if (priorityStats[prio]) {
      priorityStats[prio].count += 1;
      if (t.completed) priorityStats[prio].completed += 1;
    } else {
      priorityStats['none'].count += 1;
      if (t.completed) priorityStats['none'].completed += 1;
    }
  });

  const assigneeMap = {};
  tasks.forEach(t => {
    const name = t.assignee || 'Chưa phân công';
    if (!assigneeMap[name]) {
      assigneeMap[name] = { total: 0, completed: 0 };
    }
    assigneeMap[name].total += 1;
    if (t.completed) assigneeMap[name].completed += 1;
  });

  const assigneeStats = Object.keys(assigneeMap).map(name => ({
    name,
    total: assigneeMap[name].total,
    completed: assigneeMap[name].completed,
    pending: assigneeMap[name].total - assigneeMap[name].completed,
    rate: Math.round((assigneeMap[name].completed / assigneeMap[name].total) * 100)
  })).sort((a, b) => b.total - a.total);

  const maxDuration = Math.max(...meetings.map(m => m.duration_seconds || 1), 60);

  const formatDuration = (sec) => {
    if (!sec) return '0s';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getPriorityColor = (prio) => {
    if (prio === 'high') return 'var(--danger-500)';
    if (prio === 'medium') return 'var(--warning-500)';
    if (prio === 'low') return 'var(--success-500)';
    return 'var(--text-tertiary)';
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ marginBottom: 'var(--space-4)' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Đang phân tích dữ liệu hiệu suất...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mm-alert mm-alert--danger" style={{ margin: 'var(--space-6) 0' }}>
        <div className="mm-alert__content">
          <span className="mm-alert__title">Lỗi tải dữ liệu phân tích</span>
          <span className="mm-alert__message">{error}</span>
        </div>
        <button className="mm-btn mm-btn--sm mm-btn--danger" style={{ marginTop: '12px' }} onClick={fetchData}>Tải lại dữ liệu</button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      
      {/* Banner */}
      <div style={{
        background: 'var(--brand-gradient)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        color: 'white',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>Báo cáo & Thống kê Hiệu suất</h1>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: 'var(--text-sm)', maxWidth: '650px', lineHeight: 1.5 }}>
          Tổng hợp thông số họp hành của tài khoản và theo dõi sát sao tiến độ giải quyết công việc được trích xuất tự động bởi trí tuệ nhân tạo.
        </p>
      </div>

      {totalMeetings === 0 ? (
        <div className="mm-empty glass-panel" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div className="mm-empty__title" style={{ fontSize: '18px', fontWeight: 700 }}>Chưa có dữ liệu phân tích</div>
          <div className="mm-empty__desc" style={{ maxWidth: '400px', margin: '8px auto var(--space-4)' }}>
            Hãy thực hiện ghi âm hoặc tải lên file âm thanh cuộc họp đầu tiên để AI phân tích và tạo báo cáo hiệu suất.
          </div>
          <button className="mm-btn mm-btn--primary" onClick={() => navigate('/')}>
            Tạo cuộc họp mới
          </button>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-4)'
          }}>
            {/* Card 1: Total Meetings */}
            <div className="glass-panel" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div style={{
                background: 'var(--google-blue-bg)',
                color: 'var(--google-blue)',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconCalendar />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng cuộc họp</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1 }}>{totalMeetings}</div>
              </div>
            </div>

            {/* Card 2: Total Duration */}
            <div className="glass-panel" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div style={{
                background: 'var(--google-blue-bg)',
                color: 'var(--google-blue)',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconClock />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thời lượng họp</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1 }}>
                  {totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes} phút`}
                </div>
              </div>
            </div>

            {/* Card 3: Completion Rate */}
            <div className="glass-panel" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div style={{
                background: 'var(--google-blue-bg)',
                color: 'var(--google-blue)',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconCheckSquare />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Độ hoàn thành task</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{taskCompletionRate}%</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>({completedTasks}/{totalTasks})</span>
                </div>
              </div>
            </div>

            {/* Card 4: Pending Tasks */}
            <div className="glass-panel" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              transition: 'all 0.2s',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <div style={{
                background: 'var(--google-blue-bg)',
                color: 'var(--google-blue)',
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconAlertCircle />
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task tồn đọng</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1 }}>{pendingTasks}</div>
              </div>
            </div>
          </div>

          {/* Detailed Charts Grid */}
          <div className="grid-2" style={{ alignItems: 'stretch' }}>
            
            {/* Cột trái: Phân tích tiến độ công việc */}
            <div className="glass-panel" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-5)'
            }}>
              <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <IconTrendingUp style={{ color: 'var(--google-blue)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)' }}>Phân Tích Tiến Độ Công Việc</h2>
              </div>

              {totalTasks === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px var(--space-4)', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Chưa ghi nhận Action Items nào từ AI.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)' }}>Hãy ấn "Tóm tắt AI" ở trang chi tiết cuộc họp để trích xuất.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  
                  {/* Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Tỉ lệ hoàn thành chung</span>
                      <span style={{ fontWeight: 800, color: 'var(--google-green)' }}>{taskCompletionRate}%</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '14px',
                      background: 'var(--bg-body)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-default)'
                    }}>
                      <div style={{
                        width: `${taskCompletionRate}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--google-green) 0%, var(--google-green-light) 100%)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                  </div>

                  {/* Priority breakdowns */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chi tiết theo độ ưu tiên</span>
                    
                    {['high', 'medium', 'low', 'none'].map(prio => {
                      const stats = priorityStats[prio];
                      if (stats.count === 0) return null;
                      const rate = Math.round((stats.completed / stats.count) * 100);
                      const displayTitle = prio === 'none' ? 'Bình thường' : prio === 'high' ? 'Cao' : prio === 'medium' ? 'Trung bình' : 'Thấp';

                      return (
                        <div key={prio} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            width: '90px', 
                            color: getPriorityColor(prio),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getPriorityColor(prio) }} />
                            {displayTitle}
                          </span>
                          
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-body)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${rate}%`,
                              height: '100%',
                              background: getPriorityColor(prio),
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.5s ease-out'
                            }} />
                          </div>

                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', width: '65px', textAlign: 'right' }}>
                            {stats.completed}/{stats.count} ({rate}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Cột phải: Phân phối công việc theo thành viên */}
            <div className="glass-panel" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-5)'
            }}>
              <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <IconUsers style={{ color: 'var(--google-blue)' }} />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)' }}>Phân Bổ Task Theo Thành Viên</h2>
              </div>

              {assigneeStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px var(--space-4)', color: 'var(--text-secondary)' }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Không có công việc nào được phân công.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {assigneeStats.map((member, index) => (
                    <div key={member.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: index === 0 ? 'var(--brand-gradient)' : 'var(--bg-body)',
                            border: '1px solid var(--border-default)',
                            color: index === 0 ? 'white' : 'var(--text-primary)',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                            {member.name}
                            {index === 0 && <span style={{ marginLeft: '6px', fontSize: '9px', fontWeight: 700, background: 'var(--google-blue-bg)', color: 'var(--google-blue)', padding: '1px 6px', borderRadius: '4px' }}>Tập trung</span>}
                          </span>
                        </div>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {member.completed}/{member.total} tasks ({member.rate}%)
                        </span>
                      </div>
                      
                      <div style={{ height: '6px', background: 'var(--bg-body)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${member.rate}%`,
                          height: '100%',
                          background: member.rate >= 70 ? 'var(--google-green)' : member.rate >= 40 ? 'var(--google-blue)' : 'var(--google-red)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.5s ease-out'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Lịch sử hoạt động cuộc họp */}
          <div className="glass-panel" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <IconClock />
                <h2 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 800, color: 'var(--text-primary)' }}>Thời Lượng Hoạt Động Gần Đây</h2>
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Đơn vị: phút</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {meetings.slice(0, 5).map((m) => {
                const durationMinutes = Math.round((m.duration_seconds || 0) / 60) || 1;
                const percent = Math.min(100, Math.round(((m.duration_seconds || 1) / maxDuration) * 100));
                const formattedDate = new Date(m.created_at).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <span 
                        onClick={() => navigate(`/history/${m.id}`)}
                        style={{
                          fontWeight: 700, 
                          fontSize: 'var(--text-sm)', 
                          color: 'var(--google-blue)', 
                          cursor: 'pointer',
                          display: 'block',
                          marginBottom: '2px'
                        }}
                      >
                        {m.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{formattedDate}</span>
                    </div>

                    <div style={{ flex: '2 1 300px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '18px', background: 'var(--bg-body)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--primary-500) 0%, var(--primary-300) 100%)',
                          borderRadius: '5px',
                          transition: 'width 0.6s ease'
                        }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', width: '60px', textAlign: 'right' }}>
                        {formatDuration(m.duration_seconds)}
                      </span>
                    </div>

                    <div>
                      {m.has_summary ? (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          background: 'var(--success-50)',
                          color: 'var(--google-green)',
                          borderRadius: 'var(--radius-sm)'
                        }}>AI Summarized</span>
                      ) : (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          background: 'var(--bg-body)',
                          color: 'var(--text-tertiary)',
                          borderRadius: 'var(--radius-sm)'
                        }}>Audio Only</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Floating Action Button */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
        <button 
          onClick={fetchData}
          className="mm-btn mm-btn--secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-xl)' }}
        >
          <IconRefresh /> Làm mới dữ liệu
        </button>
      </div>

    </div>
  );
};

export default AnalyticsPage;
