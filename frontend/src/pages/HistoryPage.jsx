import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MeetingHistory from '../components/MeetingHistory';

const HistoryPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleViewSummary = (meetingId) => {
    navigate(`/history/${meetingId}`);
  };

  return (
    <div className="animate-fade-in">
      <div className="mm-card">
        <div className="mm-card__header">
          <div className="mm-card__title">Lịch sử cuộc họp cá nhân</div>
        </div>
        <MeetingHistory token={token} onViewSummary={handleViewSummary} />
      </div>
    </div>
  );
};

export default HistoryPage;
