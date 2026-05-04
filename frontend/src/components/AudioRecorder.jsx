import React, { useState, useRef, useEffect, useCallback } from 'react';

const AudioRecorder = ({ meetingId = "test-meeting", onCompleteData }) => {
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

  useEffect(() => { return () => { stopRecordingAndSocket(); }; }, []);

  const initWebSocket = () => {
    if (webSocketRef.current) return;
    const ws = new WebSocket(`ws://127.0.0.1:8000/api/v1/meetings/${meetingId}/stream`);
    ws.onopen = () => { console.log('WebSocket Connected!'); setSocketConnected(true); };
    ws.onmessage = (event) => { console.log("STT Result:", event.data); };
    ws.onclose = () => { console.log('WebSocket Closed.'); setSocketConnected(false); webSocketRef.current = null; };
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
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#1a73e8');
      gradient.addColorStop(0.5, '#8ab4f8');
      gradient.addColorStop(1, '#1a73e8');
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
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      drawWaveform();
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data?.size > 0 && webSocketRef.current?.readyState === WebSocket.OPEN)
          webSocketRef.current.send(event.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(3000);
      setIsRecording(true); setIsPaused(false);
      timerRef.current = setInterval(() => { setTime(p => p + 1); }, 1000);
    } catch (err) {
      console.error("Lỗi cấp quyền Mic:", err);
      alert("Bạn cần cấp quyền Microphone để ghi âm.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause(); setIsPaused(true);
      clearInterval(timerRef.current);
      audioContextRef.current?.suspend();
    }
  };
  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume(); setIsPaused(false);
      timerRef.current = setInterval(() => { setTime(p => p + 1); }, 1000);
      audioContextRef.current?.resume();
    }
  };

  const stopRecordingAndSocket = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    }
    webSocketRef.current?.close();
    clearInterval(timerRef.current); setTime(0);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    audioContextRef.current?.close();
    setIsRecording(false); setIsPaused(false);
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
    </div>
  );
};

export default AudioRecorder;
