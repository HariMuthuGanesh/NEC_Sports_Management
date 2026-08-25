import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import {
  Sun, Moon, Globe, User, ShieldCheck, Database, Info,
  LogOut, Trash2, RefreshCw, CheckCircle2, Clock, Languages
} from "lucide-react";
import { getTokenExpiry, getAuthToken, SecurityLogger, invalidateTranslationCache } from "../../utils/security";
import { hasTranslationCache, getTranslationCacheInfo } from "../../utils/liveTranslator";
import "./SettingsPage.css";

const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "ta", label: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "hi", label: "Hindi", native: "हिंदी", flag: "🇮🇳" },
];

const ROLE_BADGE = {
  "Director of Physical Education": "danger",
  "Department Sports Coordinator": "info",
  "Student Athlete": "success",
  "Public Guest Portal": "neutral",
};

export default function SettingsPage() {
  const { currentUser, theme, toggleTheme, language, setLanguage, logout, ROLES, sessionExpiresAt, t } = useAuth();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const tokenExpiry = sessionExpiresAt || getTokenExpiry(getAuthToken());
  const isLoggedIn = currentUser?.role !== ROLES.PUBLIC;

  const handleResetData = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    // Remove all nec_sports_ keys
    Object.keys(localStorage).filter(k => k.startsWith("nec_")).forEach(k => localStorage.removeItem(k));
    setResetConfirm(false);
    window.location.reload();
  };

  const handleClearTransCache = (lang) => {
    invalidateTranslationCache(lang);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2000);
  };

  return (
    <div className="nec-settings-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Settings</h2>
        <p className="nec-page-desc">Manage your account, appearance, language preferences, and system data.</p>
      </div>

      <div className="nec-settings-grid">

        {/* ── Account Info ── */}
        <Card title="Account" icon={<User size={16} />}>
          <div className="nec-settings-account">
            <div className="nec-settings-avatar">
              {(currentUser?.name || "G").charAt(0).toUpperCase()}
            </div>
            <div className="nec-settings-account-info">
              <div className="nec-settings-name">{currentUser?.name || "Guest Visitor"}</div>
              <div className="nec-settings-id">{currentUser?.id ? `ID: ${currentUser.id}` : "Not logged in"}</div>
              <div style={{ marginTop: "6px" }}>
                <Badge status={ROLE_BADGE[currentUser?.role] || "neutral"}>
                  {currentUser?.role?.split(" ")[0] || "Public"}
                </Badge>
                {currentUser?.dept && currentUser.dept !== "All" && (
                  <span style={{ marginLeft: "6px", fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                    · {currentUser.dept}
                  </span>
                )}
              </div>
            </div>
          </div>
          {isLoggedIn && (
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--nec-border-light)" }}>
              <Button variant="danger" size="sm" icon={LogOut} onClick={logout}>
                Sign Out
              </Button>
            </div>
          )}
        </Card>

        {/* ── Appearance ── */}
        <Card title="Appearance" icon={theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}>
          <p style={{ fontSize: "0.87rem", color: "var(--nec-text-muted)", marginBottom: "16px" }}>
            Choose between light and dark mode for the portal interface.
          </p>
          <div className="nec-settings-theme-toggle">
            {["light", "dark"].map(mode => (
              <button
                key={mode}
                className={`nec-settings-theme-btn ${theme === mode ? "active" : ""}`}
                onClick={() => { if (theme !== mode) toggleTheme(); }}
              >
                {mode === "light" ? <Sun size={16} /> : <Moon size={16} />}
                {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
              </button>
            ))}
          </div>
          <div className="nec-settings-theme-preview" data-theme-preview={theme}>
            <div className="nec-settings-theme-preview-bar" />
            <div className="nec-settings-theme-preview-content">
              <div className="nec-settings-theme-preview-block" />
              <div className="nec-settings-theme-preview-block short" />
            </div>
          </div>
        </Card>

        {/* ── Language ── */}
        <Card title="Language" icon={<Globe size={16} />}>
          <p style={{ fontSize: "0.87rem", color: "var(--nec-text-muted)", marginBottom: "16px" }}>
            Select your preferred language. Non-English languages are fetched live and cached for 7 days.
          </p>
          <div className="nec-settings-lang-grid">
            {LANGUAGES.map(lang => {
              const cacheInfo = getTranslationCacheInfo(lang.code);
              const isActive = language === lang.code;
              return (
                <button
                  key={lang.code}
                  className={`nec-settings-lang-btn ${isActive ? "active" : ""}`}
                  onClick={() => setLanguage(lang.code)}
                >
                  <span className="nec-settings-lang-flag">{lang.flag}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{lang.label}</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{lang.native}</div>
                  </div>
                  {isActive && <CheckCircle2 size={15} style={{ marginLeft: "auto", color: "var(--nec-navy)" }} />}
                  {lang.code !== "en" && cacheInfo?.cached && (
                    <span style={{ marginLeft: isActive ? "4px" : "auto", fontSize: "0.7rem", background: "#dcfce7", color: "#16a34a", padding: "1px 6px", borderRadius: "8px" }}>
                      Cached
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Translation cache management */}
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--nec-border-light)" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", marginBottom: "8px", fontWeight: 600 }}>
              Translation Cache
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["ta", "hi"].map(code => {
                const info = getTranslationCacheInfo(code);
                const label = code === "ta" ? "Tamil" : "Hindi";
                return (
                  <Button
                    key={code}
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    onClick={() => handleClearTransCache(code)}
                  >
                    {cacheCleared ? "Cleared!" : `Refresh ${label}`}
                    {info?.cached && <span style={{ marginLeft: "4px", fontSize: "0.7rem", opacity: 0.6 }}>({info.ageHours}h old)</span>}
                  </Button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ── Session ── */}
        <Card title="Session Info" icon={<ShieldCheck size={16} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="nec-settings-info-row">
              <span className="nec-settings-info-label">Status</span>
              <Badge status={isLoggedIn ? "success" : "neutral"}>{isLoggedIn ? "Authenticated" : "Guest"}</Badge>
            </div>
            {tokenExpiry && (
              <div className="nec-settings-info-row">
                <span className="nec-settings-info-label">Session Expires</span>
                <span style={{ fontSize: "0.85rem", color: "var(--nec-text-main)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={13} />
                  {tokenExpiry.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  &nbsp;·&nbsp;
                  {tokenExpiry.toLocaleDateString("en-IN")}
                </span>
              </div>
            )}
            <div className="nec-settings-info-row">
              <span className="nec-settings-info-label">Role</span>
              <span style={{ fontSize: "0.85rem" }}>{currentUser?.role || "—"}</span>
            </div>
            <div className="nec-settings-info-row">
              <span className="nec-settings-info-label">Department</span>
              <span style={{ fontSize: "0.85rem" }}>{currentUser?.dept || "—"}</span>
            </div>
            <div className="nec-settings-info-row">
              <span className="nec-settings-info-label">Security Events</span>
              <span style={{ fontSize: "0.85rem" }}>{SecurityLogger.getLog().length} logged</span>
            </div>
          </div>
        </Card>

        {/* ── Data Management ── */}
        <Card title="Data Management" icon={<Database size={16} />}>
          <p style={{ fontSize: "0.87rem", color: "var(--nec-text-muted)", marginBottom: "16px" }}>
            All application data is stored locally in your browser. You can reset it to factory defaults at any time.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ padding: "12px", background: "var(--nec-bg-alt)", borderRadius: "8px", fontSize: "0.82rem", color: "var(--nec-text-muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Sports Catalog, Teams, Matches, Announcements, Audit Log</span>
              <span style={{ fontWeight: 700, color: "var(--nec-text-main)" }}>
                {Math.round(new Blob([JSON.stringify(localStorage)]).size / 1024)}kb
              </span>
            </div>
            <Button
              variant={resetConfirm ? "danger" : "ghost"}
              icon={Trash2}
              onClick={handleResetData}
            >
              {resetConfirm ? "⚠️ Click again to confirm reset" : "Reset All Data to Defaults"}
            </Button>
            {resetConfirm && (
              <p style={{ fontSize: "0.78rem", color: "#dc2626" }}>
                This will delete all local changes and reload the page. This cannot be undone.
              </p>
            )}
          </div>
        </Card>

        {/* ── About ── */}
        <Card title="About" icon={<Info size={16} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "System", value: "NEC Sports Management System" },
              { label: "Academy", value: "NEC Sports Academy" },
              { label: "College", value: "National Engineering College, Kovilpatti" },
              { label: "Version", value: "v1.2 — 18 Aug 2026" },
              { label: "Build", value: "React 18 + Vite · Vanilla CSS" },
              { label: "Security", value: "7-Layer Frontend Security" },
            ].map(({ label, value }) => (
              <div key={label} className="nec-settings-info-row">
                <span className="nec-settings-info-label">{label}</span>
                <span style={{ fontSize: "0.85rem", color: "var(--nec-text-main)" }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
}
