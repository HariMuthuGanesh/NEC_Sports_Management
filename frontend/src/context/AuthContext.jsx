import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  isTokenExpired,
  getTokenExpiry,
  SecurityLogger,
} from "../utils/security";
import { TRANSLATIONS } from "../utils/translations";
import { getTranslations, hasTranslationCache, LANG_CODES } from "../utils/liveTranslator";

const AuthContext = createContext();

export const ROLES = {
  PUBLIC: "Public Guest Portal",
  ADMIN: "Admin",
  COORDINATOR: "Coordinator",
  CAPTAIN: "Captain",
  PLAYER: "Player",
};

// Idle timeout: 30 minutes of inactivity → auto-logout
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Warning shown 2 minutes before idle logout
const IDLE_WARNING_MS = 2 * 60 * 1000;

export function AuthProvider({ children }) {
  const publicUser = { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const token = getAuthToken();
      if (token && !isTokenExpired(token)) {
        const saved = localStorage.getItem("nec_sports_auth_user");
        if (saved) return JSON.parse(saved);
      }
    } catch { }
    return publicUser;
  });

  const [authToken, setTokenState] = useState(() => getAuthToken());
  const [sessionExpiresAt, setSessionExpiresAt] = useState(() => {
    const token = getAuthToken();
    return token ? getTokenExpiry(token) : null;
  });
  const [idleWarning, setIdleWarning] = useState(false);   // true → show "You'll be logged out soon" banner
  const [secondsUntilIdle, setSecondsUntilIdle] = useState(0);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || isTokenExpired(token)) {
      if (currentUser.role !== ROLES.PUBLIC) {
        setCurrentUser(publicUser);
        removeAuthToken();
        localStorage.removeItem("nec_sports_auth_user");
      }
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/me`, {
      credentials: "include",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(response => {
        if (response.ok) return response.json();
        if (response.status === 401 || response.status === 403) {
          setCurrentUser(publicUser);
          removeAuthToken();
          localStorage.removeItem("nec_sports_auth_user");
          setTokenState(null);
          setSessionExpiresAt(null);
        }
        return null;
      })
      .then(result => {
        if (result?.success && result.data) {
          setCurrentUser(result.data);
          localStorage.setItem("nec_sports_auth_user", JSON.stringify(result.data));
          setSessionExpiresAt(getTokenExpiry(token));
        }
      })
      .catch(() => {
        // Keep cached user if server is temporarily unreachable
      });
  }, []);

  const [theme, setTheme] = useState(() => localStorage.getItem("nec_sports_theme") || "light");
  const [language, setLanguageState] = useState(() =>
    localStorage.getItem("nec_sports_lang") || localStorage.getItem("sp-lang") || "en"
  );

  // Live translation state
  const [liveT, setLiveT] = useState(TRANSLATIONS.en);
  const [transProgress, setTransProgress] = useState(null); // null = hidden
  const [transDone, setTransDone] = useState(false);
  const [transLangLabel, setTransLangLabel] = useState("");
  const transAbortRef = useRef(null);

  const idleTimerRef = useRef(null);
  const idleWarningTimerRef = useRef(null);
  const countdownRef = useRef(null);

  // ── Theme & Language persistence ──
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nec_sports_theme", theme);
  }, [theme]);

  // ── Live Translation Loader ──────────────────────────────────
  useEffect(() => {
    // Cancel any in-flight translation request
    if (transAbortRef.current) transAbortRef.current.abort();
    const controller = new AbortController();
    transAbortRef.current = controller;

    if (language === "en") {
      setLiveT(TRANSLATIONS.en);
      setTransProgress(null);
      return;
    }

    const LANG_LABELS = { ta: "Tamil", hi: "Hindi", fr: "French", de: "German" };
    const label = LANG_LABELS[language] || language.toUpperCase();
    setTransLangLabel(label);

    // If we already have a cache, load instantly with no loading bar
    if (hasTranslationCache(language)) {
      getTranslations(language, { signal: controller.signal }).then(({ translations }) => {
        if (!controller.signal.aborted) setLiveT(translations);
      });
      return;
    }

    // No cache → show progress bar and fetch from API
    setTransProgress(0);
    setTransDone(false);

    getTranslations(language, {
      signal: controller.signal,
      onProgress: (pct) => setTransProgress(pct),
      onDone: () => {
        setTransDone(true);
        // Hide bar after 2.5s
        setTimeout(() => {
          setTransProgress(null);
          setTransDone(false);
        }, 2500);
      },
    }).then(({ translations }) => {
      if (!controller.signal.aborted) setLiveT(translations);
    });

    return () => controller.abort();
  }, [language]);

  useEffect(() => {
    localStorage.setItem("nec_sports_lang", language);
    localStorage.setItem("sp-lang", language);
  }, [language]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");

  const setLanguage = (lang) => {
    setLanguageState(lang);
  };

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

  const login = (userData, token = null) => {
    if (token) {
      if (isTokenExpired(token)) throw new Error("The server-issued authentication token has expired.");
      setTokenState(token);
      setAuthToken(token);
      setSessionExpiresAt(getTokenExpiry(token));
    } else {
      setTokenState(null);
      setSessionExpiresAt(null);
    }
    setCurrentUser(userData);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(userData));
    SecurityLogger.logLogin(userData);
    resetIdleTimer(userData);
  };

  const logout = async () => {
    SecurityLogger.logLogout(currentUser);
    try {
      await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Clear the local session even if the server is unavailable.
    }
    clearIdleTimers();
    removeAuthToken();
    setTokenState(null);
    setSessionExpiresAt(null);
    setCurrentUser(publicUser);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(publicUser));
  };

  // "Stay logged in" — user dismissed idle warning
  const stayLoggedIn = useCallback(() => {
    resetIdleTimer(currentUser);
    setIdleWarning(false);
  }, [currentUser, resetIdleTimer]);

  // Use liveT (auto-translated) rather than static TRANSLATIONS[language]
  const t = liveT;

  return (
    <AuthContext.Provider value={{
      currentUser,
      authToken,
      sessionExpiresAt,
      idleWarning,
      secondsUntilIdle,
      stayLoggedIn,
      login,
      logout,
      theme,
      toggleTheme,
      language,
      setLanguage,
      t,
      ROLES,
      // Live translation status (used by TranslationLoadingBar)
      transProgress,
      transDone,
      transLangLabel,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
