import React from "react";
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
  Edit3,
  Bell,
  Home
} from "lucide-react";
import { useAuth, ROLES } from "../../context/AuthContext";
import "./Sidebar.css";

export default function Sidebar({ activeNav, onSelectNav, isOpen, onCloseMobile }) {
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
              { id: "admin_events", label: t.events, icon: Award }
            ]
          },
          {
            category: t.navManagement,
            items: [
              { id: "admin_regs", label: t.teamApprovals, icon: CheckSquare },
              { id: "admin_teams", label: t.teamsCatalog, icon: Users },
              { id: "admin_matches", label: t.matchScheduler, icon: Calendar },
              { id: "admin_venues", label: t.venues, icon: MapPin },
              { id: "admin_depts", label: t.departments, icon: Building2 }
            ]
          },
          {
            category: t.navCommReports,
            items: [
              { id: "admin_announcements", label: t.announcements, icon: Megaphone },
              { id: "admin_reports", label: t.institutionalReports, icon: FileText }
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
              { id: "coord_event_reg", label: t.eventRegistration, icon: CheckSquare },
              { id: "coord_matches", label: t.departmentMatches, icon: Calendar }
            ]
          },
          {
            category: t.navMatchDayActions,
            items: [
              { id: "coord_score_entry", label: t.scoreEntry, icon: Edit3 },
              { id: "coord_attendance", label: t.squadAttendance, icon: UserCheck },
              { id: "coord_media", label: t.mediaUpload, icon: Image }
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
              { id: "player_notifs", label: t.notifications, icon: Bell }
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
              { id: "public_gallery", label: t.gallery, icon: Image },
              { id: "public_announcements", label: t.announcements, icon: Megaphone }
            ]
          }
        ];
    }
  };

  const navGroups = getNavItems();

  return (
    <>
      {isOpen && <div className="nec-sidebar-overlay" onClick={onCloseMobile} />}
      <aside className={`nec-sidebar ${isOpen ? "open" : ""}`}>
        <div className="nec-sidebar-inner">
          <div className="nec-sidebar-header-badge">
            <span>{t.mode}: {currentUser.role}</span>
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
