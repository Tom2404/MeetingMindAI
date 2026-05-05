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
      <div className="auth-container">
        {/* Left Side: Hero & Illustration */}
        <div className="auth-hero">
          <div className="auth-hero__header">
            <div className="auth-logo">
              <span className="auth-logo__text">MeetingMind AI</span>
            </div>
          </div>

          <div className="auth-hero__content">
            <h1 className="auth-hero__title">
              Họp thông minh hơn, <br />
              <span className="text-highlight">Làm việc hiệu quả hơn</span>
            </h1>
            <p className="auth-hero__subtitle">
              Giải pháp AI bảo mật giúp bạn tự động ghi nhận và tóm tắt mọi cuộc họp ngay trên máy tính cá nhân.
            </p>

            <div className="auth-hero__illustration">
              <img src="/images/hero.png" alt="Meeting AI Illustration" />
            </div>

            <div className="auth-features">
              <div className="auth-feature">
                <div className="auth-feature__text">
                  <strong>Tóm tắt tự động:</strong> Nhận ngay kết quả sau vài giây.
                </div>
              </div>
              <div className="auth-feature">
                <div className="auth-feature__text">
                  <strong>Bảo mật 100%:</strong> Dữ liệu không bao giờ rời khỏi máy bạn.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-card__header">
              <h2 className="auth-card__title">
                {isLoginMode ? 'Chào mừng trở lại' : 'Bắt đầu ngay hôm nay'}
              </h2>
              <p className="auth-card__desc">
                {isLoginMode ? 'Vui lòng đăng nhập để tiếp tục.' : 'Tạo tài khoản để trải nghiệm trợ lý họp AI.'}
              </p>
            </div>

            {error && (
              <div className="auth-error">
                <span className="auth-error__msg">{error}</span>
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên đăng nhập</label>
                <div className="input-wrapper">
                  <input type="text" name="username" placeholder="Nhập tên đăng nhập"
                    value={formData.username} onChange={handleChange} required autoComplete="username" />
                </div>
              </div>

              {!isLoginMode && (
                <>
                  <div className="form-group">
                    <label>Địa chỉ Email</label>
                    <div className="input-wrapper">
                      <input type="email" name="email" placeholder="email@example.com"
                        value={formData.email} onChange={handleChange} required autoComplete="email" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Họ và tên</label>
                    <div className="input-wrapper">
                      <input type="text" name="full_name" placeholder="Họ tên đầy đủ"
                        value={formData.full_name} onChange={handleChange} autoComplete="name" />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Mật khẩu</label>
                <div className="input-wrapper">
                  <input type="password" name="password" placeholder="••••••••"
                    value={formData.password} onChange={handleChange} required
                    autoComplete={isLoginMode ? "current-password" : "new-password"} />
                </div>
              </div>

              <button className="auth-submit-btn" type="submit" disabled={isLoading}>
                {isLoading ? "Đang xử lý..." : (isLoginMode ? 'Đăng nhập' : 'Tạo tài khoản')}
              </button>
            </form>

            <div className="auth-switch">
              <span>{isLoginMode ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}</span>
              <button onClick={toggleMode}>
                {isLoginMode ? 'Đăng ký miễn phí' : 'Đăng nhập ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
