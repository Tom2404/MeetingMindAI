import React, { useState, useEffect, useRef } from 'react';
import API_BASE_URL from '../config';
import AIStatusBar from '../components/AIStatusBar';

// SVG Icons
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconAlertCircle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger-500)' }}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SystemStatusPage = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ollamaOnline, setOllamaOnline] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // 'select_model_name'
  const [pullProgress, setPullProgress] = useState({}); // { model_name: { progress, status, error } }

  const pollIntervals = useRef({}); // { model_name: intervalId }

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health/ollama/models`);
      if (!res.ok) throw new Error("Không thể lấy danh sách mô hình từ máy chủ.");
      const data = await res.json();
      setModels(data.models || []);
      setOllamaOnline(data.ollama_online);
      setError('');
    } catch (err) {
      setError(err.message || "Lỗi kết nối Backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
    return () => {
      // Clear all active intervals on unmount
      Object.values(pollIntervals.current).forEach(clearInterval);
    };
  }, []);

  const handleSelectModel = async (modelName) => {
    setActionLoading(`select_${modelName}`);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health/ollama/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      if (!res.ok) throw new Error("Chuyển đổi mô hình thất bại.");
      await fetchModels(); // Reload list
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const startPollingPull = (modelName) => {
    if (pollIntervals.current[modelName]) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/health/ollama/pull/status?model=${encodeURIComponent(modelName)}`);
        if (res.ok) {
          const data = await res.json();
          setPullProgress(prev => ({
            ...prev,
            [modelName]: {
              progress: data.progress || 0,
              status: data.status || 'Đang kết nối...',
              completed: data.completed || false,
              error: data.error || null
            }
          }));

          if (data.completed || data.status === 'success') {
            clearInterval(pollIntervals.current[modelName]);
            delete pollIntervals.current[modelName];
            // Clear progress state after a delay and refresh models
            setTimeout(() => {
              setPullProgress(prev => {
                const copy = { ...prev };
                delete copy[modelName];
                return copy;
              });
              fetchModels();
            }, 3000);
          } else if (data.status === 'failed' || data.error) {
            clearInterval(pollIntervals.current[modelName]);
            delete pollIntervals.current[modelName];
          }
        }
      } catch (err) {
        console.error("Lỗi khi truy vấn tiến độ tải", err);
      }
    }, 1500);

    pollIntervals.current[modelName] = intervalId;
  };

  const handlePullModel = async (modelName) => {
    setPullProgress(prev => ({
      ...prev,
      [modelName]: { progress: 0, status: 'Đang gửi yêu cầu...', completed: false, error: null }
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health/ollama/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Không thể kích hoạt tiến trình tải xuống.");
      }
      
      // Bắt đầu lập trình polling tiến trình
      startPollingPull(modelName);
    } catch (err) {
      setPullProgress(prev => ({
        ...prev,
        [modelName]: { progress: 0, status: 'Thất bại', completed: false, error: err.message }
      }));
      // Clear after a few seconds
      setTimeout(() => {
        setPullProgress(prev => {
          const copy = { ...prev };
          delete copy[modelName];
          return copy;
        });
      }, 5000);
    }
  };

  const isAnyModelDownloading = () => {
    return Object.values(pullProgress).some(p => !p.completed && p.status !== 'failed' && p.status !== 'success');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Greeting */}
      <div className="page-greeting">
        <div className="page-greeting__hello">Trạng thái Hệ thống AI</div>
        <div className="page-greeting__sub">Kiểm tra kết nối mô hình LLM, dịch vụ bóc băng và quản lý mô hình local</div>
      </div>

      {/* Main Health Status Panel */}
      <AIStatusBar />

      {/* Ollama Models Management Section */}
      <div style={{ marginTop: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
              Quản lý Mô hình Local (Ollama)
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0 }}>
              Kích hoạt hoặc tải trực tiếp các mô hình ngôn ngữ lớn chạy cục bộ trên máy tính của bạn
            </p>
          </div>
          <button 
            className="mm-btn mm-btn--sm mm-btn--ghost" 
            onClick={fetchModels} 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Làm mới danh sách
          </button>
        </div>

        {error && (
          <div className="mm-alert mm-alert--danger" style={{ marginBottom: 'var(--space-4)' }}>
            <span className="mm-alert__icon"><IconAlertCircle /></span>
            <span className="mm-alert__message">{error}</span>
          </div>
        )}

        {!ollamaOnline && (
          <div className="mm-alert mm-alert--warning" style={{ marginBottom: 'var(--space-4)' }}>
            <span className="mm-alert__icon"><IconAlertCircle /></span>
            <div className="mm-alert__content">
              <span className="mm-alert__title">Ollama chưa được khởi động</span>
              <span className="mm-alert__message">
                Không thể kết nối đến Ollama trên cổng 11434. Vui lòng mở ứng dụng Ollama hoặc chạy lệnh <code>ollama serve</code> để sử dụng các tính năng dưới đây.
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8)', gap: 'var(--space-3)' }}>
            <div className="mm-spinner mm-spinner--md"></div>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Đang truy vấn danh sách mô hình từ máy chủ...</span>
          </div>
        ) : (
          <div className="models-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: 'var(--space-4)' 
          }}>
            {models.map((model) => {
              const downloadState = pullProgress[model.name];
              const isDownloading = downloadState && !downloadState.completed && downloadState.status !== 'failed' && downloadState.status !== 'success';
              const hasError = downloadState && downloadState.error;
              const isSelecting = actionLoading === `select_${model.name}`;
              
              // Dynamic glassmorphic card styling based on status
              const cardBorder = model.active 
                ? '1px solid var(--success-500)' 
                : '1px solid var(--border-color, rgba(0, 0, 0, 0.08))';
              const cardBg = model.active
                ? 'var(--success-50, rgba(230, 245, 233, 0.2))'
                : 'var(--card-bg, rgba(255, 255, 255, 0.75))';

              return (
                <div 
                  key={model.name}
                  className="model-card"
                  style={{
                    background: cardBg,
                    backdropFilter: 'blur(12px)',
                    border: cardBorder,
                    borderRadius: '16px',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    boxShadow: model.active 
                      ? '0 4px 20px -2px rgba(46, 125, 50, 0.15)' 
                      : '0 4px 20px -2px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                        {model.name}
                      </span>
                      <span className={`mm-badge ${model.installed ? 'mm-badge--success' : 'mm-badge--secondary'}`} style={{ whiteSpace: 'nowrap' }}>
                        {model.installed ? 'Đã tải' : model.size_display || 'Chưa tải'}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {model.description}
                    </p>
                  </div>

                  {/* Pull Progress Tracker */}
                  {isDownloading && (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500 }}>{downloadState.status}</span>
                        <span>{downloadState.progress}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: '6px', background: 'var(--border-color, rgba(0,0,0,0.08))', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          className="progress-bar__fill" 
                          style={{ 
                            width: `${downloadState.progress}%`, 
                            height: '100%', 
                            background: 'var(--primary-500)', 
                            borderRadius: '3px', 
                            transition: 'width 0.4s ease' 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Pull Error Message */}
                  {hasError && (
                    <div style={{ fontSize: '11px', color: 'var(--danger-500)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span style={{ wordBreak: 'break-word' }}>Lỗi: {downloadState.error}</span>
                    </div>
                  )}

                  {/* Card Footer Actions */}
                  <div style={{ marginTop: 'var(--space-1)' }}>
                    {model.active ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        background: 'var(--success-500)', 
                        color: '#ffffff', 
                        fontSize: 'var(--text-xs)', 
                        fontWeight: 600,
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        <IconCheck /> Đang hoạt động
                      </div>
                    ) : model.installed ? (
                      <button 
                        className="mm-btn mm-btn--md mm-btn--secondary"
                        onClick={() => handleSelectModel(model.name)}
                        disabled={isSelecting || !ollamaOnline || isAnyModelDownloading()}
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        {isSelecting ? 'Đang chuyển đổi...' : 'Sử dụng model này'}
                      </button>
                    ) : (
                      <button 
                        className="mm-btn mm-btn--md mm-btn--primary"
                        onClick={() => handlePullModel(model.name)}
                        disabled={isDownloading || !ollamaOnline || isAnyModelDownloading()}
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                      >
                        {isDownloading ? (
                          <span>Đang tải ({downloadState?.progress || 0}%)</span>
                        ) : (
                          <>
                            <IconDownload /> Tải xuống (Pull)
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemStatusPage;
