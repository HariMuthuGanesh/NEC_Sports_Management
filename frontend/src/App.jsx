import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth, ROLES } from "./context/AuthContext";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import SessionTimeoutBanner from "./components/security/SessionTimeoutBanner";
import TranslationLoadingBar from "./components/security/TranslationLoadingBar";

// Settings Page
import SettingsPage from "./pages/settings/SettingsPage";

// Admin extra pages
import VenuesManager from "./pages/admin/VenuesManager";
import DepartmentsManager from "./pages/admin/DepartmentsManager";

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
import GalleryManager from "./pages/admin/GalleryManager";
import ODManager from "./pages/admin/ODManager";

// Coordinator Pages
import CoordinatorDashboard from "./pages/coordinator/CoordinatorDashboard";
import RosterManager from "./pages/coordinator/RosterManager";
import EventRegistration from "./pages/coordinator/EventRegistration";
import ScoreEntry from "./pages/coordinator/ScoreEntry";
import AttendanceMarker from "./pages/coordinator/AttendanceMarker";
import ODRequestPanel from "./pages/coordinator/ODRequestPanel";

// Player Pages
import PlayerDashboard from "./pages/player/PlayerDashboard";
import PlayerTeam from "./pages/player/PlayerTeam";
import PlayerMatches from "./pages/player/PlayerMatches";
import PlayerNotifications from "./pages/player/PlayerNotifications";

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";

function MainApp() {
  const { currentUser, ROLES } = useAuth();
  const getDefaultNav = (role) => {
    switch (role) {
      case ROLES.ADMIN: return "admin_dash";
      case ROLES.COORDINATOR: return "coord_dash";
      case ROLES.PLAYER: return "player_dash";
      default: return "public_home";
    }
  };

  const [activeNav, setActiveNavState] = useState(() => {
    try {
      const savedNav = sessionStorage.getItem("nec_sports_active_nav");
      if (savedNav) return savedNav;
    } catch { }
    return getDefaultNav(currentUser?.role);
  });

  const setActiveNav = (nav) => {
    setActiveNavState(nav);
    try {
      sessionStorage.setItem("nec_sports_active_nav", nav);
    } catch { }
  };

  const handleRoleChange = (newRole) => {
    setActiveNav(getDefaultNav(newRole));
  };

  useEffect(() => {
    const role = currentUser?.role;
    // Don't redirect away from shared routes accessible to all roles
    if (activeNav === "settings" || activeNav === "login" || activeNav === "signup") return;
    if (role === ROLES.ADMIN && !activeNav.startsWith("admin_") && !activeNav.startsWith("public_")) {
      setActiveNav("admin_dash");
    } else if (role === ROLES.COORDINATOR && !activeNav.startsWith("coord_") && !activeNav.startsWith("public_")) {
      setActiveNav("coord_dash");
    } else if (role === ROLES.PLAYER && !activeNav.startsWith("player_") && !activeNav.startsWith("public_")) {
      setActiveNav("player_dash");
    } else if (role === ROLES.PUBLIC && !activeNav.startsWith("public_")) {
      setActiveNav("public_home");
    }
  }, [currentUser?.role, activeNav]);

  const renderContent = () => {
    const defaultNav = getDefaultNav(currentUser?.role);
    const redirectNav = () => setActiveNav(defaultNav);

    if (activeNav === "login") {
      return (
        <LoginPage
          onLoginSuccess={() => {
            try {
              const saved = localStorage.getItem("nec_sports_auth_user");
              const userObj = saved ? JSON.parse(saved) : currentUser;
              setActiveNav(getDefaultNav(userObj?.role));
            } catch {
              setActiveNav(getDefaultNav(currentUser?.role));
            }
          }}
          onNavigate={(nav) => setActiveNav(nav)}
        />
      );
    }

    if (activeNav === "signup") {
      return (
        <SignUpPage
          onLoginSuccess={() => {
            try {
              const saved = localStorage.getItem("nec_sports_auth_user");
              const userObj = saved ? JSON.parse(saved) : currentUser;
              setActiveNav(getDefaultNav(userObj?.role));
            } catch {
              setActiveNav(getDefaultNav(currentUser?.role));
            }
          }}
          onNavigate={(nav) => setActiveNav(nav)}
        />
      );
    }

    switch (activeNav) {
      // Public Portal Routes (Open Access)
      case "public_home":
        return <PublicHome onNavigate={(nav) => setActiveNav(nav)} />;
      case "public_live":
        return <PublicLiveScores onNavigate={(nav) => setActiveNav(nav)} />;
      case "public_fixtures":
        return <PublicFixtures onNavigate={(nav) => setActiveNav(nav)} />;
      case "public_leaderboard":
        return <PublicLeaderboard onNavigate={(nav) => setActiveNav(nav)} />;
      case "public_gallery":
        return <PublicGallery onNavigate={(nav) => setActiveNav(nav)} />;
      case "public_announcements":
        return <PublicAnnouncements onNavigate={(nav) => setActiveNav(nav)} />;

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
      case "admin_depts":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav} routeId="admin_depts">
            <DepartmentsManager />
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
      case "admin_gallery":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <GalleryManager />
          </ProtectedRoute>
        );
      case "admin_reports":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav}>
            <ReportsManager />
          </ProtectedRoute>
        );
      case "admin_od":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN]} onRedirectPublic={redirectNav} routeId="admin_od">
            <ODManager />
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
        return <PublicFixtures departmentCode={currentUser?.dept} />;
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
      case "coord_od":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav} routeId="coord_od">
            <ODRequestPanel />
          </ProtectedRoute>
        );
      case "coord_media":
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR]} onRedirectPublic={redirectNav}>
            <GalleryManager />
          </ProtectedRoute>
        );

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
      case "notifications":
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
        return (
          <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.COORDINATOR, ROLES.PLAYER]} onRedirectPublic={redirectNav}>
            <SettingsPage onNavigate={(nav) => setActiveNav(nav)} />
          </ProtectedRoute>
        );

      default:
        return <PublicHome onNavigate={(nav) => setActiveNav(nav)} />;
    }
  };

  return (
    <AppShell activeNav={activeNav} onSelectNav={(navId) => setActiveNav(navId)} onRoleChange={handleRoleChange}>
      <TranslationLoadingBar />
      <SessionTimeoutBanner />
      <ErrorBoundary onNavigate={() => setActiveNav(getDefaultNav(currentUser?.role))}>
        {renderContent()}
      </ErrorBoundary>
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
