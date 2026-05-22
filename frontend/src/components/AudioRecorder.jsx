import React, { useState, useRef, useEffect, useCallback } from 'react';
import API_BASE_URL from '../config';

const AudioRecorder = ({ meetingId = "test-meeting", onCompleteData }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const [time, setTime] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript box
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript]);

  const mediaRecorderRef = useRef(null);
  const webSocketRef = useRef(null);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => { return () => { stopRecordingAndSocket(); }; }, []);

  const initWebSocket = () => {
    if (webSocketRef.current) return;
    const wsUrl = API_BASE_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsUrl}/api/v1/meetings/${meetingId}/stream`);
    ws.onopen = () => { console.log('WebSocket Connected!'); setSocketConnected(true); };
    ws.onmessage = (event) => { 
      if (event.data.startsWith("{")) {
         try {
             const data = JSON.parse(event.data);
             if (data.type === "final") {
                setIsProcessing(false);
                if (onCompleteData) onCompleteData(data.full_text, meetingId, data.chunks);
                ws.close();
                cleanupState();
             } else if (data.type === "error") {
                setIsProcessing(false);
                alert(data.message);
                ws.close();
                cleanupState();
             }
         } catch(e) { console.error("Error parsing WS JSON", e); }
      } else {
         console.log("STT Result:", event.data); 
         setTranscript(prev => (prev ? prev + " " : "") + event.data);
      }
    };
    ws.onclose = (event) => { 
      console.log('WebSocket Closed.', event.reason); 
      setSocketConnected(false); 
      webSocketRef.current = null; 
      if (event.code === 1008) {
        alert("Đã đạt giới hạn 30 phút. Phiên ghi âm sẽ tự động dừng.");
        stopRecordingAndSocket();
      }
    };
    webSocketRef.current = ws;
  };

  const cleanupState = () => {
    clearInterval(timerRef.current); setTime(0);
    setIsRecording(false); isRecordingRef.current = false;
    setIsPaused(false); isPausedRef.current = false;
    setIsProcessing(false);
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
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#8b5cf6');
      gradient.addColorStop(0.5, '#c4b5fd');
      gradient.addColorStop(1, '#8b5cf6');
      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = gradient;
      canvasCtx.lineCap = 'round';
      canvasCtx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        if (i === 0) canvasCtx.moveTo(x, y); else canvasCtx.lineTo(x, y);
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
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      mediaRecorderRef.current = { stream, processor }; // Dùng ref giả lập mediaRecorder để dọn dẹp
      drawWaveform();

      let audioBuffer = [];
      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current || isPausedRef.current) return;
        const channelData = e.inputBuffer.getChannelData(0);
        audioBuffer.push(new Float32Array(channelData));
        
        // Cứ mỗi 8 chunks (~2 giây) thì gom lại gửi 1 lần
        if (audioBuffer.length >= 8 && webSocketRef.current?.readyState === WebSocket.OPEN) {
          const length = audioBuffer.reduce((acc, curr) => acc + curr.length, 0);
          const result = new Float32Array(length);
          let offset = 0;
          for (const buf of audioBuffer) {
              result.set(buf, offset);
              offset += buf.length;
          }
          webSocketRef.current.send(result.buffer);
          audioBuffer = [];
        }
      };

      setIsRecording(true); isRecordingRef.current = true;
      setIsPaused(false); isPausedRef.current = false;
      setTranscript(""); // Reset text khi bắt đầu mới
      timerRef.current = setInterval(() => { 
        setTime(p => {
          const newTime = p + 1;
          if (newTime >= 1800) { // 30 phút = 1800 giây
             stopRecordingAndSocket();
             alert("Ghi âm đã tự động dừng vì đạt giới hạn 30 phút.");
          }
          return newTime;
        }); 
      }, 1000);
    } catch (err) {
      console.error("Lỗi cấp quyền Mic:", err);
      alert("Bạn cần cấp quyền Microphone để ghi âm.");
    }
  };

  const pauseRecording = () => {
    setIsPaused(true); isPausedRef.current = true;
    clearInterval(timerRef.current);
    audioContextRef.current?.suspend();
  };
  const resumeRecording = () => {
    setIsPaused(false); isPausedRef.current = false;
    timerRef.current = setInterval(() => { 
      setTime(p => {
        const newTime = p + 1;
        if (newTime >= 1800) {
           stopRecordingAndSocket();
           alert("Ghi âm đã tự động dừng vì đạt giới hạn 30 phút.");
        }
        return newTime;
      }); 
    }, 1000);
    audioContextRef.current?.resume();
  };

  const stopRecordingAndSocket = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.processor?.disconnect();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
        setSocketConnected(false); 
        setIsProcessing(true); // Hiển thị UI loading xịn
        webSocketRef.current.send("STOP");
    } else {
        webSocketRef.current?.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        audioContextRef.current?.close();
        cleanupState();
    }
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <div className="recorder">
      {/* Waveform */}
      <div className="recorder__wave">
        {!isRecording && !isPaused ? (
          <span className="recorder__wave-placeholder">Nhấn vào Micro để bắt đầu</span>
        ) : (
          <canvas ref={canvasRef} width="400" height="100" style={{ width:'100%', height:'100%' }} />
        )}
      </div>

      {/* Timer */}
      <div className={`recorder__timer ${isRecording && !isPaused ? 'recorder__timer--active' : ''}`}>
        {formatTime(time)}
      </div>

      {/* Controls */}
      <div className="recorder__controls">
        {!isRecording ? (
          <button className="recorder__btn recorder__btn--mic" onClick={startRecording} title="Bắt đầu ghi âm" aria-label="Bắt đầu ghi âm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="white"/>
              <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="white"/>
            </svg>
          </button>
        ) : (
          <>
            <button className="recorder__btn recorder__btn--pause" onClick={!isPaused ? pauseRecording : resumeRecording}
              title={isPaused ? "Tiếp tục" : "Tạm dừng"} aria-label={isPaused ? "Tiếp tục" : "Tạm dừng"}>
              {!isPaused ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill="currentColor"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 5V19L19 12L8 5Z" fill="currentColor"/></svg>
              )}
            </button>
            <button className="recorder__btn recorder__btn--stop" onClick={stopRecordingAndSocket} title="Kết thúc" aria-label="Kết thúc ghi âm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 6H18V18H6V6Z" fill="white"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Connection status */}
      <div className="recorder__status">
        <span className={`mm-dot ${socketConnected ? 'mm-dot--success mm-dot--pulse' : 'mm-dot--muted'}`}></span>
        {socketConnected ? 'Đã kết nối máy chủ nhận diện (Real-time)' : 'Máy chủ nhận diện đang chờ'}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-6)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <style>
            {`@keyframes spin { 100% { transform: rotate(360deg); } }`}
          </style>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', margin: '0 auto var(--space-3)', display: 'block', color: 'var(--primary-color)' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Đang phân tích người nói...</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: '280px', margin: '0 auto' }}>AI Gemini đang nghe lại và bóc tách hội thoại. Quá trình này giúp nâng cao độ chính xác lên đến 99%, vui lòng không đóng trang.</p>
        </div>
      )}

      {/* Realtime Transcript */}
      {(transcript || isRecording) && !isProcessing && (
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-body)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-xs)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Văn bản trực tiếp {isPaused && <span style={{ color: 'var(--danger-color)', marginLeft: 'var(--space-1)', textTransform: 'none' }}>(Đang tạm dừng)</span>}
            </div>
            {isRecording && !isPaused && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <span className="mm-dot mm-dot--pulse" style={{ backgroundColor: 'var(--primary-color)' }}></span>
                <span className="mm-dot mm-dot--pulse" style={{ backgroundColor: 'var(--primary-color)', animationDelay: '0.2s' }}></span>
                <span className="mm-dot mm-dot--pulse" style={{ backgroundColor: 'var(--primary-color)', animationDelay: '0.4s' }}></span>
              </div>
            )}
          </div>
          <div id="transcript-box" style={{ fontSize: 'var(--text-md)', lineHeight: 1.6, minHeight: '60px', maxHeight: '200px', overflowY: 'auto', color: 'var(--text-primary)', paddingRight: 'var(--space-2)', scrollBehavior: 'smooth' }}>
            {transcript ? (
              <>
                {transcript}
                <div ref={transcriptEndRef} />
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Đang lắng nghe...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
