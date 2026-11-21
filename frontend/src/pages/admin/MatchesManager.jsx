import React, { useEffect, useState } from "react";
import { matchesApi, sportsApi, teamsApi, tournamentsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import SearchableSelect from "../../components/common/SearchableSelect";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { Calendar, Plus, Trash2, AlertTriangle, Clock, MapPin, Building, Trophy, Filter, Eye, Users, CheckCircle2, AlertCircle, X, Search, Activity } from "lucide-react";
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

  // Tab & Filters
  const [activeTab, setActiveTab] = useState("matches"); // "matches" | "venues"
  const [filterSport, setFilterSport] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterVenue, setFilterVenue] = useState("ALL");

  // Venue View States
  const [venueStatusFilter, setVenueStatusFilter] = useState("ALL"); // "ALL" | "Available" | "Booked"
  const [venueSearch, setVenueSearch] = useState("");
  const [selectedVenueForEvents, setSelectedVenueForEvents] = useState(null);
  const [venueEventsModalOpen, setVenueEventsModalOpen] = useState(false);

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

  // ── Match Filtering Logic ──
  const distinctSports = Array.from(new Set(matches.map(m => m.sport || m.sport_name).filter(Boolean)));
  const distinctCategories = Array.from(new Set(matches.map(m => m.eventCategory || m.category || (m.is_external ? "Inter-College" : "Intramural")).filter(Boolean)));
  const distinctVenues = Array.from(new Set(venues.map(v => v.name).filter(Boolean)));

  const filteredMatches = matches.filter(m => {
    const sport = m.sport || m.sport_name || "";
    const cat = m.eventCategory || m.category || (m.is_external ? "Inter-College" : "Intramural");
    const st = m.status || "Scheduled";
    const v = m.venue || m.venue_name || "";

    if (filterSport !== "ALL" && sport !== filterSport) return false;
    if (filterCategory !== "ALL" && cat !== filterCategory) return false;
    if (filterStatus !== "ALL" && st !== filterStatus) return false;
    if (filterVenue !== "ALL" && v !== filterVenue) return false;
    return true;
  });

  const isAnyFilterActive = filterSport !== "ALL" || filterCategory !== "ALL" || filterStatus !== "ALL" || filterVenue !== "ALL";

  const handleResetFilters = () => {
    setFilterSport("ALL");
    setFilterCategory("ALL");
    setFilterStatus("ALL");
    setFilterVenue("ALL");
  };

  // ── Venue Bookings & Availability Helpers ──
  const getMatchesForVenue = (v) => {
    if (!v) return [];
    const venueId = Number(v.venue_id || v.id);
    const venueName = (v.name || "").trim().toLowerCase();
    return matches.filter(m => {
      if (m.venue_id && Number(m.venue_id) === venueId) return true;
      if (m.venueId && Number(m.venueId) === venueId) return true;
      if (m.venue && (m.venue || "").trim().toLowerCase() === venueName) return true;
      if (m.venue_name && (m.venue_name || "").trim().toLowerCase() === venueName) return true;
      return false;
    });
  };

  const getVenueBookingInfo = (v) => {
    const vMatches = getMatchesForVenue(v);
    const ongoing = vMatches.filter(m => m.status === "Ongoing" || m.status === "Live");
    const scheduled = vMatches.filter(m => m.status === "Scheduled");
    const postponed = vMatches.filter(m => m.status === "Postponed");
    const completed = vMatches.filter(m => m.status === "Completed");

    const isOngoing = ongoing.length > 0;
    const isScheduled = scheduled.length > 0;
    const isBooked = isOngoing || isScheduled || v.status === "Booked" || v.status === "Occupied";

    return {
      isBooked,
      isOngoing,
      isScheduled,
      allMatches: vMatches,
      ongoingMatches: ongoing,
      scheduledMatches: scheduled,
      postponedMatches: postponed,
      completedMatches: completed,
      activeMatchCount: ongoing.length + scheduled.length,
      totalMatchCount: vMatches.length
    };
  };

  const handleOpenVenueEvents = (v) => {
    setSelectedVenueForEvents(v);
    setVenueEventsModalOpen(true);
  };

  const handleScheduleAtVenue = (v) => {
    setVenue(String(v.venue_id || v.id));
    setIsModalOpen(true);
  };

  const availableVenuesCount = venues.filter(v => !getVenueBookingInfo(v).isBooked).length;
  const bookedVenuesCount = venues.filter(v => getVenueBookingInfo(v).isBooked).length;

  const filteredVenues = venues.filter(v => {
    const booking = getVenueBookingInfo(v);
    if (venueStatusFilter === "Available" && booking.isBooked) return false;
    if (venueStatusFilter === "Booked" && !booking.isBooked) return false;
    if (venueSearch.trim()) {
      const term = venueSearch.toLowerCase();
      const nameMatches = (v.name || "").toLowerCase().includes(term);
      const locMatches = (v.location || "").toLowerCase().includes(term);
      const collegeMatches = (v.college_name || "").toLowerCase().includes(term);
      if (!nameMatches && !locMatches && !collegeMatches) return false;
    }
    return true;
  });

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="nec-page-title">Match Scheduler &amp; Venue Management</h2>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Schedule New Match
        </Button>
      </div>

      {/* ── Main View Tabs ── */}
      <div role="tablist" aria-label="Scheduler Views" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <Button
          variant={activeTab === "matches" ? "primary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={activeTab === "matches"}
          icon={Calendar}
          onClick={() => setActiveTab("matches")}
        >
          Scheduled Matches ({matches.length})
        </Button>
        <Button
          variant={activeTab === "venues" ? "primary" : "outline"}
          size="sm"
          role="tab"
          aria-selected={activeTab === "venues"}
          icon={MapPin}
          onClick={() => setActiveTab("venues")}
        >
          Venues &amp; Availability ({venues.length})
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadData} />
        </div>
      ) : activeTab === "matches" ? (
        <>
          {/* ── Dropdown Filtering Options Above Data ── */}
          <div style={{
            background: "var(--nec-surface-raised, #f8fafc)",
            border: "1px solid var(--nec-border, #e2e8f0)",
            borderRadius: "10px",
            padding: "14px 18px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "var(--nec-text-main, #1e293b)" }}>
                <Filter size={15} color="var(--nec-navy, #1e3a8a)" />
                <span>Filter Matches</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", background: "var(--nec-surface, #ffffff)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
                  Showing {filteredMatches.length} of {matches.length}
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
              gap: "12px"
            }}>
              {/* Sport Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
                  Sport
                </label>
                <select
                  value={filterSport}
                  onChange={(e) => setFilterSport(e.target.value)}
                  className="nec-form-input"
                  style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
                >
                  <option value="ALL">All Sports ({distinctSports.length})</option>
                  {distinctSports.map(sp => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              {/* Category Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="nec-form-input"
                  style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
                >
                  <option value="ALL">All Categories</option>
                  {distinctCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Status Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
                  Match Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="nec-form-input"
                  style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Ongoing">Live / Ongoing</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Postponed">Postponed</option>
                </select>
              </div>

              {/* Venue Dropdown */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted, #64748b)", marginBottom: "4px" }}>
                  Venue
                </label>
                <select
                  value={filterVenue}
                  onChange={(e) => setFilterVenue(e.target.value)}
                  className="nec-form-input"
                  style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px" }}
                >
                  <option value="ALL">All Venues ({distinctVenues.length})</option>
                  {distinctVenues.map(ven => (
                    <option key={ven} value={ven}>{ven}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Table
            columns={columns}
            data={filteredMatches}
            loading={loading}
            searchPlaceholder="Search by team, venue, sport..."
            emptyMessage={isAnyFilterActive ? "No matches match the selected filter criteria." : "No matches scheduled yet."}
          />
        </>
      ) : (
        /* ── Venues & Availability Tab ── */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Summary Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div style={{
              background: "var(--nec-surface-raised, #f8fafc)",
              border: "1px solid var(--nec-border, #e2e8f0)",
              borderRadius: "10px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(30, 58, 138, 0.1)", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={20} />
              </div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#1e293b" }}>{venues.length}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted, #64748b)" }}>Total Campus Venues</div>
              </div>
            </div>

            <div style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "10px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.18)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#059669" }}>{availableVenuesCount}</div>
                <div style={{ fontSize: "0.8rem", color: "#065f46" }}>Available for Booking</div>
              </div>
            </div>

            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "10px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.18)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#dc2626" }}>{bookedVenuesCount}</div>
                <div style={{ fontSize: "0.8rem", color: "#991b1b" }}>Booked / In-Use Venues</div>
              </div>
            </div>
          </div>

          {/* Sub-Filters & Venue Search */}
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
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button
                variant={venueStatusFilter === "ALL" ? "primary" : "outline"}
                size="sm"
                onClick={() => setVenueStatusFilter("ALL")}
              >
                All Venues ({venues.length})
              </Button>
              <Button
                variant={venueStatusFilter === "Available" ? "primary" : "outline"}
                size="sm"
                onClick={() => setVenueStatusFilter("Available")}
                style={{
                  borderColor: venueStatusFilter === "Available" ? undefined : "#10b981",
                  color: venueStatusFilter === "Available" ? undefined : "#047857"
                }}
              >
                🟢 Available ({availableVenuesCount})
              </Button>
              <Button
                variant={venueStatusFilter === "Booked" ? "primary" : "outline"}
                size="sm"
                onClick={() => setVenueStatusFilter("Booked")}
                style={{
                  borderColor: venueStatusFilter === "Booked" ? undefined : "#ef4444",
                  color: venueStatusFilter === "Booked" ? undefined : "#b91c1c"
                }}
              >
                🔴 Booked ({bookedVenuesCount})
              </Button>
            </div>

            <div style={{ position: "relative", minWidth: "240px" }}>
              <input
                type="text"
                className="nec-form-input"
                placeholder="Search venues by name or location..."
                value={venueSearch}
                onChange={(e) => setVenueSearch(e.target.value)}
                style={{ paddingLeft: "32px", fontSize: "0.825rem", width: "100%" }}
              />
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted, #64748b)" }} />
            </div>
          </div>

          {/* Venues Grid */}
          {filteredVenues.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--nec-text-muted)" }}>
              <p>No venues found matching the filter criteria.</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "14px"
            }}>
              {filteredVenues.map(v => {
                const booking = getVenueBookingInfo(v);
                return (
                  <div
                    key={v.venue_id || v.id}
                    style={{
                      background: "var(--nec-surface, #ffffff)",
                      border: booking.isOngoing
                        ? "1.5px solid #ef4444"
                        : booking.isScheduled
                        ? "1.5px solid #f59e0b"
                        : "1px solid var(--nec-border, #e2e8f0)",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: booking.isOngoing ? "rgba(239, 68, 68, 0.12)" : booking.isScheduled ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                            color: booking.isOngoing ? "#dc2626" : booking.isScheduled ? "#b45309" : "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            <MapPin size={18} />
                          </div>
                          <div>
                            <strong style={{ fontSize: "0.95rem", color: "var(--nec-text-main, #0f172a)" }}>
                              {v.name}
                            </strong>
                            <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted, #64748b)" }}>
                              📍 {v.location || "Main Campus"}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {booking.isOngoing ? (
                          <span style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            border: "1px solid #fca5a5",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap"
                          }}>
                            🔴 Live Match
                          </span>
                        ) : booking.isScheduled ? (
                          <span style={{
                            background: "#fef3c7",
                            color: "#b45309",
                            border: "1px solid #fde68a",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap"
                          }}>
                            🟡 Reserved
                          </span>
                        ) : (
                          <span style={{
                            background: "#dcfce7",
                            color: "#15803d",
                            border: "1px solid #86efac",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap"
                          }}>
                            🟢 Available
                          </span>
                        )}
                      </div>

                      {/* Specs */}
                      <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted, #64748b)", display: "flex", gap: "12px", margin: "8px 0" }}>
                        <span>👥 Capacity: <strong>{v.capacity ? v.capacity.toLocaleString() : "N/A"}</strong></span>
                        {v.college_name && <span>🏛️ {v.college_name}</span>}
                      </div>

                      {/* Booked Events Snippet */}
                      {booking.isBooked ? (
                        <div
                          onClick={() => handleOpenVenueEvents(v)}
                          style={{
                            background: booking.isOngoing ? "rgba(239, 68, 68, 0.06)" : "rgba(245, 158, 11, 0.06)",
                            border: `1px solid ${booking.isOngoing ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                            borderRadius: "8px",
                            padding: "10px 12px",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            margin: "6px 0"
                          }}
                          title="Click to view events happening inside"
                        >
                          {booking.isOngoing ? (
                            <div>
                              <div style={{ fontWeight: 700, color: "#b91c1c", display: "flex", alignItems: "center", gap: "4px" }}>
                                <Activity size={13} /> Active Now:
                              </div>
                              <div style={{ color: "#1e293b", fontWeight: 600, marginTop: "2px" }}>
                                {booking.ongoingMatches[0]?.teamA} vs {booking.ongoingMatches[0]?.teamB}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {booking.ongoingMatches[0]?.sport} • {formatDateTime(booking.ongoingMatches[0]?.date, booking.ongoingMatches[0]?.time)}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 700, color: "#92400e" }}>
                                📅 Scheduled Match:
                              </div>
                              <div style={{ color: "#1e293b", fontWeight: 600, marginTop: "2px" }}>
                                {booking.scheduledMatches[0]?.teamA} vs {booking.scheduledMatches[0]?.teamB}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {booking.scheduledMatches[0]?.sport} • {formatDateTime(booking.scheduledMatches[0]?.date, booking.scheduledMatches[0]?.time)}
                              </div>
                            </div>
                          )}

                          <div style={{ fontSize: "0.75rem", color: booking.isOngoing ? "#b91c1c" : "#92400e", fontWeight: 700, marginTop: "6px" }}>
                            🔍 Touch/Click to view all {booking.totalMatchCount} events inside →
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          background: "rgba(16, 185, 129, 0.05)",
                          border: "1px solid rgba(16, 185, 129, 0.18)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "0.8rem",
                          color: "#047857",
                          margin: "6px 0"
                        }}>
                          ✅ No active matches booked. Ready for scheduling.
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Button */}
                    <div style={{ marginTop: "4px" }}>
                      {booking.isBooked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenVenueEvents(v)}
                          style={{
                            width: "100%",
                            borderColor: booking.isOngoing ? "#ef4444" : "#f59e0b",
                            color: booking.isOngoing ? "#b91c1c" : "#92400e"
                          }}
                        >
                          View Events Happening Here ({booking.totalMatchCount})
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Plus}
                          onClick={() => handleScheduleAtVenue(v)}
                          style={{
                            width: "100%",
                            borderColor: "#10b981",
                            color: "#047857"
                          }}
                        >
                          Schedule Match Here
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Venue Bookings & Events Modal ── */}
      {selectedVenueForEvents && (
        <Modal
          isOpen={venueEventsModalOpen}
          onClose={() => setVenueEventsModalOpen(false)}
          title={`Venue Details & Booked Events: ${selectedVenueForEvents.name}`}
          size="lg"
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setVenueEventsModalOpen(false);
                  handleScheduleAtVenue(selectedVenueForEvents);
                }}
              >
                Schedule Another Match Here
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setVenueEventsModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          {(() => {
            const booking = getVenueBookingInfo(selectedVenueForEvents);
            const venueMatches = booking.allMatches;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Venue Overview Card */}
                <div style={{
                  background: "var(--nec-surface-raised, #f8fafc)",
                  border: "1px solid var(--nec-border, #e2e8f0)",
                  borderRadius: "10px",
                  padding: "16px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)" }}>
                      {selectedVenueForEvents.name}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                      📍 {selectedVenueForEvents.location || "Main Campus"} {selectedVenueForEvents.capacity ? `• 👥 Capacity: ${selectedVenueForEvents.capacity.toLocaleString()} spectators` : ""}
                    </div>
                    {selectedVenueForEvents.college_name && (
                      <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted, #64748b)", marginTop: "2px" }}>
                        🏛️ {selectedVenueForEvents.college_name}
                      </div>
                    )}
                  </div>

                  <div>
                    {booking.isOngoing ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fca5a5"
                      }}>
                        🔴 Live Match In Progress
                      </span>
                    ) : booking.isScheduled ? (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        background: "#fef3c7",
                        color: "#b45309",
                        border: "1px solid #fde68a"
                      }}>
                        🟡 Reserved / Upcoming Matches
                      </span>
                    ) : (
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        background: "#dcfce7",
                        color: "#15803d",
                        border: "1px solid #86efac"
                      }}>
                        🟢 Available for Booking
                      </span>
                    )}
                  </div>
                </div>

                {/* Live Match Alert Highlight */}
                {booking.ongoingMatches.length > 0 && (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "10px",
                    padding: "14px 16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c", fontWeight: 700, fontSize: "0.85rem", marginBottom: "8px" }}>
                      <Activity size={16} />
                      <span>HAPPENING NOW INSIDE THIS VENUE</span>
                    </div>
                    {booking.ongoingMatches.map(m => (
                      <div key={m.id || m.match_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div>
                          <strong style={{ fontSize: "1rem", color: "#1e293b" }}>
                            {m.teamA || "Team A"} ({m.deptA || "-"}) vs {m.teamB || "Team B"} ({m.deptB || "-"})
                          </strong>
                          <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "2px" }}>
                            Sport: <strong>{m.sport || m.sport_name}</strong> • Round: <strong>{m.round}</strong> • Scheduled: <strong>{formatDateTime(m.date, m.time)}</strong>
                          </div>
                        </div>
                        {m.detailScore && (
                          <div style={{ background: "#ffffff", padding: "4px 10px", borderRadius: "6px", border: "1px solid #fecaca", fontSize: "0.82rem", fontWeight: 600, color: "#991b1b" }}>
                            Score: {m.detailScore}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Events / Matches happening inside this venue */}
                <div>
                  <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: 700, color: "var(--nec-text-main, #0f172a)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={16} />
                    <span>All Matches Scheduled in this Venue ({venueMatches.length})</span>
                  </h4>

                  {venueMatches.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--nec-text-muted)", background: "var(--nec-surface-raised, #f8fafc)", borderRadius: "8px" }}>
                      <p style={{ margin: 0 }}>No matches or events have been scheduled in this venue yet.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Plus}
                        onClick={() => {
                          setVenueEventsModalOpen(false);
                          handleScheduleAtVenue(selectedVenueForEvents);
                        }}
                        style={{ marginTop: "12px" }}
                      >
                        Schedule First Match Here
                      </Button>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table className="nec-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Matchup</th>
                            <th>Sport</th>
                            <th>Date &amp; Time</th>
                            <th>Round</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {venueMatches.map(m => (
                            <tr key={m.id || m.match_id}>
                              <td>
                                <div>
                                  <strong style={{ fontSize: "0.9rem" }}>
                                    {m.teamA || "Team A"} ({m.deptA || "-"}) vs {m.teamB || "Team B"} ({m.deptB || "-"})
                                  </strong>
                                  {m.detailScore && (
                                    <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                                      {m.detailScore}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span style={{ fontWeight: 600 }}>{m.sport || m.sport_name}</span>
                              </td>
                              <td>
                                <span style={{ fontSize: "0.82rem" }}>📅 {formatDateTime(m.date, m.time)}</span>
                              </td>
                              <td>
                                <span style={{ fontSize: "0.82rem" }}>{m.round || "-"}</span>
                              </td>
                              <td>
                                <Badge status={m.status === "Ongoing" || m.status === "Live" ? "danger" : m.status === "Completed" ? "success" : m.status === "Postponed" ? "warning" : "info"}>
                                  {m.status || "Scheduled"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </Modal>
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
