import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { matchesApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import "../../components/scoring/Scoreboard.css";
import "./CoordinatorPortal.css";
import { RefreshCw, Activity, ChevronRight, Clock, MapPin, Search, Play } from "lucide-react";

// Active statuses that allow score entry
const ACTIVE_STATUSES = ["Ongoing", "Scheduled"];

export default function ScoreEntry({ onNavigate }) {
  const toast = useToast();
  const { currentUser } = useAuth();
  const [selectedSport, setSelectedSport] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "ongoing" | "scheduled"

  // Poll all matches every 15 s
  const fetchMatches = useCallback(() => matchesApi.getMatches(), []);
  const { data: allMatches, loading, error, refetch } = useAutoRefresh(
    fetchMatches,
    { interval: 15000 }
  );

  // Only matches eligible for score entry
  const activeMatches = useMemo(() => {
    return (allMatches || []).filter((m) => ACTIVE_STATUSES.includes(m.status));
  }, [allMatches]);

  // Unique sports derived dynamically from active matches
  const activeSports = useMemo(() => {
    return [...new Set(activeMatches.map((m) => m.sport).filter(Boolean))].sort();
  }, [activeMatches]);

  // Auto-select first sport when data loads or current sport disappears
  useEffect(() => {
    if (activeSports.length === 0) {
      setSelectedSport(null);
      return;
    }
    setSelectedSport((prev) => {
      if (prev && activeSports.includes(prev)) return prev;
      return activeSports[0];
    });
  }, [activeSports]);

  // Filter matches for the selected sport, status, and search term
  const sportMatches = useMemo(() => {
    return activeMatches.filter((m) => {
      const matchesSport = m.sport === selectedSport;
      if (!matchesSport) return false;

      if (statusFilter === "ongoing" && m.status !== "Ongoing") return false;
      if (statusFilter === "scheduled" && m.status !== "Scheduled") return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.teamA?.toLowerCase().includes(q) ||
        m.teamB?.toLowerCase().includes(q) ||
        m.deptA?.toLowerCase().includes(q) ||
        m.deptB?.toLowerCase().includes(q) ||
        m.venue?.toLowerCase().includes(q) ||
        m.round?.toLowerCase().includes(q)
      );
    });
  }, [activeMatches, selectedSport, statusFilter, searchQuery]);

  const handleSelectSport = (sport) => {
    setSelectedSport(sport);
  };

  const handleOpenScoreSheet = (m) => {
    if (m.status !== "Ongoing" && currentUser.role !== "Admin") return;
    sessionStorage.setItem("nec_sports_selected_match_id", m.id);
    sessionStorage.setItem("nec_sports_selected_match", JSON.stringify(m));
    if (onNavigate) {
      onNavigate("coord_score_sheet");
    } else {
      sessionStorage.setItem("nec_sports_active_nav", "coord_score_sheet");
      window.location.reload();
    }
  };

  const handleStartMatchDirectly = async (e, m) => {
    e.stopPropagation();
    try {
      await matchesApi.updateScore(
        m.id,
        m.scoreA || 0,
        m.scoreB || 0,
        m.detailScore || "",
        false // sets Ongoing
      );
      toast.success(`${m.teamA} vs ${m.teamB} is now LIVE!`);
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to start match");
    }
  };

  // Count live (Ongoing) matches for the selected sport
  const liveCount = activeMatches.filter(
    (m) => m.sport === selectedSport && m.status === "Ongoing"
  ).length;

  const scheduledCount = activeMatches.filter(
    (m) => m.sport === selectedSport && m.status === "Scheduled"
  ).length;

  /* ── Loading skeleton ─────────────────────────────────────────────────── */
  if (loading && !allMatches) {
    return (
      <div className="nec-portal-page">
        <div className="nec-page-header">
          <h2 className="nec-page-title">Sports Score Board</h2>
        </div>
        <SkeletonLoader rows={5} />
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────────────────── */
  if (error && !allMatches) {
    return (
      <div className="nec-portal-page">
        <div className="nec-page-header">
          <h2 className="nec-page-title">Sports Score Board</h2>
        </div>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  /* ── Main Dashboard Render ────────────────────────────────────────────── */
  return (
    <div className="nec-portal-page nec-ssb-dashboard">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="nec-ssb-header">
        <div className="nec-ssb-header-left">
          <h2 className="nec-page-title" style={{ margin: 0 }}>
            Sports Score Board
            {selectedSport && (
              <span className="nec-ssb-sport-label">{selectedSport}</span>
            )}
          </h2>
          {selectedSport && (
            <div className="nec-ssb-meta">
              <Badge status={liveCount > 0 ? "live" : "warning"}>
                {liveCount > 0 ? `${liveCount} Live` : `${scheduledCount} Scheduled`}
              </Badge>
              <span className="nec-ssb-match-count">
                {sportMatches.length} match{sportMatches.length !== 1 ? "es" : ""} available
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── No Active Matches ──────────────────────────────────────────────── */}
      {activeSports.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Active Matches"
          message="There are no ongoing or scheduled matches at this time."
        />
      ) : (
        <>
          {/* ── Sport Selection Control Bar ─────────────────────────────────── */}
          <div className="nec-ssb-sport-tabs" role="tablist" aria-label="Select sport">
            {activeSports.map((sport) => {
              const totalCount = activeMatches.filter((m) => m.sport === sport).length;
              const liveN = activeMatches.filter(
                (m) => m.sport === sport && m.status === "Ongoing"
              ).length;
              return (
                <button
                  key={sport}
                  role="tab"
                  aria-selected={selectedSport === sport}
                  className={`nec-ssb-sport-tab${selectedSport === sport ? " active" : ""}`}
                  onClick={() => handleSelectSport(sport)}
                >
                  <span className="nec-ssb-tab-name">{sport}</span>
                  <span className="nec-ssb-tab-count">
                    {liveN > 0 ? `${liveN} Live` : totalCount}
                  </span>
                  {liveN > 0 && <span className="nec-ssb-live-dot" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* ── Filter & Search Controls Bar ────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Status Tabs */}
            <div style={{ display: "flex", gap: "6px" }}>
              <Button
                variant={statusFilter === "all" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All Matches ({activeMatches.filter((m) => m.sport === selectedSport).length})
              </Button>
              <Button
                variant={statusFilter === "ongoing" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("ongoing")}
              >
                Live Matches ({liveCount})
              </Button>
              <Button
                variant={statusFilter === "scheduled" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setStatusFilter("scheduled")}
              >
                Scheduled ({scheduledCount})
              </Button>
            </div>

            {/* Search Box */}
            <div className="nec-ssb-search-input-wrap">
              <Search size={16} className="nec-ssb-search-icon" />
              <input
                type="text"
                className="nec-ssb-search-input"
                placeholder={`Search ${selectedSport || "sport"} matches...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* ── Spacious Full-Width Match Cards Grid ────────────────────────── */}
          <div className="nec-ssb-matches-section">
            {sportMatches.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Clock}
                  title="No Matches Found"
                  message={
                    searchQuery
                      ? `No matches match "${searchQuery}" for ${selectedSport}.`
                      : statusFilter === "ongoing"
                      ? `No live ongoing matches for ${selectedSport}. Click "Scheduled" to view upcoming fixtures.`
                      : `No active matches for ${selectedSport} right now.`
                  }
                />
              </Card>
            ) : (
              <div className="nec-ssb-grid">
                {sportMatches.map((m) => {
                  const isMatchLive = m.status === "Ongoing";
                  return (
                    <div
                      key={m.id}
                      className="nec-ssb-card"
                      onClick={() => handleOpenScoreSheet(m)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleOpenScoreSheet(m)}
                    >
                      {/* Card Header */}
                      <div className="nec-ssb-card-header">
                        <div className="nec-ssb-card-meta">
                          <span className="nec-ssb-card-sport">{m.sport}</span>
                          {m.round && <span className="nec-ssb-card-round">{m.round}</span>}
                        </div>
                        <Badge status={isMatchLive ? "live" : "warning"}>
                          {m.status}
                        </Badge>
                      </div>

                      {/* Card Teams & Score */}
                      <div className="nec-ssb-card-teams">
                        <div className="nec-ssb-card-team">
                          <span className="nec-ssb-card-team-name">{m.teamA}</span>
                          {m.deptA && <span className="nec-ssb-card-dept">{m.deptA}</span>}
                        </div>

                        <div className="nec-ssb-card-score-box">
                          <span className="nec-ssb-card-score">
                            {m.scoreA ?? 0} : {m.scoreB ?? 0}
                          </span>
                        </div>

                        <div className="nec-ssb-card-team nec-ssb-card-team--right">
                          <span className="nec-ssb-card-team-name">{m.teamB}</span>
                          {m.deptB && <span className="nec-ssb-card-dept">{m.deptB}</span>}
                        </div>
                      </div>

                      {/* Detail Score Preview if available */}
                      {m.detailScore && (
                        <div className="nec-ssb-card-detail-preview">
                          {m.detailScore}
                        </div>
                      )}

                      {/* Card Footer: venue, time, action */}
                      <div className="nec-ssb-card-footer">
                        <div className="nec-ssb-card-footer-info">
                          {m.venue && (
                            <span className="nec-ssb-card-info-item">
                              <MapPin size={13} /> {m.venue}
                            </span>
                          )}
                          {m.scheduled_time && (
                            <span className="nec-ssb-card-info-item">
                              <Clock size={13} /> {new Date(m.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {!isMatchLive && currentUser.role === "Admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Play}
                              onClick={(e) => handleStartMatchDirectly(e, m)}
                            >
                              Start Match
                            </Button>
                          )}
                          <div className="nec-ssb-card-action">
                            <span className="nec-ssb-card-action-text">
                              {isMatchLive ? "Update Score" : "Scheduled"}
                            </span>
                            <ChevronRight size={16} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
