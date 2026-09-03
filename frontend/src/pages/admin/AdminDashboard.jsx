import React, { useEffect, useState } from "react";
import { StatCard, Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { tournamentsApi, teamsApi, matchesApi, sportsApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Trophy, Calendar, CheckSquare, Users, Plus, Radio, ArrowRight, Activity, Award } from "lucide-react";
import "./AdminPortal.css";

export default function AdminDashboard({ onNavigate }) {
  const { t } = useAuth();
  const [stats, setStats] = useState({
    tournamentsCount: 0,
    openRegsCount: 0,
    pendingApprovals: 0,
    upcomingMatches: 0,
    totalTeams: 0,
    totalVenues: 0
  });

  const [pendingTeams, setPendingTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tournamentsApi.getTournaments(),
      teamsApi.getTeams(),
      matchesApi.getMatches(),
      sportsApi.getVenues()
    ]).then(([tournaments, teams, matches, venues]) => {
      const pending = teams.filter(t => t.status === "Pending");
      setPendingTeams(pending);
      setStats({
        tournamentsCount: tournaments.length,
        openRegsCount: tournaments.filter(t => t.status === "Registration Open" || t.status === "Ongoing").length,
        pendingApprovals: pending.length,
        upcomingMatches: matches.filter(m => m.status === "Scheduled" || m.status === "Live").length,
        totalTeams: teams.length,
        totalVenues: venues.length
      });
      setLoading(false);
    });
  }, []);

  const pendingColumns = [
    { key: "deptCode", label: "Dept", width: "90px", render: (val) => <strong>{val}</strong> },
    { key: "name", label: "Team Name", render: (val) => <strong>{val}</strong> },
    { key: "sportId", label: "Sport", width: "120px", render: (val) => val.replace("sp_", "").toUpperCase() },
    { key: "captainName", label: "Captain", render: (val, row) => <span>{val} ({row.captainRoll})</span> },
    { key: "status", label: "Status", width: "110px", render: (val) => <Badge status="warning">Pending Review</Badge> }
  ];

  const disciplineData = [
    { sport: "Football", count: 120, height: "85%" },
    { sport: "Cricket", count: 140, height: "100%" },
    { sport: "Basketball", count: 80, height: "60%" },
    { sport: "Volleyball", count: 95, height: "70%" },
    { sport: "Badminton", count: 65, height: "45%" },
    { sport: "Table Tennis", count: 40, height: "30%" }
  ];

  return (
    <div className="nec-admin-dashboard">
      {/* Stitch Header Section */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.15em", color: "var(--nec-gold)", textTransform: "uppercase" }}>
            {t.navOverview || "OVERVIEW"}
          </span>
          <h1 className="nec-page-title" style={{ fontSize: "2rem", marginTop: "2px" }}>{t.directorsDesk || "Director's Desk"}</h1>
          <p className="nec-page-desc">Institutional overview of athletic programs, student participation metrics, and recent administrative actions across all departments.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => onNavigate("admin_events")}>
          {t.createEvent || "Create Event"}
        </Button>
      </div>

      {/* Stitch Bento Grid Metrics */}
      <div className="nec-stats-grid">
        <div className="nec-stat-card nec-stat-card-navy cursor-pointer" onClick={() => onNavigate("admin_sports")}>
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">{t.activeSports || "Active Sports"}</span>
            <div className="nec-stat-icon-wrapper"><Trophy size={20} /></div>
          </div>
          <div className="nec-stat-value">12</div>
          <div className="nec-stat-subtext"><span className="nec-stat-trend up">+2 this year</span></div>
        </div>

        <div className="nec-stat-card cursor-pointer" style={{ background: "var(--nec-navy)", color: "#fff" }} onClick={() => onNavigate("admin_events")}>
          <div className="nec-stat-card-top">
            <span className="nec-stat-title" style={{ color: "#cbd5e1" }}>{t.ongoingEvents || "Ongoing Events"}</span>
            <Badge status="live">{t.live || "LIVE"}</Badge>
          </div>
          <div className="nec-stat-value" style={{ color: "#fff" }}>5</div>
          <div className="nec-stat-subtext" style={{ color: "var(--nec-gold-light)" }}>Inter-Department Championships</div>
        </div>

        <div className="nec-stat-card cursor-pointer" onClick={() => onNavigate("admin_depts")}>
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">{t.registeredAthletes || "Registered Athletes"}</span>
            <div className="nec-stat-icon-wrapper"><Users size={20} /></div>
          </div>
          <div className="nec-stat-value">450</div>
          <div className="nec-stat-subtext"><span className="nec-stat-trend up">+15% vs LY</span></div>
        </div>

        <div className="nec-stat-card cursor-pointer" onClick={() => onNavigate("admin_teams")}>
          <div className="nec-stat-card-top">
            <span className="nec-stat-title">{t.competitiveTeams || "Competitive Teams"}</span>
            <div className="nec-stat-icon-wrapper"><Activity size={20} /></div>
          </div>
          <div className="nec-stat-value">{stats.totalTeams || 24}</div>
          <div className="nec-stat-subtext">Across 8 Departments</div>
        </div>
      </div>

      {/* Stitch Split View Main Content */}
      <div className="nec-admin-main-grid" style={{ marginTop: "24px" }}>
        {/* Left Column: Participation by Discipline Bar Chart */}
        <Card title={t.participationByDiscipline || "Participation by Discipline"} subtitle="Active student roster distribution across major sports disciplines.">
          <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", height: "220px", padding: "20px 10px 10px 10px", borderBottom: "2px solid var(--nec-border-dark)" }}>
            {disciplineData.map(item => (
              <div key={item.sport} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--nec-navy)" }}>{item.count}</span>
                <div style={{
                  width: "100%",
                  maxWidth: "42px",
                  height: item.height,
                  backgroundColor: "var(--nec-navy)",
                  borderRadius: "6px 6px 0 0",
                  transition: "all 0.3s ease"
                }} />
                <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{item.sport}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Right Column: Administrative Tasks & Quick Reviews */}
        <Card
          title={t.administrativeTasks || "Administrative Tasks"}
          subtitle={`${stats.pendingApprovals} pending team requests require PT Sir approval`}
          action={
            <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => onNavigate("admin_regs")}>
              Review All
            </Button>
          }
        >
          <Table
            columns={pendingColumns}
            data={pendingTeams}
            loading={loading}
            pagination={false}
          />
        </Card>
      </div>
    </div>
  );
}
