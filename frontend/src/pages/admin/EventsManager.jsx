import React, { useState } from "react";
import { eventsApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import ErrorState from "../../components/common/ErrorState";
import { Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";
import "./AdminPortal.css";

export default function EventsManager() {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [sportId, setSportId] = useState(1);
  const [category, setCategory] = useState("Men");
  const [eventCategory, setEventCategory] = useState("Inter-Department");
  const [maxTeams, setMaxTeams] = useState(8);
  const [regDeadline, setRegDeadline] = useState("2026-08-20");
  const [startTime, setStartTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);

  const { data: rawEvents, loading, error, refetch } = useAutoRefresh(
    () => eventsApi.getEvents(),
    { interval: 15000 }
  );

  const events = Array.isArray(rawEvents) ? rawEvents : [];

  const handleToggleRegistration = async (eventId) => {
    try {
      await eventsApi.toggleEventStatus(eventId);
      toast.success("Event registration status updated!");
      refetch();
    } catch (err) {
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

    try {
      await eventsApi.createEvent({
        title: title.trim(),
        eventCategory,
        regDeadline,
        startTime: startTime || null,
        durationMinutes: Number(durationMinutes) || 120,
        status: "Open",
        sportId: Number(sportId) || 1,
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
      render: (val, row) => (
        <div>
          <strong>{val || row.name || "Sports Event"}</strong>
          <br />
          <small style={{ color: 'var(--nec-text-muted)' }}>{row.category || "Open"} Category</small>
        </div>
      )
    },
    {
      key: "eventCategory",
      label: "Event Category",
      width: "140px",
      render: (val, row) => {
        const cat = val || row.event_category || row.tier || "Inter-Department";
        return <Badge status={cat === "Inter-College" ? "danger" : "info"}>{cat}</Badge>;
      }
    },
    {
      key: "sportId",
      label: "Sport",
      width: "130px",
      render: (val, row) => {
        const name = row.sportName || row.sport_name || (val ? `Sport #${val}` : "General");
        return String(name).replace("sp_", "").toUpperCase();
      }
    },
    {
      key: "teamsLimit",
      label: "Teams Registered",
      width: "150px",
      render: (_, row) => <span>{row.registeredTeams ?? 0} / {row.maxTeams || row.max_teams || 32} Teams</span>
    },
    {
      key: "regDeadline",
      label: "Entry Deadline",
      width: "130px",
      render: (val, row) => <span>📅 {val || row.reg_deadline || "TBD"}</span>
    },
    {
      key: "status",
      label: "Registration Status",
      width: "140px",
      render: (val, row) => {
        const st = val || row.registration_status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return (
          <Badge status={isOpen ? "success" : st === "Ongoing" ? "live" : "danger"}>
            {isOpen ? "OPEN ✓" : st === "Closed" ? "CLOSED ×" : st}
          </Badge>
        );
      }
    },
    {
      key: "actions",
      label: "Registration Control",
      width: "210px",
      sortable: false,
      render: (_, row) => {
        const eventId = row.id || row.event_id;
        const st = row.status || row.registration_status || "Open";
        const isOpen = st === "Open" || st === "Registration Open";
        return (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
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
            >
              Delete
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Tournament Events & Registration Controls</h2>
          <p className="nec-page-desc">Open or close department registrations and set entry limits for sports events.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Create Event
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadEvents} />
        </div>
      ) : (
        <Table
          columns={columns}
          data={events}
          loading={loading}
          searchPlaceholder="Search sports events..."
          emptyMessage="No events found."
        />
      )}

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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Sport</label>
              <select
                className="nec-table-search-input"
                style={{ maxWidth: "100%" }}
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
              >
                <option value="1">Football</option>
                <option value="2">Cricket</option>
                <option value="3">Basketball</option>
                <option value="4">Volleyball</option>
                <option value="5">Badminton</option>
                <option value="6">Table Tennis</option>
                <option value="7">Athletics</option>
                <option value="8">Chess</option>
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
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Max Teams Limit</label>
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
