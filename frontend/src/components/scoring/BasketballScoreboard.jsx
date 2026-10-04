import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import { CheckCircle, Plus, Minus } from "lucide-react";
import "./Scoreboard.css";

/**
 * BasketballScoreboard
 *
 * Basketball-aware scoring interface.
 * Tracks points per quarter (up to 4 + overtime).
 * scoreA/scoreB submitted = total points across all quarters.
 * detailScore = "Q1: 22-18 | Q2: 19-24 | Q3: 28-21 | Q4: 31-27"
 */
export default function BasketballScoreboard({ match, onSubmit, submitting, onScoreChange }) {
  const BASE_QUARTERS = 4;
  const MAX_QUARTERS  = 6; // 4 regular + 2 OT periods

  // quarters[i] = { a: number, b: number }
  const [quarters, setQuarters] = useState(
    Array.from({ length: BASE_QUARTERS }, () => ({ a: 0, b: 0 }))
  );
  const [foulsA,  setFoulsA]  = useState(0);
  const [foulsB,  setFoulsB]  = useState(0);
  const [notes,   setNotes]   = useState("");
  const [isFinal, setIsFinal] = useState(false);

  // Hydrate when match selection changes
  useEffect(() => {
    if (!match) return;
    setQuarters(Array.from({ length: BASE_QUARTERS }, () => ({ a: 0, b: 0 })));
    setFoulsA(0);
    setFoulsB(0);
    setNotes(match.detailScore || "");
    setIsFinal(false);
    onScoreChange?.({ scoreA: Number(match.scoreA) || 0, scoreB: Number(match.scoreB) || 0 });
  }, [match?.id]);

  const updateQuarter = (index, team, value) => {
    const next = [...quarters];
    next[index] = { ...next[index], [team]: Number(value) || 0 };
    setQuarters(next);
    const tA = next.reduce((s, q) => s + q.a, 0);
    const tB = next.reduce((s, q) => s + q.b, 0);
    onScoreChange?.({ scoreA: tA, scoreB: tB });
  };

  const addPeriod = () => {
    if (quarters.length < MAX_QUARTERS) {
      const next = [...quarters, { a: 0, b: 0 }];
      setQuarters(next);
    }
  };

  const removeLastPeriod = () => {
    if (quarters.length > BASE_QUARTERS) {
      const next = quarters.slice(0, -1);
      setQuarters(next);
      const tA = next.reduce((s, q) => s + q.a, 0);
      const tB = next.reduce((s, q) => s + q.b, 0);
      onScoreChange?.({ scoreA: tA, scoreB: tB });
    }
  };

  // Total points = sum across all periods
  const totalA = quarters.reduce((s, q) => s + q.a, 0);
  const totalB = quarters.reduce((s, q) => s + q.b, 0);

  const getPeriodLabel = (i) => {
    if (i < 4) return `Q${i + 1}`;
    return `OT${i - 3}`;
  };

  const buildDetailScore = () => {
    const periodParts = quarters
      .map((q, i) => `${getPeriodLabel(i)}: ${q.a}-${q.b}`)
      .join(" | ");
    const foulsPart =
      foulsA > 0 || foulsB > 0
        ? ` | Fouls: ${match.teamA} (${foulsA}) - ${match.teamB} (${foulsB})`
        : "";
    const extra = notes.trim() ? ` | ${notes.trim()}` : "";
    return `${periodParts}${foulsPart}${extra}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      scoreA:      totalA,
      scoreB:      totalB,
      detailScore: buildDetailScore(),
      isFinal,
    });
  };

  if (!match) return null;

  return (
    <form onSubmit={handleSubmit} className="nec-scoreboard-form">
      {/* Total Score header */}
      <div className="nec-scoreboard-teams-grid">
        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamA}
            {match.deptA && (
              <span className="nec-scoreboard-dept"> ({match.deptA})</span>
            )}
          </div>
          <div
            className="nec-scoreboard-score-input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--nec-surface-raised)",
            }}
          >
            {totalA}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>
            TOTAL PTS
          </span>
        </div>

        <div className="nec-scoreboard-vs">VS</div>

        <div className="nec-scoreboard-team-block">
          <div className="nec-scoreboard-team-name">
            {match.teamB}
            {match.deptB && (
              <span className="nec-scoreboard-dept"> ({match.deptB})</span>
            )}
          </div>
          <div
            className="nec-scoreboard-score-input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--nec-surface-raised)",
            }}
          >
            {totalB}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)", fontWeight: 700 }}>
            TOTAL PTS
          </span>
        </div>
      </div>

      {/* Quarters breakdown */}
      <div className="nec-scoreboard-field">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "4px",
          }}
        >
          <label className="nec-scoreboard-label">Quarter-by-Quarter Scoring</label>
          <div style={{ display: "flex", gap: "6px" }}>
            {quarters.length < MAX_QUARTERS && (
              <Button type="button" variant="ghost" size="sm" icon={Plus} onClick={addPeriod}>
                Add OT
              </Button>
            )}
            {quarters.length > BASE_QUARTERS && (
              <Button type="button" variant="ghost" size="sm" icon={Minus} onClick={removeLastPeriod}>
                Remove OT
              </Button>
            )}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${quarters.length}, minmax(0, 1fr))`,
            gap: "8px",
          }}
        >
          {quarters.map((q, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                padding: "10px 6px",
                background: "var(--nec-surface-raised)",
                border: "1px solid var(--nec-border)",
                borderRadius: "var(--nec-radius-md)",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "0.78rem",
                  color: "var(--nec-navy)",
                  letterSpacing: "0.04em",
                }}
              >
                {getPeriodLabel(i)}
              </span>

              {/* Team A input */}
              <input
                type="number"
                min="0"
                max="99"
                aria-label={`${getPeriodLabel(i)} points for ${match.teamA}`}
                className="nec-scoreboard-extra-input"
                style={{ width: "100%", fontSize: "0.95rem" }}
                value={q.a}
                onChange={(e) => updateQuarter(i, "a", e.target.value)}
              />
              <span style={{ fontSize: "0.68rem", color: "var(--nec-text-muted)", lineHeight: 1 }}>
                {match.teamA?.slice(0, 6)}
              </span>

              {/* Team B input */}
              <input
                type="number"
                min="0"
                max="99"
                aria-label={`${getPeriodLabel(i)} points for ${match.teamB}`}
                className="nec-scoreboard-extra-input"
                style={{ width: "100%", fontSize: "0.95rem" }}
                value={q.b}
                onChange={(e) => updateQuarter(i, "b", e.target.value)}
              />
              <span style={{ fontSize: "0.68rem", color: "var(--nec-text-muted)", lineHeight: 1 }}>
                {match.teamB?.slice(0, 6)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Fouls */}
      <div className="nec-scoreboard-cricket-extras">
        <div className="nec-scoreboard-extra-block">
          <div className="nec-scoreboard-extra-label">{match.teamA} Team Fouls</div>
          <input
            type="number"
            min="0"
            max="15"
            aria-label={`Fouls for ${match.teamA}`}
            className="nec-scoreboard-extra-input"
            value={foulsA}
            onChange={(e) => setFoulsA(Number(e.target.value) || 0)}
          />
        </div>

        <div className="nec-scoreboard-extra-block">
          <div className="nec-scoreboard-extra-label">{match.teamB} Team Fouls</div>
          <input
            type="number"
            min="0"
            max="15"
            aria-label={`Fouls for ${match.teamB}`}
            className="nec-scoreboard-extra-input"
            value={foulsB}
            onChange={(e) => setFoulsB(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Additional match notes */}
      <div className="nec-scoreboard-field">
        <label className="nec-scoreboard-label">Game Notes & Highlights</label>
        <input
          type="text"
          className="nec-table-search-input"
          style={{ width: "100%" }}
          placeholder="e.g. 3-pt buzzer beater by #7, Timeout Team A (Q4)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Final check */}
      <div className="nec-scoreboard-final-check">
        <input
          type="checkbox"
          id="basketballFinalCheck"
          checked={isFinal}
          onChange={(e) => setIsFinal(e.target.checked)}
        />
        <label htmlFor="basketballFinalCheck">Mark match as COMPLETED (Final Result)</label>
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
