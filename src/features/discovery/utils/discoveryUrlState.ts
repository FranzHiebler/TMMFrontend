export function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function readNumberParam(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min = 1,
  max = 250
) {
  const rawValue = params.get(key);
  if (rawValue == null) return fallback;

  const value = Number(rawValue);
  return clampNumber(value, min, max, fallback);
}

export function readBoolParam(params: URLSearchParams, key: string, fallback: boolean) {
  const value = params.get(key);
  if (value == null) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

export function hasDiscoveryUrlState(params: URLSearchParams) {
  return ["days", "radius", "locations", "players", "mine", "public", "lat", "lng", "zoom"].some((key) =>
    params.has(key)
  );
}
