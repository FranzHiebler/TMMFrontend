import type { User } from "../context/UserContext";
import type {
  ConversationDetailDto,
  ConversationDto,
  MessageDto,
  SendDirectMessageRequest,
  SendGameSessionMessageRequest,
  SendGameTableMessageRequest,
} from "../types/game";
import { API, authHeaders, handleResponse, handleVoidResponse } from "./apiClient";

export async function getConversations(user: User): Promise<ConversationDto[]> {
  const res = await fetch(`${API}/Messages/conversations`, {
    headers: authHeaders(user),
  });
  return handleResponse<ConversationDto[]>(res, "Conversations laden fehlgeschlagen");
}

export async function getConversation(
  conversationId: string,
  user: User
): Promise<ConversationDetailDto> {
  const res = await fetch(`${API}/Messages/conversations/${conversationId}`, {
    headers: authHeaders(user),
  });
  return handleResponse<ConversationDetailDto>(res, "Conversation laden fehlgeschlagen");
}

export async function markConversationRead(conversationId: string, user: User): Promise<void> {
  const res = await fetch(`${API}/Messages/conversations/${conversationId}/read`, {
    method: "POST",
    headers: authHeaders(user),
  });
  return handleVoidResponse(res, "Conversation konnte nicht als gelesen markiert werden");
}

export async function sendDirectMessage(
  request: SendDirectMessageRequest,
  user: User
): Promise<MessageDto> {
  const res = await fetch(`${API}/Messages/direct`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<MessageDto>(res, "Direktnachricht konnte nicht gesendet werden");
}

export async function getGameMessages(gameId: string, user: User): Promise<MessageDto[]> {
  const res = await fetch(`${API}/Games/${gameId}/messages`, {
    headers: authHeaders(user),
  });
  return handleResponse<MessageDto[]>(res, "Session-Nachrichten laden fehlgeschlagen");
}

export async function sendGameMessage(
  gameId: string,
  request: SendGameSessionMessageRequest,
  user: User
): Promise<MessageDto> {
  const res = await fetch(`${API}/Games/${gameId}/messages`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<MessageDto>(res, "Session-Nachricht konnte nicht gesendet werden");
}

export async function getTableMessages(
  gameId: string,
  tableId: string,
  user: User
): Promise<MessageDto[]> {
  const res = await fetch(`${API}/Games/${gameId}/tables/${tableId}/messages`, {
    headers: authHeaders(user),
  });
  return handleResponse<MessageDto[]>(res, "Tisch-Nachrichten laden fehlgeschlagen");
}

export async function sendTableMessage(
  gameId: string,
  tableId: string,
  request: SendGameTableMessageRequest,
  user: User
): Promise<MessageDto> {
  const res = await fetch(`${API}/Games/${gameId}/tables/${tableId}/messages`, {
    method: "POST",
    headers: authHeaders(user),
    body: JSON.stringify(request),
  });
  return handleResponse<MessageDto>(res, "Tisch-Nachricht konnte nicht gesendet werden");
}
