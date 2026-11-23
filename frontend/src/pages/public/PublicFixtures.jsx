import React, { useMemo, useState, useCallback, useEffect } from "react";
import { matchesApi, tournamentsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import TournamentBracket from "../../components/common/TournamentBracket";
import {
  Calendar, Clock, MapPin, ArrowUpDown, Filter, Trophy,
  Radio, CheckCircle, Search, X, ChevronRight, Award
} from "lucide-react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import "./PublicPortal.css";

// Helper for formatting ISO date/time into clean separated strings
function formatDateTime(val) {
  if (!val) return { dateStr: "TBD", timeStr: "" };
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return { dateStr: String(val), timeStr: "" };
    const dateStr = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: String(val), timeStr: "" };
  }
}

export default function PublicFixtures({ departmentCode, onNavigate }) {
  const [scope, setScope] = useState("ALL"); // 'ALL', 'Intramural', 'Inter-Collegiate'
  const [statusTab, setStatusTab] = useState("UPCOMING"); // 'UPCOMING', 'TODAY', 'LIVE', 'ALL'
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'bracket'
  const [selectedTournament, setSelectedTournament] = useState("ALL");
  const [selectedSport, setSelectedSport] = useState("ALL");
  const [sortOption, setSortOption] = useState("date_asc");
  const [tournaments, setTournaments] = useState([]);

  // Fetch matches with scope filter
  const fetchMatches = useCallback(async () => {
    const params = scope === "ALL" ? {} : { scope };
    const res = await matchesApi.getMatches(params);
    return Array.isArray(res) ? res : [];
  }, [scope]);

  const { data: rawMatches, loading, error, refetch } = useAutoRefresh(fetchMatches, {
    interval: 15000,
    deps: [scope, departmentCode]
  });

  // Fetch tournaments list for the filter
  useEffect(() => {
    tournamentsApi.getTournaments({ scope: scope === "ALL" ? "" : scope })
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
        setTournaments(list);
      })
      .catch(() => setTournaments([]));
  }, [scope]);

  const allMatches = rawMatches || [];
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Distinct available sports
  const availableSports = useMemo(() => {
    const set = new Set();
    allMatches.forEach(m => {
      const sp = m.sport_name || m.sport;
      if (sp) set.add(sp);
    });
    return Array.from(set).sort();
  }, [allMatches]);

  // Filter by statusTab and department
  const tabFilteredMatches = useMemo(() => {
    let list = [...allMatches];

    // Department code constraint (if passed as prop)
    if (departmentCode && departmentCode !== "All") {
      list = list.filter(m => (m.deptA === departmentCode || m.deptB === departmentCode || m.dept_a_code === departmentCode || m.dept_b_code === departmentCode));
    }

    if (statusTab === "UPCOMING") {
      list = list.filter(m => m.status === "Scheduled");
    } else if (statusTab === "TODAY") {
      list = list.filter(m => {
        const matchDate = (m.scheduled_time || m.date || "").slice(0, 10);
        return matchDate === todayStr;
      });
    } else if (statusTab === "LIVE") {
      list = list.filter(m => m.status === "Ongoing");
    }

    // Tournament filter
    if (selectedTournament !== "ALL") {
      list = list.filter(m => String(m.tournament_id || m.tournamentId) === String(selectedTournament));
    }

    // Sport filter
    if (selectedSport !== "ALL") {
      list = list.filter(m => (m.sport_name || m.sport || "").toLowerCase() === selectedSport.toLowerCase());
    }

    // Sort
    list.sort((a, b) => {
      const timeA = new Date(a.scheduled_time || a.date || 0).getTime();
      const timeB = new Date(b.scheduled_time || b.date || 0).getTime();
      const sportA = (a.sport_name || a.sport || "").toLowerCase();
      const sportB = (b.sport_name || b.sport || "").toLowerCase();

      switch (sortOption) {
        case "date_asc": return timeA - timeB;
        case "date_desc": return timeB - timeA;
        case "sport_asc": return sportA.localeCompare(sportB) || (timeA - timeB);
        case "sport_desc": return sportB.localeCompare(sportA) || (timeA - timeB);
        default: return timeA - timeB;
      }
    });

    return list;
  }, [allMatches, departmentCode, statusTab, todayStr, selectedTournament, selectedSport, sortOption]);

  const scheduledCount = useMemo(() => allMatches.filter(m => m.status === "Scheduled").length, [allMatches]);
  const liveCount = useMemo(() => allMatches.filter(m => m.status === "Ongoing").length, [allMatches]);
  const todayCount = useMemo(() => allMatches.filter(m => (m.scheduled_time || m.date || "").slice(0, 10) === todayStr).length, [allMatches, todayStr]);

  const columns = [
    {
      key: "date",
      label: "Date & Time",
      render: (val, row) => {
        const { dateStr, timeStr } = formatDateTime(val || row.scheduled_time);
        return (
          <div className="nec-fixture-date-cell">
            <span className="nec-fixture-date" style={{ fontWeight: 700, color: "var(--nec-text-main)" }}>{dateStr}</span>
            {timeStr && (
              <span className="nec-fixture-time" style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
                <Clock size={12} /> {timeStr}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "tournament",
      label: "Competition / Tournament",
      render: (_, row) => {
        const isInter = (row.scope || row.tournament_scope) === "Inter-Collegiate";
        return (
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--nec-text-main)" }}>
              {row.tournament_name || row.tournamentName || "Tournament"}
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "3px" }}>
              <Badge style={{
                background: isInter ? "#1e3a8a" : "#4338ca",
                color: "#fff",
                fontSize: "0.68rem",
                fontWeight: 700
              }}>
                {isInter ? "Inter College" : "Intra College"}
              </Badge>
              {row.competition_level && (
                <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)" }}>
                  {row.competition_level}
                </span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: "sport",
      label: "Sport & Round",
      render: (_, row) => (
        <div>
          <span className="nec-fixture-sport-name" style={{ fontWeight: 700, color: "var(--nec-text-main)" }}>
            {row.sport_name || row.sport}
          </span>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
            {row.round || "League"} {row.pool ? `• ${row.pool}` : ""}
          </div>
        </div>
      )
    },
    {
      key: "matchup",
      label: "Match Contestants",
      render: (_, row) => (
        <div className="nec-fixture-matchup-cell" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="nec-fixture-team" style={{ textAlign: "left" }}>
            <span className="nec-fixture-dept-tag" style={{
              display: "inline-block",
              background: "var(--nec-surface-raised)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.72rem",
              fontWeight: 800
            }}>
              {row.dept_a_code || row.deptA || "TEAM"}
            </span>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--nec-text-main)" }}>
              {row.team_a_name || row.teamA}
            </div>
          </div>

          <span className="nec-fixture-vs" style={{ color: "var(--nec-text-muted)", fontWeight: 800, fontSize: "0.75rem" }}>
            VS
          </span>

          <div className="nec-fixture-team" style={{ textAlign: "left" }}>
            <span className="nec-fixture-dept-tag" style={{
              display: "inline-block",
              background: "var(--nec-surface-raised)",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.72rem",
              fontWeight: 800
            }}>
              {row.dept_b_code || row.deptB || "TEAM"}
            </span>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--nec-text-main)" }}>
              {row.team_b_name || row.teamB}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "venue",
      label: "Venue / Ground",
      render: (val, row) => (
        <span className="nec-fixture-venue" style={{ fontSize: "0.82rem", color: "var(--nec-text-muted)" }}>
          <MapPin size={13} style={{ color: "#e11d48", marginRight: "4px" }} />
          {val || row.venue_name || "Campus Ground"}
        </span>
      )
    },
    {
      key: "status",
      label: "Status / Result",
      render: (val, row) => {
        const isLive = val === "Ongoing";
        const isComp = val === "Completed";
        if (isLive) {
          return (
            <Badge style={{ background: "#ef4444", color: "#fff", fontWeight: 800, fontSize: "0.72rem" }}>
              🔴 LIVE NOW
            </Badge>
          );
        }
        if (isComp) {
          return (
            <div>
              <Badge variant="default" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                {row.score_a} - {row.score_b}
              </Badge>
              {row.winner_name && (
                <div style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 700, marginTop: "2px" }}>
                  🏆 {row.winner_name}
                </div>
              )}
            </div>
          );
        }
        return <Badge variant="primary" style={{ fontSize: "0.72rem" }}>Scheduled</Badge>;
      }
    }
  ];

  return (
    <div className="nec-portal-page nec-public-fixtures">
      {/* Header */}
      <div className="nec-page-header" style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        paddingBottom: "16px"
      }}>
        <div>
          <h2 className="nec-page-title" style={{ margin: "0 0 4px" }}>
            {departmentCode ? `${departmentCode} Match Fixtures` : "Match Fixtures & Tournament Schedules"}
          </h2>
          <p className="nec-page-desc" style={{ margin: 0 }}>
            Master match timetable for all collegiate competitions, league matches, playoffs, and championship finals.
          </p>
        </div>

        {/* Scope Filter Switcher */}
        <div style={{
          display: "inline-flex",
          background: "var(--nec-surface-raised)",
          padding: "4px",
          borderRadius: "10px",
          gap: "4px",
          border: "1px solid var(--nec-border)"
        }}>
          {[
            { id: "ALL", label: "All" },
            { id: "Intramural", label: "Intra College" },
            { id: "Inter-Collegiate", label: "Inter College" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              style={{
                padding: "6px 14px",
                border: "none",
                borderRadius: "7px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                background: scope === tab.id ? "var(--nec-blue-accent, #0274be)" : "transparent",
                color: scope === tab.id ? "#fff" : "var(--nec-text-muted)",
                transition: "all 0.15s ease"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Tabs & View Mode Switcher */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "2px solid var(--nec-border)",
        paddingBottom: "12px"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            { id: "UPCOMING", label: `Upcoming Scheduled (${scheduledCount})` },
            { id: "TODAY", label: `Today's Matches (${todayCount})` },
            { id: "LIVE", label: `Live In Progress (${liveCount})` },
            { id: "ALL", label: `Complete Fixture History (${allMatches.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
                background: statusTab === tab.id ? "var(--nec-surface-raised)" : "transparent",
                color: statusTab === tab.id ? "var(--nec-blue-accent)" : "var(--nec-text-muted)",
                boxShadow: statusTab === tab.id ? "inset 0 -2px 0 var(--nec-blue-accent)" : "none"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* View Mode Switcher: Table vs Bracket */}
        <div style={{ display: "inline-flex", background: "var(--nec-surface-raised)", padding: "3px", borderRadius: "8px", border: "1px solid var(--nec-border)", gap: "4px" }}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              padding: "5px 12px",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              background: viewMode === "table" ? "var(--nec-blue-accent, #0274be)" : "transparent",
              color: viewMode === "table" ? "#fff" : "var(--nec-text-muted)"
            }}
          >
            📋 Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("bracket")}
            style={{
              padding: "5px 12px",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "0.8rem",
              cursor: "pointer",
              background: viewMode === "bracket" ? "var(--nec-blue-accent, #0274be)" : "transparent",
              color: viewMode === "bracket" ? "#fff" : "var(--nec-text-muted)"
            }}
          >
            🏆 Bracket View
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="nec-fixtures-toolbar" style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--nec-surface)",
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid var(--nec-border)"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {/* Tournament Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Tournament:</span>
            <select
              className="nec-fixture-select"
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.82rem",
                fontWeight: 600
              }}
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map(t => (
                <option key={t.tournament_id || t.id} value={t.tournament_id || t.id}>
                  {t.name || t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sport Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Sport:</span>
            <select
              className="nec-fixture-select"
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.82rem",
                fontWeight: 600
              }}
            >
              <option value="ALL">All Sports</option>
              {availableSports.map(sp => (
                <option key={sp} value={sp}>{sp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort Options */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ArrowUpDown size={14} style={{ color: "var(--nec-text-muted)" }} />
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Sort:</span>
          <select
            className="nec-fixture-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid var(--nec-border)",
              background: "var(--nec-surface)",
              color: "var(--nec-text-main)",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            <option value="date_asc">Date & Time (Earliest First)</option>
            <option value="date_desc">Date & Time (Latest First)</option>
            <option value="sport_asc">Sport (A to Z)</option>
            <option value="sport_desc">Sport (Z to A)</option>
          </select>
        </div>
      </div>

      {/* Table / Bracket / Empty State */}
      {loading ? (
        <SkeletonLoader rows={6} />
      ) : viewMode === "bracket" ? (
        <TournamentBracket
          matches={tabFilteredMatches}
          selectedSportProp={selectedSport !== "ALL" ? selectedSport : null}
        />
      ) : tabFilteredMatches.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <Calendar size={48} style={{ color: "var(--nec-text-muted)", margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 8px", color: "var(--nec-text-main)" }}>
            {statusTab === "UPCOMING" ? "No Upcoming Matches Scheduled" : "No Matches Found"}
          </h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", maxWidth: "520px", marginInline: "auto" }}>
            {statusTab === "UPCOMING"
              ? "All currently scheduled fixtures for this tournament or scope have concluded. You can inspect all past results or browse active tournaments."
              : "No fixtures match your current filter criteria. Try resetting filters or switching between Intra College and Inter College views."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
            <Button variant="secondary" onClick={() => setStatusTab("ALL")}>
              View Complete Fixture History
            </Button>
            {onNavigate && (
              <Button variant="primary" onClick={() => onNavigate("public_tournaments")}>
                Browse Tournaments
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Table
          columns={columns}
          data={tabFilteredMatches}
          loading={loading}
          searchPlaceholder="Search by team, sport, date, venue, tournament..."
        />
      )}
    </div>
  );
}
