import type { User } from "../context/UserContext";
import type { NotificationDto } from "../types/game";
import { API, authHeaders, handleResponse, handleVoidResponse } from "./apiClient";

export async function getNotifications(user: User): Promise<NotificationDto[]> {
  const res = await fetch(`${API}/Notifications`, {
    headers: authHeaders(user),
  });
  return handleResponse<NotificationDto[]>(res, "Benachrichtigungen laden fehlgeschlagen");
}

export async function markNotificationRead(id: string, user: User): Promise<void> {
  const res = await fetch(`${API}/Notifications/${id}/read`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleVoidResponse(res, "Benachrichtigung konnte nicht gelesen markiert werden");
}

export async function markAllNotificationsRead(user: User): Promise<void> {
  const res = await fetch(`${API}/Notifications/read-all`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleVoidResponse(res, "Benachrichtigungen konnten nicht gelesen markiert werden");
}
