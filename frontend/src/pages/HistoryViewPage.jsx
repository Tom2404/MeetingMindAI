import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MeetingSummary from '../components/MeetingSummary';

const HistoryViewPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  if (!id) return null;

  return (
    <div className="animate-fade-in">
      <div className="mm-card">
        <div className="mm-card__header">
          <div className="mm-card__title">Chi tiết bản tóm tắt</div>
          <button className="mm-btn mm-btn--sm mm-btn--ghost" onClick={() => navigate('/history')}>← Quay lại Lịch sử</button>
        </div>
        <MeetingSummary meetingId={id} viewingSummaryId={id} token={token} />
      </div>
    </div>
  );
};

export default HistoryViewPage;
