import type { User } from "../context/UserContext";
import { recordApiFailure } from "../debug/debugInfo";
import { isAuthSessionError, readApiError } from "./apiError";

export const API = import.meta.env.VITE_API_BASE_URL || "https://localhost:7173/api";
const responseMethods = new WeakMap<Response, string>();
export const authExpiredEventName = "tmm-auth-expired";

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const method = init.method ?? "GET";
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  return fetch(input, {
    ...init,
    credentials: "include",
  }).then((res) => {
    responseMethods.set(res, method);
    return res;
  }).catch((err) => {
    recordApiFailure({
      url,
      method,
      error: err instanceof Error ? err.message : "Netzwerkfehler",
    });
    throw err;
  });
}

export function authHeaders(user?: User): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(user
      ? {
          "x-user-id": user.userId,
          "x-display-name": user.displayName,
        }
      : {}),
  };
}

export async function handleResponse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const error = await readApiError(res, fallback);
    recordApiFailure({
      url: error.url,
      method: responseMethods.get(res) ?? "GET",
      status: error.status,
      responseText: error.responseText,
      error: error.message,
    });
    notifyAuthExpired(error);
    throw error;
  }

  const text = await res.text();

  if (!text.trim()) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function handleVoidResponse(res: Response, fallback: string): Promise<void> {
  if (!res.ok) {
    const error = await readApiError(res, fallback);
    recordApiFailure({
      url: error.url,
      method: responseMethods.get(res) ?? "GET",
      status: error.status,
      responseText: error.responseText,
      error: error.message,
    });
    notifyAuthExpired(error);
    throw error;
  }
}

function notifyAuthExpired(error: unknown) {
  if (!isAuthSessionError(error)) return;
  window.dispatchEvent(new CustomEvent(authExpiredEventName));
}
