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

type NotificationGroup = "Einladungen" | "Bewerbungen" | "Freunde" | "Nachrichten" | "Spieltermine";

const groupOrder: NotificationGroup[] = [
  "Einladungen",
  "Bewerbungen",
  "Freunde",
  "Nachrichten",
  "Spieltermine",
];

function notificationGroup(notification: NotificationDto): NotificationGroup {
  if (notification.kind.startsWith("SessionInvitation")) return "Einladungen";
  if (notification.kind.startsWith("Application")) return "Bewerbungen";
  if (notification.kind.startsWith("Friend")) return "Freunde";
  if (notification.kind.includes("Message")) return "Nachrichten";
  return "Spieltermine";
}

function notificationIconClass(notification: NotificationDto) {
  return notificationGroup(notification).toLowerCase();
}

function notificationTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return "gerade eben";
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;

  return new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export default function NotificationBell() {
  const user = useUser();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const groupedNotifications = useMemo(
    () =>
      groupOrder
        .map((group) => ({
          group,
          items: notifications.filter((notification) => notificationGroup(notification) === group).slice(0, 6),
        }))
        .filter((entry) => entry.items.length > 0),
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

  function notificationTarget(notification: NotificationDto) {
    const link = notification.linkUrl ?? "/messages";
    const oldGameMatch = link.match(/^\/games\?gameId=([^&]+)/);
    return oldGameMatch ? `/sessions/${encodeURIComponent(decodeURIComponent(oldGameMatch[1]))}` : link;
  }

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-trigger"
        aria-label="Benachrichtigungen"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="notification-icon" aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-popover">
          <div className="notification-popover-header">
            <b>Benachrichtigungen</b>
            <button type="button" onClick={markAllRead}>Alle gelesen</button>
          </div>

          {notifications.length === 0 && (
            <div className="notification-empty">
              Keine neuen Benachrichtigungen. Einladungen, Nachrichten und Freundschaftsanfragen erscheinen hier.
            </div>
          )}

          {groupedNotifications.map(({ group, items }) => (
            <section key={group} className="notification-group">
              <h3>{group}</h3>
              {items.map((notification) => (
                <Link
                  key={notification.id}
                  to={notificationTarget(notification)}
                  className={`notification-item notification-${notificationGroup(notification).toLowerCase()} ${notification.isRead ? "read" : "unread"}`}
                  onClick={() => void markRead(notification)}
                >
                  <span
                    className={`notification-kind-icon notification-icon-${notificationIconClass(notification)}`}
                    aria-hidden="true"
                  />
                  <span className="notification-copy">
                    <b>{notification.title}</b>
                    <span>{notification.body}</span>
                  </span>
                  <time>{notificationTime(notification.createdAtUtc)}</time>
                </Link>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
