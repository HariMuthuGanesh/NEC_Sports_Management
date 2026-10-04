import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import { CheckCircle } from "lucide-react";
import "./Scoreboard.css";

/**
 * GenericScoreboard
 *
 * Fallback scoring interface used for any sport without a dedicated component.
 * Also serves as the base interface contract that sport-specific boards extend.
 */
export default function GenericScoreboard({ match, onSubmit, submitting, onScoreChange }) {
  const [scoreA,      setScoreA]      = useState(0);
  const [scoreB,      setScoreB]      = useState(0);
  const [detailScore, setDetailScore] = useState("");
  const [isFinal,     setIsFinal]     = useState(false);

  // Re-hydrate from match when selection changes
  useEffect(() => {
    if (!match) return;
    const initialA = Number(match.scoreA) || 0;
    const initialB = Number(match.scoreB) || 0;
    setScoreA(initialA);
    setScoreB(initialB);
    setDetailScore(match.detailScore || "");
    setIsFinal(false);
    onScoreChange?.({ scoreA: initialA, scoreB: initialB });
  }, [match?.id]);

  const handleScoreAChange = (val) => {
    setScoreA(val);
    onScoreChange?.({ scoreA: val, scoreB });
  };

  const handleScoreBChange = (val) => {
    setScoreB(val);
    onScoreChange?.({ scoreA, scoreB: val });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ scoreA, scoreB, detailScore, isFinal });
  };

  if (!match) return null;

  return (
    <form onSubmit={handleSubmit} className="nec-scoreboard-form">
      {/* Team scores */}
      <div className="nec-scoreboard-teams-grid">
        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamA}
            {match.deptA && (
              <span className="nec-scoreboard-dept"> ({match.deptA})</span>
            )}
          </div>
          <input
            type="number"
            min="0"
            required
            aria-label={`Score for ${match.teamA}`}
            className="nec-scoreboard-score-input"
            value={scoreA}
            onChange={(e) => handleScoreAChange(e.target.value)}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>POINTS</span>
        </div>

        <div className="nec-scoreboard-vs">VS</div>

        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamB}
            {match.deptB && (
              <span className="nec-scoreboard-dept"> ({match.deptB})</span>
            )}
          </div>
          <input
            type="number"
            min="0"
            required
            aria-label={`Score for ${match.teamB}`}
            className="nec-scoreboard-score-input"
            value={scoreB}
            onChange={(e) => handleScoreBChange(e.target.value)}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>POINTS</span>
        </div>
      </div>

      {/* Detail score */}
      <div className="nec-scoreboard-field">
        <label className="nec-scoreboard-label">Score Details & Match Notes</label>
        <input
          type="text"
          className="nec-table-search-input"
          style={{ width: "100%" }}
          placeholder="e.g. Points breakdown, fouls, or key highlights"
          value={detailScore}
          onChange={(e) => setDetailScore(e.target.value)}
        />
      </div>

      {/* Final result checkbox */}
      <div className="nec-scoreboard-final-check">
        <input
          type="checkbox"
          id="genericFinalCheck"
          checked={isFinal}
          onChange={(e) => setIsFinal(e.target.checked)}
        />
        <label htmlFor="genericFinalCheck">
          Mark match as COMPLETED (Final Result)
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        icon={CheckCircle}
        disabled={submitting}
        style={{ width: "100%" }}
      >
        {submitting ? "Submitting..." : isFinal ? "Submit Final Result" : "Update Live Score"}
      </Button>
    </form>
  );
}
