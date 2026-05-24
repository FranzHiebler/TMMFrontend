import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllGames } from "../api/gamesApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { GameResponse } from "../types/game";

function participates(game: GameResponse, userId: string) {
  return game.tables.some((table) =>
    table.assignedPlayers.some((player) => player.userId === userId) ||
    table.applications.some((application) => application.player.userId === userId)
  );
}

function systemsLabel(game: GameResponse) {
  const systems = game.tables.flatMap((table) => table.systems).filter(Boolean);
  return [...new Set(systems)].join(", ") || "System offen";
}

function timeLabel(game: GameResponse) {
  if (game.timingMode === "Open") return "Termin offen";
  if (game.timeLabel) return game.timeLabel;
  return new Date(game.startTimeUtc).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function GameRow({ game }: { game: GameResponse }) {
  return (
    <details className="my-game-row">
      <summary>
        <strong>{game.title}</strong>
        <span>{timeLabel(game)}</span>
        <span>{game.location.name}</span>
        <span>{game.location.city}</span>
        <span>{systemsLabel(game)}</span>
      </summary>
      <div className="my-game-row-details">
        <span>{game.assignedPlayers}/{game.maxPlayers} Plätze</span>
        <span>{game.status}</span>
        {game.description && <p>{game.description}</p>}
        <Link to={`/sessions/${game.id}`}>Details öffnen</Link>
      </div>
    </details>
  );
}

export default function MyGamesPage() {
  const user = useUser();
  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadGames = useCallback(async () => {
    try {
      setGames(await getAllGames());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Meine Liste konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadGames(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadGames]);

  const hosted = useMemo(
    () => games.filter((game) => game.host.userId === user.userId),
    [games, user.userId]
  );

  const joined = useMemo(
    () => games.filter((game) => game.host.userId !== user.userId && participates(game, user.userId)),
    [games, user.userId]
  );

  const showHeaders = hosted.length > 0 && joined.length > 0;

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Meine</h1>
          <p className="page-subtitle">Deine Spiele, schnell scanbar.</p>
        </div>
      </div>

      <Message text={loading ? "Lade Spiele..." : ""} type="info" />
      <Message text={error} type="error" />

      {!loading && !error && hosted.length === 0 && joined.length === 0 && (
        <section className="card">
          <p className="muted">Du hast noch keine Spiele.</p>
          <Link to="/games/create">Spiel erstellen</Link>
        </section>
      )}

      {hosted.length > 0 && (
        <section className="card my-games-compact">
          {showHeaders && <h2>Ich veranstalte</h2>}
          {hosted.map((game) => <GameRow key={game.id} game={game} />)}
        </section>
      )}

      {joined.length > 0 && (
        <section className="card my-games-compact">
          {showHeaders && <h2>Ich nehme teil</h2>}
          {joined.map((game) => <GameRow key={game.id} game={game} />)}
        </section>
      )}
    </main>
  );
}
