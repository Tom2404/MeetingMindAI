import React, { useState, useEffect } from 'react';
import { DEFAULT_TEMPLATES } from '../config/templates';

// === Icons ===
const IconCheck = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const IconCode = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;

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
              <b>Mẹo sử dụng:</b> Bạn có thể chọn mẫu phù hợp nhất trước khi bấm Tóm tắt. Hệ thống sẽ tự động điều chỉnh chỉ thị (System Instruction) để LLM đọc hiểu và trích xuất đúng bối cảnh cuộc thảo luận.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default TemplatesPage;
