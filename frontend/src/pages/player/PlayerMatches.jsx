import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { useAuth } from "../../context/AuthContext";
import { matchesApi, teamsApi, playersApi } from "../../services/api/apiServices";
import { Calendar, MapPin, Trophy } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerMatches() {
  const { currentUser, t } = useAuth();
  const playerDept = currentUser.dept || "MECH";
  const playerName = currentUser.name || "Priya Patel";

  const [myMatches, setMyMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all", "upcoming", "past"

  useEffect(() => {
    setLoading(true);
    Promise.all([
      matchesApi.getMatches(),
      teamsApi.getTeams(),
      playersApi.getAllPlayers()
    ]).then(([matches, teams, players]) => {
      const playerObj = players.find(p => p.name.toLowerCase().includes(playerName.toLowerCase()) || p.studentId === currentUser.id) || players[0];
      const teamObj = teams.find(t => t.id === playerObj?.teamId || t.deptCode === playerDept) || teams[0];

      const filteredMatches = matches.filter(m => 
        (teamObj && (m.teamA === teamObj.name || m.teamB === teamObj.name)) ||
        m.deptA === playerDept || m.deptB === playerDept
      );
      
      setMyMatches(filteredMatches.length > 0 ? filteredMatches : matches.slice(0, 5));
      setLoading(false);
    });
  }, [currentUser, playerDept, playerName]);

  const columns = [
    { key: "sport", label: t.sportsCatalog || "Sport", width: "120px", render: (val) => <strong>{val}</strong> },
    { key: "matchup", label: "Fixture", render: (_, row) => <span><strong>{row.teamA}</strong> vs <strong>{row.teamB}</strong></span> },
    { key: "date", label: "Date & Time", width: "180px", render: (_, row) => <span>📅 {row.date} • {row.time}</span> },
    { key: "venue", label: t.venues || "Venue", width: "180px", render: (val) => <span>📍 {val}</span> },
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

  const filteredData = myMatches.filter(m => {
    if (filter === "upcoming") return m.status === "Scheduled" || m.status === "Live";
    if (filter === "past") return m.status === "Completed";
    return true;
  });

  const nextMatch = myMatches.find(m => m.status === "Scheduled" || m.status === "Live") || myMatches[0];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.myMatches || "My Fixtures & Results"}</h2>
        <p className="nec-page-desc">View your upcoming match schedule and past performance.</p>
      </div>

      <div className="nec-stats-grid">
        <StatCard title="Upcoming Matches" value={myMatches.filter(m => m.status === "Scheduled").length} icon={Calendar} color="navy" />
        <StatCard title="Next Venue" value={nextMatch?.venue || "TBD"} subtext={nextMatch?.time || "TBD"} icon={MapPin} color="gold" />
        <StatCard title="Matches Played" value={myMatches.filter(m => m.status === "Completed").length} icon={Trophy} color="success" />
      </div>

      <div className="nec-card" style={{ padding: "14px 20px", marginBottom: "20px" }}>
        <label style={{ fontWeight: 600, marginRight: "12px" }}>Filter Matches:</label>
        <select
          className="nec-table-search-input"
          style={{ display: "inline-block", width: "auto" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Matches</option>
          <option value="upcoming">Upcoming & Live</option>
          <option value="past">Past Results</option>
        </select>
      </div>

      <Card title="Match Schedule" subtitle={`Showing ${filteredData.length} matches`}>
        <Table
          columns={columns}
          data={filteredData}
          loading={loading}
          searchable={false}
        />
      </Card>
    </div>
  );
}
