import React, { useEffect, useState } from "react";
import { galleryApi } from "../../services/api/apiServices";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { Image as ImageIcon } from "lucide-react";
import "./PublicPortal.css";

export default function PublicGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    galleryApi.getGallery().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Campus Sports Photo & Media Gallery</h2>
        <p className="nec-page-desc">Capturing athletic moments across NEC sports tournaments and Lakshmi Ammal Sports Academy.</p>
      </div>

      {loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : (
        <div className="nec-gallery-grid">
          {items.map(item => (
            <div key={item.id} className="nec-gallery-card">
              <img src={item.url} alt={item.title} className="nec-gallery-img" />
              <div className="nec-gallery-overlay">
                <span className="nec-gallery-sport">{item.sport} • {item.date}</span>
                <h4 className="nec-gallery-title">{item.title}</h4>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
