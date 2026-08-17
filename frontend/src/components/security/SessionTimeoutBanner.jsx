import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Clock, LogOut, RefreshCw } from "lucide-react";

/**
 * SessionTimeoutBanner — floats at the bottom of the screen
 * when the user has been idle and auto-logout is imminent.
 * Controlled by AuthContext.idleWarning + secondsUntilIdle.
 */
export default function SessionTimeoutBanner() {
  const { idleWarning, secondsUntilIdle, stayLoggedIn, logout, currentUser, ROLES } = useAuth();

  if (!idleWarning || currentUser?.role === ROLES.PUBLIC) return null;

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Session timeout warning"
      style={{
        position: "fixed",
        bottom: "24px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        width: "min(520px, calc(100vw - 32px))",
        background: "var(--nec-navy, #0f1f3d)",
        color: "#fff",
        borderRadius: "14px",
        padding: "18px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        animation: "nec-slide-up 0.35s cubic-bezier(.22,.68,0,1.2) both",
      }}
    >
      {/* Icon */}
      <div style={{
        width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0,
        background: "rgba(250,204,21,0.18)", display: "flex",
        alignItems: "center", justifyContent: "center",
        border: "1.5px solid rgba(250,204,21,0.45)",
      }}>
        <Clock size={20} color="#facc15" />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "2px" }}>
          Session Expiring Soon
        </div>
        <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
          You'll be automatically signed out in{" "}
          <span
            style={{
              color: "#facc15",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 700,
              fontSize: "0.95rem",
            }}
          >
            {formatTime(secondsUntilIdle)}
          </span>{" "}
          due to inactivity.
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={stayLoggedIn}
          style={{
            background: "#facc15", color: "#0f1f3d", border: "none",
            borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
            fontWeight: 700, fontSize: "0.82rem", display: "flex",
            alignItems: "center", gap: "5px", whiteSpace: "nowrap",
          }}
          aria-label="Stay logged in"
        >
          <RefreshCw size={13} /> Stay Logged In
        </button>
        <button
          onClick={logout}
          style={{
            background: "rgba(255,255,255,0.10)", color: "#cbd5e1",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "8px", padding: "8px 12px", cursor: "pointer",
            fontWeight: 600, fontSize: "0.82rem", display: "flex",
            alignItems: "center", gap: "5px",
          }}
          aria-label="Log out now"
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>

      <style>{`
        @keyframes nec-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(24px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
