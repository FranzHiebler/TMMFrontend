import type { User } from "../context/UserContext";
import { readApiError } from "./apiError";

export const API = import.meta.env.VITE_API_BASE_URL;

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
  if (!res.ok) throw await readApiError(res, fallback);

  const text = await res.text();

  if (!text.trim()) {
    return null as T;
  }

  return JSON.parse(text) as T;
}

export async function handleVoidResponse(res: Response, fallback: string): Promise<void> {
  if (!res.ok) throw await readApiError(res, fallback);
}