import type { SystemOption } from "../types/game";
import type { User } from "../context/UserContext";
import { API, apiFetch, authHeaders, handleResponse } from "./apiClient";

export async function getSystems(): Promise<SystemOption[]> {
  const res = await apiFetch(`${API}/Systems`);
  return handleResponse<SystemOption[]>(res, "Systeme laden fehlgeschlagen");
}

export async function createSystem(request: SystemOption, user: User): Promise<SystemOption> {
  const res = await apiFetch(`${API}/Systems`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<SystemOption>(res, "System konnte nicht angelegt werden");
}

export async function updateSystem(key: string, request: SystemOption, user: User): Promise<SystemOption> {
  const res = await apiFetch(`${API}/Systems/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<SystemOption>(res, "System konnte nicht gespeichert werden");
}
