import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/common/Button";
import {
  Trophy,
  ShieldCheck,
  UserPlus,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Mail,
  KeyRound,
  Award,
  User,
} from "lucide-react";
import {
  sanitizeInput,
  validatePasswordStrength,
} from "../../utils/security";
import "./LoginPage.css"; // Reuse the same stylesheet — same design language

// Password strength colors shared with LoginPage
const STRENGTH_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

export default function SignUpPage({ onLoginSuccess, onNavigate }) {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwStrength, setPwStrength] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (val.length > 0) setPwStrength(validatePasswordStrength(val));
    else setPwStrength(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic client-side presence check — real validation lives on the server
    const cleanUsername = sanitizeInput(username.trim());
    const cleanEmail = sanitizeInput(email.trim());
    if (!cleanUsername || !cleanEmail || !password) {
      setError("Please fill in all fields before submitting.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password }),
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.data) {
        const userData = resData.data;

        login(
          {
            role: userData.role,
            name: userData.username,
            email: userData.email,
            dept: userData.studentProfile?.department_code || "Sports Office",
            title: userData.role,
            id: userData.username || cleanUsername,
          }
        );

        setLoading(false);
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess();
        }
        return;
      }

      // Server returned an error — show the actual message from the API
      const msg = resData.error?.message || "Sign-up failed. Please try again.";
      setError(msg);
    } catch {
      setError("Unable to connect to the authentication server. Please check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nec-auth-portal">
      <main className="nec-auth-main">
        <div className="nec-auth-grid">

          {/* ── Left Column: Institutional Showcase ── */}
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

              {/* Branding */}
              <div className="nec-showcase-branding">
                <div className="nec-showcase-logo">
                  <img
                    src="/assets/logo.jpg"
                    alt="NEC Logo"
                    style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover" }}
                  />
                </div>
                <h1 className="nec-showcase-title">National Engineering College</h1>
              </div>

              {/* Stats */}
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
            </div>
          </section>

          {/* ── Right Column: Signup Card ── */}
          <section className="nec-auth-form-panel">
            <div className="nec-auth-card">

              {/* Header */}
              <div className="nec-auth-card-header">
                <div className="nec-header-text">
                  <h2 className="nec-card-title">Create Your Account</h2>
                  <p className="nec-card-desc">Register to access the NEC Sports Portal</p>
                </div>
              </div>

              {/* Signup Form */}
              <form onSubmit={handleSubmit} className="nec-auth-form" autoComplete="on">

                {/* Username */}
                <div className="nec-input-group">
                  <label className="nec-input-label" htmlFor="nec-signup-username">
                    <span className="nec-label-text">Username</span>
                  </label>
                  <div className="nec-input-wrapper">
                    <User size={18} className="nec-input-icon" />
                    <input
                      id="nec-signup-username"
                      type="text"
                      required
                      className="nec-form-control"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="nec-input-group">
                  <label className="nec-input-label" htmlFor="nec-signup-email">
                    <span className="nec-label-text">Email Address</span>
                  </label>
                  <div className="nec-input-wrapper">
                    <Mail size={18} className="nec-input-icon" />
                    <input
                      id="nec-signup-email"
                      type="email"
                      required
                      className="nec-form-control"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      maxLength={100}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="nec-input-group">
                  <label className="nec-input-label" htmlFor="nec-signup-password">
                    <span className="nec-label-text">Password</span>
                  </label>
                  <div className="nec-input-wrapper">
                    <KeyRound size={18} className="nec-input-icon" />
                    <input
                      id="nec-signup-password"
                      type={showPassword ? "text" : "password"}
                      required
                      className="nec-form-control nec-pw-field"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={handlePasswordChange}
                      autoComplete="new-password"
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

                {/* Error Banner */}
                {error && (
                  <div className="nec-error-alert" role="alert">
                    <AlertTriangle size={18} className="nec-error-icon" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={UserPlus}
                  disabled={loading}
                  className="nec-submit-btn"
                >
                  {loading ? "Creating Account…" : "Create Account"}
                </Button>
              </form>

              {/* Footer — link back to login */}
              <div className="nec-auth-card-footer">
                <span className="nec-footer-text">Already have an account?</span>
                <button
                  type="button"
                  className="nec-guest-link"
                  onClick={() => {
                    if (typeof onNavigate === "function") onNavigate("login");
                  }}
                >
                  Sign In <ArrowRight size={14} />
                </button>
              </div>

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
