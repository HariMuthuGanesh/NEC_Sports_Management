import React, { useEffect, useState } from "react";
import { announcementsApi, tournamentsApi, eventsApi, sportsApi } from "../../services/api/apiServices";
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
  Filter
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
    status: "Published"
  });

  useEffect(() => {
    Promise.all([
      tournamentsApi.getTournaments ? tournamentsApi.getTournaments().catch(() => []) : Promise.resolve([]),
      eventsApi.getEvents ? eventsApi.getEvents().catch(() => []) : Promise.resolve([]),
      sportsApi.getDepartments ? sportsApi.getDepartments().catch(() => []) : Promise.resolve([])
    ]).then(([tData, eData, dData]) => {
      setTournaments(Array.isArray(tData) ? tData : []);
      setEvents(Array.isArray(eData) ? eData : []);
      setDepartments(Array.isArray(dData) ? dData : []);
    }).catch(err => {
      console.warn("Failed to load reference catalogs:", err);
    });
  }, []);

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
      status: "Published"
    });
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
      status: ann.status || "Published"
    });
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

    setSubmitting(true);
    const payload = {
      ...formData,
      status: chosenStatus,
      tournament_id: formData.tournament_id ? Number(formData.tournament_id) : null,
      event_id: formData.event_id ? Number(formData.event_id) : null,
      target_department_id: formData.target_department_id ? Number(formData.target_department_id) : null,
      scheduled_publish_time: chosenStatus === "Scheduled" ? formData.scheduled_publish_time : null,
      expires_at: formData.expires_at || null
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
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label className="nec-form-label">Announcement Title *</label>
            <input
              type="text"
              required
              className="nec-input"
              placeholder="e.g. Inter-Department Meet Schedule & Registration Guidelines"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label className="nec-form-label">Category</label>
              <select
                className="nec-input"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="nec-form-label">Priority Level</label>
              <select
                className="nec-input"
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="Low">Low — General Info</option>
                <option value="Medium">Medium — Schedule Update</option>
                <option value="High">High — Important Notice</option>
                <option value="Urgent">Urgent — Immediate Attention</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label className="nec-form-label">Target Audience</label>
              <select
                className="nec-input"
                value={formData.target_audience}
                onChange={e => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
              >
                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="nec-form-label">Academic Year</label>
              <select
                className="nec-input"
                value={formData.academic_year}
                onChange={e => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2023-2024">2023-2024</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label className="nec-form-label">Tournament Scope (Optional)</label>
              <select
                className="nec-input"
                value={formData.tournament_id}
                onChange={e => setFormData(prev => ({ ...prev, tournament_id: e.target.value, event_id: "" }))}
              >
                <option value="">Institution-wide</option>
                {tournaments.map(t => (
                  <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="nec-form-label">Event Scope (Optional)</label>
              <select
                className="nec-input"
                value={formData.event_id}
                onChange={e => setFormData(prev => ({ ...prev, event_id: e.target.value }))}
              >
                <option value="">No specific event</option>
                {filteredEventsForModal.map(ev => (
                  <option key={ev.event_id} value={ev.event_id}>{ev.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="nec-form-label">Target Department (Optional)</label>
            <select
              className="nec-input"
              value={formData.target_department_id}
              onChange={e => setFormData(prev => ({ ...prev, target_department_id: e.target.value }))}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="nec-form-label">Announcement Body / Content *</label>
            <textarea
              required
              className="nec-input"
              style={{ minHeight: "110px", resize: "vertical" }}
              placeholder="Enter comprehensive announcement content..."
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label className="nec-form-label">Scheduled Publish Time (Optional)</label>
              <input
                type="datetime-local"
                className="nec-input"
                value={formData.scheduled_publish_time}
                onChange={e => setFormData(prev => ({ ...prev, scheduled_publish_time: e.target.value }))}
              />
              <small style={{ color: "var(--nec-text-muted)" }}>Leave blank to publish now.</small>
            </div>

            <div>
              <label className="nec-form-label">Expiry Date / Time (Optional)</label>
              <input
                type="datetime-local"
                className="nec-input"
                value={formData.expires_at}
                onChange={e => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
              <small style={{ color: "var(--nec-text-muted)" }}>Auto-archives after this date.</small>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", flexWrap: "wrap", gap: "8px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>

            <div style={{ display: "flex", gap: "8px" }}>
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
        </div>
      </Modal>
    </div>
  );
}
