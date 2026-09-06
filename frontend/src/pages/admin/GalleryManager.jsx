import React, { useState, useEffect, useRef } from "react";
import { galleryApi } from "../../services/api/apiServices";
import { Image, Upload, Trash2, X, Plus } from "lucide-react";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import "./AdminPortal.css";

export default function GalleryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const fetchGallery = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await galleryApi.getGallery();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("media", selectedFile);

    try {
      await galleryApi.uploadMedia(formData);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchGallery(); // Refresh gallery
    } catch (err) {
      alert("Failed to upload: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this media?")) return;
    try {
      await galleryApi.deleteMedia(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  return (
    <div className="nec-admin-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Gallery Manager</h2>
        <p className="nec-page-desc">Upload and manage photos and videos for the public gallery.</p>
      </div>

      <div className="nec-card" style={{ marginBottom: "24px" }}>
        <h3 className="nec-card-title">Upload New Media</h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '16px' }}>
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ padding: '8px', border: '1px solid var(--nec-border)', borderRadius: '6px', flex: 1 }}
          />
          <button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="nec-btn nec-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isUploading ? "Uploading..." : <><Upload size={18} /> Upload</>}
          </button>
        </form>
      </div>

      {error ? (
        <div className="nec-error-state">
          <p>{error}</p>
          <button className="nec-btn nec-btn-primary" onClick={fetchGallery}>Retry</button>
        </div>
      ) : loading ? (
        <SkeletonLoader rows={3} type="cards" />
      ) : items.length === 0 ? (
        <div className="nec-empty-state" style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--nec-border)', borderRadius: '8px' }}>
          <Image size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <h3>No Media Found</h3>
          <p>Upload some photos or videos to see them here.</p>
        </div>
      ) : (
        <div className="nec-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {items.map(item => (
            <div key={item.id} className="nec-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ position: 'relative', paddingTop: '66%', background: '#f1f5f9' }}>
                <img
                  src={'http://localhost:5000' + item.url}
                  alt={item.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = '/assets/placeholder.png'; // Fallback if backend is not serving static properly
                  }}
                />
              </div>
              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--nec-text-muted)' }}>{item.date}</div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="nec-icon-btn"
                  style={{ color: 'var(--nec-danger)', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}
                  title="Delete Media"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
