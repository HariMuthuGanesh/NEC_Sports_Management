import React, { useState, useEffect, useRef } from "react";
import { galleryApi } from "../../services/api/apiServices";
import { useToast } from "../../context/ToastContext";
import { 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Upload, 
  Trash2, 
  X, 
  Plus, 
  Maximize2, 
  FileCheck, 
  Sparkles,
  Film
} from "lucide-react";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import Button from "../../components/common/Button";
import "./AdminPortal.css";

const getMediaUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return `${backendUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function GalleryManager() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");

  // Upload Form State
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileMediaType, setFileMediaType] = useState("image");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Lightbox Modal State
  const [activeLightboxItem, setActiveLightboxItem] = useState(null);

  const fetchGallery = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await galleryApi.getGallery();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load gallery items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

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

    try {
      const response = await galleryApi.uploadMedia(formData);
      toast.success("Media uploaded and published to gallery successfully!");
      handleClearSelection();
      fetchGallery();
    } catch (err) {
      toast.error(err.message || "Failed to upload media. Please try again.");
    } finally {
      setIsUploading(false);
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
    if (filterType === "images") return item.media_type === "image" || item.type === "image";
    if (filterType === "videos") return item.media_type === "video" || item.type === "video";
    return true;
  });

  return (
    <div className="nec-admin-page">
      {/* Header */}
      <div className="nec-page-header">
        <div>
          <h2 className="nec-page-title">Gallery Manager</h2>
          <p className="nec-page-desc">Upload, organize, and publish campus sports photos and video moments.</p>
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
            Photos ({items.filter((i) => (i.media_type || i.type) === "image").length})
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

      {/* Upload New Media Card */}
      <div className="nec-gallery-upload-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--nec-primary, #0284c7)" }} />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Upload New Campus Media</h3>
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
                  background: "rgba(2, 132, 199, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--nec-primary, #0284c7)"
                }}
              >
                <Upload size={24} />
              </div>
              <div>
                <span style={{ fontWeight: 600, color: "var(--nec-primary, #0284c7)" }}>Click to browse</span> or drag and drop photos / videos
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

            {/* Form Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "4px" }}>
                  Title <span style={{ color: "var(--nec-danger, #ef4444)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. NEC Annual Athletics Meet 2026 100m Sprint"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--nec-border)",
                    background: "var(--nec-surface)",
                    color: "var(--nec-text-main)",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, marginBottom: "4px" }}>
                  Caption / Description (Optional)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. CSE Strikers clinches gold at K.R. Indoor Stadium."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--nec-border)",
                    background: "var(--nec-surface)",
                    color: "var(--nec-text-main)",
                    fontSize: "0.88rem"
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)" }}>
                  <FileCheck size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={isUploading}
                    className="nec-btn nec-btn-secondary"
                    style={{ fontSize: "0.85rem", padding: "6px 14px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !title.trim()}
                    className="nec-btn nec-btn-primary"
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", padding: "6px 16px" }}
                  >
                    {isUploading ? "Uploading..." : <><Upload size={16} /> Publish to Gallery</>}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
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
          <ImageIcon size={48} style={{ opacity: 0.35, marginBottom: "16px", color: "var(--nec-primary)" }} />
          <h3 style={{ margin: "0 0 8px 0" }}>No Media Found</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)", fontSize: "0.9rem" }}>
            Upload photos or videos using the panel above to showcase campus sports achievements.
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
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        background: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
                        color: "#fff"
                      }}
                    >
                      <Film size={40} />
                      <span style={{ fontSize: "0.78rem", opacity: 0.9 }}>Click to Play Video</span>
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

                  <div className="nec-admin-gallery-footer">
                    <div className="nec-admin-gallery-meta">
                      <span>{item.date || "Recent"}</span>
                      {item.uploadedBy && <span> • {item.uploadedBy}</span>}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="nec-icon-btn"
                      style={{
                        color: "var(--nec-danger, #ef4444)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        background: "rgba(239, 68, 68, 0.06)",
                        padding: "6px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Delete from Gallery"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full-Screen Lightbox Modal */}
      {activeLightboxItem && (
        <div
          className="nec-gallery-lightbox-overlay"
          onClick={() => setActiveLightboxItem(null)}
        >
          <div
            className="nec-gallery-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nec-gallery-lightbox-media">
              {(activeLightboxItem.media_type || activeLightboxItem.type) === "video" ? (
                <video
                  src={getMediaUrl(activeLightboxItem.url || activeLightboxItem.media_url)}
                  controls
                  autoPlay
                  style={{ width: "100%", maxHeight: "60vh" }}
                />
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
                <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", marginTop: "4px", display: "inline-block" }}>
                  {activeLightboxItem.date} {activeLightboxItem.uploadedBy ? `• Uploaded by ${activeLightboxItem.uploadedBy}` : ""}
                </span>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => handleDelete(activeLightboxItem.id, activeLightboxItem.title)}
                  className="nec-btn nec-btn-secondary"
                  style={{ color: "var(--nec-danger, #ef4444)", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Trash2 size={15} /> Delete
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLightboxItem(null)}
                  className="nec-btn nec-btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
