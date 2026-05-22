import React, { useState, useRef, useEffect } from 'react';
import API_BASE_URL from '../config';

const AudioUpload = ({ onCompleteData, token }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [pollTime, setPollTime] = useState(0);
  const xhrRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const pollTimerRef = useRef(null);

  const MAX_SIZE = 500 * 1024 * 1024;
  const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a'];

  useEffect(() => { return () => { stopPolling(); }; }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); validateAndSetFile(e.dataTransfer.files[0]); };
  const handleChange = (e) => { validateAndSetFile(e.target.files[0]); };

  const validateAndSetFile = (selectedFile) => {
    setError(''); setProgress(0); setUploadStatus(''); setPollTime(0);
    if (!selectedFile) return;
    if (!ALLOWED_TYPES.includes(selectedFile.type)) { setError('Chỉ chấp nhận file định dạng .mp3, .wav, .m4a'); return; }
    if (selectedFile.size > MAX_SIZE) { setError('Kích thước file vượt quá 500MB!'); return; }
    setFile(selectedFile);
  };

  const startPollingSTT = (meetingId) => {
    setUploadStatus('transcribing');
    pollTimerRef.current = setInterval(() => { setPollTime(p => p + 1); }, 1000);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/api/v1/meetings/${meetingId}/transcript`, { headers });
        if (res.ok) {
          const data = await res.json();
          data.meeting_id = meetingId;
          if (data.status === 'completed') {
            stopPolling(); setUploadStatus('success');
            if (onCompleteData && data.text) onCompleteData(data.text, data.meeting_id, data.chunks || []);
          } else if (data.status === 'failed') {
            stopPolling(); setUploadStatus('');
            setError('Lỗi: Trí tuệ Nhân tạo Whisper không thể bóc băng file này.');
          }
        }
      } catch (err) { console.error("Lỗi khi poll STT", err); }
    }, 3000);
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true); setError(''); setUploadStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try { const resp = JSON.parse(xhr.responseText); if (resp.meeting_id) startPollingSTT(resp.meeting_id); }
        catch(e) { setError("Server trả về cấu trúc không hợp lệ."); }
      } else {
        try { const resp = JSON.parse(xhr.responseText); setError(`Upload thất bại: ${resp.detail || xhr.statusText}`); }
        catch { setError(`Upload thất bại: ${xhr.statusText}`); }
      }
    });
    xhr.addEventListener('error', () => { setIsUploading(false); setError('Lỗi kết nối tới Server trong khi upload.'); });
    xhr.addEventListener('abort', () => { setIsUploading(false); setError('Đã hủy quá trình tải lên.'); setProgress(0); });
    xhr.open('POST', `${API_BASE_URL}/api/v1/meetings/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const handleCancel = () => { if (xhrRef.current) xhrRef.current.abort(); stopPolling(); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
      {/* Drop zone */}
      <div
        className={`upload-zone ${isDragging ? 'upload-zone--active' : ''}`}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <div className="upload-zone__icon">📂</div>
        <p className="upload-zone__title">
          {isDragging ? 'Thả file vào đây' : 'Kéo thả file âm thanh vào đây'}
        </p>
        <p className="upload-zone__subtitle">Hỗ trợ MP3, WAV, M4A — Tối đa 500MB</p>
        <input id="file-upload" type="file" accept=".mp3,.wav,.m4a" onChange={handleChange} style={{ display:'none' }} />
      </div>

      {/* Error */}
      {error && (
        <div className="mm-alert mm-alert--danger">
          <span className="mm-alert__icon">⚠️</span>
          <span className="mm-alert__message">{error}</span>
        </div>
      )}

      {/* Success */}
      {uploadStatus === 'success' && (
        <div className="mm-alert mm-alert--success">
          <span className="mm-alert__icon">✅</span>
          <span className="mm-alert__message">Whisper bóc băng xong! Văn bản đã được tự động đẩy sang AI để tóm tắt.</span>
        </div>
      )}

      {/* Transcribing */}
      {uploadStatus === 'transcribing' && (
        <div className="mm-alert mm-alert--warning">
          <span className="mm-alert__icon">
            <div className="mm-spinner mm-spinner--sm" style={{ borderColor:'var(--warning-200)', borderTopColor:'var(--warning-600)' }}></div>
          </span>
          <div className="mm-alert__content">
            <span className="mm-alert__title">Whisper đang phân tích âm thanh ({pollTime}s)</span>
            <span className="mm-alert__message">Xin vui lòng đợi, tiến trình tự động chuyển tiếp!</span>
          </div>
        </div>
      )}

      {/* File info + upload button */}
      {file && uploadStatus !== 'success' && uploadStatus !== 'transcribing' && (
        <div className="file-info">
          <div className="file-info__row">
            <span className="file-info__name">📄 {file.name}</span>
            <span className="file-info__size">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          {isUploading ? (
            <div>
              <div className="progress-bar" style={{ marginBottom:'var(--space-2)' }}>
                <div className="progress-bar__fill" style={{ width:`${progress}%` }}></div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:'var(--text-xs)', color:'var(--text-secondary)' }}>{progress}% Đã tải</span>
                <button className="mm-btn mm-btn--sm mm-btn--danger" onClick={handleCancel}>Hủy</button>
              </div>
            </div>
          ) : (
            <button className="mm-btn mm-btn--md mm-btn--primary" onClick={handleUpload} style={{ width:'100%' }}>
              Bắt đầu tải lên
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioUpload;
