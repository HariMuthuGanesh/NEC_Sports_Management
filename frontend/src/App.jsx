import React, { useState } from "react";
import { AuthProvider, useAuth, ROLES } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/common/ProtectedRoute";

// Public Pages
import PublicHome from "./pages/public/PublicHome";
import PublicLiveScores from "./pages/public/PublicLiveScores";
import PublicFixtures from "./pages/public/PublicFixtures";
import PublicLeaderboard from "./pages/public/PublicLeaderboard";
import PublicGallery from "./pages/public/PublicGallery";
import PublicAnnouncements from "./pages/public/PublicAnnouncements";

// Admin / Sports Administrator Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import SportsCatalog from "./pages/admin/SportsCatalog";
import TournamentsManager from "./pages/admin/TournamentsManager";
import EventsManager from "./pages/admin/EventsManager";
import RegistrationsManager from "./pages/admin/RegistrationsManager";
import TeamsManager from "./pages/admin/TeamsManager";
import StudentManager from "./pages/admin/StudentManager";
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

  const renderContent = () => {
    switch (activeNav) {
      // Public Portal Routes (Open Access)
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

      // Protected Admin / Director of Physical Education Routes
      case "admin_dash":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <AdminDashboard onNavigate={(nav) => setActiveNav(nav)} />
          </ProtectedRoute>
        );
      case "admin_sports":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <SportsCatalog />
          </ProtectedRoute>
        );
      case "admin_tournaments":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <TournamentsManager />
          </ProtectedRoute>
        );
      case "admin_events":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <EventsManager />
          </ProtectedRoute>
        );
      case "admin_regs":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <RegistrationsManager />
          </ProtectedRoute>
        );
      case "admin_teams":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <TeamsManager />
          </ProtectedRoute>
        );
      case "admin_depts":
      case "admin_students":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <StudentManager />
          </ProtectedRoute>
        );
      case "admin_matches":
      case "admin_venues":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <MatchesManager />
          </ProtectedRoute>
        );
      case "admin_announcements":
        return <PublicAnnouncements />;
      case "admin_reports":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={() => setActiveNav("public_home")}>
            <ReportsManager />
          </ProtectedRoute>
        );

      // Protected Coordinator Routes
      case "coord_dash":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={() => setActiveNav("public_home")}>
            <CoordinatorDashboard onNavigate={(nav) => setActiveNav(nav)} />
          </ProtectedRoute>
        );
      case "coord_players":
      case "coord_event_reg":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={() => setActiveNav("public_home")}>
            <RosterManager />
          </ProtectedRoute>
        );
      case "coord_matches":
        return <PublicFixtures />;
      case "coord_score_entry":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={() => setActiveNav("public_home")}>
            <ScoreEntry />
          </ProtectedRoute>
        );
      case "coord_attendance":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={() => setActiveNav("public_home")}>
            <AttendanceMarker />
          </ProtectedRoute>
        );
      case "coord_media":
        return <PublicGallery />;

      // Protected Player Routes
      case "player_dash":
      case "player_team":
      case "player_matches":
      case "player_notifs":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PLAYER]} onRedirectPublic={() => setActiveNav("public_home")}>
            <PlayerDashboard />
          </ProtectedRoute>
        );

      default:
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
