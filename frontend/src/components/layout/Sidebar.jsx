import React, { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Trophy, Calendar, Users, CheckSquare, MapPin, Building2, FileText,
  Megaphone, Radio, Image, Award, UserCheck, X, Edit3, Bell, Home, Shield, Settings,
  LogIn, FileCheck, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, User, LogOut
} from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import "./Sidebar.css";

// Sidebar modes:
//  - "docked": persistent column on desktop. Expanded, or collapsed to an icon rail with flyouts.
//  - "drawer": full-height overlay on small screens, opened from the header toggle.
// Multi-item categories become collapsible groups. In rail mode each group opens a flyout.

function NavButton({ item, active, showLabel, onActivate }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className={`nec-nav-item ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      aria-label={showLabel ? undefined : item.label}
      onClick={() => onActivate(item.id)}
    >
      <Icon className="nec-nav-icon" size={18} aria-hidden="true" />
      {showLabel && <span className="nec-nav-label">{item.label}</span>}
      {!showLabel && <span className="nec-rail-tooltip" aria-hidden="true">{item.label}</span>}
    </button>
  );
}

export default function Sidebar({
  activeNav,
  onSelectNav,
  variant = "docked",
  collapsed = false,
  onToggleCollapse,
  drawerOpen = false,
  onCloseDrawer,
  width = 248,
  onWidthChange,
  onCollapsedChange,
}) {
  const asideRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const closeRef = useRef(onCloseDrawer);
  useEffect(() => { closeRef.current = onCloseDrawer; });

  const isDrawer = variant === "drawer";
  const RAIL_W = 72;
  const MIN_W = 200;
  const MAX_W = 360;
  const SNAP_W = 120; // dragging narrower than this collapses to the icon rail
  const isRail = !isDrawer && collapsed;
  const isHidden = isDrawer && !drawerOpen;

  // Focus trap + Escape only while the mobile drawer is open.
  useEffect(() => {
    if (!isDrawer || !drawerOpen) return undefined;
    const aside = asideRef.current;
    const getFocusable = () => (aside ? Array.from(aside.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )) : []);
    getFocusable()[0]?.focus();
    const onKeyDown = (e) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current?.(); return; }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const inside = aside && aside.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === firstEl)) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === lastEl)) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isDrawer, drawerOpen]);

  const { currentUser, t, theme, toggleTheme, logout } = useAuth();

  const getNavItems = () => {
    switch (currentUser.role) {
      case ROLES.ADMIN:
        return [
          { category: t.navOverview, items: [{ id: "admin_dash", label: t.dashboard, icon: LayoutDashboard }] },
          {
            category: t.navSports,
            items: [
              { id: "admin_sports", label: t.sportsCatalog, icon: Trophy },
              { id: "admin_tournaments", label: t.tournaments, icon: Calendar },
              { id: "admin_events", label: t.events, icon: Award },
              { id: "admin_levels", label: "Competition Levels", icon: Award }
            ]
          },
          {
            category: t.navManagement,
            items: [
              { id: "admin_teams", label: "Team Approvals & Catalog", icon: Users },
              { id: "admin_students", label: "Student Registry", icon: UserCheck },
              { id: "admin_depts", label: "Departments", icon: Building2 },
              { id: "admin_staff", label: "Staff Coordinators", icon: UserCheck },
              { id: "admin_matches", label: t.matchScheduler, icon: Calendar },
              { id: "admin_venues", label: t.venues, icon: MapPin },
              { id: "admin_od", label: "On Duty Requests", icon: FileText }
            ]
          },
          {
            category: t.navCommReports,
            items: [
              { id: "admin_gallery", label: "Gallery Manager", icon: Image },
              { id: "admin_announcements", label: t.announcements, icon: Megaphone },
              { id: "admin_reports", label: t.institutionalReports, icon: FileText },
              { id: "admin_audit", label: "Security Audit Log", icon: Shield }
            ]
          }
        ];

      case ROLES.COORDINATOR:
        return [
          { category: t.navCoordPortal, items: [{ id: "coord_dash", label: t.dashboard, icon: LayoutDashboard }] },
          {
            category: t.navSquadEvents,
            items: [
              { id: "coord_players", label: t.playerRoster, icon: Users },
              { id: "coord_dept_teams", label: "Sport Captains", icon: Award },
              { id: "coord_event_reg", label: t.eventRegistration, icon: CheckSquare },
              { id: "coord_matches", label: t.departmentMatches, icon: Calendar },
              { id: "notifications", label: t.notifications, icon: Bell }
            ]
          },
          {
            category: t.navMatchDayActions,
            items: [
              { id: "coord_attendance", label: t.squadAttendance, icon: UserCheck },
              { id: "coord_media", label: t.mediaUpload, icon: Image },
              { id: "coord_od", label: "On Duty Requests", icon: FileText }
            ]
          }
        ];

      case ROLES.PRESIDENT:
        return [
          { category: "President Portal", items: [{ id: "president_dash", label: "College Sports Overview", icon: LayoutDashboard }] },
          {
            category: "Outer-College Competitions",
            items: [
              { id: "college_teams", label: "Outer-College Teams", icon: Building2 },
              { id: "admin_tournaments", label: "Tournaments & Events", icon: Calendar },
              { id: "president_od", label: "OD Information Matrix", icon: FileText },
              { id: "notifications", label: t.notifications || "Notifications", icon: Bell }
            ]
          }
        ];

      case ROLES.SCORE_UPDATER:
        return [
          { category: "Score Operations", items: [{ id: "coord_score_entry", label: "Sports Score Board", icon: Edit3 }] },
          {
            category: "Matches",
            items: [
              { id: "coord_matches", label: "All Scheduled & Ongoing", icon: Calendar },
              { id: "notifications", label: t.notifications || "Notifications", icon: Bell }
            ]
          }
        ];

      case ROLES.CAPTAIN:
        return [
          { category: "Captain Portal", items: [{ id: "captain_dash", label: "Captain Workspace", icon: Trophy }] },
          {
            category: "Squad & Fixtures",
            items: [
              { id: "captain_roster", label: "My Sports Squad", icon: Users },
              { id: "coord_matches", label: "Tournament Fixtures", icon: Calendar },
              { id: "notifications", label: t.notifications || "Notifications", icon: Bell }
            ]
          }
        ];

      case ROLES.PLAYER:
        return [
          { category: t.navPlayerPortal, items: [{ id: "player_dash", label: t.dashboard, icon: LayoutDashboard }] },
          {
            category: t.navMySports,
            items: [
              { id: "player_team", label: t.myTeam, icon: Users },
              { id: "player_matches", label: t.myFixtures, icon: Calendar },
              { id: "player_performance", label: "Performance Report", icon: Award },
              { id: "notifications", label: t.notifications, icon: Bell }
            ]
          }
        ];

      case ROLES.PUBLIC:
      default:
        return [
          {
            category: t.navPublicPortal,
            items: [
              { id: "public_home", label: t.home, icon: Home },
              { id: "public_live", label: t.liveScores, icon: Radio },
              { id: "public_fixtures", label: t.fixtures, icon: Calendar },
              { id: "public_leaderboard", label: t.leaderboard, icon: Trophy },
              { id: "public_od_list", label: "OD List", icon: FileCheck },
              { id: "public_gallery", label: t.gallery, icon: Image },
              { id: "public_announcements", label: t.announcements, icon: Megaphone },
              { id: "login", label: t.login || "Portal Sign In", icon: LogIn }
            ]
          }
        ];
    }
  };

  const navGroups = getNavItems();

  // Drag the right edge to resize. Narrower than SNAP_W collapses to the icon rail.
  const onResizeStart = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const left = asideRef.current?.getBoundingClientRect().left ?? 0;
    setDragging(true);
    const move = (ev) => {
      const raw = ev.clientX - left;
      if (raw < SNAP_W) {
        onCollapsedChange?.(true);
      } else {
        onCollapsedChange?.(false);
        onWidthChange?.(Math.min(MAX_W, Math.max(MIN_W, Math.round(raw))));
      }
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  // Keyboard resize: arrows change width, Home/End jump to min/max, Enter/Space toggles the rail.
  const onResizeKey = (e) => {
    const step = 16;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (collapsed) { onCollapsedChange?.(false); onWidthChange?.(MIN_W); }
      else onWidthChange?.(Math.min(MAX_W, width + step));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (collapsed) return;
      if (width - step < SNAP_W) onCollapsedChange?.(true);
      else onWidthChange?.(Math.max(MIN_W, width - step));
    } else if (e.key === "Home") {
      e.preventDefault(); onCollapsedChange?.(false); onWidthChange?.(MIN_W);
    } else if (e.key === "End") {
      e.preventDefault(); onCollapsedChange?.(false); onWidthChange?.(MAX_W);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); onToggleCollapse?.();
    }
  };

  // Same sign-out behaviour the header used to have.
  const toastContext = useToast();
  const toast = toastContext?.toast || toastContext;
  const handleSignOut = async () => {
    await logout();
    if (toast?.success) toast.success("Signed out successfully.");
    else if (typeof toast === "function") toast({ type: "success", message: "Signed out successfully." });
    onSelectNav("public_home");
    onCloseDrawer?.();
  };
  const profileName = currentUser?.name || currentUser?.username || "";
  const profileSub = currentUser?.dept || currentUser?.role || "";
  const isPublic = currentUser?.role === ROLES.PUBLIC;
  const [openGroups, setOpenGroups] = useState({});
  const [flyoutKey, setFlyoutKey] = useState(null);

  // Group is open unless the user closed it. The group holding the active page always opens.
  const isGroupOpen = (key) => openGroups[key] !== false;
  const toggleGroup = (key) => setOpenGroups(prev => ({ ...prev, [key]: !isGroupOpen(key) }));

  useEffect(() => {
    const owner = navGroups.find(g => g.items.some(i => i.id === activeNav));
    if (owner) setOpenGroups(prev => (prev[owner.category] === false ? { ...prev, [owner.category]: true } : prev));
  }, [activeNav]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setFlyoutKey(null); }, [collapsed, variant]);

  const activate = (id) => {
    onSelectNav(id);
    if (isDrawer) onCloseDrawer?.();
    setFlyoutKey(null);
  };

  const showLabel = !isRail;

  return (
    <>
      {isDrawer && drawerOpen && <div className="nec-sidebar-overlay" onClick={onCloseDrawer} />}
      <aside
        ref={asideRef}
        id="nec-sidebar"
        className={[
          "nec-sidebar",
          isDrawer ? "nec-sidebar--drawer" : "nec-sidebar--docked",
          isRail ? "is-rail" : "",
          isDrawer && drawerOpen ? "open" : "",
          dragging ? "is-dragging" : "",
        ].join(" ")}
        style={isDrawer ? undefined : { width: isRail ? RAIL_W : width, minWidth: isRail ? RAIL_W : width }}
        aria-label="Main navigation"
        aria-hidden={isHidden ? "true" : undefined}
        {...(isHidden ? { inert: "" } : {})}
      >
        <div className="nec-sidebar-inner">
          <div className="nec-sidebar-head">
            {isPublic ? (
              <button type="button" className="nec-sidebar-profile nec-sidebar-signin" onClick={() => activate("login")} aria-label="Sign in to the sports portal">
                <span className="nec-sidebar-avatar" aria-hidden="true"><LogIn size={16} /></span>
                {showLabel && <span className="nec-sidebar-profile-text"><span className="nec-sidebar-profile-name">Sign in</span><span className="nec-sidebar-profile-sub">Sports portal</span></span>}
              </button>
            ) : (
              <div className="nec-sidebar-profile" title={profileName}>
                <span className="nec-sidebar-avatar" aria-hidden="true"><User size={16} /></span>
                {showLabel && (
                  <span className="nec-sidebar-profile-text">
                    <span className="nec-sidebar-profile-name">{profileName}</span>
                    {profileSub && <span className="nec-sidebar-profile-sub">{profileSub}</span>}
                  </span>
                )}
              </div>
            )}
            {showLabel && !isPublic && (
              <button type="button" className="nec-sidebar-icon-btn nec-sidebar-signout" onClick={handleSignOut} aria-label="Log out" title="Log out">
                <LogOut size={16} />
              </button>
            )}
            {isDrawer && (
              <button type="button" className="nec-sidebar-icon-btn" onClick={onCloseDrawer} aria-label="Close navigation drawer">
                <X size={18} />
              </button>
            )}
            {!isDrawer && (
              <button
                type="button"
                className="nec-sidebar-icon-btn nec-sidebar-collapse-btn"
                onClick={onToggleCollapse}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-controls="nec-sidebar-nav"
              >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
          </div>

          <nav id="nec-sidebar-nav" className="nec-sidebar-nav" aria-label="Sections">
            {navGroups.map((group) => {
              const single = group.items.length === 1;
              if (single) {
                const item = group.items[0];
                return (
                  <ul key={group.category} className="nec-nav-list">
                    <li className="nec-nav-li">
                      <NavButton item={item} active={activeNav === item.id} showLabel={showLabel} onActivate={activate} />
                    </li>
                  </ul>
                );
              }
              const open = isGroupOpen(group.category);
              const GroupIcon = group.items.find(i => i.id === activeNav)?.icon || group.items[0].icon;
              const hasActive = group.items.some(i => i.id === activeNav);
              const flyoutOpen = isRail && flyoutKey === group.category;
              return (
                <div
                  key={group.category}
                  className={`nec-nav-group ${hasActive ? "has-active" : ""}`}
                  onMouseLeave={() => isRail && setFlyoutKey(k => (k === group.category ? null : k))}
                  onKeyDown={(e) => { if (e.key === "Escape") setFlyoutKey(null); }}
                  onBlur={(e) => {
                    if (isRail && !e.currentTarget.contains(e.relatedTarget)) setFlyoutKey(k => (k === group.category ? null : k));
                  }}
                >
                  {isRail ? (
                    <>
                      <button
                        type="button"
                        className={`nec-nav-item nec-nav-group-btn ${hasActive ? "active" : ""}`}
                        aria-haspopup="menu"
                        aria-expanded={flyoutOpen}
                        aria-label={group.category}
                        onMouseEnter={() => setFlyoutKey(group.category)}
                        onClick={() => setFlyoutKey(k => (k === group.category ? null : group.category))}
                      >
                        <GroupIcon className="nec-nav-icon" size={18} aria-hidden="true" />
                        <span className="nec-rail-tooltip" aria-hidden="true">{group.category}</span>
                      </button>
                      {flyoutOpen && (
                        <div className="nec-flyout" role="menu" aria-label={group.category}>
                          <div className="nec-flyout-title">{group.category}</div>
                          {group.items.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              role="menuitem"
                              className={`nec-flyout-item ${activeNav === item.id ? "active" : ""}`}
                              aria-current={activeNav === item.id ? "page" : undefined}
                              onClick={() => activate(item.id)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="nec-nav-group-btn nec-nav-category"
                        aria-expanded={open}
                        aria-controls={`nec-group-${group.category.replace(/\W+/g, "-")}`}
                        onClick={() => toggleGroup(group.category)}
                      >
                        <span>{group.category}</span>
                        <ChevronDown size={14} className={`nec-group-chevron ${open ? "open" : ""}`} aria-hidden="true" />
                      </button>
                      <ul
                        id={`nec-group-${group.category.replace(/\W+/g, "-")}`}
                        className={`nec-nav-list nec-nav-sub ${open ? "open" : ""}`}
                        hidden={!open}
                      >
                        {group.items.map(item => (
                          <li key={item.id} className="nec-nav-li">
                            <NavButton item={item} active={activeNav === item.id} showLabel onActivate={activate} />
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="nec-sidebar-footer">
            <div className="nec-theme-switch" role="group" aria-label="Theme">
              <button type="button" className={`nec-theme-option ${theme === "light" ? "active" : ""}`} aria-pressed={theme === "light"} onClick={() => theme !== "light" && toggleTheme()} title="Light theme">
                <Sun size={16} aria-hidden="true" />
                {showLabel && <span>Light</span>}
              </button>
              <button type="button" className={`nec-theme-option ${theme === "dark" ? "active" : ""}`} aria-pressed={theme === "dark"} onClick={() => theme !== "dark" && toggleTheme()} title="Dark theme">
                <Moon size={16} aria-hidden="true" />
                {showLabel && <span>Dark</span>}
              </button>
            </div>

            {isRail && !isPublic && (
              <button type="button" className="nec-nav-item nec-signout-rail" onClick={handleSignOut} aria-label="Log out">
                <LogOut className="nec-nav-icon" size={18} aria-hidden="true" />
                <span className="nec-rail-tooltip" aria-hidden="true">Log out</span>
              </button>
            )}

            {currentUser.role !== ROLES.PUBLIC && (
              <button
                type="button"
                className={`nec-nav-item nec-settings-item ${activeNav === "settings" ? "active" : ""}`}
                aria-current={activeNav === "settings" ? "page" : undefined}
                aria-label={showLabel ? undefined : "Settings"}
                onClick={() => activate("settings")}
              >
                <Settings className="nec-nav-icon" size={18} aria-hidden="true" />
                {showLabel && <span className="nec-nav-label">Settings</span>}
                {!showLabel && <span className="nec-rail-tooltip" aria-hidden="true">Settings</span>}
              </button>
            )}

            {showLabel && (
              <div className="nec-lasa-tag">
                <span>{t.lasaTag}</span>
                <span className="nec-tag-sub">{t.lasaSub}</span>
              </div>
            )}
          </div>
        </div>
        {!isDrawer && (
          <div
            className={`nec-sidebar-resizer ${dragging ? "dragging" : ""}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar. Drag, or use arrow keys."
            aria-valuemin={MIN_W}
            aria-valuemax={MAX_W}
            aria-valuenow={isRail ? RAIL_W : width}
            tabIndex={0}
            onPointerDown={onResizeStart}
            onKeyDown={onResizeKey}
            onDoubleClick={onToggleCollapse}
            title="Drag to resize. Double-click to collapse."
          />
        )}
      </aside>
    </>
  );
}
