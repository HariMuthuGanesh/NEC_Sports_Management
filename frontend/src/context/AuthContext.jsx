import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  buildSessionToken,
  isTokenExpired,
  getTokenExpiry,
  SecurityLogger,
} from "../utils/security";
import { TRANSLATIONS } from "../utils/translations";

const AuthContext = createContext();

export const ROLES = {
  PUBLIC: "Public Guest Portal",
  ADMIN: "Director of Physical Education",
  COORDINATOR: "Department Sports Coordinator",
  PLAYER: "Student Athlete",
};

// Idle timeout: 30 minutes of inactivity → auto-logout
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Warning shown 2 minutes before idle logout
const IDLE_WARNING_MS = 2 * 60 * 1000;

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("nec_sports_auth_user");
      return saved ? JSON.parse(saved) : { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    } catch {
      return { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    }
  });

  const [authToken, setTokenState] = useState(() => getAuthToken());
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [idleWarning, setIdleWarning] = useState(false);   // true → show "You'll be logged out soon" banner
  const [secondsUntilIdle, setSecondsUntilIdle] = useState(0);

  const [theme, setTheme] = useState(() => localStorage.getItem("nec_sports_theme") || "light");
  const [language, setLanguage] = useState(() =>
    localStorage.getItem("nec_sports_lang") || localStorage.getItem("sp-lang") || "en"
  );

  const idleTimerRef = useRef(null);
  const idleWarningTimerRef = useRef(null);
  const countdownRef = useRef(null);

  // ── Theme & Language persistence ──
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nec_sports_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("nec_sports_lang", language);
    localStorage.setItem("sp-lang", language);
  }, [language]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  // ── Idle Timeout Logic ──────────────────────────────────────

  const doIdleLogout = useCallback((user) => {
    SecurityLogger.logIdleTimeout(user);
    removeAuthToken();
    setTokenState(null);
    setSessionExpiresAt(null);
    setIdleWarning(false);
    const publicUser = { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    setCurrentUser(publicUser);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(publicUser));
  }, []);

  const clearIdleTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(idleWarningTimerRef.current);
    clearInterval(countdownRef.current);
    setIdleWarning(false);
  }, []);

  const resetIdleTimer = useCallback((user) => {
    clearIdleTimers();
    if (!user || user.role === ROLES.PUBLIC) return;

    // Show warning 2 min before
    idleWarningTimerRef.current = setTimeout(() => {
      setIdleWarning(true);
      let secs = Math.floor(IDLE_WARNING_MS / 1000);
      setSecondsUntilIdle(secs);
      countdownRef.current = setInterval(() => {
        secs -= 1;
        setSecondsUntilIdle(secs);
        if (secs <= 0) clearInterval(countdownRef.current);
      }, 1000);
    }, IDLE_TIMEOUT_MS - IDLE_WARNING_MS);

    // Auto-logout after full idle period
    idleTimerRef.current = setTimeout(() => {
      doIdleLogout(user);
    }, IDLE_TIMEOUT_MS);
  }, [clearIdleTimers, doIdleLogout]);

  // Listen for user activity to reset idle timer
  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    const onActivity = () => {
      if (idleWarning) setIdleWarning(false);
      resetIdleTimer(currentUser);
    };
    events.forEach(e => document.addEventListener(e, onActivity, { passive: true }));
    // Start timer on mount
    resetIdleTimer(currentUser);
    return () => {
      events.forEach(e => document.removeEventListener(e, onActivity));
      clearIdleTimers();
    };
  }, [currentUser, idleWarning, resetIdleTimer, clearIdleTimers]);

  // ── Token Expiry Checker (checks every 60s) ─────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getAuthToken();
      if (token && isTokenExpired(token) && currentUser?.role !== ROLES.PUBLIC) {
        SecurityLogger.logSessionExpired(currentUser);
        removeAuthToken();
        setTokenState(null);
        setSessionExpiresAt(null);
        const publicUser = { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
        setCurrentUser(publicUser);
        localStorage.setItem("nec_sports_auth_user", JSON.stringify(publicUser));
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ── Auth Actions ─────────────────────────────────────────────

  const setRole = (roleName) => {
    const prevRole = currentUser.role;
    let mockUser = { role: roleName };
    if (roleName === ROLES.ADMIN) {
      mockUser = { role: roleName, name: "Dr. K. Arumugam", title: "Director of Physical Education", dept: "Sports Office", id: "ADM01" };
    } else if (roleName === ROLES.COORDINATOR) {
      mockUser = { role: roleName, name: "Rahul Sharma", title: "CSE Sports Coordinator", dept: "CSE", id: "2112045" };
    } else if (roleName === ROLES.PLAYER) {
      mockUser = { role: roleName, name: "Priya Patel", title: "Student Athlete", dept: "MECH", id: "2114012" };
    } else {
      mockUser = { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    }

    const token = buildSessionToken(mockUser, 30);
    setTokenState(token);
    setAuthToken(token);
    setSessionExpiresAt(getTokenExpiry(token));

    SecurityLogger.logRoleChange(prevRole, roleName, mockUser);

    setCurrentUser(mockUser);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(mockUser));
    resetIdleTimer(mockUser);
  };

  const login = (userData, token = null) => {
    const generatedToken = token || buildSessionToken(userData, 30);
    setTokenState(generatedToken);
    setAuthToken(generatedToken);
    setSessionExpiresAt(getTokenExpiry(generatedToken));
    setCurrentUser(userData);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(userData));
    SecurityLogger.logLogin(userData);
    resetIdleTimer(userData);
  };

  const logout = () => {
    SecurityLogger.logLogout(currentUser);
    clearIdleTimers();
    removeAuthToken();
    setTokenState(null);
    setSessionExpiresAt(null);
    const publicUser = { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    setCurrentUser(publicUser);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(publicUser));
  };

  // "Stay logged in" — user dismissed idle warning
  const stayLoggedIn = useCallback(() => {
    resetIdleTimer(currentUser);
    setIdleWarning(false);
  }, [currentUser, resetIdleTimer]);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <AuthContext.Provider value={{
      currentUser,
      authToken,
      sessionExpiresAt,
      idleWarning,
      secondsUntilIdle,
      stayLoggedIn,
      setRole,
      login,
      logout,
      theme,
      toggleTheme,
      language,
      setLanguage,
      t,
      ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
