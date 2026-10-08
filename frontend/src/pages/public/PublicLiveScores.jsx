import React, { useState, useCallback } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Modal } from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { Trophy, Calendar, User, Eye, MapPin } from "lucide-react";
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

// Helper to extract player scorers from structured scorers field or detailScore
function parseMatchScorers(match) {
  if (!match) return { teamAScorers: [], teamBScorers: [], rawNotes: "" };

  let teamAScorers = [];
  let teamBScorers = [];
  let rawNotes = match.detailScore || "";

  // 1. If match has structured or JSON scorers
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
      // Plain text scorers
      if (typeof match.scorers === "string" && match.scorers.trim()) {
        rawNotes = `${rawNotes ? rawNotes + " • " : ""}${match.scorers}`;
      }
    }
  }

  // 2. Parse detailScore string (e.g., "CSE Goals: Rahul (14', 52') | ECE Goals: Samuel (33')")
  if (match.detailScore) {
    const segments = match.detailScore.split("|").map(s => s.trim());
    segments.forEach(seg => {
      const nameA = (match.teamA || "").toLowerCase();
      const nameB = (match.teamB || "").toLowerCase();
      const deptA = (match.deptA || "").toLowerCase();
      const deptB = (match.deptB || "").toLowerCase();

      const colonIdx = seg.indexOf(":");
      if (colonIdx > -1) {
        const prefix = seg.substring(0, colonIdx).trim();
        const value = seg.substring(colonIdx + 1).trim();
        const prefLower = prefix.toLowerCase();

        if (
          (nameA && prefLower.includes(nameA)) ||
          (deptA && prefLower.includes(deptA)) ||
          prefLower.includes("goals") ||
          prefLower.includes("scorers")
        ) {
          if (!nameB || !prefLower.includes(nameB)) {
            teamAScorers.push(...value.split(",").map(x => x.trim()).filter(Boolean));
            return;
          }
        }

        if (
          (nameB && prefLower.includes(nameB)) ||
          (deptB && prefLower.includes(deptB))
        ) {
          teamBScorers.push(...value.split(",").map(x => x.trim()).filter(Boolean));
          return;
        }
      }
    });
  }

  return { teamAScorers, teamBScorers, rawNotes };
}

export default function PublicLiveScores({ onNavigate }) {
  const { t } = useAuth();
  const [selectedMatch, setSelectedMatch] = useState(null);
  
  const fetchMatches = useCallback(async () => {
    const res = await matchesApi.getMatches();
    return Array.isArray(res) ? res : [];
  }, []);

  const { data: matchesData, loading, error } = useAutoRefresh(fetchMatches, { interval: 15000 });
  const matches = matchesData || [];

  const liveList = matches.filter(m => m.status === "Ongoing");
  const recentList = matches.filter(m => m.status === "Completed");

  const modalScorerData = selectedMatch ? parseMatchScorers(selectedMatch) : null;

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">{t.liveScores || "Campus Live Scores & Results"}</h2>
      </div>

      {/* Live Matches in Progress */}
      <div className="nec-portal-section">
        <h3 className="nec-sub-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="nec-ssb-live-dot" aria-hidden="true" /> {liveList.length} Live Matches in Progress
        </h3>
        {loading ? (
          <SkeletonLoader rows={2} type="cards" />
        ) : (error || liveList.length === 0) ? (
          <PublicInfoCard
            icon={Trophy}
            title="No Live Matches"
            message="No matches currently in progress."
            actionText="View Fixtures"
            onAction={() => onNavigate && onNavigate("public_fixtures")}
          />
        ) : (
          <div className="nec-matches-grid">
            {liveList.map(m => (
              <Card key={m.id} className="nec-score-card live">
                <div className="nec-score-head">
                  <span>{m.sport} • {m.round}</span>
                  <Badge status="live">{t.live || "LIVE SCORE"}</Badge>
                </div>
                <div className="nec-score-main">
                  <div className="nec-score-team">
                    <span className="nec-st-dept">{m.deptA}</span>
                    <span className="nec-st-name">{m.teamA}</span>
                  </div>
                  <div className="nec-score-badge">{m.scoreA} - {m.scoreB}</div>
                  <div className="nec-score-team text-right">
                    <span className="nec-st-dept">{m.deptB}</span>
                    <span className="nec-st-name">{m.teamB}</span>
                  </div>
                </div>
                <div className="nec-score-foot">
                  <span>{m.venue}</span>
                  <span>{m.detailScore}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed Match Results */}
      <div className="nec-portal-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 className="nec-sub-title" style={{ margin: 0 }}>Recent Completed Match Results</h3>
          <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
            Click any match to view player scorers and breakdown
          </span>
        </div>

        {loading ? (
          <SkeletonLoader rows={2} />
        ) : (error || recentList.length === 0) ? (
          <PublicInfoCard
            icon={Calendar}
            title="No Completed Matches"
            message="No completed match records."
            variant="flat"
          />
        ) : (
          <div className="nec-completed-grid">
            {recentList.map(m => (
              <Card
                key={m.id}
                className="nec-score-card completed medium-box"
                style={{ cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                onClick={() => setSelectedMatch(m)}
                title="Click to view player scorer details"
              >
                <div className="nec-score-head">
                  <span>{m.sport} • {formatMatchDate(m.date)}</span>
                  <Badge status="success">Completed</Badge>
                </div>

                <div className="nec-score-main">
                  <div className="nec-score-team">
                    <span className="nec-st-dept">{m.deptA || "TEAM"}</span>
                    <span className="nec-st-name">{m.teamA}</span>
                  </div>
                  <div className="nec-score-badge dark">{m.scoreA} - {m.scoreB}</div>
                  <div className="nec-score-team text-right">
                    <span className="nec-st-dept">{m.deptB || "TEAM"}</span>
                    <span className="nec-st-name">{m.teamB}</span>
                  </div>
                </div>

                <div className="nec-winner-banner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Winner: <strong>{m.winner || m.winner_team_name || "Completed"}</strong></span>
                  <span style={{ fontSize: "0.75rem", color: "var(--nec-blue, #0274be)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Eye size={13} /> Scorers
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Match Scorers & Highlights Detail Modal */}
      <Modal
        isOpen={Boolean(selectedMatch)}
        onClose={() => setSelectedMatch(null)}
        title="Match Details"
      >
        {selectedMatch && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Match Meta & Head-to-Head */}
            <div style={{
              background: "var(--nec-surface, #ffffff)",
              border: "1px solid var(--nec-border)",
              borderRadius: "10px",
              padding: "16px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", marginBottom: "8px", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                {selectedMatch.sport} • {selectedMatch.round} • {formatMatchDate(selectedMatch.date)}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", gap: "16px", margin: "12px 0" }}>
                <div style={{ flex: 1, textAlign: "right" }}>
                  <span className="nec-fixture-dept-tag">{selectedMatch.deptA || "TEAM"}</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "4px" }}>{selectedMatch.teamA}</div>
                </div>

                <div style={{
                  fontSize: "1.4rem",
                  fontWeight: 900,
                  padding: "6px 16px",
                  borderRadius: "8px",
                  background: "var(--nec-navy, #002147)",
                  color: "#ffffff",
                  letterSpacing: "1px"
                }}>
                  {selectedMatch.scoreA} - {selectedMatch.scoreB}
                </div>

                <div style={{ flex: 1, textAlign: "left" }}>
                  <span className="nec-fixture-dept-tag">{selectedMatch.deptB || "TEAM"}</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, marginTop: "4px" }}>{selectedMatch.teamB}</div>
                </div>
              </div>

              {selectedMatch.winner && (
                <div style={{ marginTop: "10px", fontSize: "0.9rem", color: "var(--nec-success-text, #059669)", fontWeight: 700 }}>
                  🏆 Winner: {selectedMatch.winner}
                </div>
              )}

              {selectedMatch.venue && (
                <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "var(--nec-text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                  <MapPin size={13} /> {selectedMatch.venue}
                </div>
              )}
            </div>

            {/* Player Scorers Breakdown Section */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <User size={18} color="var(--nec-blue, #0274be)" />
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800 }}>Scorers</h4>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Team A Scorers */}
                <div style={{
                  background: "var(--nec-surface-hover, #f8fafc)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--nec-border)"
                }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-main)", marginBottom: "8px" }}>
                    {selectedMatch.teamA} ({selectedMatch.deptA})
                  </div>
                  {modalScorerData.teamAScorers.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {modalScorerData.teamAScorers.map((scorer, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "rgba(2, 116, 190, 0.1)",
                            color: "var(--nec-blue, #0274be)",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}
                        >
                          ⚽ {scorer}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      {Number(selectedMatch.scoreA) > 0 ? `${selectedMatch.scoreA} point(s) recorded` : "No individual scorers"}
                    </span>
                  )}
                </div>

                {/* Team B Scorers */}
                <div style={{
                  background: "var(--nec-surface-hover, #f8fafc)",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--nec-border)"
                }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-main)", marginBottom: "8px" }}>
                    {selectedMatch.teamB} ({selectedMatch.deptB})
                  </div>
                  {modalScorerData.teamBScorers.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {modalScorerData.teamBScorers.map((scorer, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "rgba(2, 116, 190, 0.1)",
                            color: "var(--nec-blue, #0274be)",
                            fontSize: "0.8rem",
                            fontWeight: 700
                          }}
                        >
                          ⚽ {scorer}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      {Number(selectedMatch.scoreB) > 0 ? `${selectedMatch.scoreB} point(s) recorded` : "No individual scorers"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Match Detail Score / Official Notes */}
            {selectedMatch.detailScore && (
              <div style={{
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                fontSize: "0.825rem",
                color: "var(--nec-text-main)"
              }}>
                <span style={{ fontWeight: 700, color: "#b45309" }}>Notes: </span>
                <span>{selectedMatch.detailScore}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedMatch(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
