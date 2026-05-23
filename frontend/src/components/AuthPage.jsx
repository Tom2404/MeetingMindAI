import React, { useState } from 'react';
import '../styles/auth.css';
import API_BASE_URL from '../config';

const API_BASE = `${API_BASE_URL}/api/v1/auth`;



const IconLogoMic = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const AuthPage = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => { 
    setFormData({ ...formData, [e.target.name]: e.target.value }); 
    setError(''); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); 
    setIsLoading(true);
    const endpoint = isLoginMode ? '/login' : '/register';
    const body = isLoginMode ? { username: formData.username, password: formData.password } : { ...formData };
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Tên đăng nhập hoặc mật khẩu không đúng');
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (onLoginSuccess) onLoginSuccess(data.user, data.token);
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const toggleMode = () => { 
    setIsLoginMode(!isLoginMode); 
    setError(''); 
    setFormData({ username:'', email:'', password:'', full_name:'' }); 
  };



  return (
    <div className="auth-page">
      {/* Notion Logo Brand */}
      <div className="auth-brand">
        <div className="auth-brand__logo">
          <IconLogoMic />
        </div>
        <span className="auth-brand__name">MeetingMind AI</span>
      </div>

      {/* Notion Centered Login Card */}
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-header__title">
            {isLoginMode ? 'Đăng nhập vào tài khoản' : 'Bắt đầu sử dụng miễn phí'}
          </h2>
          <p className="auth-header__desc">
            {isLoginMode 
              ? 'Tự động bóc băng và tóm tắt cuộc họp siêu tốc với LLM cục bộ.' 
              : 'Tạo tài khoản cục bộ để bắt đầu lưu trữ cuộc thảo luận.'}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="auth-error">
            <span className="auth-error__msg">{error}</span>
          </div>
        )}



        {/* Main Local Auth Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="auth-field">
            <label className="auth-field__label">Tên đăng nhập</label>
            <div className="auth-field__input-wrapper">
              <input 
                type="text" 
                name="username" 
                className="auth-field__input"
                placeholder="VD: nguyenvanan"
                value={formData.username} 
                onChange={handleChange} 
                required 
                autoComplete="username" 
              />
            </div>
          </div>

          {/* Registration Fields */}
          {!isLoginMode && (
            <>
              <div className="auth-field">
                <label className="auth-field__label">Địa chỉ Email</label>
                <div className="auth-field__input-wrapper">
                  <input 
                    type="email" 
                    name="email" 
                    className="auth-field__input"
                    placeholder="email@example.com"
                    value={formData.email} 
                    onChange={handleChange} 
                    required 
                    autoComplete="email" 
                  />
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-field__label">Họ và tên</label>
                <div className="auth-field__input-wrapper">
                  <input 
                    type="text" 
                    name="full_name" 
                    className="auth-field__input"
                    placeholder="Nguyễn Văn An"
                    value={formData.full_name} 
                    onChange={handleChange} 
                    autoComplete="name" 
                  />
                </div>
              </div>
            </>
          )}

          {/* Password Field */}
          <div className="auth-field">
            <label className="auth-field__label">Mật khẩu</label>
            <div className="auth-field__input-wrapper">
              <input 
                type="password" 
                name="password" 
                className="auth-field__input"
                placeholder="••••••••"
                value={formData.password} 
                onChange={handleChange} 
                required 
                autoComplete={isLoginMode ? "current-password" : "new-password"} 
              />
            </div>
          </div>

          {/* Submit Button */}
          <button className="auth-submit-btn" type="submit" disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : (isLoginMode ? 'Đăng nhập bằng tài khoản' : 'Tạo tài khoản mới')}
          </button>
        </form>

        {/* Footer Switching Panel */}
        <div className="auth-footer">
          <span>{isLoginMode ? 'Mới sử dụng MeetingMind AI?' : 'Đã có tài khoản từ trước?'}</span>
          <button className="auth-footer__link-btn" onClick={toggleMode}>
            {isLoginMode ? 'Tạo tài khoản miễn phí' : 'Đăng nhập ngay'}
          </button>
        </div>
      </div>

      {/* Page Footnote */}
      <div className="auth-page-footnote">
        Bằng việc tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi. Dữ liệu họp được mã hóa cục bộ.
      </div>
    </div>
  );
};

export default AuthPage;
