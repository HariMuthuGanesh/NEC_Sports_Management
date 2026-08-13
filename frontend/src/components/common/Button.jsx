import React from "react";
import "./Button.css";

export default function Button({
  children,
  variant = "primary", // primary | secondary | outline | danger | ghost
  size = "md", // sm | md | lg
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  ...props
}) {
  return (
    <button
      type={type}
      className={`nec-btn nec-btn-${variant} nec-btn-${size} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className="nec-btn-spinner" aria-label="Loading..." />
      ) : Icon ? (
        <Icon className="nec-btn-icon" size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />
      ) : null}
      <span className="nec-btn-label">{children}</span>
    </button>
  );
}
