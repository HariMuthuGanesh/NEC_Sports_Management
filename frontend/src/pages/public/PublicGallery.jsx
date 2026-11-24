import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  galleryApi,
  tournamentsApi,
  eventsApi,
  sportsApi
} from "../../services/api/apiServices";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  PlayCircle,
  Maximize2,
  X,
  Search,
  Filter,
  Calendar,
  Clock,
  Trophy,
  Building,
  RotateCcw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { formatScope, getScopeBadge } from "../../utils/scopeLabels";
import "./PublicPortal.css";

const getMediaUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const backendUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");
  return `${backendUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function PublicGallery({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reference Catalogs
  const [tournaments, setTournaments] = useState([]);
  const [events, setEvents] = useState([]);
  const [sports, setSports] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Multi-dimensional filters
  const [scope, setScope] = useState("ALL"); // ALL | Intramural | Inter-Collegiate
  const [academicYear, setAcademicYear] = useState("ALL");
  const [tournamentId, setTournamentId] = useState("ALL");
  const [eventId, setEventId] = useState("ALL");
  const [sportId, setSportId] = useState("ALL");
  const [departmentId, setDepartmentId] = useState("ALL");
  const [mediaType, setMediaType] = useState("all"); // all | images | videos
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | title

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

  // Lightbox Modal state
  const [activeLightboxItem, setActiveLightboxItem] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const videoRef = useRef(null);

  // Fetch Catalogs on mount
  useEffect(() => {
    Promise.all([
      tournamentsApi.getTournaments ? tournamentsApi.getTournaments().catch(() => []) : Promise.resolve([]),
      eventsApi.getEvents ? eventsApi.getEvents().catch(() => []) : Promise.resolve([]),
      sportsApi.getSports ? sportsApi.getSports().catch(() => []) : Promise.resolve([]),
      sportsApi.getDepartments ? sportsApi.getDepartments().catch(() => []) : Promise.resolve([])
    ]).then(([tData, eData, sData, dData]) => {
      setTournaments(Array.isArray(tData) ? tData : (tData?.data || []));
      setEvents(Array.isArray(eData) ? eData : (eData?.data || []));
      setSports(Array.isArray(sData) ? sData : (sData?.data || []));
      setDepartments(Array.isArray(dData) ? dData : (dData?.data || []));
    }).catch(err => {
      console.warn("Catalog fetch error:", err);
    });
  }, []);

  // Fetch Published Media from backend
  const fetchGallery = () => {
    setLoading(true);
    setError(null);

    const queryParams = {
      scope: scope !== "ALL" ? scope : undefined,
      academicYear: academicYear !== "ALL" ? academicYear : undefined,
      tournamentId: tournamentId !== "ALL" ? tournamentId : undefined,
      eventId: eventId !== "ALL" ? eventId : undefined,
      sportId: sportId !== "ALL" ? sportId : undefined,
      departmentId: departmentId !== "ALL" ? departmentId : undefined,
      mediaType: mediaType !== "all" ? (mediaType === "images" ? "image" : "video") : undefined,
      status: "Published",
      sortBy: sortBy,
      fromDate: appliedDateRange.fromDate || undefined,
      fromTime: appliedDateRange.fromTime || undefined,
      toDate: appliedDateRange.toDate || undefined,
      toTime: appliedDateRange.toTime || undefined,
      search: search.trim() || undefined
    };

    galleryApi.getPhotos(queryParams)
      .then((res) => {
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        // Strictly filter to published media for public portal
        setItems(list.filter((i) => i.publication_status === "Published" || i.is_public !== false));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Gallery fetch error:", err);
        setError(err.message || "Failed to load athletic gallery.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGallery();
  }, [
    scope,
    academicYear,
    tournamentId,
    eventId,
    sportId,
    departmentId,
    mediaType,
    sortBy,
    appliedDateRange
  ]);

  // Handle Cascading Filter: Filter events based on selected tournament
  const filteredEventsForFilter = tournamentId !== "ALL"
    ? events.filter(e => Number(e.tournament_id) === Number(tournamentId))
    : events;

  const handleTournamentChange = (tId) => {
    setTournamentId(tId);
    setEventId("ALL");
    setCurrentPage(1);
    if (tId !== "ALL") {
      const tour = tournaments.find(t => Number(t.tournament_id) === Number(tId));
      if (tour?.scope) {
        setScope(tour.scope);
      }
    }
  };

  const handleEventChange = (eId) => {
    setEventId(eId);
    setCurrentPage(1);
    if (eId !== "ALL") {
      const ev = events.find(e => Number(e.event_id) === Number(eId));
      if (ev) {
        if (ev.tournament_id && tournamentId === "ALL") {
          setTournamentId(String(ev.tournament_id));
        }
        if (ev.sport_id && sportId === "ALL") {
          setSportId(String(ev.sport_id));
        }
      }
    }
  };

  // Custom Date & Time Range filter handlers
  const handleApplyDateRange = () => {
    setDateRangeError("");
    if (fromDate && toDate) {
      const startStr = `${fromDate} ${fromTime || "00:00:00"}`;
      const endStr = `${toDate} ${toTime || "23:59:59"}`;
      if (new Date(startStr).getTime() > new Date(endStr).getTime()) {
        setDateRangeError("Ending date and time cannot be earlier than starting date and time.");
        return;
      }
    }
    setAppliedDateRange({ fromDate, fromTime, toDate, toTime });
    setCurrentPage(1);
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

  const handleResetAllFilters = () => {
    setScope("ALL");
    setAcademicYear("ALL");
    setTournamentId("ALL");
    setEventId("ALL");
    setSportId("ALL");
    setDepartmentId("ALL");
    setMediaType("all");
    setSearch("");
    setSortBy("newest");
    handleResetDateRange();
  };

  // Client-side search and filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Security: ensure published only
      if (item.publication_status && item.publication_status !== "Published") return false;

      // Scope filter
      if (scope !== "ALL") {
        const isInter = item.scope === "Inter-Collegiate" || item.tournament_scope === "Inter-Collegiate";
        const itemScope = isInter ? "Inter-Collegiate" : "Intramural";
        if (itemScope !== scope) return false;
      }

      // Media type filter
      const isVid = (item.media_type || item.type || "").toLowerCase() === "video";
      if (mediaType === "images" && isVid) return false;
      if (mediaType === "videos" && !isVid) return false;

      // Search keyword filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (item.title || "").toLowerCase().includes(q) ||
          (item.caption || "").toLowerCase().includes(q) ||
          (item.tournament_name || "").toLowerCase().includes(q) ||
          (item.event_name || "").toLowerCase().includes(q) ||
          (item.sport || "").toLowerCase().includes(q) ||
          (item.department_name || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [items, scope, mediaType, search]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Lightbox Navigation
  const handleOpenLightbox = (item, index) => {
    setActiveLightboxItem(item);
    setLightboxIndex(index);
    setZoomLevel(1);
  };

  const handleNextLightbox = () => {
    if (filteredItems.length === 0) return;
    const nextIdx = (lightboxIndex + 1) % filteredItems.length;
    setLightboxIndex(nextIdx);
    setActiveLightboxItem(filteredItems[nextIdx]);
    setZoomLevel(1);
  };

  const handlePrevLightbox = () => {
    if (filteredItems.length === 0) return;
    const prevIdx = (lightboxIndex - 1 + filteredItems.length) % filteredItems.length;
    setLightboxIndex(prevIdx);
    setActiveLightboxItem(filteredItems[prevIdx]);
    setZoomLevel(1);
  };

  // Keyboard shortcut listener for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeLightboxItem) return;
      if (e.key === "Escape") {
        setActiveLightboxItem(null);
      } else if (e.key === "ArrowRight") {
        handleNextLightbox();
      } else if (e.key === "ArrowLeft") {
        handlePrevLightbox();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxItem, lightboxIndex, filteredItems]);

  const toggleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  return (
    <div className="nec-portal-page">
      {/* Page Header */}
      <div className="nec-page-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <h2 className="nec-page-title">Athletic Gallery & Media</h2>
          <p className="nec-page-desc">
            Visual highlights from campus tournaments, championships, and state-level meets across Intra College & Inter College competitions.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          {/* Standardized Scope Filter Selector: All | Intra College | Inter College */}
          <div style={{ display: "flex", gap: "4px", background: "var(--nec-surface-raised)", padding: "3px", borderRadius: "8px", border: "1px solid var(--nec-border)" }}>
            {[
              { id: "ALL", label: "All" },
              { id: "Intramural", label: "Intra College" },
              { id: "Inter-Collegiate", label: "Inter College" }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setScope(tab.id); setCurrentPage(1); }}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  background: scope === tab.id ? "var(--nec-blue-accent, #0274be)" : "transparent",
                  color: scope === tab.id ? "#fff" : "var(--nec-text-muted)",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Media Type Selector */}
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              className={`nec-btn ${mediaType === "all" ? "nec-btn-primary" : "nec-btn-secondary"}`}
              onClick={() => { setMediaType("all"); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "6px 12px" }}
            >
              All Media ({items.length})
            </button>
            <button
              type="button"
              className={`nec-btn ${mediaType === "images" ? "nec-btn-primary" : "nec-btn-secondary"}`}
              onClick={() => { setMediaType("images"); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "6px 12px" }}
            >
              Photos ({items.filter((i) => (i.media_type || i.type) !== "video").length})
            </button>
            <button
              type="button"
              className={`nec-btn ${mediaType === "videos" ? "nec-btn-primary" : "nec-btn-secondary"}`}
              onClick={() => { setMediaType("videos"); setCurrentPage(1); }}
              style={{ fontSize: "0.82rem", padding: "6px 12px" }}
            >
              Videos ({items.filter((i) => (i.media_type || i.type) === "video").length})
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div style={{
        background: "var(--nec-surface)",
        padding: "16px",
        borderRadius: "12px",
        border: "1px solid var(--nec-border)",
        marginBottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "var(--nec-shadow-sm)"
      }}>
        {/* Row 1: Search & Sorting */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "260px", flex: "1 1 280px" }}>
            <Search size={16} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--nec-text-muted)" }} />
            <input
              type="text"
              className="nec-input"
              placeholder="Search by title, event, sport, or tournament..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: "32px", fontSize: "0.85rem", width: "100%" }}
            />
          </div>

          {/* Sort Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
        </div>

        {/* Row 2: Cascading Catalog Dropdowns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
          <select
            className="nec-input"
            value={academicYear}
            onChange={e => { setAcademicYear(e.target.value); setCurrentPage(1); }}
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
            value={tournamentId}
            onChange={e => handleTournamentChange(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 8px" }}
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map(t => (
              <option key={t.tournament_id} value={t.tournament_id}>{t.name}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={eventId}
            onChange={e => handleEventChange(e.target.value)}
            style={{ fontSize: "0.82rem", padding: "5px 8px" }}
          >
            <option value="ALL">All Events</option>
            {filteredEventsForFilter.map(e => (
              <option key={e.event_id} value={e.event_id}>{e.name}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={sportId}
            onChange={e => { setSportId(e.target.value); setCurrentPage(1); }}
            style={{ fontSize: "0.82rem", padding: "5px 8px" }}
          >
            <option value="ALL">All Sports</option>
            {sports.map(s => (
              <option key={s.sport_id} value={s.sport_id}>{s.name}</option>
            ))}
          </select>

          <select
            className="nec-input"
            value={departmentId}
            onChange={e => { setDepartmentId(e.target.value); setCurrentPage(1); }}
            style={{ fontSize: "0.82rem", padding: "5px 8px" }}
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
        </div>

        {/* Row 3: Custom Date & Time Range Panel */}
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
            <div style={{ width: "100%", fontSize: "0.75rem", color: "var(--nec-danger, #ef4444)", fontWeight: 600 }}>
              ⚠️ {dateRangeError}
            </div>
          )}
        </div>

        {/* Counter & Active Filter Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--nec-text-muted)", flexWrap: "wrap", gap: "6px" }}>
          <span>
            Showing <strong>{filteredItems.length}</strong> published media items
            {scope !== "ALL" && ` in ${formatScope(scope)}`}
            {tournamentId !== "ALL" && ` • Tournament filtered`}
            {appliedDateRange.fromDate && ` • Date range active`}
          </span>
          {(scope !== "ALL" || tournamentId !== "ALL" || eventId !== "ALL" || sportId !== "ALL" || departmentId !== "ALL" || academicYear !== "ALL" || mediaType !== "all" || search || appliedDateRange.fromDate) && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              style={{ background: "none", border: "none", color: "var(--nec-blue-accent)", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <RotateCcw size={12} /> Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <PublicInfoCard
            icon={ImageIcon}
            title="Gallery Unavailable"
            message="The athletic gallery could not be loaded due to a server error. Please try again later."
            actionText="Retry"
            onAction={fetchGallery}
          />
        </div>
      ) : loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : (!loading && items.length === 0) ? (
        <PublicInfoCard
          icon={ImageIcon}
          title="Athletic Sports Gallery"
          message="No published media items currently available in the public sports gallery."
          actionText="View Upcoming Fixtures"
          onAction={() => onNavigate && onNavigate("public_fixtures")}
        />
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <PublicInfoCard
            icon={Filter}
            title="No Matching Media Found"
            message="No published photos or videos match your selected scope, date range, or filter criteria."
            actionText="Reset All Filters"
            onAction={handleResetAllFilters}
          />
        </div>
      ) : (
        <>
          <div className="nec-gallery-grid">
            {paginatedItems.map((item, idx) => {
              const isVideo = (item.media_type || item.type || "").toLowerCase() === "video";
              const finalUrl = getMediaUrl(item.url || item.media_url);
              const scopeBadge = getScopeBadge(item.scope);
              const globalIndex = (currentPage - 1) * pageSize + idx;

              return (
                <div
                  key={item.id || idx}
                  className="nec-gallery-card"
                  onClick={() => handleOpenLightbox(item, globalIndex)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleOpenLightbox(item, globalIndex)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="nec-gallery-media-wrap">
                    {isVideo ? (
                      <div className="nec-gallery-video-container">
                        <video
                          src={finalUrl}
                          preload="metadata"
                          className="nec-gallery-video-preview"
                          muted
                          playsInline
                        />
                        <div className="nec-gallery-video-overlay">
                          <PlayCircle size={44} className="nec-gallery-play-icon" />
                          <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 600, marginTop: "6px", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                            Watch Video
                          </span>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={finalUrl} 
                        alt={item.title || "Campus Sports Moment"} 
                        className="nec-gallery-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                    )}

                    {/* Scope Badge (Top Left) */}
                    <div style={{ position: "absolute", top: "10px", left: "10px", zIndex: 2 }}>
                      <Badge status={scopeBadge.variant}>
                        {scopeBadge.label}
                      </Badge>
                    </div>

                    {/* Media Type Badge (Top Right) */}
                    <div className="nec-gallery-badge">
                      {isVideo ? (
                        <><VideoIcon size={13} style={{ marginRight: 4 }} /> Video</>
                      ) : (
                        <><ImageIcon size={13} style={{ marginRight: 4 }} /> Photo</>
                      )}
                    </div>
                  </div>

                  <div className="nec-gallery-content">
                    {/* Tournament / Event breadcrumb tag */}
                    {(item.tournament_name || item.event_name) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--nec-blue-accent)", fontWeight: 600 }}>
                        <Trophy size={12} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.tournament_name || "Tournament"} {item.event_name ? `• ${item.event_name}` : ""}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h4>{item.title || "Campus Sports Moment"}</h4>

                    {/* Caption */}
                    {item.caption && (
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--nec-text-muted)", lineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.caption}
                      </p>
                    )}

                    {/* Meta Footer: Sport & Timestamp with clear Date Source */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginTop: "6px" }}>
                      <span className="nec-gallery-date" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} color="var(--nec-gold)" />
                        {item.date_source === "captured_at" ? (
                          <span title="Captured on official event date">
                            {item.date} {item.time ? `at ${item.time}` : ""}
                          </span>
                        ) : (
                          <span title="Uploaded timestamp (fallback)">
                            {item.date} <em style={{ fontSize: "0.7rem", opacity: 0.8 }}>(Fallback)</em>
                          </span>
                        )}
                      </span>

                      {item.department_code && (
                        <span style={{ fontSize: "0.72rem", padding: "2px 6px", background: "var(--nec-surface-raised)", border: "1px solid var(--nec-border)", borderRadius: "4px", color: "var(--nec-text-muted)" }}>
                          {item.department_code}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 0",
              borderTop: "1px solid var(--nec-border)",
              marginTop: "24px",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredItems.length)} of {filteredItems.length} media items
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  icon={ChevronLeft}
                >
                  Previous
                </Button>
                <div style={{ display: "flex", alignItems: "center", padding: "0 10px", fontSize: "0.85rem", fontWeight: 600 }}>
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  icon={ChevronRight}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Lightbox Cinema Modal */}
      {activeLightboxItem && (
        <div
          className="nec-gallery-lightbox-overlay"
          onClick={() => setActiveLightboxItem(null)}
        >
          <div
            className="nec-gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="nec-gallery-lightbox-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="nec-gallery-lightbox-type">
                  {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" ? "🎬 Sports Cinema" : "📷 Photo Viewer"}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)", fontWeight: 500 }}>
                  • {activeLightboxItem.title}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {/* Photo Zoom controls */}
                {(activeLightboxItem.media_type || activeLightboxItem.type) !== "video" && (
                  <div className="nec-gallery-lightbox-zoom-wrap">
                    <button
                      type="button"
                      className="nec-gallery-lightbox-tool-btn"
                      onClick={() => setZoomLevel(z => Math.max(0.75, z - 0.25))}
                      title="Zoom Out (-)"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={{ fontSize: "0.75rem", padding: "0 4px", fontWeight: 600 }}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      className="nec-gallery-lightbox-tool-btn"
                      onClick={() => setZoomLevel(z => Math.min(3, z + 0.25))}
                      title="Zoom In (+)"
                    >
                      <ZoomIn size={14} />
                    </button>
                    {zoomLevel !== 1 && (
                      <button
                        type="button"
                        className="nec-gallery-lightbox-tool-btn"
                        onClick={() => setZoomLevel(1)}
                        title="Reset Zoom"
                        style={{ fontSize: "0.72rem" }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                )}

                {/* Video Full Screen button */}
                {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" && (
                  <button
                    type="button"
                    className="nec-gallery-lightbox-tool-btn"
                    onClick={toggleFullScreen}
                    title="Full Screen (F)"
                    aria-label="Full Screen"
                  >
                    <Maximize2 size={16} />
                    <span className="nec-hide-mobile" style={{ fontSize: "0.75rem", marginLeft: 4 }}>Full Screen</span>
                  </button>
                )}

                {/* Close Button */}
                <button
                  type="button"
                  className="nec-gallery-lightbox-close"
                  onClick={() => setActiveLightboxItem(null)}
                  title="Close (Esc)"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Media Body with Floating Prev / Next Controls */}
            <div className="nec-gallery-lightbox-media" style={{ overflow: "hidden" }}>
              {filteredItems.length > 1 && (
                <>
                  <button
                    type="button"
                    className="nec-gallery-lightbox-nav-btn prev"
                    onClick={handlePrevLightbox}
                    title="Previous Media (Left Arrow)"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className="nec-gallery-lightbox-nav-btn next"
                    onClick={handleNextLightbox}
                    title="Next Media (Right Arrow)"
                    aria-label="Next"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" ? (
                <video
                  ref={videoRef}
                  key={activeLightboxItem.id || activeLightboxItem.url}
                  src={getMediaUrl(activeLightboxItem.url || activeLightboxItem.media_url)}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="nec-gallery-cinema-video"
                  onError={(e) => {
                    console.error("Video load error:", e);
                  }}
                >
                  <source src={getMediaUrl(activeLightboxItem.url || activeLightboxItem.media_url)} type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
              ) : (
                <img
                  src={getMediaUrl(activeLightboxItem.url || activeLightboxItem.media_url)}
                  alt={activeLightboxItem.title}
                  className="nec-gallery-cinema-img"
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: "transform 0.2s ease-out",
                    cursor: zoomLevel > 1 ? "grab" : "default"
                  }}
                />
              )}
            </div>

            {/* Modal Footer with Rich Metadata */}
            <div className="nec-gallery-lightbox-footer">
              <div style={{ flex: 1, paddingRight: "16px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <Badge status={getScopeBadge(activeLightboxItem.scope).variant}>
                    {getScopeBadge(activeLightboxItem.scope).label}
                  </Badge>

                  {activeLightboxItem.academic_year && (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={13} />
                      {activeLightboxItem.academic_year}
                    </span>
                  )}

                  {activeLightboxItem.tournament_name && (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-blue-accent)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Trophy size={13} /> {activeLightboxItem.tournament_name}
                    </span>
                  )}

                  {activeLightboxItem.event_name && (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      • {activeLightboxItem.event_name}
                    </span>
                  )}

                  {activeLightboxItem.sport && (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                      ({activeLightboxItem.sport})
                    </span>
                  )}

                  {activeLightboxItem.department_name && (
                    <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Building size={13} /> {activeLightboxItem.department_name}
                    </span>
                  )}
                </div>

                <h3 style={{ margin: "4px 0", fontSize: "1.05rem", fontWeight: 700 }}>
                  {activeLightboxItem.title}
                </h3>

                {activeLightboxItem.caption && (
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
                    {activeLightboxItem.caption}
                  </p>
                )}

                <div style={{ marginTop: "6px", fontSize: "0.76rem", color: "var(--nec-text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={12} color="var(--nec-gold)" />
                  {activeLightboxItem.date_source === "captured_at" ? (
                    <span>Captured on: {activeLightboxItem.date} {activeLightboxItem.time ? `at ${activeLightboxItem.time}` : ""}</span>
                  ) : (
                    <span>Uploaded on: {activeLightboxItem.date} (Fallback)</span>
                  )}
                </div>
              </div>

              <Button variant="primary" size="sm" onClick={() => setActiveLightboxItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
