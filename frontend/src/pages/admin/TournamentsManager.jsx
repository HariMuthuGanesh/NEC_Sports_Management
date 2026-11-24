import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  tournamentsApi, 
  eventsApi,
  sportsApi, 
  matchesApi,
  competitionLevelsApi 
} from "../../services/api/apiServices";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import Table from "../../components/common/Table";
import ErrorState from "../../components/common/ErrorState";
import CompetitionWorkspace from "./CompetitionWorkspace";
import { 
  Plus, 
  Calendar, 
  Trophy, 
  Shield, 
  Users, 
  User,
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft,
  Edit,
  Trash2,
  Award,
  Search,
  ArrowUpDown,
  Filter,
  X,
  FileText,
  Activity,
  Layers,
  Check,
  Play,
  RotateCcw
} from "lucide-react";
import "./AdminPortal.css";
import "./TournamentsManager.css";
import { formatScope } from "../../utils/scopeLabels";

const getInitialTournamentForm = () => {
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 86400000);
  return {
    title: "",
    academicYear: `${now.getFullYear()}-${now.getFullYear() + 1}`,
    levelId: "",
    tier: "Intramural",
    scope: "Intramural",
    startDate: now.toISOString().split("T")[0],
    endDate: nextWeek.toISOString().split("T")[0],
    organizer: "Physical Education Department & Sports Directorate",
    venue: "",
    description: "",
    rules: "",
    status: "Upcoming"
  };
};

export default function TournamentsManager() {
  const { t } = useAuth();
  const toast = useToast();

  // Tournament Listing States
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Selected Tournament & Workspace Tab State
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState("events"); // 'events' (default) | 'overview' | 'registrations' | 'schedule'

  // Workspace Data States
  const [workspaceEvents, setWorkspaceEvents] = useState([]);
  const [workspaceRegistrations, setWorkspaceRegistrations] = useState({ teams: [], individuals: [], totalEntries: 0 });
  const [workspaceSchedule, setWorkspaceSchedule] = useState({ matches: [], competitions: [], totalItems: 0 });
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewRegistrationsEvent, setViewRegistrationsEvent] = useState(null);
  const [viewRegistrationsData, setViewRegistrationsData] = useState(null);
  const [viewRegistrationsLoading, setViewRegistrationsLoading] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  // Sub-view: Active Event for Event Workspace within Tournament
  const [activeEventForWorkspace, setActiveEventForWorkspace] = useState(null);

  // Reference Data
  const [competitionLevels, setCompetitionLevels] = useState([]);
  const [sports, setSports] = useState([]);
  const [venues, setVenues] = useState([]);

  // Form States
  const [tournamentForm, setTournamentForm] = useState(getInitialTournamentForm);

  const initialEventForm = {
    name: "",
    sportId: "",
    genderCategory: "Men",
    eventCategory: "Inter-Department",
    participationType: "Team",
    minPlayers: 11,
    maxPlayers: 18,
    maxTeams: 16,
    regDeadline: "",
    startTime: "",
    endTime: "",
    durationMinutes: 120,
    venue: "",
    rules: "",
    registrationStatus: "Open",
    eventStatus: "Scheduled"
  };
  const [eventForm, setEventForm] = useState(initialEventForm);

  // Load Initial Master Data
  useEffect(() => {
    loadTournaments();
    loadReferenceData();
  }, []);

  const loadReferenceData = async () => {
    try {
      const [levelsRes, sportsRes, venuesRes] = await Promise.all([
        competitionLevelsApi.getLevels({ all: true }).catch(() => []),
        sportsApi.getSports().catch(() => []),
        sportsApi.getVenues().catch(() => [])
      ]);
      setCompetitionLevels(Array.isArray(levelsRes) ? levelsRes : (levelsRes?.items || []));
      setSports(Array.isArray(sportsRes) ? sportsRes : (sportsRes?.items || []));
      setVenues(Array.isArray(venuesRes) ? venuesRes : []);
    } catch (err) {
      console.warn("Failed to load reference data", err);
    }
  };

  const loadTournaments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await tournamentsApi.getTournaments();
      setTournaments(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      setError(err.message || "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  // Load Tournament Workspace Data
  const loadWorkspaceData = useCallback(async (tourId) => {
    if (!tourId) return;
    setWorkspaceLoading(true);
    try {
      const [tourDetails, eventsRes, regRes, schedRes] = await Promise.all([
        tournamentsApi.getTournamentById(tourId).catch(() => null),
        tournamentsApi.getTournamentEvents(tourId).catch(() => []),
        tournamentsApi.getTournamentRegistrations(tourId).catch(() => ({ teams: [], individuals: [], totalEntries: 0 })),
        tournamentsApi.getTournamentSchedule(tourId).catch(() => ({ matches: [], competitions: [], totalItems: 0 }))
      ]);

      if (tourDetails) {
        setSelectedTournament(tourDetails);
      }
      setWorkspaceEvents(Array.isArray(eventsRes) ? eventsRes : (eventsRes?.items || []));
      setWorkspaceRegistrations(regRes || { teams: [], individuals: [], totalEntries: 0 });
      setWorkspaceSchedule(schedRes || { matches: [], competitions: [], totalItems: 0 });
    } catch (err) {
      toast.error(err.message || "Failed to load tournament workspace data");
    } finally {
      setWorkspaceLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedTournament) {
      const tourId = selectedTournament.tournament_id || selectedTournament.id;
      loadWorkspaceData(tourId);
    }
  }, [selectedTournament?.tournament_id, selectedTournament?.id, loadWorkspaceData]);

  // Date Formatting Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Open Create Tournament Modal
  const openCreateModal = () => {
    setEditingTournament(null);
    const defaultLevel = competitionLevels[0];
    setTournamentForm({
      ...getInitialTournamentForm(),
      levelId: defaultLevel ? String(defaultLevel.id) : "",
      tier: defaultLevel ? defaultLevel.name : "Intra College",
      scope: "Intramural"
    });
    setModalError("");
    setIsCreateModalOpen(true);
  };

  // Open Edit Tournament Modal
  const openEditModal = (tour) => {
    setEditingTournament(tour);
    setTournamentForm({
      title: tour.title || tour.name || "",
      academicYear: tour.academicYear || tour.academic_year || "2026-2027",
      levelId: tour.competition_level_id || tour.levelId ? String(tour.competition_level_id || tour.levelId) : "",
      tier: tour.tier || tour.eventCategory || "Intra College",
      scope: tour.scope || "Intramural",
      startDate: tour.startDate ? tour.startDate.split("T")[0] : (tour.start_date ? tour.start_date.split("T")[0] : ""),
      endDate: tour.endDate ? tour.endDate.split("T")[0] : (tour.end_date ? tour.end_date.split("T")[0] : ""),
      organizer: tour.organizer || "Physical Education Department & Sports Directorate",
      venue: tour.venue || "",
      description: tour.description || "",
      rules: tour.rules || "",
      status: tour.status || "Upcoming"
    });
    setModalError("");
    setIsEditModalOpen(true);
  };

  // Handle Tournament Save
  const handleSaveTournament = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!tournamentForm.title.trim()) {
      setModalError("Tournament title is required.");
      return;
    }

    if (tournamentForm.endDate && new Date(tournamentForm.startDate) > new Date(tournamentForm.endDate)) {
      setModalError("Start date cannot be later than end date.");
      return;
    }

    setModalSubmitting(true);
    try {
      const payload = {
        name: tournamentForm.title.trim(),
        title: tournamentForm.title.trim(),
        academic_year: tournamentForm.academicYear.trim(),
        academicYear: tournamentForm.academicYear.trim(),
        competition_level_id: tournamentForm.levelId ? Number(tournamentForm.levelId) : null,
        tier: tournamentForm.tier,
        scope: tournamentForm.scope || "Intramural",
        start_date: tournamentForm.startDate,
        startDate: tournamentForm.startDate,
        end_date: tournamentForm.endDate || null,
        endDate: tournamentForm.endDate || null,
        organizer: tournamentForm.organizer.trim(),
        venue: tournamentForm.venue.trim() || null,
        description: tournamentForm.description.trim() || null,
        rules: tournamentForm.rules.trim() || null,
        status: tournamentForm.status
      };

      if (editingTournament) {
        const tourId = editingTournament.tournament_id || editingTournament.id;
        await tournamentsApi.updateTournament(tourId, payload);
        toast.success(`Tournament "${tournamentForm.title}" updated successfully.`);
        setIsEditModalOpen(false);
        if (selectedTournament && (selectedTournament.tournament_id === tourId || selectedTournament.id === tourId)) {
          loadWorkspaceData(tourId);
        }
      } else {
        const created = await tournamentsApi.createTournament(payload);
        toast.success(`Tournament "${tournamentForm.title}" created successfully.`);
        setIsCreateModalOpen(false);
        if (created?.tournament_id || created?.id) {
          // Open newly created tournament workspace directly
          setSelectedTournament(created);
        }
      }
      loadTournaments();
    } catch (err) {
      setModalError(err.message || "Failed to save tournament.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handle Tournament Delete
  const handleDeleteTournament = async (tour) => {
    const tourId = tour.tournament_id || tour.id;
    if (tour.status === "Completed") {
      toast.error("Completed tournament records are protected for institutional audit and cannot be deleted.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete tournament "${tour.title || tour.name}"? This will delete associated events and fixtures.`)) {
      return;
    }

    try {
      await tournamentsApi.deleteTournament(tourId);
      toast.success(`Tournament "${tour.title || tour.name}" deleted successfully.`);
      if (selectedTournament && (selectedTournament.tournament_id === tourId || selectedTournament.id === tourId)) {
        setSelectedTournament(null);
      }
      loadTournaments();
    } catch (err) {
      toast.error(err.message || "Failed to delete tournament.");
    }
  };

  // Handle Quick Status Change in Workspace (e.g. Start Tournament, Mark Completed)
  const handleUpdateStatus = async (newStatus) => {
    if (!selectedTournament) return;
    const tourId = selectedTournament.tournament_id || selectedTournament.id;
    try {
      await tournamentsApi.updateTournament(tourId, { status: newStatus });
      toast.success(`Tournament status changed to ${newStatus}.`);
      loadWorkspaceData(tourId);
      loadTournaments();
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  // Open Add Event Modal inside Tournament Workspace
  const openAddEventModal = () => {
    setEditingEvent(null);
    const firstSport = sports[0];
    setEventForm({
      ...initialEventForm,
      sportId: firstSport ? String(firstSport.sport_id) : "",
      participationType: firstSport?.sport_type === "Both" ? "Team" : (firstSport?.sport_type || "Team"),
      minPlayers: firstSport?.min_players || (firstSport?.sport_type === "Individual" ? 1 : 11),
      maxPlayers: firstSport?.max_players || (firstSport?.sport_type === "Individual" ? 1 : 18),
      regDeadline: selectedTournament?.startDate ? selectedTournament.startDate.split("T")[0] : ""
    });
    setModalError("");
    setIsAddEventModalOpen(true);
  };

  // Open Edit Event Modal inside Tournament Workspace
  const openEditEventModal = (ev) => {
    setEditingEvent(ev);
    let formattedStart = "";
    if (ev.start_time || ev.startTime) {
      try {
        const d = new Date(ev.start_time || ev.startTime);
        formattedStart = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch {
        formattedStart = "";
      }
    }
    setEventForm({
      name: ev.name || ev.title || "",
      sportId: String(ev.sport_id || ev.sportId || ""),
      genderCategory: ev.gender_category || ev.genderCategory || ev.category || "Men",
      eventCategory: ev.event_category || ev.eventCategory || "Inter-Department",
      participationType: ev.participation_type || ev.participationType || "Team",
      minPlayers: ev.min_players || ev.minPlayers || 1,
      maxPlayers: ev.max_players || ev.maxPlayers || 1,
      maxTeams: ev.max_teams || ev.maxTeams || 16,
      regDeadline: ev.reg_deadline ? ev.reg_deadline.split("T")[0] : (ev.regDeadline ? ev.regDeadline.split("T")[0] : ""),
      startTime: formattedStart,
      endTime: "",
      durationMinutes: ev.duration_minutes || ev.durationMinutes || 120,
      venue: ev.venue || "",
      rules: ev.rules || "",
      registrationStatus: ev.registration_status || ev.status || "Open",
      eventStatus: ev.event_status || ev.eventStatus || "Scheduled"
    });
    setModalError("");
    setIsAddEventModalOpen(true);
  };

  // Open View Registrations Modal inside Tournament Workspace
  const openViewRegistrations = async (ev) => {
    setViewRegistrationsEvent(ev);
    setViewRegistrationsData(null);
    setViewRegistrationsLoading(true);
    const evId = ev.event_id || ev.id;
    try {
      const isIndividual = (ev.participation_type || ev.sport_type || "Team") === "Individual";
      if (isIndividual) {
        const entries = await eventsApi.getEventEntries(evId);
        setViewRegistrationsData({ entries: Array.isArray(entries) ? entries : [] });
      } else {
        const res = await eventsApi.getEventTeams(evId);
        setViewRegistrationsData(res);
      }
    } catch (err) {
      toast.error("Failed to load registrations: " + err.message);
      setViewRegistrationsEvent(null);
    } finally {
      setViewRegistrationsLoading(false);
    }
  };

  // Handle Sport Change in Event Modal
  const handleEventSportChange = (sportId) => {
    const sp = sports.find(s => String(s.sport_id) === String(sportId));
    setEventForm(prev => ({
      ...prev,
      sportId,
      participationType: sp?.sport_type === "Both" ? "Team" : (sp?.sport_type || "Team"),
      minPlayers: sp?.min_players || (sp?.sport_type === "Individual" ? 1 : 11),
      maxPlayers: sp?.max_players || (sp?.sport_type === "Individual" ? 1 : 18)
    }));
  };

  // Handle Save Event (Create & Edit)
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!eventForm.name.trim()) {
      setModalError("Event title is required.");
      return;
    }
    if (!eventForm.sportId) {
      setModalError("Please select a sport.");
      return;
    }

    const min = Number(eventForm.minPlayers);
    const max = Number(eventForm.maxPlayers);
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
      const tourId = selectedTournament.tournament_id || selectedTournament.id;
      const payload = {
        tournament_id: tourId,
        tournamentId: tourId,
        sport_id: Number(eventForm.sportId),
        sportId: Number(eventForm.sportId),
        name: eventForm.name.trim(),
        title: eventForm.name.trim(),
        gender_category: eventForm.genderCategory,
        category: eventForm.genderCategory,
        event_category: eventForm.eventCategory,
        participation_type: eventForm.participationType,
        min_players: min,
        max_players: max,
        max_teams: Number(eventForm.maxTeams) || 16,
        reg_deadline: eventForm.regDeadline ? `${eventForm.regDeadline} 23:59:59` : null,
        start_time: eventForm.startTime || null,
        duration_minutes: Number(eventForm.durationMinutes) || 120,
        venue: eventForm.venue.trim() || null,
        rules: eventForm.rules.trim() || null,
        registration_status: eventForm.registrationStatus,
        event_status: eventForm.eventStatus
      };

      if (editingEvent) {
        const evId = editingEvent.event_id || editingEvent.id;
        await eventsApi.updateEvent(evId, payload);
        toast.success(`Event "${eventForm.name}" updated successfully.`);
        setIsAddEventModalOpen(false);
        setEditingEvent(null);
      } else {
        await eventsApi.createEvent(payload);
        toast.success(`Event "${eventForm.name}" created under ${selectedTournament.title || selectedTournament.name}.`);
        setIsAddEventModalOpen(false);
      }
      loadWorkspaceData(tourId);
    } catch (err) {
      setModalError(err.message || "Failed to save event.");
    } finally {
      setModalSubmitting(false);
    }
  };

  // Toggle Event Registration
  const handleToggleEventRegistration = async (ev) => {
    const eventId = ev.event_id || ev.id;
    const currentStatus = ev.registration_status || ev.status || "Open";
    const nextStatus = currentStatus === "Open" ? "Closed" : "Open";
    try {
      await eventsApi.toggleEventStatus(eventId, nextStatus);
      toast.success(`Registration ${nextStatus.toLowerCase()} for ${ev.name || ev.title}.`);
      if (selectedTournament) {
        loadWorkspaceData(selectedTournament.tournament_id || selectedTournament.id);
      }
    } catch (err) {
      toast.error(err.message || "Failed to update registration status.");
    }
  };

  // Delete Event
  const handleDeleteEvent = async (ev) => {
    const eventId = ev.event_id || ev.id;
    if (!window.confirm(`Are you sure you want to delete event "${ev.name || ev.title}"?`)) return;
    try {
      await eventsApi.deleteEvent(eventId);
      toast.success(`Event "${ev.name || ev.title}" deleted.`);
      if (selectedTournament) {
        loadWorkspaceData(selectedTournament.tournament_id || selectedTournament.id);
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete event.");
    }
  };

  // Tournament Filters & Sort
  const availableYears = useMemo(() => {
    const years = new Set(tournaments.map(t => t.academicYear || t.academic_year).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [tournaments]);

  const filteredTournaments = useMemo(() => {
    let list = [...tournaments];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => {
        const title = (t.title || t.name || "").toLowerCase();
        const org = (t.organizer || "").toLowerCase();
        const tier = (t.tier || t.eventCategory || t.level_name || "").toLowerCase();
        const year = (t.academicYear || t.academic_year || "").toLowerCase();
        const venue = (t.venue || "").toLowerCase();
        return title.includes(q) || org.includes(q) || tier.includes(q) || year.includes(q) || venue.includes(q);
      });
    }

    if (statusFilter !== "ALL") {
      list = list.filter(t => (t.status || "Upcoming").toLowerCase() === statusFilter.toLowerCase());
    }

    if (levelFilter !== "ALL") {
      list = list.filter(t => {
        const lvlId = String(t.competition_level_id || t.levelId || "");
        const tierName = String(t.tier || t.eventCategory || "").toLowerCase();
        return lvlId === levelFilter || tierName === levelFilter.toLowerCase();
      });
    }

    if (yearFilter !== "ALL") {
      list = list.filter(t => (t.academicYear || t.academic_year) === yearFilter);
    }

    list.sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.startDate || b.start_date || 0) - new Date(a.startDate || a.start_date || 0);
      }
      if (sortBy === "date_asc") {
        return new Date(a.startDate || a.start_date || 0) - new Date(b.startDate || b.start_date || 0);
      }
      if (sortBy === "az") {
        return (a.title || a.name || "").localeCompare(b.title || b.name || "");
      }
      if (sortBy === "za") {
        return (b.title || b.name || "").localeCompare(a.title || a.name || "");
      }
      if (sortBy === "year_desc") {
        return (b.academicYear || b.academic_year || "").localeCompare(a.academicYear || a.academic_year || "");
      }
      return 0;
    });

    return list;
  }, [tournaments, searchQuery, statusFilter, levelFilter, yearFilter, sortBy]);

  // Paginated Tournaments
  const totalPages = Math.ceil(filteredTournaments.length / pageSize) || 1;
  const paginatedTournaments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTournaments.slice(start, start + pageSize);
  }, [filteredTournaments, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, levelFilter, yearFilter, sortBy]);

  // ─────────────────────────────────────────────────────────────
  // RENDER: WORKSPACE VIEW (When a tournament is selected)
  // ─────────────────────────────────────────────────────────────
  if (selectedTournament) {
    const tourId = selectedTournament.tournament_id || selectedTournament.id;
    const totalEvents = workspaceEvents.length;
    const completedEvents = workspaceEvents.filter(ev => 
      ev.event_status === 'Completed' || ev.status === 'Completed' || (Number(ev.finalizedResults || ev.finalized_results) > 0)
    ).length;
    const totalRegistrations = (workspaceRegistrations.teams?.length || 0) + (workspaceRegistrations.individuals?.length || 0);
    const totalComps = (workspaceSchedule.matches?.length || 0) + (workspaceSchedule.competitions?.length || 0);
    const completedComps = (workspaceSchedule.matches?.filter(m => m.status === "Completed")?.length || 0) + 
      (workspaceSchedule.competitions?.filter(c => c.status === "Completed")?.length || 0);
    const progressPercent = totalEvents > 0 
      ? Math.round((completedEvents / totalEvents) * 100) 
      : (totalComps > 0 ? Math.round((completedComps / totalComps) * 100) : 0);

    return (
      <div className="nec-portal-page nec-tournaments-container">
        {/* Navigation Breadcrumb / Back */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button 
            type="button"
            onClick={() => { setSelectedTournament(null); setActiveEventForWorkspace(null); }} 
            className="nec-back-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "var(--nec-blue, #0274be)", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", padding: 0 }}
          >
            <ArrowLeft size={18} />
            <span>Back to All Tournaments</span>
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="outline" size="sm" icon={Edit} onClick={() => openEditModal(selectedTournament)}>
              Edit Details
            </Button>
            {selectedTournament.status !== "Completed" && (
              <Button 
                variant="outline" 
                size="sm" 
                icon={Check} 
                onClick={() => handleUpdateStatus("Completed")}
                title="Mark entire tournament as completed"
              >
                Mark Completed
              </Button>
            )}
            {selectedTournament.status === "Upcoming" && (
              <Button 
                variant="primary" 
                size="sm" 
                icon={Play} 
                onClick={() => handleUpdateStatus("Ongoing")}
              >
                Start Tournament
              </Button>
            )}
          </div>
        </div>

        {/* Workspace Header Card */}
        <div className="nec-workspace-header-card">
          <div className="nec-workspace-header-content">
            <div style={{ flex: 1, minWidth: "300px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                <span className="nec-tournament-year-badge">
                  {selectedTournament.academicYear || selectedTournament.academic_year || "2026-2027"}
                </span>
                <Badge status="info">
                  {selectedTournament.level_name || formatScope(selectedTournament.scope || selectedTournament.tier)}
                </Badge>
                <Badge status={
                  selectedTournament.status === "Ongoing" ? "live" : 
                  selectedTournament.status === "Completed" ? "success" : 
                  selectedTournament.status === "Draft" ? "neutral" : "info"
                }>
                  {selectedTournament.status || "Upcoming"}
                </Badge>
              </div>

              <h1 className="nec-workspace-title" style={{ margin: "4px 0 8px 0" }}>
                <Trophy size={28} color="var(--nec-blue, #0274be)" />
                <span>{selectedTournament.title || selectedTournament.name}</span>
              </h1>

              <p className="nec-workspace-subtitle">
                Organized by <strong>{selectedTournament.organizer || "Physical Education Department & Sports Directorate"}</strong>
                {selectedTournament.venue && ` • Venue: ${selectedTournament.venue}`}
              </p>
            </div>

            {/* Quick Timeline Box */}
            <div style={{ background: "var(--nec-bg-light, #f8fafc)", padding: "12px 18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", textAlign: "right" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                Tournament Window
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--nec-text-main, #111827)", marginTop: "4px" }}>
                {formatDate(selectedTournament.startDate || selectedTournament.start_date)} &rarr; {formatDate(selectedTournament.endDate || selectedTournament.end_date)}
              </div>
            </div>
          </div>
        </div>

        {/* Sub-view: Nested Event Workspace if admin opened an event */}
        {activeEventForWorkspace ? (
          <div style={{ background: "var(--nec-card-bg, #fff)", padding: "20px", borderRadius: "12px", border: "1px solid var(--nec-border, #e2e8f0)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--nec-border, #e2e8f0)", paddingBottom: "12px" }}>
              <div>
                <span style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: 700, color: "var(--nec-blue, #0274be)" }}>
                  Event Competitions & Scoring Manager
                </span>
                <h3 style={{ margin: "4px 0 0 0", fontSize: "1.3rem" }}>
                  {activeEventForWorkspace.name || activeEventForWorkspace.title} ({activeEventForWorkspace.gender_category || activeEventForWorkspace.category || "Open"})
                </h3>
              </div>
              <Button variant="outline" size="sm" icon={X} onClick={() => setActiveEventForWorkspace(null)}>
                Close Event Workspace
              </Button>
            </div>
            <CompetitionWorkspace tournamentId={tourId} defaultEventId={activeEventForWorkspace.event_id || activeEventForWorkspace.id} />
          </div>
        ) : null}

        {/* Workspace Tabs Navigation */}
        <div className="nec-workspace-tabs">
          <button
            type="button"
            className={`nec-workspace-tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <Layers size={17} />
            <span>Events ({totalEvents})</span>
          </button>
          <button
            type="button"
            className={`nec-workspace-tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Activity size={17} />
            <span>Overview & Stats</span>
          </button>
          <button
            type="button"
            className={`nec-workspace-tab-btn ${activeTab === "registrations" ? "active" : ""}`}
            onClick={() => setActiveTab("registrations")}
          >
            <Users size={17} />
            <span>Registrations ({totalRegistrations})</span>
          </button>
          <button
            type="button"
            className={`nec-workspace-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
            onClick={() => setActiveTab("schedule")}
          >
            <Calendar size={17} />
            <span>Schedule & Results ({totalComps})</span>
          </button>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* KPI Cards Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "16px" }}>
              <div style={{ background: "var(--nec-surface, #fff)", padding: "18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Active Events</span>
                  <Layers size={20} color="var(--nec-blue, #0274be)" />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "var(--nec-text-main)" }}>
                  {totalEvents}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "4px" }}>
                  Sports categories configured
                </div>
              </div>

              <div style={{ background: "var(--nec-surface, #fff)", padding: "18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Total Registrations</span>
                  <Users size={20} color="#10b981" />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "var(--nec-text-main)" }}>
                  {totalRegistrations}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "4px" }}>
                  Teams & individual athletes
                </div>
              </div>

              <div style={{ background: "var(--nec-surface, #fff)", padding: "18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Total Fixtures & Heats</span>
                  <Calendar size={20} color="#8b5cf6" />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "var(--nec-text-main)" }}>
                  {totalComps}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "4px" }}>
                  {completedComps} completed
                </div>
              </div>

              <div style={{ background: "var(--nec-surface, #fff)", padding: "18px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>Tournament Progress</span>
                  <Award size={20} color="#f59e0b" />
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "8px", color: "var(--nec-text-main)" }}>
                  {progressPercent}%
                </div>
                {/* Mini progress bar */}
                <div style={{ width: "100%", height: "6px", background: "#e2e8f0", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
                  <div style={{ width: `${progressPercent}%`, height: "100%", background: "var(--nec-blue, #0274be)", transition: "width 0.3s ease" }} />
                </div>
              </div>
            </div>

            {/* Description & Rules Panels */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ background: "var(--nec-surface, #fff)", padding: "20px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "var(--nec-text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={18} color="var(--nec-blue)" />
                  Description & Context
                </h4>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--nec-text-muted)", lineHeight: 1.6 }}>
                  {selectedTournament.description || "No detailed description provided for this tournament."}
                </p>
              </div>

              <div style={{ background: "var(--nec-surface, #fff)", padding: "20px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "var(--nec-text-main)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Shield size={18} color="var(--nec-blue)" />
                  Tournament Rules & Eligibility
                </h4>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--nec-text-muted)", lineHeight: 1.6 }}>
                  {selectedTournament.rules || "Standard institutional sports rules apply. Consult the sports directorate for eligibility rules."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: EVENTS ── */}
        {activeTab === "events" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
                Events in {selectedTournament.title || selectedTournament.name}
              </h3>
              <Button variant="primary" icon={Plus} onClick={openAddEventModal}>
                Add Event to Tournament
              </Button>
            </div>

            {workspaceEvents.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", background: "var(--nec-surface, #fff)", borderRadius: "10px", border: "1px solid var(--nec-border)" }}>
                <Layers size={36} color="var(--nec-text-muted)" style={{ margin: "0 auto 12px auto" }} />
                <h4 style={{ margin: "0 0 6px 0" }}>No events created yet</h4>
                <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "var(--nec-text-muted)" }}>
                  Start by adding sports events (e.g. 100m Sprint, Basketball 5v5, Football) to this tournament.
                </p>
                <Button variant="primary" icon={Plus} onClick={openAddEventModal}>
                  Create First Event
                </Button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {workspaceEvents.map(ev => {
                  const evId = ev.event_id || ev.id;
                  const isTeam = ev.participation_type === "Team" || ev.sport_type === "Team";
                  const regCount = isTeam ? (ev.registeredTeams || 0) : (ev.registeredEntries || 0);
                  const regMax = ev.max_teams || 32;

                  return (
                    <div 
                      key={evId} 
                      style={{ 
                        background: "var(--nec-surface, #fff)", 
                        border: "1px solid var(--nec-border, #e2e8f0)", 
                        borderRadius: "10px", 
                        padding: "18px", 
                        display: "flex", 
                        flexDirection: "column", 
                        justifyContent: "space-between", 
                        gap: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <Badge status={ev.gender_category === "Women" ? "warning" : ev.gender_category === "Mixed" ? "live" : "info"}>
                            {ev.gender_category || ev.category || "Open"}
                          </Badge>
                          <Badge status={ev.registration_status === "Open" ? "success" : "neutral"}>
                            {ev.registration_status === "Open" ? "Registration Open" : "Closed"}
                          </Badge>
                        </div>

                        <h4 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", color: "var(--nec-text-main)" }}>
                          {ev.name || ev.title}
                        </h4>

                        <div style={{ fontSize: "0.825rem", color: "var(--nec-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Trophy size={14} color="var(--nec-blue)" />
                          <span>{ev.sport_name || "Sport"}</span>
                          <span>•</span>
                          <span>{isTeam ? "Team Event" : "Individual Event"}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: "1px solid var(--nec-border, #e2e8f0)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                        <div>
                          <span style={{ color: "var(--nec-text-muted)" }}>Entries: </span>
                          <strong>{regCount} / {regMax}</strong>
                        </div>
                        {ev.reg_deadline && (
                          <div style={{ color: "var(--nec-text-muted)" }}>
                            Deadline: <strong>{formatDate(ev.reg_deadline)}</strong>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        <Button 
                          variant="primary" 
                          size="sm" 
                          icon={Activity} 
                          style={{ flex: "1 1 auto" }}
                          onClick={() => setActiveEventForWorkspace(ev)}
                          title="Manage fixtures and competitions for this event"
                        >
                          Fixtures
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          icon={Users}
                          onClick={() => openViewRegistrations(ev)}
                          title="View registered squads or individual participants"
                        >
                          Entries
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          icon={Edit}
                          onClick={() => openEditEventModal(ev)}
                          title="Edit Event Details"
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleToggleEventRegistration(ev)}
                          title="Toggle registration status"
                        >
                          {ev.registration_status === "Open" ? "Close Reg" : "Open Reg"}
                        </Button>
                        <Button 
                          variant="danger" 
                          size="sm" 
                          icon={Trash2} 
                          aria-label="Delete event"
                          onClick={() => handleDeleteEvent(ev)} 
                          title="Delete Event"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: REGISTRATIONS ── */}
        {activeTab === "registrations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
              Consolidated Registrations for {selectedTournament.title || selectedTournament.name}
            </h3>

            {/* Teams Table */}
            <div style={{ background: "var(--nec-surface, #fff)", padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
                Registered Teams ({workspaceRegistrations.teams?.length || 0})
              </h4>
              <Table
                columns={[
                  { key: "name", label: "Team Name", render: (val, r) => <strong>{val}</strong> },
                  { key: "department_code", label: "Department", render: (val) => <Badge status="info">{val || "All"}</Badge> },
                  { key: "event_name", label: "Event", render: (val) => <span>{val}</span> },
                  { key: "sport_name", label: "Sport", render: (val) => <span>{val}</span> },
                  { key: "members_count", label: "Roster Size", render: (val) => <span>{val} Athletes</span> },
                  { key: "status", label: "Status", render: (val) => <Badge status={val === "Approved" ? "success" : "warning"}>{val || "Pending"}</Badge> }
                ]}
                data={workspaceRegistrations.teams || []}
                emptyMessage="No department teams registered for this tournament yet."
              />
            </div>

            {/* Individual Athletes Table */}
            <div style={{ background: "var(--nec-surface, #fff)", padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", color: "var(--nec-text-main)" }}>
                Registered Individual Athletes ({workspaceRegistrations.individuals?.length || 0})
              </h4>
              <Table
                columns={[
                  { key: "student_name", label: "Athlete Name", render: (val) => <strong>{val}</strong> },
                  { key: "register_number", label: "Roll Number", render: (val) => <code>{val}</code> },
                  { key: "department_code", label: "Department", render: (val) => <Badge status="info">{val || "NEC"}</Badge> },
                  { key: "event_name", label: "Event", render: (val) => <span>{val}</span> },
                  { key: "sport_name", label: "Sport", render: (val) => <span>{val}</span> },
                  { key: "status", label: "Status", render: () => <Badge status="success">Approved</Badge> }
                ]}
                data={workspaceRegistrations.individuals || []}
                emptyMessage="No individual athlete entries recorded yet."
              />
            </div>
          </div>
        )}

        {/* ── TAB 4: SCHEDULE & RESULTS ── */}
        {activeTab === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem" }}>
              Tournament Schedule & Results
            </h3>

            {/* Team Matches */}
            <div style={{ background: "var(--nec-surface, #fff)", padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem" }}>
                Team Fixtures & Matches ({workspaceSchedule.matches?.length || 0})
              </h4>
              <Table
                columns={[
                  { key: "scheduled_time", label: "Scheduled Time", render: (val) => <span>{val ? formatDate(val) : "TBD"}</span> },
                  { key: "round", label: "Round / Pool", render: (val, r) => <span>{val || "League"} {r.pool ? `(${r.pool})` : ""}</span> },
                  { key: "sport_name", label: "Sport", render: (val) => <strong>{val}</strong> },
                  { 
                    key: "teams", 
                    label: "Matchup", 
                    render: (_, r) => (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{r.team_a_name || "Team A"}</span>
                        <strong>vs</strong>
                        <span>{r.team_b_name || "Team B"}</span>
                      </div>
                    ) 
                  },
                  { 
                    key: "score", 
                    label: "Score", 
                    render: (_, r) => (
                      <span><strong>{r.score_a ?? "-"}</strong> : <strong>{r.score_b ?? "-"}</strong></span>
                    ) 
                  },
                  { 
                    key: "status", 
                    label: "Status", 
                    render: (val) => (
                      <Badge status={val === "Completed" ? "success" : val === "Ongoing" ? "live" : "neutral"}>
                        {val || "Scheduled"}
                      </Badge>
                    ) 
                  },
                  { key: "winner_name", label: "Winner", render: (val) => val ? <Badge status="success">🏆 {val}</Badge> : <span>-</span> }
                ]}
                data={workspaceSchedule.matches || []}
                emptyMessage="No team match fixtures scheduled yet."
              />
            </div>

            {/* Individual / Track & Field Competitions */}
            <div style={{ background: "var(--nec-surface, #fff)", padding: "16px", borderRadius: "10px", border: "1px solid var(--nec-border)" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem" }}>
                Rounds, Heats & Trials ({workspaceSchedule.competitions?.length || 0})
              </h4>
              <Table
                columns={[
                  { key: "scheduled_time", label: "Schedule", render: (val) => <span>{val ? formatDate(val) : "TBD"}</span> },
                  { key: "name", label: "Competition Name", render: (val) => <strong>{val}</strong> },
                  { key: "round", label: "Round", render: (val) => <Badge status="info">{val || "Final"}</Badge> },
                  { key: "event_name", label: "Event", render: (val) => <span>{val}</span> },
                  { key: "scoring", label: "Metric", render: (val, r) => <span>{val} ({r.unit || ""})</span> },
                  { key: "total_entries", label: "Athletes Entered", render: (val) => <span>{val || 0}</span> },
                  { 
                    key: "status", 
                    label: "Status", 
                    render: (val) => (
                      <Badge status={val === "Completed" ? "success" : val === "Ongoing" ? "live" : "neutral"}>
                        {val || "Scheduled"}
                      </Badge>
                    ) 
                  }
                ]}
                data={workspaceSchedule.competitions || []}
                emptyMessage="No track/field competition rounds scheduled yet."
              />
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT EVENT MODAL (Inside Workspace) ── */}
        <Modal
          isOpen={isAddEventModalOpen}
          onClose={() => { setIsAddEventModalOpen(false); setEditingEvent(null); setModalError(""); }}
          title={editingEvent ? `Edit Event: ${editingEvent.name || editingEvent.title}` : `Add Event to: ${selectedTournament.title || selectedTournament.name}`}
          size="md"
        >
          <form onSubmit={handleSaveEvent} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {modalError && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Event Title <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                placeholder="e.g. Men's 100m Sprint, Basketball 5v5, Badminton Singles"
                value={eventForm.name}
                onChange={(e) => setEventForm(prev => ({ ...prev, name: e.target.value }))}
                maxLength={255}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Sport <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  required
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.sportId}
                  onChange={(e) => handleEventSportChange(e.target.value)}
                >
                  <option value="">Select Sport...</option>
                  {sports.map(s => (
                    <option key={s.sport_id} value={s.sport_id}>{s.name} ({s.sport_type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Gender Category <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.genderCategory}
                  onChange={(e) => setEventForm(prev => ({ ...prev, genderCategory: e.target.value }))}
                >
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Mixed">Mixed</option>
                  <option value="Open">Open</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Participation Type <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <select
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.participationType}
                  onChange={(e) => setEventForm(prev => ({ ...prev, participationType: e.target.value }))}
                >
                  <option value="Team">Team (Squad entries)</option>
                  <option value="Individual">Individual (Single athlete / trials)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Registration Status
                </label>
                <select
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.registrationStatus}
                  onChange={(e) => setEventForm(prev => ({ ...prev, registrationStatus: e.target.value }))}
                >
                  <option value="Open">Open</option>
                  <option value="Not Open">Not Open</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Min Athletes/Entry
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.minPlayers}
                  onChange={(e) => setEventForm(prev => ({ ...prev, minPlayers: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Max Athletes/Entry
                </label>
                <input
                  type="number"
                  min={eventForm.minPlayers || 1}
                  required
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.maxPlayers}
                  onChange={(e) => setEventForm(prev => ({ ...prev, maxPlayers: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Max Entries/Teams
                </label>
                <input
                  type="number"
                  min="2"
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.maxTeams}
                  onChange={(e) => setEventForm(prev => ({ ...prev, maxTeams: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Registration Deadline
                </label>
                <input
                  type="date"
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  value={eventForm.regDeadline}
                  onChange={(e) => setEventForm(prev => ({ ...prev, regDeadline: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Event Venue
                </label>
                <input
                  type="text"
                  className="nec-table-search-input"
                  style={{ width: "100%", margin: 0 }}
                  placeholder="e.g. Ground A, Indoor Stadium"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
              <Button type="button" variant="outline" onClick={() => { setIsAddEventModalOpen(false); setEditingEvent(null); }}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={modalSubmitting}>
                {editingEvent ? "Save Changes" : "Create Event"}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ── VIEW REGISTRATIONS MODAL (Inside Workspace) ── */}
        <Modal
          isOpen={!!viewRegistrationsEvent}
          onClose={() => setViewRegistrationsEvent(null)}
          title={`Registrations: ${viewRegistrationsEvent?.name || viewRegistrationsEvent?.title || ""}`}
          size="lg"
        >
          {viewRegistrationsLoading && (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--nec-text-muted)" }}>
              Loading registrations...
            </div>
          )}

          {!viewRegistrationsLoading && viewRegistrationsData?.entries && (
            <Table
              columns={[
                { key: "student_name", label: "Student Athlete", render: (v) => <strong>{v}</strong> },
                { key: "register_number", label: "Register No.", render: (v) => <code>{v}</code> },
                { key: "department_code", label: "Dept", width: "90px", render: (v) => <Badge status="info">{v || "-"}</Badge> },
                { key: "category_name", label: "Category", render: (v) => v || "Open" }
              ]}
              data={viewRegistrationsData.entries}
              emptyMessage="No individual student athletes have registered for this event yet."
            />
          )}

          {!viewRegistrationsLoading && viewRegistrationsData?.teams && (
            <>
              <div style={{ fontSize: "0.85rem", marginBottom: "12px", color: "var(--nec-text-muted)" }}>
                Total: <strong>{viewRegistrationsData.summary?.total || viewRegistrationsData.teams.length}</strong> team(s) 
                ({viewRegistrationsData.summary?.approved || 0} approved, {viewRegistrationsData.summary?.pending || 0} pending)
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
                data={viewRegistrationsData.teams}
                emptyMessage="No department teams have registered for this event yet."
              />
            </>
          )}
        </Modal>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: TOURNAMENTS LIST VIEW (Cards Grid)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="nec-portal-page nec-tournaments-container">
      {/* Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 className="nec-page-title">{t.tournaments || "Tournaments Management"}</h2>
          <p className="nec-page-desc">
            Organize inter-department, zonal, and state-level tournaments. Access dedicated workspaces to manage events, registrations, and results.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openCreateModal}>
          Create Tournament
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="nec-filters-bar" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", background: "var(--nec-card-bg, #fff)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--nec-border, #e2e8f0)" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
          <input
            type="text"
            className="nec-table-search-input"
            style={{ paddingLeft: "32px", width: "100%", margin: 0 }}
            placeholder="Search tournaments by name, level, or venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Academic Year Filter */}
        <select
          className="nec-table-search-input"
          style={{ width: "auto", margin: 0, padding: "6px 12px" }}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="ALL">All Academic Years</option>
          {availableYears.map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>

        {/* Level Filter (from competition_levels DB) */}
        <select
          className="nec-table-search-input"
          style={{ width: "auto", margin: 0, padding: "6px 12px" }}
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="ALL">All Competition Levels</option>
          {competitionLevels.map(lvl => (
            <option key={lvl.id} value={String(lvl.id)}>{lvl.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="nec-table-search-input"
          style={{ width: "auto", margin: 0, padding: "6px 12px" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Sort Filter */}
        <select
          className="nec-table-search-input"
          style={{ width: "auto", margin: 0, padding: "6px 12px" }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date_desc">Date (Newest first)</option>
          <option value="date_asc">Date (Oldest first)</option>
          <option value="az">Title (A &rarr; Z)</option>
          <option value="za">Title (Z &rarr; A)</option>
          <option value="year_desc">Academic Year (Desc)</option>
        </select>

        {(searchQuery || statusFilter !== "ALL" || levelFilter !== "ALL" || yearFilter !== "ALL") && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setLevelFilter("ALL"); setYearFilter("ALL"); setSortBy("date_desc"); }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Tournaments Grid */}
      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadTournaments} message={error} />
        </div>
      ) : loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--nec-text-muted)" }}>
          Loading tournaments...
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div style={{ padding: "50px 20px", textAlign: "center", background: "var(--nec-surface, #fff)", borderRadius: "12px", border: "1px solid var(--nec-border)" }}>
          <Trophy size={42} color="var(--nec-text-muted)" style={{ margin: "0 auto 14px auto" }} />
          <h3 style={{ margin: "0 0 6px 0" }}>No Tournaments Found</h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "0.875rem", color: "var(--nec-text-muted)" }}>
            {searchQuery || statusFilter !== "ALL" || levelFilter !== "ALL" || yearFilter !== "ALL"
              ? "Try adjusting your search criteria or resetting the active filters."
              : "No tournaments have been scheduled yet. Create your first tournament to get started."}
          </p>
          <Button variant="primary" icon={Plus} onClick={openCreateModal}>
            Create Tournament
          </Button>
        </div>
      ) : (
        <>
          <div className="nec-tournaments-grid">
            {paginatedTournaments.map(t => {
              const tourId = t.tournament_id || t.id;
              const status = t.status || "Upcoming";
              const badgeStatus = status === "Ongoing" ? "live" : status === "Completed" ? "success" : status === "Draft" ? "neutral" : "info";

              return (
                <div 
                  key={tourId}
                  className="nec-tournament-card"
                  onClick={() => setSelectedTournament(t)}
                >
                  <div>
                    <div className="nec-tournament-card-header">
                      <span className="nec-tournament-year-badge">
                        {t.academicYear || t.academic_year || "2026-2027"}
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <Badge status="info">
                          {t.level_name || formatScope(t.scope || t.tier)}
                        </Badge>
                        <Badge status={badgeStatus}>
                          {status}
                        </Badge>
                      </div>
                    </div>

                    <h3 className="nec-tournament-title">
                      {t.title || t.name}
                    </h3>

                    <p className="nec-tournament-desc">
                      {t.description || "Physical Education Department & Sports Directorate Annual Tournament."}
                    </p>
                  </div>

                  <div>
                    <div className="nec-tournament-meta">
                      <div className="nec-tournament-meta-item">
                        <Calendar size={14} />
                        <span>{formatDate(t.startDate || t.start_date)}</span>
                        {t.endDate && <span>&rarr; {formatDate(t.endDate || t.end_date)}</span>}
                      </div>
                      {t.venue && (
                        <div className="nec-tournament-meta-item">
                          <MapPin size={14} />
                          <span>{t.venue}</span>
                        </div>
                      )}
                    </div>

                    <div className="nec-tournament-card-footer">
                      <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                        {t.total_events !== undefined ? `${t.total_events} Event(s)` : "Open Workspace"}
                      </span>
                      <span>
                        Open Workspace &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--nec-border, #e2e8f0)", marginTop: "16px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTournaments.length)} of {filteredTournaments.length} tournaments
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <span style={{ display: "inline-flex", alignItems: "center", padding: "0 10px", fontSize: "0.85rem", fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CREATE / EDIT TOURNAMENT MODAL ── */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setEditingTournament(null);
          setModalError("");
        }}
        title={editingTournament ? `Edit Tournament: ${editingTournament.title || editingTournament.name}` : "Create New Tournament"}
        size="md"
      >
        <form onSubmit={handleSaveTournament} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {modalError && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Tournament Title <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0 }}
              placeholder="e.g. NEC Annual Sports Meet 2026, Zonal Inter-Collegiate Trophy"
              value={tournamentForm.title}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, title: e.target.value }))}
              maxLength={255}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Academic Year <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                placeholder="2026-2027"
                value={tournamentForm.academicYear}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, academicYear: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Competition Level <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={tournamentForm.levelId}
                onChange={(e) => {
                  const selLvl = competitionLevels.find(l => String(l.id) === e.target.value);
                  setTournamentForm(prev => ({
                    ...prev,
                    levelId: e.target.value,
                    tier: selLvl ? selLvl.name : prev.tier
                  }));
                }}
              >
                {competitionLevels.map(lvl => (
                  <option key={lvl.id} value={String(lvl.id)}>{lvl.name}</option>
                ))}
                {competitionLevels.length === 0 && (
                  <option value="">Intra College</option>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Competition Scope <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <select
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={tournamentForm.scope || "Intramural"}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, scope: e.target.value }))}
              >
                <option value="Intramural">Intra College (Within NEC)</option>
                <option value="Inter-Collegiate">Inter College (Between Institutions)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Start Date <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="date"
                required
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={tournamentForm.startDate}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                End Date
              </label>
              <input
                type="date"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={tournamentForm.endDate}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Organizing Body
              </label>
              <input
                type="text"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                value={tournamentForm.organizer}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, organizer: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Venue / Location
              </label>
              <input
                type="text"
                className="nec-table-search-input"
                style={{ width: "100%", margin: 0 }}
                placeholder="e.g. NEC Main Ground, Anna University Sports Complex"
                value={tournamentForm.venue}
                onChange={(e) => setTournamentForm(prev => ({ ...prev, venue: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Tournament Status
            </label>
            <select
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0 }}
              value={tournamentForm.status}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="Draft">Draft</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Description & Summary
            </label>
            <textarea
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, minHeight: "60px" }}
              placeholder="Brief summary or objective of the tournament..."
              value={tournamentForm.description}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
              Rules & Regulations
            </label>
            <textarea
              className="nec-table-search-input"
              style={{ width: "100%", margin: 0, minHeight: "60px" }}
              placeholder="Eligibility criteria, points policy, ID requirements..."
              value={tournamentForm.rules}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, rules: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              loading={modalSubmitting}
            >
              {editingTournament ? "Save Changes" : "Create Tournament"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
