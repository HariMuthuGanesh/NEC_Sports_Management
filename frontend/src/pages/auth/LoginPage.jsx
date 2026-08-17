import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import {
  Trophy, ShieldCheck, UserCheck, Lock, Eye, EyeOff,
  AlertTriangle, CheckCircle2, ShieldAlert
} from "lucide-react";
import {
  sanitizeInput,
  validatePasswordStrength,
  isRateLimited,
  getLockoutRemainingSeconds,
  recordFailedAttempt,
  clearRateLimit,
  SecurityLogger,
} from "../../utils/security";
import "./LoginPage.css";

// ── Credential dictionary (mock — replace with real API call in production) ──
const MOCK_CREDENTIALS = {
  "ADM01":   { password: "Admin@123", role: "Director of Physical Education",  name: "Dr. K. Arumugam", dept: "Sports Office", title: "Director of Physical Education" },
  "2112045": { password: "Coord@456", role: "Department Sports Coordinator",   name: "Rahul Sharma",    dept: "CSE",           title: "CSE Sports Coordinator" },
  "2114012": { password: "Player@789", role: "Student Athlete",                name: "Priya Patel",     dept: "MECH",          title: "Student Athlete" },
  "guest":   { password: "Guest@000", role: "Public Guest Portal",             name: "Guest Visitor",   dept: "All",           title: "Guest" },
};

// Password strength bar colors
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];
const STRENGTH_BG = ["#fee2e2", "#ffedd5", "#fef9c3", "#dcfce7", "#bbf7d0"];

export default function LoginPage({ onLoginSuccess }) {
  const { login, ROLES, t } = useAuth();

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [pwStrength, setPwStrength] = useState(null);

  // ── Lockout countdown timer ──
  useEffect(() => {
    let interval;
    if (locked) {
      interval = setInterval(() => {
        const remaining = getLockoutRemainingSeconds();
        if (remaining <= 0) {
          setLocked(false);
          setLockCountdown(0);
          setError("");
          clearInterval(interval);
        } else {
          setLockCountdown(remaining);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [locked]);

  // Check if locked on mount
  useEffect(() => {
    if (isRateLimited()) {
      setLocked(true);
      setLockCountdown(getLockoutRemainingSeconds());
    }
  }, []);

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (val.length > 0) setPwStrength(validatePasswordStrength(val));
    else setPwStrength(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRateLimited()) {
      setLocked(true);
      setLockCountdown(getLockoutRemainingSeconds());
      return;
    }

    const cleanId = sanitizeInput(userId.trim());
    const cleanPw = password; // don't sanitize password — it'll break special chars

    if (!cleanId || !cleanPw) {
      setError("Please enter your User ID and password.");
      return;
    }

    setLoading(true);
    // Simulate async network check
    await new Promise(r => setTimeout(r, 600));

    const credential = MOCK_CREDENTIALS[cleanId];
    if (!credential || credential.password !== cleanPw) {
      const result = recordFailedAttempt();
      SecurityLogger.logFailedLogin(cleanId, "Invalid credentials");
      if (result.locked) {
        setLocked(true);
        setLockCountdown(getLockoutRemainingSeconds());
        setError(`Account locked after ${result.attempts} failed attempts. Try again in 15 minutes.`);
      } else {
        setError(`Invalid credentials. ${5 - result.attempts} attempt${5 - result.attempts === 1 ? "" : "s"} remaining.`);
      }
      setLoading(false);
      return;
    }

    // Valid login
    clearRateLimit();
    login({ role: credential.role, name: credential.name, dept: credential.dept, title: credential.title, id: cleanId });
    if (onLoginSuccess) onLoginSuccess();
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="nec-login-container">
      <div className="nec-login-card">
        <div className="nec-login-header">
          <div className="nec-login-logo"><Trophy size={32} /></div>
          <h2 className="nec-login-title">{t.collegeName}</h2>
          <span className="nec-login-subtitle">{t.systemTitle}</span>
        </div>

        {/* ── Lockout Banner ── */}
        {locked && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px",
            padding: "14px 16px", margin: "0 0 16px", display: "flex",
            alignItems: "center", gap: "10px", color: "#dc2626"
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Account Temporarily Locked</strong>
              <div style={{ fontSize: "0.85rem", marginTop: "2px", color: "#7f1d1d" }}>
                Too many failed attempts. Unlocks in{" "}
                <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatCountdown(lockCountdown)}</strong>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="nec-login-form" autoComplete="off">

          {/* ── User / Staff ID ── */}
          <div className="nec-form-group">
            <label className="nec-form-label">{t.rollOrStaffId || "Roll No / Staff ID"}</label>
            <input
              id="nec-login-userid"
              type="text"
              required
              disabled={locked}
              className="nec-table-search-input"
              style={{ maxWidth: "100%", opacity: locked ? 0.5 : 1 }}
              placeholder={t.enterRollPlaceholder || "e.g. 2112045 or ADM01"}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              maxLength={20}
            />
          </div>

          {/* ── Password with toggle ── */}
          <div className="nec-form-group">
            <label className="nec-form-label">{t.password || "Password"}</label>
            <div style={{ position: "relative" }}>
              <input
                id="nec-login-password"
                type={showPassword ? "text" : "password"}
                required
                disabled={locked}
                className="nec-table-search-input"
                style={{ maxWidth: "100%", paddingRight: "44px", opacity: locked ? 0.5 : 1 }}
                placeholder={t.enterPasswordPlaceholder || "Enter your password"}
                value={password}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                maxLength={64}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                tabIndex={-1}
                style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--nec-text-muted)", padding: "4px", lineHeight: 1
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* ── Password Strength Bar ── */}
            {pwStrength && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: "4px", borderRadius: "2px",
                        background: i < pwStrength.score
                          ? STRENGTH_COLORS[pwStrength.score]
                          : "var(--nec-border-light)",
                        transition: "background 0.3s",
                      }}
                    />
                  ))}
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", fontSize: "0.75rem",
                  color: STRENGTH_COLORS[pwStrength.score]
                }}>
                  <span>Strength: <strong>{pwStrength.label}</strong></span>
                  {pwStrength.suggestions[0] && (
                    <span style={{ color: "var(--nec-text-muted)" }}>{pwStrength.suggestions[0]}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Error Message ── */}
          {error && !locked && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              color: "#dc2626", fontSize: "0.875rem", padding: "10px 12px",
              background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5"
            }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* ── Demo Credentials Hint ── */}
          <div style={{
            background: "var(--nec-bg-alt)", borderRadius: "8px",
            padding: "10px 12px", fontSize: "0.78rem", color: "var(--nec-text-muted)",
            border: "1px solid var(--nec-border-light)"
          }}>
            <strong style={{ color: "var(--nec-navy)" }}>Demo Credentials</strong>
            <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
              <span>👨‍💼 Admin: <code>ADM01</code> / <code>Admin@123</code></span>
              <span>🧑‍🏫 Coordinator: <code>2112045</code> / <code>Coord@456</code></span>
              <span>🎽 Player: <code>2114012</code> / <code>Player@789</code></span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            icon={locked ? Lock : UserCheck}
            disabled={locked || loading}
          >
            {loading ? "Authenticating…" : locked ? `Locked — ${formatCountdown(lockCountdown)}` : (t.signInBtn || "Sign In")}
          </Button>

          <div className="nec-login-footer-info">
            <ShieldCheck size={14} /> {t.integratedWithLasa || "Secured by NEC · LASA Sports Management System"}
          </div>
        </form>
      </div>
    </div>
  );
}
