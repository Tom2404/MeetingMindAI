import React, { useEffect, useMemo, useState } from 'react';
import API_BASE_URL from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const AdminUsersPage = () => {
  const { token, currentUser } = useAuth();
  const { notify, confirm } = useNotification();

  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    params.set('include_inactive', includeInactive ? 'true' : 'false');
    params.set('limit', '100');
    params.set('offset', '0');
    return params.toString();
  }, [search, includeInactive]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Không thể tải danh sách user');
      setRows(data.users || []);
    } catch (e) {
      notify(e.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggleLock = async (user) => {
    const action = user.is_active ? 'lock' : 'unlock';
    const ok = await confirm(
      user.is_active
        ? `Khóa tài khoản ${user.username}? Người dùng sẽ không đăng nhập được.`
        : `Mở khóa tài khoản ${user.username}?`,
      user.is_active ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      user.is_active ? 'Khóa' : 'Mở khóa',
      'Hủy'
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${user.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'admin_action' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Thao tác thất bại');
      notify(data.message || 'Đã cập nhật', 'success');
      await fetchUsers();
    } catch (e) {
      notify(e.message || 'Lỗi thao tác', 'error');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="page-greeting">
        <div className="page-greeting__hello">Quản trị người dùng</div>
        <div className="page-greeting__sub">Khóa/mở khóa tài khoản và kiểm soát truy cập hệ thống</div>
      </div>

      <div className="mm-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="mm-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo username / email / họ tên"
            style={{ minWidth: '280px', flex: 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
            Hiện cả user bị khóa
          </label>
          <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={fetchUsers} disabled={loading}>Làm mới</button>
        </div>
      </div>

      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600 }}>
          Danh sách user
        </div>

        {loading ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: '12px 16px' }}>User</th>
                  <th style={{ padding: '12px 16px' }}>Email</th>
                  <th style={{ padding: '12px 16px' }}>Role</th>
                  <th style={{ padding: '12px 16px' }}>Trạng thái</th>
                  <th style={{ padding: '12px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{u.full_name || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{u.role || 'user'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`mm-badge ${u.is_active ? 'mm-badge--success' : 'mm-badge--danger'}`}>
                          {u.is_active ? 'Đang hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          className={`mm-btn mm-btn--sm ${u.is_active ? 'mm-btn--danger' : 'mm-btn--primary'}`}
                          onClick={() => toggleLock(u)}
                          disabled={isSelf}
                          title={isSelf ? 'Không thể tự khóa' : ''}
                        >
                          {u.is_active ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
