import React, { useEffect } from "react";
import { X } from "lucide-react";
import Button from "./Button";
import "./Modal.css";

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = "md", 
  maxWidth, 
  className = "",
  resizable = true 
}) {
  const modalRef = React.useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: null, height: null });
  const [isResizing, setIsResizing] = React.useState(false);

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

  useEffect(() => {
    if (!isOpen) {
      setDimensions({ width: null, height: null });
      setIsResizing(false);
    }
  }, [isOpen]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    setIsResizing(true);
    document.body.classList.add("nec-modal-resizing");

    const onPointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const maxW = Math.min(window.innerWidth * 0.96, 1400);
      const minW = Math.min(360, window.innerWidth * 0.9);
      const maxH = Math.min(window.innerHeight * 0.94, 1000);
      const minH = 220;

      // In centered flex layout, doubling the delta keeps the handle right under the mouse pointer
      const nextWidth = Math.min(Math.max(startWidth + deltaX * 2, minW), maxW);
      const nextHeight = Math.min(Math.max(startHeight + deltaY * 2, minH), maxH);

      setDimensions({
        width: Math.round(nextWidth),
        height: Math.round(nextHeight)
      });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      document.body.classList.remove("nec-modal-resizing");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  if (!isOpen) return null;

  const sizeClass = size ? `nec-modal-${size}` : "";
  const customStyle = maxWidth ? { maxWidth } : {};
  const dynamicStyle = {
    ...customStyle,
    ...(dimensions.width ? { width: `${dimensions.width}px`, maxWidth: "96vw" } : {}),
    ...(dimensions.height ? { height: `${dimensions.height}px`, maxHeight: "94vh" } : {})
  };

  return (
    <div className="nec-modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className={`nec-modal-content ${sizeClass} ${isResizing ? "is-resizing" : ""} ${className}`.trim()}
        style={dynamicStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="nec-modal-header">
          <h3 className="nec-modal-title">{title}</h3>
          <button className="nec-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>
        <div className="nec-modal-body">{children}</div>
        {footer && <div className="nec-modal-footer">{footer}</div>}
        {resizable && (
          <div
            className="nec-modal-resize-handle"
            onPointerDown={handleResizeStart}
            onDoubleClick={() => setDimensions({ width: null, height: null })}
            title="Drag to resize modal (Double click to reset)"
            aria-label="Resize modal"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor">
              <path d="M12 2L2 12" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 6L6 12" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M12 10L10 12" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
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
