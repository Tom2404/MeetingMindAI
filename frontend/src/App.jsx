import React, { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import AudioUpload from './components/AudioUpload';
import AudioRecorder from './components/AudioRecorder';
import MeetingSummary from './components/MeetingSummary';
import MeetingHistory from './components/MeetingHistory';
import AIStatusBar from './components/AIStatusBar';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [viewingSummaryId, setViewingSummaryId] = useState(null);

  // Sinh meetingId động cho WebSocket (tránh hardcode conflict)
  const [wsMeetingId] = useState(() => `meeting-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);

  // Kiểm tra token đã lưu trong localStorage khi khởi động
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        // Verify token còn sống bằng cách gọi /me
        fetch('http://127.0.0.1:8000/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Token hết hạn');
          })
          .then(data => {
            setCurrentUser(data.user);
            setToken(savedToken);
          })
          .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          })
          .finally(() => setIsCheckingAuth(false));
      } catch {
        setIsCheckingAuth(false);
      }
    } else {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleLoginSuccess = (user, authToken) => {
    setCurrentUser(user);
    setToken(authToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setToken(null);
    setCurrentTranscript("");
    setCurrentMeetingId(null);
    setViewingSummaryId(null);
  };

  const handleProcessComplete = (transcript, meetingId) => {
    setCurrentTranscript(transcript);
    if (meetingId) setCurrentMeetingId(meetingId);
  };

  const handleViewSummary = (meetingId) => {
    setViewingSummaryId(meetingId);
    setActiveTab('new'); // Switch sang tab chính để hiển thị summary
  };

  // Splash screen khi đang kiểm tra auth
  if (isCheckingAuth) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }}></div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Đang khởi động MeetingMind AI...</p>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập → Hiện trang Login/Register
  if (!currentUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Đã đăng nhập → Giao diện chính
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="var(--color-primary)"/>
            <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="var(--color-primary)"/>
          </svg>
          MeetingMind AI
        </h1>
        
        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '6px 14px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)',
            fontSize: '14px'
          }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: '600', fontSize: '13px'
            }}>
              {currentUser.username?.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
              {currentUser.full_name || currentUser.username}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px', background: 'none', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '13px',
              color: 'var(--text-secondary)', fontWeight: '500', transition: 'all 0.2s',
              fontFamily: 'var(--font-family)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fce8e6'; e.currentTarget.style.color = '#c53030'; e.currentTarget.style.borderColor = '#c53030'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: '0', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)', padding: '0 32px',
        maxWidth: '1200px', margin: '0 auto', width: '100%'
      }}>
        <button
          onClick={() => { setActiveTab('new'); setViewingSummaryId(null); }}
          style={{
            padding: '14px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'new' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'new' ? '#667eea' : 'var(--text-secondary)',
            fontWeight: activeTab === 'new' ? '600' : '400',
            cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
            fontFamily: 'var(--font-family)'
          }}
        >
          🎙️ Cuộc họp mới
        </button>
        <button
          onClick={() => { setActiveTab('history'); setViewingSummaryId(null); }}
          style={{
            padding: '14px 24px', background: 'none', border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #667eea' : '3px solid transparent',
            color: activeTab === 'history' ? '#667eea' : 'var(--text-secondary)',
            fontWeight: activeTab === 'history' ? '600' : '400',
            cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
            fontFamily: 'var(--font-family)'
          }}
        >
          📋 Lịch sử Cuộc họp
        </button>
      </div>

      <main className="main-content">
        {activeTab === 'new' && (
          <>
            {/* Thanh trạng thái AI — hiển thị đầu trang xử lý */}
            <AIStatusBar />

            <div className="grid-layout">
              <div className="card">
                <h2 className="card-title">Tải lên Bản ghi</h2>
                <AudioUpload onCompleteData={handleProcessComplete} token={token} />
              </div>

              <div className="card">
                <h2 className="card-title">Ghi âm Trực tuyến</h2>
                <AudioRecorder meetingId={wsMeetingId} onCompleteData={handleProcessComplete} />
              </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
              <h2 className="card-title">Tự động Tóm tắt & Trích xuất Nhiệm vụ</h2>
              <MeetingSummary 
                meetingId={currentMeetingId || wsMeetingId} 
                activeTranscript={currentTranscript} 
                viewingSummaryId={viewingSummaryId}
                token={token}
              />
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <h2 className="card-title">📋 Lịch sử các Cuộc họp đã Lưu</h2>
            <MeetingHistory token={token} onViewSummary={handleViewSummary} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
