import { useCallback, useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { getDiscoveryGames, getGameById } from "../api/gamesApi";
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

type SelectionItem = {
  selection: ActiveSelection;
  latitude: number;
  longitude: number;
  priority: number;
  sortTime: number;
  sortLabel: string;
};

const SELECTION_RADIUS_KM = 0.35;

function sameSelection(a: ActiveSelection, b: ActiveSelection) {
  return a.type === b.type && a.id === b.id;
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
        searchUsers("", user),
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

        if (
          current?.type === "playRequest" &&
          playRequestData.some((request) => request.id === current.id)
        ) {
          return current;
        }

        const firstOwnGame = gameData.find((game) => game.isHost || game.isParticipant);

        if (firstOwnGame) return { type: "game", id: firstOwnGame.gameId };
        if (gameData[0]) return { type: "game", id: gameData[0].gameId };
        if (locationData[0]) return { type: "location", id: locationData[0].locationId };
        if (playRequestData[0]) return { type: "playRequest", id: playRequestData[0].id };

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

  const visiblePlayRequests = useMemo(
    () =>
      playRequests.filter((request) => {
        if (request.latitude == null || request.longitude == null) return false;
        return distanceKm(center[0], center[1], request.latitude, request.longitude) <= radiusKm;
      }),
    [center, playRequests, radiusKm]
  );

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
              zIndexOffset={720}
              eventHandlers={{
                click: () => setSelection({ type: "player", id: player.userId }),
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
          ))}

          {visiblePlayRequests.map((request) => (
              <Marker
                key={request.id}
                position={[request.latitude!, request.longitude!]}
                icon={playRequestMarkerIcon(request)}
                zIndexOffset={780}
                eventHandlers={{
                  click: () => setSelection({ type: "playRequest", id: request.id }),
                }}
              >
                <Popup>
                  <strong>Sucht: {systemShortCode(request.systemKey, systems)}</strong>
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
            ))}
        </MapContainer>

        <DiscoveryFilterPanel
          collapsed={filterCollapsed}
          showLocations={showLocations}
          showPlayers={showPlayers}
          showMySessions={showMySessions}
          showAllSessions={showAllSessions}
          timeWindowDays={timeWindowDays}
          radiusKm={radiusKm}
          banner={banner}
          isLoading={isLoading}
          visibleLocationCount={visibleLocations.length}
          visiblePlayerCount={visiblePlayers.length}
          visibleGameCount={visibleGames.length}
          visiblePlayRequestCount={visiblePlayRequests.length}
          onToggleCollapsed={() => setFilterCollapsed((value) => !value)}
          onShowLocationsChange={setShowLocations}
          onShowPlayersChange={setShowPlayers}
          onShowMySessionsChange={setShowMySessions}
          onShowAllSessionsChange={setShowAllSessions}
          onTimeWindowDaysChange={setTimeWindowDays}
          onRadiusKmChange={setRadiusKm}
        />

        <DiscoveryLegend
          collapsed={legendCollapsed}
          onToggle={() => setLegendCollapsed((value) => !value)}
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


