import React from 'react';
import AIStatusBar from '../components/AIStatusBar';

const SystemStatusPage = () => {
  return (
    <div className="animate-fade-in">
      <div className="page-greeting">
        <div className="page-greeting__hello">Trạng thái Hệ thống AI</div>
        <div className="page-greeting__sub">Kiểm tra kết nối mô hình LLM và dịch vụ bóc băng</div>
      </div>
      <AIStatusBar />
    </div>
  );
};

export default SystemStatusPage;
