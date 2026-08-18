import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth, ROLES } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/common/ProtectedRoute";
import SessionTimeoutBanner from "./components/security/SessionTimeoutBanner";
import TranslationLoadingBar from "./components/security/TranslationLoadingBar";

// Settings Page
import SettingsPage from "./pages/settings/SettingsPage";

// Admin extra pages
import VenuesManager from "./pages/admin/VenuesManager";

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
import MatchesManager from "./pages/admin/MatchesManager";
import ReportsManager from "./pages/admin/ReportsManager";
import AnnouncementsManager from "./pages/admin/AnnouncementsManager";
import AuditLog from "./pages/admin/AuditLog";
import StudentManager from "./pages/admin/StudentManager";

// Coordinator Pages
import CoordinatorDashboard from "./pages/coordinator/CoordinatorDashboard";
import RosterManager from "./pages/coordinator/RosterManager";
import EventRegistration from "./pages/coordinator/EventRegistration";
import ScoreEntry from "./pages/coordinator/ScoreEntry";
import AttendanceMarker from "./pages/coordinator/AttendanceMarker";

// Player Pages
import PlayerDashboard from "./pages/player/PlayerDashboard";
import PlayerTeam from "./pages/player/PlayerTeam";
import PlayerMatches from "./pages/player/PlayerMatches";
import PlayerNotifications from "./pages/player/PlayerNotifications";

// Auth Page
import LoginPage from "./pages/auth/LoginPage";

function MainApp() {
  const { currentUser, ROLES } = useAuth();
  const [activeNav, setActiveNav] = useState("public_home");

  const getDefaultNav = (role) => {
    switch (role) {
      case ROLES.ADMIN: return "admin_dash";
      case ROLES.COORDINATOR: return "coord_dash";
      case ROLES.PLAYER: return "player_dash";
      default: return "public_home";
    }
  };

  const handleRoleChange = (newRole) => {
    setActiveNav(getDefaultNav(newRole));
  };

  useEffect(() => {
    const role = currentUser?.role;
    // Don't redirect away from shared routes accessible to all roles
    if (activeNav === "settings") return;
    if (role === ROLES.ADMIN && !activeNav.startsWith("admin_") && !activeNav.startsWith("public_")) {
      setActiveNav("admin_dash");
    } else if (role === ROLES.COORDINATOR && !activeNav.startsWith("coord_") && !activeNav.startsWith("public_")) {
      setActiveNav("coord_dash");
    } else if (role === ROLES.PLAYER && !activeNav.startsWith("player_") && !activeNav.startsWith("public_")) {
      setActiveNav("player_dash");
    } else if (role === ROLES.PUBLIC && !activeNav.startsWith("public_")) {
      setActiveNav("public_home");
    }
  }, [currentUser?.role]);

  const renderContent = () => {
    const defaultNav = getDefaultNav(currentUser?.role);
    const redirectNav = () => setActiveNav(defaultNav);

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
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <AdminDashboard onNavigate={(nav) => setActiveNav(nav)} />
          </ProtectedRoute>
        );
      case "admin_sports":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <SportsCatalog />
          </ProtectedRoute>
        );
      case "admin_tournaments":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <TournamentsManager />
          </ProtectedRoute>
        );
      case "admin_events":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <EventsManager />
          </ProtectedRoute>
        );
      case "admin_regs":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <RegistrationsManager />
          </ProtectedRoute>
        );
      case "admin_teams":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <TeamsManager />
          </ProtectedRoute>
        );

      case "admin_students":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav} routeId="admin_students">
            <StudentManager />
          </ProtectedRoute>
        );
      case "admin_matches":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav} routeId="admin_matches">
            <MatchesManager />
          </ProtectedRoute>
        );
      case "admin_venues":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav} routeId="admin_venues">
            <VenuesManager />
          </ProtectedRoute>
        );
      case "admin_announcements":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <AnnouncementsManager />
          </ProtectedRoute>
        );
      case "admin_reports":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <ReportsManager />
          </ProtectedRoute>
        );

      // Protected Coordinator Routes
      case "coord_dash":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav}>
            <CoordinatorDashboard onNavigate={(nav) => setActiveNav(nav)} />
          </ProtectedRoute>
        );
      case "coord_players":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav}>
            <RosterManager />
          </ProtectedRoute>
        );
      case "coord_event_reg":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav}>
            <EventRegistration />
          </ProtectedRoute>
        );
      case "coord_matches":
        return <PublicFixtures />;
      case "coord_score_entry":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav}>
            <ScoreEntry />
          </ProtectedRoute>
        );
      case "coord_attendance":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav}>
            <AttendanceMarker />
          </ProtectedRoute>
        );
      case "coord_media":
        return <PublicGallery />;

      // Protected Player Routes
      case "player_dash":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PLAYER]} onRedirectPublic={redirectNav}>
            <PlayerDashboard onNavigate={(nav) => setActiveNav(nav)} />
          </ProtectedRoute>
        );
      case "player_team":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PLAYER]} onRedirectPublic={redirectNav}>
            <PlayerTeam />
          </ProtectedRoute>
        );
      case "player_matches":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PLAYER]} onRedirectPublic={redirectNav}>
            <PlayerMatches />
          </ProtectedRoute>
        );
      case "player_notifs":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PLAYER]} onRedirectPublic={redirectNav}>
            <PlayerNotifications />
          </ProtectedRoute>
        );

      case "admin_audit":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav} routeId="admin_audit">
            <AuditLog />
          </ProtectedRoute>
        );

      // Settings — accessible to all logged-in roles
      case "settings":
        return <SettingsPage onNavigate={(nav) => setActiveNav(nav)} />;

      default:
        return <PublicHome onNavigate={(nav) => setActiveNav(nav)} />;
    }
  };

  return (
    <AppShell activeNav={activeNav} onSelectNav={(navId) => setActiveNav(navId)} onRoleChange={handleRoleChange}>
      <TranslationLoadingBar />
      <SessionTimeoutBanner />
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
