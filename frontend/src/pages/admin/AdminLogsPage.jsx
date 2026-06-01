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
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="page-greeting">
        <div className="page-greeting__hello">Log sự cố</div>
        <div className="page-greeting__sub">Theo dõi lỗi hệ thống (5xx) và cảnh báo quá tải (429)</div>
      </div>

      <div className="mm-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>24h gần nhất</div>
        <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={fetchLogs} disabled={loading}>Làm mới</button>
      </div>

      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600 }}>
          Incidents
        </div>

        {loading ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : incidents.length === 0 ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Chưa có log sự cố.</div>
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
                {incidents.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.created_at || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.level}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.status_code || '—'}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.method} {r.path}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600 }}>
          Admin audit logs
        </div>

        {loading ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Chưa có audit log.</div>
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
                {auditLogs.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{r.created_at || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.actor_user_id ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.action}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{r.target_user_id ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', maxWidth: '520px' }}>
                      <div
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
