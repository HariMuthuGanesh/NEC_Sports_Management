import React, { useEffect, useState } from "react";
import { sportsApi, tournamentsApi, eventsApi } from "../../services/api/apiServices";
import Table from "../../components/common/Table";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import { Plus, Pencil, UserX, UserCheck, Calendar, Trophy, Users, Trash2, ShieldCheck, Activity } from "lucide-react";
import "./AdminPortal.css";

const emptyForm = { fullName: "", designation: "", email: "", phone: "", departmentId: "", username: "" };
const emptyAssignForm = { tournamentId: "", eventId: "", staffId: "", role: "Lead Coordinator" };

export default function StaffCoordinatorsManager() {
  const [activeTab, setActiveTab] = useState("staff"); // "staff" | "assignments"
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  
  // Staff Modal
  const [editing, setEditing] = useState(null); // staff row or "new"
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Assign Event Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);

  const load = () => {
    setLoading(true);
    setPageError("");
    Promise.all([
      sportsApi.getCoordinators(),
      sportsApi.getDepartments(),
      tournamentsApi.getTournaments().catch(() => []),
      eventsApi.getEvents().catch(() => [])
    ])
      .then(([list, depts, tours, evs]) => {
        setStaff(Array.isArray(list) ? list : []);
        setDepartments(Array.isArray(depts) ? depts : []);
        setTournaments(Array.isArray(tours) ? tours : []);
        setEvents(Array.isArray(evs) ? evs : []);
      })
      .catch(err => setPageError(err.message || "Failed to load staff coordinators."))
      .finally(() => setLoading(false));

    loadAssignments();
  };

  const loadAssignments = () => {
    setAssignmentsLoading(true);
    sportsApi.getEventStaffAssignments()
      .then(res => {
        const rows = res?.data || res;
        setAssignments(Array.isArray(rows) ? rows : []);
      })
      .catch(err => console.warn("Failed to load staff assignments:", err))
      .finally(() => setAssignmentsLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(emptyForm);
    setFormError("");
    setEditing("new");
  };

  const openEdit = (row) => {
    setForm({
      fullName: row.fullName || "",
      designation: row.designation || "",
      email: row.email || "",
      phone: row.phone || "",
      departmentId: row.departmentId ? String(row.departmentId) : "",
      username: ""
    });
    setFormError("");
    setEditing(row);
  };

  const openAssignModal = () => {
    const firstTourId = tournaments[0]?.id || tournaments[0]?.tournament_id || "";
    setAssignForm({
      tournamentId: firstTourId ? String(firstTourId) : "",
      eventId: "",
      staffId: staff[0]?.user_id ? String(staff[0].user_id) : "",
      role: "Lead Coordinator"
    });
    if (firstTourId) {
      setFilteredEvents(events.filter(e => Number(e.tournament_id) === Number(firstTourId)));
    } else {
      setFilteredEvents(events);
    }
    setAssignError("");
    setIsAssignModalOpen(true);
  };

  const handleTourChangeInAssign = (tId) => {
    setAssignForm(prev => ({ ...prev, tournamentId: tId, eventId: "" }));
    if (tId) {
      setFilteredEvents(events.filter(e => Number(e.tournament_id) === Number(tId)));
    } else {
      setFilteredEvents(events);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const body = {
      fullName: form.fullName.trim(),
      designation: form.designation.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      departmentId: form.departmentId ? Number(form.departmentId) : null
    };
    try {
      if (editing === "new") {
        await sportsApi.createCoordinator({
          ...body,
          username: form.username.trim() || undefined
        });
        setEditing(null);
      } else {
        await sportsApi.updateCoordinator(editing.staff_id, body);
        setEditing(null);
      }
      load();
    } catch (err) {
      setFormError(err.message || "Could not save staff details.");
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (e) => {
    e.preventDefault();
    if (!assignForm.eventId) {
      setAssignError("Please select a specific event.");
      return;
    }
    if (!assignForm.staffId) {
      setAssignError("Please select a staff member.");
      return;
    }
    setAssigning(true);
    setAssignError("");
    try {
      await sportsApi.assignStaffToEvent({
        event_id: Number(assignForm.eventId),
        staff_id: Number(assignForm.staffId),
        role: assignForm.role
      });
      setIsAssignModalOpen(false);
      load();
    } catch (err) {
      setAssignError(err.message || "Failed to assign staff coordinator.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm("Remove this event staff assignment?")) return;
    try {
      await sportsApi.removeStaffFromEvent(assignmentId);
      load();
    } catch (err) {
      alert("Failed to remove assignment: " + err.message);
    }
  };

  const toggleActive = async (row) => {
    const next = !row.isActive;
    const msg = next
      ? `Reactivate ${row.fullName}?`
      : `Deactivate ${row.fullName}? Their login is disabled and they are removed from their department. Records are kept.`;
    if (!window.confirm(msg)) return;
    try {
      await sportsApi.setCoordinatorStatus(row.staff_id, next);
      load();
    } catch (err) {
      setPageError(err.message || "Could not update status.");
    }
  };

  const staffColumns = [
    { key: "fullName", label: "Name & Role", render: (v, r) => <div><strong>{v}</strong>{r.designation && <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{r.designation}</div>}</div> },
    { key: "email", label: "Contact", render: (v, r) => <div><div>{v}</div><div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{r.phone || "-"}</div></div> },
    { key: "departmentName", label: "Department", width: "160px", render: (v, r) => v ? `${r.departmentCode ? r.departmentCode + " - " : ""}${v}` : <span style={{ color: "var(--nec-text-muted)" }}>Not assigned</span> },
    { 
      key: "events_count", 
      label: "Event Assignments", 
      width: "150px", 
      render: (v) => (
        <span style={{ fontWeight: 600, color: v > 0 ? "var(--nec-navy)" : "var(--nec-text-muted)" }}>
          {v || 0} event{v === 1 ? "" : "s"}
        </span>
      ) 
    },
    { key: "username", label: "Portal Login", width: "120px", render: (v) => v ? <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{v}</span> : <span style={{ color: "var(--nec-text-muted)" }}>No login</span> },
    { key: "isActive", label: "Status", width: "100px", render: (v) => <Badge status={v ? "success" : "warning"}>{v ? "Active" : "Inactive"}</Badge> },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      sortable: false,
      render: (_, row) => (
        <div style={{ display: "flex", gap: "6px" }}>
          <Button variant="ghost" size="sm" icon={Pencil} aria-label="Edit" title="Edit" onClick={() => openEdit(row)} />
          <Button variant="ghost" size="sm" icon={row.isActive ? UserX : UserCheck} aria-label={row.isActive ? "Deactivate" : "Reactivate"} title={row.isActive ? "Deactivate" : "Reactivate"} onClick={() => toggleActive(row)} />
        </div>
      )
    }
  ];

  const assignmentColumns = [
    {
      key: "tournament_name",
      label: "Tournament",
      render: (v) => <strong>{v}</strong>
    },
    {
      key: "event_name",
      label: "Event & Sport",
      render: (v, r) => (
        <div>
          <div><strong>{v}</strong></div>
          <div style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>{r.sport_name}</div>
        </div>
      )
    },
    {
      key: "staff_name",
      label: "Assigned Coordinator",
      render: (v, r) => (
        <div>
          <div><strong>{v || "Staff Coordinator"}</strong></div>
          <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>{r.staff_email}</div>
        </div>
      )
    },
    {
      key: "role",
      label: "Assigned Duty",
      width: "140px",
      render: (v) => <Badge status="info">{v || "Coordinator"}</Badge>
    },
    {
      key: "actions",
      label: "Actions",
      width: "90px",
      sortable: false,
      render: (_, r) => (
        <Button
          variant="danger"
          size="sm"
          icon={Trash2}
          title="Remove assignment"
          ariaLabel="Remove assignment"
          onClick={() => handleRemoveAssignment(r.id)}
        />
      )
    }
  ];

  const field = (label, key, props = {}) => (
    <div className="nec-form-group">
      <label className="nec-form-label">{label}</label>
      <input className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} />
    </div>
  );

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="nec-page-title" style={{ fontSize: "1.75rem" }}>Staff Coordinators & Event Operations</h1>
          <p className="nec-page-desc">
            Manage institutional physical directors, department faculty coordinators, and active event official assignments.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="outline" icon={Trophy} onClick={openAssignModal}>Assign to Event</Button>
          <Button variant="primary" icon={Plus} onClick={openNew}>Add Staff Member</Button>
        </div>
      </div>

      {pageError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", marginBottom: 12 }}>{pageError}</p>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--nec-border, #e2e8f0)", marginBottom: "16px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "staff" ? "2px solid var(--nec-navy, #1e3a8a)" : "2px solid transparent",
            fontWeight: activeTab === "staff" ? 700 : 500,
            color: activeTab === "staff" ? "var(--nec-navy, #1e3a8a)" : "var(--nec-text-muted, #64748b)",
            cursor: "pointer",
            fontSize: "0.9rem"
          }}
        >
          Staff Directory ({staff.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: "none",
            borderBottom: activeTab === "assignments" ? "2px solid var(--nec-navy, #1e3a8a)" : "2px solid transparent",
            fontWeight: activeTab === "assignments" ? 700 : 500,
            color: activeTab === "assignments" ? "var(--nec-navy, #1e3a8a)" : "var(--nec-text-muted, #64748b)",
            cursor: "pointer",
            fontSize: "0.9rem"
          }}
        >
          Event Staff Assignments ({assignments.length})
        </button>
      </div>

      {activeTab === "staff" ? (
        <Table
          columns={staffColumns}
          data={staff}
          loading={loading}
          searchPlaceholder="Search staff by name, email, department..."
          emptyMessage="No staff coordinators registered yet."
        />
      ) : (
        <Table
          columns={assignmentColumns}
          data={assignments}
          loading={assignmentsLoading}
          searchPlaceholder="Search assignments by tournament, event, coordinator..."
          emptyMessage="No staff assigned to events yet. Click 'Assign to Event' to allocate officials."
        />
      )}

      {/* Add / Edit Staff Modal */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add Staff Member" : `Edit ${editing?.fullName || ""}`} size="md">
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {field("Full name *", "fullName", { required: true, minLength: 3 })}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Designation", "designation", { placeholder: "e.g. Physical Director" })}
            {field("Phone", "phone", { placeholder: "10 digits" })}
          </div>
          {field("Email *", "email", { type: "email", required: true })}
          <div className="nec-form-group">
            <label className="nec-form-label">Department</label>
            <select className="nec-table-search-input" style={{ maxWidth: "100%" }} value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
              <option value="">-- Not assigned --</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
            </select>
          </div>
          {editing === "new" && (
            <div>
              {field("Login username", "username", { placeholder: "defaults to email prefix" })}
            </div>
          )}
          {formError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", margin: 0 }}>{formError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button variant="outline" type="button" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Coordinator to Event Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Coordinator to Event" size="md">
        <form onSubmit={saveAssignment} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="nec-form-group">
            <label className="nec-form-label">Tournament *</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={assignForm.tournamentId}
              onChange={e => handleTourChangeInAssign(e.target.value)}
              required
            >
              <option value="">-- Select Tournament --</option>
              {tournaments.map(t => (
                <option key={t.id || t.tournament_id} value={t.id || t.tournament_id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Event *</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={assignForm.eventId}
              onChange={e => setAssignForm(f => ({ ...f, eventId: e.target.value }))}
              required
            >
              <option value="">-- Select Event --</option>
              {filteredEvents.map(ev => (
                <option key={ev.event_id || ev.id} value={ev.event_id || ev.id}>
                  {ev.name || ev.title} ({ev.sport_name || ev.sport || "Sport"})
                </option>
              ))}
            </select>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Staff Coordinator *</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={assignForm.staffId}
              onChange={e => setAssignForm(f => ({ ...f, staffId: e.target.value }))}
              required
            >
              <option value="">-- Select Staff Coordinator --</option>
              {staff.filter(s => s.user_id).map(s => (
                <option key={s.user_id} value={s.user_id}>
                  {s.fullName} ({s.departmentCode || "General"} — {s.email})
                </option>
              ))}
            </select>
          </div>

          <div className="nec-form-group">
            <label className="nec-form-label">Assigned Duty / Role</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={assignForm.role}
              onChange={e => setAssignForm(f => ({ ...f, role: e.target.value }))}
            >
              <option value="Lead Coordinator">Lead Coordinator</option>
              <option value="Field Coordinator">Field Coordinator</option>
              <option value="Match Official">Match Official</option>
              <option value="Results In-Charge">Results In-Charge</option>
              <option value="Assistant Coordinator">Assistant Coordinator</option>
            </select>
          </div>

          {assignError && <p role="alert" style={{ color: "var(--nec-danger, #b91c1c)", margin: 0 }}>{assignError}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button variant="outline" type="button" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={assigning}>
              {assigning ? "Assigning..." : "Assign Coordinator"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
