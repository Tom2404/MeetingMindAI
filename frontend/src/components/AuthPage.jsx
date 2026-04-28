import React, { useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/auth';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
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
    const body = isLoginMode
      ? { username: formData.username, password: formData.password }
      : { ...formData };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Có lỗi xảy ra');
      }

      // Lưu token và user info vào localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (onLoginSuccess) {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setFormData({ username: '', email: '', password: '', full_name: '' });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '48px 40px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .auth-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 15px;
            font-family: 'Inter', sans-serif;
            transition: all 0.2s;
            outline: none;
            box-sizing: border-box;
            background: #f8f9fc;
          }
          .auth-input:focus {
            border-color: #667eea;
            background: #fff;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.12);
          }
          .auth-input::placeholder {
            color: #a0aec0;
          }
          .auth-btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Inter', sans-serif;
            transition: all 0.3s;
            letter-spacing: 0.3px;
          }
          .auth-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }
          .auth-btn:active {
            transform: translateY(0);
          }
          .auth-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
          .toggle-link {
            background: none;
            border: none;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            text-decoration: underline;
            font-family: 'Inter', sans-serif;
            padding: 0;
          }
          .toggle-link:hover {
            color: #764ba2;
          }
        `}</style>

        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="white"/>
              <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="white"/>
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '26px', fontWeight: '700', color: '#1a202c',
            marginBottom: '6px', letterSpacing: '-0.5px' 
          }}>
            MeetingMind AI
          </h1>
          <p style={{ color: '#718096', fontSize: '14px' }}>
            {isLoginMode ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: '#fff5f5',
            color: '#c53030',
            borderRadius: '10px',
            fontSize: '14px',
            marginBottom: '20px',
            border: '1px solid #fed7d7',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>
              Tên tài khoản
            </label>
            <input
              className="auth-input"
              type="text"
              name="username"
              placeholder="Nhập tên tài khoản"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="username"
            />
          </div>

          {!isLoginMode && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  className="auth-input"
                  type="email"
                  name="email"
                  placeholder="Nhập địa chỉ email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>
                  Họ và tên
                </label>
                <input
                  className="auth-input"
                  type="text"
                  name="full_name"
                  placeholder="Nhập họ tên đầy đủ (tùy chọn)"
                  value={formData.full_name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>
              Mật khẩu
            </label>
            <input
              className="auth-input"
              type="password"
              name="password"
              placeholder={isLoginMode ? "Nhập mật khẩu" : "Tối thiểu 6 ký tự"}
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
          </div>

          <button
            className="auth-btn"
            type="submit"
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <span style={{
                  width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite', display: 'inline-block'
                }}></span>
                Đang xử lý...
              </span>
            ) : (
              isLoginMode ? 'Đăng nhập' : 'Đăng ký'
            )}
          </button>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </form>

        {/* Toggle Login / Register */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#718096' }}>
          {isLoginMode ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <button className="toggle-link" onClick={toggleMode}>
            {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
