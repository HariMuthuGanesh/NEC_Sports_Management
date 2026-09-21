import React, { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Modal } from "../../components/common/Modal";
import ForgotPasswordModal from "../../components/common/ForgotPasswordModal";
import {
  Sun, Moon, Globe, User, ShieldCheck, Info, Lock,
  LogOut, RefreshCw, CheckCircle2, Clock, Languages,
  Eye, EyeOff, ShieldAlert, UserCog, Search, KeyRound, Copy, Check, Mail
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
export default function SettingsPage() {
  const {
    currentUser, theme, toggleTheme, language, setLanguage,
    logout, ROLES, sessionExpiresAt, t
  } = useAuth();

  const [resetConfirm, setResetConfirm] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const tokenExpiry = sessionExpiresAt || getTokenExpiry(getAuthToken());
  const isLoggedIn  = currentUser?.role !== ROLES.PUBLIC;

  // Only Admin and Sports President see the full admin reset card
  // Coordinator sees it too but with scoped permissions (enforced server-side)
  const canAdminReset = isLoggedIn && [
    ROLES.ADMIN, ROLES.PRESIDENT, ROLES.COORDINATOR
  ].includes(currentUser?.role);

  const handleResetData = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
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
        <p className="nec-page-desc">
          Manage your account, appearance, language preferences, and system data.
        </p>
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

        {/* ── Security / Change Password ── */}
        {isLoggedIn && <ChangePasswordCard />}

        {/* ── Admin Reset (Admin / President / Coordinator) ── */}
        {canAdminReset && <AdminResetCard currentUser={currentUser} />}

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
