import React, { useEffect, useState } from "react";
import { galleryApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Image as ImageIcon, Video, PlayCircle } from "lucide-react";
import "./PublicPortal.css";

export default function PublicGallery({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGallery = () => {
    setLoading(true);
    setError(null);
    galleryApi.getAll()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setItems(list.filter(i => i.is_public !== false));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Sports Gallery</h2>
        <p className="nec-page-desc">Photos and moments from campus sports events, tournaments, and practice sessions.</p>
      </div>

      {(error || (!loading && items.length === 0)) ? (
        <PublicInfoCard
          icon={ImageIcon}
          title="Sports Gallery"
          message="Photos from campus tournaments and sporting events will appear here after they are published."
          actionText="View Fixtures"
          onAction={() => onNavigate && onNavigate("public_fixtures")}
        />
      ) : loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : (
        <>
          <div className="nec-gallery-grid">
            {items.map((item, idx) => {
              const isVideo = item.media_type === "video" || item.type === "video" || item.type === "Video";
              const rawUrl = item.url || item.media_url || "";
              const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
              const finalUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
                ? rawUrl
                : `${apiUrl}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
              const rawDate = item.date || item.created_at;
              const dateStr = rawDate ? (isNaN(new Date(rawDate)) ? rawDate : new Date(rawDate).toLocaleDateString()) : "Campus Sports";

              return (
                <Card key={item.id || idx} className="nec-gallery-card">
                  <div className="nec-gallery-media-wrap">
                    {isVideo ? (
                      <div className="nec-gallery-video-ph">
                        <PlayCircle size={48} />
                        <span>{item.title || "Campus Sports Video"}</span>
                      </div>
                    ) : (
                      <img 
                        src={finalUrl} 
                        alt={item.title || "Campus Sports Moment"} 
                        className="nec-gallery-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                    )}
                    <div className="nec-gallery-badge">
                      {isVideo ? <Video size={14} /> : <ImageIcon size={14} />}
                    </div>
                  </div>
                  <div className="nec-gallery-content">
                    <h4>{item.title || "Campus Sports Moment"}</h4>
                    <span className="nec-gallery-date">{dateStr}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
