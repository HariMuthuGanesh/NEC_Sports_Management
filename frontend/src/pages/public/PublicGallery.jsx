import React, { useEffect, useState, useRef } from "react";
import { galleryApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Button from "../../components/common/Button";
import { Image as ImageIcon, Video as VideoIcon, PlayCircle, Maximize2, X, Film, Volume2 } from "lucide-react";
import "./PublicPortal.css";

const getMediaUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return `${backendUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function PublicGallery({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [activeLightboxItem, setActiveLightboxItem] = useState(null);
  const videoRef = useRef(null);

  const fetchGallery = () => {
    setLoading(true);
    setError(null);
    galleryApi.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setItems(list.filter((i) => i.is_public !== false));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load gallery.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveLightboxItem(null);
      }
    };
    if (activeLightboxItem) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxItem]);

  const toggleFullScreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      }
    }
  };

  const filteredItems = items.filter((item) => {
    const isVid = (item.media_type || item.type) === "video";
    if (filterType === "images") return !isVid;
    if (filterType === "videos") return isVid;
    return true;
  });

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <div>
          <h2 className="nec-page-title">Sports Gallery</h2>
          <p className="nec-page-desc">Photos and moments from campus sports events, tournaments, and practice sessions.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`nec-btn ${filterType === "all" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => setFilterType("all")}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            All Media ({items.length})
          </button>
          <button
            type="button"
            className={`nec-btn ${filterType === "images" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => setFilterType("images")}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Photos ({items.filter((i) => (i.media_type || i.type) !== "video").length})
          </button>
          <button
            type="button"
            className={`nec-btn ${filterType === "videos" ? "nec-btn-primary" : "nec-btn-secondary"}`}
            onClick={() => setFilterType("videos")}
            style={{ fontSize: "0.85rem", padding: "6px 12px" }}
          >
            Videos ({items.filter((i) => (i.media_type || i.type) === "video").length})
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <PublicInfoCard
            icon={ImageIcon}
            title="Gallery Unavailable"
            message="The gallery could not be loaded due to a server error. Please try again later."
            actionText="Retry"
            onAction={fetchGallery}
          />
        </div>
      ) : (!loading && items.length === 0) ? (
        <PublicInfoCard
          icon={ImageIcon}
          title="Sports Gallery"
          message="Photos from campus tournaments and sporting events will appear here after they are published."
          actionText="View Fixtures"
          onAction={() => onNavigate && onNavigate("public_fixtures")}
        />
      ) : loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <PublicInfoCard
            icon={ImageIcon}
            title="No Items Found"
            message={`There are no ${filterType === "videos" ? "videos" : "photos"} published in the gallery yet.`}
            actionText="Show All Media"
            onAction={() => setFilterType("all")}
          />
        </div>
      ) : (
        <div className="nec-gallery-grid">
          {filteredItems.map((item, idx) => {
            const isVideo = (item.media_type || item.type) === "video";
            const finalUrl = getMediaUrl(item.url || item.media_url);
            const rawDate = item.date || item.created_at;
            const dateStr = rawDate
              ? (isNaN(new Date(rawDate)) ? rawDate : new Date(rawDate).toLocaleDateString())
              : "Campus Sports";

            return (
              <div
                key={item.id || idx}
                className="nec-gallery-card"
                onClick={() => setActiveLightboxItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setActiveLightboxItem(item)}
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
                        <PlayCircle size={48} className="nec-gallery-play-icon" />
                        <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 600, marginTop: "6px", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                          Play Video
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={finalUrl} 
                      alt={item.title || "Campus Sports Moment"} 
                      className="nec-gallery-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                  )}
                  <div className="nec-gallery-badge">
                    {isVideo ? <><VideoIcon size={13} style={{ marginRight: 4 }} /> Video</> : <><ImageIcon size={13} style={{ marginRight: 4 }} /> Photo</>}
                  </div>
                </div>
                <div className="nec-gallery-content">
                  <h4>{item.title || "Campus Sports Moment"}</h4>
                  {item.caption && (
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--nec-text-muted)", lineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {item.caption}
                    </p>
                  )}
                  <span className="nec-gallery-date" style={{ marginTop: "6px" }}>{dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
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
                  {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" ? "🎬 Campus Sports Theater" : "📷 Photo Viewer"}
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)", fontWeight: 500 }}>
                  • {activeLightboxItem.title}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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

            <div className="nec-gallery-lightbox-media">
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
                <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "4px", display: "inline-block" }}>
                  {activeLightboxItem.date}
                </span>
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
