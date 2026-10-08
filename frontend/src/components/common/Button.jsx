import React from "react";
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
  const isIconOnly = !children && Boolean(Icon);
  const iconSize = size === "xs" ? 13 : size === "sm" ? 15 : size === "lg" ? 20 : 16;

  return (
    <button
      type={type}
      className={`nec-btn nec-btn-${variant} nec-btn-${size} ${isIconOnly ? "nec-btn-icon-only" : ""} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      {...props}
    >
      {loading ? (
        <span className="nec-btn-spinner" aria-label="Loading..." />
      ) : Icon ? (
        <Icon className="nec-btn-icon" size={iconSize} />
      ) : null}
      {children ? <span className="nec-btn-label">{children}</span> : null}
    </button>
  );
}
