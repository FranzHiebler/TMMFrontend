import type { User } from "../context/UserContext";
import type {
  ConvertPlayRequestRequest,
  CreatePlayRequestRequest,
  GameResponse,
  PlayRequestDto,
} from "../types/game";
import { API, apiFetch, authHeaders, handleResponse, handleVoidResponse } from "./apiClient";

export async function getPlayRequests(user: User): Promise<PlayRequestDto[]> {
  const res = await apiFetch(`${API}/PlayRequests`, { headers: authHeaders(user) });
  return handleResponse<PlayRequestDto[]>(res, "Spielgesuche laden fehlgeschlagen");
}

export async function getMyPlayRequests(user: User): Promise<PlayRequestDto[]> {
  const res = await apiFetch(`${API}/PlayRequests/mine`, { headers: authHeaders(user) });
  return handleResponse<PlayRequestDto[]>(res, "Meine Spielgesuche laden fehlgeschlagen");
}

export async function createPlayRequest(
  request: CreatePlayRequestRequest,
  user: User
): Promise<PlayRequestDto> {
  const res = await apiFetch(`${API}/PlayRequests`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<PlayRequestDto>(res, "Spielgesuch konnte nicht erstellt werden");
}

export async function convertPlayRequest(
  id: string,
  request: ConvertPlayRequestRequest,
  user: User
): Promise<GameResponse> {
  const res = await apiFetch(`${API}/PlayRequests/${id}/convert`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<GameResponse>(res, "Spielgesuch konnte nicht umgewandelt werden");
}

export async function closePlayRequest(id: string, user: User): Promise<void> {
  const res = await apiFetch(`${API}/PlayRequests/${id}/close`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleVoidResponse(res, "Spielgesuch konnte nicht geschlossen werden");
}
