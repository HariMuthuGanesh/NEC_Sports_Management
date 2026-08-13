import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Table from "../../components/common/Table";
import { useAuth } from "../../context/AuthContext";
import { matchesApi, playersApi } from "../../services/api/apiServices";
import { Users, Calendar, Bell, Trophy, Shield } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerDashboard() {
  const { currentUser } = useAuth();
  const [myTeam, setMyTeam] = useState(null);
  const [myMatches, setMyMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([matchesApi.getMatches()]).then(([matches]) => {
      // Player personal view simulation
      setMyMatches(matches.slice(0, 4));
      setLoading(false);
    });
  }, []);

  const columns = [
    { key: "sport", label: "Sport", width: "120px", render: (val) => <strong>{val}</strong> },
    { key: "matchup", label: "Fixture", render: (_, row) => <span>{row.teamA} vs {row.teamB}</span> },
    { key: "date", label: "Date & Time", width: "160px", render: (_, row) => <span>📅 {row.date} • {row.time}</span> },
    { key: "venue", label: "Venue", width: "180px", render: (val) => <span>📍 {val}</span> },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (val) => (
        <Badge status={val === "Live" ? "live" : val === "Completed" ? "success" : "warning"}>
          {val}
        </Badge>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Student Athlete Dashboard</h2>
        <p className="nec-page-desc">Student Athlete: <strong>{currentUser.name}</strong> | Department: <strong>{currentUser.dept || "MECH"}</strong></p>
      </div>

      <div className="nec-stats-grid">
        <StatCard title="My Squad" value="Mech Titans" subtext="Department Team" icon={Users} color="navy" />
        <StatCard title="Next Match" value="Aug 14" subtext="09:30 AM at Basketball Arena" icon={Calendar} color="gold" />
        <StatCard title="Attendance Rate" value="100%" subtext="Verified Athlete Status" icon={Trophy} />
      </div>

      <div className="nec-admin-main-grid">
        <Card title="My Fixtures & Game Schedule">
          <Table
            columns={columns}
            data={myMatches}
            loading={loading}
            searchable={false}
          />
        </Card>

        <Card title="My Squad Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div><strong>Team Name:</strong> Mech Titans</div>
            <div><strong>Sport:</strong> Football / Badminton</div>
            <div><strong>Captain:</strong> Priya Patel</div>
            <div><strong>Jersey Number:</strong> #4</div>
            <div><strong>Verified Status:</strong> <Badge status="success">Approved Athlete</Badge></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
