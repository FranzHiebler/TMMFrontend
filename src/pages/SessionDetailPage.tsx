import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getFriends } from "../api/friendsApi";
import { cancelGame, getGameById, inviteFriendToSession } from "../api/gamesApi";
import { getSystems } from "../api/systemsApi";
import { useJoinGame } from "../api/useJoinGame";
import GameCard from "../components/GameCard";
import GameSessionMessagesPanel from "../components/GameSessionMessagesPanel";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import { systemShortCode } from "../helpers/systemLabels";
import { GameJoinMode, type FriendDto, type GameResponse, type SystemOption } from "../types/game";

function systemsLabel(game: GameResponse, systemOptions: SystemOption[]) {
  const tableSystems = [...new Set(game.tables.flatMap((table) => table.systems).filter(Boolean))];
  return tableSystems.map((system) => systemShortCode(system, systemOptions)).join(", ") || "System offen";
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

function participants(game: GameResponse) {
  return game.tables.flatMap((table) => table.assignedPlayers);
}

export default function SessionDetailPage() {
  const { gameId } = useParams();
  const user = useUser();

  const [game, setGame] = useState<GameResponse | null>(null);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [friendId, setFriendId] = useState("");
  const [showInvite, setShowInvite] = useState(false);
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

    return [
      `Tabletop Matchmaker: ${game.title}`,
      `Ort: ${game.location.name}, ${game.location.city}`,
      `Start: ${timeLabel(game)}`,
      `Plätze: ${game.assignedPlayers}/${game.maxPlayers} belegt`,
      sessionUrl,
    ].join("\n");
  }, [game, sessionUrl]);

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

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => setSystems([]));
  }, []);

  async function copyShareText() {
    if (!shareText) return;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopyMessage("Teilen-Text wurde kopiert.");
    } catch {
      setCopyMessage("Text konnte nicht automatisch kopiert werden.");
    }
  }

  async function joinFirstOpenTable() {
    if (!game) return;
    const table = game.tables.find((candidate) => candidate.openSlots > 0);
    if (!table) return;
    const systemKey = table.systems.length === 1 && table.systems[0] !== "egal" ? table.systems[0] : undefined;
    join(game.id, table.id, game.joinMode, systemKey);
  }

  async function cancelSession() {
    if (!game) return;
    if (!window.confirm("Willst du dieses Spiel wirklich absagen? Teilnehmer werden benachrichtigt.")) return;

    const updated = await cancelGame(game.id, user);
    setCopyMessage("Spiel wurde abgesagt.");
    setGame(updated);
  }

  async function toggleInvite() {
    setShowInvite((current) => !current);

    if (friends.length === 0) {
      const loaded = await getFriends(user);
      setFriends(loaded);
      setFriendId((current) => current || loaded[0]?.userId || "");
    }
  }

  async function inviteSelectedFriend() {
    if (!game || !friendId) return;

    const friend = friends.find((candidate) => candidate.userId === friendId);
    if (!friend) return;

    const updated = await inviteFriendToSession(
      game.id,
      { userId: friend.userId, displayName: friend.displayName },
      user
    );

    setCopyMessage("Einladung gesendet.");
    setGame(updated);
    setShowInvite(false);
  }

  const isHost = game?.host.userId === user.userId;
  const alreadyInGame = !!game && participants(game).some((player) => player.userId === user.userId);
  const canJoin = !!game && !isHost && !alreadyInGame && game.openSlots > 0;

  return (
    <main className="container session-detail-page">
      <div className="page-header">
        <div>
          <h1>Session</h1>
        </div>

      </div>

      <Message text={successMessage} type="success" />
      <Message text={errorMessage} type="error" />
      <Message text={error} type="error" />
      <Message text={copyMessage} type="success" />
      {loading && <Message text="Lade Session..." type="info" />}

      {!loading && !error && game && (
        <>
          <section className="session-overview-grid">
            <div className="card session-hero-card">
              <div className="session-hero-main">
                <div>
                  <div className="session-title-row">
                    <h2>{game.title}</h2>
                    <button
                      type="button"
                      className="icon-button icon-share"
                      aria-label="Teilen-Text kopieren"
                      title="Teilen"
                      onClick={copyShareText}
                    />
                  </div>
                  <p>{systemsLabel(game, systems)}</p>
                </div>
                <strong>{game.assignedPlayers}/{game.maxPlayers}</strong>
              </div>

              <div className="session-fact-grid">
                <span>{timeLabel(game)}</span>
                <span>{game.location.name}</span>
                <span>{game.location.city}</span>
                <span>{game.openSlots} frei</span>
              </div>

              <div className="session-participants">
                {participants(game).length === 0 && <span>Noch keine Teilnehmer.</span>}
                {participants(game).map((participant) => (
                  <span key={participant.userId}>{participant.displayName}</span>
                ))}
              </div>

              <div className="session-action-bar">
                {canJoin && (
                  <button type="button" disabled={!!joiningKey} onClick={joinFirstOpenTable}>
                    {game.joinMode === GameJoinMode.ApprovalRequired ? "Bewerben" : "Mitspielen"}
                  </button>
                )}
                {isHost && (
                  <button type="button" className="icon-link icon-invite" onClick={toggleInvite}>
                    Freunde einladen
                  </button>
                )}
              </div>

              {showInvite && isHost && (
                <div className="session-inline-invite">
                  <select value={friendId} onChange={(event) => setFriendId(event.target.value)}>
                    {friends.length === 0 && <option value="">Keine Freunde gefunden</option>}
                    {friends.map((friend) => (
                      <option key={friend.userId} value={friend.userId}>
                        {friend.displayName}
                      </option>
                    ))}
                  </select>
                  <button type="button" disabled={!friendId} onClick={inviteSelectedFriend}>
                    Einladen
                  </button>
                </div>
              )}
            </div>

            <aside className="card session-chat-card" id="session-chat">
              <GameSessionMessagesPanel gameId={game.id} />
            </aside>
          </section>

          {isHost && (
            <div className="session-cancel-row">
              <button type="button" className="danger-button" onClick={cancelSession}>
                Spiel absagen
              </button>
            </div>
          )}

          <GameCard
            game={game}
            joiningKey={joiningKey}
            currentUserId={user.userId}
            messageByKey={messageByKey}
            onJoin={join}
            onGameUpdated={setGame}
            showMessages={false}
            showHeader={false}
          />
        </>
      )}
    </main>
  );
}
