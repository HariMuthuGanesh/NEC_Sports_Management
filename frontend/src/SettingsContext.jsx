import { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS as CENTRAL_TRANSLATIONS } from "./utils/translations";

export const TRANSLATIONS = CENTRAL_TRANSLATIONS;

/* ── Context ──────────────────────────────────────────────────────────────── */
export const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem("sp-theme") || "light";
  });
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem("sp-lang") || "en";
  });

  const setTheme = (t) => {
    setThemeState(t);
    localStorage.setItem("sp-theme", t);
  };

  const setLanguage = (l) => {
    setLanguageState(l);
    localStorage.setItem("sp-lang", l);
  };

  // Apply theme to document root (for Dashboard CSS variables)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    }
  }, [theme]);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
