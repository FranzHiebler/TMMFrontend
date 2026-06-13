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
