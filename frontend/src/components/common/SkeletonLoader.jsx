import React from "react";
import "./SkeletonLoader.css";

export default function SkeletonLoader({ rows = 3, type = "table" }) {
  if (type === "cards") {
    return (
      <div className="nec-skeleton-grid">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="nec-skeleton-card nec-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="nec-skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="nec-skeleton-row nec-pulse" />
      ))}
    </div>
  );
}
