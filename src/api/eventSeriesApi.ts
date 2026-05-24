import type { User } from "../context/UserContext";
import type { CreateEventSeriesRequest, EventSeriesDto, GameResponse } from "../types/game";
import { API, authHeaders, handleResponse } from "./apiClient";

export async function getEventSeries(user: User): Promise<EventSeriesDto[]> {
  const res = await fetch(`${API}/EventSeries`, { headers: authHeaders(user) });
  return handleResponse<EventSeriesDto[]>(res, "Event-Serien laden fehlgeschlagen");
}

export async function createEventSeries(
  request: CreateEventSeriesRequest,
  user: User
): Promise<EventSeriesDto> {
  const res = await fetch(`${API}/EventSeries`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<EventSeriesDto>(res, "Event-Serie konnte nicht erstellt werden");
}

export async function createNextSeriesSession(id: string, user: User): Promise<GameResponse> {
  const res = await fetch(`${API}/EventSeries/${id}/create-next-session`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleResponse<GameResponse>(res, "Serien-Session konnte nicht erzeugt werden");
}
