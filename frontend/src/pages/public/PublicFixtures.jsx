import React, { useEffect, useState } from "react";
import { matchesApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Calendar } from "lucide-react";

export default function PublicFixtures({ departmentCode }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatches = () => {
    setLoading(true);
    setError(null);
    matchesApi.getMatches()
      .then(data => {
        const scheduledMatches = data.filter((match) => match.status === "Scheduled");
        setMatches(departmentCode
          ? scheduledMatches.filter((match) => match.deptA === departmentCode || match.deptB === departmentCode)
          : scheduledMatches);
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
  }, [departmentCode]);

  const columns = [
    { key: "date", label: "Date & Time" },
    { key: "sport", label: "Sport" },
    { key: "round", label: "Round" },
    {
      key: "matchup",
      label: "Match",
      render: (_, row) => `${row?.teamA || row?.team_a_name || 'Team A'} (${row?.deptA || row?.dept_a_code || '—'}) vs ${row?.teamB || row?.team_b_name || 'Team B'} (${row?.deptB || row?.dept_b_code || '—'})`
    },
    { key: "venue", label: "Venue" },
    { 
      key: "status", 
      label: "Status",
      render: (val) => <Badge status="scheduled">{val || "Scheduled"}</Badge>
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{departmentCode ? "Department Match Fixtures" : "Match Fixtures & Schedules"}</h2>
        <p className="nec-page-desc">{departmentCode ? `Upcoming fixtures involving ${departmentCode}.` : "Upcoming sports events, department matches, and tournament schedules."}</p>
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
