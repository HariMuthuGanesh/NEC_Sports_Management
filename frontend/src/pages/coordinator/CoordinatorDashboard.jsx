import React, { useEffect, useState } from "react";
import { StatCard, Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { teamsApi, matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import ErrorState from "../../components/common/ErrorState";
import { Users, Calendar, CheckSquare, UserCheck, ArrowRight, FileText } from "lucide-react";
import "./CoordinatorPortal.css";

export default function CoordinatorDashboard({ onNavigate }) {
  const { currentUser, t } = useAuth();
  const [deptTeams, setDeptTeams] = useState([]);
  const [deptMatches, setDeptMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = () => {
    setLoading(true);
    setError(null);
    Promise.all([teamsApi.getTeams(), matchesApi.getMatches()]).then(([teams, matches]) => {
      // Filter for coordinator department (e.g. CSE or currentUser.dept)
      const myDept = currentUser.dept || "CSE";
      const filteredTeams = teams.filter(t => t.deptCode === myDept || myDept === "All");
      const filteredMatches = matches.filter(m => m.deptA === myDept || m.deptB === myDept || myDept === "All");

      setDeptTeams(filteredTeams);
      setDeptMatches(filteredMatches);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const teamColumns = [
    { key: "name", label: "Team Name", render: (val) => <strong>{val}</strong> },
    { key: "sportId", label: "Sport", render: (val, row) => String(row.sportName || val || "Sport").replace("sp_", "").toUpperCase() },
    { key: "memberCount", label: "Roster Size", render: (val) => <span>{val} Athletes</span> },
    {
      key: "status",
      label: "Approval Status",
      render: (val) => (
        <Badge status={val === "Approved" ? "success" : "warning"}>
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.coordPortalTitle || "Department Sports Coordinator Portal"}</h2>
        <p className="nec-page-desc">Department: <strong>{currentUser.dept || "CSE"}</strong> | Coordinator: <strong>{currentUser.name}</strong></p>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadDashboardData} />
        </div>
      ) : (
        <>
          <div className="nec-stats-grid">
            <StatCard title={t.myDeptTeams || "My Department Teams"} value={deptTeams.length} subtext="Registered Sports Squads" icon={Users} color="navy" onClick={() => onNavigate("coord_players")} />
            <StatCard title={t.upcomingMatches || "Upcoming Matches"} value={deptMatches.filter(m => m.status !== "Completed").length} subtext="Assigned Fixtures" icon={Calendar} color="gold" onClick={() => onNavigate("coord_matches")} />
            <StatCard title={t.quickAttendance || "Quick Attendance"} value="Squad Ready" subtext="Mark Matchday Attendance" icon={UserCheck} onClick={() => onNavigate("coord_attendance")} />
            <StatCard title="On Duty Requests" value="Portal" subtext="Generate & Track OD" icon={FileText} onClick={() => onNavigate("coord_od")} />
          </div>

          <div className="nec-admin-main-grid">
            <Card
              title="Department Sports Squads"
              headerAction={
                <Button variant="ghost" size="sm" onClick={() => onNavigate("coord_players")}>
                  Manage Roster <ArrowRight size={14} />
                </Button>
              }
            >
              <Table
                columns={teamColumns}
                data={deptTeams}
                loading={loading}
                searchable={false}
                emptyMessage="No teams registered for your department."
              />
            </Card>

            <Card title="Coordinator Quick Actions">
              <div className="nec-quick-actions-list">
                <Button variant="primary" icon={Users} onClick={() => onNavigate("coord_players")}>
                  Search Student & Add to Squad
                </Button>
                <Button variant="outline" icon={UserCheck} onClick={() => onNavigate("coord_attendance")}>
                  Mark Squad Match Attendance
                </Button>
                <Button variant="ghost" icon={CheckSquare} onClick={() => onNavigate("coord_event_reg")}>
                  Register Team for Tournament
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
