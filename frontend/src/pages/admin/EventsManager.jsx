import React, { useState, useEffect } from "react";
import { eventsApi, sportsApi, tournamentsApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { CalendarDays, Plus, ToggleLeft, ToggleRight, Trash2, Trophy, Users } from "lucide-react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
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

export default function EventsManager() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [sportId, setSportId] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  // Registered-teams view
  const [teamsEvent, setTeamsEvent] = useState(null);
  const [teamsData, setTeamsData] = useState(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [category, setCategory] = useState("Men");
  const [eventCategory, setEventCategory] = useState("Inter-Department");
  const [maxTeams, setMaxTeams] = useState(8);
  const [regDeadline, setRegDeadline] = useState("2026-08-20");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);

  useEffect(() => {
    sportsApi.getSports().then(list => setSports(Array.isArray(list) ? list : [])).catch(() => setSports([]));
    tournamentsApi.getTournaments().then(list => {
      const arr = Array.isArray(list) ? list : [];
      setTournaments(arr);
      if (arr.length) setTournamentId(prev => prev || String(arr[0].tournament_id || arr[0].id));
    }).catch(() => setTournaments([]));
  }, []);

  const handleOpenTeams = async (ev) => {
    setTeamsEvent(ev);
    setTeamsData(null);
    setTeamsLoading(true);
    try {
      const isIndividual = (ev.sportType || "Team") === "Individual";
      if (isIndividual) {
        const entries = await eventsApi.getEventEntries(ev.id || ev.event_id);
        setTeamsData({ entries });
      } else {
        const res = await eventsApi.getEventTeams(ev.id || ev.event_id);
        setTeamsData(res);
      }
    } catch (err) {
      toast.error("Failed to load registrations: " + err.message);
      setTeamsEvent(null);
    } finally {
      setTeamsLoading(false);
    }
  };

  const { data: rawEvents, loading, error, refetch } = useAutoRefresh(
    () => eventsApi.getEvents(),
    { interval: 15000 }
  );

  const [localEvents, setLocalEvents] = useState([]);

  useEffect(() => {
    if (Array.isArray(rawEvents)) {
      setLocalEvents(rawEvents);
    }
  }, [rawEvents]);

  const handleToggleRegistration = async (eventId) => {
    const prevEvents = [...localEvents];
    let nextStatus = "Open";

    // Instant optimistic update in local state
    setLocalEvents(prev => prev.map(ev => {
      const id = ev.id || ev.event_id;
      if (id === eventId) {
        const cur = ev.status || ev.registration_status || "Open";
        const isOpen = cur === "Open" || cur === "Registration Open";
        nextStatus = isOpen ? "Closed" : "Open";
        return { ...ev, status: nextStatus, registration_status: nextStatus };
      }
      return ev;
    }));

    try {
      await eventsApi.toggleEventStatus(eventId, nextStatus);
      toast.success(`Event registration ${nextStatus.toLowerCase()}!`);
    } catch (err) {
      setLocalEvents(prevEvents);
      toast.error("Failed to toggle registration status: " + err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to permanently delete this event?")) return;
    try {
      await eventsApi.deleteEvent(eventId);
      toast.success("Event deleted successfully!");
      refetch();
    } catch (err) {
      toast.error("Failed to delete event: " + err.message);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!tournamentId) {
      toast.error("Select a tournament for this event.");
      return;
    }
    if (!sportId) {
      toast.error("Select a sport for this event.");
      return;
    }
    try {
      await eventsApi.createEvent({
        tournamentId: Number(tournamentId),
        title: title.trim(),
        eventCategory,
        regDeadline,
        startTime: startTime || null,
        durationMinutes: Number(durationMinutes) || 120,
        status: "Open",
        sportId: Number(sportId),
        category,
        maxTeams: Number(maxTeams) || 8,
      });
      toast.success("Sports event created successfully!");
      refetch();
      setIsModalOpen(false);
      setTitle("");
      setStartTime("");
    } catch (err) {
      toast.error(err.message || "Failed to create sports event");
    }
  };

  const columns = [
    {
      key: "title",
      label: "Event Name",
      minWidth: "220px",
      className: "nec-events-name-col",
      render: (val, row) => (
        <div className="nec-event-name">
          <strong style={{ fontSize: "0.92rem", display: "block" }}>{val || row.name || "Sports Event"}</strong>
          {row.tournament_name && (
            <div className="nec-event-tournament">
              <Trophy size={13} aria-hidden="true" /> {row.tournament_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: "category",
      label: "Category",
      width: "100px",
      render: (val, row) => {
        const cat = val || row.category || "Open";
        return (
          <Badge status={cat === "Men" ? "info" : cat === "Women" ? "warning" : "neutral"}>
            {cat}
          </Badge>
        );
      }
    },
    {
      key: "eventCategory",
      label: "Tournament Tier",
      width: "130px",
      render: (val, row) => {
        const tier = val || row.event_category || row.tier || "Intramural";
        return (
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--nec-text-secondary)" }}>
            {tier}
          </span>
        );
      }
    },
    {
      key: "sportId",
      label: "Sport",
      width: "110px",
      render: (val, row) => {
        const name = row.sportName || row.sport_name || (val ? `Sport #${val}` : "General");
        return String(name).replace("sp_", "").toUpperCase();
      }
    },
    {
      key: "teamsLimit",
      label: "Teams Registered",
      width: "130px",
      render: (_, row) => row.sportType === "Individual"
        ? <span>{row.registeredEntries ?? 0} entries</span>
        : <span>{row.registeredTeams ?? 0} / {row.maxTeams || row.max_teams || 32} Teams</span>
    },
    {
      key: "regDeadline",
      label: "Entry Deadline",
      minWidth: "150px",
      render: (val, row) => <span className="nec-event-deadline"><CalendarDays size={15} aria-hidden="true" />{formatDeadline(val || row.reg_deadline)}</span>
    },
    {
      key: "status",
      label: "Registration Status",
      width: "110px",
      render: (val, row) => {
        const st = val || row.registration_status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return (
          <Badge status={isOpen ? "success" : st === "Ongoing" ? "live" : "danger"}>
            {isOpen ? "Open" : st === "Closed" ? "Closed" : st}
          </Badge>
        );
      }
    },
    {
      key: "actions",
      label: "Registration Control",
      minWidth: "270px",
      className: "nec-events-actions-col",
      sortable: false,
      render: (_, row) => {
        const eventId = row.id || row.event_id;
        const st = row.status || row.registration_status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return (
          <div className="nec-events-actions">
            <Button variant="ghost" size="sm" icon={Users} onClick={() => handleOpenTeams(row)} title="View registered teams">
              Teams
            </Button>
            <Button
              variant={isOpen ? "outline" : "primary"}
              size="sm"
              icon={isOpen ? ToggleRight : ToggleLeft}
              onClick={() => handleToggleRegistration(eventId)}
            >
              {isOpen ? "Close Reg" : "Open Reg"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => handleDeleteEvent(eventId)}
              title="Delete Event"
              ariaLabel="Delete Event"
            />
          </div>
        );
      }
    }
  ];

  return (
    <div className="nec-portal-page nec-events-page">
      <div className="nec-page-header nec-events-header">
        <div>
          <h2 className="nec-page-title">Events</h2>
          <div className="nec-events-summary">
            <span><strong>{localEvents.length}</strong> total</span>
            <span><strong>{localEvents.filter(event => ["Open", "Registration Open"].includes(event.status || event.registration_status || "Open")).length}</strong> open</span>
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create Event
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={refetch} />
        </div>
      ) : (
        <Table
          className="nec-events-table"
          columns={columns}
          data={localEvents}
          loading={loading && localEvents.length === 0}
          searchPlaceholder="Search sports events..."
          emptyMessage="No events found."
        />
      )}

      <Modal
        isOpen={!!teamsEvent}
        onClose={() => setTeamsEvent(null)}
        title={`Registrations: ${teamsEvent?.name || teamsEvent?.title || ""}`}
        size="lg"
      >
        {teamsLoading && <p>Loading registrations...</p>}
        {!teamsLoading && teamsData?.entries && (
          <Table
            columns={[
              { key: "student_name", label: "Student", render: (v) => <strong>{v}</strong> },
              { key: "register_number", label: "Register No." },
              { key: "department_code", label: "Dept", width: "90px" },
              { key: "category_name", label: "Category", render: (v) => v || "-" }
            ]}
            data={teamsData.entries}
            emptyMessage="No students have entered this event yet."
          />
        )}
        {!teamsLoading && teamsData?.teams && (
          <>
            <p style={{ fontSize: "0.85rem", marginBottom: "10px" }}>
              {teamsData.summary.total} team(s): {teamsData.summary.approved} approved, {teamsData.summary.pending} pending, {teamsData.summary.disqualified} disqualified.
            </p>
            <Table
              columns={[
                { key: "name", label: "Team", render: (v) => <strong>{v}</strong> },
                { key: "department_code", label: "Dept", width: "90px", render: (v) => v || "-" },
                { key: "status", label: "Status", width: "120px", render: (v) => <Badge status={v === "Approved" ? "success" : v === "Disqualified" ? "danger" : "warning"}>{v}</Badge> },
                { key: "playerCount", label: "Players", width: "90px" },
                { key: "fixtureCount", label: "Fixtures", width: "90px" }
              ]}
              data={teamsData.teams}
              emptyMessage="No teams have registered for this event yet."
            />
          </>
        )}
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Sports Event"
      >
        <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Event Title</label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="e.g. Men's Football Championship, Women's Badminton Singles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Tournament *</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              required
            >
              <option value="">-- Select tournament --</option>
              {tournaments.map(t => (
                <option key={t.tournament_id || t.id} value={t.tournament_id || t.id}>{t.name || t.title}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                required
              >
                <option value="">-- Select sport --</option>
                {sports.map(sp => (
                  <option key={sp.sport_id} value={sp.sport_id}>{sp.name}{sp.sport_type === "Individual" ? " (individual)" : ""}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Gender Category</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Open">Open</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Event Category</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value)}
              >
                <option value="Inter-Department">Inter-Department</option>
                <option value="Inter-College">Inter-College</option>
                <option value="Zonal">Zonal</option>
                <option value="National">National</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>{sports.find(sp => Number(sp.sport_id) === Number(sportId))?.sport_type === "Individual" ? "Entry Limit" : "Max Teams Limit"}</label>
              <input
                type="number"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={maxTeams}
                onChange={(e) => setMaxTeams(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Registration Deadline</label>
              <input
                type="date"
                required
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={regDeadline}
                onChange={(e) => setRegDeadline(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Event Start Date & Time (Optional)</label>
              <input
                type="datetime-local"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Estimated Duration (Minutes)</label>
              <input
                type="number"
                min="10"
                max="1440"
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create Event & Open Registration</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
