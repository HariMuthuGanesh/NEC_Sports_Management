import React, { useEffect, useState, useMemo } from "react";
import { announcementsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Modal } from "../../components/common/Modal";
import {
  Megaphone, Calendar, ArrowRight, ArrowLeft, Filter,
  AlertTriangle, Bell, Clock, CheckCircle, Tag
} from "lucide-react";
import "./PublicPortal.css";

function formatDate(val) {
  if (!val) return "Recent";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(val);
  }
}

export default function PublicAnnouncements() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState("ALL"); // 'ALL' | 'Intramural' | 'Inter-Collegiate'
  const [priorityFilter, setPriorityFilter] = useState("ALL"); // 'ALL' | 'URGENT' | 'NORMAL'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const fetchAnnouncements = () => {
    setLoading(true);
    setError(null);
    announcementsApi.getAll()
      .then(data => {
        setList(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message || "Failed to load announcements.");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filteredList = useMemo(() => {
    return list.filter(ann => {
      // Priority filter
      const isUrgent = ann.priority === "Urgent" || ann.priority === "High" || ann.isImportant;
      if (priorityFilter === "URGENT" && !isUrgent) return false;
      if (priorityFilter === "NORMAL" && isUrgent) return false;

      // Scope filter (if tournament name or content contains inter/intramural)
      if (scope !== "ALL") {
        const text = `${ann.title || ""} ${ann.content || ""} ${ann.tournament_name || ""}`.toLowerCase();
        const isInter = text.includes("inter") || text.includes("zonal") || text.includes("state") || text.includes("national");
        const annScope = isInter ? "Inter-Collegiate" : "Intramural";
        if (annScope !== scope) return false;
      }

      return true;
    });
  }, [list, priorityFilter, scope]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="nec-portal-page nec-public-announcements">
      {/* Page Header */}
      <div className="nec-page-header" style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        paddingBottom: "16px"
      }}>
        <div>
          <h2 className="nec-page-title" style={{ margin: "0 0 4px" }}>
            Sports Bulletins & Official Announcements
          </h2>
          <p className="nec-page-desc" style={{ margin: 0 }}>
            Official notices, match rescheduling alerts, selection trials, and athletic circulars issued by the Directorate.
          </p>
        </div>

        {/* Scope Selector */}
        <div style={{
          display: "inline-flex",
          background: "var(--nec-surface-raised)",
          padding: "4px",
          borderRadius: "10px",
          gap: "4px",
          border: "1px solid var(--nec-border)"
        }}>
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
                padding: "6px 14px",
                border: "none",
                borderRadius: "7px",
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                background: scope === tab.id ? "var(--nec-blue-accent, #0274be)" : "transparent",
                color: scope === tab.id ? "#fff" : "var(--nec-text-muted)"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority Filter Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        background: "var(--nec-surface)",
        padding: "10px 16px",
        borderRadius: "10px",
        border: "1px solid var(--nec-border)"
      }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--nec-text-muted)" }}>Priority:</span>
          {[
            { id: "ALL", label: `All Notices (${list.length})` },
            { id: "URGENT", label: "⚠️ High Priority / Urgent" },
            { id: "NORMAL", label: "General Notices" }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setPriorityFilter(tab.id); setCurrentPage(1); }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--nec-border)",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer",
                background: priorityFilter === tab.id ? "var(--nec-surface-raised)" : "transparent",
                color: priorityFilter === tab.id ? "var(--nec-blue-accent)" : "var(--nec-text-muted)"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
          Showing {filteredList.length} notices
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader rows={4} />
      ) : error ? (
        <PublicInfoCard
          icon={Megaphone}
          title="Unable to Load Bulletins"
          message={error}
          actionText="Retry"
          onAction={fetchAnnouncements}
        />
      ) : filteredList.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <Megaphone size={48} style={{ color: "var(--nec-text-muted)", margin: "0 auto 16px" }} />
          <h3 style={{ margin: "0 0 8px", color: "var(--nec-text-main)" }}>No Bulletins Found</h3>
          <p style={{ margin: 0, color: "var(--nec-text-muted)" }}>
            There are no sports bulletins matching the selected filters.
          </p>
        </Card>
      ) : (
        <div className="nec-ann-full-list" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {paginatedList.map((ann, idx) => {
            const isUrgent = ann.priority === "Urgent" || ann.priority === "High" || ann.isImportant;
            const dateStr = formatDate(ann.created_at || ann.published_at || ann.postedDate);

            return (
              <Card
                key={ann.id || ann.announcement_id || idx}
                className="nec-ann-card"
                style={{
                  borderRadius: "12px",
                  padding: "18px 20px",
                  border: isUrgent ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid var(--nec-border)",
                  borderLeft: isUrgent ? "4px solid #ef4444" : "4px solid var(--nec-blue-accent)",
                  cursor: "pointer",
                  transition: "transform 0.15s, box-shadow 0.15s"
                }}
                onClick={() => setSelectedAnnouncement(ann)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Badge variant={isUrgent ? "danger" : "default"} style={{ fontSize: "0.72rem", fontWeight: 700 }}>
                      {isUrgent ? "⚠️ High Priority" : ann.category || "General Notice"}
                    </Badge>
                    {ann.target_department && (
                      <span style={{ fontSize: "0.75rem", color: "var(--nec-text-muted)", fontWeight: 600 }}>
                        Dept: {ann.target_department}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "var(--nec-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={13} /> {dateStr}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 6px", fontSize: "1.15rem", fontWeight: 800, color: "var(--nec-text-main)" }}>
                  {ann.title}
                </h3>

                <p style={{
                  margin: "0 0 10px",
                  fontSize: "0.88rem",
                  color: "var(--nec-text-muted)",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}>
                  {ann.content}
                </p>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--nec-blue-accent)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                    Read Complete Notice <ArrowRight size={13} />
                  </span>
                </div>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="nec-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ArrowLeft size={16} /> Previous
              </Button>
              <span className="nec-page-indicator" style={{ fontSize: "0.85rem", color: "var(--nec-text-muted)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Announcement Detail Reader Modal */}
      {selectedAnnouncement && (
        <Modal
          isOpen={Boolean(selectedAnnouncement)}
          onClose={() => setSelectedAnnouncement(null)}
          title="Official Sports Directorate Notice"
          size="md"
        >
          <div style={{ padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <Badge variant={selectedAnnouncement.priority === "Urgent" || selectedAnnouncement.priority === "High" ? "danger" : "default"}>
                {selectedAnnouncement.priority || "General"}
              </Badge>
              <span style={{ fontSize: "0.8rem", color: "var(--nec-text-muted)" }}>
                📅 Published: {formatDate(selectedAnnouncement.created_at || selectedAnnouncement.published_at || selectedAnnouncement.postedDate)}
              </span>
            </div>

            <h3 style={{ margin: "0 0 14px", fontSize: "1.3rem", fontWeight: 800, color: "var(--nec-text-main)", lineHeight: 1.3 }}>
              {selectedAnnouncement.title}
            </h3>

            <div style={{
              background: "var(--nec-surface-raised)",
              padding: "16px",
              borderRadius: "10px",
              fontSize: "0.92rem",
              lineHeight: 1.6,
              color: "var(--nec-text-main)",
              whiteSpace: "pre-wrap",
              marginBottom: "20px"
            }}>
              {selectedAnnouncement.content}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSelectedAnnouncement(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
