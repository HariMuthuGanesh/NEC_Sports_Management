import React from "react";
import { Trash2, Pencil, Plus, Save, X, RefreshCw, Download, Printer, Eye, Check } from "lucide-react";
import "./Button.css";

export default function Button({
  children,
  variant = "primary", // primary | secondary | outline | outline-danger | danger | ghost | success | link
  size = "md", // xs | sm | md | lg
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  title,
  ariaLabel,
  ...props
}) {
  const label = typeof children === "string" ? children.trim() : "";
  const action = /^(delete|remove|edit|add|create|save|cancel|close|refresh|export|download|print|view|approve)\b/i.exec(label || title || ariaLabel || "")?.[1]?.toLowerCase();
  const actionIcons = { delete: Trash2, remove: Trash2, edit: Pencil, add: Plus, create: Plus, save: Save, cancel: X, close: X, refresh: RefreshCw, export: Download, download: Download, print: Printer, view: Eye, approve: Check };
  const ActionIcon = Icon || actionIcons[action];
  const actionLabel = action ? action[0].toUpperCase() + action.slice(1) : null;
  const isIconOnly = Boolean(action || (!children && ActionIcon));
  const iconSize = size === "xs" ? 13 : size === "sm" ? 15 : size === "lg" ? 20 : 16;

  return (
    <button
      type={type}
      className={`nec-btn nec-btn-${variant} nec-btn-${size} ${isIconOnly ? "nec-btn-icon-only" : ""} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      title={actionLabel || title || label}
      aria-label={ariaLabel || title || label || actionLabel}
      {...props}
    >
      {loading ? (
        <span className="nec-btn-spinner" aria-label="Loading..." />
      ) : ActionIcon ? (
        <ActionIcon className="nec-btn-icon" size={iconSize} aria-hidden="true" />
      ) : null}
      {children && !isIconOnly ? <span className="nec-btn-label">{children}</span> : null}
    </button>
  );
}
