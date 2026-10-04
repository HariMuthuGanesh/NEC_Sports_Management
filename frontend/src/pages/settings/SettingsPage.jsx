import React, { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import ForgotPasswordModal from "../../components/common/ForgotPasswordModal";
import {
  Sun, Moon, Globe, User, ShieldCheck, Info, Lock,
  LogOut, RefreshCw, CheckCircle2, Clock, Languages,
  Eye, EyeOff, ShieldAlert, UserCog, Search, KeyRound, Copy, Check, Mail,
  Palette, Zap, HelpCircle, Bug, Bell, LifeBuoy
} from "lucide-react";
import { getTokenExpiry, getAuthToken, SecurityLogger, invalidateTranslationCache } from "../../utils/security";
import { hasTranslationCache, getTranslationCacheInfo } from "../../utils/liveTranslator";
import { authApi, ApiError } from "../../services/api/apiServices";
import "./SettingsPage.css";

/* ── Constants ─────────────────────────────────────────────── */
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

/* ── Password strength helper ───────────────────────────────── */
function measureStrength(pw) {
  let score = 0;
  if (!pw) return { score: 0, label: "", color: "" };
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  switch (score) {
    case 1: return { score: 1, label: "Weak",   color: "#ef4444" };
    case 2: return { score: 2, label: "Fair",   color: "#f59e0b" };
    case 3: return { score: 3, label: "Good",   color: "#3b82f6" };
    case 4: return { score: 4, label: "Strong", color: "#22c55e" };
    default: return { score: 0, label: "Weak",  color: "#ef4444" };
  }
}

/* ── ChangePasswordCard ─────────────────────────────────────── */
function ChangePasswordCard({ currentUser }) {
  const [form, setForm]       = useState({ current: "", next: "", confirm: "" });
  const [show, setShow]       = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const strength = measureStrength(form.next);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const toggleShow = (field) => () =>
    setShow((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.current || !form.next || !form.confirm) {
      setError("All password fields are required.");
      return;
    }
    if (form.next.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (form.next !== form.confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (form.current === form.next) {
      setError("New password cannot be the same as your current password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await authApi.changePassword(form.current, form.next);
      setSuccess(true);
      setForm({ current: "", next: "", confirm: "" });
      SecurityLogger.info("Password updated successfully from settings");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card title="Change Password" icon={<Lock size={16} />}>
        <form onSubmit={handleSubmit} className="nec-pw-form" noValidate>
          {/* Current Password */}
          <div className="nec-pw-field">
            <label className="nec-pw-label">Current Password</label>
            <div className="nec-pw-input-wrap">
              <input
                type={show.current ? "text" : "password"}
                className="nec-pw-input"
                value={form.current}
                onChange={update("current")}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={loading}
              />
              <button type="button" className="nec-pw-eye" onClick={toggleShow("current")} tabIndex={-1}>
                {show.current ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="nec-pw-field">
            <label className="nec-pw-label">New Password</label>
            <div className="nec-pw-input-wrap">
              <input
                type={show.next ? "text" : "password"}
                className="nec-pw-input"
                value={form.next}
                onChange={update("next")}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" className="nec-pw-eye" onClick={toggleShow("next")} tabIndex={-1}>
                {show.next ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.next && (
              <div className="nec-pw-strength">
                <div className="nec-pw-strength-track">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="nec-pw-strength-seg"
                      style={{ background: i <= strength.score ? strength.color : "var(--nec-border-light)" }}
                    />
                  ))}
                </div>
                <span className="nec-pw-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="nec-pw-field">
            <label className="nec-pw-label">Confirm New Password</label>
            <div className="nec-pw-input-wrap">
              <input
                type={show.confirm ? "text" : "password"}
                className={`nec-pw-input${form.confirm && form.next !== form.confirm ? " nec-pw-input--mismatch" : ""}`}
                value={form.confirm}
                onChange={update("confirm")}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                disabled={loading}
              />
              <button type="button" className="nec-pw-eye" onClick={toggleShow("confirm")} tabIndex={-1}>
                {show.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="nec-pw-feedback nec-pw-feedback--error">
              <ShieldAlert size={13} /> {error}
            </div>
          )}
          {success && (
            <div className="nec-pw-feedback nec-pw-feedback--success">
              <CheckCircle2 size={13} /> Password changed successfully.
            </div>
          )}

          {/* Actions */}
          <div className="nec-pw-actions">
            <button
              type="button"
              className="nec-pw-forgot-link"
              onClick={() => setForgotOpen(true)}
            >
              Forgot your password?
            </button>
            <Button type="submit" variant="primary" size="sm" loading={loading}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      <ForgotPasswordModal isOpen={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  );
}

/* ── AdminResetCard ─────────────────────────────────────────── */
function AdminResetCard({ currentUser }) {
  const isCoordinator = currentUser?.role === "Coordinator";
  const [modalOpen, setModalOpen]     = useState(false);
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState([]);
  const [searching, setSearching]     = useState(false);
  const [selected, setSelected]       = useState(null);
  const [genPassword, setGenPassword] = useState("");
  const [useCustomPw, setUseCustomPw] = useState(false);
  const [customPw, setCustomPw]       = useState("");
  const [resetting, setResetting]     = useState(false);
  const [resetResult, setResetResult] = useState(null); // { tempPassword, targetUsername, targetEmail, emailSent }
  const [resetError, setResetError]   = useState(null);
  const [copied, setCopied]           = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    setResetResult(null);
    setResetError(null);
    try {
      const data = await authApi.searchUsers(query.trim());
      setResults(Array.isArray(data) ? data : (data?.users || []));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query]);

  const handleReset = async () => {
    if (!selected) return;
    setResetting(true);
    setResetError(null);
    setResetResult(null);
    const pw = useCustomPw ? customPw.trim() : null;
    if (useCustomPw && (!pw || pw.length < 8)) {
      setResetError("Custom password must be at least 8 characters.");
      setResetting(false);
      return;
    }
    try {
      const data = await authApi.adminResetPassword(selected.id, pw);
      setResetResult(data);
    } catch (err) {
      setResetError(err instanceof ApiError ? err.message : "Reset failed. Try again.");
    } finally {
      setResetting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(resetResult?.tempPassword || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setModalOpen(false);
    setQuery(""); setResults([]); setSelected(null);
    setCustomPw(""); setUseCustomPw(false);
    setResetResult(null); setResetError(null); setCopied(false);
  };

  const cardTitle = isCoordinator ? "Department Coordinator: Reset Student Password" : "Admin: Reset User Password";
  const modalTitle = isCoordinator ? "Reset Student Password" : "Reset User Password";
  const btnLabel = isCoordinator ? "Reset a Student's Password" : "Reset a User's Password";

  return (
    <>
      <Card title={cardTitle} icon={<UserCog size={16} />}>
        <p style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)", marginBottom: "16px", lineHeight: 1.5 }}>
          {isCoordinator ? (
            <span style={{ color: "var(--nec-warning, #f59e0b)", fontWeight: 600 }}>
              As a Coordinator, you can only reset passwords for students in your own department.
            </span>
          ) : (
            "Set a temporary password for any user in the system. They will be forced to change it on next login."
          )}
        </p>
        <Button variant="outline" size="sm" icon={KeyRound} onClick={() => setModalOpen(true)}>
          {btnLabel}
        </Button>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={handleClose}
        title={modalTitle}
        size="md"
      >
        {resetResult ? (
          /* ── Step 3: Success ── */
          <div className="nec-ar-result">
            <div className="nec-ar-result-icon"><CheckCircle2 size={36} /></div>
            <h4 className="nec-ar-result-title">Reset Email Sent</h4>
            <p className="nec-ar-result-sub">
              A temporary password and login instructions have been emailed directly to{" "}
              <strong>{resetResult.targetEmail || selected?.email || resetResult.targetUsername}</strong>.
            </p>
            <div className="nec-ar-email-badge">
              <Mail size={15} />
              <span>Sent to {resetResult.targetEmail || selected?.email}</span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", margin: "4px 0 8px 0" }}>
              The student will be prompted to create a new password immediately upon login.
            </p>

            {resetResult.tempPassword && (
              <details className="nec-ar-fallback-details">
                <summary>View manual temporary password backup</summary>
                <div className="nec-ar-temp-pw-box" style={{ marginTop: "10px" }}>
                  <span className="nec-ar-temp-pw">{resetResult.tempPassword}</span>
                  <button className="nec-ar-copy-btn" onClick={handleCopy} title="Copy to clipboard">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </details>
            )}

            <Button variant="primary" size="sm" onClick={handleClose} className="nec-ar-done-btn" style={{ marginTop: "12px" }}>
              Done
            </Button>
          </div>
        ) : (
          /* ── Step 1–2: Search + Reset ── */
          <div className="nec-ar-form">
            {/* Search */}
            <div className="nec-ar-search-row">
              <input
                className="nec-ar-search-input"
                placeholder="Search by username, email, or roll number…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button variant="outline" size="sm" icon={Search} onClick={handleSearch} loading={searching}>
                Search
              </Button>
            </div>

            {/* Search results */}
            {results.length > 0 && !selected && (
              <div className="nec-ar-results">
                {results.map((u) => (
                  <button key={u.id} className="nec-ar-result-row" onClick={() => setSelected(u)}>
                    <div className="nec-ar-result-avatar">{(u.username || u.name || "U")[0].toUpperCase()}</div>
                    <div>
                      <div className="nec-ar-result-name">{u.username || u.name}</div>
                      <div className="nec-ar-result-meta">{u.email} · {u.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.length === 0 && query && !searching && (
              <p className="nec-ar-no-results">No users found. Try a different query.</p>
            )}

            {/* Selected user + reset form */}
            {selected && (
              <div className="nec-ar-selected">
                <div className="nec-ar-selected-banner">
                  <div className="nec-ar-result-avatar">{(selected.username || selected.name || "U")[0].toUpperCase()}</div>
                  <div>
                    <div className="nec-ar-result-name">{selected.username || selected.name}</div>
                    <div className="nec-ar-result-meta">{selected.email} · {selected.role}</div>
                  </div>
                  <button className="nec-ar-deselect" onClick={() => setSelected(null)}>✕</button>
                </div>

                {/* Password option */}
                <div className="nec-ar-pw-option">
                  <label className="nec-ar-pw-opt-label">
                    <input
                      type="checkbox"
                      checked={useCustomPw}
                      onChange={(e) => setUseCustomPw(e.target.checked)}
                    />
                    Set a specific temporary password
                  </label>
                  {useCustomPw && (
                    <input
                      type="text"
                      className="nec-ar-search-input"
                      placeholder="Min. 8 characters"
                      value={customPw}
                      onChange={(e) => setCustomPw(e.target.value)}
                      style={{ marginTop: "8px" }}
                    />
                  )}
                </div>

                {resetError && (
                  <div className="nec-ar-error"><ShieldAlert size={13} /> {resetError}</div>
                )}

                <div className="nec-ar-actions">
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back</Button>
                  <Button variant="danger" size="sm" loading={resetting} onClick={handleReset}>
                    Reset Password
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ── Main SettingsPage ──────────────────────────────────────── */
export default function SettingsPage({ onNavigate }) {
  const {
    currentUser, theme, toggleTheme, language, setLanguage,
    logout, ROLES, sessionExpiresAt, t
  } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await logout();
      if (toast?.success) {
        toast.success("Signed out successfully.");
      } else if (typeof toast === "function") {
        toast({ type: "success", message: "Signed out successfully." });
      }
    } finally {
      if (onNavigate) {
        onNavigate("public_home");
      } else {
        window.location.href = "/";
      }
    }
  };

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [bugReport, setBugReport] = useState("");
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem("nec_notif_pref") !== "disabled");

  const tokenExpiry = sessionExpiresAt || getTokenExpiry(getAuthToken());
  const isLoggedIn  = currentUser?.role !== ROLES.PUBLIC;

  const canAdminReset = isLoggedIn && [
    ROLES.ADMIN, ROLES.PRESIDENT, ROLES.COORDINATOR
  ].includes(currentUser?.role);

  const handleToggleNotif = () => {
    const nextVal = !notifEnabled;
    setNotifEnabled(nextVal);
    localStorage.setItem("nec_notif_pref", nextVal ? "enabled" : "disabled");
    window.dispatchEvent(new CustomEvent("notifications-updated"));
    if (nextVal) {
      toast?.success("In-app notifications enabled.");
    } else {
      toast?.info("In-app notifications disabled.");
    }
  };

  const handleBugSubmit = (e) => {
    e.preventDefault();
    if (!bugReport.trim()) return;
    SecurityLogger.info(`Bug reported by ${currentUser?.username}: ${bugReport}`);
    setBugSubmitted(true);
    setTimeout(() => {
      setBugSubmitted(false);
      setBugReport("");
      setBugModalOpen(false);
    }, 1500);
  };

  return (
    <div className="nec-settings-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Settings</h2>
        <p className="nec-page-desc">Account configurations, security controls, preferences, and system resources.</p>
      </div>

      <div className="nec-settings-sections">
        {/* ── 1. Account Section ── */}
        <section>
          <div className="nec-settings-section-header">
            <User size={18} style={{ color: "var(--nec-navy)" }} />
            <h3 className="nec-settings-section-title">Account</h3>
          </div>
          <Card>
            <div className="nec-settings-account">
              <div className="nec-settings-avatar">
                {(currentUser?.name || currentUser?.username || "G").charAt(0).toUpperCase()}
              </div>
              <div className="nec-settings-account-info">
                <div className="nec-settings-name">{currentUser?.name || currentUser?.username || "Guest Visitor"}</div>
                <div className="nec-settings-id">{currentUser?.email || (currentUser?.id ? `User ID: ${currentUser.id}` : "Guest Access")}</div>
                <div style={{ marginTop: "6px", display: "flex", gap: "8px", alignItems: "center" }}>
                  <Badge status={ROLE_BADGE[currentUser?.role] || "neutral"}>
                    {currentUser?.role || "Public Visitor"}
                  </Badge>
                  {currentUser?.dept && currentUser.dept !== "All" && (
                    <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>
                      Dept: {currentUser.dept}
                    </span>
                  )}
                  {currentUser?.sport_name && (
                    <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                      &middot; {currentUser.sport_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--nec-border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                Role: <strong>{currentUser?.role || "Guest"}</strong> &middot; Department: <strong>{currentUser?.dept || "All Departments"}</strong>
              </div>
              {isLoggedIn && (
                <Button variant="danger" size="sm" icon={LogOut} onClick={handleSignOut}>
                  Sign Out
                </Button>
              )}
            </div>
          </Card>
        </section>

        {/* ── 2. Security Section ── */}
        <section>
          <div className="nec-settings-section-header">
            <Lock size={18} style={{ color: "var(--nec-navy)" }} />
            <h3 className="nec-settings-section-title">Security</h3>
          </div>
          <div className="nec-settings-grid" style={{ marginTop: 0 }}>
            {/* Change Password Card */}
            {isLoggedIn && <ChangePasswordCard currentUser={currentUser} />}

            {/* Session Info */}
            <Card title="Session Information" icon={<ShieldCheck size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="nec-settings-info-row">
                  <span className="nec-settings-info-label">Authentication Status</span>
                  <Badge status={isLoggedIn ? "success" : "neutral"}>{isLoggedIn ? "Active Session" : "Guest Mode"}</Badge>
                </div>
                {tokenExpiry && (
                  <div className="nec-settings-info-row">
                    <span className="nec-settings-info-label">Session Expires</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--nec-text-main)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={13} />
                      {tokenExpiry.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} &middot; {tokenExpiry.toLocaleDateString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="nec-settings-info-row">
                  <span className="nec-settings-info-label">Security Audit Events</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{SecurityLogger.getLog().length} logged in session</span>
                </div>
                <div className="nec-settings-info-row">
                  <span className="nec-settings-info-label">CSRF Protection</span>
                  <Badge status="success">Double-Submit Enforced</Badge>
                </div>
              </div>
            </Card>

            {/* Admin/Coordinator Reset Tools */}
            {canAdminReset && <AdminResetCard currentUser={currentUser} />}
          </div>
        </section>

        {/* ── 3. Preferences Section ── */}
        <section>
          <div className="nec-settings-section-header">
            <Palette size={18} style={{ color: "var(--nec-navy)" }} />
            <h3 className="nec-settings-section-title">Preferences</h3>
          </div>
          <div className="nec-settings-grid" style={{ marginTop: 0 }}>
            {/* Theme Card */}
            <Card title="Display Theme" icon={<Sun size={16} />}>
              <div className="nec-settings-theme-toggle">
                <button
                  type="button"
                  className={`nec-settings-theme-btn ${theme === "light" ? "active" : ""}`}
                  onClick={() => theme !== "light" && toggleTheme()}
                >
                  <Sun size={16} /> Light Theme
                </button>
                <button
                  type="button"
                  className={`nec-settings-theme-btn ${theme === "dark" ? "active" : ""}`}
                  onClick={() => theme !== "dark" && toggleTheme()}
                >
                  <Moon size={16} /> Dark Theme
                </button>
              </div>
              <div className="nec-settings-theme-preview" data-theme-preview={theme}>
                <div className="nec-settings-theme-preview-bar" />
              </div>
            </Card>

            {/* Language & Notifications */}
            <Card title="Language & Notification Preferences" icon={<Globe size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--nec-text-muted)", display: "block", marginBottom: "8px" }}>
                    Interface Language
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        className={`nec-role-menu-item ${language === l.code ? "active" : ""}`}
                        style={{ flex: 1, padding: "8px", textAlign: "center", borderRadius: "8px", border: language === l.code ? "2px solid var(--nec-navy)" : "1px solid var(--nec-border)" }}
                        onClick={() => setLanguage(l.code)}
                      >
                        {l.flag} {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--nec-border-light)", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>In-App Notifications</div>
                  </div>
                  <Button variant={notifEnabled ? "primary" : "outline"} size="sm" onClick={handleToggleNotif}>
                    {notifEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ── 4. System Section ── */}
        <section>
          <div className="nec-settings-section-header">
            <Info size={18} style={{ color: "var(--nec-navy)" }} />
            <h3 className="nec-settings-section-title">System</h3>
          </div>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div className="nec-settings-info-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <span className="nec-settings-info-label">System Platform</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--nec-text-main)", marginTop: "4px" }}>
                  NEC Sports Management System
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>Version 2.6.0</span>
              </div>

              <div className="nec-settings-info-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <span className="nec-settings-info-label">Institution</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--nec-text-main)", marginTop: "4px" }}>
                  National Engineering College
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>Kovilpatti, Tamil Nadu &middot; 628 503</span>
              </div>

              <div className="nec-settings-info-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                <span className="nec-settings-info-label">Directorate</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--nec-text-main)", marginTop: "4px" }}>
                  Directorate of Physical Education
                </span>
                <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>support.sports@nec.edu.in</span>
              </div>
            </div>
          </Card>
        </section>

        {/* ── 5. Quick Actions Section ── */}
        <section>
          <div className="nec-settings-section-header">
            <Zap size={18} style={{ color: "var(--nec-navy)" }} />
            <h3 className="nec-settings-section-title">Quick Actions</h3>
          </div>
          <div className="nec-quick-actions-grid">
            <Card style={{ padding: "16px", cursor: "pointer" }} onClick={() => setContactModalOpen(true)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(30, 62, 98, 0.1)", color: "var(--nec-navy)" }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Contact Admin</h4>
                </div>
              </div>
            </Card>

            <Card style={{ padding: "16px", cursor: "pointer" }} onClick={() => setBugModalOpen(true)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                  <Bug size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Report Bug</h4>
                </div>
              </div>
            </Card>

            <Card style={{ padding: "16px", cursor: "pointer" }} onClick={() => setHelpModalOpen(true)}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(234, 179, 8, 0.1)", color: "#ca8a04" }}>
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>Help & Guide</h4>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      {/* ── Modals for Quick Actions ── */}
      {contactModalOpen && (
        <Modal title="Contact Sports Administration" isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "8px 0" }}>
            <div style={{ padding: "12px", background: "var(--nec-surface-raised)", borderRadius: "8px", fontSize: "0.85rem" }}>
              <div><strong>Office:</strong> Physical Education Directorate, Sports Arena</div>
              <div style={{ marginTop: "4px" }}><strong>Email:</strong> sports@nec.edu.in</div>
              <div style={{ marginTop: "4px" }}><strong>Telephone:</strong> 04632-222502 &middot; Ext: 2404</div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="primary" size="sm" onClick={() => setContactModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {bugModalOpen && (
        <Modal title="Report Bug / System Feedback" isOpen={bugModalOpen} onClose={() => setBugModalOpen(false)}>
          <form onSubmit={handleBugSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Describe the issue encountered:</label>
            <textarea
              className="nec-table-search-input"
              rows={4}
              style={{ width: "100%", resize: "vertical" }}
              placeholder="Provide a brief description of the issue..."
              value={bugReport}
              onChange={(e) => setBugReport(e.target.value)}
              required
            />
            {bugSubmitted ? (
              <div style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>
                Feedback submitted to system administrator. Thank you!
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button variant="outline" size="sm" type="button" onClick={() => setBugModalOpen(false)}>Cancel</Button>
                <Button variant="primary" size="sm" type="submit">Submit Report</Button>
              </div>
            )}
          </form>
        </Modal>
      )}

      {helpModalOpen && (
        <Modal title="Help & System Guide" isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0", fontSize: "0.85rem" }}>
            <div>
              <strong>On Duty (OD) Letters:</strong>
              <p style={{ margin: "2px 0 0", color: "var(--nec-text-muted)" }}>
                OD requests are generated when match fixtures are scheduled. Once approved by the department coordinator or physical director, you can view and download your letter.
              </p>
            </div>
            <div>
              <strong>Matchday Attendance:</strong>
              <p style={{ margin: "2px 0 0", color: "var(--nec-text-muted)" }}>
                Coordinators mark squad attendance before match commencement. Attendance counts towards athletic eligibility and academic condonation.
              </p>
            </div>
            <div>
              <strong>Security & Session:</strong>
              <p style={{ margin: "2px 0 0", color: "var(--nec-text-muted)" }}>
                Sessions automatically expire after 30 minutes of inactivity. For password resets, contact your department coordinator or sports director.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <Button variant="primary" size="sm" onClick={() => setHelpModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
