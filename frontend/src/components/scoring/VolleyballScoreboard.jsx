import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import { CheckCircle, Plus, Minus } from "lucide-react";
import "./Scoreboard.css";

/**
 * VolleyballScoreboard
 *
 * Volleyball-aware scoring interface.
 * Supports per-set point tracking (up to 5 sets).
 * scoreA/scoreB submitted = total sets won by each team.
 * detailScore = "Set 1: 25-20 | Set 2: 23-25 | Set 3: 25-18"
 */
export default function VolleyballScoreboard({ match, onSubmit, submitting, onScoreChange }) {
  const MAX_SETS = 5;

  // sets[i] = { a: number, b: number }
  const [sets, setSets] = useState([{ a: 0, b: 0 }]);
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    if (!match) return;
    setSets([{ a: 0, b: 0 }]);
    setIsFinal(false);
    onScoreChange?.({ scoreA: Number(match.scoreA) || 0, scoreB: Number(match.scoreB) || 0 });
  }, [match?.id]);

  const updateSet = (index, team, value) => {
    const next = [...sets];
    next[index] = { ...next[index], [team]: Number(value) || 0 };
    setSets(next);

    const sWonA = next.filter((s) => s.a > s.b).length;
    const sWonB = next.filter((s) => s.b > s.a).length;
    onScoreChange?.({ scoreA: sWonA, scoreB: sWonB });
  };

  const addSet = () => {
    if (sets.length < MAX_SETS) {
      const next = [...sets, { a: 0, b: 0 }];
      setSets(next);
      const sWonA = next.filter((s) => s.a > s.b).length;
      const sWonB = next.filter((s) => s.b > s.a).length;
      onScoreChange?.({ scoreA: sWonA, scoreB: sWonB });
    }
  };

  const removeLastSet = () => {
    if (sets.length > 1) {
      const next = sets.slice(0, -1);
      setSets(next);
      const sWonA = next.filter((s) => s.a > s.b).length;
      const sWonB = next.filter((s) => s.b > s.a).length;
      onScoreChange?.({ scoreA: sWonA, scoreB: sWonB });
    }
  };

  // Sets won = sets where a team scored strictly more points
  const setsWonA = sets.filter((s) => s.a > s.b).length;
  const setsWonB = sets.filter((s) => s.b > s.a).length;

  const buildDetailScore = () =>
    sets
      .map((s, i) => `Set ${i + 1}: ${s.a}-${s.b}`)
      .join(" | ");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      scoreA:      setsWonA,
      scoreB:      setsWonB,
      detailScore: buildDetailScore(),
      isFinal,
    });
  };

  if (!match) return null;

  return (
    <form onSubmit={handleSubmit} className="nec-scoreboard-form">
      {/* Sets Won overview */}
      <div className="nec-scoreboard-teams-grid">
        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamA}
            {match.deptA && <span className="nec-scoreboard-dept"> ({match.deptA})</span>}
          </div>
          <div className="nec-scoreboard-score-input" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {setsWonA}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>SETS WON</span>
        </div>

        <div className="nec-scoreboard-vs">VS</div>

        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamB}
            {match.deptB && <span className="nec-scoreboard-dept"> ({match.deptB})</span>}
          </div>
          <div className="nec-scoreboard-score-input" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {setsWonB}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>SETS WON</span>
        </div>
      </div>

      {/* Per-Set Point Breakdown */}
      <div className="nec-scoreboard-field">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <label className="nec-scoreboard-label">Set Points Breakdown</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {sets.length < MAX_SETS && (
              <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addSet}>
                Add Set
              </Button>
            )}
            {sets.length > 1 && (
              <Button type="button" variant="ghost" size="sm" icon={Minus} onClick={removeLastSet}>
                Remove Set
              </Button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sets.map((s, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr auto 1fr",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                background: "var(--nec-surface-raised)",
                border: "1px solid var(--nec-border)",
                borderRadius: "var(--nec-radius-md)",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--nec-navy)" }}>
                Set {i + 1}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="number"
                  min="0"
                  max="50"
                  aria-label={`Set ${i + 1} points for ${match.teamA}`}
                  className="nec-scoreboard-extra-input"
                  value={s.a}
                  onChange={(e) => updateSet(i, "a", e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", whiteSpace: "nowrap" }}>
                  {match.teamA}
                </span>
              </div>

              <span style={{ fontWeight: 900, color: "var(--nec-text-muted)", fontSize: "0.85rem" }}>-</span>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="number"
                  min="0"
                  max="50"
                  aria-label={`Set ${i + 1} points for ${match.teamB}`}
                  className="nec-scoreboard-extra-input"
                  value={s.b}
                  onChange={(e) => updateSet(i, "b", e.target.value)}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", whiteSpace: "nowrap" }}>
                  {match.teamB}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="nec-scoreboard-final-check">
        <input
          type="checkbox"
          id="volleyballFinalCheck"
          checked={isFinal}
          onChange={(e) => setIsFinal(e.target.checked)}
        />
        <label htmlFor="volleyballFinalCheck">Mark match as COMPLETED (Final Result)</label>
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
