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
import {
  RefreshCw,
  Activity,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  Play,
  Trophy,
  Filter,
  X,
  Calendar,
  Users,
  CheckCircle2,
  Crown,
  Layers,
  ChevronDown
} from "lucide-react";

export default function ScoreEntry({ onNavigate }) {
  const toast = useToast();
  const { currentUser } = useAuth();

  // ── Top Level View Tabs ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("scoreboard"); // "scoreboard" | "results" | "fixtures"

  // ── Dropdown Filter States ───────────────────────────────────────────────
  const [filterSport, setFilterSport] = useState("ALL");
  const [filterVenue, setFilterVenue] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterRound, setFilterRound] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Scoreboard quick status pill
  const [scoreboardStatusPill, setScoreboardStatusPill] = useState("all"); // "all" | "ongoing" | "scheduled"

  // Fixtures grouping mode
  const [fixtureGrouping, setFixtureGrouping] = useState("sport"); // "sport" | "venue"

  // Poll all matches every 15 s
  const fetchMatches = useCallback(() => matchesApi.getMatches(), []);
  const { data: allMatches = [], loading, error, refetch } = useAutoRefresh(
    fetchMatches,
    { interval: 15000 }
  );

  const safeMatches = useMemo(() => (Array.isArray(allMatches) ? allMatches : []), [allMatches]);

  // Distinct lists for dropdown filters
  const allSportsList = useMemo(() => {
    return [...new Set(safeMatches.map((m) => m.sport || m.sport_name).filter(Boolean))].sort();
  }, [safeMatches]);

  const allVenuesList = useMemo(() => {
    return [...new Set(safeMatches.map((m) => m.venue || m.venue_name).filter(Boolean))].sort();
  }, [safeMatches]);

  const allRoundsList = useMemo(() => {
    return [...new Set(safeMatches.map((m) => m.round).filter(Boolean))].sort();
  }, [safeMatches]);

  // Overall match status counts
  const liveMatchesCount = useMemo(() => {
    return safeMatches.filter((m) => m.status === "Ongoing" || m.status === "Live").length;
  }, [safeMatches]);

  const scheduledMatchesCount = useMemo(() => {
    return safeMatches.filter((m) => m.status === "Scheduled").length;
  }, [safeMatches]);

  const completedMatchesCount = useMemo(() => {
    return safeMatches.filter((m) => m.status === "Completed").length;
  }, [safeMatches]);

  // Helper to determine winner team
  const getWinnerTeam = (m) => {
    if (m.status !== "Completed" && m.status !== "Finished") return null;
    if (m.winner_team_id) {
      if (m.team_a_id && Number(m.winner_team_id) === Number(m.team_a_id)) return m.teamA;
      if (m.team_b_id && Number(m.winner_team_id) === Number(m.team_b_id)) return m.teamB;
    }
    const sA = Number(m.scoreA ?? m.score_a ?? 0);
    const sB = Number(m.scoreB ?? m.score_b ?? 0);
    if (sA > sB) return m.teamA;
    if (sB > sA) return m.teamB;
    return null;
  };

  const formatDateTime = (dateVal, timeVal) => {
    if (!dateVal) return "TBD";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) {
        return timeVal && timeVal !== "--:--" ? `${dateVal} • ${timeVal}` : String(dateVal);
      }
      const formattedDate = d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
      if (timeVal && timeVal !== "--:--") {
        return `${formattedDate} • ${timeVal}`;
      }
      if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
        return `${formattedDate} • ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
      }
      return formattedDate;
    } catch {
      return String(dateVal);
    }
  };

  // Base filter logic matching sports, venues, rounds, and search query
  const matchesPassingFilters = useMemo(() => {
    return safeMatches.filter((m) => {
      const sp = m.sport || m.sport_name || "";
      const ven = m.venue || m.venue_name || "";
      const rnd = m.round || "";
      const st = m.status || "Scheduled";

      if (filterSport !== "ALL" && sp !== filterSport) return false;
      if (filterVenue !== "ALL" && ven !== filterVenue) return false;
      if (filterRound !== "ALL" && rnd !== filterRound) return false;
      if (filterStatus !== "ALL" && st !== filterStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.teamA?.toLowerCase().includes(q) ||
        m.teamB?.toLowerCase().includes(q) ||
        m.deptA?.toLowerCase().includes(q) ||
        m.deptB?.toLowerCase().includes(q) ||
        ven.toLowerCase().includes(q) ||
        sp.toLowerCase().includes(q) ||
        rnd.toLowerCase().includes(q)
      );
    });
  }, [safeMatches, filterSport, filterVenue, filterRound, filterStatus, searchQuery]);

  // Scoreboard Tab Matches (Live & Scheduled)
  const scoreboardMatches = useMemo(() => {
    return matchesPassingFilters.filter((m) => {
      // In scoreboard view, if filterStatus is ALL, default to active matches (Ongoing & Scheduled)
      if (filterStatus === "ALL") {
        if (scoreboardStatusPill === "ongoing") return m.status === "Ongoing" || m.status === "Live";
        if (scoreboardStatusPill === "scheduled") return m.status === "Scheduled";
        return m.status === "Ongoing" || m.status === "Live" || m.status === "Scheduled";
      }
      return true;
    });
  }, [matchesPassingFilters, filterStatus, scoreboardStatusPill]);

  // Results Tab Matches (Completed)
  const resultsMatches = useMemo(() => {
    return matchesPassingFilters.filter((m) => m.status === "Completed");
  }, [matchesPassingFilters]);

  // Fixtures Tab Matches (Upcoming, Live, or Scheduled Fixtures)
  const fixturesMatches = useMemo(() => {
    return matchesPassingFilters;
  }, [matchesPassingFilters]);

  // Grouped Fixtures by Sport
  const fixturesBySport = useMemo(() => {
    const map = {};
    fixturesMatches.forEach((m) => {
      const sp = m.sport || m.sport_name || "General Sport";
      if (!map[sp]) map[sp] = [];
      map[sp].push(m);
    });
    return map;
  }, [fixturesMatches]);

  // Grouped Fixtures by Venue
  const fixturesByVenue = useMemo(() => {
    const map = {};
    fixturesMatches.forEach((m) => {
      const ven = m.venue || m.venue_name || "Unassigned Venue";
      if (!map[ven]) map[ven] = [];
      map[ven].push(m);
    });
    return map;
  }, [fixturesMatches]);

  const isAnyFilterActive =
    filterSport !== "ALL" ||
    filterVenue !== "ALL" ||
    filterStatus !== "ALL" ||
    filterRound !== "ALL" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setFilterSport("ALL");
    setFilterVenue("ALL");
    setFilterStatus("ALL");
    setFilterRound("ALL");
    setSearchQuery("");
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

  /* ── Loading Skeleton ─────────────────────────────────────────────────── */
  if (loading && safeMatches.length === 0) {
    return (
      <div className="nec-portal-page">
        <div className="nec-page-header">
          <h2 className="nec-page-title">Sports Score Board &amp; Fixtures</h2>
        </div>
        <SkeletonLoader rows={6} />
      </div>
    );
  }

  /* ── Error State ──────────────────────────────────────────────────────── */
  if (error && safeMatches.length === 0) {
    return (
      <div className="nec-portal-page">
        <div className="nec-page-header">
          <h2 className="nec-page-title">Sports Score Board &amp; Fixtures</h2>
        </div>
        <ErrorState onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="nec-portal-page nec-ssb-dashboard">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="nec-ssb-header">
        <div className="nec-ssb-header-left">
          <h2 className="nec-page-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            Sports Score Board
            {filterSport !== "ALL" && (
              <span className="nec-ssb-sport-label">{filterSport}</span>
            )}
          </h2>
          <div className="nec-ssb-meta" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <Badge status={liveMatchesCount > 0 ? "live" : "warning"}>
              {liveMatchesCount > 0 ? `🔴 ${liveMatchesCount} Live Match${liveMatchesCount === 1 ? "" : "es"}` : `${scheduledMatchesCount} Scheduled`}
            </Badge>
            <span className="nec-ssb-match-count">
              {safeMatches.length} total tournament fixture{safeMatches.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={refetch}>
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Main Navigation Tabs ────────────────────────────────────────── */}
      <div role="tablist" aria-label="Score board navigation" style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "14px 0 16px 0" }}>
        <Button
          variant={activeTab === "scoreboard" ? "primary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={activeTab === "scoreboard"}
          icon={Activity}
          onClick={() => setActiveTab("scoreboard")}
        >
          Live &amp; Active Scoreboard ({liveMatchesCount} Live)
        </Button>
        <Button
          variant={activeTab === "results" ? "primary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={activeTab === "results"}
          icon={Trophy}
          onClick={() => setActiveTab("results")}
        >
          Match Results ({completedMatchesCount})
        </Button>
        <Button
          variant={activeTab === "fixtures" ? "primary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={activeTab === "fixtures"}
          icon={Calendar}
          onClick={() => setActiveTab("fixtures")}
        >
          Team Fixtures ({safeMatches.length})
        </Button>
      </div>

      {/* ── Multi-Type Dropdown Filter Bar ──────────────────────────────── */}
      <div style={{
        background: "var(--nec-surface-raised, #f8fafc)",
        border: "1px solid var(--nec-border, #e2e8f0)",
        borderRadius: "10px",
        padding: "14px 16px",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "var(--nec-text-main, #1e293b)" }}>
            <Filter size={15} color="var(--nec-navy, #1e3a8a)" />
            <span>Dropdown Filters</span>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", background: "var(--nec-surface, #ffffff)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
              {activeTab === "scoreboard"
                ? `${scoreboardMatches.length} match${scoreboardMatches.length === 1 ? "" : "es"}`
                : activeTab === "results"
                ? `${resultsMatches.length} result${resultsMatches.length === 1 ? "" : "s"}`
                : `${fixturesMatches.length} fixture${fixturesMatches.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {isAnyFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={handleResetFilters}
              style={{ fontSize: "0.78rem", height: "28px", padding: "0 8px", color: "var(--nec-danger, #ef4444)" }}
            >
              Reset Filters
            </Button>
          )}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px"
        }}>
          {/* Sport Filter Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
              🏅 Sport
            </label>
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="nec-form-input"
              style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
            >
              <option value="ALL">All Sports ({allSportsList.length})</option>
              {allSportsList.map((sp) => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>

          {/* Venue Filter Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
              📍 Venue
            </label>
            <select
              value={filterVenue}
              onChange={(e) => setFilterVenue(e.target.value)}
              className="nec-form-input"
              style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
            >
              <option value="ALL">All Venues ({allVenuesList.length})</option>
              {allVenuesList.map((ven) => (
                <option key={ven} value={ven}>{ven}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Dropdown */}
          {activeTab !== "results" && (
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
                ⚡ Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="nec-form-input"
                style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Ongoing">🔴 Live / Ongoing</option>
                <option value="Scheduled">🟡 Scheduled</option>
                <option value="Completed">🟢 Completed</option>
                <option value="Postponed">⚠️ Postponed</option>
              </select>
            </div>
          )}

          {/* Round Filter Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
              🏷️ Tournament Round
            </label>
            <select
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
              className="nec-form-input"
              style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
            >
              <option value="ALL">All Rounds</option>
              {allRoundsList.map((rnd) => (
                <option key={rnd} value={rnd}>{rnd}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
              🔍 Search Teams / Depts
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="nec-form-input"
                placeholder="Search teams, dept, venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "7px 10px 7px 30px", fontSize: "0.825rem", borderRadius: "6px" }}
              />
              <Search size={14} style={{ position: "absolute", left: "9px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted, #64748b)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: SCOREBOARD VIEW                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "scoreboard" && (
        <>
          {/* Quick Sport Pills Bar */}
          {allSportsList.length > 0 && (
            <div className="nec-ssb-sport-tabs" role="tablist" aria-label="Select sport" style={{ marginBottom: "14px" }}>
              <button
                role="tab"
                aria-selected={filterSport === "ALL"}
                className={`nec-ssb-sport-tab${filterSport === "ALL" ? " active" : ""}`}
                onClick={() => setFilterSport("ALL")}
              >
                <span className="nec-ssb-tab-name">All Sports</span>
                <span className="nec-ssb-tab-count">
                  {liveMatchesCount > 0 ? `${liveMatchesCount} Live` : safeMatches.length}
                </span>
                {liveMatchesCount > 0 && <span className="nec-ssb-live-dot" aria-hidden="true" />}
              </button>

              {allSportsList.map((sport) => {
                const totalCount = safeMatches.filter((m) => m.sport === sport).length;
                const liveN = safeMatches.filter(
                  (m) => m.sport === sport && (m.status === "Ongoing" || m.status === "Live")
                ).length;
                return (
                  <button
                    key={sport}
                    role="tab"
                    aria-selected={filterSport === sport}
                    className={`nec-ssb-sport-tab${filterSport === sport ? " active" : ""}`}
                    onClick={() => setFilterSport(sport)}
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
          )}

          {/* Quick Status Buttons */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
            <Button
              variant={scoreboardStatusPill === "all" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setScoreboardStatusPill("all")}
            >
              All Matches ({scoreboardMatches.length})
            </Button>
            <Button
              variant={scoreboardStatusPill === "ongoing" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setScoreboardStatusPill("ongoing")}
            >
              Live Matches ({scoreboardMatches.filter((m) => m.status === "Ongoing" || m.status === "Live").length})
            </Button>
            <Button
              variant={scoreboardStatusPill === "scheduled" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setScoreboardStatusPill("scheduled")}
            >
              Scheduled ({scoreboardMatches.filter((m) => m.status === "Scheduled").length})
            </Button>
          </div>

          {/* Match Cards Grid */}
          <div className="nec-ssb-matches-section">
            {scoreboardMatches.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Clock}
                  title="No Matches Found"
                  message={
                    isAnyFilterActive
                      ? "No matches match the selected filter criteria."
                      : "No active matches scheduled right now."
                  }
                />
              </Card>
            ) : (
              <div className="nec-ssb-grid">
                {scoreboardMatches.map((m) => {
                  const isMatchLive = m.status === "Ongoing" || m.status === "Live";
                  return (
                    <div
                      key={m.id || m.match_id}
                      className="nec-ssb-card"
                      onClick={() => handleOpenScoreSheet(m)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleOpenScoreSheet(m)}
                    >
                      {/* Card Header */}
                      <div className="nec-ssb-card-header">
                        <div className="nec-ssb-card-meta">
                          <span className="nec-ssb-card-sport">{m.sport || m.sport_name}</span>
                          {m.round && <span className="nec-ssb-card-round">{m.round}</span>}
                        </div>
                        <Badge status={isMatchLive ? "live" : m.status === "Completed" ? "success" : "warning"}>
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

                      {/* Detail Score Preview */}
                      {m.detailScore && (
                        <div className="nec-ssb-card-detail-preview">
                          {m.detailScore}
                        </div>
                      )}

                      {/* Card Footer */}
                      <div className="nec-ssb-card-footer">
                        <div className="nec-ssb-card-footer-info">
                          {m.venue && (
                            <span className="nec-ssb-card-info-item">
                              <MapPin size={13} /> {m.venue}
                            </span>
                          )}
                          {m.scheduled_time && (
                            <span className="nec-ssb-card-info-item">
                              <Clock size={13} /> {formatDateTime(m.scheduled_time || m.date, m.time)}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {!isMatchLive && currentUser?.role === "Admin" && (
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: MATCH RESULTS VIEW                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "results" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)" }}>
                🏆 Completed Match Results
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--nec-text-muted, #64748b)" }}>
                Official final scores, winning teams, and finished tournament outcomes.
              </p>
            </div>
          </div>

          {resultsMatches.length === 0 ? (
            <Card>
              <EmptyState
                icon={Trophy}
                title="No Match Results Found"
                message={
                  isAnyFilterActive
                    ? "No completed match results match the selected filter criteria."
                    : "No matches have finished yet. Once matches conclude, their final results will appear here."
                }
              />
            </Card>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px"
            }}>
              {resultsMatches.map((m) => {
                const winner = getWinnerTeam(m);
                const isWinnerA = winner && winner === m.teamA;
                const isWinnerB = winner && winner === m.teamB;

                return (
                  <div
                    key={m.id || m.match_id}
                    style={{
                      background: "var(--nec-surface, #ffffff)",
                      border: "1px solid var(--nec-border, #e2e8f0)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--nec-navy, #1e3a8a)" }}>
                          {m.sport || m.sport_name}
                        </span>
                        {m.round && (
                          <span style={{ fontSize: "0.75rem", background: "var(--nec-surface-raised, #f1f5f9)", padding: "2px 8px", borderRadius: "10px", color: "var(--nec-text-muted)" }}>
                            {m.round}
                          </span>
                        )}
                      </div>
                      <Badge status="success">Completed</Badge>
                    </div>

                    {/* Competing Teams & Scores */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto 1fr",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 0",
                      borderTop: "1px dashed var(--nec-border, #e2e8f0)",
                      borderBottom: "1px dashed var(--nec-border, #e2e8f0)"
                    }}>
                      {/* Team A */}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <strong style={{ fontSize: "0.95rem", color: isWinnerA ? "#047857" : "var(--nec-text-main, #0f172a)" }}>
                            {m.teamA}
                          </strong>
                          {isWinnerA && <Crown size={14} color="#f59e0b" />}
                        </div>
                        {m.deptA && (
                          <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                            {m.deptA}
                          </span>
                        )}
                      </div>

                      {/* Final Score */}
                      <div style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.1)",
                        color: "#065f46",
                        fontWeight: 800,
                        fontSize: "1.15rem",
                        letterSpacing: "1px"
                      }}>
                        {m.scoreA ?? 0} : {m.scoreB ?? 0}
                      </div>

                      {/* Team B */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                          {isWinnerB && <Crown size={14} color="#f59e0b" />}
                          <strong style={{ fontSize: "0.95rem", color: isWinnerB ? "#047857" : "var(--nec-text-main, #0f172a)" }}>
                            {m.teamB}
                          </strong>
                        </div>
                        {m.deptB && (
                          <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                            {m.deptB}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detail Score Outcome */}
                    {m.detailScore && (
                      <div style={{
                        fontSize: "0.825rem",
                        fontWeight: 600,
                        color: winner ? "#047857" : "var(--nec-text-main, #334155)",
                        background: winner ? "rgba(16, 185, 129, 0.08)" : "var(--nec-surface-raised, #f8fafc)",
                        padding: "8px 10px",
                        borderRadius: "6px"
                      }}>
                        {winner ? `🏆 Winner: ${winner}` : "Match Summary"}: {m.detailScore}
                      </div>
                    )}

                    {/* Footer Info */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                      <span>📍 {m.venue || "TBD"}</span>
                      <span>📅 {formatDateTime(m.date || m.scheduled_time, m.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: TEAM FIXTURES VIEW (SPORT-BASED & VENUE-BASED)                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "fixtures" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Fixtures Sub-Switch: Sport-based vs Venue-based */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "var(--nec-surface-raised, #f8fafc)",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid var(--nec-border, #e2e8f0)"
          }}>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)" }}>
                Competing Teams Fixtures
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted, #64748b)" }}>
                Organize and view matchups by Sport or by Venue
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant={fixtureGrouping === "sport" ? "primary" : "outline"}
                size="sm"
                icon={Layers}
                onClick={() => setFixtureGrouping("sport")}
              >
                🏅 Fixtures by Sport
              </Button>
              <Button
                variant={fixtureGrouping === "venue" ? "primary" : "outline"}
                size="sm"
                icon={MapPin}
                onClick={() => setFixtureGrouping("venue")}
              >
                📍 Fixtures by Venue
              </Button>
            </div>
          </div>

          {fixturesMatches.length === 0 ? (
            <Card>
              <EmptyState
                icon={Calendar}
                title="No Fixtures Found"
                message={
                  isAnyFilterActive
                    ? "No fixtures match the selected filter criteria."
                    : "No upcoming fixtures are currently scheduled."
                }
              />
            </Card>
          ) : fixtureGrouping === "sport" ? (
            /* ── GROUPED BY SPORT ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {Object.entries(fixturesBySport).map(([sportName, sMatches]) => (
                <div
                  key={sportName}
                  style={{
                    background: "var(--nec-surface, #ffffff)",
                    border: "1px solid var(--nec-border, #e2e8f0)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  {/* Group Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--nec-border, #e2e8f0)", paddingBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)" }}>
                        🏅 {sportName}
                      </span>
                      <span style={{ fontSize: "0.78rem", background: "rgba(30, 58, 138, 0.08)", color: "#1e3a8a", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                        {sMatches.length} Fixture{sMatches.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {/* Fixture cards inside sport */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "12px"
                  }}>
                    {sMatches.map((m) => (
                      <div
                        key={m.id || m.match_id}
                        style={{
                          background: "var(--nec-surface-raised, #f8fafc)",
                          border: "1px solid var(--nec-border, #e2e8f0)",
                          borderRadius: "10px",
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted)" }}>
                            {m.round || "Fixture"}
                          </span>
                          <Badge status={m.status === "Ongoing" || m.status === "Live" ? "live" : m.status === "Completed" ? "success" : "warning"}>
                            {m.status}
                          </Badge>
                        </div>

                        {/* Competing Teams Head-to-Head */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", margin: "4px 0" }}>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <strong style={{ fontSize: "0.9rem", color: "var(--nec-text-main, #0f172a)", display: "block" }}>
                              {m.teamA}
                            </strong>
                            {m.deptA && (
                              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                                {m.deptA}
                              </span>
                            )}
                          </div>

                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            background: "var(--nec-surface, #ffffff)",
                            border: "1px solid var(--nec-border, #e2e8f0)",
                            color: "var(--nec-navy, #1e3a8a)"
                          }}>
                            {m.status === "Completed" ? `${m.scoreA} : ${m.scoreB}` : "VS"}
                          </span>

                          <div style={{ flex: 1, textAlign: "right" }}>
                            <strong style={{ fontSize: "0.9rem", color: "var(--nec-text-main, #0f172a)", display: "block" }}>
                              {m.teamB}
                            </strong>
                            {m.deptB && (
                              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                                {m.deptB}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted, #64748b)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px dashed var(--nec-border, #e2e8f0)" }}>
                          <span>📍 {m.venue || "TBD"}</span>
                          <span>📅 {formatDateTime(m.date || m.scheduled_time, m.time)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── GROUPED BY VENUE ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {Object.entries(fixturesByVenue).map(([venueName, vMatches]) => (
                <div
                  key={venueName}
                  style={{
                    background: "var(--nec-surface, #ffffff)",
                    border: "1px solid var(--nec-border, #e2e8f0)",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}
                >
                  {/* Venue Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--nec-border, #e2e8f0)", paddingBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)" }}>
                        📍 {venueName}
                      </span>
                      <span style={{ fontSize: "0.78rem", background: "rgba(16, 185, 129, 0.1)", color: "#065f46", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                        {vMatches.length} Scheduled Match{vMatches.length === 1 ? "" : "es"}
                      </span>
                    </div>
                  </div>

                  {/* Fixture cards inside venue */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "12px"
                  }}>
                    {vMatches.map((m) => (
                      <div
                        key={m.id || m.match_id}
                        style={{
                          background: "var(--nec-surface-raised, #f8fafc)",
                          border: "1px solid var(--nec-border, #e2e8f0)",
                          borderRadius: "10px",
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--nec-navy, #1e3a8a)" }}>
                            {m.sport || m.sport_name} • {m.round || "Fixture"}
                          </span>
                          <Badge status={m.status === "Ongoing" || m.status === "Live" ? "live" : m.status === "Completed" ? "success" : "warning"}>
                            {m.status}
                          </Badge>
                        </div>

                        {/* Competing Teams Head-to-Head */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", margin: "4px 0" }}>
                          <div style={{ flex: 1, textAlign: "left" }}>
                            <strong style={{ fontSize: "0.9rem", color: "var(--nec-text-main, #0f172a)", display: "block" }}>
                              {m.teamA}
                            </strong>
                            {m.deptA && (
                              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                                {m.deptA}
                              </span>
                            )}
                          </div>

                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            background: "var(--nec-surface, #ffffff)",
                            border: "1px solid var(--nec-border, #e2e8f0)",
                            color: "var(--nec-navy, #1e3a8a)"
                          }}>
                            {m.status === "Completed" ? `${m.scoreA} : ${m.scoreB}` : "VS"}
                          </span>

                          <div style={{ flex: 1, textAlign: "right" }}>
                            <strong style={{ fontSize: "0.9rem", color: "var(--nec-text-main, #0f172a)", display: "block" }}>
                              {m.teamB}
                            </strong>
                            {m.deptB && (
                              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted, #64748b)" }}>
                                {m.deptB}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted, #64748b)", display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px dashed var(--nec-border, #e2e8f0)" }}>
                          <span>📅 {formatDateTime(m.date || m.scheduled_time, m.time)}</span>
                          {m.detailScore && (
                            <span style={{ fontWeight: 600, color: "#065f46" }}>{m.detailScore}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
