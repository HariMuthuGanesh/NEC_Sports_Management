import React from "react";
import { FolderOpen } from "lucide-react";
import Button from "./Button";
import "./EmptyState.css";

export default function EmptyState({
  title = "No Data Found",
  message = "There are currently no items to display.",
  actionLabel,
  onAction,
  icon: Icon = FolderOpen
}) {
  return (
    <div className="nec-empty-state">
      <div className="nec-empty-icon-wrapper">
        <Icon size={36} />
      </div>
      <h4 className="nec-empty-title">{title}</h4>
      <p className="nec-empty-message">{message}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
