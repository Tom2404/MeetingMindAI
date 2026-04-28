import React, { useState, useRef, useEffect } from 'react';

const AudioUpload = ({ onCompleteData, token }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(''); // '', 'uploading', 'transcribing', 'success'
  const [pollTime, setPollTime] = useState(0); // giây đếm thời gian STT
  const xhrRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const pollTimerRef = useRef(null);

  const MAX_SIZE = 500 * 1024 * 1024; // 500 MB
  const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/x-m4a'];

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleChange = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    setProgress(0);
    setUploadStatus('');
    setPollTime(0);

    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Chỉ chấp nhận file định dạng .mp3, .wav, .m4a');
      return;
    }

    if (selectedFile.size > MAX_SIZE) {
      setError('Kích thước file vượt quá 500MB!');
      return;
    }

    setFile(selectedFile);
  };

  const startPollingSTT = (meetingId) => {
    setUploadStatus('transcribing');
    
    pollTimerRef.current = setInterval(() => {
      setPollTime(p => p + 1);
    }, 1000);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`http://127.0.0.1:8000/api/v1/meetings/${meetingId}/transcript`, { headers });
        if (res.ok) {
          const data = await res.json();
          data.meeting_id = meetingId; // Gắn meeting_id vào response để truyền ra ngoài
          if (data.status === 'completed') {
            stopPolling();
            setUploadStatus('success');
            if (onCompleteData && data.text) {
               onCompleteData(data.text, data.meeting_id);
            }
          } else if (data.status === 'failed') {
            stopPolling();
            setUploadStatus('');
            setError('Lỗi: Trí tuệ Nhân tạo Whisper không thể bóc băng file này.');
          }
        }
      } catch (err) {
        console.error("Lỗi khi poll STT", err);
      }
    }, 3000); // Mỗi 3s đập server hỏi 1 lần
  };

  const handleUpload = () => {
    if (!file) return;

    setIsUploading(true);
    setError('');
    setUploadStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    // Monitor progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setProgress(percentComplete);
      }
    });

    // Handle complete
    xhr.addEventListener('load', () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        // Lấy meeting_id từ response để bắt đầu Polling
        try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.meeting_id) {
               startPollingSTT(resp.meeting_id);
            }
        } catch(e) {
            setError("Server trả về cấu trúc không hợp lệ.");
        }
      } else {
        try {
            const resp = JSON.parse(xhr.responseText);
            setError(`Upload thất bại: ${resp.detail || xhr.statusText}`);
        } catch {
            setError(`Upload thất bại: ${xhr.statusText}`);
        }
      }
    });

    // Handle error
    xhr.addEventListener('error', () => {
      setIsUploading(false);
      setError('Lỗi kết nối tới Server trong khi upload.');
    });

    // Handle abort
    xhr.addEventListener('abort', () => {
      setIsUploading(false);
      setError('Đã hủy quá trình tải lên.');
      setProgress(0);
    });

    xhr.open('POST', 'http://127.0.0.1:8000/api/v1/meetings/upload');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  };

  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    stopPolling();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed var(--color-primary)' : '2px dashed var(--border-color)',
          backgroundColor: isDragging ? '#e8f0fe' : '#f8f9fa',
          padding: '40px 20px',
          textAlign: 'center',
          borderRadius: 'var(--radius-md)',
          transition: 'all 0.2s',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => document.getElementById('file-upload').click()}
      >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
          <path d="M14 2H6C4.9 2 4 4.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM12 19L8 15H10.5V12H13.5V15H16L12 19Z" fill={isDragging ? 'var(--color-primary)' : 'var(--text-secondary)'}/>
        </svg>
        <p style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {isDragging ? 'Thả file vào đây' : 'Kéo thả file âm thanh (MP3, WAV, M4A) vào đây'}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Hoặc nhấp để chọn tệp</p>
        <input 
          id="file-upload" 
          type="file" 
          accept=".mp3, .wav, .m4a" 
          onChange={handleChange} 
          style={{ display: 'none' }} 
        />
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fce8e6', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {uploadStatus === 'success' && (
        <div style={{ padding: '12px', background: '#e6f4ea', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/></svg>
          Whisper bóc băng xong! Văn bản đã được tự động đẩy sang Mô hình Trí Tuệ Nhân Tạo để tóm tắt.
        </div>
      )}
      
      {uploadStatus === 'transcribing' && (
        <div style={{ padding: '12px', background: '#fff3cd', color: '#856404', borderRadius: 'var(--radius-sm)', fontSize: '14px', border: '1px solid #ffeeba' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <div style={{ width: '16px', height: '16px', border: '2px solid #856404', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
             <b>Hệ thống Local Whisper đang phân tích âm thanh đa ngôn ngữ ({pollTime} giây) ...</b>
          </div>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>Không cần bấm thêm gì cả. Xin vui lòng đợi, tiến trình này tự động chuyển tiếp!</p>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {file && uploadStatus !== 'success' && uploadStatus !== 'transcribing' && (
        <div style={{ padding: '16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
          
          {isUploading ? (
            <div>
              <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-primary)', transition: 'width 0.2s' }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{progress}% Đã tải</span>
                <button 
                  onClick={handleCancel} 
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
                >
                  Hủy tải lên
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleUpload} 
              style={{ 
                width: '100%', padding: '10px', 
                background: 'var(--color-primary)', color: 'white', 
                border: 'none', borderRadius: 'var(--radius-sm)', 
                fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' 
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--color-primary-hover)'}
              onMouseOut={(e) => e.target.style.background = 'var(--color-primary)'}
            >
              Bắt đầu tải lên
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioUpload;
