import React, { useEffect, useState } from "react";
import { StatCard, Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { tournamentsApi, teamsApi, matchesApi, sportsApi, devApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Trophy, Calendar, CheckSquare, Users, Plus, Radio, ArrowRight, Activity, Award, Database, Trash2, RefreshCw } from "lucide-react";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import "./AdminPortal.css";

export default function AdminDashboard({ onNavigate }) {
  const { t } = useAuth();
  const [stats, setStats] = useState({
    tournamentsCount: 0,
    openRegsCount: 0,
    pendingApprovals: 0,
    upcomingMatches: 0,
    totalTeams: 0,
    totalVenues: 0,
    totalSports: 0
  });

  const [pendingTeams, setPendingTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devActionLoading, setDevActionLoading] = useState(false);
  const [devMessage, setDevMessage] = useState(null);

  const fetchDashboardData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      tournamentsApi.getTournaments(),
      teamsApi.getTeams(),
      matchesApi.getMatches(),
      sportsApi.getVenues(),
      sportsApi.getSports()
    ]).then(([tournaments, teams, matches, venues, sports]) => {
      const pending = teams.filter(t => t.status === "Pending");
      setPendingTeams(pending);
      setStats({
        tournamentsCount: tournaments.length,
        openRegsCount: tournaments.filter(t => t.status === "Registration Open" || t.status === "Ongoing").length,
        pendingApprovals: pending.length,
        upcomingMatches: matches.filter(m => m.status === "Scheduled" || m.status === "Live").length,
        totalTeams: teams.length,
        totalVenues: venues.length,
        totalSports: sports.length
      });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLoadDemoData = async () => {
    try {
      setDevActionLoading(true);
      setDevMessage(null);
      const res = await devApi.loadDemoData();
      setDevMessage({ type: "success", text: res.message || "Demo dataset loaded successfully." });
      fetchDashboardData();
    } catch (err) {
      setDevMessage({ type: "error", text: err.message || "Failed to load demo data." });
    } finally {
      setDevActionLoading(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!window.confirm("Are you sure you want to clear demo data? This will restore the database to a baseline state.")) {
      return;
    }
    try {
      setDevActionLoading(true);
      setDevMessage(null);
      const res = await devApi.clearDemoData();
      setDevMessage({ type: "success", text: res.message || "Demo data cleared successfully." });
      fetchDashboardData();
    } catch (err) {
      setDevMessage({ type: "error", text: err.message || "Failed to clear demo data." });
    } finally {
      setDevActionLoading(false);
    }
  };

  const pendingColumns = [
    { key: "deptCode", label: "Dept", width: "90px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Team Name", render: (val) => <strong>{val}</strong> },
    { key: "sportId", label: "Sport", width: "120px", render: (val) => val.replace("sp_", "").toUpperCase() },
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
          <h1 className="nec-page-title" style={{ fontSize: "2rem", marginTop: "2px" }}>{t.directorsDesk || "Director's Desk"}</h1>
          <p className="nec-page-desc">Institutional overview of athletic programs, student participation metrics, and recent administrative actions across all departments.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <Button 
            variant="outline" 
            size="sm"
            icon={Database} 
            loading={devActionLoading} 
            disabled={devActionLoading}
            onClick={handleLoadDemoData}
            title="Populate MySQL database with realistic demo data"
          >
            Load Demo Data
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            icon={Trash2} 
            loading={devActionLoading} 
            disabled={devActionLoading}
            onClick={handleClearDemoData}
            title="Clean demo data and restore baseline state"
            style={{ color: "var(--nec-danger, #ef4444)" }}
          >
            Clear Demo Data
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => onNavigate("admin_events")}>
            {t.createEvent || "Create Event"}
          </Button>
        </div>
      </div>

      {devMessage && (
        <div style={{
          margin: "12px 0 20px 0",
          padding: "10px 16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.875rem",
          background: devMessage.type === "success" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: devMessage.type === "success" ? "#10b981" : "#ef4444",
          border: `1px solid ${devMessage.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
        }}>
          <span>{devMessage.text}</span>
          <button 
            onClick={() => setDevMessage(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}
          >
            ✕
          </button>
        </div>
      )}

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
