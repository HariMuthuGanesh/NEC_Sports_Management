import React, { useEffect, useState } from "react";
import { tournamentsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, ToggleLeft, ToggleRight, Calendar, Award } from "lucide-react";
import "./AdminPortal.css";

export default function EventsManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [sportId, setSportId] = useState("sp_football");
  const [category, setCategory] = useState("Men");
  const [eventCategory, setEventCategory] = useState("Inter-Department");
  const [maxTeams, setMaxTeams] = useState(8);
  const [regDeadline, setRegDeadline] = useState("2026-08-20");

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = () => {
    setLoading(true);
    tournamentsApi.getEvents().then(data => {
      setEvents(data);
      setLoading(false);
    });
  };

  const handleToggleRegistration = (eventId) => {
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const newStatus = ev.status === "Open" || ev.status === "Registration Open" ? "Closed" : "Open";
        return { ...ev, status: newStatus };
      }
      return ev;
    }));
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEv = {
      id: `ev_${Date.now()}`,
      tournamentId: "tn_2026_interdept",
      sportId,
      category,
      eventCategory,
      title,
      maxTeams: Number(maxTeams),
      registeredTeams: 0,
      status: "Open",
      regDeadline
    };

    setEvents(prev => [newEv, ...prev]);
    setIsModalOpen(false);
    setTitle("");
  };

  const columns = [
    { key: "title", label: "Event Name", render: (val, row) => <div><strong>{val}</strong><br/><small style={{color: 'var(--nec-text-muted)'}}>{row.category} Category</small></div> },
    { key: "eventCategory", label: "Event Category", width: "140px", render: (val) => <Badge status={val === "Inter-College" ? "danger" : "info"}>{val}</Badge> },
    { key: "sportId", label: "Sport", width: "130px", render: (val) => val.replace("sp_", "").toUpperCase() },
    { key: "teamsLimit", label: "Teams Registered", width: "150px", render: (_, row) => <span>{row.registeredTeams} / {row.maxTeams} Teams</span> },
    { key: "regDeadline", label: "Entry Deadline", width: "130px", render: (val) => <span>📅 {val}</span> },
    {
      key: "status",
      label: "Registration Status",
      width: "150px",
      render: (val) => (
        <Badge status={val === "Open" || val === "Registration Open" ? "success" : val === "Ongoing" ? "live" : "danger"}>
          {val === "Open" || val === "Registration Open" ? "OPEN ✓" : val === "Closed" ? "CLOSED ×" : val}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Registration Control",
      width: "180px",
      sortable: false,
      render: (_, row) => {
        const isOpen = row.status === "Open" || row.status === "Registration Open";
        return (
          <Button
            variant={isOpen ? "danger" : "primary"}
            size="sm"
            icon={isOpen ? ToggleRight : ToggleLeft}
            onClick={() => handleToggleRegistration(row.id)}
          >
            {isOpen ? "Close Reg" : "Open Reg"}
          </Button>
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

      <Table
        columns={columns}
        data={events}
        loading={loading}
        searchPlaceholder="Search sports events..."
      />

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
                <option value="sp_football">Football</option>
                <option value="sp_cricket">Cricket</option>
                <option value="sp_basketball">Basketball</option>
                <option value="sp_volleyball">Volleyball</option>
                <option value="sp_badminton">Badminton</option>
                <option value="sp_tt">Table Tennis</option>
                <option value="sp_athletics">Athletics</option>
                <option value="sp_chess">Chess</option>
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
