import React, { useState } from 'react';

// ─── SVG Icons ───
const IconFileText = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-500)' }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconFolder = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

/**
 * MeetingSetup — Modal form thu thập thông tin cuộc họp
 * trước khi bắt đầu ghi âm hoặc tải file.
 */
const MeetingSetup = ({ onConfirm, onCancel }) => {
  const [meetingName, setMeetingName] = useState('');
  const [host, setHost] = useState('');
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState('upload'); // 'upload' | 'record'
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!meetingName.trim()) {
      setError('Vui lòng nhập tên cuộc họp');
      return;
    }
    onConfirm({
      meetingName: meetingName.trim(),
      host: host.trim(),
      participants: participants.trim(),
      notes: notes.trim(),
      method,
    });
  };

  return (
    <div className="mm-overlay" onClick={onCancel}>
      <div className="mm-modal mm-modal--setup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mm-modal__header" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="mm-modal__icon"><IconFileText /></div>
          <div>
            <div className="mm-modal__title">Cuộc họp mới</div>
            <div className="mm-modal__subtitle">Nhập thông tin cơ bản trước khi bắt đầu</div>
          </div>
        </div>

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-form-columns">
            {/* Cột trái: Thông tin cuộc họp */}
            <div className="setup-form-left">
              {/* Meeting name */}
              <div className="mm-input-group">
                <label className="mm-input-label mm-input-label--required">Tên cuộc họp</label>
                <input
                  className={`mm-input ${error ? 'mm-input--error' : ''}`}
                  type="text"
                  placeholder="VD: Họp sprint planning tuần 18"
                  value={meetingName}
                  onChange={(e) => { setMeetingName(e.target.value); setError(''); }}
                  autoFocus
                />
                {error && <span className="mm-input-error">{error}</span>}
              </div>

              {/* Host */}
              <div className="mm-input-group">
                <label className="mm-input-label">Người chủ trì</label>
                <input
                  className="mm-input"
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                />
              </div>

              {/* Participants */}
              <div className="mm-input-group">
                <label className="mm-input-label">Người tham gia</label>
                <input
                  className="mm-input"
                  type="text"
                  placeholder="VD: Trần B, Lê C, Phạm D"
                  value={participants}
                  onChange={(e) => setParticipants(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="mm-input-group">
                <label className="mm-input-label">Ghi chú</label>
                <textarea
                  className="mm-input mm-textarea"
                  placeholder="Mục đích cuộc họp, chủ đề chính..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Cột phải: Phương thức nhập & Action Buttons */}
            <div className="setup-form-right">
              {/* Method selection */}
              <div className="mm-input-group">
                <label className="mm-input-label">Phương thức nhập liệu</label>
                <div className="setup-method--vertical">
                  <button
                    type="button"
                    className={`setup-method__option-vertical ${method === 'upload' ? 'setup-method__option-vertical--active' : ''}`}
                    onClick={() => setMethod('upload')}
                  >
                    <span className="setup-method__icon-vertical"><IconFolder /></span>
                    <div className="setup-method__details-vertical">
                      <span className="setup-method__label-vertical">Tải file lên</span>
                      <span className="setup-method__desc-vertical">Tải tệp âm thanh có sẵn (MP3, WAV, M4A,...)</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`setup-method__option-vertical ${method === 'record' ? 'setup-method__option-vertical--active' : ''}`}
                    onClick={() => setMethod('record')}
                  >
                    <span className="setup-method__icon-vertical"><IconMic /></span>
                    <div className="setup-method__details-vertical">
                      <span className="setup-method__label-vertical">Ghi âm trực tiếp</span>
                      <span className="setup-method__desc-vertical">Nhận diện Real-time qua Micro của thiết bị</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="mm-modal__actions" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)' }}>
                <button type="button" className="mm-btn mm-btn--md mm-btn--secondary" onClick={onCancel} style={{ borderRadius: 'var(--radius-lg)' }}>
                  Hủy
                </button>
                <button type="submit" className="mm-btn mm-btn--md mm-btn--primary" style={{ borderRadius: 'var(--radius-lg)' }}>
                  Tiếp tục
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingSetup;
