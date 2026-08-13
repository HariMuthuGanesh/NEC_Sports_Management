import React from "react";
import "./Badge.css";

export default function Badge({
  children,
  status = "neutral", // success | warning | danger | info | live | neutral
  iconSymbol,
  className = ""
}) {
  // Accessible icon fallback per version1.md requirement #33
  const getSymbol = () => {
    if (iconSymbol) return iconSymbol;
    switch (status) {
      case "success": return "✓";
      case "warning": return "●";
      case "danger": return "×";
      case "live": return "🔴";
      case "info": return "ℹ";
      default: return "";
    }
  };

  return (
    <span className={`nec-badge nec-badge-${status} ${className}`}>
      <span className="nec-badge-symbol" aria-hidden="true">{getSymbol()}</span>
      <span className="nec-badge-text">{children}</span>
    </span>
  );
}
