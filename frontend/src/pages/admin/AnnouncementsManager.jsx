import React, { useEffect, useState } from "react";
import { announcementsApi, tournamentsApi, eventsApi, sportsApi, studentLookupApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { useToast } from "../../context/ToastContext";
import {
  Megaphone,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Edit2,
  XCircle,
  Trophy,
  Activity,
  Building,
  Users,
  AlertTriangle,
  Search,
  Filter,
  Mail
} from "lucide-react";
import "./AdminPortal.css";

const CATEGORIES = [
  "General",
  "Tournament",
  "Fixture",
  "Selection",
  "Urgent",
  "Circular"
];

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const AUDIENCES = ["All", "Students", "Staff", "Coordinators"];
const STATUS_TABS = ["ALL", "Published", "Scheduled", "Draft", "Expired", "Cancelled"];

export default function AnnouncementsManager() {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reference Catalogs
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sports, setSports] = useState([]);

  // Custom Student Email Picker State
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Filter States
  const [statusTab, setStatusTab] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [filterAudience, setFilterAudience] = useState("ALL");
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "Medium",
    category: "General",
    target_audience: "All",
    academic_year: "2025-2026",
    tournament_id: "",
    event_id: "",
    target_department_id: "",
    scheduled_publish_time: "",
    expires_at: "",
    status: "Published",
    email_scope: "all",
    email_department_id: "",
    email_sport_id: ""
  });

  useEffect(() => {
    Promise.all([
      tournamentsApi.getTournaments ? tournamentsApi.getTournaments().catch(() => []) : Promise.resolve([]),
      eventsApi.getEvents ? eventsApi.getEvents().catch(() => []) : Promise.resolve([]),
      sportsApi.getDepartments ? sportsApi.getDepartments().catch(() => []) : Promise.resolve([]),
      sportsApi.getSports ? sportsApi.getSports().catch(() => []) : Promise.resolve([])
    ]).then(([tData, eData, dData, sData]) => {
      setTournaments(Array.isArray(tData) ? tData : []);
      setEvents(Array.isArray(eData) ? eData : []);
      setDepartments(Array.isArray(dData) ? dData : []);
      setSports(Array.isArray(sData) ? sData : []);
    }).catch(err => {
      console.warn("Failed to load reference catalogs:", err);
    });
  }, []);

  useEffect(() => {
    const q = studentQuery.trim();
    if (formData.email_scope !== "custom" || q.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(() => {
      studentLookupApi.searchStudent(q)
        .then(rows => setStudentResults(Array.isArray(rows) ? rows.slice(0, 8) : []))
        .catch(() => setStudentResults([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [studentQuery, formData.email_scope]);

  const loadAnnouncements = () => {
    setLoading(true);
    setError(null);
    announcementsApi.getAnnouncements({
      status: statusTab !== "ALL" ? statusTab : undefined,
      category: filterCategory !== "ALL" ? filterCategory : undefined,
      priority: filterPriority !== "ALL" ? filterPriority : undefined,
      targetAudience: filterAudience !== "ALL" ? filterAudience : undefined,
      search: search.trim() || undefined
    }).then(data => {
      setList(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError(err.message || "Failed to load announcements.");
      setLoading(false);
    });
  };

  useEffect(() => {
    loadAnnouncements();
  }, [statusTab, filterCategory, filterPriority, filterAudience]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: "",
      content: "",
      priority: "Medium",
      category: "General",
      target_audience: "All",
      academic_year: "2025-2026",
      tournament_id: "",
      event_id: "",
      target_department_id: "",
      scheduled_publish_time: "",
      expires_at: "",
      status: "Published",
      email_scope: "all",
      email_department_id: "",
      email_sport_id: ""
    });
    setSelectedStudents([]);
    setStudentQuery("");
    setStudentResults([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setEditingId(ann.id || ann.announcement_id);
    const toDatetimeLocal = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };

    setFormData({
      title: ann.title || "",
      content: ann.content || "",
      priority: ann.priority || "Medium",
      category: ann.category || "General",
      target_audience: ann.target_audience || "All",
      academic_year: ann.academic_year || "2025-2026",
      tournament_id: ann.tournament_id ? String(ann.tournament_id) : "",
      event_id: ann.event_id ? String(ann.event_id) : "",
      target_department_id: ann.target_department_id ? String(ann.target_department_id) : "",
      scheduled_publish_time: toDatetimeLocal(ann.scheduled_publish_time),
      expires_at: toDatetimeLocal(ann.expires_at),
      status: ann.status || "Published",
      email_scope: "all",
      email_department_id: ann.target_department_id ? String(ann.target_department_id) : "",
      email_sport_id: ""
    });
    setSelectedStudents([]);
    setStudentQuery("");
    setStudentResults([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (chosenStatus) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please fill in both title and announcement details.");
      return;
    }

    if (chosenStatus === "Scheduled" && !formData.scheduled_publish_time) {
      toast.error("Please specify a scheduled publish date and time.");
      return;
    }

    if (chosenStatus === "Scheduled" && new Date(formData.scheduled_publish_time).getTime() <= Date.now()) {
      toast.error("Scheduled publish time must be in the future.");
      return;
    }

    if (chosenStatus === "Published" && formData.email_scope === "department" && !formData.email_department_id) {
      toast.error("Please select a department for department-wise email.");
      return;
    }
    if (chosenStatus === "Published" && formData.email_scope === "sport" && !formData.email_sport_id) {
      toast.error("Please select a sport for sport-wise email.");
      return;
    }
    if (chosenStatus === "Published" && formData.email_scope === "custom" && selectedStudents.length === 0) {
      toast.error("Please select or add at least one student to email.");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      status: chosenStatus,
      tournament_id: formData.tournament_id ? Number(formData.tournament_id) : null,
      event_id: formData.event_id ? Number(formData.event_id) : null,
      target_department_id: formData.target_department_id ? Number(formData.target_department_id) : null,
      scheduled_publish_time: chosenStatus === "Scheduled" ? formData.scheduled_publish_time : null,
      expires_at: formData.expires_at || null,
      send_email: formData.email_scope !== "none",
      email_scope: formData.email_scope,
      email_department_id: formData.email_department_id ? Number(formData.email_department_id) : null,
      email_sport_id: formData.email_sport_id ? Number(formData.email_sport_id) : null,
      email_register_numbers: selectedStudents.map(s => s.registerNumber)
    };

    try {
      if (editingId) {
        await announcementsApi.updateAnnouncement(editingId, payload);
        toast.success("Announcement updated successfully.");
      } else {
        await announcementsApi.createAnnouncement(payload);
        toast.success(
          chosenStatus === "Scheduled"
            ? "Announcement scheduled successfully."
            : chosenStatus === "Draft"
            ? "Draft saved successfully."
            : "Announcement published successfully."
        );
      }
      setIsModalOpen(false);
      loadAnnouncements();
    } catch (err) {
      toast.error(err.message || "Failed to save announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelScheduled = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled announcement?")) return;
    try {
      await announcementsApi.cancelAnnouncement(id);
      toast.success("Scheduled announcement cancelled.");
      loadAnnouncements();
    } catch (err) {
      toast.error(err.message || "Failed to cancel announcement.");
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;
    announcementsApi.deleteAnnouncement(id).then(() => {
      toast.success("Announcement deleted.");
      loadAnnouncements();
    }).catch(err => {
      toast.error(err.message || "Failed to delete announcement.");
    });
  };

  const filteredList = list.filter(ann => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (ann.title || "").toLowerCase().includes(q) ||
                    (ann.content || "").toLowerCase().includes(q) ||
                    (ann.tournament_name || "").toLowerCase().includes(q) ||
                    (ann.event_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const filteredEventsForModal = formData.tournament_id
    ? events.filter(e => Number(e.tournament_id) === Number(formData.tournament_id))
    : events;

  const getStatusBadge = (status) => {
    switch (status) {
      case "Published": return <Badge status="success">Published</Badge>;
      case "Scheduled": return <Badge status="info">Scheduled</Badge>;
      case "Draft": return <Badge status="neutral">Draft</Badge>;
      case "Expired": return <Badge status="warning">Expired</Badge>;
      case "Cancelled": return <Badge status="danger">Cancelled</Badge>;
      default: return <Badge status="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case "Urgent": return <Badge status="danger">Urgent</Badge>;
      case "High": return <Badge status="warning">High Priority</Badge>;
      case "Medium": return <Badge status="info">Medium</Badge>;
      default: return <Badge status="neutral">Low</Badge>;
    }
  };

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 className="nec-page-title">Institutional Announcements & Circulars</h2>
          <p className="nec-page-desc">
            Official communications, tournament circulars, schedule notices, and scheduled institutional broadcasts.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
          Post New Announcement
        </Button>
      </div>

      {/* ── Status Lifecycle Tabs ── */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: `1.5px solid ${statusTab === tab ? "var(--nec-navy)" : "var(--nec-border-light)"}`,
              background: statusTab === tab ? "var(--nec-navy)" : "transparent",
              color: statusTab === tab ? "#fff" : "var(--nec-text-muted)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {tab === "ALL" ? "All Announcements" : tab}
          </button>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <Card className="nec-card" style={{ marginBottom: "20px", padding: "12px 16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Filters:</span>
          </div>

          <select
            className="nec-input"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "130px" }}
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            className="nec-input"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "120px" }}
          >
            <option value="ALL">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            className="nec-input"
            value={filterAudience}
            onChange={e => setFilterAudience(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "130px" }}
          >
            <option value="ALL">All Audiences</option>
            {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <div style={{ flex: 1, minWidth: "180px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Search size={14} color="var(--nec-text-muted)" />
            <input
              type="text"
              className="nec-input"
              placeholder="Search circulars, title, tournament..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "5px 10px", width: "100%" }}
            />
          </div>

          {(filterCategory !== "ALL" || filterPriority !== "ALL" || filterAudience !== "ALL" || search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterCategory("ALL");
                setFilterPriority("ALL");
                setFilterAudience("ALL");
                setSearch("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* ── Announcements Content ── */}
      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadAnnouncements} />
        </div>
      ) : loading ? (
        <SkeletonLoader rows={3} />
      ) : filteredList.length === 0 ? (
        <div style={{ padding: "40px" }}>
          <EmptyState
            icon={Megaphone}
            title="No Announcements Found"
            message="No announcements match the selected filter or status criteria."
          />
        </div>
      ) : (
        <div className="nec-ann-full-list">
          {filteredList.map(ann => {
            const isScheduled = ann.status === "Scheduled";
            return (
              <Card key={ann.id || ann.announcement_id} className="nec-ann-card">
                <div className="nec-ann-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      {getStatusBadge(ann.status || "Published")}
                      <Badge status="info">{ann.category || "General"}</Badge>
                      {getPriorityBadge(ann.priority)}
                      {ann.target_audience && ann.target_audience !== "All" && (
                        <span className="nec-dept-pill" style={{ fontSize: "0.74rem" }}>
                          <Users size={12} style={{ marginRight: "3px" }} /> {ann.target_audience}
                        </span>
                      )}
                    </div>

                    <div className="nec-ann-tag-row" style={{ marginTop: "4px" }}>
                      {isScheduled && ann.scheduled_publish_time ? (
                        <span className="nec-ann-date" style={{ color: "#0284c7", fontWeight: 600 }}>
                          <Clock size={13} style={{ marginRight: "3px" }} />
                          Scheduled for: {new Date(ann.scheduled_publish_time).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="nec-ann-date">
                          <Calendar size={13} style={{ marginRight: "3px" }} />
                          {ann.date || (ann.postedDate ? new Date(ann.postedDate).toLocaleDateString('en-IN') : 'Recent')}
                        </span>
                      )}
                      <span className="nec-ann-by">• Posted by {ann.author || ann.author_name || 'Sports Office'}</span>
                      {ann.expires_at && (
                        <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                          • Expires: {new Date(ann.expires_at).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    {isScheduled && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={XCircle}
                        onClick={() => handleCancelScheduled(ann.id || ann.announcement_id)}
                        title="Cancel Schedule"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                      onClick={() => handleOpenEdit(ann)}
                      title="Edit Announcement"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => handleDelete(ann.id || ann.announcement_id)}
                      title="Delete Announcement"
                      ariaLabel="Delete Announcement"
                    />
                  </div>
                </div>

                <h3 className="nec-ann-title" style={{ marginTop: "12px", fontSize: "1.05rem" }}>
                  {ann.title}
                </h3>
                <p className="nec-ann-body" style={{ whiteSpace: "pre-line", margin: "8px 0" }}>
                  {ann.content}
                </p>

                {/* Scoped Tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                  {ann.tournament_name && (
                    <span className="nec-dept-pill" style={{ background: "rgba(0,43,73,0.06)", color: "var(--nec-navy)" }}>
                      <Trophy size={11} style={{ marginRight: "3px" }} /> {ann.tournament_name}
                    </span>
                  )}
                  {ann.event_name && (
                    <span className="nec-dept-pill" style={{ background: "rgba(217,119,6,0.08)", color: "#b45309" }}>
                      <Activity size={11} style={{ marginRight: "3px" }} /> {ann.event_name}
                    </span>
                  )}
                  {ann.department_name && (
                    <span className="nec-dept-pill" style={{ background: "rgba(34,197,94,0.08)", color: "#166534" }}>
                      <Building size={11} style={{ marginRight: "3px" }} /> {ann.department_name}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modal: Create / Edit Announcement ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Institutional Announcement" : "Post Official Announcement / Circular"}
        size="lg"
        maxWidth="780px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "10px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>

            <div style={{ display: "flex", gap: "10px" }}>
              <Button
                variant="outline"
                loading={submitting}
                onClick={() => handleSubmit("Draft")}
              >
                Save Draft
              </Button>

              {formData.scheduled_publish_time ? (
                <Button
                  variant="primary"
                  loading={submitting}
                  icon={Clock}
                  onClick={() => handleSubmit("Scheduled")}
                >
                  Schedule Announcement
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={submitting}
                  icon={Megaphone}
                  onClick={() => handleSubmit("Published")}
                >
                  Publish Now
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="nec-ann-modal-form" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 1. Title */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Announcement Title *</label>
            <input
              type="text"
              required
              className="nec-input"
              style={{ width: "100%", boxSizing: "border-box" }}
              placeholder="e.g. Inter-Department Meet Schedule & Registration Guidelines"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          {/* 2. Classification & Audience */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Category</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Priority Level</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="Low">Low — General Info</option>
                <option value="Medium">Medium — Schedule Update</option>
                <option value="High">High — Important Notice</option>
                <option value="Urgent">Urgent — Immediate Attention</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Target Audience</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.target_audience}
                onChange={e => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
              >
                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Academic Year</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.academic_year}
                onChange={e => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
              </select>
            </div>
          </div>

          {/* 3. Body */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Announcement Body / Content *</label>
            <textarea
              required
              className="nec-input"
              style={{ width: "100%", boxSizing: "border-box", minHeight: "120px", resize: "vertical" }}
              placeholder="Enter comprehensive announcement content..."
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            />
          </div>

          {/* 4. Optional Scope */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Tournament Scope (Optional)</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.tournament_id}
                onChange={e => setFormData(prev => ({ ...prev, tournament_id: e.target.value, event_id: "" }))}
              >
                <option value="">Institution-wide</option>
                {tournaments.map(t => (
                  <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Event Scope (Optional)</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.event_id}
                onChange={e => setFormData(prev => ({ ...prev, event_id: e.target.value }))}
              >
                <option value="">No specific event</option>
                {filteredEventsForModal.map(ev => (
                  <option key={ev.event_id} value={ev.event_id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Target Department (Optional)</label>
              <select
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.target_department_id}
                onChange={e => setFormData(prev => ({ ...prev, target_department_id: e.target.value }))}
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Scheduling */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Scheduled Publish Time (Optional)</label>
              <input
                type="datetime-local"
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.scheduled_publish_time}
                onChange={e => setFormData(prev => ({ ...prev, scheduled_publish_time: e.target.value }))}
              />
              <small style={{ color: "var(--nec-text-muted)" }}>Leave blank to publish now.</small>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Expiry Date / Time (Optional)</label>
              <input
                type="datetime-local"
                className="nec-input"
                style={{ width: "100%", boxSizing: "border-box" }}
                value={formData.expires_at}
                onChange={e => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
              <small style={{ color: "var(--nec-text-muted)" }}>Auto-archives after this date.</small>
            </div>
          </div>

          {/* 6. Email Notification Targeting */}
          <div className="nec-ann-email-box">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "0.86rem", color: "var(--nec-navy, #0b2c5d)" }}>
              <Mail size={15} />
              <span>College Email Delivery (Sports-Interested Students)</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: formData.email_scope === "department" || formData.email_scope === "sport" ? "1fr 1fr" : "1fr", gap: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Send Email To</label>
                <select
                  className="nec-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={formData.email_scope}
                  onChange={e => setFormData(prev => ({ ...prev, email_scope: e.target.value }))}
                >
                  <option value="all">All Sports-Interested Students</option>
                  <option value="department">Department-Wise (Interested Students)</option>
                  <option value="sport">Sport-Wise (Participants / Squads)</option>
                  <option value="custom">Particular Student(s)</option>
                  <option value="none">Do Not Send Email</option>
                </select>
              </div>

              {formData.email_scope === "department" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Select Department *</label>
                  <select
                    className="nec-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formData.email_department_id}
                    onChange={e => setFormData(prev => ({ ...prev, email_department_id: e.target.value }))}
                  >
                    <option value="">-- Choose Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.email_scope === "sport" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label className="nec-form-label" style={{ display: "block", margin: 0 }}>Select Sport *</label>
                  <select
                    className="nec-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={formData.email_sport_id}
                    onChange={e => setFormData(prev => ({ ...prev, email_sport_id: e.target.value }))}
                  >
                    <option value="">-- Choose Sport --</option>
                    {sports.map(sp => (
                      <option key={sp.sport_id || sp.id} value={sp.sport_id || sp.id}>{sp.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {formData.email_scope === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    className="nec-input"
                    style={{ flex: 1, boxSizing: "border-box" }}
                    placeholder="Search by student name or register no (e.g. 24104111)..."
                    value={studentQuery}
                    onChange={e => setStudentQuery(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const reg = studentQuery.trim();
                      if (!reg) return;
                      if (!selectedStudents.some(s => s.registerNumber.toLowerCase() === reg.toLowerCase())) {
                        setSelectedStudents(prev => [...prev, { registerNumber: reg, name: reg }]);
                      }
                      setStudentQuery("");
                      setStudentResults([]);
                    }}
                  >
                    Add Reg No
                  </Button>
                </div>

                {studentResults.length > 0 && (
                  <div style={{ border: "1px solid var(--nec-border, #cbd5e1)", borderRadius: "6px", background: "#fff", maxHeight: "150px", overflowY: "auto" }}>
                    {studentResults.map(st => {
                      const reg = st.registerNumber || st.register_number || st.rollNo;
                      const name = st.studentName || st.student_name || st.name || reg;
                      return (
                        <button
                          key={reg}
                          type="button"
                          onClick={() => {
                            if (reg && !selectedStudents.some(s => s.registerNumber === reg)) {
                              setSelectedStudents(prev => [...prev, { registerNumber: reg, name }]);
                            }
                            setStudentQuery("");
                            setStudentResults([]);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 12px",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            background: "transparent",
                            cursor: "pointer",
                            fontSize: "0.84rem",
                            display: "flex",
                            justifyContent: "space-between"
                          }}
                        >
                          <span><strong>{name}</strong> ({reg})</span>
                          <span style={{ color: "#64748b" }}>{String(reg).toLowerCase()}@nec.edu.in</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedStudents.map(st => (
                      <span
                        key={st.registerNumber}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          background: "#e0f2fe",
                          color: "#0369a1",
                          fontSize: "0.8rem",
                          fontWeight: 600
                        }}
                      >
                        {st.name !== st.registerNumber ? `${st.name} (${st.registerNumber})` : st.registerNumber}
                        <button
                          type="button"
                          onClick={() => setSelectedStudents(prev => prev.filter(x => x.registerNumber !== st.registerNumber))}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: "#0369a1", fontWeight: 700, padding: 0 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
