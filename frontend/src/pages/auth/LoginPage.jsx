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
  GraduationCap,
  Users,
  Award,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Building,
  KeyRound,
  Globe,
  Sun,
  Moon,
  ChevronRight,
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
} from "../../utils/security";
import "./LoginPage.css";

// ── Credential dictionary (mock — aligned with NEC Institutional Directory) ──
const MOCK_CREDENTIALS = {
  "ADM01": {
    password: "Admin@123",
    role: "Director of Physical Education",
    name: "Dr. K. Arumugam",
    dept: "Sports Office",
    title: "Director of Physical Education",
    roleType: "admin",
    badge: "Sports Directorate"
  },
  "2112045": {
    password: "Coord@456",
    role: "Department Sports Coordinator",
    name: "Rahul Sharma",
    dept: "CSE",
    title: "CSE Sports Coordinator",
    roleType: "coordinator",
    badge: "Faculty / Staff"
  },
  "2114012": {
    password: "Player@789",
    role: "Student Athlete",
    name: "Priya Patel",
    dept: "MECH",
    title: "Student Athlete",
    roleType: "player",
    badge: "Student Roster"
  },
  "guest": {
    password: "Guest@000",
    role: "Public Guest Portal",
    name: "Guest Visitor",
    dept: "All",
    title: "Guest",
    roleType: "public",
    badge: "Public Access"
  },
};

const ROLES_INFO = [
  {
    id: "player",
    label: "Student Athlete",
    icon: GraduationCap,
    desc: "Register for events, track fixtures & personal stats",
    defaultId: "2114012",
    defaultPw: "Player@789",
    userPreview: "Priya Patel (Mech)",
  },
  {
    id: "coordinator",
    label: "Dept Coordinator",
    icon: Users,
    desc: "Manage rosters, submit live scores & mark attendance",
    defaultId: "2112045",
    defaultPw: "Coord@456",
    userPreview: "Rahul Sharma (CSE)",
  },
  {
    id: "admin",
    label: "Sports Director",
    icon: Award,
    desc: "Approve teams, manage tournaments & full audit logs",
    defaultId: "ADM01",
    defaultPw: "Admin@123",
    userPreview: "Dr. K. Arumugam (Director)",
  },
  {
    id: "public",
    label: "Guest Explorer",
    icon: Trophy,
    desc: "Browse live scores, fixtures & sports gallery",
    defaultId: "guest",
    defaultPw: "Guest@000",
    userPreview: "Public Visitor",
  }
];

// Password strength colors
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

export default function LoginPage({ onLoginSuccess, onNavigate }) {
  const { login, setRole, ROLES, theme, toggleTheme, language, setLanguage, t } = useAuth();

  const [selectedRoleTab, setSelectedRoleTab] = useState("player");
  const [userId, setUserId] = useState(() => localStorage.getItem("nec_remembered_userid") || "2114012");
  const [password, setPassword] = useState("Player@789");
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

  // Update fields when selecting a role tab
  const handleRoleTabClick = (roleTab) => {
    setSelectedRoleTab(roleTab.id);
    setUserId(roleTab.defaultId);
    setPassword(roleTab.defaultPw);
    setError("");
    if (roleTab.defaultPw) {
      setPwStrength(validatePasswordStrength(roleTab.defaultPw));
    }
  };

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

    // Network latency simulation
    await new Promise((r) => setTimeout(r, 450));

    const credential = MOCK_CREDENTIALS[cleanId];
    if (!credential || credential.password !== cleanPw) {
      const result = recordFailedAttempt();
      SecurityLogger.logFailedLogin(cleanId, "Invalid credentials");
      if (result.locked) {
        setLocked(true);
        setLockCountdown(getLockoutRemainingSeconds());
        setError(`Security Lockout: Account locked for 15 minutes due to ${result.attempts} failed attempts.`);
      } else {
        setError(`Invalid credentials. ${5 - result.attempts} attempt${5 - result.attempts === 1 ? "" : "s"} remaining before security lockout.`);
      }
      setLoading(false);
      return;
    }

    // Save remembered ID if requested
    if (rememberMe) {
      localStorage.setItem("nec_remembered_userid", cleanId);
    } else {
      localStorage.removeItem("nec_remembered_userid");
    }

    // Clear rate limits upon successful login
    clearRateLimit();

    login({
      role: credential.role,
      name: credential.name,
      dept: credential.dept,
      title: credential.title,
      id: cleanId
    });

    setLoading(false);
    if (typeof onLoginSuccess === "function") {
      onLoginSuccess();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeLogin(userId, password);
  };

  const handleQuickDemoLogin = (roleInfo) => {
    setSelectedRoleTab(roleInfo.id);
    setUserId(roleInfo.defaultId);
    setPassword(roleInfo.defaultPw);
    executeLogin(roleInfo.defaultId, roleInfo.defaultPw);
  };

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "ta", label: "தமிழ்" },
    { code: "hi", label: "हिंदी" }
  ];

  return (
    <div className="nec-auth-portal">
      {/* ── Top Utility Bar ── */}
      <header className="nec-auth-topbar">
        <div className="nec-auth-topbar-left">
          <button
            type="button"
            className="nec-auth-back-btn"
            onClick={() => onNavigate ? onNavigate("public_home") : null}
          >
            <Trophy size={16} className="nec-gold-icon" />
            <span>{t.home || "Public Portal"}</span>
          </button>
        </div>

        <div className="nec-auth-topbar-right">
          {/* Language Switcher */}
          <div className="nec-auth-lang-pills">
            <Globe size={14} className="nec-text-muted" />
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                className={`nec-auth-pill-btn ${language === l.code ? "active" : ""}`}
                onClick={() => setLanguage(l.code)}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            className="nec-auth-theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

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
                  <h2 className="nec-card-title">{t.signInTitle || "Sign In to NEC Sports Portal"}</h2>
                  <p className="nec-card-desc">Select your portal role or enter your institutional credentials</p>
                </div>
              </div>

              {/* Role Persona Tabs */}
              <div className="nec-role-tabs" role="tablist" aria-label="Portal Roles">
                {ROLES_INFO.map((r) => {
                  const Icon = r.icon;
                  const isActive = selectedRoleTab === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`nec-role-tab ${isActive ? "active" : ""}`}
                      onClick={() => handleRoleTabClick(r)}
                    >
                      <Icon size={18} className="nec-tab-icon" />
                      <span className="nec-tab-label">{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Demo Assist Banner */}
              <div className="nec-quick-assist-bar">
                <div className="nec-assist-info">
                  <Sparkles size={14} className="nec-gold-icon" />
                  <span>
                    Selected: <strong>{ROLES_INFO.find(r => r.id === selectedRoleTab)?.userPreview}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="nec-quick-fill-btn"
                  onClick={() => handleQuickDemoLogin(ROLES_INFO.find(r => r.id === selectedRoleTab))}
                  disabled={locked || loading}
                >
                  Quick Sign In <ChevronRight size={14} />
                </button>
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
                    <span className="nec-label-text">
                      {selectedRoleTab === "admin"
                        ? "Director / Staff ID"
                        : selectedRoleTab === "coordinator"
                        ? "Faculty Coordinator ID"
                        : selectedRoleTab === "public"
                        ? "Visitor Identifier"
                        : (t.rollOrStaffId || "Student Roll Number")}
                    </span>
                    <span className="nec-label-hint">
                      {selectedRoleTab === "admin" ? "e.g. ADM01" : selectedRoleTab === "coordinator" ? "e.g. 2112045" : "e.g. 2114012"}
                    </span>
                  </label>
                  <div className="nec-input-wrapper">
                    <Building size={18} className="nec-input-icon" />
                    <input
                      id="nec-userid"
                      type="text"
                      required
                      disabled={locked}
                      className="nec-form-control"
                      placeholder={
                        selectedRoleTab === "admin"
                          ? "Enter Staff ID (e.g. ADM01)"
                          : selectedRoleTab === "coordinator"
                          ? "Enter Coordinator ID (e.g. 2112045)"
                          : "Enter Roll Number (e.g. 2114012)"
                      }
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
                      <span className="nec-label-text">{t.password || "Password"}</span>
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
                      placeholder={t.enterPasswordPlaceholder || "Enter your password..."}
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
                    handleQuickDemoLogin(ROLES_INFO.find(r => r.id === "public"));
                  }}
                >
                  Continue as Guest Explorer <ArrowRight size={14} />
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

          <div className="nec-help-demo-card">
            <h4>Quick Reference Demo Accounts:</h4>
            <div className="nec-demo-tags">
              <div className="nec-demo-tag">
                <strong>Student:</strong> <code>2114012</code> / <code>Player@789</code>
              </div>
              <div className="nec-demo-tag">
                <strong>Coordinator:</strong> <code>2112045</code> / <code>Coord@456</code>
              </div>
              <div className="nec-demo-tag">
                <strong>Director / Admin:</strong> <code>ADM01</code> / <code>Admin@123</code>
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
