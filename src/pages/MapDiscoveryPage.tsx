import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { getDiscoveryGames, getGameById } from "../api/gamesApi";
import { getDiscoveryLocations, getMyLocations } from "../api/locationsApi";
import { getCurrentUserProfile, searchUsers } from "../api/usersApi";
import { useJoinGame } from "../api/useJoinGame";
import { useUser } from "../context/UserContext";
import type {
  GameDiscoveryResponse,
  GameResponse,
  LocationDiscoveryResponse,
  UserSearchResponse,
} from "../types/game";

type Selection =
  | { type: "game"; id: string }
  | { type: "location"; id: string }
  | { type: "player"; id: string }
  | null;

type CenterSource =
  | "browser"
  | "profile"
  | "userSearch"
  | "defaultLocation"
  | "fallback";

type SessionFilter = "all" | "mine" | "none";

const DEFAULT_CENTER: [number, number] = [50.5558, 9.6808];

const CENTER_SOURCE_LABEL: Record<CenterSource, string> = {
  browser: "aktueller Standort",
  profile: "Profil-Standort",
  userSearch: "Spieler-Standort",
  defaultLocation: "Standard-Location",
  fallback: "Fallback",
};

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 0.6 });
  }, [center, map]);

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

function timeHint(startTimeUtc: string) {
  const start = new Date(startTimeUtc);
  const today = startOfToday();
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86400000);

  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Morgen";
  if (diffDays > 1 && diffDays < 7) {
    return start.toLocaleDateString("de-DE", { weekday: "short" });
  }

  return start.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
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

function systemLabelsFromSummary(summary: string) {
  if (!summary.trim()) return [];

  return summary
    .split("·")
    .flatMap((part) => part.split(":").slice(1).join(":").split(","))
    .map((value) => cleanSystemLabel(value.replace(/\d+\s*Punkte/i, "")))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);
}

function systemBadgesHtml(labels: string[]) {
  if (labels.length === 0) return `<span class="map-system-badge">?</span>`;

  return labels
    .map((label) => `<span class="map-system-badge">${label}</span>`)
    .join("");
}

function gameMarkerIcon(game: GameDiscoveryResponse, indexAtLocation: number) {
  const state = gameMarkerState(game);
  const offset = Math.min(indexAtLocation, 3) * 8;
  const systems = systemLabelsFromSummary(game.tablesSummary);

  return L.divIcon({
    className: "",
    html: `
      <div class="discovery-marker discovery-marker-${state}" style="transform: translate(${offset}px, -${offset}px)">
        <div class="marker-main-row">
          <span class="marker-symbol">🎲</span>
          <span>${timeHint(game.startTimeUtc)}</span>
        </div>
        <div class="marker-system-row">${systemBadgesHtml(systems)}</div>
      </div>
    `,
    iconSize: [104, 52],
    iconAnchor: [52, 26],
  });
}

function locationMarkerIcon(location: LocationDiscoveryResponse) {
  const state = location.isOwnLocation ? "own-location-base" : "location";
  const count =
    location.upcomingGameCount > 0 ? location.upcomingGameCount.toString() : "";

  return L.divIcon({
    className: "",
    html: `
      <div class="location-marker location-marker-${state}">
        <span class="marker-symbol">📍</span>
        ${count ? `<strong>${count}</strong>` : ""}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function playerMarkerIcon(isMe: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="player-marker ${
      isMe ? "player-marker-me" : "player-marker-default"
    }">👤</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
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

function statusText(game: GameDiscoveryResponse) {
  if (game.isHost) return "Du hostest";
  if (game.isParticipant) return "Du nimmst teil";
  if (game.applicationStatus) return `Bewerbung: ${game.applicationStatus}`;
  return "Session";
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

  const [timeWindowDays, setTimeWindowDays] = useState(7);
  const [radiusKm, setRadiusKm] = useState(80);
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [showLocations, setShowLocations] = useState(true);
  const [showPlayers, setShowPlayers] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");

  const [players, setPlayers] = useState<UserSearchResponse[]>([]);
  const [games, setGames] = useState<GameDiscoveryResponse[]>([]);
  const [locations, setLocations] = useState<LocationDiscoveryResponse[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [selectedFullGame, setSelectedFullGame] = useState<GameResponse | null>(null);
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);

  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [banner, setBanner] = useState("");
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [centerSource, setCenterSource] = useState<CenterSource>("fallback");
  const [centerReady, setCenterReady] = useState(false);

  const { from, to } = useMemo(() => rangeToDates(timeWindowDays), [timeWindowDays]);

  const resolveInitialCenter = useCallback(async () => {
    setCenterReady(false);
    setSelection(null);
    setSelectedFullGame(null);
    setSelectedTableIndex(0);

    try {
      const [profile, myLocations, userSearchResults] = await Promise.all([
        getCurrentUserProfile(user),
        getMyLocations(user),
        searchUsers(""),
      ]);

      if (profile.latitude != null && profile.longitude != null) {
        setCenter([profile.latitude, profile.longitude]);
        setCenterSource("profile");
        return;
      }

      const searchUser = userSearchResults.find(
        (candidate) => candidate.userId === user.userId
      );

      if (searchUser?.latitude != null && searchUser.longitude != null) {
        setCenter([searchUser.latitude, searchUser.longitude]);
        setCenterSource("userSearch");
        return;
      }

      const defaultLocation = myLocations.find(
        (location) =>
          location.id === profile.defaultLocationId &&
          location.latitude != null &&
          location.longitude != null
      );

      if (defaultLocation?.latitude != null && defaultLocation.longitude != null) {
        setCenter([defaultLocation.latitude, defaultLocation.longitude]);
        setCenterSource("defaultLocation");
        return;
      }
    } catch {
      // fallback unten
    } finally {
      setCenterReady(true);
    }

    try {
      const browserCenter = await getBrowserPosition();
      setCenter(browserCenter);
      setCenterSource("browser");
      return;
    } catch {
      // fallback unten
    }

    setCenter(DEFAULT_CENTER);
    setCenterSource("fallback");
  }, [user]);

  const loadDiscovery = useCallback(async () => {
    if (!centerReady) return;

    setBanner("");
    setLoadingGames(true);
    setLoadingLocations(true);
    setLoadingPlayers(true);

    try {
      const [locationData, gameData, playerData] = await Promise.all([
        getDiscoveryLocations(
          { latitude: center[0], longitude: center[1], radiusKm },
          user
        ),
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
      ]);

      setLocations(locationData);
      setGames(gameData);
      setPlayers(playerData);

      setSelection((current) => {
        if (
          current?.type === "game" &&
          gameData.some((game) => game.gameId === current.id)
        ) {
          return current;
        }

        if (
          current?.type === "location" &&
          locationData.some((location) => location.locationId === current.id)
        ) {
          return current;
        }

        if (
          current?.type === "player" &&
          playerData.some((player) => player.userId === current.id)
        ) {
          return current;
        }

        if (gameData[0]) return { type: "game", id: gameData[0].gameId };
        if (locationData[0]) {
          return { type: "location", id: locationData[0].locationId };
        }

        return null;
      });
    } catch (err) {
      setBanner(err instanceof Error ? err.message : "Discovery konnte nicht geladen werden.");
    } finally {
      setLoadingGames(false);
      setLoadingLocations(false);
      setLoadingPlayers(false);
    }
  }, [center, centerReady, from, radiusKm, to, user]);

  const { join, joiningKey } = useJoinGame({
    onGameUpdated: () => void loadDiscovery(),
  });

  useEffect(() => {
    void resolveInitialCenter();
  }, [resolveInitialCenter]);

  useEffect(() => {
    if (!centerReady) return;
    void loadDiscovery();
  }, [centerReady, loadDiscovery]);

  const visibleLocations = useMemo(() => {
    if (!showLocations) return [];
    return locations;
  }, [locations, showLocations]);

  const visibleGames = useMemo(() => {
    if (sessionFilter === "none") return [];

    return games.filter((game) => {
      if (sessionFilter === "mine") return game.isHost || game.isParticipant;
      return true;
    });
  }, [games, sessionFilter]);

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

  const selectedTables = selectedFullGame?.tables ?? [];
  const selectedTable = selectedTables[selectedTableIndex] ?? null;

  useEffect(() => {
    if (!selectedGame) {
      setSelectedFullGame(null);
      setSelectedTableIndex(0);
      return;
    }

    const timeout = window.setTimeout(() => {
      void getGameById(selectedGame.gameId)
        .then((game) => {
          setSelectedFullGame(game);
          setSelectedTableIndex(0);
        })
        .catch(() => {
          setSelectedFullGame(null);
          setSelectedTableIndex(0);
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

  function selectTableAtOffset(offset: number) {
    if (selectedTables.length === 0) return;

    const nextIndex =
      (selectedTableIndex + offset + selectedTables.length) % selectedTables.length;

    setSelectedTableIndex(nextIndex);
  }

  const isLoading = loadingGames || loadingLocations || loadingPlayers || !centerReady;

  async function quickJoin(game: GameDiscoveryResponse) {
    const fullGame = await getGameById(game.gameId);
    const table = fullGame.tables.find((candidate) => candidate.openSlots > 0);

    if (!table) return;

    const systemKey =
      table.systems.length === 0 ||
      table.systems.some((system) => system.toLowerCase() === "egal")
        ? undefined
        : table.systems[0];

    await join(fullGame.id, table.id, fullGame.joinMode, systemKey);
  }

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
        <MapContainer center={center} zoom={10} className="discovery-map">
          <MapCenterController center={center} />

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
                zIndexOffset={location.isOwnLocation ? 180 : 80}
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
                icon={gameMarkerIcon(game, indexAtLocation)}
                zIndexOffset={600 + indexAtLocation}
                eventHandlers={{
                  click: () => setSelection({ type: "game", id: game.gameId }),
                }}
              >
                <Popup>
                  <strong>{game.title}</strong>
                  <br />
                  {dateTimeText(game.startTimeUtc)}
                  <br />
                  {game.locationName}, {game.city}
                </Popup>
              </Marker>
            ))}

          {visiblePlayers.map((player) => (
            <Marker
              key={player.userId}
              position={[player.latitude!, player.longitude!]}
              icon={playerMarkerIcon(player.userId === user.userId)}
              zIndexOffset={300}
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
        </MapContainer>

        <aside
          className={`discovery-panel discovery-panel-compact ${
            filterCollapsed ? "discovery-panel-collapsed" : ""
          }`}
        >
          <button
            type="button"
            className="discovery-panel-toggle"
            onClick={() => setFilterCollapsed((value) => !value)}
          >
            {filterCollapsed ? "Filter" : "Filter einklappen"}
          </button>

          {!filterCollapsed && (
            <>
              <label className="day-slider">
                <span>Zeitraum: {timeWindowDays} Tage</span>
                <input
                  type="range"
                  min={1}
                  max={56}
                  value={timeWindowDays}
                  onChange={(event) => setTimeWindowDays(Number(event.target.value))}
                />
              </label>

              <label className="day-slider">
                <span>Radius: {radiusKm} km</span>
                <input
                  type="range"
                  min={10}
                  max={250}
                  step={10}
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                />
              </label>

              <div className="discovery-filter-box discovery-filter-box-compact">
                <label>
                  <input
                    type="checkbox"
                    checked={showLocations}
                    onChange={(event) => setShowLocations(event.target.checked)}
                  />
                  Locations
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={showPlayers}
                    onChange={(event) => setShowPlayers(event.target.checked)}
                  />
                  Spieler
                </label>

                <label className="session-filter-select">
                  <span>Sessions</span>
                  <select
                    value={sessionFilter}
                    onChange={(event) =>
                      setSessionFilter(event.target.value as SessionFilter)
                    }
                  >
                    <option value="all">Alle</option>
                    <option value="mine">Meine</option>
                    <option value="none">Aus</option>
                  </select>
                </label>
              </div>

              {banner && <div className="message message-error">{banner}</div>}
              {isLoading && <div className="discovery-skeleton" />}
              {!isLoading && !banner && (
                <p className="discovery-count">
                  {visibleLocations.length} Locations · {visibleGames.length} Sessions ·{" "}
                  {visiblePlayers.length} Spieler · {CENTER_SOURCE_LABEL[centerSource]}
                </p>
              )}
            </>
          )}
        </aside>

        <div className="discovery-map-legend">
          <span>
            <i className="legend-dot location" /> Location
          </span>
          <span>
            <i className="legend-dot own-location-base" /> Eigene Location
          </span>
          <span>
            <i className="legend-dot event" /> Session
          </span>
          <span>
            <i className="legend-dot participant" /> Meine Teilnahme
          </span>
          <span>
            <i className="legend-dot host" /> Mein Host
          </span>
          <span>
            <i className="legend-dot player" /> Spieler
          </span>
          <span>
            <i className="legend-dot player-me" /> Ich
          </span>
        </div>

        {!isLoading && !banner && visibleGames.length === 0 && visibleLocations.length > 0 && (
          <div className="discovery-empty-state">
            Keine kommenden Sessions im Zeitraum. Locations werden angezeigt.
          </div>
        )}

        {selectedGame && (
          <article className="session-preview">
            <div className="session-preview-topbar">
              <p className="panel-kicker">{statusText(selectedGame)}</p>

              {selectedLocationGames.length > 1 && (
                <div className="session-preview-switcher">
                  <button type="button" onClick={() => selectGameAtOffset(-1)}>
                    ←
                  </button>
                  <span>
                    {selectedGameIndex + 1} / {selectedLocationGames.length}
                  </span>
                  <button type="button" onClick={() => selectGameAtOffset(1)}>
                    →
                  </button>
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

            <div className="preview-meta-grid">
              <span>📅 {dateTimeText(selectedGame.startTimeUtc)}</span>
              <span>
                📍 {selectedGame.locationName}, {selectedGame.city}
              </span>
              <span>👥 {selectedGame.availableSeats} freie Plätze</span>
              <span>🎲 {selectedGame.status}</span>
            </div>

            <div className="system-badge-row">
              {renderSystemBadges(systemLabelsFromSummary(selectedGame.tablesSummary))}
            </div>

            {selectedTable && (
              <section className="table-preview-box">
                <div className="table-preview-head">
                  <strong>{selectedTable.name}</strong>

                  {selectedTables.length > 1 && (
                    <div className="table-preview-switcher">
                      <button type="button" onClick={() => selectTableAtOffset(-1)}>
                        ←
                      </button>
                      <span>
                        {selectedTableIndex + 1} / {selectedTables.length}
                      </span>
                      <button type="button" onClick={() => selectTableAtOffset(1)}>
                        →
                      </button>
                    </div>
                  )}
                </div>

                <div className="table-preview-meta">
                  <span>
                    🎲{" "}
                    {selectedTable.systems.length > 0
                      ? selectedTable.systems.join(", ")
                      : "offen"}
                  </span>

                  {selectedTable.points != null && (
                    <span>⚔️ {selectedTable.points} Punkte</span>
                  )}

                  <span>
                    👥 {selectedTable.assignedPlayers.length} / {selectedTable.maxPlayers}
                  </span>

                  {selectedTable.scenario && <span>📘 {selectedTable.scenario}</span>}
                </div>

                {selectedTable.assignedPlayers.length > 0 && (
                  <p className="table-preview-players">
                    {selectedTable.assignedPlayers
                      .map((player) => player.displayName)
                      .join(", ")}
                  </p>
                )}
              </section>
            )}

            {!selectedTable && selectedGame.tablesSummary && (
              <p className="preview-summary">{selectedGame.tablesSummary}</p>
            )}

            <div className="preview-actions">
              <Link to={`/sessions/${encodeURIComponent(selectedGame.gameId)}`}>
                Zur Session
              </Link>

              <Link to={`/sessions/${encodeURIComponent(selectedGame.gameId)}?messages=1`}>
                Nachrichten
              </Link>

              {!selectedGame.isHost && !selectedGame.isParticipant && (
                <button
                  type="button"
                  disabled={joiningKey?.startsWith(selectedGame.gameId)}
                  onClick={() => quickJoin(selectedGame)}
                >
                  {selectedGame.joinMode === "ApprovalRequired" ? "Bewerben" : "Beitreten"}
                </button>
              )}

              {selectedGame.canEdit && (
                <Link to={`/sessions/${encodeURIComponent(selectedGame.gameId)}`}>
                  Bearbeiten
                </Link>
              )}
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
                ? `Eigene Location${selectedLocation.role ? ` · ${selectedLocation.role}` : ""}`
                : "Location"}
            </p>

            <h2>{selectedLocation.name}</h2>

            <div className="preview-meta-grid">
              <span>
                📍 {selectedLocation.city}
                {selectedLocation.address ? `, ${selectedLocation.address}` : ""}
              </span>
              <span>🎲 {selectedLocation.upcomingGameCount} kommende Sessions</span>
              {selectedLocation.nextGameStartTimeUtc && (
                <span>📅 nächste: {dateTimeText(selectedLocation.nextGameStartTimeUtc)}</span>
              )}
            </div>

            <div className="system-badge-row">
              {renderSystemBadges(
                selectedLocation.systemKeys.map(cleanSystemLabel).filter(Boolean)
              )}
            </div>

            <div className="preview-actions">
              <Link to="/locations">Details</Link>

              <button type="button" onClick={() => createAtLocation(selectedLocation.locationId)}>
                Session hier erstellen
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
              {selectedPlayer.city && <span>📍 {selectedPlayer.city}</span>}
              {selectedPlayer.streetAddress && <span>🏠 {selectedPlayer.streetAddress}</span>}
              {selectedPlayer.postalCode && <span>✉️ {selectedPlayer.postalCode}</span>}
            </div>

            <div className="preview-actions">
              <Link to={`/users/${encodeURIComponent(selectedPlayer.userId)}`}>
                Profil öffnen
              </Link>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}