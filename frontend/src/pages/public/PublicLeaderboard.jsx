import React, { useEffect, useState } from "react";
import { leaderboardApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import { Trophy, Award, Medal } from "lucide-react";
import "./PublicPortal.css";

export default function PublicLeaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardApi.getLeaderboard().then(data => {
      setBoard(data);
      setLoading(false);
    });
  }, []);

  const columns = [
    { key: "rank", label: "Rank", width: "80px", render: (val) => <strong>#{val}</strong> },
    { key: "deptName", label: "Department", render: (_, row) => <span><strong>{row.deptCode}</strong> - {row.deptName}</span> },
    { key: "gold", label: "🥇 Gold", width: "100px", render: (val) => <span className="nec-gold-badge">{val}</span> },
    { key: "silver", label: "🥈 Silver", width: "100px", render: (val) => <span className="nec-silver-badge">{val}</span> },
    { key: "bronze", label: "🥉 Bronze", width: "100px", render: (val) => <span className="nec-bronze-badge">{val}</span> },
    { key: "points", label: "Total Points", width: "120px", render: (val) => <strong className="nec-points-val">{val} pts</strong> }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Inter-Department Medal Tally & Leaderboard</h2>
        <p className="nec-page-desc">Overall department rankings for National Engineering College Championship 2025-2026.</p>
      </div>

      <Table
        columns={columns}
        data={board}
        loading={loading}
        searchable={false}
      />
    </div>
  );
}
