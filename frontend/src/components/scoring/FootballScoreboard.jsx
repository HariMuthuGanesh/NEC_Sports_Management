import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import { CheckCircle } from "lucide-react";
import "./Scoreboard.css";

/**
 * FootballScoreboard
 *
 * Football-aware scoring interface.
 * Adds a goal scorers field and compiles the detail string automatically.
 *
 * Detail format: "Goals: Rahul (14'), Kiran (52') | Cards: Yellow - Arun (68')"
 */
export default function FootballScoreboard({ match, onSubmit, submitting, onScoreChange }) {
  const [goalsA,   setGoalsA]   = useState(0);
  const [goalsB,   setGoalsB]   = useState(0);
  const [scorersA, setScorersA] = useState("");
  const [scorersB, setScorersB] = useState("");
  const [cards,    setCards]    = useState("");
  const [isFinal,  setIsFinal]  = useState(false);

  useEffect(() => {
    if (!match) return;
    const initialA = Number(match.scoreA) || 0;
    const initialB = Number(match.scoreB) || 0;
    setGoalsA(initialA);
    setGoalsB(initialB);
    setScorersA("");
    setScorersB("");
    setCards(match.detailScore || "");
    setIsFinal(false);
    onScoreChange?.({ scoreA: initialA, scoreB: initialB });
  }, [match?.id]);

  const handleGoalsAChange = (val) => {
    setGoalsA(val);
    onScoreChange?.({ scoreA: val, scoreB: goalsB });
  };

  const handleGoalsBChange = (val) => {
    setGoalsB(val);
    onScoreChange?.({ scoreA: goalsA, scoreB: val });
  };

  const buildDetailScore = () => {
    const parts = [];
    if (scorersA.trim()) parts.push(`${match.teamA} Goals: ${scorersA.trim()}`);
    if (scorersB.trim()) parts.push(`${match.teamB} Goals: ${scorersB.trim()}`);
    if (cards.trim())    parts.push(`Cards/Notes: ${cards.trim()}`);
    return parts.join(" | ");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ scoreA: goalsA, scoreB: goalsB, detailScore: buildDetailScore(), isFinal });
  };

  if (!match) return null;

  return (
    <form onSubmit={handleSubmit} className="nec-scoreboard-form">
      {/* Goals */}
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
            aria-label={`Goals for ${match.teamA}`}
            className="nec-scoreboard-score-input"
            value={goalsA}
            onChange={(e) => handleGoalsAChange(e.target.value)}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>GOALS</span>
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
            aria-label={`Goals for ${match.teamB}`}
            className="nec-scoreboard-score-input"
            value={goalsB}
            onChange={(e) => handleGoalsBChange(e.target.value)}
          />
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>GOALS</span>
        </div>
      </div>

      {/* Goal Scorers breakdown per team */}
      <div className="nec-scoreboard-cricket-extras">
        <div className="nec-scoreboard-extra-block">
          <div className="nec-scoreboard-extra-label">{match.teamA} Goal Scorers</div>
          <input
            type="text"
            className="nec-table-search-input"
            style={{ width: "100%", fontSize: "0.85rem" }}
            placeholder="e.g. Rahul 14', 52'"
            value={scorersA}
            onChange={(e) => setScorersA(e.target.value)}
          />
        </div>

        <div className="nec-scoreboard-extra-block">
          <div className="nec-scoreboard-extra-label">{match.teamB} Goal Scorers</div>
          <input
            type="text"
            className="nec-table-search-input"
            style={{ width: "100%", fontSize: "0.85rem" }}
            placeholder="e.g. Samuel 33'"
            value={scorersB}
            onChange={(e) => setScorersB(e.target.value)}
          />
        </div>
      </div>

      {/* Cards and match notes */}
      <div className="nec-scoreboard-field">
        <label className="nec-scoreboard-label">Bookings, Cards & Match Events</label>
        <input
          type="text"
          className="nec-table-search-input"
          style={{ width: "100%" }}
          placeholder="e.g. Yellow: Arun (68'), Red: Vignesh (89')"
          value={cards}
          onChange={(e) => setCards(e.target.value)}
        />
      </div>

      <div className="nec-scoreboard-final-check">
        <input
          type="checkbox"
          id="footballFinalCheck"
          checked={isFinal}
          onChange={(e) => setIsFinal(e.target.checked)}
        />
        <label htmlFor="footballFinalCheck">Mark match as COMPLETED (Final Result)</label>
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
