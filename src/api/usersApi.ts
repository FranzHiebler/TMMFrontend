import type {
  PublicUserProfileResponse,
  UpdateUserProfileRequest,
  UserDiscoverySettingsDto,
  UserPermissionsResponse,
  UserProfileResponse,
  UserSearchResponse,
} from "../types/game";
import type { User } from "../context/UserContext";
import { API, authHeaders, handleResponse } from "./apiClient";

export async function searchUsers(query: string, user?: User): Promise<UserSearchResponse[]> {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.append("query", query.trim());
  }

  const res = await fetch(`${API}/Users/search?${params.toString()}`, {
    headers: user ? authHeaders(user) : undefined,
  });
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

export async function uploadProfileImage(file: File, user: User): Promise<UserProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API}/Users/me/profile-image`, {
    method: "POST",
    headers: {
      "x-user-id": user.userId,
      "x-display-name": user.displayName,
    },
    body: formData,
  });

  return handleResponse<UserProfileResponse>(res, "Profilbild hochladen fehlgeschlagen");
}

export async function getCurrentUserPermissions(user: User): Promise<UserPermissionsResponse> {
  const res = await fetch(`${API}/Users/me/permissions`, {
    headers: authHeaders(user),
  });

  return handleResponse<UserPermissionsResponse>(res, "Berechtigungen laden fehlgeschlagen");
}

export async function updateDiscoverySettings(
  request: UserDiscoverySettingsDto,
  user: User
): Promise<UserDiscoverySettingsDto> {
  const res = await fetch(`${API}/Users/me/discovery-settings`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<UserDiscoverySettingsDto>(res, "Karteneinstellungen speichern fehlgeschlagen");
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
