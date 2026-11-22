import React, { useState, useEffect, useRef } from "react";
import { galleryApi, eventsApi, tournamentsApi, sportsApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Upload, 
  Trash2, 
  X, 
  Maximize2, 
  FileCheck, 
  Sparkles,
  Film,
  Edit2,
  Filter,
  Search,
  Calendar,
  Trophy,
  Building,
  Activity
} from "lucide-react";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Card } from "../../components/common/Card";
import { Modal } from "../../components/common/Modal";
import "./AdminPortal.css";

const getMediaUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const backendUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");
  return `${backendUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function GalleryManager() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reference Catalogs
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [sports, setSports] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Multi-Dimensional Filters
  const [filterAcademicYear, setFilterAcademicYear] = useState("ALL");
  const [filterTournament, setFilterTournament] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterSport, setFilterSport] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileMediaType, setFileMediaType] = useState("image");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [uploadYear, setUploadYear] = useState("2025-2026");
  const [uploadTournamentId, setUploadTournamentId] = useState("");
  const [uploadEventId, setUploadEventId] = useState("");
  const [uploadSportId, setUploadSportId] = useState("");
  const [uploadDeptId, setUploadDeptId] = useState("");
  const [uploadCapturedAt, setUploadCapturedAt] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Published");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Metadata State
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    caption: "",
    academic_year: "",
    tournament_id: "",
    event_id: "",
    sport_id: "",
    department_id: "",
    captured_at: "",
    publication_status: "Published"
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Lightbox Modal State
  const [activeLightboxItem, setActiveLightboxItem] = useState(null);

  // Initial Catalogs Fetch
  useEffect(() => {
    Promise.all([
      tournamentsApi.getTournaments ? tournamentsApi.getTournaments().catch(() => []) : Promise.resolve([]),
      eventsApi.getEvents ? eventsApi.getEvents().catch(() => []) : Promise.resolve([]),
      sportsApi.getSports ? sportsApi.getSports().catch(() => []) : Promise.resolve([]),
      sportsApi.getDepartments ? sportsApi.getDepartments().catch(() => []) : Promise.resolve([])
    ]).then(([tData, eData, sData, dData]) => {
      setTournaments(Array.isArray(tData) ? tData : []);
      setEvents(Array.isArray(eData) ? eData : []);
      setSports(Array.isArray(sData) ? sData : []);
      setDepartments(Array.isArray(dData) ? dData : []);
    }).catch(err => {
      console.warn("Catalog fetch error:", err);
    });
  }, []);

  const fetchGallery = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await galleryApi.getGallery({
        tournamentId: filterTournament !== "ALL" ? filterTournament : undefined,
        eventId: filterEvent !== "ALL" ? filterEvent : undefined,
        sportId: filterSport !== "ALL" ? filterSport : undefined,
        departmentId: filterDept !== "ALL" ? filterDept : undefined,
        academicYear: filterAcademicYear !== "ALL" ? filterAcademicYear : undefined,
        mediaType: filterType !== "ALL" ? filterType : undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        search: search.trim() || undefined
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load gallery items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [
    filterTournament,
    filterEvent,
    filterSport,
    filterDept,
    filterAcademicYear,
    filterType,
    filterStatus,
    fromDate,
    toDate
  ]);

  // Handle Cascading in Filters: Filter events based on selected tournament
  const filteredEventsForFilter = filterTournament !== "ALL"
    ? events.filter(e => Number(e.tournament_id) === Number(filterTournament))
    : events;

  // Handle Cascading in Upload form: Filter events based on selected tournament
  const filteredEventsForUpload = uploadTournamentId
    ? events.filter(e => Number(e.tournament_id) === Number(uploadTournamentId))
    : events;

  // When upload event changes, auto-derive tournament and sport
  const handleUploadEventChange = (eId) => {
    setUploadEventId(eId);
    if (eId) {
      const ev = events.find(e => Number(e.event_id) === Number(eId));
      if (ev) {
        if (ev.tournament_id && !uploadTournamentId) setUploadTournamentId(String(ev.tournament_id));
        if (ev.sport_id) setUploadSportId(String(ev.sport_id));
      }
    }
  };

  // Handle file selection and live preview generation
  const handleSelectFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please upload an image (PNG, JPG, WEBP) or video (MP4, WEBM) file.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size of 50MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const isVid = file.type.startsWith("video/");
    setFileMediaType(isVid ? "video" : "image");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    if (!title) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleSelectFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setTitle("");
    setCaption("");
    setUploadTournamentId("");
    setUploadEventId("");
    setUploadSportId("");
    setUploadDeptId("");
    setUploadCapturedAt("");
    setUploadStatus("Published");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Please select an image or video to upload.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("media", selectedFile);
    if (title.trim()) formData.append("title", title.trim());
    if (caption.trim()) formData.append("caption", caption.trim());
    if (uploadYear) formData.append("academic_year", uploadYear);
    if (uploadTournamentId) formData.append("tournament_id", uploadTournamentId);
    if (uploadEventId) formData.append("event_id", uploadEventId);
    if (uploadSportId) formData.append("sport_id", uploadSportId);
    if (uploadDeptId) formData.append("department_id", uploadDeptId);
    if (uploadCapturedAt) formData.append("captured_at", uploadCapturedAt);
    if (uploadStatus) formData.append("publication_status", uploadStatus);

    try {
      await galleryApi.uploadMedia(formData);
      toast.success("Institutional media uploaded and saved successfully!");
      handleClearSelection();
      fetchGallery();
    } catch (err) {
      toast.error(err.message || "Failed to upload media. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      title: item.title || "",
      caption: item.caption || "",
      academic_year: item.academic_year || "",
      tournament_id: item.tournament_id ? String(item.tournament_id) : "",
      event_id: item.event_id ? String(item.event_id) : "",
      sport_id: item.sport_id ? String(item.sport_id) : "",
      department_id: item.department_id ? String(item.department_id) : "",
      captured_at: item.captured_at ? item.captured_at.slice(0, 10) : "",
      publication_status: item.publication_status || "Published"
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await galleryApi.updateMedia(editingItem.id, {
        title: editForm.title.trim(),
        caption: editForm.caption.trim(),
        academic_year: editForm.academic_year || null,
        tournament_id: editForm.tournament_id ? Number(editForm.tournament_id) : null,
        event_id: editForm.event_id ? Number(editForm.event_id) : null,
        sport_id: editForm.sport_id ? Number(editForm.sport_id) : null,
        department_id: editForm.department_id ? Number(editForm.department_id) : null,
        captured_at: editForm.captured_at || null,
        publication_status: editForm.publication_status
      });
      toast.success("Media metadata updated successfully.");
      setEditingItem(null);
      fetchGallery();
    } catch (err) {
      toast.error(err.message || "Failed to update media metadata.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id, itemTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${itemTitle || 'this media'}"?`)) return;
    try {
      await galleryApi.deleteMedia(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Media item removed from gallery.");
      if (activeLightboxItem?.id === id) {
        setActiveLightboxItem(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete media.");
    }
  };

  const filteredItems = items.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (item.title || "").toLowerCase().includes(q) ||
                    (item.caption || "").toLowerCase().includes(q) ||
                    (item.tournament_name || "").toLowerCase().includes(q) ||
                    (item.event_name || "").toLowerCase().includes(q) ||
                    (item.sport || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="nec-admin-page">
      {/* Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 className="nec-page-title">Institutional Sports Media & Gallery Manager</h2>
          <p className="nec-page-desc">
            Organize, tag, and publish official campus sports photography and videography linked to tournaments and events.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`nec-btn ${filterType === "ALL" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => setFilterType("ALL")}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            All Media ({items.length})
          </button>
          <button
            type="button"
            className={`nec-btn ${filterType === "Image" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => setFilterType("Image")}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Photos ({items.filter((i) => (i.media_type || i.type) === "image").length})
          </button>
          <button
            type="button"
            className={`nec-btn ${filterType === "Video" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => setFilterType("Video")}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Videos ({items.filter((i) => (i.media_type || i.type) === "video").length})
          </button>
        </div>
      </div>

      {/* Upload New Media Card */}
      <div className="nec-gallery-upload-card" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--nec-gold)" }} />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--nec-navy)" }}>
              Upload Institutional Media
            </h3>
          </div>
          {selectedFile && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="nec-btn nec-btn-ghost"
              style={{ fontSize: "0.8rem", padding: "4px 8px" }}
            >
              <X size={14} /> Clear Selection
            </button>
          )}
        </div>

        {!selectedFile ? (
          <div
            className={`nec-upload-dropzone ${isDragOver ? "drag-active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background: "rgba(0, 43, 73, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--nec-navy)"
                }}
              >
                <Upload size={24} />
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "var(--nec-navy)" }}>Click to browse</span> or drag and drop institutional photos / videos
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>
                Supports JPG, PNG, WEBP, and MP4/WEBM up to 50MB
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="nec-upload-preview-container">
            {/* Media Live Preview */}
            <div className="nec-upload-preview-media">
              {fileMediaType === "video" ? (
                <video src={previewUrl} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <img src={previewUrl} alt="Upload Preview" />
              )}
            </div>

            {/* Structured Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "4px" }}>
                  Media Title <span style={{ color: "var(--nec-danger, #ef4444)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="nec-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Sports Meet 2026 - Basketball Championship"
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "4px" }}>
                  Description / Caption (Optional)
                </label>
                <input
                  type="text"
                  className="nec-input"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Mech Warriors receiving trophy at Indoor Court."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Academic Year</label>
                  <select
                    className="nec-input"
                    value={uploadYear}
                    onChange={e => setUploadYear(e.target.value)}
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>

                <div>
                  <label className="nec-form-label">Tournament (Optional)</label>
                  <select
                    className="nec-input"
                    value={uploadTournamentId}
                    onChange={e => {
                      setUploadTournamentId(e.target.value);
                      setUploadEventId("");
                    }}
                  >
                    <option value="">General Institutional Media</option>
                    {tournaments.map(t => (
                      <option key={t.tournament_id} value={t.tournament_id}>
                        {t.name} ({t.academic_year || 'Current'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Event (Optional)</label>
                  <select
                    className="nec-input"
                    value={uploadEventId}
                    onChange={e => handleUploadEventChange(e.target.value)}
                  >
                    <option value="">No specific event</option>
                    {filteredEventsForUpload.map(ev => (
                      <option key={ev.event_id} value={ev.event_id}>
                        {ev.name} {ev.sport_name ? `(${ev.sport_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="nec-form-label">Sport (Derived or Selectable)</label>
                  <select
                    className="nec-input"
                    value={uploadSportId}
                    onChange={e => setUploadSportId(e.target.value)}
                  >
                    <option value="">General Sports</option>
                    {sports.map(s => (
                      <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Department Association</label>
                  <select
                    className="nec-input"
                    value={uploadDeptId}
                    onChange={e => setUploadDeptId(e.target.value)}
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="nec-form-label">Media Capture Date</label>
                  <input
                    type="date"
                    className="nec-input"
                    value={uploadCapturedAt}
                    onChange={e => setUploadCapturedAt(e.target.value)}
                  />
                </div>

                <div>
                  <label className="nec-form-label">Publication Status</label>
                  <select
                    className="nec-input"
                    value={uploadStatus}
                    onChange={e => setUploadStatus(e.target.value)}
                  >
                    <option value="Published">Published (Public)</option>
                    <option value="Draft">Draft (Internal)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                  <FileCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSelection}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    loading={isUploading}
                    disabled={!title.trim()}
                    icon={Upload}
                  >
                    Publish to Gallery
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <Card className="nec-card" style={{ marginBottom: "20px", padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={15} color="var(--nec-navy)" />
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Filter Media:</span>
          </div>

          <select
            className="nec-input"
            value={filterAcademicYear}
            onChange={e => setFilterAcademicYear(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px" }}
          >
            <option value="ALL">All Academic Years</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2023-2024">2023-2024</option>
          </select>

          <select
            className="nec-input"
            value={filterTournament}
            onChange={e => {
              setFilterTournament(e.target.value);
              setFilterEvent("ALL");
            }}
            style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "160px" }}
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map(t => (
              <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px", minWidth: "140px" }}
          >
            <option value="ALL">All Events</option>
            {filteredEventsForFilter.map(e => (
              <option key={e.event_id} value={e.event_id}>{e.name}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={filterSport}
            onChange={e => setFilterSport(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px" }}
          >
            <option value="ALL">All Sports</option>
            {sports.map(s => (
              <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px" }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.code}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 10px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} color="var(--nec-text-muted)" />
            <input
              type="date"
              className="nec-input"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              placeholder="From"
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>to</span>
            <input
              type="date"
              className="nec-input"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              placeholder="To"
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: "160px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Search size={14} color="var(--nec-text-muted)" />
            <input
              type="text"
              className="nec-input"
              placeholder="Search title, event, caption..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ fontSize: "0.82rem", padding: "5px 10px", width: "100%" }}
            />
          </div>

          {(filterTournament !== "ALL" || filterEvent !== "ALL" || filterSport !== "ALL" || filterDept !== "ALL" || filterAcademicYear !== "ALL" || filterStatus !== "ALL" || fromDate || toDate || search) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterTournament("ALL");
                setFilterEvent("ALL");
                setFilterSport("ALL");
                setFilterDept("ALL");
                setFilterAcademicYear("ALL");
                setFilterStatus("ALL");
                setFromDate("");
                setToDate("");
                setSearch("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Media Grid Section */}
      {error ? (
        <div className="nec-error-state" style={{ padding: "40px", textAlign: "center" }}>
          <p>{error}</p>
          <Button variant="primary" onClick={fetchGallery}>Retry</Button>
        </div>
      ) : loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : filteredItems.length === 0 ? (
        <div
          className="nec-empty-state"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            border: "1px dashed var(--nec-border)",
            borderRadius: "12px",
            background: "var(--nec-surface)"
          }}
        >
          <ImageIcon size={48} style={{ opacity: 0.35, marginBottom: "16px", color: "var(--nec-navy)" }} />
          <h3 style={{ margin: "0 0 8px 0" }}>No Media Found</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>
            No media matching current tournament, event, sport, or date range filters.
          </p>
        </div>
      ) : (
        <div className="nec-admin-gallery-grid">
          {filteredItems.map((item) => {
            const isVideo = (item.media_type || item.type) === "video";
            const mediaUrl = getMediaUrl(item.url || item.media_url);

            return (
              <div key={item.id} className="nec-admin-gallery-card">
                {/* Thumbnail Container */}
                <div
                  className="nec-admin-gallery-thumb-wrap"
                  onClick={() => setActiveLightboxItem(item)}
                >
                  {isVideo ? (
                    <div className="nec-gallery-video-container" style={{ width: "100%", height: "100%", position: "relative", background: "#0f172a" }}>
                      <video
                        src={mediaUrl}
                        preload="metadata"
                        className="nec-admin-gallery-thumb"
                        muted
                        playsInline
                        style={{ objectFit: "cover", width: "100%", height: "100%", pointerEvents: "none" }}
                      />
                      <div className="nec-gallery-video-overlay">
                        <Film size={36} className="nec-gallery-play-icon" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={item.title || "Campus Sports Media"}
                      className="nec-admin-gallery-thumb"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                  )}

                  {/* Badge */}
                  <div className="nec-admin-gallery-badge">
                    {isVideo ? <><VideoIcon size={12} /> Video</> : <><ImageIcon size={12} /> Photo</>}
                  </div>

                  {/* Status Badge */}
                  <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 2 }}>
                    <Badge status={item.publication_status === 'Published' ? 'success' : item.publication_status === 'Draft' ? 'neutral' : 'warning'}>
                      {item.publication_status || 'Published'}
                    </Badge>
                  </div>

                  {/* Zoom Hint */}
                  <div className="nec-admin-gallery-zoom-hint">
                    <Maximize2 size={24} />
                  </div>
                </div>

                {/* Card Info */}
                <div className="nec-admin-gallery-info">
                  <h4 className="nec-admin-gallery-title" title={item.title}>
                    {item.title || "Campus Sports Moment"}
                  </h4>
                  {item.caption && (
                    <p className="nec-admin-gallery-caption" title={item.caption}>
                      {item.caption}
                    </p>
                  )}

                  {/* Institutional Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "6px 0" }}>
                    {item.tournament_name && (
                      <span className="nec-dept-pill" style={{ background: "rgba(0,43,73,0.06)", color: "var(--nec-navy)", fontSize: "0.72rem" }}>
                        <Trophy size={11} style={{ marginRight: "3px" }} /> {item.tournament_name}
                      </span>
                    )}
                    {item.event_name && (
                      <span className="nec-dept-pill" style={{ background: "rgba(217,119,6,0.08)", color: "#b45309", fontSize: "0.72rem" }}>
                        <Activity size={11} style={{ marginRight: "3px" }} /> {item.event_name}
                      </span>
                    )}
                    {item.sport && item.sport !== 'Campus Sports' && (
                      <span className="nec-dept-pill" style={{ fontSize: "0.72rem" }}>
                        {item.sport}
                      </span>
                    )}
                    {item.department_name && (
                      <span className="nec-dept-pill" style={{ background: "rgba(34,197,94,0.08)", color: "#166534", fontSize: "0.72rem" }}>
                        <Building size={11} style={{ marginRight: "3px" }} /> {item.department_code || item.department_name}
                      </span>
                    )}
                  </div>

                  <div className="nec-admin-gallery-footer">
                    <div className="nec-admin-gallery-meta">
                      <span>{item.date || "Recent"}</span>
                      {item.uploadedBy && <span> • {item.uploadedBy}</span>}
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Edit2}
                        onClick={() => handleOpenEdit(item)}
                        title="Edit metadata"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(item.id, item.title)}
                        title="Delete media item"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingItem(null)}
          title="Edit Media Metadata"
        >
          <form onSubmit={handleSaveEdit}>
            <div className="nec-form-group">
              <label className="nec-form-label">Media Title *</label>
              <input
                type="text"
                className="nec-input"
                value={editForm.title}
                onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">Caption / Description</label>
              <input
                type="text"
                className="nec-input"
                value={editForm.caption}
                onChange={e => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="nec-form-group">
                <label className="nec-form-label">Academic Year</label>
                <select
                  className="nec-input"
                  value={editForm.academic_year}
                  onChange={e => setEditForm(prev => ({ ...prev, academic_year: e.target.value }))}
                >
                  <option value="">Select Year</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Tournament</label>
                <select
                  className="nec-input"
                  value={editForm.tournament_id}
                  onChange={e => setEditForm(prev => ({ ...prev, tournament_id: e.target.value, event_id: "" }))}
                >
                  <option value="">General Institutional Media</option>
                  {tournaments.map(t => (
                    <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="nec-form-group">
                <label className="nec-form-label">Event</label>
                <select
                  className="nec-input"
                  value={editForm.event_id}
                  onChange={e => {
                    const eId = e.target.value;
                    const ev = events.find(item => Number(item.event_id) === Number(eId));
                    setEditForm(prev => ({
                      ...prev,
                      event_id: eId,
                      sport_id: ev?.sport_id ? String(ev.sport_id) : prev.sport_id,
                      tournament_id: ev?.tournament_id && !prev.tournament_id ? String(ev.tournament_id) : prev.tournament_id
                    }));
                  }}
                >
                  <option value="">No specific event</option>
                  {(editForm.tournament_id
                    ? events.filter(e => Number(e.tournament_id) === Number(editForm.tournament_id))
                    : events
                  ).map(ev => (
                    <option key={ev.event_id} value={ev.event_id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Sport</label>
                <select
                  className="nec-input"
                  value={editForm.sport_id}
                  onChange={e => setEditForm(prev => ({ ...prev, sport_id: e.target.value }))}
                >
                  <option value="">Campus Sports</option>
                  {sports.map(s => (
                    <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="nec-form-group">
                <label className="nec-form-label">Department Association</label>
                <select
                  className="nec-input"
                  value={editForm.department_id}
                  onChange={e => setEditForm(prev => ({ ...prev, department_id: e.target.value }))}
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Capture Date</label>
                <input
                  type="date"
                  className="nec-input"
                  value={editForm.captured_at}
                  onChange={e => setEditForm(prev => ({ ...prev, captured_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="nec-form-group">
              <label className="nec-form-label">Publication Status</label>
              <select
                className="nec-input"
                value={editForm.publication_status}
                onChange={e => setEditForm(prev => ({ ...prev, publication_status: e.target.value }))}
              >
                <option value="Published">Published (Public)</option>
                <option value="Draft">Draft (Internal)</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={savingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Lightbox Modal */}
      {activeLightboxItem && (
        <div
          className="nec-gallery-lightbox-overlay"
          onClick={() => setActiveLightboxItem(null)}
        >
          <div
            className="nec-gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nec-gallery-lightbox-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="nec-gallery-lightbox-type">
                  {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" ? "Video Player" : "Photo Viewer"}
                </span>
                <Badge status={activeLightboxItem.publication_status === 'Published' ? 'success' : 'neutral'}>
                  {activeLightboxItem.publication_status || 'Published'}
                </Badge>
              </div>
              <button
                type="button"
                className="nec-gallery-lightbox-close"
                onClick={() => setActiveLightboxItem(null)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="nec-gallery-lightbox-media">
              {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" ? (
                <video
                  src={getMediaUrl(activeLightboxItem.url || activeLightboxItem.media_url)}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  style={{ width: "100%", maxHeight: "65vh", backgroundColor: "#000" }}
                >
                  Your browser does not support HTML5 video playback.
                </video>
              ) : (
                <img
                  src={getMediaUrl(activeLightboxItem.url || activeLightboxItem.media_url)}
                  alt={activeLightboxItem.title}
                />
              )}
            </div>

            <div className="nec-gallery-lightbox-footer">
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem", fontWeight: 700 }}>
                  {activeLightboxItem.title}
                </h3>
                {activeLightboxItem.caption && (
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
                    {activeLightboxItem.caption}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "6px 0" }}>
                  {activeLightboxItem.tournament_name && (
                    <Badge status="info">Tournament: {activeLightboxItem.tournament_name}</Badge>
                  )}
                  {activeLightboxItem.event_name && (
                    <Badge status="warning">Event: {activeLightboxItem.event_name}</Badge>
                  )}
                  {activeLightboxItem.sport && (
                    <Badge status="neutral">Sport: {activeLightboxItem.sport}</Badge>
                  )}
                  {activeLightboxItem.department_name && (
                    <Badge status="success">Dept: {activeLightboxItem.department_name}</Badge>
                  )}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "4px", display: "inline-block" }}>
                  {activeLightboxItem.date} {activeLightboxItem.uploadedBy ? `• Uploaded by ${activeLightboxItem.uploadedBy}` : ""}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit2}
                  onClick={() => {
                    handleOpenEdit(activeLightboxItem);
                    setActiveLightboxItem(null);
                  }}
                >
                  Edit Metadata
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => handleDelete(activeLightboxItem.id, activeLightboxItem.title)}
                >
                  Delete
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveLightboxItem(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
