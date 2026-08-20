import React, { useEffect, useState } from "react";
import { galleryApi } from "../../services/api/apiServices";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import Pagination from "../../components/common/Pagination";
import { Image as ImageIcon } from "lucide-react";
import "./PublicPortal.css";

export default function PublicGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

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
        <p className="nec-page-desc">Capturing athletic moments across NEC sports tournaments.</p>
      </div>

      {loading ? (
        <SkeletonLoader rows={4} type="cards" />
      ) : (
        <>
          <div className="nec-gallery-grid">
            {items.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(item => (
              <div key={item.id} className="nec-gallery-card">
                <img src={item.url} alt={item.title} className="nec-gallery-img" />
                <div className="nec-gallery-overlay">
                  <span className="nec-gallery-sport">{item.sport} • {item.date}</span>
                  <h4 className="nec-gallery-title">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
          
          {Math.ceil(items.length / pageSize) > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(items.length / pageSize)}
              onPageChange={setCurrentPage}
              style={{ marginTop: "20px", border: "1px solid var(--nec-border)", borderRadius: "8px" }}
            />
          )}
        </>
      )}
    </div>
  );
}
