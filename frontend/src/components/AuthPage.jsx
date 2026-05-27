import React, { useState, useEffect, useRef } from 'react';
import '../styles/auth.css';
import API_BASE_URL from '../config';
import { gsap } from 'gsap';
import { useTheme } from '../contexts/ThemeContext';

const API_BASE = `${API_BASE_URL}/api/v1/auth`;

// === Icons SVG ===
const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"></circle>
    <line x1="12" y1="1" x2="12" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="23"></line>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
    <line x1="1" y1="12" x2="3" y2="12"></line>
    <line x1="21" y1="12" x2="23" y2="12"></line>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
  </svg>
);

const IconMoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);
const IconLogoMic = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const IconMicrosoft = () => (
  <svg width="18" height="18" viewBox="0 0 23 23" fill="none" style={{ marginRight: '8px' }}>
    <path d="M0 0h11v11H0z" fill="#F25022"/>
    <path d="M12 0h11v11H12z" fill="#7FBA00"/>
    <path d="M0 12h11v11H0z" fill="#00A4EF"/>
    <path d="M12 12h11v11H12z" fill="#FFB900"/>
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const AuthPage = ({ onLoginSuccess }) => {
  const { isDark, theme, setTheme } = useTheme();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef(null);

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
    setShowPassword(false);
    setFormData({ username:'', email:'', password:'', full_name:'' }); 
  };

  const handleOAuthLogin = (provider) => {
    setError(`Chế độ đăng nhập qua ${provider} đang được phát triển. Vui lòng đăng nhập bằng tài khoản cục bộ.`);
  };

  // GSAP - Entrance Load and Aurora Float
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Staggered Entrance
      gsap.fromTo('.auth-brand', 
        { y: -40, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 1, ease: 'power4.out' }
      );

      gsap.fromTo('.auth-card', 
        { scale: 0.93, opacity: 0 }, 
        { scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.1 }
      );

      gsap.fromTo('.auth-oauth-group, .auth-divider, .auth-field, .auth-options, .auth-submit-btn', 
        { y: 15, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.6, ease: 'power2.out', stagger: 0.05, delay: 0.25 }
      );

      gsap.fromTo('.auth-page-footnote', 
        { opacity: 0 }, 
        { opacity: 1, duration: 1, delay: 0.8 }
      );

      // 2. Slow Organic floating for Aurora Spheres (more organic than CSS alone)
      gsap.to('.auth-glow-sphere-1', {
        x: 'random(-60, 60)',
        y: 'random(-60, 60)',
        duration: 'random(8, 12)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.auth-glow-sphere-2', {
        x: 'random(-70, 70)',
        y: 'random(-70, 70)',
        duration: 'random(9, 14)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });

      gsap.to('.auth-glow-sphere-3', {
        x: 'random(-50, 50)',
        y: 'random(-50, 50)',
        duration: 'random(7, 10)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // GSAP - Staggered transition on switching Login <-> Register Mode
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.auth-header, .auth-field, .auth-submit-btn, .auth-oauth-group, .auth-divider, .auth-options', 
        { opacity: 0, y: 10 }, 
        { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.03 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isLoginMode]);

  return (
    <div className="auth-page" ref={containerRef}>
      {/* Floating Theme Toggle */}
      <button 
        className="auth-theme-toggle" 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        aria-label="Đổi giao diện"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 10,
          background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          backdropFilter: 'blur(8px)',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isDark ? '#fff' : 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'var(--shadow-sm)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.09)';
          e.currentTarget.style.transform = 'scale(1.08) rotate(15deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        {isDark ? <IconSun /> : <IconMoon />}
      </button>

      {/* Decorative Shifting Aurora Circles */}
      <div className="auth-aurora-bg">
        <div className="auth-glow-sphere auth-glow-sphere-1"></div>
        <div className="auth-glow-sphere auth-glow-sphere-2"></div>
        <div className="auth-glow-sphere auth-glow-sphere-3"></div>
      </div>

      {/* Brand Header */}
      <div className="auth-brand">
        <div className="auth-brand__logo">
          <IconLogoMic />
        </div>
        <span className="auth-brand__name">MeetingMind AI</span>
      </div>

      {/* Glassmorphic Login Card */}
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
          <div className="auth-error animate-shake">
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

          {/* Password Field with Hide/Show Toggle */}
          <div className="auth-field">
            <label className="auth-field__label">Mật khẩu</label>
            <div className="auth-field__input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                className="auth-field__input auth-field__input--password"
                placeholder="••••••••"
                value={formData.password} 
                onChange={handleChange} 
                required 
                autoComplete={isLoginMode ? "current-password" : "new-password"} 
              />
              <button 
                type="button" 
                className="auth-field__toggle-pw-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Remember me (Only in Login Mode) */}
          {isLoginMode && (
            <div className="auth-options">
              <label className="auth-remember-me">
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="auth-remember-me__checkbox"
                />
                <span className="auth-remember-me__label">Duy trì đăng nhập</span>
              </label>
              <button 
                type="button" 
                className="auth-forgot-password-btn"
                onClick={() => setError("Vui lòng liên hệ Quản trị viên để đặt lại mật khẩu nội bộ của bạn.")}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button className="auth-submit-btn" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mm-spinner mm-spinner--sm" style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff', marginRight: '8px' }}></div>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{isLoginMode ? 'Đăng nhập bằng tài khoản' : 'Tạo tài khoản mới'}</span>
            )}
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
