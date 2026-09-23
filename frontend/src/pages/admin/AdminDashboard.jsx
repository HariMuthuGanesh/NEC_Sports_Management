import React, { useMemo } from "react";
import { StatCard, Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { tournamentsApi, teamsApi, matchesApi, sportsApi, eventsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Trophy, Calendar, CheckSquare, Users, Plus, Radio, ArrowRight, Activity, Award } from "lucide-react";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import "./AdminPortal.css";

export default function AdminDashboard({ onNavigate }) {
  const { t } = useAuth();

  const fetchDashboardData = async () => {
    const [tournaments = [], teams = [], matches = [], venues = [], sports = [], events = []] = await Promise.all([
      tournamentsApi.getTournaments().catch(err => { console.warn("[AdminDashboard] Failed to fetch tournaments:", err); return []; }),
      teamsApi.getTeams().catch(err => { console.warn("[AdminDashboard] Failed to fetch teams:", err); return []; }),
      matchesApi.getMatches().catch(err => { console.warn("[AdminDashboard] Failed to fetch matches:", err); return []; }),
      sportsApi.getVenues().catch(err => { console.warn("[AdminDashboard] Failed to fetch venues:", err); return []; }),
      sportsApi.getSports().catch(err => { console.warn("[AdminDashboard] Failed to fetch sports:", err); return []; }),
      eventsApi.getEvents().catch(err => { console.warn("[AdminDashboard] Failed to fetch events:", err); return []; })
    ]);

    const teamList = Array.isArray(teams) ? teams : [];
    const tournamentList = Array.isArray(tournaments) ? tournaments : [];
    const matchList = Array.isArray(matches) ? matches : [];
    const venueList = Array.isArray(venues) ? venues : [];
    const sportList = Array.isArray(sports) ? sports : [];
    const eventList = Array.isArray(events) ? events : [];

    const pending = teamList.filter(t => t.status === "Pending");
    const activeEventsCount = eventList.filter(e => {
      const st = (e.status || e.registration_status || "").toLowerCase();
      return st === "open" || st === "registration open" || st === "ongoing";
    }).length;

    return {
      pendingTeams: pending,
      stats: {
        tournamentsCount: tournamentList.length,
        openRegsCount: activeEventsCount,
        pendingApprovals: pending.length,
        upcomingMatches: matchList.filter(m => m.status === "Scheduled" || m.status === "Ongoing").length,
        totalTeams: teamList.length,
        totalVenues: venueList.length,
        totalSports: sportList.length
      }
    };
  };

  const { data: dashboardData, loading, error } = useAutoRefresh(
    fetchDashboardData,
    { interval: 20000 }
  );

  const stats = dashboardData?.stats || {
    tournamentsCount: 0,
    openRegsCount: 0,
    pendingApprovals: 0,
    upcomingMatches: 0,
    totalTeams: 0,
    totalVenues: 0,
    totalSports: 0
  };

  const pendingTeams = dashboardData?.pendingTeams || [];

  const pendingColumns = [
    { key: "deptCode", label: "Dept", width: "90px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Team Name", render: (val) => <strong>{val}</strong> },
    { key: "sportId", label: "Sport", width: "120px", render: (val, row) => String(val || row.sportName || "").replace("sp_", "").toUpperCase() },
    { key: "captainName", label: "Captain", render: (val, row) => <span>{val} ({row.captainRoll})</span> },
    { key: "status", label: "Status", width: "110px", render: (val) => <Badge status="warning">Pending Review</Badge> }
  ];

  return (
    <div className="nec-admin-dashboard">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", color: "var(--nec-gold)", textTransform: "uppercase" }}>
            {t.navOverview || "OVERVIEW"}
          </span>
          <h1 className="nec-page-title" style={{ fontSize: "2rem", marginTop: "2px" }}>{t.directorsDesk || "Physical Director's Desk"}</h1>
          <p className="nec-page-desc">Institutional overview of athletic programs, student participation metrics, and recent administrative actions across all departments.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button variant="primary" icon={Plus} onClick={() => onNavigate("admin_events")}>
            {t.createEvent || "Create Event"}
          </Button>
        </div>
      </div>


      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={fetchDashboardData} />
        </div>
      ) : (
        <>
          <div className="nec-stats-grid">
            <div className="nec-stat-card nec-stat-card-navy cursor-pointer" onClick={() => onNavigate("admin_sports")}>
              <div className="nec-stat-card-top">
                <span className="nec-stat-title">{t.activeSports || "Active Sports"}</span>
                <div className="nec-stat-icon-wrapper"><Trophy size={20} /></div>
              </div>
              <div className="nec-stat-value">{stats.totalSports || 0}</div>
              <div className="nec-stat-subtext">Registered sports catalogs</div>
            </div>

            <div className="nec-stat-card cursor-pointer" style={{ background: "var(--nec-navy)", color: "#fff" }} onClick={() => onNavigate("admin_events")}>
              <div className="nec-stat-card-top">
                <span className="nec-stat-title" style={{ color: "#cbd5e1" }}>{t.ongoingEvents || "Ongoing Events"}</span>
                <Badge status="live">{t.live || "LIVE"}</Badge>
              </div>
              <div className="nec-stat-value" style={{ color: "#fff" }}>{stats.openRegsCount || 0}</div>
              <div className="nec-stat-subtext" style={{ color: "var(--nec-gold-light)" }}>Active tournaments & events</div>
            </div>

            <div className="nec-stat-card cursor-pointer" onClick={() => onNavigate("admin_matches")}>
              <div className="nec-stat-card-top">
                <span className="nec-stat-title">Upcoming Matches</span>
                <div className="nec-stat-icon-wrapper"><Calendar size={20} /></div>
              </div>
              <div className="nec-stat-value">{stats.upcomingMatches || 0}</div>
              <div className="nec-stat-subtext">Matches scheduled to play</div>
            </div>

            <div className="nec-stat-card cursor-pointer" onClick={() => onNavigate("admin_teams")}>
              <div className="nec-stat-card-top">
                <span className="nec-stat-title">{t.competitiveTeams || "Competitive Teams"}</span>
                <div className="nec-stat-icon-wrapper"><Activity size={20} /></div>
              </div>
              <div className="nec-stat-value">{stats.totalTeams || 0}</div>
              <div className="nec-stat-subtext">Registered active teams</div>
            </div>
          </div>

          <div className="nec-admin-main-grid" style={{ marginTop: "24px" }}>
            <Card
              title={t.administrativeTasks || "Administrative Tasks"}
              subtitle={`${stats.pendingApprovals} pending team requests require PT Sir approval`}
              action={
                <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => onNavigate("admin_regs")}>
                  Review All
                </Button>
              }
            >
              {pendingTeams.length === 0 && !loading ? (
                <EmptyState title="No Pending Requests" message="All team registrations have been reviewed." />
              ) : (
                <Table
                  columns={pendingColumns}
                  data={pendingTeams}
                  loading={loading}
                  pagination={false}
                  emptyMessage="No pending team requests."
                />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
