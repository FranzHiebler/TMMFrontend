import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getGameById } from "../api/gamesApi";
import { useJoinGame } from "../api/useJoinGame";
import GameCard from "../components/GameCard";
import Message from "../components/Message";
import SessionPlanningPanel from "../components/SessionPlanningPanel";
import { useUser } from "../context/UserContext";
import type { GameResponse } from "../types/game";

function buildWhatsAppShareUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function SessionDetailPage() {
  const { gameId } = useParams();
  const user = useUser();

  const [game, setGame] = useState<GameResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const { join, joiningKey, errorMessage, successMessage, messageByKey } = useJoinGame({
    onGameUpdated: setGame,
  });

  const sessionUrl = useMemo(() => {
    if (!gameId) return "";
    return `${window.location.origin}/sessions/${encodeURIComponent(gameId)}`;
  }, [gameId]);

  const shareText = useMemo(() => {
    if (!game) return sessionUrl;

    const startText = new Date(game.startTimeUtc).toLocaleString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return [
      `Tabletop Matchmaker: ${game.title}`,
      `Ort: ${game.location.name}, ${game.location.city}`,
      `Start: ${startText}`,
      `Plätze: ${game.assignedPlayers}/${game.maxPlayers} belegt`,
      sessionUrl,
    ].join("\n");
  }, [game, sessionUrl]);

  const whatsappShareUrl = useMemo(() => buildWhatsAppShareUrl(shareText), [shareText]);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      if (!gameId) {
        setError("Session-ID fehlt.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        setLoading(true);
        const loaded = await getGameById(gameId);

        if (!cancelled) {
          setGame(loaded);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Session konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadGame();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  async function copySessionLink() {
    if (!sessionUrl) return;

    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopyMessage("Session-Link wurde kopiert.");
    } catch {
      setCopyMessage("Link konnte nicht automatisch kopiert werden.");
    }
  }

  async function copyShareText() {
    if (!shareText) return;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMessage("Teilen-Text wurde kopiert.");
    } catch {
      setCopyMessage("Text konnte nicht automatisch kopiert werden.");
    }
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Session</h1>
          <p className="page-subtitle">Detailansicht für genau ein Spiel.</p>
        </div>

        <Link className="nav-create-button" to="/">
          Zur Karte
        </Link>
      </div>

      <Message text={successMessage} type="success" />
      <Message text={errorMessage} type="error" />
      <Message text={error} type="error" />
      <Message text={copyMessage} type="success" />
      {loading && <Message text="Lade Session..." type="info" />}

      {!loading && !error && game && (
        <>
          <section className="card" style={{ marginBottom: "1rem" }}>
            <div className="section-header">
              <div>
                <h2>Session teilen</h2>
                <p className="muted">
                  Link zur einzelnen Session. Später kann diese URL für WhatsApp-Vorschau /
                  OpenGraph genutzt werden.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label>
                <span>Session-Link</span>
                <input value={sessionUrl} readOnly onFocus={(event) => event.target.select()} />
              </label>
            </div>

            <div className="button-row" style={{ marginTop: "1rem" }}>
              <button type="button" onClick={copySessionLink}>
                Link kopieren
              </button>

              <button type="button" onClick={copyShareText}>
                Teilen-Text kopieren
              </button>

              <a
                className="button-like"
                href={whatsappShareUrl}
                target="_blank"
                rel="noreferrer"
              >
                Per WhatsApp teilen
              </a>
            </div>
          </section>

          <GameCard
            game={game}
            joiningKey={joiningKey}
            currentUserId={user.userId}
            messageByKey={messageByKey}
            onJoin={join}
            onGameUpdated={setGame}
          />

          <SessionPlanningPanel game={game} onGameUpdated={setGame} />
        </>
      )}
    </main>
  );
}
