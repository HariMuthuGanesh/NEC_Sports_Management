import React, { useEffect, useState } from "react";
import { announcementsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { Megaphone, Plus, Trash2, Calendar } from "lucide-react";
import "./AdminPortal.css";

export default function AnnouncementsManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Important");
  const [content, setContent] = useState("");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = () => {
    setLoading(true);
    announcementsApi.getAnnouncements().then(data => {
      setList(data);
      setLoading(false);
    });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    announcementsApi.createAnnouncement({
      title,
      category,
      content,
      author: "Physical Education Director (PT Sir)"
    }).then(() => {
      setIsModalOpen(false);
      setTitle("");
      setContent("");
      loadAnnouncements();
    });
  };

  const handleDelete = (id) => {
    announcementsApi.deleteAnnouncement(id).then(() => {
      loadAnnouncements();
    });
  };

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">Institutional Announcements & Circulars</h2>
          <p className="nec-page-desc">Publish official sports circulars, tournament deadlines, and campus facility notices.</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
          Post New Announcement
        </Button>
      </div>

      {loading ? (
        <SkeletonLoader rows={3} />
      ) : (
        <div className="nec-ann-full-list">
          {list.map(ann => (
            <Card key={ann.id} className="nec-ann-card">
              <div className="nec-ann-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="nec-ann-tag-row">
                  <Badge status={ann.category === "Important" ? "danger" : "info"}>{ann.category}</Badge>
                  <span className="nec-ann-date"><Calendar size={14} /> {ann.date}</span>
                  <span className="nec-ann-by">By {ann.author}</span>
                </div>
                <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(ann.id)}>
                  Delete
                </Button>
              </div>
              <h3 className="nec-ann-title" style={{ marginTop: "10px" }}>{ann.title}</h3>
              <p className="nec-ann-body">{ann.content}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post New Official Announcement"
      >
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Announcement Title</label>
            <input
              type="text"
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              placeholder="e.g. Inter-Department Meet Schedule & Guidelines"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Category</label>
            <select
              className="nec-table-search-input"
              style={{ maxWidth: "100%" }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="Important">Important Notice</option>
              <option value="Facility">Facility & Venue Notice</option>
              <option value="Schedule">Schedule Update</option>
              <option value="General">General Announcement</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Notice Details / Content</label>
            <textarea
              required
              className="nec-table-search-input"
              style={{ maxWidth: "100%", height: "100px", fontFamily: "inherit" }}
              placeholder="Enter announcement body..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Publish Announcement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
