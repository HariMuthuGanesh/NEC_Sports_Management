import React, { useEffect, useState } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Edit3, CheckCircle, Trophy } from "lucide-react";
import "./CoordinatorPortal.css";

export default function ScoreEntry() {
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [detailScore, setDetailScore] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = () => {
    setLoading(true);
    matchesApi.getMatches().then(mList => {
      const active = mList.filter(m => m.status === "Live" || m.status === "Scheduled");
      setMatches(active);
      if (active.length > 0) {
        setSelectedMatch(active[0]);
        setScoreA(active[0].scoreA || 0);
        setScoreB(active[0].scoreB || 0);
        setDetailScore(active[0].detailScore || "");
      }
      setLoading(false);
    });
  };

  const handleSubmitScore = (e) => {
    e.preventDefault();
    if (!selectedMatch) return;

    matchesApi.updateMatchScore(
      selectedMatch.id,
      scoreA,
      scoreB,
      detailScore,
      isFinal
    ).then(() => {
      alert(isFinal ? "Match outcome finalized and submitted!" : "Live score updated successfully!");
      loadMatches();
    });
  };

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Match Score & Result Submission Interface</h2>
        <p className="nec-page-desc">Enter real-time live scores or submit official final match results.</p>
      </div>

      {matches.length === 0 ? (
        <Card title="No Active Matches for Score Entry">
          <p>There are currently no live or scheduled matches assigned for score submission.</p>
        </Card>
      ) : (
        <div className="nec-admin-main-grid">
          <Card title="Select Match for Score Reporting">
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {matches.map(m => (
                <div
                  key={m.id}
                  className={`nec-att-row ${selectedMatch?.id === m.id ? "active" : ""}`}
                  style={{ cursor: "pointer", borderLeft: selectedMatch?.id === m.id ? "4px solid var(--nec-navy)" : "" }}
                  onClick={() => {
                    setSelectedMatch(m);
                    setScoreA(m.scoreA || 0);
                    setScoreB(m.scoreB || 0);
                    setDetailScore(m.detailScore || "");
                  }}
                >
                  <div>
                    <strong>{m.teamA}</strong> vs <strong>{m.teamB}</strong>
                    <br />
                    <small style={{ color: "var(--nec-text-muted)" }}>{m.sport} • {m.venue}</small>
                    {m.eventCategory && (
                      <div style={{ marginTop: "4px" }}>
                        <Badge status={m.eventCategory === "Inter-College" ? "danger" : "info"}>{m.eventCategory}</Badge>
                      </div>
                    )}
                  </div>
                  <Badge status={m.status === "Live" ? "live" : "warning"}>{m.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {selectedMatch && (
            <Card title={`Score Sheet: ${selectedMatch.sport}`} subtitle={`${selectedMatch.teamA} vs ${selectedMatch.teamB}`}>
              <form onSubmit={handleSubmitScore} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", textAlign: "center" }}>
                  <div style={{ background: "var(--nec-surface-raised)", padding: "16px", borderRadius: "8px" }}>
                    <div style={{ fontWeight: 700, marginBottom: "8px" }}>{selectedMatch.teamA} ({selectedMatch.deptA})</div>
                    <input
                      type="number"
                      required
                      style={{ fontSize: "1.8rem", width: "100px", textAlign: "center" }}
                      className="nec-table-search-input"
                      value={scoreA}
                      onChange={(e) => setScoreA(e.target.value)}
                    />
                  </div>

                  <div style={{ background: "var(--nec-surface-raised)", padding: "16px", borderRadius: "8px" }}>
                    <div style={{ fontWeight: 700, marginBottom: "8px" }}>{selectedMatch.teamB} ({selectedMatch.deptB})</div>
                    <input
                      type="number"
                      required
                      style={{ fontSize: "1.8rem", width: "100px", textAlign: "center" }}
                      className="nec-table-search-input"
                      value={scoreB}
                      onChange={(e) => setScoreB(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Detailed Score Breakdown / Goal Scorers</label>
                  <input
                    type="text"
                    className="nec-table-search-input"
                    style={{ maxWidth: "100%" }}
                    placeholder="e.g. Goal: Rahul (14', 52') | Runs: 142/6 (18.2 Overs)"
                    value={detailScore}
                    onChange={(e) => setDetailScore(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="finalCheck"
                    checked={isFinal}
                    onChange={(e) => setIsFinal(e.target.checked)}
                  />
                  <label htmlFor="finalCheck" style={{ fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
                    Mark match as COMPLETED (Final Outcome)
                  </label>
                </div>

                <Button type="submit" variant="primary" icon={CheckCircle}>
                  {isFinal ? "Submit Final Result" : "Update Live Score"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
