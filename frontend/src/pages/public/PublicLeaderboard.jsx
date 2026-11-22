import React, { useEffect, useState, useMemo, useCallback } from "react";
import { leaderboardApi, tournamentsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { Modal } from "../../components/common/Modal";
import {
  Trophy, BarChart3, Table as TableIcon, Search, Flame,
  Info, ExternalLink
} from "lucide-react";
import "./PublicPortal.css";

export default function PublicLeaderboard() {
  const [scope, setScope] = useState("Intramural"); // 'Intramural' | 'Inter-Collegiate'
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("chart"); // 'chart' | 'table'
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [academicYears, setAcademicYears] = useState([]);

  // Department Match Breakdown Modal state (for Intramural)
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptMatchesLoading, setDeptMatchesLoading] = useState(false);
  const [deptMatchesData, setDeptMatchesData] = useState(null);

  // Fetch academic years from tournaments
  useEffect(() => {
    tournamentsApi.getTournaments()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
        const set = new Set();
        list.forEach(t => {
          if (t.academic_year) set.add(t.academic_year);
          if (t.academicYear) set.add(t.academicYear);
        });
        setAcademicYears(Array.from(set).sort().reverse());
      })
      .catch(() => {});
  }, []);

  const fetchLeaderboard = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = {
      scope,
      academicYear: selectedYear === "ALL" ? "" : selectedYear
    };

    leaderboardApi.getLeaderboard(params)
      .then(data => {
        const list = Array.isArray(data) ? data : data?.data || [];
        setBoard(list);
        setLoading(false);
      })
      .catch(err => {
        console.error("[PublicLeaderboard] fetch error:", err);
        setError(err.message || "Unable to load leaderboard data.");
        setLoading(false);
      });
  }, [scope, selectedYear]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSelectDepartment = async (dept) => {
    if (scope === "Inter-Collegiate") return; // Department breakdown only for Intramural
    setSelectedDept(dept);
    setDeptMatchesLoading(true);
    setDeptMatchesData(null);
    try {
      const res = await leaderboardApi.getDepartmentMatches(dept.id || dept.department_id || dept.code);
      setDeptMatchesData(res);
    } catch (err) {
      console.error("Failed to load department match records:", err);
      setDeptMatchesData({ department: dept, matches: [] });
    } finally {
      setDeptMatchesLoading(false);
    }
  };

  const closeDeptModal = () => {
    setSelectedDept(null);
    setDeptMatchesData(null);
  };

  // Filter departments or institutions by search
  const filteredBoard = useMemo(() => {
    if (!searchQuery.trim()) return board;
    const q = searchQuery.toLowerCase().trim();
    return board.filter(item => {
      const name = (item.department || item.institution || item.name || "").toLowerCase();
      const code = (item.code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [board, searchQuery]);

  // Maximum points for proportional bar chart calculation
  const maxPoints = useMemo(() => {
    if (!board.length) return 1;
    return Math.max(...board.map(b => Number(b.total_points || 0)), 1);
  }, [board]);

  // Top 3 for podium highlight
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
      key: scope === "Inter-Collegiate" ? "institution" : "department",
      label: scope === "Inter-Collegiate" ? "College / Institution" : "Department",
      render: (val, r) => (
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
            {r?.institution || r?.department || r?.name || val}
          </div>
          {r?.code && (
            <span className="nec-fixture-dept-tag" style={{ marginTop: 2, display: "inline-block" }}>
              {r.code}
            </span>
          )}
        </div>
      )
    },
    {
      key: "gold",
      label: "🥇 Gold",
      render: (val) => (
        <span style={{ fontWeight: 700, color: "#d97706", fontSize: "0.92rem" }}>
          {val ?? 0}
        </span>
      )
    },
    {
      key: "silver",
      label: "🥈 Silver",
      render: (val) => (
        <span style={{ fontWeight: 700, color: "#64748b", fontSize: "0.92rem" }}>
          {val ?? 0}
        </span>
      )
    },
    {
      key: "bronze",
      label: "🥉 Bronze",
      render: (val) => (
        <span style={{ fontWeight: 700, color: "#b45309", fontSize: "0.92rem" }}>
          {val ?? 0}
        </span>
      )
    },
    {
      key: "wins",
      label: "Wins",
      render: (val) => (
        <span style={{ fontWeight: 600, color: "var(--nec-text-main)" }}>
          {val ?? 0}
        </span>
      )
    },
    {
      key: "total_points",
      label: "Total Points",
      render: (val, r) => (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{
            fontWeight: 800,
            fontSize: "1rem",
            color: r?.rank === 1 ? "#d97706" : "var(--nec-blue-accent, #0274be)"
          }}>
            {val ?? r?.points ?? 0} PTS
          </span>
          {scope === "Intramural" && (
            <button
              type="button"
              onClick={() => handleSelectDepartment(r)}
              style={{
                border: "none",
                background: "none",
                color: "var(--nec-text-muted)",
                cursor: "pointer",
                padding: "2px"
              }}
              title="View department match history"
            >
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page nec-public-leaderboard">
      {/* Header Banner */}
      <div className="nec-page-header" style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        paddingBottom: "16px"
      }}>
        <div>
          <h2 className="nec-page-title" style={{ margin: "0 0 4px" }}>
            Athletic Standings & Championship Rankings
          </h2>
          <p className="nec-page-desc" style={{ margin: 0 }}>
            Official institutional points tally, medal standings, and performance rankings across campus tournaments.
          </p>
        </div>

        {/* Academic Year Dropdown */}
        {academicYears.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Academic Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              <option value="ALL">All Academic Years</option>
              {academicYears.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Scope Switcher Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        justifyContent: "space-between",
        alignItems: "center",
        background: "var(--nec-surface)",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid var(--nec-border)"
      }}>
        {/* Scope Tabs */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={() => setScope("Intramural")}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: scope === "Intramural" ? "#0274be" : "transparent",
              color: scope === "Intramural" ? "#fff" : "var(--nec-text-muted)"
            }}
          >
            🏛️ Intramural Department Championship
          </button>
          <button
            type="button"
            onClick={() => setScope("Inter-Collegiate")}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 800,
              fontSize: "0.88rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: scope === "Inter-Collegiate" ? "#1e3a8a" : "transparent",
              color: scope === "Inter-Collegiate" ? "#fff" : "var(--nec-text-muted)"
            }}
          >
            🌐 Inter-Collegiate Institution Standings
          </button>
        </div>

        {/* Scoring Policy Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
          <Info size={14} style={{ color: "var(--nec-gold)" }} />
          <span>Scoring Rules: 🥇 Gold = 15 pts • 🥈 Silver = 10 pts • 🥉 Bronze = 5 pts • Win = 5 pts</span>
        </div>
      </div>

      {/* Loading or Error State */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : error ? (
        <PublicInfoCard
          icon={Trophy}
          title="Unable to Load Leaderboard"
          message={error}
          actionText="Retry"
          onAction={fetchLeaderboard}
        />
      ) : board.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <Trophy size={48} style={{ color: "var(--nec-gold)", margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 8px", color: "var(--nec-text-main)" }}>No Standings Recorded Yet</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", maxWidth: "460px", marginInline: "auto" }}>
            {scope === "Inter-Collegiate"
              ? "No inter-collegiate match results have been recorded for this academic year yet."
              : "Intramural departmental standings will appear here once competitions and matches conclude."}
          </p>
        </Card>
      ) : (
        <>
          {/* Top 3 Visual Championship Podium */}
          {topThree.length >= 2 && (
            <div className="nec-podium-card" style={{
              background: "linear-gradient(135deg, #0d233a 0%, #173f67 100%)",
              color: "#fff",
              borderRadius: "16px",
              padding: "28px 24px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.18)"
            }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <span style={{ color: "#f5c451", fontSize: "0.78rem", fontWeight: 800, letterSpacing: "1px" }}>
                  CURRENT CHAMPIONSHIP LEADERS
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
                  {scope === "Inter-Collegiate" ? "Top Performing Institutions" : "Department Championship Podium"}
                </h3>
              </div>

              <div className="nec-podium-container" style={{
                display: "grid",
                gridTemplateColumns: topThree.length === 3 ? "1fr 1.15fr 1fr" : "1fr 1fr",
                gap: "16px",
                alignItems: "flex-end",
                maxWidth: "680px",
                margin: "0 auto"
              }}>
                {/* 2nd Place (Silver) */}
                {topThree[1] && (
                  <div
                    className="nec-podium-slot rank-2"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                      border: "1px solid rgba(255,255,255,0.18)",
                      cursor: scope === "Intramural" ? "pointer" : "default"
                    }}
                    onClick={() => handleSelectDepartment(topThree[1])}
                  >
                    <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>🥈</div>
                    <Badge style={{ background: "#94a3b8", color: "#0f172a", fontWeight: 800, fontSize: "0.72rem" }}>
                      2ND PLACE
                    </Badge>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", marginTop: "8px" }}>
                      {topThree[1].institution || topThree[1].department || topThree[1].name}
                    </div>
                    {topThree[1].code && (
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>{topThree[1].code}</div>
                    )}
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#f5c451", marginTop: "8px" }}>
                      {topThree[1].total_points} PTS
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
                      🥇 {topThree[1].gold || 0} • 🥈 {topThree[1].silver || 0} • 🥉 {topThree[1].bronze || 0}
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold) */}
                {topThree[0] && (
                  <div
                    className="nec-podium-slot rank-1"
                    style={{
                      background: "linear-gradient(180deg, rgba(245, 196, 81, 0.22) 0%, rgba(245, 196, 81, 0.08) 100%)",
                      borderRadius: "14px",
                      padding: "20px 16px",
                      textAlign: "center",
                      border: "2px solid #f5c451",
                      boxShadow: "0 8px 24px rgba(245, 196, 81, 0.25)",
                      transform: "translateY(-10px)",
                      cursor: scope === "Intramural" ? "pointer" : "default"
                    }}
                    onClick={() => handleSelectDepartment(topThree[0])}
                  >
                    <div style={{ fontSize: "2.3rem", marginBottom: "6px" }}>🥇</div>
                    <Badge style={{ background: "#f5c451", color: "#0d233a", fontWeight: 900, fontSize: "0.78rem" }}>
                      CHAMPION • 1ST
                    </Badge>
                    <div style={{ fontWeight: 900, fontSize: "1.15rem", color: "#fff", marginTop: "10px" }}>
                      {topThree[0].institution || topThree[0].department || topThree[0].name}
                    </div>
                    {topThree[0].code && (
                      <div style={{ fontSize: "0.78rem", color: "#f5c451" }}>{topThree[0].code}</div>
                    )}
                    <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#f5c451", marginTop: "8px" }}>
                      {topThree[0].total_points} PTS
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.85)", marginTop: "4px" }}>
                      🥇 {topThree[0].gold || 0} • 🥈 {topThree[0].silver || 0} • 🥉 {topThree[0].bronze || 0}
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {topThree[2] && (
                  <div
                    className="nec-podium-slot rank-3"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                      border: "1px solid rgba(255,255,255,0.18)",
                      cursor: scope === "Intramural" ? "pointer" : "default"
                    }}
                    onClick={() => handleSelectDepartment(topThree[2])}
                  >
                    <div style={{ fontSize: "1.8rem", marginBottom: "6px" }}>🥉</div>
                    <Badge style={{ background: "#d97706", color: "#fff", fontWeight: 800, fontSize: "0.72rem" }}>
                      3RD PLACE
                    </Badge>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", marginTop: "8px" }}>
                      {topThree[2].institution || topThree[2].department || topThree[2].name}
                    </div>
                    {topThree[2].code && (
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>{topThree[2].code}</div>
                    )}
                    <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#f5c451", marginTop: "8px" }}>
                      {topThree[2].total_points} PTS
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginTop: "4px" }}>
                      🥇 {topThree[2].gold || 0} • 🥈 {topThree[2].silver || 0} • 🥉 {topThree[2].bronze || 0}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Toolbar: Search & Chart/Table Switcher */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            {/* Search Box */}
            <div style={{ position: "relative", minWidth: "260px", flex: "1 1 280px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
              <input
                type="text"
                placeholder={scope === "Inter-Collegiate" ? "Search institutions..." : "Search departments by name or code..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: "8px",
                  border: "1px solid var(--nec-border)",
                  background: "var(--nec-surface)",
                  color: "var(--nec-text-main)",
                  fontSize: "0.88rem"
                }}
              />
            </div>

            {/* View Mode Switcher */}
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant={viewMode === "chart" ? "primary" : "outline"}
                size="sm"
                onClick={() => setViewMode("chart")}
              >
                <BarChart3 size={14} style={{ marginRight: 6 }} /> Visual Chart
              </Button>
              <Button
                variant={viewMode === "table" ? "primary" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <TableIcon size={14} style={{ marginRight: 6 }} /> Classic Table
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
                    {scope === "Inter-Collegiate" ? "Institution Points Standing & Progress" : "Department Points Standing & Progress"}
                  </span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                  Showing {filteredBoard.length} contenders
                </span>
              </div>

              {filteredBoard.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--nec-text-muted)" }}>
                  No match found for your search query.
                </div>
              ) : (
                filteredBoard.map((item, idx) => {
                  const pts = Number(item.total_points || 0);
                  const pct = Math.max(6, Math.round((pts / maxPoints) * 100));
                  const rankNumber = item.rank || (idx + 1);
                  const itemName = item.institution || item.department || item.name;

                  return (
                    <div
                      key={item.id || item.code || idx}
                      className="nec-barchart-item"
                      onClick={() => handleSelectDepartment(item)}
                      style={{ cursor: scope === "Intramural" ? "pointer" : "default" }}
                    >
                      <div className="nec-barchart-item-header">
                        <div className="nec-barchart-dept-info">
                          <span className="nec-barchart-rank-pill">
                            {rankNumber === 1 ? "🥇" : rankNumber === 2 ? "🥈" : rankNumber === 3 ? "🥉" : `#${rankNumber}`}
                          </span>
                          <div>
                            <span className="nec-barchart-dept-text" style={{ fontWeight: 700 }}>
                              {itemName}
                            </span>
                            {item.code && (
                              <span className="nec-fixture-dept-tag" style={{ marginLeft: 8 }}>
                                {item.code}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="nec-barchart-meta">
                          <div className="nec-barchart-medals">
                            <span>🥇 {item.gold || 0}</span>
                            <span>🥈 {item.silver || 0}</span>
                            <span>🥉 {item.bronze || 0}</span>
                          </div>
                          <span className="nec-barchart-score" style={{ fontWeight: 800 }}>{pts} PTS</span>
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
                              : "linear-gradient(90deg, #0274be 0%, #3b82f6 100%)"
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
              searchPlaceholder={scope === "Inter-Collegiate" ? "Search institutions..." : "Search departments..."}
            />
          )}
        </>
      )}

      {/* Department Matches Breakdown Modal */}
      {selectedDept && (
        <Modal
          isOpen={Boolean(selectedDept)}
          onClose={closeDeptModal}
          title={`${selectedDept.name || selectedDept.department || "Department"} Match History`}
          size="lg"
        >
          <div style={{ padding: "4px 0" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--nec-surface-raised)",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "16px"
            }}>
              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>Performance Record</span>
                <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--nec-text-main)" }}>
                  {selectedDept.name || selectedDept.department}
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: "#f5c451" }}>{selectedDept.total_points} PTS</span>
                <span>🥇 {selectedDept.gold || 0}</span>
                <span>🥈 {selectedDept.silver || 0}</span>
                <span>🥉 {selectedDept.bronze || 0}</span>
              </div>
            </div>

            {deptMatchesLoading ? (
              <SkeletonLoader rows={4} />
            ) : !deptMatchesData?.matches?.length ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--nec-text-muted)" }}>
                No completed matches found for this department.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                {deptMatchesData.matches.map(m => (
                  <div
                    key={m.match_id || m.id}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid var(--nec-border)",
                      background: "var(--nec-surface)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
                        {m.sport_name} • {m.round} • {m.tournament_name}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--nec-text-main)" }}>
                        vs {m.opponent_team || m.opponent_dept_name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
                        Score: {m.dept_score} - {m.opponent_score}
                      </div>
                    </div>
                    <Badge variant={m.outcome === "Won" ? "success" : m.outcome === "Lost" ? "danger" : "default"}>
                      {m.outcome}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <Button variant="secondary" onClick={closeDeptModal}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
