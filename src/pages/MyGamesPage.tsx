import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllGames } from "../api/gamesApi";
import GameList from "../components/GameList";
import { useJoinGame } from "../api/useJoinGame";
import { useUser } from "../context/UserContext";
import type { GameResponse } from "../types/game";
import Message from "../components/Message";

function isMine(game: GameResponse, userId: string) {
  return game.host.userId === userId ||
    game.tables.some((table) =>
      table.assignedPlayers.some((player) => player.userId === userId) ||
      table.applications.some((application) => application.player.userId === userId)
    );
}

export default function MyGamesPage() {
  const user = useUser();
  const [games, setGames] = useState<GameResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { join, joiningKey, messageByKey } = useJoinGame({
    onGameUpdated: handleGameUpdated,
  });

  const loadGames = useCallback(async () => {
    try {
      setGames(await getAllGames());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Meine Spiele konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGames();
  }, [loadGames]);

  const myGames = useMemo(() => {
    return games
      .filter((game) => isMine(game, user.userId))
      .sort((a, b) => new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime());
  }, [games, user.userId]);

  function handleGameUpdated(updatedGame: GameResponse) {
    setGames((prev) => prev.map((game) => (game.id === updatedGame.id ? updatedGame : game)));
  }

  return (
    <div className="container">
      <h1>Meine Spiele ({myGames.length})</h1>
      <Message text={loading ? "Lade Spiele..." : ""} type="info" />
      <Message text={error} type="error" />
      {!loading && !error && (
        <GameList
          games={myGames}
          joiningKey={joiningKey}
          currentUserId={user.userId}
          messageByKey={messageByKey}
          onJoin={join}
          onGameUpdated={handleGameUpdated}
        />
      )}
    </div>
  );
}
