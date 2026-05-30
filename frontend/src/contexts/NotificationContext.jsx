import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// SVG Icons for different Toast & Modal types
const IconSuccess = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const IconError = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const IconWarning = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconInfo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    message: '',
    title: 'Xác nhận',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    resolve: null
  });

  // 1. Toast Notification Handler
  const notify = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // Trigger slide out before deleting from state
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250); // Match CSS exit animation time
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  }, []);

  // 2. Custom Confirm Modal Handler
  const confirm = useCallback((message, title = 'Xác nhận', confirmText = 'Xác nhận', cancelText = 'Hủy') => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        message,
        title,
        confirmText,
        cancelText,
        resolve
      });
    });
  }, []);

  const handleConfirmResponse = useCallback((response) => {
    if (confirmModal.resolve) {
      confirmModal.resolve(response);
    }
    setConfirmModal((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [confirmModal]);

  // Accessibility support for confirm modal (Enter to confirm, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!confirmModal.isOpen) return;
      if (e.key === 'Escape') {
        handleConfirmResponse(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmResponse(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal.isOpen, handleConfirmResponse]);

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* Toast notifications container */}
      <div className="mm-toast-container">
        {toasts.map((toast) => {
          let IconComponent = IconInfo;
          if (toast.type === 'success') IconComponent = IconSuccess;
          else if (toast.type === 'error') IconComponent = IconError;
          else if (toast.type === 'warning') IconComponent = IconWarning;

          return (
            <div
              key={toast.id}
              className={`mm-toast mm-toast--${toast.type} ${toast.exiting ? 'mm-toast--exit' : ''}`}
            >
              <span className="mm-toast__icon">
                <IconComponent />
              </span>
              <div className="mm-toast__content">{toast.message}</div>
              <button
                className="mm-toast__close"
                onClick={() => removeToast(toast.id)}
                title="Đóng thông báo"
              >
                <IconClose />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modern custom confirm modal */}
      {confirmModal.isOpen && (
        <div className="mm-overlay animate-fade-in" style={{ zIndex: 10200 }}>
          <div className="mm-modal" style={{ maxWidth: '440px' }} role="dialog" aria-modal="true">
            <div className="mm-modal__header">
              {confirmModal.title.toLowerCase().includes('xóa') || confirmModal.message.toLowerCase().includes('xóa') ? (
                <div className="mm-modal__icon" style={{ background: 'var(--google-red-bg)', color: 'var(--google-red)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
              ) : (
                <div className="mm-modal__icon" style={{ background: 'var(--google-blue-bg)', color: 'var(--google-blue)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
              )}
              <h3 className="mm-modal__title">{confirmModal.title}</h3>
            </div>
            
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-md)', lineHeight: 1.6, padding: '0 4px' }}>
              {confirmModal.message}
            </div>

            <div className="mm-modal__actions" style={{ gap: 'var(--space-2)' }}>
              <button 
                className="mm-btn mm-btn--sm mm-btn--secondary" 
                onClick={() => handleConfirmResponse(false)}
                style={{ borderRadius: 'var(--radius-lg)', padding: '8px 16px' }}
              >
                {confirmModal.cancelText}
              </button>
              <button 
                className={`mm-btn mm-btn--sm ${(confirmModal.title.toLowerCase().includes('xóa') || confirmModal.message.toLowerCase().includes('xóa')) ? 'mm-btn--danger' : 'mm-btn--primary'}`}
                onClick={() => handleConfirmResponse(true)}
                autoFocus
                style={{ borderRadius: 'var(--radius-lg)', padding: '8px 16px' }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
