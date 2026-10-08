import React, { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  CheckSquare,
  MapPin,
  Building2,
  FileText,
  Megaphone,
  Radio,
  Image,
  Award,
  UserCheck,
  X,
  Edit3,
  Bell,
  Home,
  Shield,
  Settings,
  LogIn,
  FileCheck
} from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";
import "./Sidebar.css";

export default function Sidebar({ activeNav, onSelectNav, isOpen, onCloseMobile }) {
  const asideRef = useRef(null);
  // Keep the latest close handler in a ref so the effect below does not re-run (and re-focus) on every render.
  const closeRef = useRef(onCloseMobile);
  useEffect(() => {
    closeRef.current = onCloseMobile;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const aside = asideRef.current;
    const getFocusable = () => (aside ? Array.from(aside.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )) : []);

    const first = getFocusable()[0];
    if (first) first.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const inside = aside && aside.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === firstEl)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === lastEl)) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const { currentUser, t } = useAuth();

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

  return (
    <>
      {isOpen && <div className="nec-sidebar-overlay" onClick={onCloseMobile} />}
      <aside
        ref={asideRef}
        id="nec-sidebar"
        className={`nec-sidebar ${isOpen ? "open" : ""}`}
        aria-label="Main navigation"
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: "" } : {})}
      >
        <div className="nec-sidebar-inner">
          {/* Close control sits at the top-right of the side panel (Task 6). */}
          <div className="nec-sidebar-topbar">
            <button
              type="button"
              className="nec-sidebar-close-btn"
              onClick={onCloseMobile}
              aria-label="Close navigation drawer"
            >
              <X size={18} />
            </button>
          </div>
          <nav className="nec-sidebar-nav">
            {navGroups.map((group, idx) => (
              <div key={idx} className="nec-nav-group">
                <div className="nec-nav-category">{group.category}</div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`nec-nav-item ${isActive ? "active" : ""}`}
                      onClick={() => {
                        onSelectNav(item.id);
                        onCloseMobile();
                      }}
                    >
                      <Icon className="nec-nav-icon" size={18} />
                      <span className="nec-nav-label">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="nec-sidebar-footer">
            {/* Settings link — hidden for public guests */}
            {currentUser.role !== ROLES.PUBLIC && (
              <button
                className={`nec-nav-item ${activeNav === "settings" ? "active" : ""}`}
                onClick={() => { onSelectNav("settings"); onCloseMobile(); }}
                style={{ width: "100%", marginBottom: "10px" }}
              >
                <Settings className="nec-nav-icon" size={18} />
                <span className="nec-nav-label">Settings</span>
              </button>
            )}
            <div className="nec-lasa-tag">
              <span>{t.lasaTag}</span>
              <span className="nec-tag-sub">{t.lasaSub}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
