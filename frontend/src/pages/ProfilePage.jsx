import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import API_BASE_URL from '../config';

const ProfilePage = () => {
  const { currentUser, token, login } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('account'); // account, security, settings
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  // Account Form State
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const fileInputRef = useRef(null);
  
  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Settings Form State
  const [settings, setSettings] = useState({
    default_language: 'vi',
    custom_prompt: '',
    theme: 'system'
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/auth/settings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => {
      setSettings(data);
      if (data.theme && data.theme !== theme) {
        setTheme(data.theme); // Sync local theme with backend
      }
    })
    .catch(err => console.error("Could not fetch settings", err));
  }, [token]);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ full_name: fullName, email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Cập nhật thất bại');
      
      login({ ...currentUser, full_name: data.full_name, email: data.email }, token);
      showMessage('Cập nhật hồ sơ thành công!');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Tải ảnh thất bại');
      
      login({ ...currentUser, avatar_url: data.avatar_url }, token);
      showMessage('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return showMessage('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Đổi mật khẩu thất bại');
      
      showMessage('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Cập nhật thất bại');
      
      setTheme(settings.theme); // Apply theme locally
      showMessage('Lưu cấu hình AI & Giao diện thành công!');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-greeting">
        <h1 className="page-greeting__hello">Hồ sơ cá nhân</h1>
        <p className="page-greeting__sub">Quản lý tài khoản, bảo mật và thiết lập AI mặc định</p>
      </div>
      
      {message.text && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          color: message.type === 'error' ? '#ef4444' : '#22c55e',
          fontWeight: 500
        }}>
          {message.text}
        </div>
      )}

      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <button 
            style={{ flex: 1, padding: '16px', fontWeight: 600, border: 'none', background: 'none', borderBottom: activeTab === 'account' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'account' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setActiveTab('account')}
          >
            Tài khoản
          </button>
          <button 
            style={{ flex: 1, padding: '16px', fontWeight: 600, border: 'none', background: 'none', borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setActiveTab('security')}
          >
            Bảo mật
          </button>
          <button 
            style={{ flex: 1, padding: '16px', fontWeight: 600, border: 'none', background: 'none', borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setActiveTab('settings')}
          >
            Cấu hình AI & Giao diện
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'account' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', overflow: 'hidden' }}>
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    currentUser?.username?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={() => fileInputRef.current.click()} disabled={isLoading}>
                    Tải ảnh lên
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" style={{ display: 'none' }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Định dạng: JPG, PNG. Tối đa 2MB.</p>
                </div>
              </div>

              <form onSubmit={handleSaveAccount}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Tên hiển thị</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)}
                    className="mm-input" 
                    placeholder="Nhập tên hiển thị"
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Email</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="mm-input" 
                    placeholder="Nhập địa chỉ email"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button type="submit" className="mm-btn mm-btn--primary" disabled={isLoading}>
                    {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Tên đăng nhập: <strong>{currentUser?.username}</strong> (Không thể thay đổi)
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Mật khẩu hiện tại</label>
                <input 
                  type="password" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="mm-input" 
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Mật khẩu mới</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  className="mm-input" 
                  placeholder="Nhập mật khẩu mới (Ít nhất 6 ký tự)"
                  required
                />
              </div>
              <button type="submit" className="mm-btn mm-btn--primary" disabled={isLoading}>
                {isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </form>
          )}

          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Ngôn ngữ bóc băng mặc định</label>
                <select 
                  value={settings.default_language} 
                  onChange={e => setSettings({...settings, default_language: e.target.value})}
                  className="mm-input"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                  <option value="auto">Tự động phát hiện</option>
                </select>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Ngôn ngữ này sẽ được chọn sẵn khi bạn tạo cuộc họp mới.</p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Prompt tóm tắt tùy chỉnh (Custom Prompt cho LLM)</label>
                <textarea 
                  value={settings.custom_prompt || ''} 
                  onChange={e => setSettings({...settings, custom_prompt: e.target.value})}
                  className="mm-input" 
                  rows={4}
                  placeholder="Ví dụ: Chỉ tóm tắt những quyết định quan trọng nhất và luôn dùng giọng văn trang trọng..."
                />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Nếu để trống, hệ thống sẽ sử dụng Prompt mặc định.</p>
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--bg-body)' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-secondary)' }}>Giao diện hệ thống</label>
                <select 
                  value={settings.theme} 
                  onChange={e => setSettings({...settings, theme: e.target.value})}
                  className="mm-input"
                >
                  <option value="light">☀️ Giao diện Sáng (Light Mode)</option>
                  <option value="dark">🌙 Giao diện Tối (Dark Mode)</option>
                  <option value="system">🖥️ Tự động theo Hệ thống (System)</option>
                </select>
              </div>

              <button type="submit" className="mm-btn mm-btn--primary" disabled={isLoading}>
                {isLoading ? 'Đang lưu...' : 'Lưu cấu hình AI & Giao diện'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
