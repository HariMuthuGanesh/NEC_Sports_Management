import React, { useEffect, useState } from "react";
import { StatCard, Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { teamsApi, matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { Users, Calendar, CheckSquare, Edit3, UserCheck, ArrowRight } from "lucide-react";
import "./CoordinatorPortal.css";

export default function CoordinatorDashboard({ onNavigate }) {
  const { currentUser } = useAuth();
  const [deptTeams, setDeptTeams] = useState([]);
  const [deptMatches, setDeptMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([teamsApi.getTeams(), matchesApi.getMatches()]).then(([teams, matches]) => {
      // Filter for coordinator department (e.g. CSE or currentUser.dept)
      const myDept = currentUser.dept || "CSE";
      const filteredTeams = teams.filter(t => t.deptCode === myDept || myDept === "All");
      const filteredMatches = matches.filter(m => m.deptA === myDept || m.deptB === myDept || myDept === "All");

      setDeptTeams(filteredTeams);
      setDeptMatches(filteredMatches);
      setLoading(false);
    });
  }, [currentUser]);

  const teamColumns = [
    { key: "name", label: "Team Name", render: (val) => <strong>{val}</strong> },
    { key: "sportId", label: "Sport", render: (val) => val.replace("sp_", "").toUpperCase() },
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
        <h2 className="nec-page-title">Department Sports Coordinator Portal</h2>
        <p className="nec-page-desc">Department: <strong>{currentUser.dept || "CSE"}</strong> | Coordinator: <strong>{currentUser.name}</strong></p>
      </div>

      <div className="nec-stats-grid">
        <StatCard title="My Department Teams" value={deptTeams.length} subtext="Registered Sports Squads" icon={Users} color="navy" onClick={() => onNavigate("coord_players")} />
        <StatCard title="Upcoming Matches" value={deptMatches.filter(m => m.status !== "Completed").length} subtext="Assigned Fixtures" icon={Calendar} color="gold" onClick={() => onNavigate("coord_matches")} />
        <StatCard title="Quick Attendance" value="Squad Ready" subtext="Mark Matchday Attendance" icon={UserCheck} onClick={() => onNavigate("coord_attendance")} />
        <StatCard title="Score Submission" value="Match Day" subtext="Record Final Scores" icon={Edit3} onClick={() => onNavigate("coord_score_entry")} />
      </div>

      <div className="nec-admin-main-grid">
        <Card
          title="Department Sports Squads"
          subtitle="Registered teams and student athlete counts"
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
          />
        </Card>

        <Card title="Coordinator Quick Actions" subtitle="Match day tasks">
          <div className="nec-quick-actions-list">
            <Button variant="primary" icon={Users} onClick={() => onNavigate("coord_players")}>
              Search Student & Add to Squad
            </Button>
            <Button variant="outline" icon={UserCheck} onClick={() => onNavigate("coord_attendance")}>
              Mark Squad Match Attendance
            </Button>
            <Button variant="outline" icon={Edit3} onClick={() => onNavigate("coord_score_entry")}>
              Enter Final Match Scores
            </Button>
            <Button variant="ghost" icon={CheckSquare} onClick={() => onNavigate("coord_event_reg")}>
              Register Team for Tournament
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
