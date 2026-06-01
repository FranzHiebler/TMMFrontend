import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicGame } from "../api/gamesApi";
import Message from "../components/Message";
import type { PublicGameResponse } from "../types/game";

export default function PublicSessionPage() {
  const { slugOrId } = useParams();
  const [game, setGame] = useState<PublicGameResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slugOrId) return;
    getPublicGame(slugOrId)
      .then(setGame)
      .catch((err) => setError(err instanceof Error ? err.message : "Spieltermin konnte nicht geladen werden."));
  }, [slugOrId]);

  return (
    <main className="container">
      <Message text={error} type="error" />
      {game && (
        <section className="card public-profile-card">
          <p className="panel-kicker">Öffentlicher Spieltermin</p>
          <h1>{game.title}</h1>
          <p>{game.location.name}, {game.location.city}</p>
          <p>{game.timingMode === "Open" ? "Termin offen" : new Date(game.startTimeUtc).toLocaleString("de-DE")}</p>
          {game.timeLabel && <p>{game.timeLabel}</p>}
          {game.description && <p>{game.description}</p>}
          <p>{game.openSlots} freie Plätze</p>
        </section>
      )}
    </main>
  );
}
