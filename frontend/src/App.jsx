import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MeetingProvider } from './contexts/MeetingContext';
import { NotificationProvider } from './contexts/NotificationContext';


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
import TemplatesPage from './pages/TemplatesPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminLogsPage from './pages/admin/AdminLogsPage';
import AdminAIPage from './pages/admin/AdminAIPage';

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

const AdminRoute = ({ children }) => {
  const { currentUser, isCheckingAuth } = useAuth();

  if (isCheckingAuth) return null;
  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role !== 'admin') return <Navigate to="/" />;

  return children;
};

const UserRoute = ({ children }) => {
  const { currentUser, isCheckingAuth } = useAuth();

  if (isCheckingAuth) return null;
  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role === 'admin') return <Navigate to="/admin/dashboard" />;

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
        <Route index element={
          <UserRoute>
            <HomePage />
          </UserRoute>
        } />
        <Route path="room" element={
          <UserRoute>
            <MeetingRoomPage />
          </UserRoute>
        } />
        <Route path="history" element={
          <UserRoute>
            <HistoryPage />
          </UserRoute>
        } />
        <Route path="history/:id" element={
          <UserRoute>
            <HistoryViewPage />
          </UserRoute>
        } />
        <Route path="status" element={<SystemStatusPage />} />
        <Route path="tasks" element={
          <UserRoute>
            <TasksPage />
          </UserRoute>
        } />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="templates" element={
          <UserRoute>
            <TemplatesPage />
          </UserRoute>
        } />
        <Route path="analytics" element={
          <UserRoute>
            <AnalyticsPage />
          </UserRoute>
        } />

        <Route
          path="admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/logs"
          element={
            <AdminRoute>
              <AdminLogsPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/ai"
          element={
            <AdminRoute>
              <AdminAIPage />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
