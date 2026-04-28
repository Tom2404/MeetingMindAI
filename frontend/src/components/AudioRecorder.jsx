import React, { useState, useRef, useEffect, useCallback } from 'react';

const AudioRecorder = ({ meetingId = "test-meeting" }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const webSocketRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Khởi tạo Stream Audio WebSocket mỗi khi Bật/Tắt Ghi Âm
  useEffect(() => {
    return () => {
      stopRecordingAndSocket();
    };
  }, []);

  const initWebSocket = () => {
    if (webSocketRef.current) return;
    
    const ws = new WebSocket(`ws://127.0.0.1:8000/api/v1/meetings/${meetingId}/stream`);
    
    ws.onopen = () => {
      console.log('WebSocket Audio Stream Connected!');
      setSocketConnected(true);
    };

    ws.onmessage = (event) => {
      console.log("STT Result từ Server:", event.data);
    };

    ws.onclose = () => {
      console.log('WebSocket Stream Closed.');
      setSocketConnected(false);
      webSocketRef.current = null;
    };

    webSocketRef.current = ws;
  };

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteTimeDomainData(dataArray);

      // Clean canvas clear (Light Theme)
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      // Google style gradient line
      const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#4285f4');
      gradient.addColorStop(0.5, '#ea4335');
      gradient.addColorStop(1, '#fbbc04');

      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = gradient;
      canvasCtx.lineCap = 'round';
      canvasCtx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      initWebSocket();
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      drawWaveform();

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0 && webSocketRef.current?.readyState === WebSocket.OPEN) {
          webSocketRef.current.send(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(3000); 

      setIsRecording(true);
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Lỗi cấp quyền Mic:", err);
      alert("Bạn cần cấp quyền Microphone để ghi âm.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
      if(audioContextRef.current) {
        audioContextRef.current.suspend();
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setTime((prevTime) => prevTime + 1);
      }, 1000);
      if(audioContextRef.current) {
        audioContextRef.current.resume();
      }
    }
  };

  const stopRecordingAndSocket = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    clearInterval(timerRef.current);
    setTime(0);

    if(animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setIsPaused(false);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
      
      {/* Waveform Visualization Area */}
      <div style={{ 
        width: '100%', 
        height: '120px', 
        background: '#f8f9fa', 
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--border-color)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {!isRecording && !isPaused ? (
          <span style={{ color: 'var(--text-secondary)' }}>Nhấn vào Micro để bắt đầu</span>
        ) : (
          <canvas 
            ref={canvasRef} 
            width="400" 
            height="100" 
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      {/* Timer */}
      <div style={{ 
        fontFamily: 'monospace', 
        fontSize: '36px', 
        fontWeight: isRecording && !isPaused ? '600' : '500', 
        color: isRecording && !isPaused ? 'var(--color-danger)' : 'var(--text-primary)',
        marginBottom: '32px',
        transition: 'color 0.3s'
      }}>
        {formatTime(time)}
      </div>

      {/* Floating Controls (Google Meet Style) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        
        {!isRecording ? (
          <button 
            onClick={startRecording}
            style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'var(--color-primary)', border: 'none',
              boxShadow: 'var(--shadow-md)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, transform 0.1s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-primary-hover)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            title="Bắt đầu ghi âm"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="white"/>
              <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="white"/>
            </svg>
          </button>
        ) : (
          <>
            {/* Pause/Resume Button */}
            <button 
              onClick={!isPaused ? pauseRecording : resumeRecording}
              style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-sm)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
              title={isPaused ? "Tiếp tục" : "Tạm dừng"}
            >
              {!isPaused ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill="currentColor"/></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg>
              )}
            </button>

            {/* Stop Button */}
            <button 
              onClick={stopRecordingAndSocket}
              style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'var(--color-danger)', border: 'none',
                boxShadow: 'var(--shadow-md)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s, transform 0.1s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-danger-hover)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'var(--color-danger)'}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              title="Kết thúc ghi âm"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M6 6H18V18H6V6Z" fill="white"/></svg>
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: '24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {socketConnected ? (
           <><span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)'}}></span> Đã kết nối máy chủ nhận diện (Real-time)</>
        ) : (
           <><span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color)'}}></span> Máy chủ nhận diện đang chờ</>
        )}
      </div>

    </div>
  );
};

export default AudioRecorder;
