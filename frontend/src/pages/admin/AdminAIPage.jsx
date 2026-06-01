import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const AdminAIPage = () => {
  const { token } = useAuth();
  const { notify, confirm } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [limits, setLimits] = useState({
    max_upload_mb: 500,
    max_transcript_chars: 200000,
    ai_max_concurrent_jobs: 2
  });
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [limitsRes, metricsRes, jobsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/settings/limits`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/admin/ai/queue/metrics?window_seconds=300`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/v1/admin/ai/jobs?limit=30&offset=0`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const limitsData = await limitsRes.json();
      const metricsData = await metricsRes.json();
      const jobsData = await jobsRes.json();

      if (!limitsRes.ok) throw new Error(limitsData.detail || 'Không thể tải limit');
      if (!metricsRes.ok) throw new Error(metricsData.detail || 'Không thể tải metrics');
      if (!jobsRes.ok) throw new Error(jobsData.detail || 'Không thể tải jobs');

      setLimits(limitsData.limits || limits);
      setMetrics(metricsData);
      setJobs(jobsData.jobs || []);
    } catch (e) {
      notify(e.message || 'Lỗi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const saveLimits = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/settings/limits`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          max_upload_mb: Number(limits.max_upload_mb),
          max_transcript_chars: Number(limits.max_transcript_chars),
          ai_max_concurrent_jobs: Number(limits.ai_max_concurrent_jobs)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Lưu cấu hình thất bại');
      setLimits(data.limits || limits);
      notify('Đã cập nhật limit', 'success');
      fetchAll();
    } catch (e) {
      notify(e.message || 'Lỗi lưu cấu hình', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAbortJob = async (job) => {
    const ok = await confirm(
      `Bạn có chắc chắn muốn hủy tác vụ AI này không? Trạng thái cuộc họp liên quan sẽ bị chuyển sang Thất bại.`,
      'Hủy tác vụ AI',
      'Hủy tác vụ',
      'Hủy'
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/ai/jobs/${job.id}/abort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Hủy tác vụ AI thất bại');
      notify(data.message || 'Đã hủy tác vụ AI thành công', 'success');
      await fetchAll();
    } catch (e) {
      notify(e.message || 'Lỗi hủy tác vụ AI', 'error');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div className="page-greeting">
        <div className="page-greeting__hello">Giám sát AI & Limit</div>
        <div className="page-greeting__sub">Cấu hình giới hạn và theo dõi tải hàng đợi xử lý STT/LLM</div>
      </div>

      <div className="mm-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Cửa sổ metrics: 5 phút</div>
        <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={fetchAll} disabled={loading}>Làm mới</button>
      </div>

      <div className="mm-card" style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Limit hệ thống</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>Max upload (MB)</label>
            <input className="mm-input" type="number" value={limits.max_upload_mb} onChange={(e) => setLimits({ ...limits, max_upload_mb: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>Max transcript (chars)</label>
            <input className="mm-input" type="number" value={limits.max_transcript_chars} onChange={(e) => setLimits({ ...limits, max_transcript_chars: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>Max active AI jobs</label>
            <input className="mm-input" type="number" value={limits.ai_max_concurrent_jobs} onChange={(e) => setLimits({ ...limits, ai_max_concurrent_jobs: e.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: '14px', display: 'flex', gap: '10px' }}>
          <button className="mm-btn mm-btn--primary" onClick={saveLimits} disabled={saving || loading}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </div>

      <div className="mm-card" style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Queue metrics</h3>
        {loading ? (
          <div style={{ color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : (
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', color: 'var(--text-primary)' }}>
            <div><strong>Running</strong>: {metrics?.counts?.running ?? '—'}</div>
            <div><strong>Queued</strong>: {metrics?.counts?.queued ?? '—'}</div>
            <div><strong>Success</strong>: {metrics?.counts?.success ?? '—'}</div>
            <div><strong>Failed</strong>: {metrics?.counts?.failed ?? '—'}</div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Recent {metrics?.window_seconds ?? 300}s: total {metrics?.recent?.total ?? '—'}
            </div>
          </div>
        )}
      </div>

      <div className="mm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 600 }}>
          AI jobs gần đây
        </div>

        {loading ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Đang tải...</div>
        ) : jobs.length === 0 ? (
          <div style={{ padding: '22px 16px', color: 'var(--text-secondary)' }}>Chưa có job.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                  <th style={{ padding: '12px 16px' }}>ID</th>
                  <th style={{ padding: '12px 16px' }}>Type</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Meeting</th>
                  <th style={{ padding: '12px 16px' }}>Duration</th>
                  <th style={{ padding: '12px 16px' }}>Error</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} style={{ borderTop: '1px solid var(--border-default)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{j.id}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{j.job_type}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`mm-badge ${j.status === 'success' ? 'mm-badge--success' : j.status === 'failed' ? 'mm-badge--danger' : j.status === 'running' ? 'mm-badge--info' : 'mm-badge--warning'}`} style={{ fontWeight: 600 }}>
                        {j.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{j.meeting_id ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{j.duration_ms != null ? `${j.duration_ms}ms` : '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', maxWidth: '320px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.error || ''}>
                        {j.error || '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {(j.status === 'queued' || j.status === 'running') ? (
                        <button
                          className="mm-btn mm-btn--sm mm-btn--danger"
                          onClick={() => toggleAbortJob(j)}
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px' }}
                        >
                          Hủy
                        </button>
                      ) : '—'}
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

export default AdminAIPage;
