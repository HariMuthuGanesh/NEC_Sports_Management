import React, { useEffect, useState } from "react";
import { matchesApi, sportsApi, teamsApi, tournamentsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import SearchableSelect from "../../components/common/SearchableSelect";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { Calendar, Plus, Trash2, AlertTriangle, Clock } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import "./AdminPortal.css";

export default function MatchesManager() {
  const [matches, setMatches] = useState([]);
  const [venues, setVenues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const [sports, setSports] = useState([]);
  // Selections are IDs (not names) so the value always matches an option.
  const [sportId, setSportId] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [venue, setVenue] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("10:00");
  // Round values must match DB ENUM: League | Quarter-Final | Semi-Final | Final
  const [round, setRound] = useState("League");

  useEffect(() => {
    loadData(false);

    // Auto-refresh match statuses every 15 seconds
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        loadData(true);
      }
    }, 15000);

    const handleFocus = () => {
      if (!document.hidden) loadData(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const loadData = (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    Promise.all([
      matchesApi.getMatches().catch(err => { console.warn("[MatchesManager] Failed to fetch matches:", err); return []; }),
      sportsApi.getVenues().catch(err => { console.warn("[MatchesManager] Failed to fetch venues:", err); return []; }),
      teamsApi.getTeams().catch(err => { console.warn("[MatchesManager] Failed to fetch teams:", err); return []; }),
      tournamentsApi.getTournaments().catch(err => { console.warn("[MatchesManager] Failed to fetch tournaments:", err); return []; }),
      sportsApi.getSports().catch(err => { console.warn("[MatchesManager] Failed to fetch sports:", err); return []; })
    ]).then(([mList = [], vList = [], tList = [], tourList = [], spList = []]) => {
      const safeMatches = Array.isArray(mList) ? mList : [];
      const safeVenues = Array.isArray(vList) ? vList : [];
      const safeTeams = Array.isArray(tList) ? tList : [];
      const safeTournaments = Array.isArray(tourList) ? tourList : [];

      setMatches(safeMatches);
      setVenues(safeVenues);
      setTeams(safeTeams);
      setTournaments(safeTournaments);
      const safeSports = (Array.isArray(spList) ? spList : []).filter(sp => (sp.sport_type || "Team") === "Team");
      setSports(safeSports);
      if (!isBackground) {
        if (safeSports.length > 0 && !sportId) setSportId(String(safeSports[0].sport_id || safeSports[0].id));
        if (safeVenues.length > 0) setVenue(String(safeVenues[0].venue_id || safeVenues[0].id));
        if (safeTournaments.length > 0) setTournamentId(String(safeTournaments[0].id || safeTournaments[0].tournament_id));
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      if (!isBackground) setError(err.message);
      setLoading(false);
    });
  };

  // Approved teams of the selected sport only; pending/disqualified teams cannot be scheduled.
  const eligibleTeams = teams.filter(t => String(t.sportId ?? t.sport_id) === String(sportId) && t.status === "Approved");

  // Keep team choices valid when the sport changes.
  // Runs when the sport changes or the modal opens, not on background refreshes,
  // so an admin's in-progress choice is never overwritten.
  useEffect(() => {
    const ids = eligibleTeams.map(t => String(t.team_id ?? t.id));
    const a = ids.includes(teamA) ? teamA : (ids[0] || "");
    const b = ids.includes(teamB) && teamB !== a ? teamB : (ids.find(id => id !== a) || "");
    setTeamA(a);
    setTeamB(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportId, isModalOpen]);

  const handleSchedule = (e) => {
    e.preventDefault();
    setScheduleError("");
    if (!sportId || !teamA || !teamB || !venue) {
      setScheduleError("Please select a Sport, Team A, Team B, and a Venue.");
      return;
    }
    if (teamA === teamB) {
      setScheduleError("Team A and Team B must be different.");
      return;
    }
    if (!tournamentId) {
      setScheduleError("Please select a Tournament.");
      return;
    }

    matchesApi.scheduleMatch({
      sport_id: Number(sportId),
      team_a_id: Number(teamA),
      team_b_id: Number(teamB),
      venue_id: Number(venue),
      date,
      time,
      round,
      tournament_id: Number(tournamentId)
    }).then(() => {
      setIsModalOpen(false);
      setScheduleError("");
      loadData();
    }).catch(err => {
      setScheduleError(err.message || "Failed to schedule match.");
    });
  };

  const toastContext = useToast();
  const toast = toastContext?.toast || toastContext;

  const handleDeleteMatch = (matchId) => {
    matchesApi.deleteMatch(matchId).then(() => {
      loadData();
    });
  };

  const handleUpdateStatus = async (matchId, newStatus) => {
    const prevMatches = [...matches];
    setMatches(prev => prev.map(m => (m.id === matchId || m.match_id === matchId ? { ...m, status: newStatus } : m)));
    try {
      await matchesApi.updateMatchStatus(matchId, newStatus);
      if (toast?.success) {
        toast.success(`Match marked as ${newStatus}`);
      } else if (typeof toast === "function") {
        toast({ type: "success", message: `Match marked as ${newStatus}` });
      }
    } catch (err) {
      setMatches(prevMatches);
      if (toast?.error) {
        toast.error(err.message || "Failed to update match status");
      } else if (typeof toast === "function") {
        toast({ type: "error", message: err.message || "Failed to update match status" });
      }
    }
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
      const hasSpecificTime = timeVal && timeVal !== "--:--";
      if (hasSpecificTime) {
        return `${formattedDate} • ${timeVal}`;
      }
      if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
        const formattedTime = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        return `${formattedDate} • ${formattedTime}`;
      }
      return formattedDate;
    } catch {
      return String(dateVal);
    }
  };

  const columns = [
    { key: "sport", label: "Sport", width: "120px", render: (val) => <strong>{val || "-"}</strong> },
    { key: "eventCategory", label: "Category", width: "120px", render: (val) => <Badge status={val === "Inter-College" ? "danger" : "info"}>{val || "Intramural"}</Badge> },
    { key: "matchup", label: "Match Teams", render: (_, row) => <span>{row.teamA || "Team A"} ({row.deptA || "-"}) vs {row.teamB || "Team B"} ({row.deptB || "-"})</span> },
    { key: "schedule", label: "Date & Time", width: "190px", render: (_, row) => <span>📅 {formatDateTime(row.date, row.time)}</span> },
    { key: "venue", label: "Venue", width: "190px", render: (val) => <span>📍 {val || "TBD"}</span> },
    { key: "round", label: "Round", width: "120px" },
    {
      key: "status",
      label: "Status",
      width: "150px",
      render: (val, row) => (
        <select
          value={val || "Scheduled"}
          onChange={(e) => handleUpdateStatus(row.id || row.match_id, e.target.value)}
          aria-label="Change Match Status"
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid var(--nec-border)",
            fontSize: "0.8rem",
            fontWeight: 600,
            background: val === "Live" || val === "Ongoing" ? "#dcfce7" : val === "Completed" ? "#ecfdf5" : val === "Postponed" ? "#fffbeb" : "#f1f5f9",
            color: val === "Live" || val === "Ongoing" ? "#15803d" : val === "Completed" ? "#047857" : val === "Postponed" ? "#b45309" : "#475569",
            cursor: "pointer"
          }}
        >
          <option value="Scheduled">Scheduled</option>
          <option value="Ongoing">Live / Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Postponed">Postponed</option>
        </select>
      )
    },
    {
      key: "actions",
      label: "Actions",
      width: "150px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {row.status !== "Postponed" ? (
            <Button
              variant="outline"
              size="sm"
              icon={Clock}
              onClick={() => handleUpdateStatus(row.id || row.match_id, "Postponed")}
            >
              Postpone
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={Calendar}
              onClick={() => handleUpdateStatus(row.id || row.match_id, "Scheduled")}
            >
              Resume
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => handleDeleteMatch(row.id || row.match_id)}
            title="Cancel Match Fixture"
            ariaLabel="Cancel Match Fixture"
          />
        </div>
      )
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Match Scheduler & Venue Management</h2>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Schedule New Match
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadData} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={matches}
          loading={loading}
          searchPlaceholder="Search by team, venue, sport..."
          emptyMessage="No matches scheduled yet."
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setScheduleError(""); }}
        title="Schedule Match & Assign Venue"
        size="lg"
      >
        <form onSubmit={handleSchedule} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Tournament: required FK */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Tournament *</label>
            <SearchableSelect
              options={tournaments}
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              getValue={(t) => String(t.id || t.tournament_id)}
              getLabel={(t) => t.title || t.name || ""}
              getSearchText={(t) => `${t.title || t.name || ""} ${t.event_category || t.category || ""}`}
              placeholder="-- Select Tournament --"
              searchPlaceholder="Search tournament..."
              required
            />
          </div>

          {/* Sport */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport</label>
            <SearchableSelect
              options={sports}
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
              getValue={(sp) => String(sp.sport_id ?? sp.id)}
              getLabel={(sp) => sp.name}
              placeholder="-- Select Sport --"
              searchPlaceholder="Search sport..."
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Team A *</label>
              <SearchableSelect
                options={eligibleTeams}
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                getValue={(t) => String(t.team_id ?? t.id)}
                getLabel={(t) => t.name}
                getSearchText={(t) => `${t.name} ${t.deptCode || t.dept_code || ""} ${t.sportName || t.sport || ""}`}
                placeholder={eligibleTeams.length ? "-- Select Team --" : "No approved teams for this sport"}
                searchPlaceholder="Search team, dept, or sport..."
                required
                renderOption={(t) => (
                  <div className="nec-select-team-option">
                    <span className="nec-select-team-name">{t.name}</span>
                    <div className="nec-select-chips">
                      {(t.deptCode || t.dept_code) && (
                        <span className="nec-chip nec-chip-dept">{t.deptCode || t.dept_code}</span>
                      )}
                      {(t.sportName || t.sport) && (
                        <span className="nec-chip nec-chip-sport">{t.sportName || t.sport}</span>
                      )}
                    </div>
                  </div>
                )}
                renderSelected={(t) => (
                  <div className="nec-select-selected-wrap">
                    <span>{t.name}</span>
                    {(t.deptCode || t.dept_code) && (
                      <span className="nec-chip nec-chip-dept">{t.deptCode || t.dept_code}</span>
                    )}
                  </div>
                )}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Team B *</label>
              <SearchableSelect
                options={eligibleTeams}
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                getValue={(t) => String(t.team_id ?? t.id)}
                getLabel={(t) => t.name}
                getSearchText={(t) => `${t.name} ${t.deptCode || t.dept_code || ""} ${t.sportName || t.sport || ""}`}
                placeholder={eligibleTeams.length ? "-- Select Team --" : "No approved teams for this sport"}
                searchPlaceholder="Search team, dept, or sport..."
                required
                renderOption={(t) => (
                  <div className="nec-select-team-option">
                    <span className="nec-select-team-name">{t.name}</span>
                    <div className="nec-select-chips">
                      {(t.deptCode || t.dept_code) && (
                        <span className="nec-chip nec-chip-dept">{t.deptCode || t.dept_code}</span>
                      )}
                      {(t.sportName || t.sport) && (
                        <span className="nec-chip nec-chip-sport">{t.sportName || t.sport}</span>
                      )}
                    </div>
                  </div>
                )}
                renderSelected={(t) => (
                  <div className="nec-select-selected-wrap">
                    <span>{t.name}</span>
                    {(t.deptCode || t.dept_code) && (
                      <span className="nec-chip nec-chip-dept">{t.deptCode || t.dept_code}</span>
                    )}
                  </div>
                )}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Official Campus Venue *</label>
            <SearchableSelect
              options={venues}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              getValue={(v) => String(v.venue_id ?? v.id)}
              getLabel={(v) => v.name}
              getSearchText={(v) => `${v.name} ${v.type || ""} ${v.location || ""}`}
              placeholder="-- Select Venue --"
              searchPlaceholder="Search venue..."
              required
              renderOption={(v) => (
                <div className="nec-select-venue-option">
                  <span className="nec-select-team-name">{v.name}</span>
                  {v.type && <span className="nec-chip nec-chip-venue">{v.type}</span>}
                </div>
              )}
              renderSelected={(v) => (
                <div className="nec-select-selected-wrap">
                  <span>{v.name}</span>
                  {v.type && <span className="nec-chip nec-chip-venue">{v.type}</span>}
                </div>
              )}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Date *</label>
              <input
                type="date"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Start Time</label>
              <input
                type="time"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div>
              {/* Round must match DB ENUM: League | Quarter-Final | Semi-Final | Final */}
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Round</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={round}
                onChange={(e) => setRound(e.target.value)}
              >
                {["League", "Quarter-Final", "Semi-Final", "Final"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error banner */}
          {scheduleError && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--nec-danger-bg)", border: "1px solid var(--nec-danger)", color: "var(--nec-danger-text)", padding: "10px 14px", borderRadius: "var(--nec-radius-md)", fontSize: "0.8125rem" }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, color: "var(--nec-danger)" }} />
              <span>{scheduleError}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button variant="outline" onClick={() => { setIsModalOpen(false); setScheduleError(""); }}>Cancel</Button>
            <Button type="submit" variant="primary">Confirm Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
