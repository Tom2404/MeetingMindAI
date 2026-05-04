import React, { useState } from 'react';
import '../styles/auth.css';

const API_BASE = 'http://127.0.0.1:8000/api/v1/auth';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setIsLoading(true);
    const endpoint = isLoginMode ? '/login' : '/register';
    const body = isLoginMode ? { username: formData.username, password: formData.password } : { ...formData };
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Có lỗi xảy ra');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (onLoginSuccess) onLoginSuccess(data.user, data.token);
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const toggleMode = () => { setIsLoginMode(!isLoginMode); setError(''); setFormData({ username:'', email:'', password:'', full_name:'' }); };

  return (
    <div className="auth-page">
      {/* Hero side */}
      <div className="auth-hero">
        <h1 className="auth-hero__tagline">
          Biến mọi cuộc họp thành hành động cụ thể
        </h1>
        <p className="auth-hero__desc">
          MeetingMind AI tự động ghi nhận, tóm tắt và trích xuất nhiệm vụ từ cuộc họp của bạn — hoàn toàn chạy trên máy local, bảo mật tuyệt đối.
        </p>
        <div className="auth-hero__features">
          <div className="auth-hero__feature">
            <div className="auth-hero__feature-icon">🎙️</div>
            <span>Ghi âm & bóc băng tự động bằng AI Whisper</span>
          </div>
          <div className="auth-hero__feature">
            <div className="auth-hero__feature-icon">📝</div>
            <span>Tóm tắt thông minh với LLM Llama</span>
          </div>
          <div className="auth-hero__feature">
            <div className="auth-hero__feature-icon">✅</div>
            <span>Trích xuất Action Items & quyết định</span>
          </div>
          <div className="auth-hero__feature">
            <div className="auth-hero__feature-icon">🔒</div>
            <span>100% chạy local — không gửi dữ liệu ra ngoài</span>
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card__logo">
            <div className="auth-card__logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="white"/>
                <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="auth-card__logo-text">MeetingMind AI</div>
              <div className="auth-card__subtitle">{isLoginMode ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}</div>
            </div>
          </div>

          {error && (
            <div className="mm-alert mm-alert--danger" style={{ marginBottom:'var(--space-4)' }}>
              <span className="mm-alert__icon">⚠️</span>
              <span className="mm-alert__message">{error}</span>
            </div>
          )}

          <form className="auth-card__form" onSubmit={handleSubmit}>
            <div className="mm-input-group">
              <label className="mm-input-label">Tên tài khoản</label>
              <input className="mm-input" type="text" name="username" placeholder="Nhập tên tài khoản"
                value={formData.username} onChange={handleChange} required autoComplete="username" />
            </div>

            {!isLoginMode && (
              <>
                <div className="mm-input-group">
                  <label className="mm-input-label">Email</label>
                  <input className="mm-input" type="email" name="email" placeholder="Nhập địa chỉ email"
                    value={formData.email} onChange={handleChange} required autoComplete="email" />
                </div>
                <div className="mm-input-group">
                  <label className="mm-input-label">Họ và tên</label>
                  <input className="mm-input" type="text" name="full_name" placeholder="Nhập họ tên đầy đủ (tùy chọn)"
                    value={formData.full_name} onChange={handleChange} autoComplete="name" />
                </div>
              </>
            )}

            <div className="mm-input-group">
              <label className="mm-input-label">Mật khẩu</label>
              <input className="mm-input" type="password" name="password"
                placeholder={isLoginMode ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"}
                value={formData.password} onChange={handleChange} required
                autoComplete={isLoginMode ? "current-password" : "new-password"} />
            </div>

            <button className="mm-btn mm-btn--lg mm-btn--primary" type="submit" disabled={isLoading} style={{ width:'100%', marginTop:'var(--space-2)' }}>
              {isLoading ? (
                <><div className="mm-btn__spinner"></div> Đang xử lý...</>
              ) : (isLoginMode ? 'Đăng nhập' : 'Đăng ký')}
            </button>
          </form>

          <div className="auth-card__footer">
            {isLoginMode ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button className="auth-card__toggle" onClick={toggleMode}>
              {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
