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
  Clock,
  Trophy,
  Building,
  Activity,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RotateCcw,
  Check
} from "lucide-react";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import { Card } from "../../components/common/Card";
import { Modal } from "../../components/common/Modal";
import { formatScope, getScopeBadge } from "../../utils/scopeLabels";
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
  const [filterScope, setFilterScope] = useState("ALL"); // ALL | Intramural | Inter-Collegiate
  const [filterAcademicYear, setFilterAcademicYear] = useState("ALL");
  const [filterTournament, setFilterTournament] = useState("ALL");
  const [filterEvent, setFilterEvent] = useState("ALL");
  const [filterSport, setFilterSport] = useState("ALL");
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | title
  const [search, setSearch] = useState("");

  // Custom Date & Time Range state
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("");
  const [appliedDateRange, setAppliedDateRange] = useState({ fromDate: "", fromTime: "", toDate: "", toTime: "" });
  const [dateRangeError, setDateRangeError] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileMediaType, setFileMediaType] = useState("image");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [uploadScope, setUploadScope] = useState("Intramural");
  const [uploadYear, setUploadYear] = useState("2026-2027");
  const [uploadTournamentId, setUploadTournamentId] = useState("");
  const [uploadEventId, setUploadEventId] = useState("");
  const [uploadSportId, setUploadSportId] = useState("");
  const [uploadDeptId, setUploadDeptId] = useState("");
  const [uploadAssociatedDeptIds, setUploadAssociatedDeptIds] = useState([]);
  const [uploadCapturedDate, setUploadCapturedDate] = useState("");
  const [uploadCapturedTime, setUploadCapturedTime] = useState("");
  const [uploadStatus, setUploadStatus] = useState("Published");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Edit Metadata State
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    caption: "",
    scope: "Intramural",
    academic_year: "",
    tournament_id: "",
    event_id: "",
    sport_id: "",
    department_id: "",
    associated_departments: [],
    captured_date: "",
    captured_time: "",
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
        scope: filterScope !== "ALL" ? filterScope : undefined,
        tournamentId: filterTournament !== "ALL" ? filterTournament : undefined,
        eventId: filterEvent !== "ALL" ? filterEvent : undefined,
        sportId: filterSport !== "ALL" ? filterSport : undefined,
        departmentId: filterDept !== "ALL" ? filterDept : undefined,
        academicYear: filterAcademicYear !== "ALL" ? filterAcademicYear : undefined,
        mediaType: filterType !== "ALL" ? filterType : undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        sortBy: sortBy,
        fromDate: appliedDateRange.fromDate || undefined,
        fromTime: appliedDateRange.fromTime || undefined,
        toDate: appliedDateRange.toDate || undefined,
        toTime: appliedDateRange.toTime || undefined,
        search: search.trim() || undefined
      });
      setItems(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      setError(err.message || "Failed to load gallery items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, [
    filterScope,
    filterTournament,
    filterEvent,
    filterSport,
    filterDept,
    filterAcademicYear,
    filterType,
    filterStatus,
    sortBy,
    appliedDateRange
  ]);

  // Handle Cascading in Filters: Filter events based on selected tournament
  const filteredEventsForFilter = filterTournament !== "ALL"
    ? events.filter(e => Number(e.tournament_id) === Number(filterTournament))
    : events;

  // Handle Cascading in Upload form: Filter events based on selected tournament
  const filteredEventsForUpload = uploadTournamentId
    ? events.filter(e => Number(e.tournament_id) === Number(uploadTournamentId))
    : events;

  // When upload tournament changes, auto-derive scope if tournament has scope
  const handleUploadTournamentChange = (tId) => {
    setUploadTournamentId(tId);
    setUploadEventId("");
    if (tId) {
      const tour = tournaments.find(t => Number(t.tournament_id) === Number(tId));
      if (tour?.scope) {
        setUploadScope(tour.scope);
      }
    }
  };

  // When upload event changes, auto-derive tournament, sport, and scope
  const handleUploadEventChange = (eId) => {
    setUploadEventId(eId);
    if (eId) {
      const ev = events.find(e => Number(e.event_id) === Number(eId));
      if (ev) {
        if (ev.tournament_id && !uploadTournamentId) {
          setUploadTournamentId(String(ev.tournament_id));
          const tour = tournaments.find(t => Number(t.tournament_id) === Number(ev.tournament_id));
          if (tour?.scope) setUploadScope(tour.scope);
        }
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
    setUploadScope("Intramural");
    setUploadTournamentId("");
    setUploadEventId("");
    setUploadSportId("");
    setUploadDeptId("");
    setUploadAssociatedDeptIds([]);
    setUploadCapturedDate("");
    setUploadCapturedTime("");
    setUploadStatus("Published");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Apply Custom Date & Time Range with Institutional Validation
  const handleApplyDateRange = () => {
    setDateRangeError("");
    if (fromDate && toDate) {
      const startIso = `${fromDate}T${fromTime || "00:00"}:00`;
      const endIso = `${toDate}T${toTime || "23:59"}:59`;
      if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
        const errMsg = "Ending date & time cannot be earlier than starting date & time.";
        setDateRangeError(errMsg);
        toast.error(errMsg);
        return;
      }
    }
    setAppliedDateRange({ fromDate, fromTime, toDate, toTime });
    setCurrentPage(1);
    toast.success("Date & time range filter applied.");
  };

  const handleResetDateRange = () => {
    setFromDate("");
    setFromTime("");
    setToDate("");
    setToTime("");
    setDateRangeError("");
    setAppliedDateRange({ fromDate: "", fromTime: "", toDate: "", toTime: "" });
    setCurrentPage(1);
  };

  const handleToggleAssociatedDept = (deptId) => {
    setUploadAssociatedDeptIds(prev => 
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const handleToggleEditAssociatedDept = (deptId) => {
    setEditForm(prev => {
      const current = Array.isArray(prev.associated_departments) ? prev.associated_departments : [];
      const updated = current.includes(deptId) ? current.filter(id => id !== deptId) : [...current, deptId];
      return { ...prev, associated_departments: updated };
    });
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
    if (uploadScope) formData.append("scope", uploadScope);
    if (uploadYear) formData.append("academic_year", uploadYear);
    if (uploadTournamentId) formData.append("tournament_id", uploadTournamentId);
    if (uploadEventId) formData.append("event_id", uploadEventId);
    if (uploadSportId) formData.append("sport_id", uploadSportId);
    if (uploadDeptId) formData.append("department_id", uploadDeptId);
    if (uploadAssociatedDeptIds.length > 0) {
      formData.append("associated_departments", JSON.stringify(uploadAssociatedDeptIds));
    }
    if (uploadCapturedDate) {
      formData.append("captured_at", uploadCapturedDate);
      if (uploadCapturedTime) formData.append("captured_time", uploadCapturedTime);
    }
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
    let capturedDate = "";
    let capturedTime = "";
    if (item.captured_at) {
      capturedDate = item.captured_at.slice(0, 10);
      if (item.captured_at.includes("T")) {
        capturedTime = item.captured_at.split("T")[1]?.slice(0, 5) || "";
      }
    }
    setEditForm({
      title: item.title || "",
      caption: item.caption || "",
      scope: item.scope || "Intramural",
      academic_year: item.academic_year || "",
      tournament_id: item.tournament_id ? String(item.tournament_id) : "",
      event_id: item.event_id ? String(item.event_id) : "",
      sport_id: item.sport_id ? String(item.sport_id) : "",
      department_id: item.department_id ? String(item.department_id) : "",
      associated_departments: Array.isArray(item.associated_departments) ? item.associated_departments : [],
      captured_date: capturedDate,
      captured_time: capturedTime,
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
        scope: editForm.scope || "Intramural",
        academic_year: editForm.academic_year || null,
        tournament_id: editForm.tournament_id ? Number(editForm.tournament_id) : null,
        event_id: editForm.event_id ? Number(editForm.event_id) : null,
        sport_id: editForm.sport_id ? Number(editForm.sport_id) : null,
        department_id: editForm.department_id ? Number(editForm.department_id) : null,
        associated_departments: editForm.associated_departments,
        captured_at: editForm.captured_date || null,
        captured_time: editForm.captured_time || null,
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

  const handleTogglePublish = async (item, e) => {
    if (e) e.stopPropagation();
    const newStatus = item.publication_status === "Published" ? "Draft" : "Published";
    try {
      await galleryApi.updateMedia(item.id, {
        publication_status: newStatus
      });
      toast.success(`Media marked as ${newStatus}.`);
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, publication_status: newStatus, is_public: newStatus === "Published" } : it));
      if (activeLightboxItem?.id === item.id) {
        setActiveLightboxItem(prev => ({ ...prev, publication_status: newStatus, is_public: newStatus === "Published" }));
      }
    } catch (err) {
      toast.error(err.message || "Failed to update publication status.");
    }
  };

  const handleDelete = async (id, itemTitle, e) => {
    if (e) e.stopPropagation();
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

  // Client-side search and filtering
  const filteredItems = items.filter((item) => {
    if (filterScope !== "ALL") {
      const isInter = item.scope === "Inter-Collegiate" || item.tournament_scope === "Inter-Collegiate";
      const itemScope = isInter ? "Inter-Collegiate" : "Intramural";
      if (itemScope !== filterScope) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (item.title || "").toLowerCase().includes(q) ||
                    (item.caption || "").toLowerCase().includes(q) ||
                    (item.tournament_name || "").toLowerCase().includes(q) ||
                    (item.event_name || "").toLowerCase().includes(q) ||
                    (item.sport || "").toLowerCase().includes(q) ||
                    (item.department_name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="nec-admin-page">
      {/* Header */}
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 className="nec-page-title">Institutional Sports Media & Gallery Manager</h2>
          <p className="nec-page-desc">
            Organize, tag, and publish official campus sports photography and videography linked to Intra College & Inter College tournaments and events.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Media Type Quick Filters */}
          <button
            type="button"
            className={`nec-btn ${filterType === "ALL" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => { setFilterType("ALL"); setCurrentPage(1); }}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            All Media ({items.length})
          </button>
          <button
            type="button"
            className={`nec-btn ${filterType === "Image" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => { setFilterType("Image"); setCurrentPage(1); }}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Photos ({items.filter((i) => (i.media_type || i.type) === "image").length})
          </button>
          <button
            type="button"
            className={`nec-btn ${filterType === "Video" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => { setFilterType("Video"); setCurrentPage(1); }}
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

              {/* Competition Scope & Academic Year */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Competition Scope</label>
                  <select
                    className="nec-input"
                    value={uploadScope}
                    onChange={e => setUploadScope(e.target.value)}
                  >
                    <option value="Intramural">Intra College (Within NEC)</option>
                    <option value="Inter-Collegiate">Inter College (Between Institutions)</option>
                  </select>
                </div>

                <div>
                  <label className="nec-form-label">Academic Year</label>
                  <select
                    className="nec-input"
                    value={uploadYear}
                    onChange={e => setUploadYear(e.target.value)}
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>
              </div>

              {/* Tournament & Event */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Tournament (Optional)</label>
                  <select
                    className="nec-input"
                    value={uploadTournamentId}
                    onChange={e => handleUploadTournamentChange(e.target.value)}
                  >
                    <option value="">General Institutional Media</option>
                    {tournaments.map(t => (
                      <option key={t.tournament_id} value={t.tournament_id}>
                        {t.name} ({formatScope(t.scope)})
                      </option>
                    ))}
                  </select>
                </div>

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
              </div>

              {/* Sport & Primary Department */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Sport (Derived or Selectable)</label>
                  <select
                    className="nec-input"
                    value={uploadSportId}
                    onChange={e => setUploadSportId(e.target.value)}
                  >
                    <option value="">Campus Sports</option>
                    {sports.map(s => (
                      <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="nec-form-label">Primary Department</label>
                  <select
                    className="nec-input"
                    value={uploadDeptId}
                    onChange={e => setUploadDeptId(e.target.value)}
                  >
                    <option value="">All / College Wide</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Department Association */}
              <div>
                <label className="nec-form-label" style={{ marginBottom: "6px" }}>
                  Associated Departments (Multiple Selection for Contests & Inter-College Meets)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "80px", overflowY: "auto", padding: "6px", background: "var(--nec-surface-raised)", borderRadius: "6px", border: "1px solid var(--nec-border)" }}>
                  {departments.map(d => {
                    const isSelected = uploadAssociatedDeptIds.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleToggleAssociatedDept(d.id)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: isSelected ? "1px solid var(--nec-blue-accent, #0274be)" : "1px solid var(--nec-border)",
                          background: isSelected ? "rgba(2, 116, 190, 0.12)" : "transparent",
                          color: isSelected ? "var(--nec-blue-accent, #0274be)" : "var(--nec-text-muted)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {isSelected && <Check size={11} />}
                        {d.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Capture Date & Time and Publication Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="nec-form-label">Capture Date</label>
                  <input
                    type="date"
                    className="nec-input"
                    value={uploadCapturedDate}
                    onChange={e => setUploadCapturedDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="nec-form-label">Capture Time</label>
                  <input
                    type="time"
                    className="nec-input"
                    value={uploadCapturedTime}
                    onChange={e => setUploadCapturedTime(e.target.value)}
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

      {/* Advanced Filter Bar */}
      <Card className="nec-card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Top Row: Scope Filter Tabs & Sort & Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            {/* Standard Scope Tabs: All | Intra College | Inter College */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-main)" }}>Competition Scope:</span>
              <div style={{ display: "flex", gap: "4px", background: "var(--nec-surface-raised)", padding: "3px", borderRadius: "8px", border: "1px solid var(--nec-border)" }}>
                {[
                  { id: "ALL", label: "All" },
                  { id: "Intramural", label: "Intra College" },
                  { id: "Inter-Collegiate", label: "Inter College" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setFilterScope(tab.id); setCurrentPage(1); }}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      border: "none",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      background: filterScope === tab.id ? "var(--nec-blue-accent, #0274be)" : "transparent",
                      color: filterScope === tab.id ? "#fff" : "var(--nec-text-muted)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort & Status Dropdowns */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <ArrowUpDown size={14} color="var(--nec-text-muted)" />
                <select
                  className="nec-input"
                  value={sortBy}
                  onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                  style={{ fontSize: "0.82rem", padding: "5px 10px" }}
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="title">Sort: Title (A–Z)</option>
                </select>
              </div>

              <select
                className="nec-input"
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                style={{ fontSize: "0.82rem", padding: "5px 10px" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Published">Published (Public)</option>
                <option value="Draft">Draft (Internal)</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Second Row: Dropdowns (Year, Tournament, Event, Sport, Department) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
            <select
              className="nec-input"
              value={filterAcademicYear}
              onChange={e => { setFilterAcademicYear(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            >
              <option value="ALL">All Academic Years</option>
              <option value="2026-2027">2026-2027</option>
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
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map(t => (
                <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
              ))}
            </select>

            <select
              className="nec-input"
              value={filterEvent}
              onChange={e => { setFilterEvent(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            >
              <option value="ALL">All Events</option>
              {filteredEventsForFilter.map(e => (
                <option key={e.event_id} value={e.event_id}>{e.name}</option>
              ))}
            </select>

            <select
              className="nec-input"
              value={filterSport}
              onChange={e => { setFilterSport(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            >
              <option value="ALL">All Sports</option>
              {sports.map(s => (
                <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
              ))}
            </select>

            <select
              className="nec-input"
              value={filterDept}
              onChange={e => { setFilterDept(e.target.value); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "5px 8px" }}
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          {/* Third Row: Custom Date & Time Range Panel */}
          <div style={{
            background: "var(--nec-surface-raised)",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid var(--nec-border)",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "var(--nec-text-main)" }}>
              <Clock size={14} color="var(--nec-gold)" />
              <span>Date & Time Range (IST):</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <input
                type="date"
                className="nec-input"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                title="From Date"
              />
              <input
                type="time"
                className="nec-input"
                value={fromTime}
                onChange={e => setFromTime(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "4px 6px" }}
                title="From Time"
              />
              <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)" }}>to</span>
              <input
                type="date"
                className="nec-input"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                title="To Date"
              />
              <input
                type="time"
                className="nec-input"
                value={toTime}
                onChange={e => setToTime(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "4px 6px" }}
                title="To Time"
              />
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyDateRange}
                style={{ fontSize: "0.78rem", padding: "5px 12px", fontWeight: 700 }}
              >
                Apply Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDateRange}
                disabled={!fromDate && !toDate && !fromTime && !toTime && !appliedDateRange.fromDate && !appliedDateRange.toDate}
                style={{ fontSize: "0.78rem", padding: "5px 12px", fontWeight: 700 }}
                icon={RotateCcw}
              >
                Reset Filter
              </Button>
            </div>

            {dateRangeError && (
              <span style={{ color: "var(--nec-danger, #ef4444)", fontSize: "0.78rem", fontWeight: 600 }}>
                {dateRangeError}
              </span>
            )}
          </div>

          {/* Fourth Row: Search and Full Reset */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", background: "var(--nec-surface)", borderRadius: "6px", border: "1px solid var(--nec-border)", padding: "0 8px" }}>
              <Search size={14} color="var(--nec-text-muted)" />
              <input
                type="text"
                className="nec-input"
                placeholder="Search title, description, tournament, sport, department..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ border: "none", background: "transparent", fontSize: "0.82rem", padding: "6px 4px", width: "100%", outline: "none" }}
              />
            </div>

            {(filterScope !== "ALL" || filterTournament !== "ALL" || filterEvent !== "ALL" || filterSport !== "ALL" || filterDept !== "ALL" || filterAcademicYear !== "ALL" || filterStatus !== "ALL" || appliedDateRange.fromDate || search) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterScope("ALL");
                  setFilterTournament("ALL");
                  setFilterEvent("ALL");
                  setFilterSport("ALL");
                  setFilterDept("ALL");
                  setFilterAcademicYear("ALL");
                  setFilterStatus("ALL");
                  setSortBy("newest");
                  setSearch("");
                  handleResetDateRange();
                }}
              >
                Reset All Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Media Count Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
        <div>
          Showing <strong>{filteredItems.length}</strong> institutional media items
          {filterScope !== "ALL" && ` • ${formatScope(filterScope)}`}
          {appliedDateRange.fromDate && ` • Date range active`}
        </div>
        <div>
          Page {currentPage} of {totalPages}
        </div>
      </div>

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
            No media matching current scope, tournament, event, sport, or date range filters.
          </p>
          <div style={{ marginTop: "16px" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterScope("ALL");
                setFilterTournament("ALL");
                setFilterEvent("ALL");
                setFilterSport("ALL");
                setFilterDept("ALL");
                setFilterStatus("ALL");
                setSearch("");
                handleResetDateRange();
              }}
            >
              Clear Filter Criteria
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="nec-admin-gallery-grid">
            {paginatedItems.map((item) => {
              const isVideo = (item.media_type || item.type) === "video";
              const mediaUrl = getMediaUrl(item.url || item.media_url);
              const scopeInfo = getScopeBadge(item.scope);
              const isPublished = item.publication_status === 'Published';

              return (
                <div key={item.id} className="nec-admin-gallery-card">
                  {/* Thumbnail Container */}
                  <div
                    className="nec-admin-gallery-thumb-wrap"
                    onClick={() => setActiveLightboxItem(item)}
                    style={{ cursor: "pointer" }}
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

                    {/* Media Type Badge */}
                    <div className="nec-admin-gallery-badge">
                      {isVideo ? <><VideoIcon size={12} /> Video</> : <><ImageIcon size={12} /> Photo</>}
                    </div>

                    {/* Scope Badge */}
                    <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
                      <span
                        style={{
                          background: scopeInfo.isInter ? "#1e3a8a" : "#4338ca",
                          color: "#fff",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "4px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.3)"
                        }}
                      >
                        {scopeInfo.icon} {scopeInfo.label}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 2 }}>
                      <Badge status={isPublished ? 'success' : item.publication_status === 'Draft' ? 'neutral' : 'warning'}>
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
                      {Array.isArray(item.associated_departments) && item.associated_departments.length > 1 && (
                        <span className="nec-dept-pill" style={{ background: "rgba(99,102,241,0.08)", color: "#4f46e5", fontSize: "0.72rem" }}>
                          +{item.associated_departments.length - 1} Depts
                        </span>
                      )}
                    </div>

                    <div className="nec-admin-gallery-footer">
                      <div className="nec-admin-gallery-meta" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ fontWeight: 600 }}>
                          {item.date_source === 'captured_at' ? '📅 Captured: ' : '⬆️ Uploaded: '}
                          {item.date} {item.time ? `• ${item.time}` : ""}
                        </span>
                        {item.uploadedBy && (
                          <span style={{ fontSize: "0.72rem", color: "var(--nec-text-muted)" }}>
                            By {item.uploadedBy}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {/* Quick Publish / Unpublish Toggle */}
                        <Button
                          variant={isPublished ? "outline" : "primary"}
                          size="sm"
                          icon={isPublished ? EyeOff : Eye}
                          onClick={(e) => handleTogglePublish(item, e)}
                          title={isPublished ? "Unpublish (Make Draft)" : "Publish (Make Public)"}
                        />
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
                          onClick={(e) => handleDelete(item.id, item.title, e)}
                          title="Delete media item"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "24px" }}>
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>

              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--nec-text-main)" }}>
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Next <ChevronRight size={14} style={{ display: "inline", verticalAlign: "middle" }} />
              </Button>
            </div>
          )}
        </>
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
                <label className="nec-form-label">Competition Scope</label>
                <select
                  className="nec-input"
                  value={editForm.scope}
                  onChange={e => setEditForm(prev => ({ ...prev, scope: e.target.value }))}
                >
                  <option value="Intramural">Intra College (Within NEC)</option>
                  <option value="Inter-Collegiate">Inter College (Between Institutions)</option>
                </select>
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Academic Year</label>
                <select
                  className="nec-input"
                  value={editForm.academic_year}
                  onChange={e => setEditForm(prev => ({ ...prev, academic_year: e.target.value }))}
                >
                  <option value="">Select Year</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2023-2024">2023-2024</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="nec-form-group">
                <label className="nec-form-label">Tournament</label>
                <select
                  className="nec-input"
                  value={editForm.tournament_id}
                  onChange={e => {
                    const tId = e.target.value;
                    const tour = tournaments.find(t => Number(t.tournament_id) === Number(tId));
                    setEditForm(prev => ({
                      ...prev,
                      tournament_id: tId,
                      event_id: "",
                      scope: tour?.scope || prev.scope
                    }));
                  }}
                >
                  <option value="">General Institutional Media</option>
                  {tournaments.map(t => (
                    <option key={t.tournament_id} value={t.tournament_id}>
                      {t.name} ({formatScope(t.scope)})
                    </option>
                  ))}
                </select>
              </div>

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
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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

              <div className="nec-form-group">
                <label className="nec-form-label">Primary Department</label>
                <select
                  className="nec-input"
                  value={editForm.department_id}
                  onChange={e => setEditForm(prev => ({ ...prev, department_id: e.target.value }))}
                >
                  <option value="">All / College Wide</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Multi-Department Association in Edit Form */}
            <div className="nec-form-group">
              <label className="nec-form-label" style={{ marginBottom: "6px" }}>
                Associated Departments (Multi-Select)
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "80px", overflowY: "auto", padding: "6px", background: "var(--nec-surface-raised)", borderRadius: "6px", border: "1px solid var(--nec-border)" }}>
                {departments.map(d => {
                  const isSelected = Array.isArray(editForm.associated_departments) && editForm.associated_departments.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleEditAssociatedDept(d.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: isSelected ? "1px solid var(--nec-blue-accent, #0274be)" : "1px solid var(--nec-border)",
                        background: isSelected ? "rgba(2, 116, 190, 0.12)" : "transparent",
                        color: isSelected ? "var(--nec-blue-accent, #0274be)" : "var(--nec-text-muted)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {isSelected && <Check size={11} />}
                      {d.code}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "10px" }}>
              <div className="nec-form-group">
                <label className="nec-form-label">Capture Date</label>
                <input
                  type="date"
                  className="nec-input"
                  value={editForm.captured_date}
                  onChange={e => setEditForm(prev => ({ ...prev, captured_date: e.target.value }))}
                />
              </div>

              <div className="nec-form-group">
                <label className="nec-form-label">Capture Time</label>
                <input
                  type="time"
                  className="nec-input"
                  value={editForm.captured_time}
                  onChange={e => setEditForm(prev => ({ ...prev, captured_time: e.target.value }))}
                />
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
                <span style={{
                  background: activeLightboxItem.scope === 'Inter-Collegiate' ? "#1e3a8a" : "#4338ca",
                  color: "#fff",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "4px"
                }}>
                  {formatScope(activeLightboxItem.scope)}
                </span>
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
                  <Badge status="info">Scope: {formatScope(activeLightboxItem.scope)}</Badge>
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
                  {activeLightboxItem.date_source === 'captured_at' ? '📅 Captured on: ' : '⬆️ Uploaded on: '}
                  {activeLightboxItem.date} {activeLightboxItem.time ? `at ${activeLightboxItem.time}` : ""}
                  {activeLightboxItem.date_source === 'created_at' ? ' (Upload Timestamp Fallback)' : ''}
                  {activeLightboxItem.uploadedBy ? ` • Added by ${activeLightboxItem.uploadedBy}` : ""}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Button
                  variant={activeLightboxItem.publication_status === 'Published' ? "outline" : "primary"}
                  size="sm"
                  icon={activeLightboxItem.publication_status === 'Published' ? EyeOff : Eye}
                  onClick={() => handleTogglePublish(activeLightboxItem)}
                >
                  {activeLightboxItem.publication_status === 'Published' ? "Unpublish" : "Publish"}
                </Button>
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
