import type { User } from "../context/UserContext";
import type {
  FriendDto,
  FriendRequestDto,
  SendFriendRequestRequest,
} from "../types/game";
import { API, authHeaders, handleResponse, handleVoidResponse } from "./apiClient";

export async function getFriends(user: User): Promise<FriendDto[]> {
  const res = await fetch(`${API}/Friends`, {
    headers: authHeaders(user),
  });
  return handleResponse<FriendDto[]>(res, "Freunde laden fehlgeschlagen");
}

export async function getFriendRequests(user: User): Promise<FriendRequestDto[]> {
  const res = await fetch(`${API}/Friends/requests`, {
    headers: authHeaders(user),
  });
  return handleResponse<FriendRequestDto[]>(res, "Freundschaftsanfragen laden fehlgeschlagen");
}

export async function sendFriendRequest(
  request: SendFriendRequestRequest,
  user: User
): Promise<FriendRequestDto | null> {
  const res = await fetch(`${API}/Friends/request`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<FriendRequestDto | null>(res, "Freundschaftsanfrage fehlgeschlagen");
}

export async function acceptFriendRequest(id: string, user: User): Promise<FriendDto> {
  const res = await fetch(`${API}/Friends/${id}/accept`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleResponse<FriendDto>(res, "Freundschaftsanfrage konnte nicht angenommen werden");
}

export async function rejectFriendRequest(id: string, user: User): Promise<void> {
  const res = await fetch(`${API}/Friends/${id}/reject`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleVoidResponse(res, "Freundschaftsanfrage konnte nicht abgelehnt werden");
}

export async function removeFriend(id: string, user: User): Promise<void> {
  const res = await fetch(`${API}/Friends/${id}`, {
    method: "DELETE",
    headers: authHeaders(user),
  });
  return handleVoidResponse(res, "Freund konnte nicht entfernt werden");
}
