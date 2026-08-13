import React, { useEffect, useState } from "react";
import { StatCard, Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { tournamentsApi, teamsApi, matchesApi, sportsApi } from "../../services/api/apiServices";
import { Trophy, Calendar, CheckSquare, Users, MapPin, AlertCircle, ArrowRight } from "lucide-react";
import "./AdminPortal.css";

export default function AdminDashboard({ onNavigate }) {
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

  return (
    <div className="nec-admin-dashboard">
      <div className="nec-page-header">
        <div className="nec-admin-welcome">
          <h2 className="nec-page-title">Physical Education Director Dashboard (PT Sir)</h2>
          <p className="nec-page-desc">National Engineering College Sports Management Operational Overview</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="nec-stats-grid">
        <StatCard
          title="Active Tournaments"
          value={stats.tournamentsCount}
          subtext="Academic Year 2025-2026"
          icon={Trophy}
          color="navy"
          onClick={() => onNavigate("admin_tournaments")}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pendingApprovals}
          subtext="Action Required by PT Sir"
          icon={CheckSquare}
          color="gold"
          trend={stats.pendingApprovals > 0 ? "+Action Required" : null}
          onClick={() => onNavigate("admin_regs")}
        />
        <StatCard
          title="Registered Teams"
          value={stats.totalTeams}
          subtext="Across All 8 Departments"
          icon={Users}
          onClick={() => onNavigate("admin_teams")}
        />
        <StatCard
          title="Upcoming Matches"
          value={stats.upcomingMatches}
          subtext="Scheduled & Live Games"
          icon={Calendar}
          onClick={() => onNavigate("admin_matches")}
        />
      </div>

      {/* Main Admin Overview Grid */}
      <div className="nec-admin-main-grid">
        {/* Pending Team Registrations Review Queue */}
        <Card
          title="Pending Department Team Registrations"
          subtitle="Review and approve team rosters before entry deadline"
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => onNavigate("admin_regs")}>
              Manage Approvals <ArrowRight size={14} />
            </Button>
          }
        >
          <Table
            columns={pendingColumns}
            data={pendingTeams}
            loading={loading}
            pageSize={5}
            searchable={false}
            emptyMessage="All department team registrations have been reviewed & approved."
          />
        </Card>

        {/* Quick Admin Actions & Operational Overview */}
        <div className="nec-admin-side-col">
          <Card title="Quick Management Controls" subtitle="Frequent PT Sir Actions">
            <div className="nec-quick-actions-list">
              <Button variant="primary" icon={Calendar} onClick={() => onNavigate("admin_tournaments")}>
                Create New Tournament
              </Button>
              <Button variant="outline" icon={Users} onClick={() => onNavigate("admin_matches")}>
                Schedule Match & Assign Venue
              </Button>
              <Button variant="outline" icon={CheckSquare} onClick={() => onNavigate("admin_regs")}>
                Review Team Entries ({stats.pendingApprovals})
              </Button>
              <Button variant="ghost" icon={Trophy} onClick={() => onNavigate("admin_reports")}>
                Generate Institutional Reports
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
