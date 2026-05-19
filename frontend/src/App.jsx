import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MeetingProvider } from './contexts/MeetingContext';

// Layout & Pages
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import MeetingRoomPage from './pages/MeetingRoomPage';
import HistoryPage from './pages/HistoryPage';
import HistoryViewPage from './pages/HistoryViewPage';
import SystemStatusPage from './pages/SystemStatusPage';
import ProfilePage from './pages/ProfilePage';
import TasksPage from './pages/TasksPage';
import AuthPage from './components/AuthPage';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { currentUser, isCheckingAuth } = useAuth();
  
  if (isCheckingAuth) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-body)' }}>
        <div style={{ textAlign:'center' }}>
          <div className="mm-spinner mm-spinner--lg mm-spinner--primary" style={{ margin:'0 auto 16px' }}></div>
          <p style={{ color:'var(--text-secondary)', fontWeight:500 }}>Đang khởi động...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Login Route Wrapper
const LoginRoute = ({ children }) => {
  const { currentUser, isCheckingAuth } = useAuth();
  if (isCheckingAuth) return null; // or spinner
  if (currentUser) {
    return <Navigate to="/" />;
  }
  return children;
};

// Inner App Component to handle routing
const AppRoutes = () => {
  const { login } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        <LoginRoute>
          <AuthPage onLoginSuccess={login} />
        </LoginRoute>
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <MeetingProvider>
            <MainLayout />
          </MeetingProvider>
        </ProtectedRoute>
      }>
        <Route index element={<HomePage />} />
        <Route path="room" element={<MeetingRoomPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<HistoryViewPage />} />
        <Route path="status" element={<SystemStatusPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
