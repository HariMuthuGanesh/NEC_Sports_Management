import React, { useState, useEffect, useMemo, useCallback } from "react";
import { eventsApi, sportsApi, tournamentsApi, competitionLevelsApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import CompetitionWorkspace from "./CompetitionWorkspace";
import { 
  CalendarDays, 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Trophy, 
  Users, 
  Edit, 
  Activity, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  MapPin, 
  Layers, 
  Shield, 
  X,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import "./AdminPortal.css";

const formatDeadline = (val) => {
  if (!val) return "TBD";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(val);
  }
};

const formatDateTime = (val) => {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-IN", { 
      day: "2-digit", 
      month: "short", 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch {
    return null;
  }
};

const deriveFormatSuggestion = (sportName = "", title = "", participationType = "Team") => {
  const text = `${sportName} ${title}`.toLowerCase();
  if (/100m|200m|400m|800m|1500m|relay|sprint|race|running|hurdle|swimming|swim|track/.test(text)) {
    return {
      competitionFormat: "Timed Race / Heats",
      formatStage: "Qualification + Final",
      fixtureRequirement: "Optional"
    };
  }
  if (/long jump|high jump|triple jump|shot put|discus|javelin|hammer|pole vault|throw|jump|field/.test(text)) {
    return {
      competitionFormat: "Measured Performance",
      formatStage: "Multiple Attempts",
      fixtureRequirement: "None"
    };
  }
  if (/cross country|marathon|triathlon|cycling/.test(text)) {
    return {
      competitionFormat: "Timed Race / Heats",
      formatStage: "Direct Final",
      fixtureRequirement: "None"
    };
  }
  if (/weightlifting|powerlifting|archery|shooting/.test(text)) {
    return {
      competitionFormat: "Measured Performance",
      formatStage: "Multiple Attempts",
      fixtureRequirement: "None"
    };
  }
  if (participationType === "Individual" || /badminton|table tennis|tennis|chess|carrom|squash|singles|judo|wrestling|boxing|taekwondo/.test(text)) {
    return {
      competitionFormat: "Individual Head-to-Head",
      formatStage: "Knockout",
      fixtureRequirement: "Required"
    };
  }
  return {
    competitionFormat: "Team Match",
    formatStage: "Knockout",
    fixtureRequirement: "Required"
  };
};

export default function EventsManager() {
  const toast = useToast();

  // Data State
  const [events, setEvents] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [sports, setSports] = useState([]);
  const [competitionLevels, setCompetitionLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState("ALL");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [participationFilter, setParticipationFilter] = useState("ALL");
  const [regStatusFilter, setRegStatusFilter] = useState("ALL");
  const [eventStatusFilter, setEventStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Active Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Sub-view Workspace: Active Event for Competitions
  const [activeCompetitionEvent, setActiveCompetitionEvent] = useState(null);

  // Registered-teams / entries modal
  const [teamsEvent, setTeamsEvent] = useState(null);
  const [teamsData, setTeamsData] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Initial Form Template
  const initialFormState = {
    tournamentId: "",
    name: "",
    sportId: "",
    genderCategory: "Men",
    eventCategory: "Inter-Department",
    participationType: "Team",
    competitionFormat: "Team Match",
    formatStage: "Knockout",
    fixtureRequirement: "Required",
    minPlayers: 11,
    maxPlayers: 18,
    maxTeams: 16,
    regDeadline: "",
    startTime: "",
    durationMinutes: 120,
    venue: "",
    rules: "",
    registrationStatus: "Open",
    eventStatus: "Scheduled"
  };
  const [formData, setFormData] = useState(initialFormState);

  // Load Master Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, toursRes, sportsRes, levelsRes] = await Promise.all([
        eventsApi.getEvents().catch(() => []),
        tournamentsApi.getTournaments().catch(() => []),
        sportsApi.getSports().catch(() => []),
        competitionLevelsApi.getLevels({ all: true }).catch(() => [])
      ]);

      const eventsList = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.items || []);
      const toursList = Array.isArray(toursRes) ? toursRes : (toursRes?.items || []);
      const sportsList = Array.isArray(sportsRes) ? sportsRes : (sportsRes?.items || []);
      const levelsList = Array.isArray(levelsRes) ? levelsRes : (levelsRes?.items || []);

      setEvents(eventsList);
      setTournaments(toursList);
      setSports(sportsList);
      setCompetitionLevels(levelsList);
    } catch (err) {
      setError(err.message || "Failed to load events data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Sport Change in Form - Auto Populate Squad & Format Defaults
  const handleSportSelect = (sportId) => {
    const sp = sports.find(s => String(s.sport_id) === String(sportId));
    const pType = sp?.sport_type || "Team";
    const suggested = deriveFormatSuggestion(sp?.name, formData.name, pType);
    setFormData(prev => ({
      ...prev,
      sportId,
      participationType: pType,
      competitionFormat: suggested.competitionFormat,
      formatStage: suggested.formatStage,
      fixtureRequirement: suggested.fixtureRequirement,
      minPlayers: sp?.min_players || (pType === "Individual" ? 1 : 11),
      maxPlayers: sp?.max_players || (pType === "Individual" ? 1 : 18)
    }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingEvent(null);
    const defaultTour = selectedTournamentFilter !== "ALL" 
      ? selectedTournamentFilter 
      : (tournaments[0] ? String(tournaments[0].tournament_id || tournaments[0].id) : "");
    const defaultSport = sports[0];
    const defaultPart = defaultSport?.sport_type || "Team";
    const suggested = deriveFormatSuggestion(defaultSport?.name, "", defaultPart);

    setFormData({
      ...initialFormState,
      tournamentId: defaultTour,
      sportId: defaultSport ? String(defaultSport.sport_id) : "",
      participationType: defaultPart,
      competitionFormat: suggested.competitionFormat,
      formatStage: suggested.formatStage,
      fixtureRequirement: suggested.fixtureRequirement,
      minPlayers: defaultSport?.min_players || (defaultPart === "Individual" ? 1 : 11),
      maxPlayers: defaultSport?.max_players || (defaultPart === "Individual" ? 1 : 18)
    });
    setModalError("");
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (ev) => {
    setEditingEvent(ev);
    const evId = ev.event_id || ev.id;
    let formattedStart = "";
    if (ev.start_time || ev.startTime) {
      try {
        const d = new Date(ev.start_time || ev.startTime);
        formattedStart = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch {
        formattedStart = "";
      }
    }

    const compFmt = ev.competition_format || ev.competitionFormat || "Team Match";
    const fmtStg = ev.format_stage || ev.formatStage || "Knockout";
    const fixReq = ev.fixture_requirement || ev.fixtureRequirement || (compFmt === "Measured Performance" ? "None" : "Required");

    setFormData({
      tournamentId: String(ev.tournament_id || ev.tournamentId || ""),
      name: ev.name || ev.title || "",
      sportId: String(ev.sport_id || ev.sportId || ""),
      genderCategory: ev.gender_category || ev.genderCategory || ev.category || "Men",
      eventCategory: ev.event_category || ev.eventCategory || "Inter-Department",
      participationType: ev.participation_type || ev.participationType || (ev.sportType === "Individual" ? "Individual" : "Team"),
      competitionFormat: compFmt,
      formatStage: fmtStg,
      fixtureRequirement: fixReq,
      minPlayers: ev.min_players || ev.minPlayers || 1,
      maxPlayers: ev.max_players || ev.maxPlayers || 1,
      maxTeams: ev.max_teams || ev.maxTeams || 16,
      regDeadline: ev.reg_deadline ? ev.reg_deadline.split("T")[0] : (ev.regDeadline ? ev.regDeadline.split("T")[0] : ""),
      startTime: formattedStart,
      durationMinutes: ev.duration_minutes || ev.durationMinutes || 120,
      venue: ev.venue || "",
      rules: ev.rules || "",
      registrationStatus: ev.registration_status || ev.status || "Open",
      eventStatus: ev.event_status || ev.eventStatus || "Scheduled"
    });
    setModalError("");
    setIsEditModalOpen(true);
  };

  // Handle Save (Create / Update)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formData.name.trim()) {
      setModalError("Event title is required.");
      return;
    }
    if (!formData.tournamentId) {
      setModalError("Please select a parent tournament.");
      return;
    }
    if (!formData.sportId) {
      setModalError("Please select a sport.");
      return;
    }

    const min = Number(formData.minPlayers);
    const max = Number(formData.maxPlayers);
    if (!Number.isInteger(min) || min < 1) {
      setModalError("Minimum participants per entry must be at least 1.");
      return;
    }
    if (!Number.isInteger(max) || max < min) {
      setModalError("Maximum participants per entry must be greater than or equal to minimum participants.");
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        tournament_id: Number(formData.tournamentId),
        tournamentId: Number(formData.tournamentId),
        sport_id: Number(formData.sportId),
        sportId: Number(formData.sportId),
        name: formData.name.trim(),
        title: formData.name.trim(),
        gender_category: formData.genderCategory,
        category: formData.genderCategory,
        event_category: formData.eventCategory,
        participation_type: formData.participationType,
        competition_format: formData.competitionFormat,
        competitionFormat: formData.competitionFormat,
        format_stage: formData.formatStage,
        formatStage: formData.formatStage,
        fixture_requirement: formData.fixtureRequirement,
        fixtureRequirement: formData.fixtureRequirement,
        min_players: min,
        max_players: max,
        max_teams: Number(formData.maxTeams) || 16,
        reg_deadline: formData.regDeadline ? `${formData.regDeadline} 23:59:59` : null,
        start_time: formData.startTime || null,
        duration_minutes: Number(formData.durationMinutes) || 120,
        venue: formData.venue.trim() || null,
        rules: formData.rules.trim() || null,
        registration_status: formData.registrationStatus,
        event_status: formData.eventStatus
      };

      if (editingEvent) {
        const evId = editingEvent.event_id || editingEvent.id;
        await eventsApi.updateEvent(evId, payload);
        toast.success(`Event "${formData.name}" updated successfully.`);
        setIsEditModalOpen(false);
      } else {
        await eventsApi.createEvent(payload);
        toast.success(`Event "${formData.name}" created and registration opened.`);
        setIsCreateModalOpen(false);
      }
      loadData();
    } catch (err) {
      setModalError(err.message || "Failed to save event.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle Registration Status
  const handleToggleRegistration = async (eventId, currentStatus) => {
    const isOpen = currentStatus === "Open" || currentStatus === "Registration Open";
    const nextStatus = isOpen ? "Closed" : "Open";

    // Optimistic Update
    setEvents(prev => prev.map(ev => {
      const id = ev.id || ev.event_id;
      if (id === eventId) {
        return { ...ev, status: nextStatus, registration_status: nextStatus };
      }
      return ev;
    }));

    try {
      await eventsApi.toggleEventStatus(eventId, nextStatus);
      toast.success(`Event registration ${nextStatus.toLowerCase()}!`);
    } catch (err) {
      loadData();
      toast.error("Failed to toggle registration: " + err.message);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (ev) => {
    const evId = ev.id || ev.event_id;
    if (ev.event_status === "Completed") {
      toast.error("Completed event records cannot be deleted.");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete event "${ev.name || ev.title}"?`)) return;

    try {
      await eventsApi.deleteEvent(evId);
      toast.success(`Event "${ev.name || ev.title}" deleted.`);
      loadData();
    } catch (err) {
      toast.error("Failed to delete event: " + err.message);
    }
  };

  // View Registrations Modal
  const handleOpenRegistrations = async (ev) => {
    setTeamsEvent(ev);
    setTeamsData(null);
    setTeamsLoading(true);
    const evId = ev.id || ev.event_id;
    try {
      const isIndividual = (ev.participation_type || ev.sportType || "Team") === "Individual";
      if (isIndividual) {
        const entries = await eventsApi.getEventEntries(evId);
        setTeamsData({ entries: Array.isArray(entries) ? entries : [] });
      } else {
        const res = await eventsApi.getEventTeams(evId);
        setTeamsData(res);
      }
    } catch (err) {
      toast.error("Failed to load registrations: " + err.message);
      setTeamsEvent(null);
    } finally {
      setTeamsLoading(false);
    }
  };

  // Filtered and Sorted Events
  const filteredEvents = useMemo(() => {
    let list = [...events];

    // Tournament Filter
    if (selectedTournamentFilter !== "ALL") {
      list = list.filter(e => String(e.tournament_id || e.tournamentId) === String(selectedTournamentFilter));
    }

    // Sport Filter
    if (sportFilter !== "ALL") {
      list = list.filter(e => String(e.sport_id || e.sportId) === String(sportFilter));
    }

    // Gender Category Filter
    if (genderFilter !== "ALL") {
      list = list.filter(e => (e.gender_category || e.category || "Open") === genderFilter);
    }

    // Participation Type Filter
    if (participationFilter !== "ALL") {
      list = list.filter(e => (e.participation_type || e.sportType || "Team") === participationFilter);
    }

    // Registration Status Filter
    if (regStatusFilter !== "ALL") {
      list = list.filter(e => {
        const st = e.registration_status || e.status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return regStatusFilter === "Open" ? isOpen : !isOpen;
      });
    }

    // Event Status Filter
    if (eventStatusFilter !== "ALL") {
      list = list.filter(e => (e.event_status || e.eventStatus || "Scheduled") === eventStatusFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => 
        (e.name || e.title || "").toLowerCase().includes(q) ||
        (e.sport_name || e.sportName || "").toLowerCase().includes(q) ||
        (e.tournament_name || "").toLowerCase().includes(q) ||
        (e.venue || "").toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.created_at || b.reg_deadline || 0) - new Date(a.created_at || a.reg_deadline || 0);
      }
      if (sortBy === "date_asc") {
        return new Date(a.created_at || a.reg_deadline || 0) - new Date(b.created_at || b.reg_deadline || 0);
      }
      if (sortBy === "az") {
        return (a.name || a.title || "").localeCompare(b.name || b.title || "");
      }
      if (sortBy === "za") {
        return (b.name || b.title || "").localeCompare(a.name || a.title || "");
      }
      if (sortBy === "reg_desc") {
        const aCount = a.registeredTeams || a.registeredEntries || 0;
        const bCount = b.registeredTeams || b.registeredEntries || 0;
        return bCount - aCount;
      }
      return 0;
    });

    return list;
  }, [events, selectedTournamentFilter, sportFilter, genderFilter, participationFilter, regStatusFilter, eventStatusFilter, searchQuery, sortBy]);

  // Paginated Events
  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTournamentFilter, sportFilter, genderFilter, participationFilter, regStatusFilter, eventStatusFilter, searchQuery, sortBy]);

  // KPI Metrics
  const summary = useMemo(() => {
    const total = events.length;
    const openReg = events.filter(e => ["Open", "Registration Open"].includes(e.registration_status || e.status || "Open")).length;
    const scheduled = events.filter(e => (e.event_status || "Scheduled") === "Scheduled").length;
    const ongoing = events.filter(e => (e.event_status || "") === "Ongoing").length;
    const completed = events.filter(e => (e.event_status || "") === "Completed").length;
    return { total, openReg, scheduled, ongoing, completed };
  }, [events]);

  // Table Columns Definition
  const columns = [
    {
      key: "title",
      label: "Event Name & Tournament",
      minWidth: "240px",
      render: (val, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <strong style={{ fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
            {val || row.name || "Sports Event"}
          </strong>
          {row.tournament_name && (
            <div style={{ fontSize: "0.78rem", color: "var(--nec-blue, #0274be)", display: "flex", alignItems: "center", gap: "5px" }}>
              <Trophy size={13} aria-hidden="true" />
              <span>{row.tournament_name}</span>
            </div>
          )}
          {row.venue && (
            <div style={{ fontSize: "0.74rem", color: "var(--nec-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
              <MapPin size={11} /> <span>{row.venue}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: "sportId",
      label: "Sport & Type",
      minWidth: "140px",
      render: (val, row) => {
        const sportName = row.sport_name || row.sportName || (val ? `Sport #${val}` : "General");
        const isTeam = (row.participation_type || row.sportType || "Team") === "Team";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{sportName}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
              {isTeam ? "Team Squad" : "Individual Entry"}
            </span>
          </div>
        );
      }
    },
    {
      key: "category",
      label: "Category & Tier",
      minWidth: "130px",
      render: (val, row) => {
        const cat = val || row.gender_category || row.category || "Open";
        const tier = row.event_category || row.eventCategory || "Intramural";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <Badge status={cat === "Men" ? "info" : cat === "Women" ? "warning" : cat === "Mixed" ? "live" : "neutral"}>
              {cat}
            </Badge>
            <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{tier}</span>
          </div>
        );
      }
    },
    {
      key: "competitionFormat",
      label: "Competition Format",
      minWidth: "160px",
      render: (_, row) => {
        const fmt = row.competition_format || row.competitionFormat || "Team Match";
        const stage = row.format_stage || row.formatStage || "Knockout";
        const req = row.fixture_requirement || row.fixtureRequirement || "Required";
        const badgeStatus = fmt === "Measured Performance" ? "warning" : fmt === "Timed Race / Heats" ? "live" : fmt === "Points-Based Competition" ? "info" : "neutral";
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <Badge status={badgeStatus}>{fmt}</Badge>
            <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)" }}>
              {stage} · Fixtures: {req}
            </span>
          </div>
        );
      }
    },
    {
      key: "teamsLimit",
      label: "Registrations",
      minWidth: "140px",
      render: (_, row) => {
        const isTeam = (row.participation_type || row.sportType || "Team") === "Team";
        const count = isTeam ? (row.registeredTeams ?? 0) : (row.registeredEntries ?? 0);
        const limit = row.max_teams || row.maxTeams || 16;
        const minP = row.min_players || row.minPlayers || (isTeam ? 11 : 1);
        const maxP = row.max_players || row.maxPlayers || (isTeam ? 18 : 1);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
              {count} / {limit} {isTeam ? "Teams" : "Entries"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)" }}>
              {isTeam ? `${minP}-${maxP} athletes/squad` : `${minP} athlete/entry`}
            </span>
          </div>
        );
      }
    },
    {
      key: "regDeadline",
      label: "Deadline & Schedule",
      minWidth: "160px",
      render: (val, row) => {
        const deadline = formatDeadline(val || row.reg_deadline);
        const start = formatDateTime(row.start_time || row.startTime);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "5px" }}>
              <CalendarDays size={14} color="var(--nec-blue)" /> {deadline}
            </span>
            {start && (
              <span style={{ fontSize: "0.74rem", color: "var(--nec-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={12} /> Starts: {start}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: "status",
      label: "Reg Status",
      width: "110px",
      render: (val, row) => {
        const st = val || row.registration_status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return (
          <Badge status={isOpen ? "success" : "neutral"}>
            {isOpen ? "Open" : "Closed"}
          </Badge>
        );
      }
    },
    {
      key: "eventStatus",
      label: "Event Status",
      width: "110px",
      render: (val, row) => {
        const st = val || row.event_status || "Scheduled";
        return (
          <Badge status={st === "Ongoing" ? "live" : st === "Completed" ? "success" : "info"}>
            {st}
          </Badge>
        );
      }
    },
    {
      key: "actions",
      label: "Event Actions",
      minWidth: "300px",
      className: "nec-events-actions-col",
      sortable: false,
      render: (_, row) => {
        const eventId = row.id || row.event_id;
        const st = row.status || row.registration_status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Launch Workspace */}
            <Button
              variant="primary"
              size="sm"
              icon={CalendarDays}
              onClick={() => setActiveCompetitionEvent(row)}
              title={
                (row.competition_format || row.competitionFormat) === "Measured Performance"
                  ? "Manage attempts, measurements and results for this event"
                  : (row.competition_format || row.competitionFormat) === "Timed Race / Heats"
                    ? "Manage heats, rounds and qualifiers for this race"
                    : "Manage fixtures, team matches and results for this event"
              }
            >
              {(row.competition_format || row.competitionFormat) === "Measured Performance"
                ? "Performances"
                : (row.competition_format || row.competitionFormat) === "Timed Race / Heats"
                  ? "Heats & Rounds"
                  : "Fixtures"}
            </Button>

            {/* View Registered Teams / Participants */}
            <Button
              variant="ghost"
              size="sm"
              icon={Users}
              onClick={() => handleOpenRegistrations(row)}
              title="View registered squads or individual participants"
            >
              Entries
            </Button>

            {/* Quick Toggle Registration Status */}
            <Button
              variant={isOpen ? "outline" : "secondary"}
              size="sm"
              icon={isOpen ? ToggleRight : ToggleLeft}
              onClick={() => handleToggleRegistration(eventId, st)}
              title={isOpen ? "Close registration for this event" : "Open registration for this event"}
            >
              {isOpen ? "Close Reg" : "Open Reg"}
            </Button>

            {/* Edit Event Details */}
            <Button
              variant="outline"
              size="sm"
              icon={Edit}
              onClick={() => openEditModal(row)}
              title="Edit Event Details"
              ariaLabel="Edit Event"
            />

            {/* Delete Event */}
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => handleDeleteEvent(row)}
              title="Delete Event"
              ariaLabel="Delete Event"
            />
          </div>
        );
      }
    }
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER: Active Competition Workspace Overlay / Sub-view
  // ─────────────────────────────────────────────────────────────
  if (activeCompetitionEvent) {
    const tourId = activeCompetitionEvent.tournament_id || activeCompetitionEvent.tournamentId;
    const evId = activeCompetitionEvent.event_id || activeCompetitionEvent.id;

    return (
      <div className="nec-portal-page" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--nec-card-bg, #fff)", padding: "14px 20px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveCompetitionEvent(null)}
            >
              Back to Events
            </Button>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                {activeCompetitionEvent.tournament_name || "Tournament Event"}
              </div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--nec-text-main)" }}>
                {activeCompetitionEvent.name || activeCompetitionEvent.title} · Fixtures & Results
              </h2>
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            icon={X} 
            onClick={() => setActiveCompetitionEvent(null)}
          >
            Close Workspace
          </Button>
        </div>

        <div style={{ background: "var(--nec-surface, #fff)", borderRadius: "12px", border: "1px solid var(--nec-border, #e2e8f0)", padding: "20px" }}>
          <CompetitionWorkspace 
            tournamentId={tourId} 
            defaultEventId={evId} 
            onClose={() => setActiveCompetitionEvent(null)} 
          />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Main Global Events Page
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="nec-portal-page nec-events-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 className="nec-page-title">Events Management</h2>
          <p className="nec-page-desc" style={{ margin: "4px 0 0 0", color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>
            Create and coordinate tournament events, set squad limits, control registration deadlines, and schedule competition rounds.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreateModal}>
          Create Event
        </Button>
      </div>

      {/* KPI Overview Chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--nec-card-bg, #fff)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Total Events</span>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--nec-text-main)", marginTop: "4px" }}>
            {summary.total}
          </div>
        </div>
        <div style={{ background: "var(--nec-card-bg, #fff)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Registration Open</span>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>
            {summary.openReg}
          </div>
        </div>
        <div style={{ background: "var(--nec-card-bg, #fff)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Scheduled</span>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--nec-blue, #0274be)", marginTop: "4px" }}>
            {summary.scheduled}
          </div>
        </div>
        <div style={{ background: "var(--nec-card-bg, #fff)", padding: "14px 18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Ongoing / Completed</span>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#8b5cf6", marginTop: "4px" }}>
            {summary.ongoing + summary.completed}
          </div>
        </div>
      </div>

      {/* Primary Filters Toolbar */}
      <div style={{ background: "var(--nec-card-bg, #fff)", padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Prominent Tournament Filter */}
          <div style={{ minWidth: "220px", flex: "1 1 220px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--nec-blue, #0274be)", marginBottom: "4px" }}>
              Filter by Tournament
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, padding: "7px 12px", fontWeight: 600 }}
              value={selectedTournamentFilter}
              onChange={(e) => setSelectedTournamentFilter(e.target.value)}
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map(t => (
                <option key={t.tournament_id || t.id} value={String(t.tournament_id || t.id)}>
                  {t.name || t.title} ({t.academicYear || t.academic_year || "Current"})
                </option>
              ))}
            </select>
          </div>

          {/* Sport Filter */}
          <div style={{ minWidth: "160px", flex: "1 1 160px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted)", marginBottom: "4px" }}>
              Sport
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, padding: "7px 12px" }}
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
            >
              <option value="ALL">All Sports</option>
              {sports.map(s => (
                <option key={s.sport_id} value={String(s.sport_id)}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Gender Category Filter */}
          <div style={{ minWidth: "130px", flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted)", marginBottom: "4px" }}>
              Gender
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, padding: "7px 12px" }}
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Mixed">Mixed</option>
              <option value="Open">Open</option>
            </select>
          </div>

          {/* Participation Type Filter */}
          <div style={{ minWidth: "140px", flex: "1 1 140px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted)", marginBottom: "4px" }}>
              Participation
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, padding: "7px 12px" }}
              value={participationFilter}
              onChange={(e) => setParticipationFilter(e.target.value)}
            >
              <option value="ALL">All Types</option>
              <option value="Team">Team Squad</option>
              <option value="Individual">Individual Entry</option>
            </select>
          </div>

          {/* Registration Status Filter */}
          <div style={{ minWidth: "130px", flex: "1 1 130px" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--nec-text-muted)", marginBottom: "4px" }}>
              Registration
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, padding: "7px 12px" }}
              value={regStatusFilter}
              onChange={(e) => setRegStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--nec-border, #f1f5f9)", paddingTop: "12px" }}>
          <div style={{ position: "relative", flex: "2 1 260px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
            <input
              type="text"
              className="nec-table-search-input"
              style={{ paddingLeft: "32px", width: "100%", margin: 0 }}
              placeholder="Search by event title, sport, tournament, or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 200px" }}>
            <ArrowUpDown size={15} style={{ color: "var(--nec-text-muted)" }} />
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, padding: "7px 12px" }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">Deadline (Newest first)</option>
              <option value="date_asc">Deadline (Oldest first)</option>
              <option value="az">Event Name (A to Z)</option>
              <option value="za">Event Name (Z to A)</option>
              <option value="reg_desc">Most Registered Entries</option>
            </select>
          </div>

          {(selectedTournamentFilter !== "ALL" || sportFilter !== "ALL" || genderFilter !== "ALL" || participationFilter !== "ALL" || regStatusFilter !== "ALL" || searchQuery.trim()) && (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              onClick={() => {
                setSelectedTournamentFilter("ALL");
                setSportFilter("ALL");
                setGenderFilter("ALL");
                setParticipationFilter("ALL");
                setRegStatusFilter("ALL");
                setEventStatusFilter("ALL");
                setSearchQuery("");
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Events Table */}
      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState message={error} onRetry={loadData} />
        </div>
      ) : (
        <div style={{ background: "var(--nec-card-bg, #fff)", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", overflow: "hidden" }}>
          <Table
            className="nec-events-table"
            columns={columns}
            data={paginatedEvents}
            loading={loading && events.length === 0}
            emptyMessage={
              filteredEvents.length === 0 && !loading
                ? "No sports events matched your filter criteria. Try adjusting the tournament or search query."
                : "No events recorded yet."
            }
          />

          {/* Pagination Controls */}
          {filteredEvents.length > pageSize && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--nec-border, #e2e8f0)", fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of <strong>{filteredEvents.length}</strong> events
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Registrations View (Teams or Individual Entries)
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={!!teamsEvent}
        onClose={() => setTeamsEvent(null)}
        title={`Registrations: ${teamsEvent?.name || teamsEvent?.title || ""}`}
        size="lg"
      >
        {teamsLoading && (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--nec-text-muted)" }}>
            Loading registrations...
          </div>
        )}

        {!teamsLoading && teamsData?.entries && (
          <Table
            columns={[
              { key: "student_name", label: "Student Athlete", render: (v) => <strong>{v}</strong> },
              { key: "register_number", label: "Register No.", render: (v) => <code>{v}</code> },
              { key: "department_code", label: "Dept", width: "90px", render: (v) => <Badge status="info">{v || "-"}</Badge> },
              { key: "category_name", label: "Category", render: (v) => v || "Open" }
            ]}
            data={teamsData.entries}
            emptyMessage="No individual student athletes have registered for this event yet."
          />
        )}

        {!teamsLoading && teamsData?.teams && (
          <>
            <div style={{ fontSize: "0.85rem", marginBottom: "12px", color: "var(--nec-text-muted)" }}>
              Total: <strong>{teamsData.summary?.total || teamsData.teams.length}</strong> team(s) 
              ({teamsData.summary?.approved || 0} approved, {teamsData.summary?.pending || 0} pending)
            </div>
            <Table
              columns={[
                { key: "name", label: "Team Name", render: (v) => <strong>{v}</strong> },
                { key: "department_code", label: "Dept", width: "90px", render: (v) => <Badge status="info">{v || "-"}</Badge> },
                { 
                  key: "status", 
                  label: "Status", 
                  width: "120px", 
                  render: (v) => <Badge status={v === "Approved" ? "success" : v === "Disqualified" ? "danger" : "warning"}>{v || "Pending"}</Badge> 
                },
                { key: "playerCount", label: "Roster Size", width: "110px", render: (v) => <span>{v || 0} Athletes</span> },
                { key: "fixtureCount", label: "Fixtures", width: "90px" }
              ]}
              data={teamsData.teams}
              emptyMessage="No department teams have registered for this event yet."
            />
          </>
        )}
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: Create / Edit Event Form
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setModalError("");
        }}
        title={editingEvent ? `Edit Event: ${editingEvent.name || editingEvent.title}` : "Create New Sports Event"}
        size="lg"
      >
        <form onSubmit={handleSaveEvent} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {modalError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} />
              <span>{modalError}</span>
            </div>
          )}

          {/* Tournament Selection (Required) */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
              Tournament <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0 }}
              value={formData.tournamentId}
              onChange={(e) => setFormData(prev => ({ ...prev, tournamentId: e.target.value }))}
              required
            >
              <option value="">-- Select Parent Tournament --</option>
              {tournaments.map(t => (
                <option key={t.tournament_id || t.id} value={String(t.tournament_id || t.id)}>
                  {t.name || t.title} ({t.academicYear || t.academic_year || "Current"})
                </option>
              ))}
            </select>
          </div>

          {/* Event Title */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
              Event Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0 }}
              placeholder="e.g. Men's 100m Sprint, Basketball 5v5 Championship, Women's Badminton Singles"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              maxLength={255}
            />
          </div>

          {/* Sport & Gender Category Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Sport <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.sportId}
                onChange={(e) => handleSportSelect(e.target.value)}
                required
              >
                <option value="">-- Select Sport --</option>
                {sports.map(sp => (
                  <option key={sp.sport_id} value={String(sp.sport_id)}>
                    {sp.name} ({sp.sport_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Gender Category
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.genderCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, genderCategory: e.target.value }))}
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Mixed">Mixed</option>
                <option value="Open">Open</option>
              </select>
            </div>
          </div>

          {/* Participation Type & Event Category Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Participation Format
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.participationType}
                onChange={(e) => {
                  const pType = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    participationType: pType,
                    minPlayers: pType === "Individual" ? 1 : Math.max(2, prev.minPlayers),
                    maxPlayers: pType === "Individual" ? 1 : Math.max(2, prev.maxPlayers)
                  }));
                }}
              >
                <option value="Team">Team Squad</option>
                <option value="Individual">Individual Entry</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Event Tier / Category
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.eventCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, eventCategory: e.target.value }))}
              >
                <option value="Inter-Department">Inter-Department</option>
                <option value="Inter-College">Inter-College</option>
                <option value="Zonal">Zonal</option>
                <option value="State">State</option>
                <option value="National">National</option>
              </select>
            </div>
          </div>

          {/* Competition Format & Scheduling Architecture */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={15} color="var(--nec-blue, #0274be)" />
              <span>Competition Architecture & Scheduling</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "4px" }}>
                  Competition Format
                </label>
                <select
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={formData.competitionFormat}
                  onChange={(e) => {
                    const fmt = e.target.value;
                    let defReq = "Required";
                    let defStage = formData.formatStage;
                    if (fmt === "Measured Performance") {
                      defReq = "None";
                      defStage = "Multiple Attempts";
                    } else if (fmt === "Timed Race / Heats") {
                      defReq = "Optional";
                      defStage = "Qualification + Final";
                    } else if (fmt === "Single Final") {
                      defReq = "None";
                      defStage = "Direct Final";
                    }
                    setFormData(prev => ({
                      ...prev,
                      competitionFormat: fmt,
                      fixtureRequirement: defReq,
                      formatStage: defStage
                    }));
                  }}
                >
                  <option value="Team Match">Team Match</option>
                  <option value="Individual Head-to-Head">Individual Head-to-Head</option>
                  <option value="Timed Race / Heats">Timed Race / Heats</option>
                  <option value="Measured Performance">Measured Performance</option>
                  <option value="Points-Based Competition">Points-Based Competition</option>
                  <option value="Single Final">Single Final</option>
                  <option value="Multi-Round Competition">Multi-Round Competition</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "4px" }}>
                  Format Stage
                </label>
                <select
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={formData.formatStage}
                  onChange={(e) => setFormData(prev => ({ ...prev, formatStage: e.target.value }))}
                >
                  <option value="Knockout">Knockout</option>
                  <option value="Round Robin / League">Round Robin / League</option>
                  <option value="Group Stage">Group Stage</option>
                  <option value="Qualification + Final">Qualification + Final</option>
                  <option value="Multiple Attempts">Multiple Attempts</option>
                  <option value="Direct Final">Direct Final</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "4px" }}>
                  Fixture Requirement
                </label>
                <select
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={formData.fixtureRequirement}
                  onChange={(e) => setFormData(prev => ({ ...prev, fixtureRequirement: e.target.value }))}
                >
                  <option value="Required">Required (Fixtures must be scheduled)</option>
                  <option value="Optional">Optional (Heats / rounds or direct)</option>
                  <option value="None">None (Direct participant performances)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Squad Roster Configuration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Min Athletes/Entry <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.minPlayers}
                onChange={(e) => setFormData(prev => ({ ...prev, minPlayers: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Max Athletes/Entry <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="number"
                min={formData.minPlayers || 1}
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.maxPlayers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                {formData.participationType === "Individual" ? "Max Entries" : "Max Teams Limit"}
              </label>
              <input
                type="number"
                min="2"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.maxTeams}
                onChange={(e) => setFormData(prev => ({ ...prev, maxTeams: e.target.value }))}
              />
            </div>
          </div>

          {/* Registration Deadline & Start Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Registration Deadline
              </label>
              <input
                type="date"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.regDeadline}
                onChange={(e) => setFormData(prev => ({ ...prev, regDeadline: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Event Start Date & Time
              </label>
              <input
                type="datetime-local"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Venue & Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Event Venue / Ground
              </label>
              <input
                type="text"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                placeholder="e.g. Football Ground 1, Indoor Stadium Court A"
                value={formData.venue}
                onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Est. Duration (Mins)
              </label>
              <input
                type="number"
                min="10"
                max="1440"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.durationMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
              />
            </div>
          </div>

          {/* Event Status & Registration Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Registration Status
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.registrationStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationStatus: e.target.value }))}
              >
                <option value="Open">Open for Registration</option>
                <option value="Closed">Registration Closed</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
                Event Status
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={formData.eventStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, eventStatus: e.target.value }))}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Rules & Eligibility Guidelines */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px" }}>
              Event Rules & Instructions
            </label>
            <textarea
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, minHeight: "70px", fontFamily: "inherit" }}
              placeholder="e.g. Standard 11v11 FIFA rules, rolling substitutions permitted, players must wear proper sports kits..."
              value={formData.rules}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={modalSubmitting}>
              {editingEvent ? "Save Event Changes" : "Create Event & Publish"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
