import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';

/* ─── SVG Icons ─── */
const IconMenu = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const IconPlus = () => <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const IconHistory = () => <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="9"></circle><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"></path></svg>;
const IconTasks = () => <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>;
const IconTemplates = () => <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="11" y2="17"></line></svg>;
const IconAnalytics = () => <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const IconServer = () => <svg className="sidebar__item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>;
const IconMicActive = () => <svg className="sidebar__item-icon" style={{color: 'var(--google-red)'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;

const MainLayout = () => {
  const { isDark, theme, setTheme } = useTheme();
  const { currentUser, logout } = useAuth();
  const { meetingInfo, endMeeting } = useMeeting();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    endMeeting();
    logout();
    navigate('/');
  };

  const handleNewMeetingClick = () => {
    if (meetingInfo && location.pathname !== '/room') {
      navigate('/room');
      closeSidebar();
      return;
    }
    
    if (meetingInfo && location.pathname === '/room') {
      if (!window.confirm("Bắt đầu cuộc họp mới sẽ đóng phiên làm việc hiện tại. Bạn có chắc chắn?")) return;
    }
    
    endMeeting();
    navigate('/');
    closeSidebar();
  };

  const displayName = currentUser?.full_name || currentUser?.username || 'Người dùng';

  // Determine title based on location
  let headerTitle = 'Bắt đầu';
  if (location.pathname === '/room') headerTitle = 'Phòng họp';
  if (location.pathname === '/history') headerTitle = 'Lịch sử cuộc họp';
  if (location.pathname.startsWith('/history/')) headerTitle = 'Bản tóm tắt cũ';
  if (location.pathname === '/tasks') headerTitle = 'Công việc';
  if (location.pathname === '/status') headerTitle = 'Trạng thái AI';
  if (location.pathname === '/profile') headerTitle = 'Hồ sơ & Cài đặt';
  if (location.pathname === '/templates') headerTitle = 'Thư viện Mẫu Prompt AI';
  if (location.pathname === '/analytics') headerTitle = 'Phân Tích & Thống Kê';

  return (
    <div className="app-shell">
      <div className={`sidebar-overlay ${sidebarOpen ? 'sidebar-overlay--visible' : ''}`} onClick={closeSidebar} />

      {/* ─── Sidebar ─── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </div>
          <span className="sidebar__brand-name">MeetingMind</span>
        </div>

        <nav className="sidebar__nav">
          <span className="sidebar__section-label">Công việc</span>
          <button 
            className={`sidebar__item ${location.pathname === '/' || location.pathname === '/room' ? 'sidebar__item--active' : ''}`}
            onClick={handleNewMeetingClick}
          >
            {meetingInfo ? <IconMicActive /> : <IconPlus />}
            {meetingInfo ? '🔴 Phòng họp hiện tại' : 'Cuộc họp mới'}
          </button>
          <button 
            className={`sidebar__item ${location.pathname.startsWith('/history') ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/history'); closeSidebar(); }}
          >
            <IconHistory />
            Lịch sử cuộc họp
          </button>
          <button 
            className={`sidebar__item ${location.pathname === '/tasks' ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/tasks'); closeSidebar(); }}
          >
            <IconTasks />
            Bảng công việc
          </button>

          <span className="sidebar__section-label">Trợ lý AI</span>
          <button 
            className={`sidebar__item ${location.pathname === '/templates' ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/templates'); closeSidebar(); }}
          >
            <IconTemplates />
            Thư viện Mẫu AI
          </button>
          <button 
            className={`sidebar__item ${location.pathname === '/analytics' ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/analytics'); closeSidebar(); }}
          >
            <IconAnalytics />
            Thống kê Hiệu suất
          </button>

          <span className="sidebar__section-label">Hệ thống</span>
          <button 
            className={`sidebar__item ${location.pathname === '/status' ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/status'); closeSidebar(); }}
          >
            <IconServer />
            Trạng thái máy chủ
          </button>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user" onClick={() => { navigate('/profile'); closeSidebar(); }} title="Cài đặt hồ sơ">
            <div className="sidebar__avatar" style={{ overflow: 'hidden' }}>
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUser?.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div className="sidebar__user-name">{displayName}</div>
              <div className="sidebar__user-role">Hồ sơ & Cài đặt AI</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="main-area">
        <header className="header">
          <div className="header__left">
            <button className="header__hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu"><IconMenu /></button>
            <div>
              <div className="header__title">{headerTitle}</div>
              {meetingInfo && location.pathname === '/room' && <div className="header__breadcrumb">Phiên: {meetingInfo.meetingName}</div>}
            </div>
          </div>
          <div className="header__right">
            <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={handleLogout}>Đăng xuất</button>
            <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Đổi giao diện">
              {isDark ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
