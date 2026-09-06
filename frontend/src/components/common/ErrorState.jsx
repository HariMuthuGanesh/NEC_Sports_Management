import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";
import "./EmptyState.css"; // Reuse the layout styles from EmptyState

export default function ErrorState({
  title = "Unable to load data",
  message = "There was a problem connecting to the server. Please check your connection and try again.",
  onRetry
}) {
  return (
    <div className="nec-empty-state" style={{ borderColor: "var(--nec-danger-light)" }}>
      <div className="nec-empty-icon-wrapper" style={{ backgroundColor: "var(--nec-danger-light)", color: "var(--nec-danger)" }}>
        <AlertTriangle size={36} />
      </div>
      <h4 className="nec-empty-title">{title}</h4>
      <p className="nec-empty-message">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={RefreshCw}>
          Retry
        </Button>
      )}
    </div>
  );
}
