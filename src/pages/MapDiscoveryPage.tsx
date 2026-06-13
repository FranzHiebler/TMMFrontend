import { useCallback, useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { getDiscoveryGames, getGameById } from "../api/gamesApi";
import { getFriends } from "../api/friendsApi";
import { getDiscoveryLocations, getMyLocations } from "../api/locationsApi";
import { getPlayRequests } from "../api/playRequestsApi";
import { getSystems } from "../api/systemsApi";
import { getCurrentUserProfile, searchUsers, updateDiscoverySettings } from "../api/usersApi";
import { useUser } from "../context/UserContext";
import { systemShortCode } from "../helpers/systemLabels";
import DiscoveryFilterPanel from "../features/discovery/components/DiscoveryFilterPanel";
import DiscoveryLegend from "../features/discovery/components/DiscoveryLegend";
import DiscoverySelectionPanel from "../features/discovery/components/DiscoverySelectionPanel";
import { rangeToDates, shortDateText } from "../features/discovery/utils/discoveryDates";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  distanceKm,
  getBrowserPosition,
  normalizeMapCenter,
  readCenterParams,
  readZoomParam,
} from "../features/discovery/utils/discoveryGeo";
import {
  gameMarkerIcon,
  locationMarkerIcon,
  playerMarkerIcon,
  playRequestMarkerIcon,
} from "../features/discovery/utils/discoveryMarkers";
import {
  clampNumber,
  hasDiscoveryUrlState,
  readBoolParam,
  readNumberParam,
} from "../features/discovery/utils/discoveryUrlState";
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

type ActiveSelection = NonNullable<Selection>;

type MapMode = "all" | "games" | "players" | "locations" | "mine";

const mapModes: Array<{ key: MapMode; label: string }> = [
  { key: "all", label: "Alles" },
  { key: "games", label: "Spieltermine" },
  { key: "players", label: "Spieler" },
  { key: "locations", label: "Spielorte" },
  { key: "mine", label: "Meine" },
];

type SelectionItem = {
  selection: ActiveSelection;
  latitude: number;
  longitude: number;
  priority: number;
  sortTime: number;
  sortLabel: string;
};

type MarkerVisualOffset = {
  x: number;
  y: number;
};

const SELECTION_RADIUS_KM = 0.35;
const DISCOVERY_RELOAD_DEBOUNCE_MS = 350;

function sameSelection(a: ActiveSelection, b: ActiveSelection) {
  return a.type === b.type && a.id === b.id;
}

function selectionKey(selection: ActiveSelection) {
  return `${selection.type}:${selection.id}`;
}

function selectionStackCount(item: SelectionItem, items: SelectionItem[]) {
  return items.filter((candidate) =>
    distanceKm(item.latitude, item.longitude, candidate.latitude, candidate.longitude) <=
    SELECTION_RADIUS_KM
  ).length;
}

function coordinateGroupKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
}

function markerFanOffset(index: number, total: number): MarkerVisualOffset {
  if (total <= 1) return { x: 0, y: 0 };

  if (total === 2) {
    return index === 0 ? { x: -13, y: 0 } : { x: 13, y: 0 };
  }

  if (total === 3) {
    return [
      { x: 0, y: -15 },
      { x: -14, y: 10 },
      { x: 14, y: 10 },
    ][index] ?? { x: 0, y: 0 };
  }

  const radius = Math.min(24, 15 + total);
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / total;

  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  };
}

function isOwnGame(game: GameDiscoveryResponse) {
  return game.isHost || game.isParticipant;
}

function useDebouncedValue<T,>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
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
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>("all");

  const [players, setPlayers] = useState<UserSearchResponse[]>([]);
  const [games, setGames] = useState<GameDiscoveryResponse[]>([]);
  const [locations, setLocations] = useState<LocationDiscoveryResponse[]>([]);
  const [playRequests, setPlayRequests] = useState<PlayRequestDto[]>([]);
  const [friendUserIds, setFriendUserIds] = useState<Set<string>>(new Set());
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
  const loadRequestId = useRef(0);
  const latestDiscoveryData = useRef({
    locations: [] as LocationDiscoveryResponse[],
    games: [] as GameDiscoveryResponse[],
    players: [] as UserSearchResponse[],
    playRequests: [] as PlayRequestDto[],
  });
  const debouncedTimeWindowDays = useDebouncedValue(timeWindowDays, DISCOVERY_RELOAD_DEBOUNCE_MS);
  const debouncedRadiusKm = useDebouncedValue(radiusKm, DISCOVERY_RELOAD_DEBOUNCE_MS);

  const { from, to } = useMemo(() => rangeToDates(debouncedTimeWindowDays), [debouncedTimeWindowDays]);

  useEffect(() => {
    latestDiscoveryData.current = {
      locations,
      games,
      players,
      playRequests,
    };
  }, [games, locations, players, playRequests]);

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

    const requestId = loadRequestId.current + 1;
    loadRequestId.current = requestId;

    setBanner("");
    setLoadingGames(true);
    setLoadingLocations(true);
    setLoadingPlayers(true);
    setLoadingPlayRequests(true);

    const [locationResult, gameResult, playerResult, playRequestResult, friendResult] =
      await Promise.allSettled([
        getDiscoveryLocations({ latitude: center[0], longitude: center[1], radiusKm: debouncedRadiusKm }, user),
        getDiscoveryGames(
          {
            fromUtc: from.toISOString(),
            toUtc: to.toISOString(),
            latitude: center[0],
            longitude: center[1],
            radiusKm: debouncedRadiusKm,
          },
          user
        ),
        searchUsers("", user),
        getPlayRequests(user),
        getFriends(user),
      ]);

    if (requestId !== loadRequestId.current) return;

    const errors: string[] = [];
    const currentData = latestDiscoveryData.current;
    const nextLocations = locationResult.status === "fulfilled" ? locationResult.value : currentData.locations;
    const nextGames = gameResult.status === "fulfilled" ? gameResult.value : currentData.games;
    const nextPlayers = playerResult.status === "fulfilled" ? playerResult.value : currentData.players;
    const nextPlayRequests =
      playRequestResult.status === "fulfilled" ? playRequestResult.value : currentData.playRequests;

    if (locationResult.status === "fulfilled") setLocations(locationResult.value);
    else errors.push("Spielorte");

    if (gameResult.status === "fulfilled") setGames(gameResult.value);
    else errors.push("Spieltermine");

    if (playerResult.status === "fulfilled") setPlayers(playerResult.value);
    else errors.push("Spieler");

    if (playRequestResult.status === "fulfilled") setPlayRequests(playRequestResult.value);
    else errors.push("Spielgesuche");

    if (friendResult.status === "fulfilled") {
      setFriendUserIds(new Set(friendResult.value.map((friend) => friend.userId)));
    }

    if (errors.length > 0) {
      setBanner(`Teilweise nicht geladen: ${errors.join(", ")}. Vorhandene Daten bleiben sichtbar.`);
    }

    setSelection((current) => {
      if (current?.type === "game" && nextGames.some((game) => game.gameId === current.id)) {
        return current;
      }

      if (
        current?.type === "location" &&
        nextLocations.some((location) => location.locationId === current.id)
      ) {
        return current;
      }

      if (current?.type === "player" && nextPlayers.some((player) => player.userId === current.id)) {
        return current;
      }

      if (
        current?.type === "playRequest" &&
        nextPlayRequests.some((request) => request.id === current.id)
      ) {
        return current;
      }

      const firstOwnGame = nextGames.find(isOwnGame);

      if (firstOwnGame) return { type: "game", id: firstOwnGame.gameId };
      if (nextGames[0]) return { type: "game", id: nextGames[0].gameId };
      if (nextLocations[0]) return { type: "location", id: nextLocations[0].locationId };
      if (nextPlayRequests[0]) return { type: "playRequest", id: nextPlayRequests[0].id };

      return null;
    });

    setLoadingGames(false);
    setLoadingLocations(false);
    setLoadingPlayers(false);
    setLoadingPlayRequests(false);
  }, [center, centerReady, debouncedRadiusKm, from, to, user]);

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
    timeWindowDays,
    zoom,
  ]);

  useEffect(() => {
    if (!centerReady) return;

    const timeout = window.setTimeout(() => {
      void updateDiscoverySettings(
        {
          showLocations: true,
          showPlayers: true,
          showMySessions: true,
          showPublicSessions: true,
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
    if (mapMode === "games" || mapMode === "players") return [];

    if (mapMode === "mine") {
      return locations.filter((location) => location.isOwnLocation);
    }

    return locations;
  }, [locations, mapMode]);

  const visibleGames = useMemo(() => {
    if (mapMode === "players" || mapMode === "locations") return [];

    if (mapMode === "mine") {
      return games.filter(isOwnGame);
    }

    return games;
  }, [games, mapMode]);

  const visiblePlayers = useMemo(() => {
    if (mapMode === "games" || mapMode === "locations" || mapMode === "mine") return [];

    return players.filter((player) => {
      if (player.latitude == null || player.longitude == null) return false;
      return distanceKm(center[0], center[1], player.latitude, player.longitude) <= debouncedRadiusKm;
    });
  }, [center, debouncedRadiusKm, mapMode, players]);

  const visiblePlayRequests = useMemo(() => {
    if (mapMode === "games" || mapMode === "locations") return [];

    return playRequests
      .filter((request) => {
        if (request.latitude == null || request.longitude == null) return false;
        return distanceKm(center[0], center[1], request.latitude, request.longitude) <= debouncedRadiusKm;
      })
      .filter((request) => (mapMode === "mine" ? request.isMine : true));
  }, [center, debouncedRadiusKm, mapMode, playRequests]);

  const selectionItems = useMemo(() => {
    const items: SelectionItem[] = [];

    for (const game of visibleGames) {
      if (game.latitude == null || game.longitude == null) continue;

      items.push({
        selection: { type: "game", id: game.gameId },
        latitude: game.latitude,
        longitude: game.longitude,
        priority: game.isHost || game.isParticipant ? 0 : 1,
        sortTime: new Date(game.startTimeUtc).getTime(),
        sortLabel: game.title,
      });
    }

    for (const location of visibleLocations) {
      if (location.latitude == null || location.longitude == null) continue;

      items.push({
        selection: { type: "location", id: location.locationId },
        latitude: location.latitude,
        longitude: location.longitude,
        priority: 2,
        sortTime: Number.MAX_SAFE_INTEGER,
        sortLabel: location.name,
      });
    }

    for (const player of visiblePlayers) {
      items.push({
        selection: { type: "player", id: player.userId },
        latitude: player.latitude!,
        longitude: player.longitude!,
        priority: 3,
        sortTime: Number.MAX_SAFE_INTEGER,
        sortLabel: player.displayName,
      });
    }

    for (const request of visiblePlayRequests) {
      items.push({
        selection: { type: "playRequest", id: request.id },
        latitude: request.latitude!,
        longitude: request.longitude!,
        priority: 4,
        sortTime: Number.MAX_SAFE_INTEGER,
        sortLabel: request.owner.displayName,
      });
    }

    return items.sort((a, b) =>
      a.priority - b.priority ||
      a.sortTime - b.sortTime ||
      a.sortLabel.localeCompare(b.sortLabel, "de")
    );
  }, [visibleGames, visibleLocations, visiblePlayRequests, visiblePlayers]);

  const markerStackCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of selectionItems) {
      counts.set(selectionKey(item.selection), selectionStackCount(item, selectionItems));
    }

    return counts;
  }, [selectionItems]);

  const markerVisualOffsets = useMemo(() => {
    const groups = new Map<string, SelectionItem[]>();
    const offsets = new Map<string, MarkerVisualOffset>();

    for (const item of selectionItems) {
      const key = coordinateGroupKey(item.latitude, item.longitude);
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }

    for (const group of groups.values()) {
      group.forEach((item, index) => {
        offsets.set(selectionKey(item.selection), markerFanOffset(index, group.length));
      });
    }

    return offsets;
  }, [selectionItems]);

  const gamesByLocation = useMemo(() => {
    const counts = new Map<string, number>();

    return visibleGames.map((game) => {
      const count = counts.get(game.locationId) ?? 0;
      counts.set(game.locationId, count + 1);

      return { game, indexAtLocation: count };
    });
  }, [visibleGames]);

  const selectedSelectionItem = useMemo(() => {
    if (!selection) return null;
    return selectionItems.find((item) => sameSelection(item.selection, selection)) ?? null;
  }, [selection, selectionItems]);

  const nearbySelectionItems = useMemo(() => {
    if (!selectedSelectionItem) return [];

    return selectionItems.filter((item) =>
      distanceKm(
        selectedSelectionItem.latitude,
        selectedSelectionItem.longitude,
        item.latitude,
        item.longitude
      ) <= SELECTION_RADIUS_KM
    );
  }, [selectedSelectionItem, selectionItems]);

  const selectionItemIndex =
    selection && nearbySelectionItems.length > 0
      ? nearbySelectionItems.findIndex((item) => sameSelection(item.selection, selection))
      : -1;

  useEffect(() => {
    if (!selection) return;

    const stillVisible = selectionItems.some((item) => sameSelection(item.selection, selection));
    if (!stillVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelection(selectionItems[0]?.selection ?? null);
    }
  }, [selection, selectionItems]);

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
      ? visiblePlayRequests.find((request) => request.id === selection.id) ?? null
      : null;

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

  function selectSelectionAtOffset(offset: number) {
    if (nearbySelectionItems.length === 0 || selectionItemIndex < 0) return;

    const nextIndex =
      (selectionItemIndex + offset + nearbySelectionItems.length) %
      nearbySelectionItems.length;

    setSelection(nearbySelectionItems[nextIndex].selection);
  }

  const isLoading = loadingGames || loadingLocations || loadingPlayers || loadingPlayRequests || !centerReady;
  const loadingLabels = [
    loadingLocations ? "Spielorte" : null,
    loadingGames ? "Spieltermine" : null,
    loadingPlayers ? "Spieler" : null,
    loadingPlayRequests ? "Spielgesuche" : null,
  ].filter((label): label is string => label != null);

  function createAtLocation(locationId: string) {
    navigate(`/games/create?locationId=${encodeURIComponent(locationId)}`);
  }

  return (
    <div className="discovery-page">
      <section className="discovery-map-shell">
        <MapContainer center={center} zoom={zoom} className="discovery-map">
          <MapController
            center={center}
            zoom={zoom}
            refreshKey={`${filterCollapsed}-${legendCollapsed}-${mapMode}-${selection?.type ?? "none"}`}
            onViewportChanged={updateMapViewport}
          />

          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {visibleLocations
            .filter((location) => location.latitude != null && location.longitude != null)
            .map((location) => {
              const markerSelection: ActiveSelection = { type: "location", id: location.locationId };
              const isActive = selection ? sameSelection(selection, markerSelection) : false;
              const visualOffset = markerVisualOffsets.get(selectionKey(markerSelection)) ?? { x: 0, y: 0 };

              return (
                <Marker
                  key={location.locationId}
                  position={[location.latitude!, location.longitude!]}
                  icon={locationMarkerIcon(
                    location,
                    isActive,
                    markerStackCounts.get(selectionKey(markerSelection)) ?? 1,
                    visualOffset.x,
                    visualOffset.y
                  )}
                  zIndexOffset={isActive ? 1120 : location.isOwnLocation ? 220 : 140}
                  eventHandlers={{
                    click: () => setSelection(markerSelection),
                  }}
                >
                  <Popup>
                    <strong>{location.name}</strong>
                    <br />
                    {location.city}
                    {location.locationPrecision === "approximate" && (
                      <>
                        <br />
                        <small>Ungefährer Spielort</small>
                      </>
                    )}
                    {location.upcomingGameCount > 0 && (
                      <>
                        <br />
                        {location.upcomingGameCount === 1
                          ? "1 kommender Spieltermin"
                          : `${location.upcomingGameCount} kommende Spieltermine`}
                      </>
                    )}
                  </Popup>
                </Marker>
              );
            })}

          {gamesByLocation
            .filter(({ game }) => game.latitude != null && game.longitude != null)
            .map(({ game, indexAtLocation }) => {
              const markerSelection: ActiveSelection = { type: "game", id: game.gameId };
              const isActive = selection ? sameSelection(selection, markerSelection) : false;
              const visualOffset = markerVisualOffsets.get(selectionKey(markerSelection)) ?? { x: 0, y: 0 };

              return (
                <Marker
                  key={game.gameId}
                  position={[game.latitude!, game.longitude!]}
                  icon={gameMarkerIcon(
                    game,
                    indexAtLocation,
                    systems,
                    isActive,
                    markerStackCounts.get(selectionKey(markerSelection)) ?? 1,
                    visualOffset.x,
                    visualOffset.y
                  )}
                  zIndexOffset={isActive ? 1180 : isOwnGame(game) ? 360 + indexAtLocation : 240 + indexAtLocation}
                  eventHandlers={{
                    click: () => setSelection(markerSelection),
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
              );
            })}

          {visiblePlayers.map((player) => {
            const markerSelection: ActiveSelection = { type: "player", id: player.userId };
            const isActive = selection ? sameSelection(selection, markerSelection) : false;
            const visualOffset = markerVisualOffsets.get(selectionKey(markerSelection)) ?? { x: 0, y: 0 };

            return (
              <Marker
                key={player.userId}
                position={[player.latitude!, player.longitude!]}
                icon={playerMarkerIcon(
                  player,
                  player.userId === user.userId,
                  friendUserIds.has(player.userId),
                  isActive,
                  markerStackCounts.get(selectionKey(markerSelection)) ?? 1,
                  visualOffset.x,
                  visualOffset.y
                )}
                zIndexOffset={isActive ? 1200 : 720}
                eventHandlers={{
                  click: () => setSelection(markerSelection),
                }}
              >
                <Popup>
                  <strong>{player.displayName}</strong>
                  <br />
                  {player.city ?? "Ort unbekannt"}
                  {player.locationPrecision === "approximate" && (
                    <>
                      <br />
                      <small>Ungefährer Standort</small>
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}

          {visiblePlayRequests.map((request) => {
            const markerSelection: ActiveSelection = { type: "playRequest", id: request.id };
            const isActive = selection ? sameSelection(selection, markerSelection) : false;
            const visualOffset = markerVisualOffsets.get(selectionKey(markerSelection)) ?? { x: 0, y: 0 };

            return (
              <Marker
                key={request.id}
                position={[request.latitude!, request.longitude!]}
                icon={playRequestMarkerIcon(
                  request,
                  isActive,
                  markerStackCounts.get(selectionKey(markerSelection)) ?? 1,
                  visualOffset.x,
                  visualOffset.y
                )}
                zIndexOffset={isActive ? 1210 : 780}
                eventHandlers={{
                  click: () => setSelection(markerSelection),
                }}
              >
                <Popup>
                  <strong>Spielgesuch: {systemShortCode(request.systemKey, systems)}</strong>
                  <br />
                  {request.owner.displayName}
                  {request.city && (
                    <>
                      <br />
                      Ort: {request.city}
                    </>
                  )}
                  {request.timeNote && (
                    <>
                      <br />
                      Zeit: {request.timeNote}
                    </>
                  )}
                  {request.radiusKm && (
                    <>
                      <br />
                      Radius: {request.radiusKm} km
                    </>
                  )}
                  {request.locationPrecision === "approximate" && (
                    <>
                      <br />
                      <small>Ungefährer Standort</small>
                    </>
                  )}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className={`discovery-map-controls ${filterCollapsed ? "discovery-map-controls-collapsed" : ""}`}>
          <button
            type="button"
            className="discovery-filter-toggle"
            aria-label={filterCollapsed ? "Filter öffnen" : "Filter einklappen"}
            onClick={() => setFilterCollapsed((value: boolean) => !value)}
          >
            {filterCollapsed ? "<" : ">"}
          </button>

          {!filterCollapsed && (
            <>
              <div className="discovery-mode-tabs" role="tablist" aria-label="Kartenmodus">
                {mapModes.map((mode) => (
                  <button
                    key={mode.key}
                    type="button"
                    className={mapMode === mode.key ? "active" : ""}
                    aria-pressed={mapMode === mode.key}
                    onClick={() => setMapMode(mode.key)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="discovery-range-controls" aria-label="Kartenfilter">
                <label className="day-slider">
                  <span>Zeitraum: {timeWindowDays} Tage</span>
                  <input
                    type="range"
                    min={1}
                    max={56}
                    value={timeWindowDays}
                    onChange={(event) => setTimeWindowDays(Number(event.target.value))}
                  />
                  <span className="range-scale">
                    <small>1</small>
                    <small>{timeWindowDays}</small>
                    <small>56</small>
                  </span>
                </label>

                <label className="day-slider radius-slider">
                  <span>Umkreis: {radiusKm} km</span>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    step={10}
                    value={radiusKm}
                    onChange={(event) => setRadiusKm(Number(event.target.value))}
                  />
                  <span className="range-scale">
                    <small>10</small>
                    <small>{radiusKm}</small>
                    <small>200</small>
                  </span>
                </label>
              </div>

              <DiscoveryFilterPanel
                banner={banner}
                isLoading={isLoading}
                visibleLocationCount={visibleLocations.length}
                visiblePlayerCount={visiblePlayers.length}
                visibleGameCount={visibleGames.length}
                visiblePlayRequestCount={visiblePlayRequests.length}
                loadingLabels={loadingLabels}
              />
            </>
          )}

          {filterCollapsed && <span className="discovery-filter-collapsed-label">Filter</span>}
        </div>

        <DiscoveryLegend
          collapsed={legendCollapsed}
          onToggle={() => setLegendCollapsed((value: boolean) => !value)}
        />

        {!isLoading && !banner && visibleGames.length === 0 && visibleLocations.length > 0 && (
          <div className="discovery-empty-state">
            Keine kommenden Spiele im Zeitraum. Spielorte werden angezeigt.
          </div>
        )}

        <DiscoverySelectionPanel
          selectedGame={selectedGame}
          selectedLocation={selectedLocation}
          selectedPlayer={selectedPlayer}
          selectedPlayRequest={selectedPlayRequest}
          selectionItemCount={nearbySelectionItems.length}
          selectionItemIndex={selectionItemIndex}
          selectedHostName={selectedHostName}
          selectedOccupiedSeats={selectedOccupiedSeats}
          selectedMaxSeats={selectedMaxSeats}
          systems={systems}
          onClose={() => setSelection(null)}
          onSelectItemAtOffset={selectSelectionAtOffset}
          onCreateAtLocation={createAtLocation}
        />
      </section>
    </div>
  );
}


