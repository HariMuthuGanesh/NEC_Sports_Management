import React, { useEffect, useState } from "react";
import { notificationsApi } from "../../services/api/apiServices";
import { Bell, Check, Radio, Trophy, Award } from "lucide-react";
import "./NotificationDrawer.css";

export default function NotificationDrawer({ onClose, onUpdateCount }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.getNotifications()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setLoading(false);
        if (onUpdateCount) {
          onUpdateCount(list.filter(n => !n.read && !n.is_read).length);
        }
      })
      .catch(() => {
        setNotifications([]);
        setLoading(false);
        if (onUpdateCount) onUpdateCount(0);
      });
  }, [onUpdateCount]);

  const handleMarkAllRead = () => {
    notificationsApi.markAllRead()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        if (onUpdateCount) onUpdateCount(0);
        if (onClose) onClose();
      })
      .catch(() => {
        if (onUpdateCount) onUpdateCount(0);
        if (onClose) onClose();
      });
  };

  const getIcon = (type) => {
    switch (type) {
      case "match": return <Radio size={16} className="notif-type-icon live" />;
      case "approval": return <Check size={16} className="notif-type-icon approval" />;
      case "score": return <Trophy size={16} className="notif-type-icon score" />;
      default: return <Award size={16} className="notif-type-icon" />;
    }
  };

  return (
    <div className="nec-notif-drawer">
      <div className="nec-notif-header">
        <div className="nec-notif-title">
          <Bell size={16} />
          <span>System Alerts</span>
        </div>
        <button className="nec-mark-read-btn" onClick={handleMarkAllRead}>
          Mark all as read
        </button>
      </div>

      <div className="nec-notif-list">
        {loading ? (
          <div className="nec-notif-loading">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="nec-notif-empty">No notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`nec-notif-item ${!n.read ? "unread" : ""}`}>
              <div className="nec-notif-icon-col">{getIcon(n.type)}</div>
              <div className="nec-notif-body">
                <div className="nec-notif-item-title">{n.title}</div>
                <div className="nec-notif-message">{n.message}</div>
                <div className="nec-notif-time">{n.timestamp}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
