export async function readApiError(res: Response, fallback: string): Promise<Error> {
  const text = await res.text();

  if (!text) {
    return new Error(`${fallback}: HTTP ${res.status}`);
  }

  try {
    const parsed = JSON.parse(text) as { error?: string };

    if (parsed.error) {
      return new Error(parsed.error);
    }
  } catch {
    // Response war kein JSON, dann Text direkt verwenden
  }

  return new Error(text);
}