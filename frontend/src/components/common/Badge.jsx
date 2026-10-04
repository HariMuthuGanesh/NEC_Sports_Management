import React from "react";
import "./Badge.css";

export default function Badge({
  children,
  status = "neutral", // success | warning | danger | info | live | neutral
  iconSymbol,
  className = ""
}) {
  // Only render a symbol if explicitly provided or for live indicators
  const symbol = iconSymbol || (status === "live" ? "🔴" : null);

  return (
    <span className={`nec-badge nec-badge-${status} ${className}`}>
      {symbol && <span className="nec-badge-symbol" aria-hidden="true">{symbol}</span>}
      <span className="nec-badge-text">{children}</span>
    </span>
  );
}
