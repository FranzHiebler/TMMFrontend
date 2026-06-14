export class ApiError extends Error {
  status: number;
  responseText: string;
  url: string;

  constructor(message: string, status: number, responseText: string, url: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.responseText = responseText;
    this.url = url;
  }
}

export const authExpiredMessage = "Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.";

export function isAuthSessionError(err: unknown): err is ApiError {
  if (!(err instanceof ApiError)) return false;
  if (err.status !== 401 && err.status !== 403) return false;

  const text = `${err.message} ${err.responseText}`.toLowerCase();

  return (
    text.includes("anmeldung erforderlich") ||
    text.includes("nicht angemeldet") ||
    text.includes("session ist ung") ||
    text.includes("unauthorized")
  );
}

export async function readApiError(res: Response, fallback: string): Promise<ApiError> {
  const text = await res.text();

  if (!text) {
    return new ApiError(`${fallback}: HTTP ${res.status}`, res.status, "", res.url);
  }

  try {
    const parsed = JSON.parse(text) as { error?: string };

    if (parsed.error) {
      return new ApiError(parsed.error, res.status, text, res.url);
    }
  } catch {
    // Response war kein JSON, dann Text direkt verwenden
  }

  return new ApiError(text, res.status, text, res.url);
}
