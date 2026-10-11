import { useAuth } from "../../context/AuthContext";
import React, { useState, useEffect, useCallback } from "react";
import { matchesApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import GenericScoreboard from "../../components/scoring/GenericScoreboard";
import SPORT_REGISTRY from "../../components/scoring/sportRegistry";
import "../../components/scoring/Scoreboard.css";
import "./CoordinatorPortal.css";
import { ArrowLeft, RefreshCw, Activity, MapPin, Calendar, Trophy, ChevronDown, Play, CheckCircle } from "lucide-react";

// Active statuses that allow score entry
const ACTIVE_STATUSES = ["Ongoing", "Scheduled"];

export default function ScoreSheet({ onNavigate }) {
  const toast = useToast();
  const { currentUser } = useAuth();

  const [matchId, setMatchId] = useState(() => {
    return sessionStorage.getItem("nec_sports_selected_match_id") || null;
  });
  const [submitting, setSubmitting] = useState(false);
  const [startingMatch, setStartingMatch] = useState(false);
  const [liveScores, setLiveScores] = useState({ scoreA: null, scoreB: null });

  // Poll all matches every 15 s
  const fetchMatches = useCallback(() => matchesApi.getMatches(), []);
  const { data: allMatches, loading, error, refetch } = useAutoRefresh(
    fetchMatches,
    { interval: 15000 }
  );

  // Only matches eligible for score entry
  const activeMatches = (allMatches || []).filter((m) =>
    ACTIVE_STATUSES.includes(m.status)
  );

  // Find the currently active match from the live match list
  const currentMatch = activeMatches.find((m) => String(m.id) === String(matchId)) || null;

  // Fallback: if matchId is not set or not found, try fallback from sessionStorage
  useEffect(() => {
    if (!matchId && activeMatches.length > 0) {
      const stored = sessionStorage.getItem("nec_sports_selected_match");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.id) {
            setMatchId(parsed.id);
            sessionStorage.setItem("nec_sports_selected_match_id", parsed.id);
            return;
          }
        } catch {
          // ignore parse errors
        }
      }
      // default to first active match if nothing in storage
      setMatchId(activeMatches[0].id);
      sessionStorage.setItem("nec_sports_selected_match_id", activeMatches[0].id);
    }
  }, [matchId, activeMatches]);

  // Sync initial live scores when currentMatch updates
  useEffect(() => {
    if (currentMatch) {
      setLiveScores({
        scoreA: currentMatch.scoreA ?? 0,
        scoreB: currentMatch.scoreB ?? 0,
      });
    }
  }, [currentMatch?.id, currentMatch?.scoreA, currentMatch?.scoreB]);

  const handleMatchChange = (e) => {
    const newId = e.target.value;
    setMatchId(newId);
    sessionStorage.setItem("nec_sports_selected_match_id", newId);
    const m = activeMatches.find((x) => String(x.id) === String(newId));
    if (m) {
      sessionStorage.setItem("nec_sports_selected_match", JSON.stringify(m));
      setLiveScores({
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
      });
    }
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate("coord_score_entry");
    } else {
      sessionStorage.setItem("nec_sports_active_nav", "coord_score_entry");
      window.location.reload();
    }
  };

  const handleScoreChange = useCallback(({ scoreA, scoreB }) => {
    setLiveScores({
      scoreA: scoreA !== undefined && scoreA !== "" ? Number(scoreA) : 0,
      scoreB: scoreB !== undefined && scoreB !== "" ? Number(scoreB) : 0,
    });
  }, []);

  // Explicit action to transition Scheduled -> Ongoing
  const handleStartMatch = async () => {
    if (!currentMatch) return;
    setStartingMatch(true);
    try {
      await matchesApi.updateScore(
        currentMatch.id,
        currentMatch.scoreA || 0,
        currentMatch.scoreB || 0,
        currentMatch.detailScore || "",
        false // isFinal = false -> sets status to Ongoing in database
      );
      currentMatch.status = "Ongoing";
      toast.success("Match is now LIVE! Broadcast is active on Campus Live Scores.");
      refetch();
    } catch (err) {
      console.error("Failed to start match:", err);
      toast.error(err.message || "Failed to start match.");
    } finally {
      setStartingMatch(false);
    }
  };

  // Shared submit handler
  const handleSubmitScore = async ({ scoreA, scoreB, detailScore, isFinal }) => {
    if (!currentMatch) {
      toast.warning("No active match selected.");
      return;
    }
    const numA = parseInt(scoreA, 10);
    const numB = parseInt(scoreB, 10);
    if (isNaN(numA) || isNaN(numB) || numA < 0 || numB < 0) {
      toast.error("Scores must be valid non-negative numbers.");
      return;
    }
    setSubmitting(true);
    try {
      await matchesApi.updateScore(
        currentMatch.id,
        numA,
        numB,
        String(detailScore || "").trim(),
        isFinal
      );
      toast.success(
        isFinal ? "Match finalized and result saved!" : "Live score updated successfully!"
      );
      // Optimistically update local state
      currentMatch.scoreA = numA;
      currentMatch.scoreB = numB;
      if (detailScore) currentMatch.detailScore = detailScore;
      currentMatch.status = isFinal ? "Completed" : "Ongoing";
      setLiveScores({ scoreA: numA, scoreB: numB });
      refetch();
    } catch (err) {
      console.error("Score submission error:", err);
      toast.error(err.message || "Failed to update score. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !currentMatch) {
    return (
      <div className="nec-portal-page nec-score-sheet-page">
        <div className="nec-score-sheet-top-nav">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={handleBack}>
            Back to Score Board
          </Button>
        </div>
        <SkeletonLoader rows={6} />
      </div>
    );
  }

  if (error && !currentMatch) {
    return (
      <div className="nec-portal-page nec-score-sheet-page">
        <div className="nec-score-sheet-top-nav">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={handleBack}>
            Back to Score Board
          </Button>
        </div>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  if (!currentMatch) {
    return (
      <div className="nec-portal-page nec-score-sheet-page">
        <div className="nec-score-sheet-top-nav">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={handleBack}>
            Back to Score Board
          </Button>
        </div>
        <EmptyState
          icon={Activity}
          title="No Match Selected"
          message="Please select an active match from the Sports Score Board to begin score entry."
          actionText="Go to Score Board"
          onAction={handleBack}
        />
      </div>
    );
  }

  const ScoreboardComponent = SPORT_REGISTRY[currentMatch.sport] || GenericScoreboard;
  const isScheduled = currentMatch.status === "Scheduled";
  const isOngoing = currentMatch.status === "Ongoing";

  // Other matches for fast switching
  const sameSportMatches = activeMatches.filter(
    (m) => m.sport === currentMatch.sport
  );

  const displayScoreA = liveScores.scoreA !== null ? liveScores.scoreA : (currentMatch.scoreA ?? 0);
  const displayScoreB = liveScores.scoreB !== null ? liveScores.scoreB : (currentMatch.scoreB ?? 0);

  return (
    <div className="nec-portal-page nec-score-sheet-page">
      {/* ── Top Control & Navigation Bar ───────────────────────────────── */}
      <div className="nec-score-sheet-sticky">
      <div className="nec-score-sheet-control-bar">
        <div className="nec-score-sheet-control-left">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={handleBack}
            className="nec-score-sheet-back-btn"
          >
            Back to Score Board
          </Button>

          {/* Fast match switcher dropdown */}
          {activeMatches.length > 1 && (
            <div className="nec-score-sheet-switcher">
              <label htmlFor="matchSwitcherSelect" className="nec-score-sheet-switcher-label">
                Switch Match:
              </label>
              <div className="nec-score-sheet-select-wrapper">
                <select
                  id="matchSwitcherSelect"
                  className="nec-score-sheet-select"
                  value={currentMatch.id}
                  onChange={handleMatchChange}
                >
                  <optgroup label={`${currentMatch.sport} Matches`}>
                    {sameSportMatches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.teamA} vs {m.teamB} ({m.status})
                      </option>
                    ))}
                  </optgroup>
                  {activeMatches.some((m) => m.sport !== currentMatch.sport) && (
                    <optgroup label="Other Sports">
                      {activeMatches
                        .filter((m) => m.sport !== currentMatch.sport)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.sport}] {m.teamA} vs {m.teamB}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown size={14} className="nec-score-sheet-select-icon" />
              </div>
            </div>
          )}
        </div>

        <div className="nec-score-sheet-control-right">
          {isScheduled && currentUser.role === "Admin" && (
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              disabled={startingMatch}
              onClick={handleStartMatch}
            >
              {startingMatch ? "Starting..." : "Start Match (Go Live)"}
            </Button>
          )}

          <Badge status={isOngoing ? "live" : "warning"}>
            {currentMatch.awaitingFinalScore ? "Awaiting Final Score" : isOngoing ? "Live Match" : currentMatch.status}
          </Badge>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>
        <div className="nec-score-sheet-strip" aria-live="polite">
          <span className="nec-score-sheet-strip-team">{currentMatch.teamA}</span>
          <span className="nec-score-sheet-strip-score">{displayScoreA} : {displayScoreB}</span>
          <span className="nec-score-sheet-strip-team nec-score-sheet-strip-team--right">{currentMatch.teamB}</span>
        </div>
      </div>

      {/* ── Scheduled Notice Banner ────────────────────────────────────── */}
      {isScheduled && currentUser.role === "Admin" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            padding: "12px 18px",
            background: "var(--nec-info-bg, #eff6ff)",
            border: "1px solid var(--nec-blue-accent, #3b82f6)",
            borderRadius: "var(--nec-radius-md)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Calendar size={18} style={{ color: "var(--nec-blue-accent, #1d4ed8)", flexShrink: 0 }} />
            <span style={{ fontSize: "0.88rem", color: "var(--nec-text-main)", fontWeight: 600 }}>
              Match is scheduled.
            </span>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={Play}
            disabled={startingMatch}
            onClick={handleStartMatch}
          >
            {startingMatch ? "Starting..." : "Start Match Now"}
          </Button>
        </div>
      )}

      {/* ── Centered Hero Match Banner ─────────────────────────────────── */}
      <div className="nec-score-sheet-hero">
        <div className="nec-score-sheet-hero-badges">
          <span className="nec-score-sheet-hero-sport">{currentMatch.sport}</span>
          {currentMatch.round && (
            <span className="nec-score-sheet-hero-round">
              <Trophy size={13} /> {currentMatch.round}
            </span>
          )}
          {isOngoing && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "#ef4444",
                background: "rgba(239, 68, 68, 0.12)",
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              <span className="nec-ssb-live-dot" /> LIVE
            </span>
          )}
        </div>

        <div className="nec-score-sheet-hero-teams">
          <div className="nec-score-sheet-hero-team">
            <h3 className="nec-score-sheet-hero-team-name">{currentMatch.teamA}</h3>
            {currentMatch.deptA && (
              <span className="nec-score-sheet-hero-dept">{currentMatch.deptA}</span>
            )}
          </div>

          <div className="nec-score-sheet-hero-center">
            <div className="nec-score-sheet-hero-score">
              <span>{displayScoreA}</span>
              <span className="nec-score-sheet-hero-score-divider">:</span>
              <span>{displayScoreB}</span>
            </div>
            <span className="nec-score-sheet-hero-vs">VS</span>
          </div>

          <div className="nec-score-sheet-hero-team nec-score-sheet-hero-team--right">
            <h3 className="nec-score-sheet-hero-team-name">{currentMatch.teamB}</h3>
            {currentMatch.deptB && (
              <span className="nec-score-sheet-hero-dept">{currentMatch.deptB}</span>
            )}
          </div>
        </div>

        <div className="nec-score-sheet-hero-meta">
          {currentMatch.venue && (
            <span className="nec-score-sheet-hero-meta-item">
              <MapPin size={13} /> {currentMatch.venue}
            </span>
          )}
          {currentMatch.scheduled_time && (
            <span className="nec-score-sheet-hero-meta-item">
              <Calendar size={13} /> {new Date(currentMatch.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Dedicated Full-Width Centered Scoreboard ────────────────────── */}
      <div className="nec-score-sheet-main-card-wrap">
        <Card
          title={`${currentMatch.sport} Score Sheet`}
          className="nec-score-sheet-card"
        >
          {(isOngoing || currentUser.role === "Admin") && <ScoreboardComponent
            match={currentMatch}
            onSubmit={handleSubmitScore}
            submitting={submitting}
            onScoreChange={handleScoreChange}
          />}
        </Card>
      </div>
    </div>
  );
}
