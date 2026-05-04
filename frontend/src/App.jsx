import React, { useState, useEffect } from 'react';
import { useTheme } from './contexts/ThemeContext';
import AuthPage from './components/AuthPage';
import AudioUpload from './components/AudioUpload';
import AudioRecorder from './components/AudioRecorder';
import MeetingSummary from './components/MeetingSummary';
import MeetingHistory from './components/MeetingHistory';
import AIStatusBar from './components/AIStatusBar';
import MeetingSetup from './components/MeetingSetup';

/* ─── SVG Icons (Google Material style) ─── */
const IconMic = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>;
const IconHistory = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>;
const IconBot = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z"/></svg>;
const IconMenu = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>;
const IconLogout = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>;

const PAGES = { new: 'Cuộc họp mới', history: 'Lịch sử cuộc họp', status: 'Trạng thái AI' };

function App() {
  const { toggleTheme, isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [activePage, setActivePage] = useState('new');
  const [viewingSummaryId, setViewingSummaryId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [activeMethod, setActiveMethod] = useState(null);
  const [wsMeetingId] = useState(() => `meeting-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      fetch('http://127.0.0.1:8000/api/v1/auth/me', { headers: { 'Authorization': `Bearer ${savedToken}` } })
        .then(res => { if (res.ok) return res.json(); throw new Error(); })
        .then(data => { setCurrentUser(data.user); setToken(savedToken); })
        .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); })
        .finally(() => setIsCheckingAuth(false));
    } else { setIsCheckingAuth(false); }
  }, []);

  const handleLoginSuccess = (user, t) => { setCurrentUser(user); setToken(t); };
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); setCurrentUser(null); setToken(null); setCurrentTranscript(""); setCurrentMeetingId(null); setViewingSummaryId(null); setMeetingInfo(null); setActiveMethod(null); };
  const handleProcessComplete = (transcript, meetingId) => { setCurrentTranscript(transcript); if (meetingId) setCurrentMeetingId(meetingId); };
  const handleViewSummary = (meetingId) => { setViewingSummaryId(meetingId); setActivePage('new'); };
  const handleSetupConfirm = (info) => { setMeetingInfo(info); setActiveMethod(info.method); setShowSetup(false); setCurrentTranscript(""); setCurrentMeetingId(null); setViewingSummaryId(null); setActivePage('new'); };
  const handleBackToSetup = () => { setMeetingInfo(null); setActiveMethod(null); setCurrentTranscript(""); };
  const closeSidebar = () => setSidebarOpen(false);

  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'; };

  if (isCheckingAuth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-body)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin:'0 auto 16px' }}></div>
        <p style={{ color:'var(--text-secondary)', fontWeight:500 }}>Đang khởi động...</p>
      </div>
    </div>
  );

  if (!currentUser) return <AuthPage onLoginSuccess={handleLoginSuccess} />;

  const displayName = currentUser.full_name || currentUser.username;

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
          <span className="sidebar__section-label">Chính</span>
          {[
            { key: 'new', icon: <IconMic />, label: 'Cuộc họp mới' },
            { key: 'history', icon: <IconHistory />, label: 'Lịch sử' },
          ].map(item => (
            <button key={item.key}
              className={`sidebar__item ${activePage === item.key ? 'sidebar__item--active' : ''}`}
              onClick={() => { setActivePage(item.key); if(item.key==='history') setViewingSummaryId(null); closeSidebar(); }}
            >
              <span className="sidebar__item-icon">{item.icon}</span>{item.label}
            </button>
          ))}

          <span className="sidebar__section-label">Hệ thống</span>
          <button className={`sidebar__item ${activePage === 'status' ? 'sidebar__item--active' : ''}`}
            onClick={() => { setActivePage('status'); closeSidebar(); }}>
            <span className="sidebar__item-icon"><IconBot /></span>Trạng thái AI
          </button>
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user" onClick={handleLogout} title="Đăng xuất">
            <div className="sidebar__avatar">{currentUser.username?.charAt(0).toUpperCase()}</div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div className="sidebar__user-name">{displayName}</div>
              <div className="sidebar__user-role">Nhấn để đăng xuất</div>
            </div>
            <IconLogout />
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="main-area">
        <header className="header">
          <div className="header__left">
            <button className="header__hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu"><IconMenu /></button>
            <div>
              <div className="header__title">{PAGES[activePage] || ''}</div>
              {meetingInfo && activePage === 'new' && <div className="header__breadcrumb">📝 {meetingInfo.meetingName}</div>}
            </div>
          </div>
          <div className="header__right">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Đổi giao diện">{isDark ? '☀️' : '🌙'}</button>
          </div>
        </header>

        <div className="page-content" key={activePage}>
          {/* ══ New Meeting ══ */}
          {activePage === 'new' && (
            <>
              {!meetingInfo && !viewingSummaryId && (
                <div className="animate-fade-in">
                  <div className="page-greeting">
                    <div className="page-greeting__hello">{getGreeting()}, {displayName}! 👋</div>
                    <div className="page-greeting__sub">Bắt đầu cuộc họp mới hoặc xem lại kết quả cũ.</div>
                  </div>
                  <AIStatusBar />
                  <div className="cta-hero" style={{ marginTop:'var(--space-6)' }}>
                    <span className="cta-hero__icon">🎙️</span>
                    <div className="cta-hero__title">Bắt đầu cuộc họp mới</div>
                    <p className="cta-hero__desc">Tải file ghi âm hoặc ghi âm trực tiếp — AI sẽ tự động tóm tắt, trích xuất quyết định và nhiệm vụ cho bạn.</p>
                    <button className="mm-btn mm-btn--lg mm-btn--primary" onClick={() => setShowSetup(true)}>
                      ✨ Tạo cuộc họp mới
                    </button>
                  </div>
                </div>
              )}

              {meetingInfo && (
                <div className="animate-fade-in">
                  <div className="mm-card mm-card--accent" style={{ marginBottom:'var(--space-5)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'var(--text-lg)', color:'var(--text-primary)', marginBottom:4, fontFamily:'var(--font-display)' }}>{meetingInfo.meetingName}</div>
                        <div style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)', display:'flex', gap:'var(--space-4)', flexWrap:'wrap' }}>
                          {meetingInfo.host && <span>👤 {meetingInfo.host}</span>}
                          {meetingInfo.participants && <span>👥 {meetingInfo.participants}</span>}
                          <span>📅 {new Date().toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={handleBackToSetup}>← Quay lại</button>
                    </div>
                  </div>

                  {activeMethod === 'upload' && (
                    <div className="mm-card">
                      <div className="mm-card__header">
                        <div className="mm-card__icon mm-card__icon--primary">📁</div>
                        <div className="mm-card__title">Tải lên bản ghi âm</div>
                      </div>
                      <AudioUpload onCompleteData={handleProcessComplete} token={token} />
                    </div>
                  )}

                  {activeMethod === 'record' && (
                    <div className="mm-card">
                      <div className="mm-card__header">
                        <div className="mm-card__icon mm-card__icon--danger">🎙️</div>
                        <div className="mm-card__title">Ghi âm trực tuyến</div>
                      </div>
                      <AudioRecorder meetingId={wsMeetingId} onCompleteData={handleProcessComplete} />
                    </div>
                  )}

                  <div className="mm-card" style={{ marginTop:'var(--space-5)' }}>
                    <div className="mm-card__header">
                      <div className="mm-card__icon mm-card__icon--success">📊</div>
                      <div className="mm-card__title">Kết quả AI Tóm tắt</div>
                    </div>
                    <MeetingSummary meetingId={currentMeetingId || wsMeetingId} activeTranscript={currentTranscript} viewingSummaryId={viewingSummaryId} token={token} meetingInfo={meetingInfo} />
                  </div>
                </div>
              )}

              {viewingSummaryId && !meetingInfo && (
                <div className="animate-fade-in">
                  <div className="mm-card">
                    <div className="mm-card__header">
                      <div className="mm-card__icon mm-card__icon--success">📊</div>
                      <div className="mm-card__title">Bản tóm tắt đã lưu</div>
                    </div>
                    <MeetingSummary meetingId={viewingSummaryId} activeTranscript={currentTranscript} viewingSummaryId={viewingSummaryId} token={token} />
                  </div>
                </div>
              )}
            </>
          )}

          {activePage === 'history' && (
            <div className="animate-fade-in">
              <div className="mm-card">
                <div className="mm-card__header">
                  <div className="mm-card__icon mm-card__icon--primary"><IconHistory /></div>
                  <div className="mm-card__title">Lịch sử các cuộc họp</div>
                </div>
                <MeetingHistory token={token} onViewSummary={handleViewSummary} />
              </div>
            </div>
          )}

          {activePage === 'status' && (
            <div className="animate-fade-in">
              <div className="page-greeting">
                <div className="page-greeting__hello">🤖 Trạng thái Hệ thống AI</div>
                <div className="page-greeting__sub">Kiểm tra Ollama LLM và Faster-Whisper STT</div>
              </div>
              <AIStatusBar />
            </div>
          )}
        </div>
      </div>

      {showSetup && <MeetingSetup onConfirm={handleSetupConfirm} onCancel={() => setShowSetup(false)} />}
    </div>
  );
}

export default App;
