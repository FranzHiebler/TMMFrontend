import { API, apiFetch, handleResponse, handleVoidResponse } from "./apiClient";

export interface AuthUserResponse {
  userId: string;
  displayName: string;
  email?: string | null;
  isSystemAdmin: boolean;
  realUserIsSystemAdmin: boolean;
  isDevUser: boolean;
  isImpersonating: boolean;
  realUserId?: string | null;
  realDisplayName?: string | null;
  effectiveUserId?: string | null;
  effectiveDisplayName?: string | null;
}

export async function getAuthMe(): Promise<AuthUserResponse> {
  const res = await apiFetch(`${API}/Auth/me`);
  return handleResponse<AuthUserResponse>(res, "Anmeldung prüfen fehlgeschlagen");
}

export async function loginWithGoogle(idToken: string): Promise<AuthUserResponse> {
  const res = await apiFetch(`${API}/Auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  return handleResponse<AuthUserResponse>(res, "Google Login fehlgeschlagen");
}

export async function logout(): Promise<void> {
  const res = await apiFetch(`${API}/Auth/logout`, { method: "POST" });
  return handleVoidResponse(res, "Logout fehlgeschlagen");
}
