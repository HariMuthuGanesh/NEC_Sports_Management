import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Languages, CheckCircle2 } from "lucide-react";

/**
 * Thin progress bar + status badge shown while live translations
 * are being fetched from the API. Appears at the top of the page.
 */
export default function TranslationLoadingBar() {
  const { transProgress, transDone, transLangLabel } = useAuth();
  const progress = transProgress;
  const langLabel = transLangLabel;
  const done = transDone;

  if (progress === null || progress === undefined) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Translating page content"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: "var(--nec-navy, #0f1f3d)",
        color: "#fff",
        padding: "0",
        pointerEvents: "none",
      }}
    >
      {/* Progress Bar */}
      <div
        style={{
          height: "3px",
          background: "rgba(255,255,255,0.15)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #facc15, #fbbf24)",
            transition: "width 0.3s ease",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      {/* Status chip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "6px 16px",
          fontSize: "0.78rem",
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {done ? (
          <>
            <CheckCircle2 size={13} color="#4ade80" />
            <span style={{ color: "#4ade80" }}>
              {langLabel} translation ready
            </span>
          </>
        ) : (
          <>
            <Languages
              size={13}
              color="#facc15"
              style={{ animation: "nec-spin 1.5s linear infinite" }}
            />
            <span style={{ color: "#cbd5e1" }}>
              Translating to {langLabel}…{" "}
              <span style={{ color: "#facc15", fontVariantNumeric: "tabular-nums" }}>
                {progress}%
              </span>
            </span>
          </>
        )}
      </div>

      <style>{`
        @keyframes nec-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
