import React, { useEffect, useState } from "react";
import { Card } from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/AuthContext";
import { notificationsApi } from "../../services/api/apiServices";
import Pagination from "../../components/common/Pagination";
import { Bell, CheckSquare } from "lucide-react";
import "./PlayerPortal.css";

export default function PlayerNotifications() {
  const { t } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    setLoading(true);
    notificationsApi.getNotifications().then(data => {
      // Add a mock read status for demo purposes
      const notifsWithStatus = data.map(n => ({ ...n, read: false }));
      setNotifs(notifsWithStatus);
      setLoading(false);
    });
  }, []);

  const markAllRead = () => {
    setNotifs(notifs.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setNotifs(notifs.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const totalPages = Math.ceil(notifs.length / pageSize) || 1;
  const paginatedNotifs = notifs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="nec-portal-page">
      <div className="nec-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="nec-page-title">{t.notifications || "Athlete Notifications"}</h2>
          <p className="nec-page-desc">Stay updated with official circulars and alerts.</p>
        </div>
        <Button variant="outline" icon={CheckSquare} onClick={markAllRead} disabled={unreadCount === 0}>
          Mark All as Read
        </Button>
      </div>

      <Card title={`Inbox (${unreadCount} unread)`} loading={loading}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
          {paginatedNotifs.map(n => (
            <div 
              key={n.id} 
              style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: "14px", 
                padding: "16px", 
                backgroundColor: n.read ? "var(--nec-surface-raised)" : "var(--nec-primary-light)", 
                borderRadius: "8px",
                border: n.read ? "1px solid var(--nec-border)" : "1px solid var(--nec-primary)",
                transition: "all 0.2s"
              }}
            >
              <Bell size={20} style={{ color: n.read ? "var(--nec-text-muted)" : "var(--nec-primary)", marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: "1rem", color: n.read ? "inherit" : "var(--nec-primary-dark)" }}>{n.title}</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", color: "var(--nec-text-muted)" }}>{n.message}</p>
                <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "var(--nec-text-disabled)" }}>
                  {n.date}
                </div>
              </div>
              {!n.read && (
                <Button variant="outline" size="sm" onClick={() => markAsRead(n.id)}>
                  Mark Read
                </Button>
              )}
            </div>
          ))}
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
    </div>
  );
}
