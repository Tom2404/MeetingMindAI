/* eslint-disable react-refresh/only-export-components, react-hooks/exhaustive-deps, react-hooks/rules-of-hooks, react-hooks/set-state-in-effect */
import React, { createContext, useState, useContext } from 'react';

const MeetingContext = createContext();

export const useMeeting = () => useContext(MeetingContext);

export const MeetingProvider = ({ children }) => {
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [activeMethod, setActiveMethod] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [currentChunks, setCurrentChunks] = useState([]);
  const [currentMeetingId, setCurrentMeetingId] = useState(null);
  const [wsMeetingId] = useState(() => `meeting-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);
  const [isSummarySaved, setIsSummarySaved] = useState(false);

  const setupMeeting = (info) => {
    setMeetingInfo(info);
    setActiveMethod(info.method);
    setCurrentTranscript("");
    setCurrentChunks([]);
    setCurrentMeetingId(null);
    setIsSummarySaved(false);
  };

  const endMeeting = () => {
    setMeetingInfo(null);
    setActiveMethod(null);
    setCurrentTranscript("");
    setCurrentChunks([]);
    setCurrentMeetingId(null);
    setIsSummarySaved(false);
  };

  const updateTranscriptData = (transcript, chunks, meetingId) => {
    setCurrentTranscript(transcript);
    setCurrentChunks(chunks);
    setCurrentMeetingId(meetingId);
  };

  return (
    <MeetingContext.Provider value={{ 
      meetingInfo, 
      activeMethod, 
      currentTranscript, 
      currentChunks, 
      currentMeetingId, 
      wsMeetingId,
      isSummarySaved,
      setupMeeting,
      endMeeting,
      updateTranscriptData,
      setIsSummarySaved
    }}>
      {children}
    </MeetingContext.Provider>
  );
};
