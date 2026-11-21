import React from "react";
import "./Badge.css";

export default function Badge({
  children,
  status = "neutral", // success | warning | danger | info | live | neutral
  iconSymbol,
  className = ""
}) {
  // Only render a symbol if explicitly provided
  const symbol = iconSymbol || null;

  return (
    <span className={`nec-badge nec-badge-${status} ${className}`}>
      {symbol && <span className="nec-badge-symbol" aria-hidden="true">{symbol}</span>}
      <span className="nec-badge-text">{children}</span>
    </span>
  );
}
