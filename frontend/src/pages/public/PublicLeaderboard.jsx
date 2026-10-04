import React, { useEffect, useState, useMemo } from "react";
import { leaderboardApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { Trophy, BarChart3, Table as TableIcon, Search, Award, Medal, Flame } from "lucide-react";
import "./PublicPortal.css";

export default function PublicLeaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("chart"); // 'chart' | 'table'
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLeaderboard = () => {
    setLoading(true);
    setError(null);
    leaderboardApi.getLeaderboard()
      .then(data => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setBoard(list);
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

  // Filter departments by search
  const filteredBoard = useMemo(() => {
    if (!searchQuery.trim()) return board;
    const q = searchQuery.toLowerCase().trim();
    return board.filter(item => {
      const name = (item.department || item.name || "").toLowerCase();
      const code = (item.code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [board, searchQuery]);

  // Maximum points for proportional bar chart calculation
  const maxPoints = useMemo(() => {
    if (!board.length) return 1;
    return Math.max(...board.map(b => Number(b.total_points || 0)), 1);
  }, [board]);

  // Top 3 departments for podium highlight
  const topThree = useMemo(() => {
    return board.slice(0, 3);
  }, [board]);

  // Columns for classic table view
  const columns = [
    {
      key: "rank",
      label: "Rank",
      render: (val, r) => (
        <span style={{ fontWeight: 800, fontSize: "1.05rem", color: r?.rank === 1 ? "#d97706" : "var(--nec-text-main)" }}>
          #{val ?? r?.rank}
        </span>
      )
    },
    {
      key: "department",
      label: "Department",
      render: (val, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="nec-fixture-dept-tag">{r.code || "DEP"}</span>
          <span style={{ fontWeight: 600 }}>{val || r.name}</span>
        </div>
      )
    },
    { key: "gold", label: "Gold 🥇", render: (v) => <span>{v || 0}</span> },
    { key: "silver", label: "Silver 🥈", render: (v) => <span>{v || 0}</span> },
    { key: "bronze", label: "Bronze 🥉", render: (v) => <span>{v || 0}</span> },
    {
      key: "total_points",
      label: "Total Points",
      render: (val, r) => <Badge status="live">{val ?? r?.total_points} PTS</Badge>
    }
  ];

  return (
    <div className="nec-portal-page nec-leaderboard-container">
      {/* Page Header */}
      <div className="nec-page-header">
        <h1 className="nec-page-title">Department Leaderboard</h1>
      </div>

      {(error || (!loading && board.length === 0)) ? (
        <PublicInfoCard
          icon={Trophy}
          title="Competition Rankings Are Not Available Yet"
          message="Leaderboards will be automatically updated as tournament matches conclude."
        />
      ) : loading ? (
        <SkeletonLoader rows={4} />
      ) : (
        <>
          {/* Top 3 Podium Cards */}
          {topThree.length > 0 && !searchQuery && (
            <div className="nec-podium-grid">
              {topThree.map((dept, idx) => {
                const rankNum = idx + 1;
                const medalEmoji = rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : "🥉";
                const rankClass = rankNum === 1 ? "rank-1" : rankNum === 2 ? "rank-2" : "rank-3";
                const rankTitle = rankNum === 1 ? "Tournament Leader" : rankNum === 2 ? "Second Place" : "Third Place";

                return (
                  <div key={dept.id || dept.code || idx} className={`nec-podium-card ${rankClass}`}>
                    <div>
                      <div className="nec-podium-head">
                        <span className="nec-podium-medal">{medalEmoji}</span>
                        <span className="nec-podium-rank-badge">{rankTitle}</span>
                      </div>
                      <h3 className="nec-podium-dept-name">{dept.department || dept.name}</h3>
                      <span className="nec-podium-dept-code">{dept.code}</span>
                    </div>

                    <div>
                      <div className="nec-podium-pts">{dept.total_points || 0} PTS</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "6px", fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                        <span>🥇 {dept.gold || 0}</span>
                        <span>🥈 {dept.silver || 0}</span>
                        <span>🥉 {dept.bronze || 0}</span>
                        {Number(dept.wins || 0) > 0 && <span>• {dept.wins} Win{Number(dept.wins) > 1 ? "s" : ""}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leaderboard Toolbar & View Toggle */}
          <div className="nec-leaderboard-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, maxWidth: 360 }}>
              <div className="nec-od-name-search-box" style={{ width: "100%", maxWidth: "100%" }}>
                <Search size={15} color="var(--nec-text-muted, #94a3b8)" />
                <input
                  type="text"
                  placeholder="Filter department by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter department leaderboard"
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                variant={viewMode === "chart" ? "primary" : "outline"}
                size="sm"
                onClick={() => setViewMode("chart")}
              >
                <BarChart3 size={14} style={{ marginRight: 6 }} />
                Visual Chart
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <TableIcon size={14} style={{ marginRight: 6 }} />
                Classic Table
              </Button>
            </div>
          </div>

          {/* View Content: Visual Bar Chart vs Classic Table */}
          {viewMode === "chart" ? (
            <div className="nec-barchart-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--nec-border)", paddingBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Flame size={18} color="#f59e0b" />
                  <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--nec-text-main)" }}>
                    Department Points Standing & Progress
                  </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                  Showing {filteredBoard.length} departments
                </span>
              </div>

              {filteredBoard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--nec-text-muted)" }}>
                  No department matched your search query.
                </div>
              ) : (
                filteredBoard.map((dept, idx) => {
                  const pts = Number(dept.total_points || 0);
                  const pct = Math.max(6, Math.round((pts / maxPoints) * 100));
                  const deptColor = dept.color_code || "#1e40af";
                  const rankNumber = dept.rank || (idx + 1);

                  return (
                    <div key={dept.id || dept.code || idx} className="nec-barchart-item">
                      <div className="nec-barchart-item-header">
                        <div className="nec-barchart-dept-info">
                          <span className="nec-barchart-rank-pill">
                            {rankNumber === 1 ? "🥇" : rankNumber === 2 ? "🥈" : rankNumber === 3 ? "🥉" : `#${rankNumber}`}
                          </span>
                          <div>
                            <span className="nec-barchart-dept-text">
                              {dept.department || dept.name}
                            </span>
                            <span className="nec-fixture-dept-tag" style={{ marginLeft: 8 }}>
                              {dept.code}
                            </span>
                          </div>
                        </div>

                        <div className="nec-barchart-meta">
                          <div className="nec-barchart-medals">
                            <span>🥇 {dept.gold || 0}</span>
                            <span>🥈 {dept.silver || 0}</span>
                            <span>🥉 {dept.bronze || 0}</span>
                          </div>
                          <span className="nec-barchart-score">{pts} PTS</span>
                        </div>
                      </div>

                      {/* Visual Proportional Horizontal Bar */}
                      <div className="nec-barchart-track" title={`${pts} points (${pct}% of leader)`}>
                        <div
                          className="nec-barchart-fill"
                          style={{
                            width: `${pct}%`,
                            background: rankNumber === 1
                              ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                              : rankNumber === 2
                              ? "linear-gradient(90deg, #64748b 0%, #94a3b8 100%)"
                              : rankNumber === 3
                              ? "linear-gradient(90deg, #b45309 0%, #d97706 100%)"
                              : `linear-gradient(90deg, ${deptColor} 0%, rgba(30, 64, 175, 0.7) 100%)`
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <Table
              columns={columns}
              data={filteredBoard}
              loading={loading}
              searchable={false}
            />
          )}
        </>
      )}
    </div>
  );
}
