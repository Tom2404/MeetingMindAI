import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const AdminLogsPage = () => {
  const { token } = useAuth();
  const { notify } = useNotification();

  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Interactive filtering states
  const [incSearch, setIncSearch] = useState('');
  const [incLevel, setIncLevel] = useState('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [incRes, auditRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/incidents?since_minutes=1440&limit=100&offset=0`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/v1/admin/audit?limit=100&offset=0`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const incData = await incRes.json();
      const auditData = await auditRes.json();

      if (!incRes.ok) throw new Error(incData.detail || 'Không thể tải incident logs');
      if (!auditRes.ok) throw new Error(auditData.detail || 'Không thể tải audit logs');

      setIncidents(incData.incidents || []);
      setAuditLogs(auditData.logs || []);
    } catch (e) {
      notify(e.message || 'Lỗi tải logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Clientside filtering logic for Incidents
  const filteredIncidents = incidents.filter(item => {
    if (incLevel !== 'ALL' && item.level?.toLowerCase() !== incLevel.toLowerCase()) {
      return false;
    }
    if (incSearch.trim()) {
      const q = incSearch.toLowerCase();
      const pathMatch = item.path?.toLowerCase().includes(q);
      const methodMatch = item.method?.toLowerCase().includes(q);
      const msgMatch = item.message?.toLowerCase().includes(q);
      const userMatch = item.user_id?.toString().includes(q);
      const statusMatch = item.status_code?.toString().includes(q);
      return pathMatch || methodMatch || msgMatch || userMatch || statusMatch;
    }
    return true;
  });

  // Clientside filtering logic for Audit Logs
  const filteredAuditLogs = auditLogs.filter(item => {
    if (auditAction !== 'ALL' && item.action !== auditAction) {
      return false;
    }
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const actionMatch = item.action?.toLowerCase().includes(q);
      const actorMatch = item.actor_user_id?.toString().includes(q);
      const targetMatch = item.target_user_id?.toString().includes(q);
      const metaMatch = item.metadata ? JSON.stringify(item.metadata).toLowerCase().includes(q) : false;
      return actionMatch || actorMatch || targetMatch || metaMatch;
    }
    return true;
  });

  const uniqueActions = ['ALL', ...new Set(auditLogs.map(log => log.action).filter(Boolean))];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="page-greeting">
        <div className="page-greeting__hello">Log sự cố & Hoạt động</div>
        <div className="page-greeting__sub">Theo dõi lỗi hệ thống (5xx), cảnh báo quá tải (429) và nhật ký hoạt động quản trị</div>
      </div>

      <div className="mm-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>24h gần nhất</div>
        <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={fetchLogs} disabled={loading}>Làm mới</button>
      </div>

      {/* Incidents Section */}
      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Sự Cố Hệ Thống (Incidents)</span>
          <span className="mm-badge mm-badge--danger" style={{ fontWeight: 600 }}>{filteredIncidents.length} kết quả</span>
        </div>

        {/* Incidents Filter Row */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-default)', alignItems: 'center', background: 'var(--bg-surface-hover, #f8f9fa)' }}>
          <input
            className="mm-input"
            value={incSearch}
            onChange={(e) => setIncSearch(e.target.value)}
            placeholder="Tìm theo phương thức, đường dẫn, tin nhắn hoặc User ID..."
            style={{ flex: 1, minWidth: '240px', padding: '6px 12px', fontSize: 'var(--text-sm)' }}
          />
          <select
            className="mm-input"
            value={incLevel}
            onChange={(e) => setIncLevel(e.target.value)}
            style={{ width: '160px', padding: '6px 12px', fontSize: 'var(--text-sm)' }}
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : filteredIncidents.length === 0 ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Không tìm thấy sự cố nào trùng khớp.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: '12px 16px' }}>Thời gian</th>
                  <th style={{ padding: '12px 16px' }}>Mức</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Route</th>
                  <th style={{ padding: '12px 16px' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`mm-badge ${r.level === 'error' ? 'mm-badge--danger' : 'mm-badge--warning'}`} style={{ fontWeight: 600 }}>
                        {r.level?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>{r.status_code || '—'}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--google-blue)' }}>{r.method}</span> {r.path}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs Section */}
      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Nhật Ký Quản Trị (Admin Audit Logs)</span>
          <span className="mm-badge mm-badge--info" style={{ fontWeight: 600 }}>{filteredAuditLogs.length} kết quả</span>
        </div>

        {/* Audit Filter Row */}
        <div style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-default)', alignItems: 'center', background: 'var(--bg-surface-hover, #f8f9fa)' }}>
          <input
            className="mm-input"
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            placeholder="Tìm theo hành động, người thực hiện, đối tượng hoặc chi tiết..."
            style={{ flex: 1, minWidth: '240px', padding: '6px 12px', fontSize: 'var(--text-sm)' }}
          />
          <select
            className="mm-input"
            value={auditAction}
            onChange={(e) => setAuditAction(e.target.value)}
            style={{ width: '200px', padding: '6px 12px', fontSize: 'var(--text-sm)' }}
          >
            <option value="ALL">Tất cả hành động</option>
            {uniqueActions.filter(act => act !== 'ALL').map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : filteredAuditLogs.length === 0 ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Không tìm thấy hành động nào trùng khớp.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: '12px 16px' }}>Thời gian</th>
                  <th style={{ padding: '12px 16px' }}>Admin</th>
                  <th style={{ padding: '12px 16px' }}>Action</th>
                  <th style={{ padding: '12px 16px' }}>Target</th>
                  <th style={{ padding: '12px 16px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuditLogs.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>
                      User ID: {r.actor_user_id ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="mm-badge mm-badge--info" style={{ fontWeight: 600 }}>
                        {r.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                      {r.target_user_id ? `User ID: ${r.target_user_id}` : 'System'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', maxWidth: '520px' }}>
                      <div
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}
                        title={r.metadata ? JSON.stringify(r.metadata) : ''}
                      >
                        {r.metadata ? JSON.stringify(r.metadata) : '—'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogsPage;
