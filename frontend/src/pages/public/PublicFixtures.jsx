import React, { useEffect, useState } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import { Calendar, MapPin } from "lucide-react";
import "./PublicPortal.css";

export default function PublicFixtures() {
  const { t } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchesApi.getMatches().then(data => {
      setMatches(data);
      setLoading(false);
    });
  }, []);

  const columns = [
    { key: "sport", label: t.sportsCatalog || "Sport", width: "120px", render: (val) => <strong>{val}</strong> },
    { key: "teams", label: t.teamsCatalog || "Match Teams", render: (_, row) => <span>{row.teamA} ({row.deptA}) vs {row.teamB} ({row.deptB})</span> },
    { key: "date", label: "Date & Time", width: "160px", render: (_, row) => <span>📅 {row.date} • {row.time}</span> },
    { key: "venue", label: t.venues || "Venue", width: "200px", render: (val) => <span>📍 {val}</span> },
    { key: "round", label: "Round", width: "130px" },
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
        <h2 className="nec-page-title">{t.fixtures || "Tournament Fixtures & Schedule"}</h2>
        <p className="nec-page-desc">Complete game schedules, timings, and venue assignments for NEC campus tournaments.</p>
      </div>

      <Table
        columns={columns}
        data={matches}
        loading={loading}
        searchPlaceholder="Search by team, sport, date, venue..."
      />
    </div>
  );
}
