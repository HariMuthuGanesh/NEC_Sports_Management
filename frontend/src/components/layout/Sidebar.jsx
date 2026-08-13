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
  const { currentUser } = useAuth();

  const getNavItems = () => {
    switch (currentUser.role) {
      case ROLES.ADMIN:
        return [
          { category: "OVERVIEW", items: [{ id: "admin_dash", label: "Dashboard", icon: LayoutDashboard }] },
          {
            category: "SPORTS",
            items: [
              { id: "admin_sports", label: "Sports Catalog", icon: Trophy },
              { id: "admin_tournaments", label: "Tournaments", icon: Calendar },
              { id: "admin_events", label: "Events", icon: Award }
            ]
          },
          {
            category: "MANAGEMENT",
            items: [
              { id: "admin_regs", label: "Team Approvals", icon: CheckSquare },
              { id: "admin_teams", label: "Teams Catalog", icon: Users },
              { id: "admin_matches", label: "Match Scheduler", icon: Calendar },
              { id: "admin_venues", label: "Venues", icon: MapPin },
              { id: "admin_depts", label: "Departments", icon: Building2 }
            ]
          },
          {
            category: "COMMUNICATION & REPORTS",
            items: [
              { id: "admin_announcements", label: "Announcements", icon: Megaphone },
              { id: "admin_reports", label: "Institutional Reports", icon: FileText }
            ]
          }
        ];

      case ROLES.COORDINATOR:
        return [
          { category: "COORDINATOR PORTAL", items: [{ id: "coord_dash", label: "Dashboard", icon: LayoutDashboard }] },
          {
            category: "SQUAD & EVENTS",
            items: [
              { id: "coord_players", label: "Player Roster", icon: Users },
              { id: "coord_event_reg", label: "Event Registration", icon: CheckSquare },
              { id: "coord_matches", label: "Department Matches", icon: Calendar }
            ]
          },
          {
            category: "MATCH DAY ACTIONS",
            items: [
              { id: "coord_score_entry", label: "Score Entry", icon: Edit3 },
              { id: "coord_attendance", label: "Squad Attendance", icon: UserCheck },
              { id: "coord_media", label: "Media Upload", icon: Image }
            ]
          }
        ];

      case ROLES.PLAYER:
        return [
          { category: "PLAYER PORTAL", items: [{ id: "player_dash", label: "Dashboard", icon: LayoutDashboard }] },
          {
            category: "MY SPORTS",
            items: [
              { id: "player_team", label: "My Team", icon: Users },
              { id: "player_matches", label: "My Fixtures", icon: Calendar },
              { id: "player_notifs", label: "Notifications", icon: Bell }
            ]
          }
        ];

      case ROLES.PUBLIC:
      default:
        return [
          {
            category: "PUBLIC SPORTS PORTAL",
            items: [
              { id: "public_home", label: "Home", icon: Home },
              { id: "public_live", label: "Live Scores", icon: Radio },
              { id: "public_fixtures", label: "Fixtures", icon: Calendar },
              { id: "public_leaderboard", label: "Leaderboard", icon: Trophy },
              { id: "public_gallery", label: "Gallery", icon: Image },
              { id: "public_announcements", label: "Announcements", icon: Megaphone }
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
            <span>Mode: {currentUser.role}</span>
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
              <span>Lakshmi Ammal Sports Academy</span>
              <span className="nec-tag-sub">NEC Campus Ecosystem</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
