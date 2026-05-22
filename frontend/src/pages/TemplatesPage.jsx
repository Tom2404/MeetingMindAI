import React, { useState, useEffect } from 'react';

// === Icons ===
const IconTemplate = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>;
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const IconCode = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;

const DEFAULT_TEMPLATES = [
  {
    id: 'weekly-sync',
    name: 'Sync tuần (Weekly Sync)',
    icon: '📊',
    category: 'Quản lý dự án',
    desc: 'Tối ưu cho họp giao ban, cập nhật tiến độ tuần, rào cản hiện tại và kế hoạch tiếp theo.',
    prompt: `Hãy đóng vai trò là thư ký chuyên nghiệp. Phân tích văn bản bóc băng cuộc họp Sync Tuần và trích xuất:
1. TIẾN ĐỘ THỰC TẾ: Các hạng mục đã hoàn thành trong tuần qua của từng người.
2. KHÓ KHĂN & RÀO CẢN: Vấn đề được nêu ra và cách giải quyết được thống nhất.
3. KẾ HOẠCH TUẦN TỚI: Action Items cụ thể cùng người chịu trách nhiệm và deadline rõ ràng.`
  },
  {
    id: 'brainstorming',
    name: 'Động não & Ý tưởng (Brainstorming)',
    icon: '💡',
    category: 'Sáng tạo',
    desc: 'Tập trung ghi nhận toàn bộ ý tưởng sáng tạo độc đáo, thảo luận giải pháp và các bước triển khai thử nghiệm.',
    prompt: `Hãy đóng vai trò là chuyên gia phân tích sáng tạo. Phân tích văn bản bóc băng cuộc họp Brainstorming và trích xuất:
1. CHỦ ĐỀ CHÍNH: Vấn đề đang cần tìm ý tưởng giải quyết.
2. CÁC Ý TƯỞNG ĐÃ ĐỀ XUẤT: Danh sách các ý tưởng nổi bật kèm theo người đề xuất.
3. Ý TƯỞNG ĐƯỢC CHỌN THỬ NGHIỆM: Các ý tưởng khả thi nhất kèm lý do chọn.
4. BƯỚC ĐI TIẾP THEO: Phân công nghiên cứu sâu hoặc làm sản phẩm mẫu.`
  },
  {
    id: 'tech-design',
    name: 'Họp Kỹ thuật & Kiến trúc (Tech Design)',
    icon: '⚙️',
    category: 'Kỹ thuật',
    desc: 'Trích xuất các quyết định cấu trúc, sơ đồ công nghệ, lựa chọn thư viện và kế hoạch refactor mã nguồn.',
    prompt: `Hãy đóng vai trò là Kiến trúc sư phần mềm trưởng. Phân tích văn bản bóc băng cuộc họp Kỹ thuật và trích xuất:
1. BỐI CẢNH & VẤN ĐỀ KỸ THUẬT: Những lỗi, điểm nghẽn hệ thống hoặc tính năng mới cần thiết kế.
2. CÁC PHƯƠNG ÁN ĐÃ THẢO LUẬN: Đánh giá ưu nhược điểm của từng phương án kiến trúc.
3. QUYẾT ĐỊNH CUỐI CÙNG: Phương án kỹ thuật được chốt, công nghệ/thư viện sử dụng.
4. KẾ HOẠCH TRIỂN KHAI: Từng bước coding, kiểm thử và phân chia module.`
  },
  {
    id: 'recruitment',
    name: 'Phỏng vấn Tuyển dụng (Interview)',
    icon: '🤝',
    category: 'Nhân sự',
    desc: 'Đánh giá kỹ năng ứng viên, điểm mạnh/yếu, câu hỏi thảo luận chính và ý kiến kết luận của hội đồng.',
    prompt: `Hãy đóng vai trò là Chuyên viên Nhân sự cấp cao. Phân tích văn bản bóc băng cuộc phỏng vấn tuyển dụng và trích xuất:
1. THÔNG TIN ỨNG VIÊN & VỊ TRÍ: Tên ứng viên, vị trí ứng tuyển.
2. ĐIỂM MẠNH NỔI BẬT: Kiến thức kỹ thuật, kinh nghiệm thực tế, soft skills thể hiện tốt.
3. ĐIỂM CẦN LƯU Ý/YẾU: Các điểm ứng viên trả lời chưa tốt hoặc thiếu kinh nghiệm.
4. ĐÁNH GIÁ VĂN HÓA & THÁI ĐỘ: Sự phù hợp với môi trường làm việc của công ty.
5. ĐỀ XUẤT CUỐI CÙNG: Pass/Fail hoặc chuyển tiếp vòng sau.`
  },
  {
    id: 'sales-client',
    name: 'Tư vấn & Gặp gỡ Khách hàng (Sales Pitch)',
    icon: '💰',
    category: 'Kinh doanh',
    desc: 'Trích xuất nhu cầu cụ thể của đối tác, các tính năng họ mong muốn, mức ngân sách thảo luận và các cam kết hỗ trợ.',
    prompt: `Hãy đóng vai trò là Giám đốc phát triển kinh doanh. Phân tích văn bản bóc băng cuộc họp với khách hàng và trích xuất:
1. NHU CẦU & NỖI ĐAU CỦA KHÁCH HÀNG: Vấn đề họ đang gặp phải trong kinh doanh hoặc vận hành.
2. GIẢI PHÁP ĐỀ XUẤT: Các tính năng và dịch vụ mà MeetingMind AI/Công ty giới thiệu thuyết phục họ.
3. PHẢN HỒI CỦA KHÁCH HÀNG: Những e ngại về giá cả, thời gian triển khai hoặc yêu cầu đặc biệt.
4. HÀNH ĐỘNG SAU HỌP: Gửi báo giá chi tiết, demo kỹ thuật cùng thời gian cam kết.`
  }
];

const TemplatesPage = () => {
  const [defaultTemplateId, setDefaultTemplateId] = useState('weekly-sync');
  const [selectedTemplate, setSelectedTemplate] = useState(DEFAULT_TEMPLATES[0]);

  useEffect(() => {
    const saved = localStorage.getItem('meetingmind_default_template');
    if (saved) {
      setDefaultTemplateId(saved);
      const matched = DEFAULT_TEMPLATES.find(t => t.id === saved);
      if (matched) setSelectedTemplate(matched);
    }
  }, []);

  const handleSetDefault = (id) => {
    localStorage.setItem('meetingmind_default_template', id);
    setDefaultTemplateId(id);
    const matched = DEFAULT_TEMPLATES.find(t => t.id === id);
    if (matched) setSelectedTemplate(matched);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      
      {/* Banner */}
      <div style={{
        background: 'var(--brand-gradient)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-8)',
        color: 'white',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: '32px' }}>🎯</span>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '-0.5px' }}>Thư viện Mẫu Prompt AI</h1>
        </div>
        <p style={{ margin: 0, opacity: 0.9, fontSize: 'var(--text-sm)', maxWidth: '650px', lineHeight: 1.5 }}>
          Lựa chọn mẫu tóm tắt phù hợp để AI trích xuất thông tin chuẩn xác nhất theo mục tiêu cuộc họp. Mẫu được chọn mặc định sẽ tự động áp dụng khi bạn chạy tóm tắt cuộc họp mới.
        </p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        
        {/* Cột trái: Danh sách mẫu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ margin: '0 0 var(--space-1) 0', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Danh sách Mẫu AI ({DEFAULT_TEMPLATES.length})
          </h2>

          {DEFAULT_TEMPLATES.map((tmpl) => {
            const isDefault = defaultTemplateId === tmpl.id;
            const isSelected = selectedTemplate.id === tmpl.id;

            return (
              <div 
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                style={{
                  padding: 'var(--space-4)',
                  background: 'var(--bg-surface)',
                  border: isSelected ? '2px solid var(--google-blue)' : '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-4)',
                  position: 'relative'
                }}
              >
                <span style={{ fontSize: '28px', background: 'var(--bg-body)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tmpl.icon}
                </span>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {tmpl.name}
                    </span>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 600, 
                      padding: '2px 8px', 
                      borderRadius: 'var(--radius-full)', 
                      background: 'var(--bg-surface-hover)', 
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-default)'
                    }}>
                      {tmpl.category}
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {tmpl.desc}
                  </p>

                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    {isDefault ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--google-green)',
                        background: 'var(--success-50)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <IconCheck /> Mẫu mặc định
                      </span>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(tmpl.id);
                        }}
                        className="mm-btn mm-btn--sm mm-btn--secondary"
                        style={{ padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}
                      >
                        Đặt làm mặc định
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cột phải: Chi tiết mẫu Prompt */}
        <div style={{ position: 'sticky', top: 'calc(var(--header-height) + var(--space-4))' }}>
          <div className="glass-panel" style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', borderBottom: '1px solid var(--border-default)', paddingBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: '32px' }}>{selectedTemplate.icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                  {selectedTemplate.name}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  Chuyên mục: {selectedTemplate.category}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconCode /> Cấu trúc Prompt AI gửi LLM
              </span>
              <div style={{
                background: 'var(--bg-body)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
                maxHeight: '350px',
                overflowY: 'auto'
              }}>
                {selectedTemplate.prompt}
              </div>
            </div>

            <div style={{
              background: 'var(--google-blue-bg)',
              border: '1px solid var(--primary-200)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              fontSize: 'var(--text-xs)',
              color: 'var(--google-blue)',
              lineHeight: 1.5
            }}>
              <b>💡 Mẹo sử dụng:</b> Bạn có thể chọn mẫu phù hợp nhất trước khi bấm Tóm tắt. Hệ thống sẽ tự động điều chỉnh chỉ thị (System Instruction) để LLM đọc hiểu và trích xuất đúng bối cảnh cuộc thảo luận.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default TemplatesPage;
