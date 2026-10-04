import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import { CheckCircle } from "lucide-react";
import "./Scoreboard.css";

/**
 * CricketScoreboard
 *
 * Cricket-aware scoring interface.
 * Adds wickets and overs inputs per team; compiles them into the
 * detailScore string sent to the existing API endpoint.
 *
 * Score format submitted to API:
 *   scoreA  = runs (Team A)
 *   scoreB  = runs (Team B)
 *   detailScore = "Team A: 142/6 (18.2 Ov) | Team B: 98/4 (12.4 Ov)"
 */
export default function CricketScoreboard({ match, onSubmit, submitting, onScoreChange }) {
  const [runsA,    setRunsA]    = useState(0);
  const [runsB,    setRunsB]    = useState(0);
  const [wicketsA, setWicketsA] = useState(0);
  const [wicketsB, setWicketsB] = useState(0);
  const [oversA,   setOversA]   = useState("");
  const [oversB,   setOversB]   = useState("");
  const [notes,    setNotes]    = useState("");
  const [isFinal,  setIsFinal]  = useState(false);

  // Hydrate from match when selection changes
  useEffect(() => {
    if (!match) return;
    const initialA = Number(match.scoreA) || 0;
    const initialB = Number(match.scoreB) || 0;
    setRunsA(initialA);
    setRunsB(initialB);
    setWicketsA(0);
    setWicketsB(0);
    setOversA("");
    setOversB("");
    setNotes(match.detailScore || "");
    setIsFinal(false);
    onScoreChange?.({ scoreA: initialA, scoreB: initialB });
  }, [match?.id]);

  const handleRunsAChange = (val) => {
    setRunsA(val);
    onScoreChange?.({ scoreA: val, scoreB: runsB });
  };

  const handleRunsBChange = (val) => {
    setRunsB(val);
    onScoreChange?.({ scoreA: runsA, scoreB: val });
  };

  const buildDetailScore = () => {
    const partA = `${match.teamA}: ${runsA}/${wicketsA}${oversA ? ` (${oversA} Ov)` : ""}`;
    const partB = `${match.teamB}: ${runsB}/${wicketsB}${oversB ? ` (${oversB} Ov)` : ""}`;
    const extra = notes.trim() ? ` | ${notes.trim()}` : "";
    return `${partA} | ${partB}${extra}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      scoreA: runsA,
      scoreB: runsB,
      detailScore: buildDetailScore(),
      isFinal,
    });
  };

  if (!match) return null;

  return (
    <form onSubmit={handleSubmit} className="nec-scoreboard-form">
      {/* Runs — primary score */}
      <div className="nec-scoreboard-teams-grid">
        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamA}
            {match.deptA && <span className="nec-scoreboard-dept"> ({match.deptA})</span>}
          </div>
          <input
            type="number"
            min="0"
            required
            aria-label={`Runs for ${match.teamA}`}
            className="nec-scoreboard-score-input"
            value={runsA}
            onChange={(e) => handleRunsAChange(e.target.value)}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>RUNS</span>
        </div>

        <div className="nec-scoreboard-vs">VS</div>

        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamB}
            {match.deptB && <span className="nec-scoreboard-dept"> ({match.deptB})</span>}
          </div>
          <input
            type="number"
            min="0"
            required
            aria-label={`Runs for ${match.teamB}`}
            className="nec-scoreboard-score-input"
            value={runsB}
            onChange={(e) => handleRunsBChange(e.target.value)}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>RUNS</span>
        </div>
      </div>

      {/* Wickets + Overs */}
      <div className="nec-scoreboard-cricket-extras">
        <div className="nec-scoreboard-extra-block">
          <div className="nec-scoreboard-extra-label">{match.teamA} Wickets & Overs</div>
          <div className="nec-scoreboard-extra-row">
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--nec-text-muted)", marginBottom: "3px" }}>Wickets</div>
              <input
                type="number"
                min="0"
                max="10"
                aria-label="Wickets Team A"
                className="nec-scoreboard-extra-input"
                value={wicketsA}
                onChange={(e) => setWicketsA(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--nec-text-muted)", marginBottom: "3px" }}>Overs</div>
              <input
                type="text"
                aria-label="Overs Team A"
                placeholder="18.2"
                className="nec-scoreboard-extra-input"
                value={oversA}
                onChange={(e) => setOversA(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="nec-scoreboard-extra-block">
          <div className="nec-scoreboard-extra-label">{match.teamB} Wickets & Overs</div>
          <div className="nec-scoreboard-extra-row">
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--nec-text-muted)", marginBottom: "3px" }}>Wickets</div>
              <input
                type="number"
                min="0"
                max="10"
                aria-label="Wickets Team B"
                className="nec-scoreboard-extra-input"
                value={wicketsB}
                onChange={(e) => setWicketsB(e.target.value)}
              />
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--nec-text-muted)", marginBottom: "3px" }}>Overs</div>
              <input
                type="text"
                aria-label="Overs Team B"
                placeholder="12.4"
                className="nec-scoreboard-extra-input"
                value={oversB}
                onChange={(e) => setOversB(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Additional notes */}
      <div className="nec-scoreboard-field">
        <label className="nec-scoreboard-label">Extra Notes (milestones, top performers)</label>
        <input
          type="text"
          className="nec-table-search-input"
          style={{ width: "100%" }}
          placeholder="e.g. 50 by Arjun (34b), Hat-trick by Priya"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="nec-scoreboard-final-check">
        <input
          type="checkbox"
          id="cricketFinalCheck"
          checked={isFinal}
          onChange={(e) => setIsFinal(e.target.checked)}
        />
        <label htmlFor="cricketFinalCheck">Mark match as COMPLETED (Final Result)</label>
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
