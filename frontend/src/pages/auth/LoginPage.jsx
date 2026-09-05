import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import {
  Trophy,
  ShieldCheck,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Building,
  KeyRound,
  Award,
  Radio,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import {
  sanitizeInput,
  validatePasswordStrength,
  isRateLimited,
  getLockoutRemainingSeconds,
  recordFailedAttempt,
  clearRateLimit,
  SecurityLogger,
  setAuthToken,
} from "../../utils/security";
import "./LoginPage.css";

// Password strength colors
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

export default function LoginPage({ onLoginSuccess, onNavigate }) {
  const { login, t } = useAuth();

  const [userId, setUserId] = useState(() => localStorage.getItem("nec_remembered_userid") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [pwStrength, setPwStrength] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

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

  const executeLogin = async (idToUse, pwToUse) => {
    setError("");

    if (isRateLimited()) {
      setLocked(true);
      setLockCountdown(getLockoutRemainingSeconds());
      return;
    }

    const cleanId = sanitizeInput(idToUse.trim());
    const cleanPw = pwToUse;

    if (!cleanId || !cleanPw) {
      setError("Please enter both Roll/Staff ID and Password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanId, password: cleanPw })
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.data?.token) {
        const userData = resData.data;
        const jwtToken = userData.token;

        // Store JWT in nec_sports_jwt_token via security utility
        setAuthToken(jwtToken);

        if (rememberMe) {
          localStorage.setItem("nec_remembered_userid", cleanId);
        } else {
          localStorage.removeItem("nec_remembered_userid");
        }

        clearRateLimit();

        login(
          {
            role: userData.role,
            name: userData.username,
            email: userData.email,
            dept: userData.studentProfile?.department_code || "Sports Office",
            title: userData.role,
            id: userData.username || cleanId
          },
          jwtToken
        );

        setLoading(false);
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess();
        }
        return;
      }

      if (response.status === 403 || resData.error?.code === "ACCOUNT_DISABLED") {
        setError(resData.error?.message || "Your account is disabled.");
        setLoading(false);
        return;
      }

      // Invalid credentials or status 401
      const result = recordFailedAttempt();
      SecurityLogger.logFailedLogin(cleanId, resData.error?.message || "Invalid credentials");
      if (result.locked) {
        setLocked(true);
        setLockCountdown(getLockoutRemainingSeconds());
        setError(`Security Lockout: Account locked for 15 minutes due to ${result.attempts} failed attempts.`);
      } else {
        setError(`Invalid credentials. ${5 - result.attempts} attempt${5 - result.attempts === 1 ? "" : "s"} remaining before security lockout.`);
      }
    } catch (err) {
      setError("Unable to connect to authentication server. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(userId, password);
  };


  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };


  return (
    <div className="nec-auth-portal">

      {/* ── Main Split-Layout Container ── */}
      <main className="nec-auth-main">
        <div className="nec-auth-grid">

          {/* ── Left Column: Institutional College & LASA Showcase ── */}
          <section className="nec-auth-showcase">
            <div className="nec-showcase-glass">
              {/* College Badges */}
              <div className="nec-showcase-badges">
                <div className="nec-pill-badge nec-gold-pill">
                  <ShieldCheck size={14} />
                  <span>Autonomous Institution • Estd. 1984</span>
                </div>
                <div className="nec-pill-badge nec-navy-pill">
                  <Award size={14} />
                  <span>Kovilpatti, Tamil Nadu</span>
                </div>
              </div>

              {/* Title & Institutional Identity */}
              <div className="nec-showcase-branding">
                <div className="nec-showcase-logo">
                  <Trophy size={36} />
                </div>
                <h1 className="nec-showcase-title">
                  National Engineering College
                </h1>
                <p className="nec-showcase-academy">
                  Lakshmi Ammal Sports Academy (LASA)
                </p>
                <p className="nec-showcase-motto">
                  "Excellence in Sports, Discipline in Character, Glory in Competition"
                </p>
              </div>

              {/* Campus Sports Stats Showcase */}
              <div className="nec-showcase-stats">
                <div className="nec-stat-box">
                  <span className="nec-stat-num">8+</span>
                  <span className="nec-stat-lbl">Sports Disciplines</span>
                </div>
                <div className="nec-stat-box">
                  <span className="nec-stat-num">500+</span>
                  <span className="nec-stat-lbl">Student Athletes</span>
                </div>
                <div className="nec-stat-box">
                  <span className="nec-stat-num">15+</span>
                  <span className="nec-stat-lbl">Annual Tournaments</span>
                </div>
                <div className="nec-stat-box">
                  <span className="nec-stat-num">100%</span>
                  <span className="nec-stat-lbl">Digital Scoring</span>
                </div>
              </div>

              {/* Live Announcement Bulletin Card */}
              <div className="nec-showcase-bulletin">
                <div className="nec-bulletin-header">
                  <Radio size={16} className="nec-pulse-dot" />
                  <span>Live Sports Bulletin</span>
                </div>
                <p className="nec-bulletin-text">
                  Inter-Department Badminton & Football Tournaments are currently active. Match schedules and team registration forms are open for all departments.
                </p>
              </div>

              {/* Footer Trust & Security Note */}
              <div className="nec-showcase-footer">
                <ShieldCheck size={16} className="nec-gold-icon" />
                <span>Protected by NEC Multi-Layer JWT & Role-Based Access Control</span>
              </div>
            </div>
          </section>

          {/* ── Right Column: Login Card & Persona Switcher ── */}
          <section className="nec-auth-form-panel">
            <div className="nec-auth-card">
              
              {/* Form Header */}
              <div className="nec-auth-card-header">
                <div className="nec-header-text">
                  <h2 className="nec-card-title">Sign In to Sports Portal</h2>
                  <p className="nec-card-desc">Enter your Roll Number or Staff ID to log in</p>
                </div>
              </div>

              {/* ── Security Lockout Banner ── */}
              {locked && (
                <div className="nec-lockout-banner">
                  <ShieldAlert size={22} className="nec-lockout-icon" />
                  <div>
                    <strong className="nec-lockout-title">Account Temporarily Locked</strong>
                    <div className="nec-lockout-desc">
                      Too many consecutive failed attempts. Security cool-down active:{" "}
                      <strong className="nec-countdown-timer">{formatCountdown(lockCountdown)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Login Form ── */}
              <form onSubmit={handleSubmit} className="nec-auth-form" autoComplete="on">

                {/* User ID / Roll Number */}
                <div className="nec-input-group">
                  <label className="nec-input-label" htmlFor="nec-userid">
                    <span className="nec-label-text">Roll Number / Staff ID</span>
                    <span className="nec-label-hint">e.g. 2114012, ADM01</span>
                  </label>
                  <div className="nec-input-wrapper">
                    <Building size={18} className="nec-input-icon" />
                    <input
                      id="nec-userid"
                      type="text"
                      required
                      disabled={locked}
                      className="nec-form-control"
                      placeholder="Enter your Roll Number or Staff ID (e.g. 2114012, ADM01)"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      autoComplete="username"
                      maxLength={25}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="nec-input-group">
                  <div className="nec-label-row">
                    <label className="nec-input-label" htmlFor="nec-password">
                      <span className="nec-label-text">Password</span>
                    </label>
                    <button
                      type="button"
                      className="nec-forgot-link"
                      onClick={() => setShowHelpModal(true)}
                    >
                      Need help?
                    </button>
                  </div>

                  <div className="nec-input-wrapper">
                    <KeyRound size={18} className="nec-input-icon" />
                    <input
                      id="nec-password"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={locked}
                      className="nec-form-control nec-pw-field"
                      placeholder="Enter your account password"
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="current-password"
                      maxLength={64}
                    />
                    <button
                      type="button"
                      className="nec-pw-toggle"
                      onClick={() => setShowPassword((p) => !p)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {pwStrength && (
                    <div className="nec-pw-strength-box">
                      <div className="nec-strength-bars">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="nec-strength-bar"
                            style={{
                              background:
                                i < pwStrength.score
                                  ? STRENGTH_COLORS[pwStrength.score]
                                  : "var(--nec-border)",
                            }}
                          />
                        ))}
                      </div>
                      <div
                        className="nec-strength-caption"
                        style={{ color: STRENGTH_COLORS[pwStrength.score] }}
                      >
                        <span>Strength: <strong>{pwStrength.label}</strong></span>
                        {pwStrength.suggestions[0] && (
                          <span className="nec-strength-tip">{pwStrength.suggestions[0]}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Remember Me & Help Row */}
                <div className="nec-options-row">
                  <label className="nec-checkbox-label">
                    <input
                      type="checkbox"
                      className="nec-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember my ID</span>
                  </label>
                  <button
                    type="button"
                    className="nec-support-btn"
                    onClick={() => setShowHelpModal(true)}
                  >
                    <HelpCircle size={14} />
                    <span>Sports Office Access</span>
                  </button>
                </div>

                {/* Error Banner */}
                {error && !locked && (
                  <div className="nec-error-alert" role="alert">
                    <AlertTriangle size={18} className="nec-error-icon" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={locked ? Lock : UserCheck}
                  disabled={locked || loading}
                  className="nec-submit-btn"
                >
                  {loading
                    ? "Authenticating Credentials…"
                    : locked
                    ? `Locked — ${formatCountdown(lockCountdown)}`
                    : (t.signInBtn || "Sign In to Sports Portal")}
                </Button>
              </form>

              {/* Guest / Visitor Alternative */}
              <div className="nec-auth-card-footer">
                <span className="nec-footer-text">Don't have login credentials?</span>
                <button
                  type="button"
                  className="nec-guest-link"
                  onClick={() => {
                    if (typeof onNavigate === "function") onNavigate("public_home");
                  }}
                >
                  Continue as Guest <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* ── Help / Sports Office Contacts Modal ── */}
      <Modal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        title="Physical Education & Sports Office Support"
      >
        <div className="nec-help-content">
          <div className="nec-help-header">
            <Trophy size={28} className="nec-gold-icon" />
            <div>
              <h3 className="nec-help-title">National Engineering College Sports Directorate</h3>
              <p className="nec-help-subtitle">Lakshmi Ammal Sports Academy (LASA) Administration</p>
            </div>
          </div>

          <div className="nec-help-details">
            <div className="nec-help-item">
              <MapPin size={18} className="nec-help-icon" />
              <div>
                <strong>Physical Location</strong>
                <p>LASA Indoor Stadium Complex, Ground Floor, Room 102, NEC Campus, Kovilpatti.</p>
              </div>
            </div>

            <div className="nec-help-item">
              <Phone size={18} className="nec-help-icon" />
              <div>
                <strong>Internal Intercom & Office Lines</strong>
                <p>Intercom: Ext 245 (Director) / Ext 248 (Coordinator Desk)</p>
              </div>
            </div>

            <div className="nec-help-item">
              <Mail size={18} className="nec-help-icon" />
              <div>
                <strong>Email Support</strong>
                <p>sports@nec.edu.in • director.pe@nec.edu.in</p>
              </div>
            </div>
          </div>


          <div className="nec-help-actions">
            <Button variant="primary" onClick={() => setShowHelpModal(false)}>
              Back to Login
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
