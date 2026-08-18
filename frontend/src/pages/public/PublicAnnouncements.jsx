import React, { useEffect, useState } from "react";
import { announcementsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import Badge from "../../components/common/Badge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { Megaphone, Calendar } from "lucide-react";
import "./PublicPortal.css";

export default function PublicAnnouncements() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    announcementsApi.getAnnouncements().then(data => {
      setList(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Institutional Sports Bulletin & Announcements</h2>
        <p className="nec-page-desc">Official news, rules, entry schedules, and circulars from NEC Physical Education Department.</p>
      </div>

      {loading ? (
        <SkeletonLoader rows={3} />
      ) : (
        <div className="nec-ann-full-list">
          {list.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(ann => (
            <Card key={ann.id} className="nec-ann-card">
              <div className="nec-ann-head">
                <div className="nec-ann-tag-row">
                  <Badge status={ann.category === "Important" ? "danger" : "info"}>{ann.category}</Badge>
                  <span className="nec-ann-date"><Calendar size={14} /> {ann.date}</span>
                </div>
                <span className="nec-ann-by">By {ann.author}</span>
              </div>
              <h3 className="nec-ann-title">{ann.title}</h3>
              <p className="nec-ann-body">{ann.content}</p>
            </Card>
          ))}
          
          {Math.ceil(list.length / pageSize) > 1 && (
            <div className="nec-table-pagination" style={{ marginTop: "20px", border: "1px solid var(--nec-border)", borderRadius: "8px" }}>
              <button
                className="nec-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="nec-page-info">
                Page {currentPage} of {Math.ceil(list.length / pageSize)}
              </span>
              <button
                className="nec-page-btn"
                disabled={currentPage === Math.ceil(list.length / pageSize)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
