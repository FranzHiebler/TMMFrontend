import type { SystemOption } from "../types/game";
import type { User } from "../context/UserContext";
import { API, authHeaders, handleResponse } from "./apiClient";

export async function getSystems(): Promise<SystemOption[]> {
  const res = await fetch(`${API}/Systems`);
  return handleResponse<SystemOption[]>(res, "Systeme laden fehlgeschlagen");
}

export async function createSystem(request: SystemOption, user: User): Promise<SystemOption> {
  const res = await fetch(`${API}/Systems`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<SystemOption>(res, "System konnte nicht angelegt werden");
}