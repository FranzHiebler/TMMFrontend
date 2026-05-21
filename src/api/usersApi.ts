import type {
  PublicUserProfileResponse,
  UpdateUserProfileRequest,
  UserProfileResponse,
  UserSearchResponse,
} from "../types/game";
import type { User } from "../context/UserContext";
import { API, authHeaders, handleResponse } from "./apiClient";

export async function searchUsers(query: string): Promise<UserSearchResponse[]> {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.append("query", query.trim());
  }

  const res = await fetch(`${API}/Users/search?${params.toString()}`);
  return handleResponse<UserSearchResponse[]>(res, "User-Suche fehlgeschlagen");
}

export async function getCurrentUserProfile(user: User): Promise<UserProfileResponse> {
  const res = await fetch(`${API}/Users/me`, {
    headers: authHeaders(user),
  });

  return handleResponse<UserProfileResponse>(res, "Profil laden fehlgeschlagen");
}

export async function updateCurrentUserProfile(
  request: UpdateUserProfileRequest,
  user: User
): Promise<UserProfileResponse> {
  const res = await fetch(`${API}/Users/me`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<UserProfileResponse>(res, "Profil speichern fehlgeschlagen");
}

export async function getPublicUserProfile(
  userId: string,
  user: User
): Promise<PublicUserProfileResponse> {
  const res = await fetch(`${API}/Users/${userId}/profile`, {
    headers: authHeaders(user),
  });

  return handleResponse<PublicUserProfileResponse>(res, "Profil laden fehlgeschlagen");
}