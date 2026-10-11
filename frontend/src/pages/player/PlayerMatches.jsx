import React, { useEffect, useState } from "react";
import { Card, StatCard } from "../../components/common/Card";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { useAuth } from "../../context/AuthContext";
import { matchesApi, reportsApi } from "../../services/api/apiServices";
import ErrorState from "../../components/common/ErrorState";
import { Calendar, MapPin, Trophy } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerMatches() {
  const { currentUser, t } = useAuth();
  const playerDept = currentUser.dept || "";
  const playerName = currentUser.name || currentUser.username || "";

  const [myMatches, setMyMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // "all", "upcoming", "past"

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      matchesApi.getMatches(),
      reportsApi.getPlayerPerformanceReport()
    ]).then(([matches, portfolio]) => {
      const matchIds = new Set((portfolio.matches || []).map(m => Number(m.match_id)));
      const filteredMatches = matches.filter(m => matchIds.has(Number(m.id || m.match_id)));
      setMyMatches(filteredMatches);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
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
    if (filter === "upcoming") return m.status === "Scheduled" || m.status === "Ongoing";
    if (filter === "past") return m.status === "Completed";
    return true;
  });

  const nextMatch = myMatches.find(m => m.status === "Scheduled" || m.status === "Ongoing") || myMatches[0];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.myMatches || "My Fixtures & Results"}</h2>
        <p className="nec-page-desc">View your upcoming match schedule and past performance.</p>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadData} />
        </div>
      ) : (
        <>
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
              emptyMessage="No matches found matching the criteria."
            />
          </Card>
        </>
      )}
    </div>
  );
}
