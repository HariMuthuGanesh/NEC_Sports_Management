/* ============================================================
   NEC Sports Management System — Security Utilities Library
   Covers: XSS Prevention, Input Validation, Rate Limiting,
           Session Expiry, Audit Logging, CSRF Nonce
   ============================================================ */

// ── 1. XSS Prevention ────────────────────────────────────────

/**
 * Escapes HTML special characters to prevent XSS injection.
 * Use on any user-supplied string before rendering in the DOM.
 */
export const sanitizeInput = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/`/g, "&#x60;")
    .replace(/=/g, "&#x3D;");
};

/**
 * Strips all HTML tags from a string.
 * Use for plain-text display of user-supplied content.
 */
export const stripHtml = (str) => {
  if (typeof str !== "string") return str;
  return str.replace(/<[^>]*>/g, "").trim();
};

/**
 * Validates that a URL is safe (no javascript: / data: protocol).
 */
export const isSafeUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const lower = url.trim().toLowerCase();
  return !lower.startsWith("javascript:") && !lower.startsWith("data:") && !lower.startsWith("vbscript:");
};

// ── 2. Input Validation ───────────────────────────────────────

const PATTERNS = {
  rollNo: /^\d{7}$/, // 7-digit student roll number, e.g. 2114012
  staffId: /^[A-Za-z]{2,4}\d{2}$/, // Staff IDs like ADM01, PE001
  name: /^[A-Za-z\s.''-]{2,60}$/,
  alphanumeric: /^[A-Za-z0-9\s\-_]{1,100}$/,
};

export const validateRollNo = (id) => PATTERNS.rollNo.test(id?.trim());
export const validateStaffId = (id) => PATTERNS.staffId.test(id?.trim());
export const validateName = (name) => PATTERNS.name.test(name?.trim());

/**
 * Full password strength checker.
 * Returns { score: 0–4, label, valid, suggestions[] }
 */
export const validatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: "None", valid: false, suggestions: ["Enter a password."] };
  const suggestions = [];
  let score = 0;

  if (password.length >= 8) score++; else suggestions.push("Use at least 8 characters.");
  if (/[A-Z]/.test(password)) score++; else suggestions.push("Include an uppercase letter.");
  if (/[0-9]/.test(password)) score++; else suggestions.push("Include a number.");
  if (/[^A-Za-z0-9]/.test(password)) score++; else suggestions.push("Include a special character (!@#$).");

  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  return {
    score,
    label: labels[score],
    valid: score >= 2,
    suggestions,
  };
};

export const getAuthToken = () => {
  try {
    return localStorage.getItem("nec_sports_jwt_token");
  } catch {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem("nec_sports_jwt_token", token);
    } else {
      localStorage.removeItem("nec_sports_jwt_token");
    }
  } catch { }
};

export const removeAuthToken = () => {
  try {
    localStorage.removeItem("nec_sports_jwt_token");
  } catch { }
};

/**
 * Decodes a JWT payload (base64url → JSON). Does NOT verify signature.
 * For frontend display/expiry checking only.
 */
export const decodeTokenPayload = (token) => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
};

/**
 * Returns true if the stored token has expired.
 */
export const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() / 1000 > payload.exp;
};

/**
 * Returns the expiry Date of a token, or null.
 */
export const getTokenExpiry = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.exp) return null;
  return new Date(payload.exp * 1000);
};

// ── 4. Rate Limiting (Login Attempt Throttle) ─────────────────

const RL_KEY = "nec_security_rate_limit";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const getRateLimitState = () => {
  try {
    const raw = localStorage.getItem(RL_KEY);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
};

export const isRateLimited = () => {
  const state = getRateLimitState();
  if (!state.lockedUntil) return false;
  if (Date.now() < state.lockedUntil) return true;
  // Lockout expired — reset
  clearRateLimit();
  return false;
};

export const getLockoutRemainingSeconds = () => {
  const state = getRateLimitState();
  if (!state.lockedUntil) return 0;
  return Math.max(0, Math.ceil((state.lockedUntil - Date.now()) / 1000));
};

export const recordFailedAttempt = () => {
  const state = getRateLimitState();
  const attempts = (state.attempts || 0) + 1;
  const lockedUntil = attempts >= MAX_ATTEMPTS
    ? Date.now() + LOCKOUT_MINUTES * 60 * 1000
    : state.lockedUntil;
  localStorage.setItem(RL_KEY, JSON.stringify({ attempts, lockedUntil }));
  return { attempts, locked: attempts >= MAX_ATTEMPTS };
};

export const clearRateLimit = () => {
  localStorage.removeItem(RL_KEY);
};

// ── 5. Security Audit Logger ──────────────────────────────────

const AUDIT_KEY = "nec_security_audit_log";
const MAX_LOG_ENTRIES = 200;

export const SecurityLogger = {
  _write(entry) {
    try {
      const log = this.getLog();
      log.unshift({ ...entry, timestamp: new Date().toISOString(), id: crypto.randomUUID?.() || Date.now().toString(36) });
      // Keep log size bounded
      if (log.length > MAX_LOG_ENTRIES) log.splice(MAX_LOG_ENTRIES);
      localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
    } catch (e) {
      console.warn("[SecurityLogger] Could not write audit entry:", e);
    }
  },

  getLog() {
    try {
      const raw = localStorage.getItem(AUDIT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  logLogin(user) {
    this._write({ event: "LOGIN_SUCCESS", user: user.name, role: user.role, dept: user.dept, userId: user.id });
  },

  logLogout(user) {
    this._write({ event: "LOGOUT", user: user?.name || "Unknown", role: user?.role || "—", userId: user?.id });
  },

  logRoleChange(fromRole, toRole, user) {
    this._write({ event: "ROLE_SWITCH", user: user?.name || "Unknown", from: fromRole, to: toRole });
  },

  logFailedLogin(userId, reason = "Invalid credentials") {
    this._write({ event: "LOGIN_FAILED", userId, reason });
  },

  logUnauthorizedAccess(userRole, attemptedRoute) {
    this._write({ event: "UNAUTHORIZED_ACCESS", role: userRole, route: attemptedRoute });
  },

  logSessionExpired(user) {
    this._write({ event: "SESSION_EXPIRED", user: user?.name || "Unknown", role: user?.role || "—" });
  },

  logIdleTimeout(user) {
    this._write({ event: "IDLE_TIMEOUT", user: user?.name || "Unknown", role: user?.role || "—" });
  },
};

// ── 6. CSRF Nonce ─────────────────────────────────────────────

const CSRF_KEY = "nec_csrf_nonce";

/**
 * Generates and stores a CSRF nonce for the current session.
 * To be included in mutation API requests as X-CSRF-Token header.
 */
export const generateCsrfNonce = () => {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  sessionStorage.setItem(CSRF_KEY, nonce);
  return nonce;
};

export const getCsrfNonce = () => sessionStorage.getItem(CSRF_KEY) || generateCsrfNonce();

// ── 7. Settings page helpers ──────────────────────────────────

/**
 * Clear the cached translations for a given language code
 * so that the next language switch re-fetches from the API.
 */
export const invalidateTranslationCache = (langCode) => {
  localStorage.removeItem(`nec_live_trans_${langCode}`);
};
