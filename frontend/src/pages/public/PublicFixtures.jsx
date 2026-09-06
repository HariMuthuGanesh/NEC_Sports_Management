import React, { useEffect, useState } from "react";
import { matchesApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Calendar } from "lucide-react";

export default function PublicFixtures() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatches = () => {
    setLoading(true);
    setError(null);
    matchesApi.getMatches()
      .then(data => {
        setMatches(data.filter(m => m.status === "Scheduled"));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const columns = [
    { key: "date", label: "Date & Time" },
    { key: "sport", label: "Sport" },
    { key: "round", label: "Round" },
    { 
      key: "teams", 
      label: "Match",
      render: (m) => `${m.teamA} (${m.deptA}) vs ${m.teamB} (${m.deptB})`
    },
    { key: "venue", label: "Venue" },
    { 
      key: "status", 
      label: "Status",
      render: () => <Badge status="scheduled">Scheduled</Badge>
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Match Fixtures & Schedules</h2>
        <p className="nec-page-desc">Upcoming sports events, department matches, and tournament schedules.</p>
      </div>

      {(error || (!loading && matches.length === 0)) ? (
        <PublicInfoCard
          icon={Calendar}
          title="No Upcoming Fixtures"
          message="The next tournament schedule hasn't been published yet. Please check again later for upcoming matches."
        />
      ) : (
        <Table
          columns={columns}
          data={matches}
          loading={loading}
          searchPlaceholder="Search by team, sport, date, venue..."
        />
      )}
    </div>
  );
}
