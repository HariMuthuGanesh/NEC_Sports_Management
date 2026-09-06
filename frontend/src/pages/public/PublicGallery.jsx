import React, { useEffect, useState } from "react";
import { galleryApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import { Image as ImageIcon, Video, PlayCircle } from "lucide-react";
import "./PublicPortal.css";

export default function PublicGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGallery = () => {
    setLoading(true);
    setError(null);
    galleryApi.getAll()
      .then(data => {
        setItems(data.filter(i => i.is_public));
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
        />
      ) : loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : (
        <>
          <div className="nec-gallery-grid">
            {items.map(item => (
              <Card key={item.id} className="nec-gallery-card">
                <div className="nec-gallery-media-wrap">
                  {item.media_type === "video" ? (
                    <div className="nec-gallery-video-ph">
                      <PlayCircle size={48} />
                      <span>{item.title}</span>
                    </div>
                  ) : (
                    <img 
                      src={`http://localhost:5000${item.url}`} 
                      alt={item.title} 
                      className="nec-gallery-img"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/400x300?text=Image+Not+Found";
                      }}
                    />
                  )}
                  <div className="nec-gallery-badge">
                    {item.media_type === "video" ? <Video size={14} /> : <ImageIcon size={14} />}
                  </div>
                </div>
                <div className="nec-gallery-content">
                  <h4>{item.title}</h4>
                  <span className="nec-gallery-date">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
