import type {
  CreateLocationRequest,
  LocationJoinRequestResponse,
  LocationDiscoveryResponse,
  LocationMemberResponse,
  LocationOption,
  LocationResponse,
  SearchNearbyLocationsRequest,
  UpsertLocationMemberRequest,
} from "../types/game";
import type { User } from "../context/UserContext";
import { API, authHeaders, handleResponse, handleVoidResponse } from "./apiClient";

export async function getLocations(): Promise<LocationOption[]> {
  const res = await fetch(`${API}/Locations`);
  return handleResponse<LocationOption[]>(res, "Locations laden fehlgeschlagen");
}

export async function getMyLocations(user: User): Promise<LocationResponse[]> {
  const res = await fetch(`${API}/Locations/mine`, {
    headers: authHeaders(user),
  });

  return handleResponse<LocationResponse[]>(res, "Meine Locations laden fehlgeschlagen");
}

export async function searchNearbyLocations(
  request: SearchNearbyLocationsRequest,
  user: User
): Promise<LocationResponse[]> {
  const params = new URLSearchParams({
    latitude: request.latitude.toString(),
    longitude: request.longitude.toString(),
    radiusInMeters: (request.radiusKm * 1000).toString(),
  });

  if (request.systemKey) params.append("systemKey", request.systemKey);

  const res = await fetch(`${API}/Locations/nearby?${params.toString()}`, {
    headers: authHeaders(user),
  });

  return handleResponse<LocationResponse[]>(res, "Nearby Locations fehlgeschlagen");
}

export async function requestLocationMembership(
  locationId: string,
  message: string | null,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Locations/${locationId}/join-requests`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify({ message }),
  });

  return handleVoidResponse(res, "Anfrage konnte nicht gesendet werden");
}

export async function createLocation(
  request: CreateLocationRequest,
  user: User
): Promise<LocationResponse> {
  const res = await fetch(`${API}/Locations`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<LocationResponse>(res, "Location erstellen fehlgeschlagen");
}

export async function updateLocation(
  id: string,
  request: CreateLocationRequest,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Locations/${id}`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleVoidResponse(res, "Location aktualisieren fehlgeschlagen");
}

export async function getLocationMembers(
  locationId: string,
  user: User
): Promise<LocationMemberResponse[]> {
  const res = await fetch(`${API}/Locations/${locationId}/members`, {
    headers: authHeaders(user),
  });

  return handleResponse<LocationMemberResponse[]>(res, "Mitglieder laden fehlgeschlagen");
}

export async function upsertLocationMember(
  locationId: string,
  request: UpsertLocationMemberRequest,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Locations/${locationId}/members`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleVoidResponse(res, "Mitglied speichern fehlgeschlagen");
}

export async function removeLocationMember(
  locationId: string,
  userId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Locations/${locationId}/members/${userId}`, {
    method: "DELETE",
    headers: authHeaders(user),
  });

  return handleVoidResponse(res, "Mitglied entfernen fehlgeschlagen");
}

export async function getLocationJoinRequests(
  locationId: string,
  user: User
): Promise<LocationJoinRequestResponse[]> {
  const res = await fetch(`${API}/Locations/${locationId}/join-requests`, {
    headers: authHeaders(user),
  });

  return handleResponse<LocationJoinRequestResponse[]>(
    res,
    "Beitrittsanfragen laden fehlgeschlagen"
  );
}

export async function acceptLocationJoinRequest(
  locationId: string,
  requestId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Locations/${locationId}/join-requests/${requestId}/accept`, {
    method: "POST",
    headers: authHeaders(user),
  });

  return handleVoidResponse(res, "Beitrittsanfrage annehmen fehlgeschlagen");
}

export async function rejectLocationJoinRequest(
  locationId: string,
  requestId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Locations/${locationId}/join-requests/${requestId}/reject`, {
    method: "POST",
    headers: authHeaders(user),
  });

  return handleVoidResponse(res, "Beitrittsanfrage ablehnen fehlgeschlagen");
}

export async function getDiscoveryLocations(
  request: { latitude?: number; longitude?: number; radiusKm?: number },
  user: User
): Promise<LocationDiscoveryResponse[]> {
  const params = new URLSearchParams();

  if (request.latitude != null) params.append("latitude", request.latitude.toString());
  if (request.longitude != null) params.append("longitude", request.longitude.toString());
  if (request.radiusKm != null) params.append("radiusKm", request.radiusKm.toString());

  const res = await fetch(`${API}/Locations/discovery?${params.toString()}`, {
    headers: authHeaders(user),
  });

  return handleResponse<LocationDiscoveryResponse[]>(res, "Discovery Locations fehlgeschlagen");
}
