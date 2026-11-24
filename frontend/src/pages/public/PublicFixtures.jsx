import React, { useMemo, useState, useCallback, useEffect } from "react";
import { matchesApi, tournamentsApi, eventsApi } from "../../services/api/apiServices";
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
  const [userSelectedTab, setUserSelectedTab] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'bracket'
  const [selectedTournament, setSelectedTournament] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [selectedSport, setSelectedSport] = useState("ALL");
  const [sortOption, setSortOption] = useState("date_asc");
  const [tournaments, setTournaments] = useState([]);
  const [eventsList, setEventsList] = useState([]);

  // Fetch matches with scope filter and unified competitions inclusion
  const fetchMatches = useCallback(async () => {
    const params = {
      includeCompetitions: true,
      ...(scope === "ALL" ? {} : { scope })
    };
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

  // Fetch events list for tournament-specific filtering
  useEffect(() => {
    const params = {};
    if (selectedTournament !== "ALL") params.tournamentId = selectedTournament;
    if (scope !== "ALL") params.scope = scope;
    eventsApi.getEvents(params)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
        setEventsList(list);
      })
      .catch(() => setEventsList([]));
  }, [selectedTournament, scope]);

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

  // Combined available events for tournament/event dropdown
  const availableEvents = useMemo(() => {
    const map = new Map();
    eventsList.forEach(ev => {
      const id = String(ev.event_id || ev.id);
      map.set(id, { id, name: ev.name || ev.title, tournamentId: String(ev.tournament_id || ev.tournamentId || "") });
    });
    allMatches.forEach(m => {
      const id = m.event_id || m.eventId;
      const name = m.event_name || m.eventName;
      if (id && name && !map.has(String(id))) {
        map.set(String(id), { id: String(id), name, tournamentId: String(m.tournament_id || m.tournamentId || "") });
      }
    });

    let list = Array.from(map.values());
    if (selectedTournament !== "ALL") {
      list = list.filter(ev => !ev.tournamentId || ev.tournamentId === String(selectedTournament));
    }
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [eventsList, allMatches, selectedTournament]);

  // Smart continuity: If the visitor hasn't explicitly clicked a status tab yet,
  // ensure they aren't greeted with a dead-end 0-match screen when live or completed matches exist!
  useEffect(() => {
    if (userSelectedTab || allMatches.length === 0) return;
    const sched = allMatches.filter(m => m.status === "Scheduled").length;
    const live = allMatches.filter(m => m.status === "Ongoing" || m.status === "Live").length;
    if (sched === 0) {
      if (live > 0) {
        setStatusTab("LIVE");
      } else {
        setStatusTab("ALL");
      }
    }
  }, [allMatches, userSelectedTab]);

  const handleTournamentChange = (tId) => {
    setSelectedTournament(tId);
    setSelectedEvent("ALL");
  };

  // Filter by statusTab, department, tournament, event and sport
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
      list = list.filter(m => m.status === "Ongoing" || m.status === "Live");
    }

    // Tournament filter
    if (selectedTournament !== "ALL") {
      list = list.filter(m => String(m.tournament_id || m.tournamentId) === String(selectedTournament));
    }

    // Event filter
    if (selectedEvent !== "ALL") {
      list = list.filter(m => String(m.event_id || m.eventId) === String(selectedEvent));
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
  }, [allMatches, departmentCode, statusTab, todayStr, selectedTournament, selectedEvent, selectedSport, sortOption]);

  const scheduledCount = useMemo(() => allMatches.filter(m => m.status === "Scheduled").length, [allMatches]);
  const liveCount = useMemo(() => allMatches.filter(m => m.status === "Ongoing" || m.status === "Live").length, [allMatches]);
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
      label: "Tournament & Event Details",
      render: (_, row) => {
        const isInter = (row.scope || row.tournament_scope) === "Inter-Collegiate";
        const eventTitle = row.event_name || row.eventName;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--nec-text-main)" }}>
              {row.tournament_name || row.tournamentName || "Tournament"}
            </div>
            {eventTitle ? (
              <div style={{
                fontWeight: 600,
                fontSize: "0.82rem",
                color: "var(--nec-blue-accent, #0274be)",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}>
                <Trophy size={13} style={{ flexShrink: 0 }} />
                <span>{eventTitle}</span>
                {row.competition_format && (
                  <span style={{
                    fontSize: "0.68rem",
                    color: "var(--nec-text-muted)",
                    background: "var(--nec-surface-raised)",
                    padding: "1px 5px",
                    borderRadius: "4px"
                  }}>
                    {row.competition_format}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: "0.76rem", color: "var(--nec-text-muted)", fontStyle: "italic" }}>
                General Tournament Fixture
              </span>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
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
      label: "Match Contestants / Participants",
      render: (_, row) => {
        const isComp = row.schedule_type === "Competition" || row.is_competition;
        if (isComp) {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  fontSize: "0.72rem",
                  fontWeight: 800
                }}>
                  HEAT / SESSION
                </span>
                <strong style={{ fontSize: "0.9rem", color: "var(--nec-text-main)" }}>
                  {row.title || row.round || "Competitive Contest"}
                </strong>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                {row.scoring ? `Evaluation: ${row.scoring} (${row.unit || ""})` : "Track / Field Event Session"}
              </span>
            </div>
          );
        }

        return (
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
        );
      }
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
        const isLive = val === "Ongoing" || val === "Live";
        const isComp = val === "Completed";
        const isScheduleComp = row.schedule_type === "Competition" || row.is_competition;

        if (isLive) {
          return (
            <Badge style={{ background: "#ef4444", color: "#fff", fontWeight: 800, fontSize: "0.72rem" }}>
              🔴 LIVE NOW
            </Badge>
          );
        }
        if (isComp) {
          if (isScheduleComp) {
            return (
              <div>
                <Badge variant="success" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                  🏁 Completed
                </Badge>
                {row.winner_name && (
                  <div style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 700, marginTop: "2px" }}>
                    🥇 {row.winner_name}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div>
              <Badge variant="default" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                {row.score_a ?? 0} - {row.score_b ?? 0}
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
            { id: "ALL", label: `Complete Master Schedule (${allMatches.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setUserSelectedTab(true);
                setStatusTab(tab.id);
              }}
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
              onChange={(e) => handleTournamentChange(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.82rem",
                fontWeight: 600,
                maxWidth: "220px"
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

          {/* Event Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Event:</span>
            <select
              className="nec-fixture-select"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--nec-border)",
                background: "var(--nec-surface)",
                color: "var(--nec-text-main)",
                fontSize: "0.82rem",
                fontWeight: 600,
                maxWidth: "220px"
              }}
            >
              <option value="ALL">All Events {availableEvents.length > 0 ? `(${availableEvents.length})` : ""}</option>
              {availableEvents.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
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
            {statusTab === "UPCOMING" ? "No Upcoming Matches Scheduled" : "No Matches Found for Current Filter"}
          </h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", maxWidth: "560px", marginInline: "auto" }}>
            {statusTab === "UPCOMING"
              ? (liveCount > 0
                  ? `All upcoming fixtures have already commenced or concluded. There is currently ${liveCount} match live in progress and ${allMatches.length} overall fixtures available in the continuous master schedule.`
                  : "All currently scheduled fixtures for this tournament or scope have concluded. You can inspect all past results or browse active tournaments.")
              : "No fixtures match your current filter criteria. Try resetting filters or switching between Intra College and Inter College views."}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
            {liveCount > 0 && statusTab !== "LIVE" && (
              <Button
                variant="danger"
                onClick={() => { setUserSelectedTab(true); setStatusTab("LIVE"); }}
                style={{ background: "#ef4444", color: "#fff", fontWeight: 700 }}
              >
                🔴 View Live In Progress ({liveCount})
              </Button>
            )}
            {statusTab !== "ALL" && (
              <Button variant="secondary" onClick={() => { setUserSelectedTab(true); setStatusTab("ALL"); }}>
                📋 View Complete Master Schedule ({allMatches.length})
              </Button>
            )}
            {(selectedTournament !== "ALL" || selectedEvent !== "ALL" || selectedSport !== "ALL") && (
              <Button variant="outline" onClick={() => { setSelectedTournament("ALL"); setSelectedEvent("ALL"); setSelectedSport("ALL"); }}>
                Reset Filters
              </Button>
            )}
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
