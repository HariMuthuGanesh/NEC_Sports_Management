import React, { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";
import "./Modal.css";

export function Modal({ isOpen, onClose, title, children, footer }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="nec-modal-backdrop" onClick={onClose}>
      <div className="nec-modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="nec-modal-header">
          <h3 className="nec-modal-title">{title}</h3>
          <button className="nec-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="nec-modal-body">{children}</div>
        {footer && <div className="nec-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  loading = false
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="nec-confirm-message">{message}</p>
    </Modal>
  );
}
