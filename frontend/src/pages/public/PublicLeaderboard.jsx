import React, { useEffect, useState } from "react";
import { leaderboardApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Trophy } from "lucide-react";

export default function PublicLeaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = () => {
    setLoading(true);
    setError(null);
    leaderboardApi.getLeaderboard()
      .then(data => {
        setBoard(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const columns = [
    { key: "rank", label: "Rank", render: (val, r) => <strong style={{fontSize:"1.1rem"}}>#{val ?? r?.rank}</strong> },
    { key: "department", label: "Department" },
    { key: "gold", label: "Gold 🥇" },
    { key: "silver", label: "Silver 🥈" },
    { key: "bronze", label: "Bronze 🥉" },
    { key: "total_points", label: "Total Points", render: (val, r) => <Badge status="live">{val ?? r?.total_points} PTS</Badge> }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Department Leaderboard</h2>
        <p className="nec-page-desc">Overall standings and medal tally for the current academic year.</p>
      </div>

      {(error || (!loading && board.length === 0)) ? (
        <PublicInfoCard
          icon={Trophy}
          title="Competition Rankings Are Not Available Yet"
          message="Leaderboards will be published after competitions begin."
        />
      ) : (
        <Table
          columns={columns}
          data={board}
          loading={loading}
          searchable={false}
        />
      )}
    </div>
  );
}
