import type {
  CreateFeedbackRequest,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackType,
  UpdateFeedbackAdminRequest,
} from "../types/feedback";
import type { User } from "../context/UserContext";
import { API, apiFetch, authHeaders, handleResponse } from "./apiClient";

export async function createFeedback(
  request: CreateFeedbackRequest,
  user: User
): Promise<FeedbackResponse> {
  const res = await apiFetch(`${API}/Feedback`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<FeedbackResponse>(res, "Feedback senden fehlgeschlagen");
}

export async function getAdminFeedback(
  user: User,
  filters?: { status?: FeedbackStatus; type?: FeedbackType }
): Promise<FeedbackResponse[]> {
  const params = new URLSearchParams();

  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);

  const query = params.toString();
  const res = await apiFetch(`${API}/Feedback/admin${query ? `?${query}` : ""}`, {
    headers: authHeaders(user),
  });

  return handleResponse<FeedbackResponse[]>(res, "Feedback laden fehlgeschlagen");
}

export async function updateAdminFeedback(
  id: string,
  request: UpdateFeedbackAdminRequest,
  user: User
): Promise<FeedbackResponse> {
  const res = await apiFetch(`${API}/Feedback/admin/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });

  return handleResponse<FeedbackResponse>(res, "Feedback aktualisieren fehlgeschlagen");
}
