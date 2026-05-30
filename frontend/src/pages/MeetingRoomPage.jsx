import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '../contexts/MeetingContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import AudioUpload from '../components/AudioUpload';
import AudioRecorder from '../components/AudioRecorder';
import MeetingSummary from '../components/MeetingSummary';

import API_BASE_URL from '../config';

const MeetingRoomPage = () => {
  const { token } = useAuth();
  const { 
    meetingInfo, 
    activeMethod, 
    currentTranscript, 
    currentChunks, 
    currentMeetingId, 
    wsMeetingId,
    endMeeting,
    updateTranscriptData,
    isSummarySaved,
    setIsSummarySaved
  } = useMeeting();
  const { confirm } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    if (!meetingInfo) {
      navigate('/');
    }
  }, [meetingInfo, navigate]);

  if (!meetingInfo) return null;

  const handleBackToSetup = async () => { 
    if (isSummarySaved) {
      endMeeting();
      navigate('/');
      return;
    }
    const confirmed = await confirm(
      "Hủy phiên làm việc hiện tại? Các dữ liệu chưa lưu sẽ bị mất.",
      "Xác nhận hủy phiên"
    );
    if (confirmed) {
      endMeeting();
      navigate('/');
    }
  };

  const handleResetAudioInput = async () => {
    const confirmed = await confirm(
      "Thay đổi tệp âm thanh hoặc ghi âm lại sẽ tạm thời ẩn kết quả phân tích hiện tại. Bạn có chắc chắn?",
      "Thay đổi nguồn âm thanh"
    );
    if (confirmed) {
      updateTranscriptData("", [], null);
    }
  };

  const handleProcessComplete = async (transcript, meetingId, chunks = [], durationSeconds = 0) => { 
    let savedMeetingId = meetingId;
    
    // Auto-save realtime transcript if it hasn't been saved yet (string format)
    if (typeof meetingId === 'string' && meetingId.startsWith('meeting-')) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE_URL}/api/v1/meetings/save-transcript`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    title: meetingInfo?.meetingName || `Bản bóc băng Realtime ${new Date().toLocaleTimeString('vi-VN')}`,
                    transcript: transcript,
                    chunks: chunks,
                    duration_seconds: durationSeconds
                })
            });
            if (res.ok) {
                const data = await res.json();
                savedMeetingId = data.meeting_id;
                console.log("Auto-saved realtime transcript to History:", savedMeetingId);
            }
        } catch(e) { console.error("Auto-save failed", e); }
    }
    
    updateTranscriptData(transcript, chunks, savedMeetingId);
  };

  const hasAudio = !!currentTranscript;

  return (
    <div className="animate-fade-in">
      {/* 1. Tiêu đề Phòng họp */}
      <div className="mm-card mm-card--accent" style={{ marginBottom:'var(--space-5)', padding: 'var(--space-5)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h2 style={{ fontWeight:800, fontSize:'var(--text-xl)', color:'var(--text-primary)', margin: 0, fontFamily:'var(--font-display)' }}>
                {meetingInfo.meetingName}
              </h2>
              {hasAudio ? (
                <span className="mm-badge mm-badge--success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px' }}>
                  <span className="mm-dot mm-dot--success"></span> Đã bóc băng thành công
                </span>
              ) : (
                <span className="mm-badge mm-badge--warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '11px' }}>
                  <span className="mm-dot mm-dot--warning mm-dot--pulse"></span> Đang chờ tệp âm thanh
                </span>
              )}
            </div>
            
            <div style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)', display:'flex', gap:'var(--space-5)', flexWrap:'wrap', fontWeight: 500 }}>
              {meetingInfo.host && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Chủ trì: {meetingInfo.host}
                </span>
              )}
              {meetingInfo.participants && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Tham gia: {meetingInfo.participants}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Ngày: {new Date().toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {hasAudio && !isSummarySaved && (
              <button 
                className="mm-btn mm-btn--sm mm-btn--ghost" 
                onClick={handleResetAudioInput}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}
                title="Thay đổi tệp âm thanh khác hoặc tiến hành ghi âm lại"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                Thay đổi tệp
              </button>
            )}
            {isSummarySaved ? (
              <button 
                className="mm-btn mm-btn--sm mm-btn--success" 
                onClick={handleBackToSetup}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--success-500)', color: 'white', border: 'none' }}
                title="Cuộc họp đã được lưu thành công! Quay lại Trang chủ."
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Hoàn thành
              </button>
            ) : (
              <button 
                className="mm-btn mm-btn--sm mm-btn--secondary" 
                onClick={handleBackToSetup}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                Hủy phiên
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC 1: Nhập liệu Audio (Chỉ hiện khi chưa có audio) */}
      {!hasAudio && (
        <div className="animate-fade-in">
          {activeMethod === 'upload' && (
            <div className="mm-card" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="mm-card__header">
                <div className="mm-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--google-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Tải lên tệp âm thanh cuộc họp
                </div>
              </div>
              <AudioUpload 
                onCompleteData={handleProcessComplete} 
                token={token} 
                meetingName={meetingInfo.meetingName}
                host={meetingInfo.host}
                participants={meetingInfo.participants}
              />
            </div>
          )}

          {activeMethod === 'record' && (
            <div className="mm-card" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="mm-card__header">
                <div className="mm-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--google-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1c-1.66 0-3 1.34-3 3v8c0 1.66 1.34 3 3 3s3-1.34 3-3V4c0-1.66-1.34-3-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/></svg>
                  Ghi âm trực tiếp phiên họp
                </div>
              </div>
              <AudioRecorder meetingId={wsMeetingId} onCompleteData={handleProcessComplete} />
            </div>
          )}
        </div>
      )}

      {/* 3. KHU VỰC 2: Kết quả Khai thác AI (Chỉ hiện khi đã có audio bóc băng) */}
      {hasAudio && (
        <div className="animate-fade-in" style={{ marginTop:'var(--space-1)' }}>
          <div className="mm-card" style={{ padding: 'var(--space-6)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="mm-card__header" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="mm-card__title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-600)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/></svg>
                Phân tích và Tóm tắt AI
              </div>
            </div>
            
            <MeetingSummary 
              meetingId={currentMeetingId || wsMeetingId} 
              activeTranscript={currentTranscript} 
              activeChunks={currentChunks}
              token={token} 
              meetingInfo={meetingInfo} 
              onSaveStateChange={setIsSummarySaved}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoomPage;
