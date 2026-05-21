import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notificationsApi";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import type { NotificationDto } from "../types/game";

export default function NotificationBell() {
  const user = useUser();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        const next = await getNotifications(user);
        if (!isCancelled) setNotifications(next);
      } catch {
        // Keep nav quiet; the full pages still surface actionable errors.
      }
    }

    void load();
    const id = window.setInterval(load, 30000);

    return () => {
      isCancelled = true;
      window.clearInterval(id);
    };
  }, [user]);

  async function markRead(notification: NotificationDto) {
    try {
      await markNotificationRead(notification.id, user);
      setNotifications((prev) =>
        prev.map((item) => item.id === notification.id ? { ...item, isRead: true } : item)
      );
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Benachrichtigung fehlgeschlagen");
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead(user);
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Benachrichtigungen fehlgeschlagen");
    }
  }

  return (
    <div className="notification-bell">
      <button type="button" className="notification-trigger" onClick={() => setIsOpen((prev) => !prev)}>
        <span>Mitteilungen</span>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-popover">
          <div className="notification-popover-header">
            <b>Benachrichtigungen</b>
            <button type="button" onClick={markAllRead}>Alle gelesen</button>
          </div>

          {notifications.length === 0 && (
            <div className="notification-empty">Noch keine Benachrichtigungen.</div>
          )}

          {notifications.slice(0, 8).map((notification) => (
            <Link
              key={notification.id}
              to={notification.linkUrl ?? "/messages"}
              className={`notification-item ${notification.isRead ? "" : "unread"}`}
              onClick={() => void markRead(notification)}
            >
              <b>{notification.title}</b>
              <span>{notification.body}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
