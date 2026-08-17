import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuthToken, setAuthToken, removeAuthToken } from "../utils/security";
import { TRANSLATIONS } from "../utils/translations";

const AuthContext = createContext();

export const ROLES = {
  PUBLIC: "Public Guest Portal",
  ADMIN: "Director of Physical Education",
  COORDINATOR: "Department Sports Coordinator",
  PLAYER: "Student Athlete"
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem("nec_sports_auth_user");
      return saved ? JSON.parse(saved) : { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    } catch (e) {
      return { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    }
  });

  const [authToken, setTokenState] = useState(() => getAuthToken());

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("nec_sports_theme") || "light";
  });

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("nec_sports_lang") || localStorage.getItem("sp-lang") || "en";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nec_sports_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("nec_sports_lang", language);
    localStorage.setItem("sp-lang", language);
  }, [language]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  const setRole = (roleName) => {
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

    // Generate mock JWT token for role preview
    const dummyToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(mockUser))}.signature`;
    setTokenState(dummyToken);
    setAuthToken(dummyToken);

    setCurrentUser(mockUser);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(mockUser));
  };

  const login = (userData, token = null) => {
    if (token) {
      setTokenState(token);
      setAuthToken(token);
    }
    setCurrentUser(userData);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(userData));
  };

  const logout = () => {
    removeAuthToken();
    setTokenState(null);
    const publicUser = { role: ROLES.PUBLIC, name: "Guest Visitor", dept: "All", id: null };
    setCurrentUser(publicUser);
    localStorage.setItem("nec_sports_auth_user", JSON.stringify(publicUser));
  };

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <AuthContext.Provider value={{
      currentUser,
      authToken,
      setRole,
      login,
      logout,
      theme,
      toggleTheme,
      language,
      setLanguage,
      t,
      ROLES
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
