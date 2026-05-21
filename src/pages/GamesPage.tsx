import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllGames } from "../api/gamesApi";
import { useJoinGame } from "../api/useJoinGame";
import GameList from "../components/GameList";
import { useUser } from "../context/UserContext";
import type { GameResponse } from "../types/game";
import Message from "../components/Message";

type ViewFilter = "all" | "own" | "joined";

function isPast(game: GameResponse) {
  return new Date(game.startTimeUtc).getTime() < Date.now();
}

function isOwn(game: GameResponse, userId: string) {
  return game.host?.userId === userId;
}

function isJoinedOrApplied(game: GameResponse, userId: string) {
  return game.tables.some(
    (table) =>
      table.assignedPlayers.some((p) => p.userId === userId) ||
      table.applications.some((a) => a.player.userId === userId)
  );
}

function matchesSystem(game: GameResponse, systemFilter: string) {
  if (!systemFilter) return true;

  return game.tables.some((table) =>
    table.systems.some((s) =>
      s.toLowerCase().includes(systemFilter.toLowerCase())
    )
  );
}

function hasOpenSlots(game: GameResponse) {
  return game.openSlots > 0;
}

function priority(game: GameResponse, userId: string) {
  if (isOwn(game, userId)) return 0;
  if (isJoinedOrApplied(game, userId)) return 1;
  return 2;
}

export default function GamesPage() {
  const user = useUser();

  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPast, setShowPast] = useState(false);
  const [onlyOpenSlots, setOnlyOpenSlots] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [systemFilter, setSystemFilter] = useState("");
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");

  const loadGames = useCallback(async () => {
    try {
      setError("");
      setGames(await getAllGames());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Games konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGames();
  }, [loadGames]);

  function handleGameUpdated(updatedGame: GameResponse) {
    setGames((prev) =>
      prev.map((game) => (game.id === updatedGame.id ? updatedGame : game))
    );
  }

  const { join, joiningKey, errorMessage, successMessage, messageByKey } = useJoinGame({
    onGameUpdated: handleGameUpdated,
  });

  const filteredGames = useMemo(() => {
    return games
      .filter((game) => showPast || !isPast(game))
      .filter((game) => !onlyOpenSlots || hasOpenSlots(game))
      .filter(
        (game) =>
          !cityFilter ||
          game.location?.city?.toLowerCase().includes(cityFilter.toLowerCase())
      )
      .filter((game) => matchesSystem(game, systemFilter))
      .filter((game) => {
        if (viewFilter === "own") return isOwn(game, user.userId);
        if (viewFilter === "joined") return isJoinedOrApplied(game, user.userId);
        return true;
      })
      .sort((a, b) => {
        const p = priority(a, user.userId) - priority(b, user.userId);
        if (p !== 0) return p;

        return new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime();
      });
  }, [games, showPast, onlyOpenSlots, cityFilter, systemFilter, viewFilter, user.userId]);

  return (
    <div className="container">
      <Message text={successMessage} type="success" />
      <Message text={errorMessage} type="error" />
      <Message text={error} type="error" />
      {loading && <Message text="Lade Games..." type="info" />}

      <div className="games-page-intro">
        <div className="page-header page-header-stack">
          <div>
            <h1 className="games-page-title">
              Alle GameSessions ({filteredGames.length})
            </h1>
            <p className="page-subtitle">
              Finde offene Runden, filtere nach Ort und System und tritt direkt bei.
            </p>
          </div>
        </div>
      </div>

      <div className="card games-filter-card">
        <div className="games-filter-header">
          <div>
            <h2 className="games-filter-title">Filter</h2>
            <p className="games-filter-text">
              Passe die Liste schnell nach Teilnahme, Stadt und System an.
            </p>
          </div>
        </div>

        <div className="games-filter-grid">
          <div className="field">
            <label>Anzeige</label>
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value as ViewFilter)}
            >
              <option value="all">Alle anzeigen</option>
              <option value="own">Nur meine Sessions</option>
              <option value="joined">Nur angemeldet / beworben</option>
            </select>
          </div>

          <div className="field">
            <label>Stadt</label>
            <input
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="z. B. Frankfurt"
            />
          </div>

          <div className="field">
            <label>System</label>
            <input
              value={systemFilter}
              onChange={(e) => setSystemFilter(e.target.value)}
              placeholder="z. B. Warhammer"
            />
          </div>
        </div>

        <div className="games-filter-toggles">
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={onlyOpenSlots}
              onChange={(e) => setOnlyOpenSlots(e.target.checked)}
            />
            Nur mit freien Plätzen
          </label>

          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
            />
            Vergangene Sessions anzeigen
          </label>
        </div>
      </div>

      {!loading && !error && (
        <GameList
          games={filteredGames}
          joiningKey={joiningKey}
          messageByKey={messageByKey}
          currentUserId={user.userId}
          onJoin={join}
          onGameUpdated={handleGameUpdated}
        />
      )}
    </div>
  );
}
