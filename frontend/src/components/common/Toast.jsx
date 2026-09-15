import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="nec-toast-icon success" />;
      case 'error':
        return <AlertCircle size={18} className="nec-toast-icon error" />;
      case 'warning':
        return <AlertTriangle size={18} className="nec-toast-icon warning" />;
      default:
        return <Info size={18} className="nec-toast-icon info" />;
    }
  };

  return (
    <div className="nec-toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`nec-toast-item nec-toast-${toast.type}`} role="alert">
          <div className="nec-toast-icon-wrap">{renderIcon(toast.type)}</div>
          <div className="nec-toast-msg">{toast.message}</div>
          <button
            type="button"
            className="nec-toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
