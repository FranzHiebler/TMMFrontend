import { readNumberParam } from "./discoveryUrlState";

export const DEFAULT_CENTER: [number, number] = [50.2279, 9.3472];
export const DEFAULT_ZOOM = 10;

const CENTRAL_EUROPE_BOUNDS = {
  minLat: 44,
  maxLat: 56,
  minLng: 4,
  maxLng: 16,
};

function isCentralEuropeCenter([lat, lng]: [number, number]) {
  return (
    lat >= CENTRAL_EUROPE_BOUNDS.minLat &&
    lat <= CENTRAL_EUROPE_BOUNDS.maxLat &&
    lng >= CENTRAL_EUROPE_BOUNDS.minLng &&
    lng <= CENTRAL_EUROPE_BOUNDS.maxLng
  );
}

export function normalizeMapCenter(center: [number, number] | null): [number, number] | null {
  if (!center) return null;
  const [lat, lng] = center;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (isCentralEuropeCenter(center)) return center;

  const swapped: [number, number] = [lng, lat];
  if (isCentralEuropeCenter(swapped)) {
    return swapped;
  }

  return null;
}

export function readCenterParams(params: URLSearchParams): [number, number] | null {
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  return normalizeMapCenter([lat, lng]);
}

export function readZoomParam(params: URLSearchParams) {
  return readNumberParam(params, "zoom", DEFAULT_ZOOM, 3, 18);
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * r * Math.asin(Math.sqrt(h));
}

export function getBrowserPosition(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser-Geolocation nicht verfügbar."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.latitude, position.coords.longitude]),
      reject,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  });
}
