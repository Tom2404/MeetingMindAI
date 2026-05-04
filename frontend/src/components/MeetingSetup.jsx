import React, { useState } from 'react';

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
      <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mm-modal__header">
          <div className="mm-modal__icon">📝</div>
          <div>
            <div className="mm-modal__title">Cuộc họp mới</div>
            <div className="mm-modal__subtitle">Nhập thông tin cơ bản trước khi bắt đầu</div>
          </div>
        </div>

        <form className="setup-form" onSubmit={handleSubmit}>
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
              rows={3}
            />
          </div>

          {/* Method selection */}
          <div className="mm-input-group">
            <label className="mm-input-label">Phương thức nhập liệu</label>
            <div className="setup-method">
              <button
                type="button"
                className={`setup-method__option ${method === 'upload' ? 'setup-method__option--active' : ''}`}
                onClick={() => setMethod('upload')}
              >
                <span className="setup-method__icon">📁</span>
                <span className="setup-method__label">Tải file lên</span>
                <span className="setup-method__desc">Upload file MP3, WAV, M4A</span>
              </button>
              <button
                type="button"
                className={`setup-method__option ${method === 'record' ? 'setup-method__option--active' : ''}`}
                onClick={() => setMethod('record')}
              >
                <span className="setup-method__icon">🎙️</span>
                <span className="setup-method__label">Ghi âm trực tiếp</span>
                <span className="setup-method__desc">Ghi âm real-time qua micro</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mm-modal__actions">
            <button type="button" className="mm-btn mm-btn--md mm-btn--secondary" onClick={onCancel}>
              Hủy
            </button>
            <button type="submit" className="mm-btn mm-btn--md mm-btn--primary">
              Tiếp tục →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MeetingSetup;
