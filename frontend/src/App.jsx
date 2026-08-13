import React, { useState } from "react";
import { AuthProvider, useAuth, ROLES } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";

// Public Pages
import PublicHome from "./pages/public/PublicHome";
import PublicLiveScores from "./pages/public/PublicLiveScores";
import PublicFixtures from "./pages/public/PublicFixtures";
import PublicLeaderboard from "./pages/public/PublicLeaderboard";
import PublicGallery from "./pages/public/PublicGallery";
import PublicAnnouncements from "./pages/public/PublicAnnouncements";

// Admin / PT Sir Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import TournamentsManager from "./pages/admin/TournamentsManager";
import RegistrationsManager from "./pages/admin/RegistrationsManager";
import MatchesManager from "./pages/admin/MatchesManager";
import ReportsManager from "./pages/admin/ReportsManager";

// Coordinator Pages
import CoordinatorDashboard from "./pages/coordinator/CoordinatorDashboard";
import RosterManager from "./pages/coordinator/RosterManager";
import ScoreEntry from "./pages/coordinator/ScoreEntry";
import AttendanceMarker from "./pages/coordinator/AttendanceMarker";

// Player Pages
import PlayerDashboard from "./pages/player/PlayerDashboard";

// Auth Page
import LoginPage from "./pages/auth/LoginPage";

function MainApp() {
  const { currentUser, ROLES } = useAuth();
  const [activeNav, setActiveNav] = useState("public_home");
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Fallback to default route if role changes
  const renderContent = () => {
    switch (activeNav) {
      // Public Routes
      case "public_home":
        return <PublicHome onNavigate={(nav) => setActiveNav(nav)} />;
      case "public_live":
        return <PublicLiveScores />;
      case "public_fixtures":
        return <PublicFixtures />;
      case "public_leaderboard":
        return <PublicLeaderboard />;
      case "public_gallery":
        return <PublicGallery />;
      case "public_announcements":
        return <PublicAnnouncements />;

      // Admin Routes
      case "admin_dash":
        return <AdminDashboard onNavigate={(nav) => setActiveNav(nav)} />;
      case "admin_sports":
      case "admin_tournaments":
      case "admin_events":
        return <TournamentsManager />;
      case "admin_regs":
        return <RegistrationsManager />;
      case "admin_teams":
      case "admin_matches":
      case "admin_venues":
      case "admin_depts":
        return <MatchesManager />;
      case "admin_announcements":
        return <PublicAnnouncements />;
      case "admin_reports":
        return <ReportsManager />;

      // Coordinator Routes
      case "coord_dash":
        return <CoordinatorDashboard onNavigate={(nav) => setActiveNav(nav)} />;
      case "coord_players":
      case "coord_event_reg":
        return <RosterManager />;
      case "coord_matches":
        return <PublicFixtures />;
      case "coord_score_entry":
        return <ScoreEntry />;
      case "coord_attendance":
        return <AttendanceMarker />;
      case "coord_media":
        return <PublicGallery />;

      // Player Routes
      case "player_dash":
      case "player_team":
      case "player_matches":
      case "player_notifs":
        return <PlayerDashboard />;

      default:
        if (currentUser.role === ROLES.ADMIN) return <AdminDashboard onNavigate={(nav) => setActiveNav(nav)} />;
        if (currentUser.role === ROLES.COORDINATOR) return <CoordinatorDashboard onNavigate={(nav) => setActiveNav(nav)} />;
        if (currentUser.role === ROLES.PLAYER) return <PlayerDashboard />;
        return <PublicHome onNavigate={(nav) => setActiveNav(nav)} />;
    }
  };

  return (
    <AppShell activeNav={activeNav} onSelectNav={(navId) => setActiveNav(navId)}>
      {renderContent()}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}