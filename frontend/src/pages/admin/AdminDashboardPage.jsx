import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

/* ─── SVG Icons ─── */
const IconUsers = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const IconActivity = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const IconAlertTriangle = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const IconSettings = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.5 1z"></path></svg>;
const IconArrowRight = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>;
const IconRefresh = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;

const formatDuration = (seconds) => {
  if (!seconds) return '0 giây';
  if (seconds < 60) return `${seconds} giây`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs} giờ ${remainingMins > 0 ? `${remainingMins} phút` : ''}`;
};

const AdminDashboardPage = () => {
  const { token } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [animate, setAnimate] = useState(false);

  // States for dynamic data
  const [userCount, setUserCount] = useState(0);
  const [usersList, setUsersList] = useState([]);
  const [activeJobs, setActiveJobs] = useState(0);
  const [queuedJobs, setQueuedJobs] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [ollamaStatus, setOllamaStatus] = useState('Checking...');
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);
  
  const [limits, setLimits] = useState({
    max_upload_mb: 500,
    max_transcript_chars: 200000,
    ai_max_concurrent_jobs: 2
  });

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setAnimate(false);

    // Fetch users (limit to 15 to render chart of top users)
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/users?limit=15`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const d = await res.json();
          setUserCount(d.total || 0);
          setUsersList(d.users || []);
        }
      } catch (e) {
        console.error('Error fetching users:', e);
      }
    };

    // Fetch limits
    const fetchLimits = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/limits`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const d = await res.json();
          setLimits(d.limits || limits);
        }
      } catch (e) {
        console.error('Error fetching limits:', e);
      }
    };

    // Fetch AI queue metrics
    const fetchQueue = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/ai/queue/metrics?window_seconds=300`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const d = await res.json();
          setActiveJobs(d.counts?.running || 0);
          setQueuedJobs(d.counts?.queued || 0);
        }
      } catch (e) {
        console.error('Error fetching queue metrics:', e);
      }
    };

    // Fetch incidents
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/incidents?since_minutes=1440&limit=5`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const d = await res.json();
          setIncidentCount(d.total || 0);
        }
      } catch (e) {
        console.error('Error fetching incidents:', e);
      }
    };

    // Fetch audit logs
    const fetchAuditLogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/admin/audit?limit=5`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const d = await res.json();
          setRecentAuditLogs(d.logs || []);
        }
      } catch (e) {
        console.error('Error fetching audit logs:', e);
      }
    };

    // Fetch Ollama status
    const fetchOllamaStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/health/ollama/models`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.ok) {
          const d = await res.json();
          if (d.ollama_online) {
            const installedCount = d.models?.filter(m => m.installed)?.length || 0;
            setOllamaStatus(`Đang chạy (${installedCount} model)`);
          } else {
            setOllamaStatus('Ngoại tuyến (Offline)');
          }
        } else {
          setOllamaStatus('Không hoạt động');
        }
      } catch (e) {
        console.error('Error fetching Ollama status:', e);
        setOllamaStatus('Không khả dụng');
      }
    };

    try {
      await Promise.all([
        fetchUsers(),
        fetchLimits(),
        fetchQueue(),
        fetchIncidents(),
        fetchAuditLogs(),
        fetchOllamaStatus()
      ]);
    } catch (e) {
      notify('Lỗi tải dữ liệu dashboard', 'error');
    } finally {
      setLoading(false);
      setTimeout(() => setAnimate(true), 150);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveLimits = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/limits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          max_upload_mb: Number(limits.max_upload_mb),
          max_transcript_chars: Number(limits.max_transcript_chars),
          ai_max_concurrent_jobs: Number(limits.ai_max_concurrent_jobs)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lưu cấu hình thất bại');
      setLimits(data.limits || limits);
      notify('Đã cập nhật cấu hình giới hạn hệ thống!', 'success');
      fetchDashboardData();
    } catch (e) {
      notify(e.message || 'Lỗi lưu cấu hình', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ─── Page Greeting ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-greeting">
          <div className="page-greeting__hello">Bảng Quản Trị Hệ Thống</div>
          <div className="page-greeting__sub">Giám sát tổng quan, quản lý người dùng và điều chỉnh tài nguyên AI</div>
        </div>
        <button 
          className="mm-btn mm-btn--premium mm-btn--md" 
          onClick={fetchDashboardData} 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <IconRefresh /> Làm mới dữ liệu
        </button>
      </div>

      {/* ─── Bento Grid Metrics ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        {/* Metric Card 1: Users */}
        <div className="mm-card mm-card--hoverable" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Tổng Người Dùng</span>
            <div style={{ color: 'var(--google-blue)', background: 'var(--google-blue-bg)', padding: '8px', borderRadius: '12px' }}>
              <IconUsers />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {loading ? '...' : userCount}
          </div>
          <button 
            className="mm-btn mm-btn--sm mm-btn--ghost" 
            onClick={() => navigate('/admin/users')}
            style={{ width: 'fit-content', padding: '4px 8px', marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Quản lý tài khoản <IconArrowRight />
          </button>
        </div>

        {/* Metric Card 2: AI Queue */}
        <div className="mm-card mm-card--hoverable" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Tải Hàng Đợi AI</span>
            <div style={{ color: 'var(--google-green)', background: 'var(--google-green-bg)', padding: '8px', borderRadius: '12px' }}>
              <IconActivity />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            {loading ? '...' : activeJobs}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              đang chạy / {queuedJobs} chờ
            </span>
          </div>
          <button 
            className="mm-btn mm-btn--sm mm-btn--ghost" 
            onClick={() => navigate('/admin/ai')}
            style={{ width: 'fit-content', padding: '4px 8px', marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Xem hàng đợi <IconArrowRight />
          </button>
        </div>

        {/* Metric Card 3: Incidents */}
        <div className="mm-card mm-card--hoverable" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Sự Cố (24h)</span>
            <div style={{ color: incidentCount > 0 ? 'var(--google-red)' : 'var(--text-tertiary)', background: incidentCount > 0 ? 'var(--google-red-bg)' : 'var(--bg-surface-hover)', padding: '8px', borderRadius: '12px' }}>
              <IconAlertTriangle />
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: incidentCount > 0 ? 'var(--google-red)' : 'var(--text-primary)' }}>
            {loading ? '...' : incidentCount}
          </div>
          <button 
            className="mm-btn mm-btn--sm mm-btn--ghost" 
            onClick={() => navigate('/admin/logs')}
            style={{ width: 'fit-content', padding: '4px 8px', marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Chi tiết log lỗi <IconArrowRight />
          </button>
        </div>

        {/* Metric Card 4: Local AI Status */}
        <div className="mm-card mm-card--hoverable" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>Trạng thái Local AI (Ollama)</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className={`mm-dot ${ollamaStatus.includes('Đang chạy') || ollamaStatus.includes('Connected') ? 'mm-dot--success mm-dot--pulse' : 'mm-dot--danger'}`} />
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', minHeight: '38px', display: 'flex', alignItems: 'center' }}>
            {loading ? 'Đang kiểm tra...' : ollamaStatus}
          </div>
          <button 
            className="mm-btn mm-btn--sm mm-btn--ghost" 
            onClick={() => navigate('/status')}
            style={{ width: 'fit-content', padding: '4px 8px', marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Trạng thái máy chủ <IconArrowRight />
          </button>
        </div>
      </div>

      {/* ─── Custom Bar Chart for User Usage Duration ─── */}
      <div className="mm-card animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
          <div style={{ color: 'var(--google-blue)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="18" y="3" width="4" height="18" rx="1"></rect>
              <rect x="10" y="8" width="4" height="13" rx="1"></rect>
              <rect x="2" y="13" width="4" height="8" rx="1"></rect>
            </svg>
          </div>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, margin: 0 }}>Thời Gian Sử Dụng Hệ Thống Của Người Dùng</h2>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>Đang tải dữ liệu biểu đồ...</div>
        ) : usersList.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>Chưa ghi nhận dữ liệu sử dụng từ người dùng.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {usersList.map((user, idx) => {
              const maxVal = Math.max(...usersList.map(u => u.total_duration_seconds || 0), 1);
              const percent = Math.min(100, Math.round(((user.total_duration_seconds || 0) / maxVal) * 100));
              
              return (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  
                  {/* User profile identifier */}
                  <div style={{ flex: '1 1 200px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: idx === 0 ? 'var(--brand-gradient, linear-gradient(135deg, #1a73e8, #8ab4f8))' : 'var(--bg-surface-hover, #f1f3f4)',
                      border: '1px solid var(--border-default)',
                      color: idx === 0 ? 'white' : 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textTransform: 'uppercase'
                    }}>
                      {user.username.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        {user.username}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {user.full_name || 'Người dùng hệ thống'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar container */}
                  <div style={{ flex: '2 1 300px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      flex: 1,
                      height: '14px',
                      background: 'var(--bg-surface-hover, #f1f3f4)',
                      borderRadius: 'var(--radius-full, 9999px)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-default)'
                    }}>
                      <div style={{
                        width: animate ? `${percent}%` : '0%',
                        height: '100%',
                        background: idx === 0 
                          ? 'linear-gradient(90deg, var(--google-blue, #1a73e8) 0%, #8ab4f8 100%)' 
                          : 'linear-gradient(90deg, #34a853 0%, #a8dab5 100%)',
                        borderRadius: 'var(--radius-full, 9999px)',
                        transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                    
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-primary)', width: '90px', textAlign: 'right' }}>
                      {formatDuration(user.total_duration_seconds)}
                    </span>
                  </div>

                  {/* Percentage contribution badge */}
                  <div style={{ width: '70px', textAlign: 'right' }}>
                    <span className="mm-badge mm-badge--info" style={{ fontWeight: 600, fontSize: 'var(--text-xs)' }}>
                      {user.usage_ratio ?? 0}%
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Details Grid: Limits & Logs ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {/* Left Side: System Limit Controls */}
        <div className="mm-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
            <div style={{ color: 'var(--google-blue)' }}><IconSettings /></div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Điều Chỉnh Giới Hạn Tài Nguyên</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Dung lượng File tải lên tối đa (MB)
              </label>
              <input 
                className="mm-input" 
                type="number" 
                value={limits.max_upload_mb} 
                onChange={(e) => setLimits({ ...limits, max_upload_mb: e.target.value })} 
                placeholder="500"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Số ký tự Transcription tối đa (chars)
              </label>
              <input 
                className="mm-input" 
                type="number" 
                value={limits.max_transcript_chars} 
                onChange={(e) => setLimits({ ...limits, max_transcript_chars: e.target.value })} 
                placeholder="200000"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                Số luồng xử lý AI đồng thời tối đa (jobs)
              </label>
              <input 
                className="mm-input" 
                type="number" 
                value={limits.ai_max_concurrent_jobs} 
                onChange={(e) => setLimits({ ...limits, ai_max_concurrent_jobs: e.target.value })} 
                placeholder="2"
              />
            </div>

            <button 
              className="mm-btn mm-btn--premium mm-btn--md" 
              onClick={saveLimits} 
              disabled={saving || loading}
              style={{ marginTop: '8px', alignSelf: 'flex-start' }}
            >
              {saving ? 'Đang cập nhật...' : 'Cập nhật cấu hình'}
            </button>
          </div>
        </div>

        {/* Right Side: Recent Action Logs */}
        <div className="mm-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--border-default)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Nhật Ký Quản Trị Mới Nhất
            </h2>
            <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={() => navigate('/admin/logs')}>Tất cả</button>
          </div>

          {loading ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Đang tải nhật ký...</div>
          ) : recentAuditLogs.length === 0 ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Chưa có nhật ký hoạt động.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '12px 16px' }}>Hành động</th>
                    <th style={{ padding: '12px 16px' }}>Đối tượng</th>
                    <th style={{ padding: '12px 16px' }}>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAuditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-default)', fontSize: 'var(--text-sm)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="mm-badge mm-badge--info" style={{ fontWeight: 600 }}>{log.action}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                        User ID: {log.target_user_id ?? 'System'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.metadata ? JSON.stringify(log.metadata) : ''}>
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
