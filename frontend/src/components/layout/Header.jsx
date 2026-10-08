import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Menu, Globe, LogIn, Megaphone } from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";
import { notificationsApi } from "../../services/api/apiServices";
import NotificationDrawer from "../notifications/NotificationDrawer";
import "./Header.css";

export default function Header({ onToggleSidebar, isSidebarOpen, onSelectNav, activeNav }) {
  const { currentUser, language, setLanguage, t } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(() => {
    if (localStorage.getItem("nec_notif_pref") === "disabled") {
      setUnreadCount(0);
      return;
    }
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
      if (localStorage.getItem("nec_notif_pref") === "disabled") {
        setUnreadCount(0);
        return;
      }
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
          id="nec-menu-toggle"
          className="nec-menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Close navigation drawer" : "Open navigation drawer"}
          aria-expanded={isSidebarOpen}
          aria-controls="nec-sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="nec-brand" onClick={() => onSelectNav?.(currentUser?.role === ROLES.PUBLIC ? "public_home" : "public_home")}>
          <div className="nec-logo-emblem" style={{ background: '#ffffff', padding: '2px', border: '1.5px solid rgba(255,255,255,0.4)', width: '42px', height: '42px', overflow: 'hidden' }}>
            <img src="/assets/logo.jpg" alt="National Engineering College Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} />
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


        {/* Announcements shortcut: a second header action next to notifications */}
        <button
          type="button"
          className="nec-icon-btn"
          onClick={() => onSelectNav?.(currentUser.role === ROLES.ADMIN ? "admin_announcements" : "public_announcements")}
          title="Announcements"
          aria-label="Announcements"
        >
          <Megaphone size={18} />
        </button>

        {/* Guests get a sign-in button. Signed-in users see their profile and log out in the sidebar. */}
        {currentUser.role === ROLES.PUBLIC && (
          <button
            className="nec-header-signin-btn"
            onClick={() => onSelectNav?.("login")}
            title="Sign In to Sports Portal"
          >
            <LogIn size={15} />
            <span>{t.login || "Sign In"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
