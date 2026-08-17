import React, { useState } from "react";
import { Sun, Moon, Bell, Menu, X, Shield, User, Trophy, Globe } from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";
import NotificationDrawer from "../notifications/NotificationDrawer";
import "./Header.css";

export default function Header({ onToggleSidebar, isSidebarOpen, onRoleChange }) {
  const { currentUser, setRole, theme, toggleTheme, language, setLanguage, t } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const LANGUAGES = [
    { code: "en", label: "English" },
    { code: "ta", label: "தமிழ் (Tamil)" },
    { code: "hi", label: "हिंदी (Hindi)" }
  ];

  return (
    <header className="nec-header">
      <div className="nec-header-left">
        <button
          className="nec-menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation drawer"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="nec-brand">
          <div className="nec-logo-emblem">
            <Trophy size={20} className="nec-logo-icon" />
          </div>
          <div className="nec-brand-text">
            <h1 className="nec-college-name">{t.collegeName}</h1>
            <span className="nec-system-title">{t.systemTitle}</span>
          </div>
        </div>
      </div>

      <div className="nec-header-right">
        {/* Language Switcher */}
        <div className="nec-role-switcher-dropdown">
          <button
            className="nec-role-badge-btn"
            onClick={() => {
              setShowLangMenu(prev => !prev);
              setShowRoleMenu(false);
            }}
            title={t.switchLanguage}
            aria-expanded={showLangMenu}
            aria-haspopup="menu"
          >
            <Globe size={14} />
            <span>{language.toUpperCase()}</span>
          </button>

          {showLangMenu && (
            <div className="nec-role-menu" onClick={() => setShowLangMenu(false)}>
              <div className="nec-role-menu-header">{t.selectLanguage}</div>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  className={`nec-role-menu-item ${language === l.code ? "active" : ""}`}
                  onClick={() => setLanguage(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Role Switcher Pill for demo */}
        <div className="nec-role-switcher-dropdown">
          <button
            className="nec-role-badge-btn"
            onClick={() => {
              setShowRoleMenu(prev => !prev);
              setShowLangMenu(false);
            }}
            title={t.switchRole}
            aria-expanded={showRoleMenu}
            aria-haspopup="menu"
          >
            <Shield size={14} />
            <span>{currentUser.role}</span>
          </button>

          {showRoleMenu && (
            <div className="nec-role-menu" onClick={() => setShowRoleMenu(false)}>
              <div className="nec-role-menu-header">{t.selectRole}</div>
              {Object.values(ROLES).map(r => (
                <button
                  key={r}
                  className={`nec-role-menu-item ${currentUser.role === r ? "active" : ""}`}
                  onClick={() => {
                    setRole(r);
                    if (typeof onRoleChange === "function") {
                      onRoleChange(r);
                    }
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <div className="nec-notif-wrapper">
          <button
            className="nec-icon-btn"
            onClick={() => setShowNotifs(prev => !prev)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="nec-notif-dot" />
          </button>

          {showNotifs && <NotificationDrawer onClose={() => setShowNotifs(false)} />}
        </div>

        {/* Theme Toggle */}
        <button
          className="nec-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Profile Pill */}
        <div className="nec-user-profile">
          <div className="nec-avatar">
            <User size={16} />
          </div>
          <div className="nec-user-info">
            <span className="nec-user-name">{currentUser.name}</span>
            <span className="nec-user-dept">{currentUser.dept || "NEC"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
