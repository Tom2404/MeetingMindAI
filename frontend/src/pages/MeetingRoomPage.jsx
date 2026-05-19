import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '../contexts/MeetingContext';
import { useAuth } from '../contexts/AuthContext';
import AudioUpload from '../components/AudioUpload';
import AudioRecorder from '../components/AudioRecorder';
import MeetingSummary from '../components/MeetingSummary';

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
    updateTranscriptData
  } = useMeeting();
  const navigate = useNavigate();

  useEffect(() => {
    if (!meetingInfo) {
      navigate('/');
    }
  }, [meetingInfo, navigate]);

  if (!meetingInfo) return null;

  const handleBackToSetup = () => { 
    if (window.confirm("Hủy phiên làm việc hiện tại? Các dữ liệu chưa lưu sẽ bị mất.")) {
      endMeeting();
      navigate('/');
    }
  };

  const handleProcessComplete = async (transcript, meetingId, chunks = []) => { 
    let savedMeetingId = meetingId;
    
    // Auto-save realtime transcript if it hasn't been saved yet (string format)
    if (typeof meetingId === 'string' && meetingId.startsWith('meeting-')) {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('http://127.0.0.1:8000/api/v1/meetings/save-transcript', {
                method: 'POST', headers,
                body: JSON.stringify({
                    title: meetingInfo?.meetingName || `Bản bóc băng Realtime ${new Date().toLocaleTimeString('vi-VN')}`,
                    transcript: transcript,
                    chunks: chunks
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

  return (
    <div className="animate-fade-in">
      <div className="mm-card mm-card--accent" style={{ marginBottom:'var(--space-5)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'var(--text-lg)', color:'var(--text-primary)', marginBottom:4, fontFamily:'var(--font-display)' }}>{meetingInfo.meetingName}</div>
            <div style={{ fontSize:'var(--text-sm)', color:'var(--text-secondary)', display:'flex', gap:'var(--space-4)', flexWrap:'wrap' }}>
              {meetingInfo.host && <span>Chủ trì: {meetingInfo.host}</span>}
              {meetingInfo.participants && <span>Tham gia: {meetingInfo.participants}</span>}
              <span>Ngày: {new Date().toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
          <button className="mm-btn mm-btn--sm mm-btn--secondary" onClick={handleBackToSetup}>Hủy phiên</button>
        </div>
      </div>

      {activeMethod === 'upload' && (
        <div className="mm-card">
          <div className="mm-card__header">
            <div className="mm-card__title">Tải lên tệp âm thanh</div>
          </div>
          <AudioUpload onCompleteData={handleProcessComplete} token={token} />
        </div>
      )}

      {activeMethod === 'record' && (
        <div className="mm-card">
          <div className="mm-card__header">
            <div className="mm-card__title">Ghi âm trực tiếp</div>
          </div>
          <AudioRecorder meetingId={wsMeetingId} onCompleteData={handleProcessComplete} />
        </div>
      )}

      <div className="mm-card" style={{ marginTop:'var(--space-5)' }}>
        <div className="mm-card__header">
          <div className="mm-card__title">Phân tích và Tóm tắt AI</div>
        </div>
        <MeetingSummary 
          meetingId={currentMeetingId || wsMeetingId} 
          activeTranscript={currentTranscript} 
          activeChunks={currentChunks}
          token={token} 
          meetingInfo={meetingInfo} 
        />
      </div>
    </div>
  );
};

export default MeetingRoomPage;
