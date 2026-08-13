import React from "react";
import "./Card.css";

export function Card({ children, className = "", title, subtitle, headerAction, footer }) {
  return (
    <div className={`nec-card ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="nec-card-header">
          <div>
            {title && <h3 className="nec-card-title">{title}</h3>}
            {subtitle && <p className="nec-card-subtitle">{subtitle}</p>}
          </div>
          {headerAction && <div className="nec-card-action">{headerAction}</div>}
        </div>
      )}
      <div className="nec-card-body">{children}</div>
      {footer && <div className="nec-card-footer">{footer}</div>}
    </div>
  );
}

export function StatCard({ title, value, subtext, icon: Icon, trend, color = "navy", onClick }) {
  return (
    <div className={`nec-stat-card nec-stat-card-${color}`} onClick={onClick}>
      <div className="nec-stat-card-top">
        <span className="nec-stat-title">{title}</span>
        {Icon && <div className="nec-stat-icon-wrapper"><Icon size={20} /></div>}
      </div>
      <div className="nec-stat-value">{value}</div>
      {subtext && (
        <div className="nec-stat-subtext">
          {trend && <span className={`nec-stat-trend ${trend.startsWith('+') ? 'up' : 'down'}`}>{trend}</span>}
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
}
