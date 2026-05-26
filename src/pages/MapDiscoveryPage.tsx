import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { getDiscoveryGames, getGameById } from "../api/gamesApi";
import { getDiscoveryLocations, getMyLocations } from "../api/locationsApi";
import { getPlayRequests } from "../api/playRequestsApi";
import { getSystems } from "../api/systemsApi";
import { getCurrentUserProfile, searchUsers, updateDiscoverySettings } from "../api/usersApi";
import { useUser } from "../context/UserContext";
import { systemShortCode, systemShortCodes } from "../helpers/systemLabels";
import type {
  GameDiscoveryResponse,
  GameResponse,
  LocationDiscoveryResponse,
  PlayRequestDto,
  SystemOption,
  UserSearchResponse,
} from "../types/game";

type Selection =
  | { type: "game"; id: string }
  | { type: "location"; id: string }
  | { type: "player"; id: string }
  | { type: "playRequest"; id: string }
  | null;

const DEFAULT_CENTER: [number, number] = [50.2279, 9.3472];
const DEFAULT_ZOOM = 10;
const CENTRAL_EUROPE_BOUNDS = {
  minLat: 44,
  maxLat: 56,
  minLng: 4,
  maxLng: 16,
};

function clampNumber(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readNumberParam(params: URLSearchParams, key: string, fallback: number, min = 1, max = 250) {
  const rawValue = params.get(key);
  if (rawValue == null) return fallback;

  const value = Number(rawValue);
  return clampNumber(value, min, max, fallback);
}

function readBoolParam(params: URLSearchParams, key: string, fallback: boolean) {
  const value = params.get(key);
  if (value == null) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

function isCentralEuropeCenter([lat, lng]: [number, number]) {
  return (
    lat >= CENTRAL_EUROPE_BOUNDS.minLat &&
    lat <= CENTRAL_EUROPE_BOUNDS.maxLat &&
    lng >= CENTRAL_EUROPE_BOUNDS.minLng &&
    lng <= CENTRAL_EUROPE_BOUNDS.maxLng
  );
}

function normalizeMapCenter(center: [number, number] | null): [number, number] | null {
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

function readCenterParams(params: URLSearchParams): [number, number] | null {
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  return normalizeMapCenter([lat, lng]);
}

function readZoomParam(params: URLSearchParams) {
  return readNumberParam(params, "zoom", DEFAULT_ZOOM, 3, 18);
}

function hasDiscoveryUrlState(params: URLSearchParams) {
  return ["days", "radius", "locations", "players", "mine", "public", "lat", "lng", "zoom"].some((key) =>
    params.has(key)
  );
}

function MapController({
  center,
  zoom,
  refreshKey,
  onViewportChanged,
}: {
  center: [number, number];
  zoom: number;
  refreshKey: string;
  onViewportChanged: (center: [number, number], zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    const current = map.getCenter();
    const zoomChanged = map.getZoom() !== zoom;
    const centerChanged =
      Math.abs(current.lat - center[0]) > 0.0001 || Math.abs(current.lng - center[1]) > 0.0001;

    if (centerChanged || zoomChanged) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, map, zoom]);

  useEffect(() => {
    const first = window.setTimeout(() => map.invalidateSize({ pan: false }), 0);
    const second = window.setTimeout(() => map.invalidateSize({ pan: false }), 250);

    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [map, refreshKey]);

  useMapEvents({
    moveend() {
      const nextCenter = map.getCenter();
      onViewportChanged([nextCenter.lat, nextCenter.lng], map.getZoom());
    },
    zoomend() {
      const nextCenter = map.getCenter();
      onViewportChanged([nextCenter.lat, nextCenter.lng], map.getZoom());
    },
  });

  return null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function rangeToDates(timeWindowDays: number) {
  const from = startOfToday();
  const to = new Date(from);
  to.setDate(to.getDate() + timeWindowDays);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function dateTimeText(startTimeUtc: string) {
  return new Date(startTimeUtc).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function gameMarkerState(game: GameDiscoveryResponse) {
  if (game.isHost) return "host";
  if (game.isParticipant) return "participant";
  return "event";
}

function cleanSystemLabel(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (cleaned.toLowerCase() === "egal") return "Egal";
  return cleaned.length <= 8 ? cleaned : cleaned.slice(0, 8);
}

function systemLabelsFromSummary(summary: string, systems: SystemOption[]) {
  if (!summary.trim()) return [];

  return summary
    .split("·")
    .flatMap((part) => part.split(":").slice(1).join(":").split(","))
    .map((value) => systemShortCode(cleanSystemLabel(value.replace(/\d+\s*Punkte/i, "")), systems))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);
}

function systemBadgesHtml(labels: string[]) {
  if (labels.length === 0) return `<span class="map-system-badge">?</span>`;

  return labels.map((label) => `<span class="map-system-badge">${label}</span>`).join("");
}

function gameMarkerIcon(game: GameDiscoveryResponse, indexAtLocation: number, systems: SystemOption[]) {
  const state = gameMarkerState(game);
  const offset = Math.min(indexAtLocation, 3) * 8;
  const systemLabels = systemLabelsFromSummary(game.tablesSummary, systems);

  return L.divIcon({
    className: "",
    html: `
      <div class="discovery-marker discovery-marker-${state}" style="transform: translate(${offset}px, -${offset}px)">
        <div class="marker-main-row">
          <span class="marker-symbol">S</span>
          <span>${shortDateText(game.startTimeUtc)}</span>
        </div>
        <div class="marker-system-row">${systemBadgesHtml(systemLabels)}</div>
      </div>
    `,
    iconSize: [104, 52],
    iconAnchor: [52, 26],
  });
}

function locationMarkerIcon(location: LocationDiscoveryResponse) {
  const state = location.isOwnLocation ? "own-location-base" : "location";
  const count = location.upcomingGameCount > 0 ? location.upcomingGameCount.toString() : "";

  return L.divIcon({
    className: "",
    html: `
      <div class="location-marker location-marker-${state}">
        <span class="marker-icon marker-icon-house" aria-hidden="true"></span>
        ${count ? `<strong>${count}</strong>` : ""}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function playerMarkerIcon(player: UserSearchResponse, isMe: boolean) {
  const isLooking = player.lookingForGame?.isActive;
  const classes = [
    "player-marker",
    isMe ? "player-marker-me" : "player-marker-default",
    isLooking ? "player-marker-looking" : "",
  ].filter(Boolean).join(" ");

  return L.divIcon({
    className: "",
    html: `
      <div class="${classes}">
        <span class="marker-icon marker-icon-user" aria-hidden="true"></span>
        ${isLooking ? `<span class="marker-mini-label">sucht</span>` : ""}
      </div>
    `,
    iconSize: isLooking ? [36, 36] : [30, 30],
    iconAnchor: isLooking ? [18, 18] : [15, 15],
  });
}

function playRequestMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="player-marker player-marker-looking">
        <span class="marker-icon marker-icon-user" aria-hidden="true"></span>
        <span class="marker-mini-label">sucht</span>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function shortDateText(startTimeUtc: string) {
  return new Date(startTimeUtc).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
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

function compactTimeText(game: GameDiscoveryResponse) {
  if (game.timingMode === "Open") return "offen";
  if (game.timeLabel) return `${shortDateText(game.startTimeUtc)} · ${game.timeLabel}`;
  return shortDateText(game.startTimeUtc);
}

function getBrowserPosition(): Promise<[number, number]> {
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

export default function MapDiscoveryPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasUrlState = useMemo(() => hasDiscoveryUrlState(searchParams), [searchParams]);
  const initialCenter = useMemo(
    () => readCenterParams(searchParams) ?? DEFAULT_CENTER,
    [searchParams]
  );

  const [timeWindowDays, setTimeWindowDays] = useState(() => readNumberParam(searchParams, "days", 7, 1, 56));
  const [radiusKm, setRadiusKm] = useState(() => readNumberParam(searchParams, "radius", 80, 10, 200));
  const [filterCollapsed, setFilterCollapsed] = useState(() => readBoolParam(searchParams, "filtersClosed", true));
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  
  const [showLocations, setShowLocations] = useState(() => readBoolParam(searchParams, "locations", true));
  const [showPlayers, setShowPlayers] = useState(() => readBoolParam(searchParams, "players", true));
  const [showMySessions, setShowMySessions] = useState(() => readBoolParam(searchParams, "mine", true));
  const [showAllSessions, setShowAllSessions] = useState(() => readBoolParam(searchParams, "public", true));

  const [players, setPlayers] = useState<UserSearchResponse[]>([]);
  const [games, setGames] = useState<GameDiscoveryResponse[]>([]);
  const [locations, setLocations] = useState<LocationDiscoveryResponse[]>([]);
  const [playRequests, setPlayRequests] = useState<PlayRequestDto[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [selectedFullGame, setSelectedFullGame] = useState<GameResponse | null>(null);

  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [loadingPlayRequests, setLoadingPlayRequests] = useState(true);
  const [banner, setBanner] = useState("");
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [zoom, setZoom] = useState(() => readZoomParam(searchParams));
  const [centerReady, setCenterReady] = useState(() => readCenterParams(searchParams) != null);

  const { from, to } = useMemo(() => rangeToDates(timeWindowDays), [timeWindowDays]);

  const resolveInitialCenter = useCallback(async () => {
    let profile: Awaited<ReturnType<typeof getCurrentUserProfile>> | null = null;
    let myLocations: Awaited<ReturnType<typeof getMyLocations>> | null = null;

    try {
      const loaded = await Promise.all([
        getCurrentUserProfile(user),
        getMyLocations(user),
      ]);

      profile = loaded[0];
      myLocations = loaded[1];

      if (!hasUrlState) {
        const saved = profile.discoverySettings;

        setTimeWindowDays(clampNumber(saved?.timeWindowDays ?? 7, 1, 56, 7));
        setRadiusKm(clampNumber(saved?.radiusKm ?? 80, 10, 200, 80));
        setShowLocations(saved?.showLocations ?? true);
        setShowPlayers(saved?.showPlayers ?? true);
        setShowMySessions(saved?.showMySessions ?? true);
        setShowAllSessions(saved?.showPublicSessions ?? true);
        setZoom(clampNumber(saved?.zoom ?? DEFAULT_ZOOM, 3, 18, DEFAULT_ZOOM));

        const savedCenter = normalizeMapCenter([
          saved?.latitude ?? Number.NaN,
          saved?.longitude ?? Number.NaN,
        ]);

        if (savedCenter) {
          setCenter(savedCenter);
          return;
        }
      }
    } catch {
      // fallback unten
    }

    try {
      const browserCenter = await getBrowserPosition();
      const normalizedBrowserCenter = normalizeMapCenter(browserCenter);

      if (normalizedBrowserCenter) {
        setCenter(normalizedBrowserCenter);
        setZoom(11);
        return;
      }
    } catch {
      // fallback unten
    }

    try {
      const defaultLocation = myLocations?.find(
        (location) =>
          location.id === profile?.defaultLocationId &&
          location.latitude != null &&
          location.longitude != null
      );

      if (defaultLocation?.latitude != null && defaultLocation.longitude != null) {
        const normalizedDefaultLocation = normalizeMapCenter([
          defaultLocation.latitude,
          defaultLocation.longitude,
        ]);

        if (normalizedDefaultLocation) {
          setCenter(normalizedDefaultLocation);
          setZoom(11);
          return;
        }
      }
    } catch {
      // fallback unten
    }

    setCenter(DEFAULT_CENTER);
    setZoom(DEFAULT_ZOOM);
  }, [hasUrlState, user]);

  const updateMapViewport = useCallback((nextCenter: [number, number], nextZoom: number) => {
    setCenter((currentCenter) => {
      const centerChanged =
        Math.abs(currentCenter[0] - nextCenter[0]) > 0.0001 ||
        Math.abs(currentCenter[1] - nextCenter[1]) > 0.0001;

      return centerChanged ? nextCenter : currentCenter;
    });

    setZoom((currentZoom) => (currentZoom !== nextZoom ? nextZoom : currentZoom));
  }, []);

  const loadDiscovery = useCallback(async () => {
    if (!centerReady) return;

    setBanner("");
    setLoadingGames(true);
    setLoadingLocations(true);
    setLoadingPlayers(true);
    setLoadingPlayRequests(true);

    try {
      const [locationData, gameData, playerData, playRequestData] = await Promise.all([
        getDiscoveryLocations({ latitude: center[0], longitude: center[1], radiusKm }, user),
        getDiscoveryGames(
          {
            fromUtc: from.toISOString(),
            toUtc: to.toISOString(),
            latitude: center[0],
            longitude: center[1],
            radiusKm,
          },
          user
        ),
        searchUsers(""),
        getPlayRequests(user),
      ]);

      setLocations(locationData);
      setGames(gameData);
      setPlayers(playerData);
      setPlayRequests(playRequestData);

      setSelection((current) => {
        if (current?.type === "game" && gameData.some((game) => game.gameId === current.id)) {
          return current;
        }

        if (
          current?.type === "location" &&
          locationData.some((location) => location.locationId === current.id)
        ) {
          return current;
        }

        if (current?.type === "player" && playerData.some((player) => player.userId === current.id)) {
          return current;
        }

        const firstOwnGame = gameData.find((game) => game.isHost || game.isParticipant);

        if (firstOwnGame) return { type: "game", id: firstOwnGame.gameId };
        if (gameData[0]) return { type: "game", id: gameData[0].gameId };
        if (locationData[0]) return { type: "location", id: locationData[0].locationId };

        return null;
      });
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Discovery konnte nicht geladen werden.");
    } finally {
      setLoadingGames(false);
      setLoadingLocations(false);
      setLoadingPlayers(false);
      setLoadingPlayRequests(false);
    }
  }, [center, centerReady, from, radiusKm, to, user]);

  useEffect(() => {
    if (centerReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void resolveInitialCenter().finally(() => setCenterReady(true));
  }, [centerReady, resolveInitialCenter]);

  useEffect(() => {
    if (!centerReady) return;

    const next = new URLSearchParams();
    next.set("days", String(timeWindowDays));
    next.set("radius", String(radiusKm));
    next.set("locations", showLocations ? "1" : "0");
    next.set("players", showPlayers ? "1" : "0");
    next.set("mine", showMySessions ? "1" : "0");
    next.set("public", showAllSessions ? "1" : "0");
    next.set("filtersClosed", filterCollapsed ? "1" : "0");
    next.set("lat", center[0].toFixed(5));
    next.set("lng", center[1].toFixed(5));
    next.set("zoom", String(zoom));
    setSearchParams(next, { replace: true });
  }, [
    center,
    centerReady,
    filterCollapsed,
    radiusKm,
    setSearchParams,
    showAllSessions,
    showLocations,
    showMySessions,
    showPlayers,
    timeWindowDays,
    zoom,
  ]);

  useEffect(() => {
    if (!centerReady) return;

    const timeout = window.setTimeout(() => {
      void updateDiscoverySettings(
        {
          showLocations,
          showPlayers,
          showMySessions,
          showPublicSessions: showAllSessions,
          timeWindowDays,
          radiusKm,
          latitude: center[0],
          longitude: center[1],
          zoom,
        },
        user
      ).catch(() => {
        // Komforteinstellung: Karte bleibt nutzbar, auch wenn Speichern fehlschlägt.
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [
    center,
    centerReady,
    radiusKm,
    showAllSessions,
    showLocations,
    showMySessions,
    showPlayers,
    timeWindowDays,
    user,
    zoom,
  ]);

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => setSystems([]));
  }, []);

  useEffect(() => {
    if (!centerReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDiscovery();
  }, [centerReady, loadDiscovery]);

  const visibleLocations = useMemo(() => {
    if (!showLocations) return [];
    return locations;
  }, [locations, showLocations]);

  const visibleGames = useMemo(() => {
    if (showAllSessions) return games;

    if (showMySessions) {
      return games.filter((game) => game.isHost || game.isParticipant);
    }

    return [];
  }, [games, showAllSessions, showMySessions]);

  const visiblePlayers = useMemo(() => {
    if (!showPlayers) return [];

    return players.filter((player) => {
      if (player.latitude == null || player.longitude == null) return false;
      return distanceKm(center[0], center[1], player.latitude, player.longitude) <= radiusKm;
    });
  }, [center, players, radiusKm, showPlayers]);

  const gamesByLocation = useMemo(() => {
    const counts = new Map<string, number>();

    return visibleGames.map((game) => {
      const count = counts.get(game.locationId) ?? 0;
      counts.set(game.locationId, count + 1);

      return { game, indexAtLocation: count };
    });
  }, [visibleGames]);

  const selectedGame =
    selection?.type === "game"
      ? visibleGames.find((game) => game.gameId === selection.id) ?? null
      : null;

  const selectedLocation =
    selection?.type === "location"
      ? visibleLocations.find((location) => location.locationId === selection.id) ?? null
      : null;

  const selectedPlayer =
    selection?.type === "player"
      ? visiblePlayers.find((player) => player.userId === selection.id) ?? null
      : null;

  const selectedPlayRequest =
    selection?.type === "playRequest"
      ? playRequests.find((request) => request.id === selection.id) ?? null
      : null;

  const selectedLocationGames = useMemo(() => {
    if (!selectedGame) return [];

    return visibleGames
      .filter((game) => game.locationId === selectedGame.locationId)
      .sort(
        (a, b) =>
          new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime()
      );
  }, [selectedGame, visibleGames]);

  const selectedGameIndex = selectedGame
    ? selectedLocationGames.findIndex((game) => game.gameId === selectedGame.gameId)
    : -1;

  const selectedOccupiedSeats = selectedFullGame?.assignedPlayers ?? 0;
  const selectedMaxSeats =
    selectedFullGame?.maxPlayers ?? (selectedGame ? selectedGame.availableSeats : 0);
  const selectedHostName = selectedFullGame?.host.displayName ?? null;

  useEffect(() => {
    if (!selectedGame) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedFullGame(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      void getGameById(selectedGame.gameId)
        .then((game) => {
          setSelectedFullGame(game);
        })
        .catch(() => {
          setSelectedFullGame(null);
        });
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [selectedGame]);

  function selectGameAtOffset(offset: number) {
    if (!selectedGame || selectedLocationGames.length === 0) return;

    const nextIndex =
      (selectedGameIndex + offset + selectedLocationGames.length) %
      selectedLocationGames.length;

    setSelection({
      type: "game",
      id: selectedLocationGames[nextIndex].gameId,
    });
  }

  const isLoading = loadingGames || loadingLocations || loadingPlayers || loadingPlayRequests || !centerReady;

  function createAtLocation(locationId: string) {
    navigate(`/games/create?locationId=${encodeURIComponent(locationId)}`);
  }

  function renderSystemBadges(labels: string[]) {
    if (labels.length === 0) {
      return <span className="system-badge muted">System offen</span>;
    }

    return labels.map((label) => (
      <span key={label} className="system-badge">
        {label}
      </span>
    ));
  }

  return (
    <div className="discovery-page">
      <section className="discovery-map-shell">
        <MapContainer center={center} zoom={zoom} className="discovery-map">
          <MapController
            center={center}
            zoom={zoom}
            refreshKey={`${filterCollapsed}-${legendCollapsed}-${selection?.type ?? "none"}`}
            onViewportChanged={updateMapViewport}
          />

          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visibleLocations
            .filter((location) => location.latitude != null && location.longitude != null)
            .map((location) => (
              <Marker
                key={location.locationId}
                position={[location.latitude!, location.longitude!]}
                icon={locationMarkerIcon(location)}
                zIndexOffset={location.isOwnLocation ? 180 : 120}
                eventHandlers={{
                  click: () => setSelection({ type: "location", id: location.locationId }),
                }}
              >
                <Popup>
                  <strong>{location.name}</strong>
                  <br />
                  {location.city}
                  {location.upcomingGameCount > 0 && (
                    <>
                      <br />
                      {location.upcomingGameCount} kommende Session
                      {location.upcomingGameCount === 1 ? "" : "s"}
                    </>
                  )}
                </Popup>
              </Marker>
            ))}

          {gamesByLocation
            .filter(({ game }) => game.latitude != null && game.longitude != null)
            .map(({ game, indexAtLocation }) => (
              <Marker
                key={game.gameId}
                position={[game.latitude!, game.longitude!]}
                icon={gameMarkerIcon(game, indexAtLocation, systems)}
                zIndexOffset={60 + indexAtLocation}
                eventHandlers={{
                  click: () => setSelection({ type: "game", id: game.gameId }),
                }}
              >
                <Popup>
                  <strong>{game.title}</strong>
                  <br />
                  {shortDateText(game.startTimeUtc)}
                  <br />
                  {game.locationName}, {game.city}
                </Popup>
              </Marker>
            ))}

          {visiblePlayers.map((player) => (
            <Marker
              key={player.userId}
              position={[player.latitude!, player.longitude!]}
              icon={playerMarkerIcon(player, player.userId === user.userId)}
              zIndexOffset={player.lookingForGame?.isActive ? 760 : 720}
              eventHandlers={{
                click: () => setSelection({ type: "player", id: player.userId }),
              }}
            >
              <Popup>
                <strong>{player.displayName}</strong>
                <br />
                {player.city ?? "Ort unbekannt"}
              </Popup>
            </Marker>
          ))}

          {playRequests
            .filter((request) => request.latitude != null && request.longitude != null)
            .map((request) => (
              <Marker
                key={request.id}
                position={[request.latitude!, request.longitude!]}
                icon={playRequestMarkerIcon()}
                zIndexOffset={780}
                eventHandlers={{
                  click: () => setSelection({ type: "playRequest", id: request.id }),
                }}
              />
            ))}
        </MapContainer>

        <aside
          className={`discovery-panel discovery-panel-compact ${
            filterCollapsed ? "discovery-panel-collapsed" : ""
          }`}
        >
          <div className="discovery-panel-header">
            <button
              type="button"
              className="overlay-toggle"
              aria-label={filterCollapsed ? "Filter öffnen" : "Filter einklappen"}
              onClick={() => setFilterCollapsed((value) => !value)}
            >
              {filterCollapsed ? "›" : "‹"}
            </button>
          </div>

          {!filterCollapsed && (
            <>
              <div className="discovery-filter-box discovery-filter-box-compact">
                <label title="Spielorte im gewählten Umkreis">
                  <input
                    type="checkbox"
                    checked={showLocations}
                    onChange={(event) => setShowLocations(event.target.checked)}
                  />
                  <span>Spielorte</span>
                </label>

                <label title="Spieler mit sichtbarem Profil im Umkreis">
                  <input
                    type="checkbox"
                    checked={showPlayers}
                    onChange={(event) => setShowPlayers(event.target.checked)}
                  />
                  <span>Spieler</span>
                </label>

                <label title="Sessions, die du veranstaltest oder an denen du teilnimmst">
                  <input
                    type="checkbox"
                    checked={showMySessions}
                    onChange={(event) => setShowMySessions(event.target.checked)}
                  />
                  <span>Meine Sessions</span>
                </label>

                <label title="Alle sichtbaren Sessions im Umkreis">
                  <input
                    type="checkbox"
                    checked={showAllSessions}
                    onChange={(event) => setShowAllSessions(event.target.checked)}
                  />
                  <span>Öffentliche Sessions</span>
                </label>
              </div>

              <label className="day-slider">
                <input
                  type="range"
                  min={1}
                  max={56}
                  value={timeWindowDays}
                  onChange={(event) => setTimeWindowDays(Number(event.target.value))}
                />
                <span className="range-scale"><small>1</small><small>{timeWindowDays} Tage</small><small>56</small></span>
              </label>

              <label className="day-slider radius-slider">
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={10}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                />
                <span className="range-scale"><small>10</small><small>{radiusKm} km</small><small>200</small></span>
              </label>

              {banner && <div className="message message-error">{banner}</div>}
              {isLoading && <div className="discovery-skeleton" />}
              {!isLoading && !banner && (
                <p className="discovery-count">
                  {visibleLocations.length} Spielorte · {visiblePlayers.length} Spieler ·{" "}
                  {visibleGames.length} {visibleGames.length === 1 ? "Session" : "Sessions"}
                </p>
              )}
            </>
          )}
        </aside>

        <div className={`discovery-map-legend ${legendCollapsed ? "legend-collapsed" : ""}`}>
          <div className="discovery-legend-header">
            <button
              type="button"
              className="overlay-toggle"
              aria-label={legendCollapsed ? "Legende öffnen" : "Legende einklappen"}
              onClick={() => setLegendCollapsed((value) => !value)}
            >
              {legendCollapsed ? "?" : "‹"}
            </button>
          </div>
          {!legendCollapsed && (
            <>
              <span><i className="legend-dot location" /> Spielort</span>
              <span><i className="legend-dot own-location-base" /> Eigener Spielort</span>
              <span><i className="legend-dot event" /> Spiel</span>
              <span><i className="legend-dot participant" /> Teilnahme</span>
              <span><i className="legend-dot host" /> Host</span>
              <span><i className="legend-dot player" /> Spieler</span>
              <span><i className="legend-dot player-looking" /> Sucht</span>
              <span><i className="legend-dot player-me" /> Ich</span>
            </>
          )}
        </div>

        {!isLoading && !banner && visibleGames.length === 0 && visibleLocations.length > 0 && (
          <div className="discovery-empty-state">
            Keine kommenden Spiele im Zeitraum. Spielorte werden angezeigt.
          </div>
        )}

        {selectedGame && (
          <article className="session-preview">
            <div className="session-preview-topbar compact-preview-topbar">
              <time>{compactTimeText(selectedGame)}</time>

              {selectedLocationGames.length > 1 && (
                <div className="session-preview-switcher">
                  <button type="button" onClick={() => selectGameAtOffset(-1)} aria-label="Vorheriges Spiel">&lt;</button>
                  <span>{selectedGameIndex + 1} / {selectedLocationGames.length}</span>
                  <button type="button" onClick={() => selectGameAtOffset(1)} aria-label="Nächstes Spiel">&gt;</button>
                </div>
              )}

              <button
                className="preview-close"
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Vorschau schließen"
              >
                ×
              </button>
            </div>

            <h2>{selectedGame.title}</h2>

            {selectedHostName && <p className="preview-host">von {selectedHostName}</p>}

            <div className="compact-session-preview">
              <span>
                {systemLabelsFromSummary(selectedGame.tablesSummary, systems).join(", ") || "System offen"}
                {" · "}
                {selectedGame.city || selectedGame.locationName}
                {" · "}
                {selectedOccupiedSeats}/{selectedMaxSeats}
              </span>
            </div>

            <div className="preview-actions">
              <Link to={`/sessions/${encodeURIComponent(selectedGame.gameId)}`}>
                Öffnen
              </Link>
            </div>
          </article>
        )}

        {selectedLocation && (
          <article className="session-preview location-preview">
            <button
              className="preview-close"
              type="button"
              onClick={() => setSelection(null)}
              aria-label="Vorschau schließen"
            >
              ×
            </button>

            <p className="panel-kicker">
              {selectedLocation.isOwnLocation
                ? `Eigener Spielort${selectedLocation.role ? ` · ${selectedLocation.role}` : ""}`
                : "Spielort"}
            </p>

            <h2>{selectedLocation.name}</h2>

            <div className="preview-meta-grid">
              <span>{selectedLocation.city}</span>
              {selectedLocation.address && <span>{selectedLocation.address}</span>}
              <span>{selectedLocation.upcomingGameCount} kommende Spiele</span>
              {selectedLocation.nextGameStartTimeUtc && (
                <span>nächste: {dateTimeText(selectedLocation.nextGameStartTimeUtc)}</span>
              )}
            </div>

            <div className="system-badge-row">
              {renderSystemBadges(systemShortCodes(selectedLocation.systemKeys, systems).map(cleanSystemLabel).filter(Boolean))}
            </div>

            <div className="preview-actions">
              <Link to="/locations">Details</Link>

              <button type="button" onClick={() => createAtLocation(selectedLocation.locationId)}>
                Spiel hier erstellen
              </button>

              {selectedLocation.isOwnLocation && <Link to="/locations">Mitglieder</Link>}
            </div>
          </article>
        )}

        {selectedPlayer && (
          <article className="session-preview player-preview">
            <button
              className="preview-close"
              type="button"
              onClick={() => setSelection(null)}
              aria-label="Vorschau schließen"
            >
              ×
            </button>

            <p className="panel-kicker">Spieler</p>
            <h2>{selectedPlayer.displayName}</h2>

            <div className="preview-meta-grid">
              {selectedPlayer.city && <span>Ort: {selectedPlayer.city}</span>}
              {selectedPlayer.streetAddress && <span>Adresse: {selectedPlayer.streetAddress}</span>}
              {selectedPlayer.postalCode && <span>PLZ: {selectedPlayer.postalCode}</span>}
              {selectedPlayer.lookingForGame?.isActive && (
                <span>
                  Sucht Spiel
                  {selectedPlayer.lookingForGame.systemKey ? `: ${systemShortCode(selectedPlayer.lookingForGame.systemKey, systems)}` : ""}
                  {selectedPlayer.lookingForGame.timeNote ? ` · ${selectedPlayer.lookingForGame.timeNote}` : ""}
                </span>
              )}
              {(selectedPlayer.favoriteSystemKeys ?? []).length > 0 && (
                <span>Systeme: {systemShortCodes(selectedPlayer.favoriteSystemKeys, systems).join(", ")}</span>
              )}
            </div>

            <div className="preview-actions">
              <Link to={`/users/${encodeURIComponent(selectedPlayer.userId)}`}>Profil öffnen</Link>
            </div>
          </article>
        )}

        {selectedPlayRequest && (
          <article className="session-preview player-preview">
            <button className="preview-close" type="button" onClick={() => setSelection(null)} aria-label="Vorschau schließen">
              ×
            </button>
            <p className="panel-kicker">Spielgesuch</p>
            <h2>{selectedPlayRequest.owner.displayName}</h2>
            <div className="preview-meta-grid">
              <span>System: {systemShortCode(selectedPlayRequest.systemKey, systems)}</span>
              {selectedPlayRequest.timeNote && <span>{selectedPlayRequest.timeNote}</span>}
              {selectedPlayRequest.city && <span>{selectedPlayRequest.city}</span>}
              {selectedPlayRequest.note && <span>{selectedPlayRequest.note}</span>}
            </div>
            <div className="preview-actions">
              <Link to="/play-requests">Gesuche öffnen</Link>
              <Link to={`/users/${encodeURIComponent(selectedPlayRequest.owner.userId)}`}>Profil öffnen</Link>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}


