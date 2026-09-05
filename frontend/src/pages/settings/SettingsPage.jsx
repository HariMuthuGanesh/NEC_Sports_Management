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
