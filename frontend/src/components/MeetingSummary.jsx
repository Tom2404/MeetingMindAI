import React, { useState, useEffect, useRef } from 'react';

const MeetingSummary = ({ meetingId, activeTranscript, viewingSummaryId, token }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [errorType, setErrorType] = useState(""); // 'ai' | 'network' | 'server'
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  // Dùng ref để lưu trữ cờ nhằm tránh gọi lại LLM nhiều lần cho 1 Transcript giống hệt
  const lastProcessedTranscript = useRef(null);

  // Nếu đang XEM summary đã lưu từ History → tải về từ server
  useEffect(() => {
    if (viewingSummaryId) {
      loadSavedSummary(viewingSummaryId);
    }
  }, [viewingSummaryId]);

  // TỰ ĐỘNG CHẠY TÓM TẮT NGAY KHI CÓ TRANSCRIPT CHUẨN XÁC YÊU CẦU LƯU CHUYỂN E2E
  useEffect(() => {
     if (activeTranscript && activeTranscript !== lastProcessedTranscript.current && !isLoading && !summaryData && !viewingSummaryId) {
        lastProcessedTranscript.current = activeTranscript;
        handleStartSummarize();
     }
  }, [activeTranscript]);

  // Bộ đếm giây cho Loading state tránh User tưởng model bị treo
  useEffect(() => {
    let interval = null;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
      setLoadingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const loadSavedSummary = async (mId) => {
    setIsLoading(true);
    setErrorMsg("");
    setErrorType("");
    setSummaryData(null);
    setIsSaved(true);

    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`http://127.0.0.1:8000/api/v1/meetings/${mId}/summary`, { headers });
      if (!response.ok) throw new Error(`server:${response.status}`);
      
      const data = await response.json();
      setSummaryData(data.summary);
    } catch (err) {
      if (err.message?.startsWith('server:')) {
        setErrorType('server');
        setErrorMsg(`Không tải được bản tóm tắt (mã lỗi ${err.message.replace('server:', '')})`);
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setErrorType('network');
        setErrorMsg('Không kết nối được tới Backend. Hãy kiểm tra server đang chạy không.');
      } else {
        setErrorType('server');
        setErrorMsg(err.message || 'Không thể tải bản tóm tắt đã lưu.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSummarize = async () => {
    if (!activeTranscript) return;
    
    setIsLoading(true);
    setErrorMsg("");
    setErrorType("");
    setLoadingSeconds(0);
    setIsSaved(false);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('http://127.0.0.1:8000/api/v1/meetings/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          transcript: activeTranscript,
          meeting_id: meetingId || null
        })
      });

      if (!response.ok) {
        // Phân biệt lỗi server 500 (LLM crash) vs lỗi khác
        if (response.status === 500) {
          const errData = await response.json().catch(() => ({}));
          const detail = errData.detail || '';
          if (detail.toLowerCase().includes('ollama') || detail.toLowerCase().includes('llm') || detail.toLowerCase().includes('connection')) {
            setErrorType('ai');
            setErrorMsg('Hệ thống không nhận diện được AI (Ollama chưa khởi động hoặc model chưa được cài). Hãy kiểm tra thanh trạng thái AI phía trên.');
          } else {
            setErrorType('server');
            setErrorMsg(`Lỗi xử lý nội bộ phía máy chủ. ${detail}`);
          }
        } else {
          setErrorType('server');
          setErrorMsg(`Lỗi máy chủ (${response.status})`);
        }
        return;
      }

      const responseData = await response.json();
      setSummaryData(responseData.data);
      if (responseData.saved_id) setIsSaved(true);

    } catch (err) {
      // TypeError: Failed to fetch → Backend không chạy
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setErrorType('network');
        setErrorMsg('Không kết nối được tới Backend (http://127.0.0.1:8000). Hãy kiểm tra server đang chạy không.');
      } else {
        setErrorType('ai');
        setErrorMsg(err.message || 'Hệ thống không nhận diện được AI. Đã xảy ra lỗi khi kết nối tới LLM Local.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActionItem = (id) => {
    if (!summaryData) return;
    const updatedItems = summaryData.action_items.map((item, index) =>
      (item.id || index) === id ? { ...item, completed: !item.completed } : item
    );
    setSummaryData({ ...summaryData, action_items: updatedItems });
  };

  const handleExportTxt = () => {
    if (!summaryData) return;
    
    let textContent = `KẾT QUẢ CUỘC HỌP: ${meetingId || "Test"}\n`;
    textContent += `=====================================\n\n`;
    
    textContent += `1. TÓM TẮT NỘI DUNG\n-------------------\n`;
    textContent += `${summaryData.summary_text}\n\n`;
    
    textContent += `2. CÁC QUYẾT ĐỊNH ĐƯỢC CHỐT\n---------------------------\n`;
    (summaryData.decisions || []).forEach((dec) => {
      textContent += `- ${dec}\n`;
    });
    textContent += `\n`;
    
    textContent += `3. ACTION ITEMS (VIỆC CẦN LÀM)\n------------------------------\n`;
    (summaryData.action_items || []).forEach((item) => {
      textContent += `[${item.completed ? 'x' : ' '}] ${item.task_name}\n`;
      textContent += `    Phụ trách: ${item.assignee} | Hạn chót: ${item.deadline}\n`;
    });

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Meeting_Summary_${meetingId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="meeting-summary" style={{ fontFamily: 'Inter, sans-serif', maxWidth: '800px', margin: '0 auto', color: '#333' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .meeting-summary { box-shadow: none; border: none; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eaeaea', paddingBottom: '10px' }}>
        <h2>Kết quả Khai thác ({meetingId || "Test"})</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSaved && (
            <span style={{ 
              fontSize: '12px', color: '#fff', fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              padding: '4px 12px', borderRadius: '20px'
            }}>
              💾 Đã lưu
            </span>
          )}
          <span style={{ fontSize: '13px', color: '#0f9d58', fontWeight: 'bold' }}>Hoàn toàn tự động</span>
        </div>
      </div>

      {isLoading && (
         <div className="no-print" style={{ marginTop: '40px', padding: '40px', textAlign: 'center', color: '#4285f4', background: '#e8f0fe', borderRadius: '12px', border: '1px solid #d2e3fc' }}>
            <div style={{ 
               display: 'inline-block', width: '40px', height: '40px', 
               border: '4px solid rgba(66, 133, 244, 0.2)',
               borderTop: '4px solid #4285f4', borderRadius: '50%',
               animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ marginTop: '16px', fontWeight: 600, fontSize: '16px' }}>
              {viewingSummaryId ? 'Đang tải bản tóm tắt đã lưu...' : 'Đang kết nối LLM (Llama / Ollama) tóm tắt cuộc họp...'}
            </p>
            {!viewingSummaryId && (
              <>
                <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a73e8', margin: '8px 0' }}>{loadingSeconds} giây</p>
                <div style={{ width: '60%', height: '4px', background: 'rgba(66, 133, 244, 0.2)', borderRadius: '2px', margin: '0 auto', overflow: 'hidden' }}>
                   <div style={{ width: `${Math.min((loadingSeconds/20)*100, 100)}%`, height: '100%', background: '#4285f4', transition: 'width 1s linear' }}></div>
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>*Giai đoạn này Trí Tuệ Nhân Tạo đang đọc tài liệu đã bóc băng để chiết xuất thông tin</p>
              </>
            )}
         </div>
      )}

      {errorMsg && (
        <div style={{
          padding: '16px 18px', marginTop: '20px', borderRadius: '10px',
          border: `1px solid ${errorType === 'network' ? '#bfdbfe' : errorType === 'ai' ? '#fed7aa' : '#fecaca'}`,
          background: errorType === 'network' ? '#eff6ff' : errorType === 'ai' ? '#fff7ed' : '#fff5f5',
          display: 'flex', gap: '14px', alignItems: 'flex-start'
        }}>
          {/* Icon theo loại lỗi */}
          <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
            {errorType === 'network' ? '🔌' : errorType === 'ai' ? '🤖' : '⚠️'}
          </span>
          <div style={{ flex: 1 }}>
            <strong style={{ 
              display: 'block', marginBottom: '4px', fontSize: '14px',
              color: errorType === 'network' ? '#1e40af' : errorType === 'ai' ? '#c2410c' : '#b91c1c'
            }}>
              {errorType === 'network' && 'Không kết nối được Backend'}
              {errorType === 'ai' && 'Hệ thống không nhận diện được AI'}
              {errorType === 'server' && 'Lỗi xử lý phía máy chủ'}
              {!errorType && 'Lỗi hệ thống'}
            </strong>
            <span style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>{errorMsg}</span>
          </div>
          <button
            onClick={viewingSummaryId ? () => loadSavedSummary(viewingSummaryId) : handleStartSummarize}
            style={{
              flexShrink: 0, padding: '6px 14px',
              background: errorType === 'ai' ? '#ea580c' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '13px', fontWeight: '500',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {!summaryData && !isLoading && !errorMsg && (
        <div className="no-print" style={{ marginTop: '40px', textAlign: 'center', color: '#5f6368', padding: '40px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #dadce0' }}>
          <p>Chưa có dữ liệu. Vui lòng ghi âm hoặc chờ hệ thống bóc băng hoàn tất.</p>
        </div>
      )}

      {summaryData && !isLoading && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>*Dữ liệu sinh từ AI, nên kiểm tra lại trước khi in ấn.</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleExportTxt}
                style={{ background: '#343a40', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                📄 Xuất TXT
              </button>
              <button 
                onClick={handleExportPdf}
                style={{ background: '#ea4335', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>
                🖨 In Dữ Liệu
              </button>
            </div>
          </div>

          <section style={{ background: '#f8f9fa', padding: '20px', borderRadius: '10px', borderLeft: '5px solid #4285f4' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#4285f4' }}>📝 Tóm Tắt Tự Động (Llama)</h3>
            <p style={{ lineHeight: '1.6', margin: 0 }}>{summaryData.summary_text}</p>
          </section>

          <section style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0f9d58' }}>🎯 Các Quyết Định Được Chốt</h3>
            <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
              {(summaryData.decisions || []).map((decision, index) => (
                <li key={index}><strong>{decision}</strong></li>
              ))}
              {(summaryData.decisions || []).length === 0 && (
                <li style={{ color: '#999', fontStyle: 'italic' }}>Không có quyết định nào được chốt.</li>
              )}
            </ul>
          </section>

          <section style={{ background: '#fff', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#ea4335' }}>⚡ Action Items (Khoán Công Việc)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(summaryData.action_items || []).map((item, index) => {
                const uniqueId = item.id || index;
                return (
                  <label 
                    key={uniqueId} 
                    style={{ 
                      display: 'flex', alignItems: 'center', padding: '12px', 
                      background: item.completed ? '#e9ecef' : '#fdfdfe', 
                      border: '1px solid #ced4da', borderRadius: '5px',
                      cursor: 'pointer', transition: 'all 0.2s',
                      textDecoration: item.completed ? 'line-through' : 'none',
                      color: item.completed ? '#6c757d' : '#212529'
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={!!item.completed} 
                      onChange={() => toggleActionItem(uniqueId)}
                      style={{ width: '20px', height: '20px', marginRight: '15px', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <span style={{ fontWeight: '600', fontSize: '16px' }}>{item.task_name}</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '4px', opacity: 0.8 }}>
                        <span>👤 Phụ trách: <strong>{item.assignee || 'Trống'}</strong></span>
                        <span>📅 Hạn chót: <strong>{item.deadline || 'Trống'}</strong></span>
                      </div>
                    </div>
                  </label>
                )
              })}
              {(summaryData.action_items || []).length === 0 && (
                <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                  Không có công việc nào được trích xuất.
                </p>
              )}
            </div>
          </section>

        </div>
      )}
    </div>
  );
};

export default MeetingSummary;
