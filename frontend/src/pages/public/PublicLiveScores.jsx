import React, { useState, useCallback, useMemo } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Modal } from "../../components/common/Modal";
import Button from "../../components/common/Button";
import {
  Trophy, Eye, MapPin, Radio, RefreshCw
} from "lucide-react";
import "./PublicPortal.css";

// Helper for formatting date strings cleanly
function formatMatchDate(val) {
  if (!val) return "Recent";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(val);
  }
}

function formatMatchTime(val) {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "";
  }
}

// Clean winner resolver ensuring NO "Winner: Completed" ever appears
function resolveWinnerDisplay(m) {
  if (m.winner && m.winner !== "Completed") return m.winner;
  if (m.winner_name && m.winner_name !== "Completed") return m.winner_name;
  if (m.winner_team_name && m.winner_team_name !== "Completed") return m.winner_team_name;
  
  const scoreA = Number(m.score_a ?? m.scoreA ?? 0);
  const scoreB = Number(m.score_b ?? m.scoreB ?? 0);
  const teamA = m.team_a_name || m.teamA || "Team A";
  const teamB = m.team_b_name || m.teamB || "Team B";

  if (scoreA > scoreB) return teamA;
  if (scoreB > scoreA) return teamB;
  if (scoreA === scoreB && (scoreA > 0 || scoreB > 0)) return "Match Drawn / Tied";

  return "Match Completed";
}

// Helper to extract player scorers from structured scorers field or detailScore
function parseMatchScorers(match) {
  if (!match) return { teamAScorers: [], teamBScorers: [], rawNotes: "" };

  let teamAScorers = [];
  let teamBScorers = [];
  let rawNotes = match.detail_score || match.detailScore || "";

  if (match.scorers) {
    try {
      const parsed = typeof match.scorers === "string" ? JSON.parse(match.scorers) : match.scorers;
      if (parsed.teamA || parsed.scorersA) {
        const listA = parsed.teamA || parsed.scorersA;
        teamAScorers = Array.isArray(listA) ? listA : String(listA).split(",").map(s => s.trim()).filter(Boolean);
      }
      if (parsed.teamB || parsed.scorersB) {
        const listB = parsed.teamB || parsed.scorersB;
        teamBScorers = Array.isArray(listB) ? listB : String(listB).split(",").map(s => s.trim()).filter(Boolean);
      }
    } catch {
      if (typeof match.scorers === "string" && match.scorers.trim()) {
        rawNotes = `${rawNotes ? rawNotes + " • " : ""}${match.scorers}`;
      }
    }
  }

  if (rawNotes && teamAScorers.length === 0 && teamBScorers.length === 0) {
    const segments = rawNotes.split("|").map(s => s.trim());
    segments.forEach(seg => {
      const nameA = (match.team_a_name || match.teamA || "").toLowerCase();
      const nameB = (match.team_b_name || match.teamB || "").toLowerCase();
      const deptA = (match.dept_a_code || match.deptA || "").toLowerCase();
      const deptB = (match.dept_b_code || match.deptB || "").toLowerCase();

      const colonIdx = seg.indexOf(":");
      if (colonIdx > -1) {
        const prefix = seg.substring(0, colonIdx).trim().toLowerCase();
        const value = seg.substring(colonIdx + 1).trim();

        if ((nameA && prefix.includes(nameA)) || (deptA && prefix.includes(deptA)) || prefix.includes("goals") || prefix.includes("scorers")) {
          if (!nameB || !prefix.includes(nameB)) {
            teamAScorers.push(...value.split(",").map(x => x.trim()).filter(Boolean));
            return;
          }
        }

        if ((nameB && prefix.includes(nameB)) || (deptB && prefix.includes(deptB))) {
          teamBScorers.push(...value.split(",").map(x => x.trim()).filter(Boolean));
          return;
        }
      }
    });
  }

  return { teamAScorers, teamBScorers, rawNotes };
}

export default function PublicLiveScores() {
  const { t } = useAuth();
  const [scope, setScope] = useState("ALL"); // 'ALL', 'Intramural', 'Inter-Collegiate'
  const [activeTab, setActiveTab] = useState("ALL"); // 'ALL', 'LIVE', 'TODAY', 'COMPLETED'
  const [selectedMatch, setSelectedMatch] = useState(null);

  const fetchMatches = useCallback(async () => {
    const params = {
      includeCompetitions: true,
      ...(scope === "ALL" ? {} : { scope })
    };
    const res = await matchesApi.getMatches(params);
    return Array.isArray(res) ? res : [];
  }, [scope]);

  const { data: matchesData, loading, error, refetch } = useAutoRefresh(fetchMatches, {
    interval: 15000,
    deps: [scope]
  });

  const matches = matchesData || [];

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const liveList = useMemo(() => {
    return matches.filter(m => m.status === "Ongoing");
  }, [matches]);

  const todayList = useMemo(() => {
    return matches.filter(m => {
      const matchDate = (m.scheduled_time || m.date || "").slice(0, 10);
      return matchDate === todayStr;
    });
  }, [matches, todayStr]);

  const completedList = useMemo(() => {
    return matches.filter(m => m.status === "Completed");
  }, [matches]);

  const displayedMatches = useMemo(() => {
    if (activeTab === "LIVE") return liveList;
    if (activeTab === "TODAY") return todayList;
    if (activeTab === "COMPLETED") return completedList;
    return matches;
  }, [activeTab, matches, liveList, todayList, completedList]);

  const modalScorerData = selectedMatch ? parseMatchScorers(selectedMatch) : null;

  return (
    <div className="nec-portal-page nec-public-live-scores">
      {/* Page Header */}
      <div className="nec-page-header" style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        paddingBottom: "16px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: liveList.length > 0 ? "#ef4444" : "#22c55e",
              boxShadow: liveList.length > 0 ? "0 0 8px #ef4444" : "none"
            }} />
            <h2 className="nec-page-title" style={{ margin: 0 }}>
              Live Scores & Match Center
            </h2>
          </div>
          <p className="nec-page-desc" style={{ margin: 0 }}>
            Real-time score updates, live match tracking, and verified results across Intra College and Inter College athletic meets.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={refetch} disabled={loading}>
            Refresh Scores
          </Button>
          <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
            ⚡ Auto-refreshes every 15s
          </span>
        </div>
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
        {/* Scope Buttons */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "ALL", label: "All" },
            { id: "Intramural", label: "Intra College" },
            { id: "Inter-Collegiate", label: "Inter College" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                background: scope === tab.id ? "var(--nec-blue-accent, #0274be)" : "transparent",
                color: scope === tab.id ? "#fff" : "var(--nec-text-muted)",
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status / Category Filter Tabs */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "ALL", label: `All (${matches.length})` },
            { id: "LIVE", label: `🔴 Live (${liveList.length})` },
            { id: "TODAY", label: `Today (${todayList.length})` },
            { id: "COMPLETED", label: `Completed (${completedList.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid var(--nec-border)",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
                background: activeTab === tab.id ? "var(--nec-surface-raised)" : "transparent",
                color: activeTab === tab.id ? "var(--nec-blue-accent)" : "var(--nec-text-muted)"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Score Center Display */}
      {loading && matches.length === 0 ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : error ? (
        <PublicInfoCard
          icon={Radio}
          title="Unable to Load Live Scores"
          message={error.message || "Failed to establish real-time connection. Please retry."}
          actionText="Retry"
          onAction={refetch}
        />
      ) : displayedMatches.length === 0 ? (
        <Card style={{ padding: "40px", textAlign: "center" }}>
          <Radio size={40} style={{ color: "var(--nec-text-muted)", margin: "0 auto 12px" }} />
          <h3 style={{ margin: "0 0 6px", color: "var(--nec-text-main)" }}>No Matches Found</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)" }}>
            {activeTab === "LIVE"
              ? "No matches currently active right now. Switch to 'Today' or 'Completed' to view other fixtures."
              : "No match records found for the current selection."}
          </p>
          <div style={{ marginTop: "16px" }}>
            <Button variant="secondary" size="sm" onClick={() => { setActiveTab("ALL"); setScope("ALL"); }}>
              View All Matches
            </Button>
          </div>
        </Card>
      ) : (
        <div className="nec-matches-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 440px), 1fr))",
          gap: "18px"
        }}>
          {displayedMatches.map(m => {
            const isLive = m.status === "Ongoing";
            const isCompleted = m.status === "Completed";
            const isInter = (m.scope || m.tournament_scope) === "Inter-Collegiate";
            const winnerText = isCompleted ? resolveWinnerDisplay(m) : null;

            return (
              <Card
                key={m.match_id || m.id}
                className={`nec-score-card ${isLive ? "live" : isCompleted ? "completed" : ""}`}
                style={{
                  borderRadius: "14px",
                  border: isLive ? "2px solid #ef4444" : "1px solid var(--nec-border)",
                  boxShadow: isLive ? "0 6px 20px rgba(239, 68, 68, 0.18)" : "var(--nec-shadow-sm)",
                  cursor: isCompleted ? "pointer" : "default",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
                onClick={() => {
                  if (isCompleted) setSelectedMatch(m);
                }}
              >
                {/* Match Header */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <Badge style={{
                        background: isInter ? "#1e3a8a" : "#4338ca",
                        color: "#fff",
                        fontSize: "0.72rem",
                        fontWeight: 700
                      }}>
                        {m.sport_name || m.sport || "Sport"}
                      </Badge>
                      <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>
                        {m.round} {m.pool ? `• ${m.pool}` : ""}
                      </span>
                    </div>

                    <Badge variant={isLive ? "success" : isCompleted ? "default" : "primary"} style={{
                      fontWeight: 800,
                      fontSize: "0.72rem",
                      background: isLive ? "#ef4444" : undefined,
                      color: isLive ? "#fff" : undefined
                    }}>
                      {isLive ? "🔴 LIVE" : isCompleted ? "🏁 FINAL" : "📅 SCHEDULED"}
                    </Badge>
                  </div>

                  <div style={{
                    fontSize: "0.8rem",
                    color: "var(--nec-text-muted)",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap"
                  }}>
                    <span style={{ fontWeight: 600 }}>{m.tournament_name || m.tournamentName || "Tournament"}</span>
                    {(m.event_name || m.eventName) && (
                      <>
                        <span style={{ color: "var(--nec-border)" }}>•</span>
                        <span style={{
                          fontWeight: 700,
                          color: "var(--nec-blue-accent, #0274be)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px"
                        }}>
                          <Trophy size={12} />
                          {m.event_name || m.eventName}
                        </span>
                      </>
                    )}
                    {m.competition_format && (
                      <span style={{
                        fontSize: "0.68rem",
                        background: "var(--nec-surface-raised)",
                        padding: "1px 5px",
                        borderRadius: "4px"
                      }}>
                        {m.competition_format}
                      </span>
                    )}
                  </div>

                  {/* Teams & Scores Row */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--nec-surface-raised)",
                    padding: "14px 16px",
                    borderRadius: "10px",
                    margin: "8px 0"
                  }}>
                    {/* Team A */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--nec-text-main)", lineHeight: 1.2 }}>
                        {m.team_a_name || m.teamA}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "2px" }}>
                        {m.dept_a_code || m.deptA || m.team_a_institution}
                      </div>
                    </div>

                    {/* Center Score Badge */}
                    <div style={{ textAlign: "center", padding: "0 16px" }}>
                      <div style={{
                        fontSize: "1.5rem",
                        fontWeight: 800,
                        color: isLive ? "#ef4444" : "var(--nec-text-main)",
                        letterSpacing: "1px"
                      }}>
                        {m.score_a ?? m.scoreA ?? 0} - {m.score_b ?? m.scoreB ?? 0}
                      </div>
                      {(m.detail_score || m.detailScore) && (
                        <div style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 600, marginTop: "2px" }}>
                          {m.detail_score || m.detailScore}
                        </div>
                      )}
                    </div>

                    {/* Team B */}
                    <div style={{ flex: 1, textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--nec-text-main)", lineHeight: 1.2 }}>
                        {m.team_b_name || m.teamB}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "2px" }}>
                        {m.dept_b_code || m.deptB || m.team_b_institution}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Match Footer */}
                <div style={{
                  borderTop: "1px solid var(--nec-border)",
                  paddingTop: "10px",
                  marginTop: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.8rem",
                  color: "var(--nec-text-muted)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={13} style={{ color: "#e11d48" }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                      {m.venue_name || m.venue || "Campus Ground"}
                    </span>
                  </div>

                  {isCompleted ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#16a34a", fontWeight: 700 }}>
                      <Trophy size={13} />
                      <span>{winnerText}</span>
                      <Eye size={12} style={{ marginLeft: "4px", color: "var(--nec-blue-accent)" }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.78rem" }}>
                      {formatMatchDate(m.scheduled_time || m.date)} {formatMatchTime(m.scheduled_time || m.date)}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Match Details & Scorers Breakdown Modal */}
      {selectedMatch && (
        <Modal
          isOpen={Boolean(selectedMatch)}
          onClose={() => setSelectedMatch(null)}
          title="Match Summary & Scoring Breakdown"
          size="md"
        >
          <div style={{ padding: "8px 0" }}>
            {/* Top Match Card in Modal */}
            <div style={{
              background: "var(--nec-surface-raised)",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "16px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)", fontWeight: 700, marginBottom: "4px" }}>
                {selectedMatch.tournament_name || selectedMatch.tournamentName} • {selectedMatch.sport_name || selectedMatch.sport}
                {(selectedMatch.event_name || selectedMatch.eventName) && ` • 🏆 ${selectedMatch.event_name || selectedMatch.eventName}`}
                {` • ${selectedMatch.round} • ${formatMatchDate(selectedMatch.scheduled_time || selectedMatch.date)}`}
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--nec-text-main)", marginBottom: "4px" }}>
                {selectedMatch.team_a_name || selectedMatch.teamA} vs {selectedMatch.team_b_name || selectedMatch.teamB}
              </div>
              <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--nec-blue-accent)", letterSpacing: "2px" }}>
                {selectedMatch.score_a ?? selectedMatch.scoreA ?? 0} - {selectedMatch.score_b ?? selectedMatch.scoreB ?? 0}
              </div>
              <div style={{
                marginTop: "8px",
                padding: "6px 12px",
                background: "rgba(34, 197, 94, 0.12)",
                color: "#16a34a",
                borderRadius: "20px",
                fontWeight: 800,
                fontSize: "0.85rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <Trophy size={14} /> Winner: {resolveWinnerDisplay(selectedMatch)}
              </div>
            </div>

            {/* Scorers / Detail Breakdown */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.95rem", fontWeight: 700, color: "var(--nec-text-main)" }}>
                Key Match Statistics & Scorers
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Team A Scorers */}
                <div style={{ background: "var(--nec-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--nec-border)" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--nec-text-main)", marginBottom: "6px" }}>
                    {selectedMatch.team_a_name || selectedMatch.teamA}
                  </div>
                  {modalScorerData?.teamAScorers?.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                      {modalScorerData.teamAScorers.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>No scorers recorded</div>
                  )}
                </div>

                {/* Team B Scorers */}
                <div style={{ background: "var(--nec-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--nec-border)" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--nec-text-main)", marginBottom: "6px" }}>
                    {selectedMatch.team_b_name || selectedMatch.teamB}
                  </div>
                  {modalScorerData?.teamBScorers?.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                      {modalScorerData.teamBScorers.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>No scorers recorded</div>
                  )}
                </div>
              </div>

              {/* Match Notes / Detail Score */}
              {(selectedMatch.detail_score || selectedMatch.detailScore) && (
                <div style={{ marginTop: "12px", padding: "10px 14px", background: "var(--nec-surface-raised)", borderRadius: "8px", fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
                  <strong>Scoring Notes:</strong> {selectedMatch.detail_score || selectedMatch.detailScore}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSelectedMatch(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
