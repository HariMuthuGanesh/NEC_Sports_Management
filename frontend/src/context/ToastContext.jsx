import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/common/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newToast = { id, message, type, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toast = useCallback((msgOrOpts, type = 'info', duration = 4000) => {
    if (typeof msgOrOpts === 'object' && msgOrOpts !== null) {
      return showToast(msgOrOpts.message, msgOrOpts.type || 'info', msgOrOpts.duration || duration);
    }
    return showToast(msgOrOpts, type, duration);
  }, [showToast]);

  toast.success = (msg, duration) => showToast(msg, 'success', duration);
  toast.error = (msg, duration) => showToast(msg, 'error', duration);
  toast.info = (msg, duration) => showToast(msg, 'info', duration);
  toast.warning = (msg, duration) => showToast(msg, 'warning', duration);
  toast.dismiss = removeToast;
  toast.showToast = showToast;
  toast.removeToast = removeToast;
  toast.toast = toast;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Graceful fallback if invoked outside provider
    const fallback = (msg) => console.log('[Toast]', msg);
    fallback.showToast = (msg) => console.log('[Toast]', msg);
    fallback.removeToast = () => {};
    fallback.dismiss = () => {};
    fallback.success = (msg) => console.log('[Toast Success]', msg);
    fallback.error = (msg) => console.error('[Toast Error]', msg);
    fallback.info = (msg) => console.log('[Toast Info]', msg);
    fallback.warning = (msg) => console.warn('[Toast Warning]', msg);
    fallback.toast = fallback;
    return fallback;
  }
  return context;
};
