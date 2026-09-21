import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sun, Moon, Bell, Menu, X, User, Globe, Settings, LogIn, LogOut } from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";
import { notificationsApi } from "../../services/api/apiServices";
import NotificationDrawer from "../notifications/NotificationDrawer";
import "./Header.css";

export default function Header({ onToggleSidebar, isSidebarOpen, onSelectNav, activeNav }) {
  const { currentUser, logout, theme, toggleTheme, language, setLanguage, t } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(() => {
    if (currentUser?.role && currentUser.role !== ROLES.PUBLIC) {
      notificationsApi.getNotifications()
        .then(data => {
          if (Array.isArray(data)) {
            setUnreadCount(data.filter(n => !n.read && !n.is_read).length);
          } else {
            setUnreadCount(0);
          }
        })
        .catch(() => setUnreadCount(0));
    } else {
      setUnreadCount(0);
    }
  }, [currentUser?.role, currentUser?.id]);

  useEffect(() => {
    fetchUnreadCount();

    const handleNotificationsUpdated = (e) => {
      if (e?.detail?.unreadCount !== undefined) {
        setUnreadCount(e.detail.unreadCount);
      } else {
        fetchUnreadCount();
      }
    };

    const handleFocus = () => {
      fetchUnreadCount();
    };

    window.addEventListener("notifications-updated", handleNotificationsUpdated);
    window.addEventListener("focus", handleFocus);

    const interval = setInterval(fetchUnreadCount, 45000);

    return () => {
      window.removeEventListener("notifications-updated", handleNotificationsUpdated);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [fetchUnreadCount, activeNav]);

  // Click outside to close notification drawer
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDrawer(false);
      }
    };
    if (showNotifDrawer) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifDrawer]);

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
          <div className="nec-logo-emblem" style={{ background: '#fff', padding: '2px' }}>
            <img src="/assets/logo.jpg" alt="NEC Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} />
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

        {/* Notifications Icon (Only for authenticated users, hidden for Guests) */}
        {currentUser.role !== ROLES.PUBLIC && (
          <div className="nec-notif-wrapper" ref={notifRef}>
            <button
              className={`nec-icon-btn ${showNotifDrawer ? "active" : ""}`}
              onClick={() => setShowNotifDrawer(prev => !prev)}
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "Notifications"}
              aria-label="Notifications"
              aria-expanded={showNotifDrawer}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="nec-notif-dot" />}
            </button>

            {showNotifDrawer && (
              <NotificationDrawer
                onClose={() => setShowNotifDrawer(false)}
                onUpdateCount={(count) => setUnreadCount(count)}
                onSelectNav={(nav) => {
                  setShowNotifDrawer(false);
                  onSelectNav?.(nav);
                }}
              />
            )}
          </div>
        )}


        {/* Settings Button (Hidden for Guests) */}
        {currentUser.role !== ROLES.PUBLIC && (
          <button
            className="nec-icon-btn"
            onClick={() => onSelectNav?.("settings")}
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          className="nec-icon-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Portal Sign In for Guest or User Profile Pill */}
        {currentUser.role === ROLES.PUBLIC ? (
          <button
            className="nec-header-signin-btn"
            onClick={() => onSelectNav?.("login")}
            title="Sign In to Sports Portal"
          >
            <LogIn size={15} />
            <span>{t.login || "Sign In"}</span>
          </button>
        ) : (
          <div className="nec-user-profile-wrapper">
            <div className="nec-user-profile">
              <div className="nec-avatar">
                <User size={16} />
              </div>
              <div className="nec-user-info">
                <span className="nec-user-name">{currentUser.name}</span>
                <span className="nec-user-dept">{currentUser.dept || "NEC"}</span>
              </div>
            </div>
            <button
              className="nec-icon-btn nec-logout-btn"
              onClick={() => {
                logout();
                onSelectNav?.("public_home");
              }}
              title="Log Out / Return to Guest"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
