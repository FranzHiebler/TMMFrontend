import type { AuthUserResponse } from "./authApi";
import { API, apiFetch, handleResponse } from "./apiClient";

export interface DevUserResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  defaultLocationId?: string | null;
  description?: string | null;
}

export async function getDevUsers(): Promise<DevUserResponse[]> {
  const res = await apiFetch(`${API}/Admin/dev-users`);
  return handleResponse<DevUserResponse[]>(res, "Dev-User laden fehlgeschlagen");
}

export async function startImpersonation(targetUserId: string): Promise<AuthUserResponse> {
  const res = await apiFetch(`${API}/Admin/impersonation/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetUserId }),
  });

  return handleResponse<AuthUserResponse>(res, "Testansicht starten fehlgeschlagen");
}

export async function stopImpersonation(): Promise<AuthUserResponse> {
  const res = await apiFetch(`${API}/Admin/impersonation/stop`, { method: "POST" });
  return handleResponse<AuthUserResponse>(res, "Testansicht beenden fehlgeschlagen");
}
