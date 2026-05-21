import type {
  ApplyToGameRequest,
  CreateChangeProposalRequest,
  DiscoveryGamesRequest,
  GameDiscoveryResponse,
  CreateGameRequest,
  GameResponse,
  JoinTableRequest,
  SearchNearbyGamesRequest,
  UpdateGameSessionRequest,
  UpdateGameTableRequest,
} from "../types/game";
import type { User } from "../context/UserContext";
import { API, authHeaders, handleResponse, handleVoidResponse } from "./apiClient";

export async function getAllGames(): Promise<GameResponse[]> {
  const res = await fetch(`${API}/Games/search?OnlyOpen=false`);
  return handleResponse<GameResponse[]>(res, "Games laden fehlgeschlagen");
}

export async function createGame(request: CreateGameRequest, user: User): Promise<GameResponse> {
  const res = await fetch(`${API}/Games`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<GameResponse>(res, "Game erstellen fehlgeschlagen");
}

export async function getGameById(gameId: string): Promise<GameResponse> {
  const res = await fetch(`${API}/Games/${gameId}`);
  return handleResponse<GameResponse>(res, "Game laden fehlgeschlagen");
}

export async function joinTable(
  gameId: string,
  tableId: string,
  request: JoinTableRequest,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Games/${gameId}/tables/${tableId}/join`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleVoidResponse(res, "Join fehlgeschlagen");
}

export async function applyToGame(
  gameId: string,
  request: ApplyToGameRequest,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Games/${gameId}/apply`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleVoidResponse(res, "Bewerbung fehlgeschlagen");
}

export async function createChangeProposal(
  gameId: string,
  request: CreateChangeProposalRequest,
  user: User
): Promise<GameResponse> {
  const res = await fetch(`${API}/Games/${gameId}/change-proposals`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<GameResponse>(res, "Vorschlag konnte nicht gesendet werden");
}

export async function acceptChangeProposal(
  gameId: string,
  proposalId: string,
  user: User
): Promise<GameResponse> {
  const res = await fetch(`${API}/Games/${gameId}/change-proposals/${proposalId}/accept`, {
    method: "POST",
    headers: authHeaders(user),
  });

  return handleResponse<GameResponse>(res, "Vorschlag konnte nicht angenommen werden");
}

export async function rejectChangeProposal(
  gameId: string,
  proposalId: string,
  user: User
): Promise<GameResponse> {
  const res = await fetch(`${API}/Games/${gameId}/change-proposals/${proposalId}/reject`, {
    method: "POST",
    headers: authHeaders(user),
  });

  return handleResponse<GameResponse>(res, "Vorschlag konnte nicht abgelehnt werden");
}

export async function searchNearbyGames(request: SearchNearbyGamesRequest): Promise<GameResponse[]> {
  const params = new URLSearchParams({
    latitude: request.latitude.toString(),
    longitude: request.longitude.toString(),
    radiusInMeters: (request.radiusKm * 1000).toString(),
  });

  if (request.systemKey) params.append("systemKey", request.systemKey);

  const res = await fetch(`${API}/Games/nearby?${params.toString()}`);
  return handleResponse<GameResponse[]>(res, "Nearby Games fehlgeschlagen");
}

export async function getDiscoveryGames(
  request: DiscoveryGamesRequest,
  user: User
): Promise<GameDiscoveryResponse[]> {
  const params = new URLSearchParams();

  if (request.fromUtc) params.append("fromUtc", request.fromUtc);
  if (request.toUtc) params.append("toUtc", request.toUtc);
  if (request.latitude != null) params.append("latitude", request.latitude.toString());
  if (request.longitude != null) params.append("longitude", request.longitude.toString());
  if (request.radiusKm != null) params.append("radiusKm", request.radiusKm.toString());

  const res = await fetch(`${API}/Games/discovery?${params.toString()}`, {
    headers: authHeaders(user),
  });

  return handleResponse<GameDiscoveryResponse[]>(res, "Discovery laden fehlgeschlagen");
}

export async function assignApplicationToTable(
  gameId: string,
  tableId: string,
  applicationId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Games/${gameId}/tables/${tableId}/assign`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify({ applicationId }),
  });

  return handleVoidResponse(res, "Zuweisung fehlgeschlagen");
}

export async function rejectApplication(
  gameId: string,
  applicationId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Games/${gameId}/applications/${applicationId}/reject`, {
    method: "POST",
    headers: authHeaders(user),
  });

  return handleVoidResponse(res, "Ablehnen fehlgeschlagen");
}

export async function removePlayerFromTable(
  gameId: string,
  tableId: string,
  userId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Games/${gameId}/tables/${tableId}/players/${userId}/remove`, {
    method: "POST",
    headers: authHeaders(user),
  });

  return handleVoidResponse(res, "Spieler entfernen fehlgeschlagen");
}

export async function movePlayerToTable(
  gameId: string,
  userId: string,
  targetTableId: string,
  user: User
): Promise<void> {
  const res = await fetch(`${API}/Games/${gameId}/players/${userId}/move`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify({ targetTableId }),
  });

  return handleVoidResponse(res, "Spieler verschieben fehlgeschlagen");
}

export async function updateGameSession(
  gameId: string,
  request: UpdateGameSessionRequest,
  user: User
): Promise<GameResponse> {
  const res = await fetch(`${API}/Games/${gameId}`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<GameResponse>(res, "Game Session aktualisieren fehlgeschlagen");
}

export async function updateGameTable(
  gameId: string,
  tableId: string,
  request: UpdateGameTableRequest,
  user: User
): Promise<GameResponse> {
  const res = await fetch(`${API}/Games/${gameId}/tables/${tableId}`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<GameResponse>(res, "Tisch aktualisieren fehlgeschlagen");
}
