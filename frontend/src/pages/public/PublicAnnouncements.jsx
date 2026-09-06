import React, { useEffect, useState } from "react";
import { announcementsApi } from "../../services/api/apiServices";
import { Card } from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import PublicInfoCard from "../../components/common/PublicInfoCard";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import { Megaphone, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import "./PublicPortal.css";

export default function PublicAnnouncements() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchAnnouncements = () => {
    setLoading(true);
    setError(null);
    announcementsApi.getAll()
      .then(data => {
        setList(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const totalPages = Math.ceil(list.length / pageSize);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header">
        <h2 className="nec-page-title">Sports Announcements</h2>
        <p className="nec-page-desc">Official notices, tournament rules, registration deadlines, and campus sports updates.</p>
      </div>

      {(error || (!loading && list.length === 0)) ? (
        <PublicInfoCard
          icon={Megaphone}
          title="No Announcements"
          message="There are no new sports announcements at this time. Visit again for updates on registrations and tournaments."
        />
      ) : loading ? (
        <SkeletonLoader rows={3} />
      ) : (
        <div className="nec-ann-full-list">
          {list.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ann, idx) => {
            const isImp = ann.isImportant || ann.priority === 'HIGH' || ann.priority === 'CRITICAL';
            const rawDate = ann.postedDate || ann.created_at;
            const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : 'Recent';
            return (
              <Card key={ann.id || ann.announcement_id || idx} className="nec-ann-card">
                <div className="nec-ann-top">
                  <Badge status={isImp ? "danger" : "info"}>
                    {isImp ? "IMPORTANT" : "NOTICE"}
                  </Badge>
                  <span className="nec-ann-date">
                    <Calendar size={14} /> {dateStr}
                  </span>
                </div>
                <h3 className="nec-ann-title">{ann.title}</h3>
                <p className="nec-ann-content">{ann.content}</p>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="nec-pagination">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ArrowLeft size={16} /> Previous
              </Button>
              <span className="nec-page-indicator">Page {currentPage} of {totalPages}</span>
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
    </div>
  );
}
