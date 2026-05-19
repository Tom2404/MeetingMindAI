import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting } from '../contexts/MeetingContext';

/* ─── SVG Icons ─── */
const IconMenu = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;

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
            {meetingInfo ? '🔴 Phòng họp hiện tại' : 'Cuộc họp mới'}
          </button>
          <button 
            className={`sidebar__item ${location.pathname.startsWith('/history') ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/history'); closeSidebar(); }}
          >
            Lịch sử cuộc họp
          </button>
          <button 
            className={`sidebar__item ${location.pathname === '/tasks' ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/tasks'); closeSidebar(); }}
          >
            Bảng công việc
          </button>

          <span className="sidebar__section-label">Hệ thống</span>
          <button 
            className={`sidebar__item ${location.pathname === '/status' ? 'sidebar__item--active' : ''}`}
            onClick={() => { navigate('/status'); closeSidebar(); }}
          >
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
