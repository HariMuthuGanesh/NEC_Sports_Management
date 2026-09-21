import React, { useEffect, useState } from "react";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth, ROLES } from "../../context/AuthContext";
import { notificationsApi, dispatchNotificationUpdate } from "../../services/api/apiServices";
import ErrorState from "../../components/common/ErrorState";
import Pagination from "../../components/common/Pagination";
import { Bell, CheckSquare, FileText, Users, Radio, Award, Shield } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerNotifications() {
  const { t, currentUser } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const loadNotifications = () => {
    setLoading(true);
    setError(null);
    notificationsApi.getNotifications().then(data => {
      const list = Array.isArray(data) ? data : [];
      setNotifs(list);
      setLoading(false);
      const unread = list.filter(n => !n.read && !n.is_read).length;
      dispatchNotificationUpdate(unread);
    }).catch(err => {
      console.error(err);
      setError(err.message);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAllRead = () => {
    notificationsApi.markAllRead().then((notifications) => {
      const list = Array.isArray(notifications) ? notifications : notifs.map(n => ({ ...n, read: true, is_read: 1 }));
      setNotifs(list);
      dispatchNotificationUpdate(0);
    }).catch((requestError) => setError(requestError.message));
  };

  const markAsRead = (id) => {
    notificationsApi.markAsRead(id).then(() => {
      const updated = notifs.map((n) => (n.id === id ? { ...n, read: true, is_read: 1 } : n));
      setNotifs(updated);
      const remainingUnread = updated.filter(n => !n.read && !n.is_read).length;
      dispatchNotificationUpdate(remainingUnread);
    }).catch((requestError) => setError(requestError.message));
  };

  const unreadCount = notifs.filter(n => !n.read && !n.is_read).length;

  const totalPages = Math.ceil(notifs.length / pageSize) || 1;
  const paginatedNotifs = notifs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPageTitle = () => {
    if (currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.PRESIDENT) {
      return "Notification Center";
    }
    if (currentUser?.role === ROLES.COORDINATOR) {
      return "Department Notifications";
    }
    return t.notifications || "Athlete Notifications";
  };

  const getPageDesc = () => {
    if (currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.PRESIDENT) {
      return "Review system dispatches, team registration approvals, and departmental alerts.";
    }
    return "Stay updated with official circulars, match announcements, and system alerts.";
  };

  const getIcon = (type, source) => {
    if (source === "announcement") {
      return <Award size={18} style={{ color: "var(--nec-gold)", marginTop: "2px" }} />;
    }
    switch (type) {
      case "OD_STATUS": return <FileText size={18} style={{ color: "var(--nec-blue-accent, #0284c7)", marginTop: "2px" }} />;
      case "ROSTER_ALERT": return <Users size={18} style={{ color: "var(--nec-success, #10b981)", marginTop: "2px" }} />;
      case "MATCH_ALERT": return <Radio size={18} style={{ color: "var(--nec-live, #ef4444)", marginTop: "2px" }} />;
      case "LEADERSHIP_ALERT": return <Shield size={18} style={{ color: "var(--nec-navy, #1e3a8a)", marginTop: "2px" }} />;
      default: return <Bell size={18} style={{ color: "var(--nec-primary)", marginTop: "2px" }} />;
    }
  };

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 className="nec-page-title">{getPageTitle()}</h2>
          <p className="nec-page-desc">{getPageDesc()}</p>
        </div>
        <Button variant="outline" icon={CheckSquare} onClick={markAllRead} disabled={unreadCount === 0}>
          Mark All as Read
        </Button>
      </div>

      {error ? (
        <div style={{ padding: "40px" }}>
          <ErrorState onRetry={loadNotifications} />
        </div>
      ) : (
        <Card title={`Inbox (${unreadCount} unread)`} loading={loading}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
            {paginatedNotifs.map(n => {
              const isUnread = !n.read && !n.is_read;
              return (
                <div 
                  key={n.id} 
                  style={{ 
                    display: "flex", 
                    alignItems: "flex-start", 
                    gap: "14px", 
                    padding: "16px", 
                    backgroundColor: isUnread ? "rgba(2, 132, 199, 0.06)" : "var(--nec-surface-raised)", 
                    borderRadius: "10px",
                    border: isUnread ? "1px solid rgba(2, 132, 199, 0.3)" : "1px solid var(--nec-border)",
                    transition: "all 0.2s"
                  }}
                >
                  {getIcon(n.type, n.source)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "0.95rem", color: isUnread ? "var(--nec-text-main)" : "var(--nec-text-muted)" }}>
                        {n.title}
                      </strong>
                      {n.source === "announcement" && (
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.12)", color: "#b45309", fontWeight: 700 }}>
                          CIRCULAR
                        </span>
                      )}
                      {n.type && n.type !== "GENERAL" && n.source !== "announcement" && (
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(2, 132, 199, 0.1)", color: "var(--nec-blue-accent, #0284c7)", fontWeight: 700 }}>
                          {n.type.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "6px 0 0 0", fontSize: "0.875rem", color: "var(--nec-text-muted)", lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "var(--nec-text-disabled)" }}>
                      {n.date || (n.timestamp ? new Date(n.timestamp).toLocaleString() : "")}
                    </div>
                  </div>
                  {isUnread && (
                    <Button variant="outline" size="sm" onClick={() => markAsRead(n.id)}>
                      Mark Read
                    </Button>
                  )}
                </div>
              );
            })}
            {notifs.length === 0 && (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--nec-text-muted)" }}>
                No notifications at this time.
              </div>
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                style={{ borderTop: "none", marginTop: "10px", padding: 0 }}
              />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

