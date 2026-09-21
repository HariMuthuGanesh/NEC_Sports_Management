import React, { useEffect, useState } from "react";
import { notificationsApi, dispatchNotificationUpdate } from "../../services/api/apiServices";
import { Bell, Check, Radio, Trophy, Award, Users, FileText, ArrowRight } from "lucide-react";
import "./NotificationDrawer.css";

export default function NotificationDrawer({ onClose, onUpdateCount, onSelectNav }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrawerNotifications = () => {
    notificationsApi.getNotifications()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setLoading(false);
        const unread = list.filter(n => !n.read && !n.is_read).length;
        if (onUpdateCount) onUpdateCount(unread);
      })
      .catch(() => {
        setNotifications([]);
        setLoading(false);
        if (onUpdateCount) onUpdateCount(0);
      });
  };

  useEffect(() => {
    fetchDrawerNotifications();
  }, []);

  const handleMarkAllRead = () => {
    notificationsApi.markAllRead()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list.map(n => ({ ...n, read: true, is_read: 1 })));
        if (onUpdateCount) onUpdateCount(0);
        dispatchNotificationUpdate(0);
      })
      .catch(() => {
        if (onUpdateCount) onUpdateCount(0);
      });
  };

  const handleItemClick = (n) => {
    if (!n.read && !n.is_read) {
      notificationsApi.markAsRead(n.id)
        .then(() => {
          const updated = notifications.map(item => item.id === n.id ? { ...item, read: true, is_read: 1 } : item);
          setNotifications(updated);
          const unread = updated.filter(item => !item.read && !item.is_read).length;
          if (onUpdateCount) onUpdateCount(unread);
          dispatchNotificationUpdate(unread);
        })
        .catch(() => {});
    }
  };

  const getIcon = (type, source) => {
    if (source === "announcement") {
      return <Award size={16} className="notif-type-icon score" />;
    }
    switch (type) {
      case "OD_STATUS": return <FileText size={16} className="notif-type-icon approval" />;
      case "ROSTER_ALERT": return <Users size={16} className="notif-type-icon live" />;
      case "MATCH_ALERT": return <Radio size={16} className="notif-type-icon live" />;
      case "score": return <Trophy size={16} className="notif-type-icon score" />;
      case "approval": return <Check size={16} className="notif-type-icon approval" />;
      default: return <Bell size={16} className="notif-type-icon" />;
    }
  };

  const formatTime = (timeStr, dateStr) => {
    if (!timeStr) return dateStr || "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr || timeStr;
    }
  };

  return (
    <div className="nec-notif-drawer">
      <div className="nec-notif-header">
        <div className="nec-notif-title">
          <Bell size={16} />
          <span>System Alerts & Notices</span>
        </div>
        <button className="nec-mark-read-btn" onClick={handleMarkAllRead}>
          Mark all read
        </button>
      </div>

      <div className="nec-notif-list">
        {loading ? (
          <div className="nec-notif-loading">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="nec-notif-empty">No notifications</div>
        ) : (
          notifications.slice(0, 8).map(n => (
            <div
              key={n.id}
              className={`nec-notif-item ${(!n.read && !n.is_read) ? "unread" : ""}`}
              onClick={() => handleItemClick(n)}
              title={(!n.read && !n.is_read) ? "Click to mark as read" : undefined}
            >
              <div className="nec-notif-icon-col">{getIcon(n.type, n.source)}</div>
              <div className="nec-notif-body">
                <div className="nec-notif-item-title">{n.title}</div>
                <div className="nec-notif-message">{n.message}</div>
                <div className="nec-notif-time">{formatTime(n.timestamp, n.date)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="nec-notif-footer">
        <button
          className="nec-notif-view-all-btn"
          onClick={() => {
            if (onClose) onClose();
            if (onSelectNav) onSelectNav("notifications");
          }}
        >
          View all in Notification Center <ArrowRight size={12} style={{ display: "inline", verticalAlign: "middle" }} />
        </button>
      </div>
    </div>
  );
}

