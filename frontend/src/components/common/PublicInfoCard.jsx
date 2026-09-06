import React from "react";
import Button from "./Button";
import "./PublicInfoCard.css";

export default function PublicInfoCard({ 
  icon: Icon, 
  title, 
  message, 
  actionText, 
  onAction,
  variant = "default" 
}) {
  return (
    <div className={`nec-public-info-card variant-${variant}`}>
      {Icon && (
        <div className="nec-pic-icon-wrapper">
          <Icon size={32} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="nec-pic-title">{title}</h3>
      <p className="nec-pic-message">{message}</p>
      
      {actionText && onAction && (
        <div className="nec-pic-action">
          <Button variant="secondary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
