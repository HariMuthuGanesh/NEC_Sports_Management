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
          {list.map(ann => (
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
        </div>
      )}
    </div>
  );
}
