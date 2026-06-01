import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { API } from "../api/apiClient";
import { getFriends } from "../api/friendsApi";
import { cancelGame, getGameById, inviteFriendToSession, respondInvitation } from "../api/gamesApi";
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

function publicSessionUrl(game: GameResponse) {
  const publicId = game.publicSlug || game.id;
  const backendBaseUrl = API.replace(/\/api\/?$/, "");
  return `${backendBaseUrl}/s/${encodeURIComponent(publicId)}`;
}

function statusLabel(status: GameResponse["status"]) {
  switch (status) {
    case "Cancelled":
      return "Abgesagt";
    case "Closed":
      return "Geschlossen";
    case "Full":
      return "Voll";
    default:
      return "Offen";
  }
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

  const shareText = useMemo(() => {
    if (!game) return "";

    return [
      `Tabletop Matchmaker: ${game.title}`,
      `Ort: ${game.location.name}, ${game.location.city}`,
      `Start: ${timeLabel(game)}`,
      `Plätze: ${game.assignedPlayers}/${game.maxPlayers} belegt`,
      publicSessionUrl(game),
    ].join("\n");
  }, [game]);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      if (!gameId) {
        setError("Spieltermin-ID fehlt.");
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
          setError(err instanceof Error ? err.message : "Spieltermin konnte nicht geladen werden.");
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

  async function answerInvitation(invitationId: string, accept: boolean) {
    if (!game) return;

    try {
      const updated = await respondInvitation(game.id, invitationId, accept, user);
      setGame(updated);
      setCopyMessage(accept ? "Einladung angenommen." : "Einladung abgelehnt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einladung konnte nicht beantwortet werden.");
    }
  }

  const isHost = game?.host.userId === user.userId;
  const alreadyInGame = !!game && participants(game).some((player) => player.userId === user.userId);
  const pendingInvitations =
    game?.invitations.filter((invitation) => invitation.status === "Pending") ?? [];
  const myPendingInvitation = pendingInvitations.find((invitation) => invitation.user.userId === user.userId);
  const canJoin = !!game && !isHost && !alreadyInGame && !myPendingInvitation && game.openSlots > 0;
  const pendingApplications =
    game?.tables.flatMap((table) => table.applications.filter((application) => application.status === "Pending")) ?? [];
  const pendingWaitlist = game?.waitlist ?? [];
  const primaryActionLabel =
    game?.joinMode === GameJoinMode.ApprovalRequired ? "Mitspielen anfragen" : "Freien Platz nehmen";

  return (
    <main className="container session-detail-page">
      <Message text={successMessage} type="success" />
      <Message text={errorMessage} type="error" />
      <Message text={error} type="error" />
      <Message text={copyMessage} type="success" />
      {loading && <Message text="Lade Spieltermin..." type="info" />}

      {!loading && !error && game && (
        <>
          <section className="session-overview-grid">
            <div className="card session-hero-card session-detail-hero">
              <div className="session-hero-topline">
                <span className={`session-status-pill status-${game.status.toLowerCase()}`}>
                  {statusLabel(game.status)}
                </span>
                <span>{systemsLabel(game, systems)}</span>
              </div>

              <div className="session-title-row">
                <h1>{game.title}</h1>
                <button
                  type="button"
                  className="icon-button icon-share"
                  aria-label="Teilen-Text kopieren"
                  title="Teilen"
                  onClick={copyShareText}
                />
              </div>

              <div className="session-hero-focus">
                <div>
                  <strong>{timeLabel(game)}</strong>
                  <span>{game.location.name}, {game.location.city}</span>
                </div>
                <b>{game.assignedPlayers}/{game.maxPlayers}</b>
              </div>

              {game.description && <p className="session-hero-description">{game.description}</p>}

              <div className="session-fact-grid session-fact-grid-modern">
                <span>
                  <small>Spielort</small>
                  {game.location.name}
                </span>
                <span>
                  <small>Ort</small>
                  {game.location.city}
                </span>
                <span>
                  <small>Plätze</small>
                  {game.openSlots} frei
                </span>
                <span>
                  <small>Host</small>
                  {game.host.displayName}
                </span>
              </div>

              <div className="session-participants">
                <b>Wer?</b>
                {participants(game).length === 0 && <span>Noch keine Teilnehmer.</span>}
                {participants(game).map((participant) => (
                  <span key={participant.userId}>{participant.displayName}</span>
                ))}
              </div>

              <div className="session-primary-action">
                {canJoin && (
                  <button type="button" disabled={!!joiningKey} onClick={joinFirstOpenTable}>
                    {primaryActionLabel}
                  </button>
                )}
                {!canJoin && !isHost && alreadyInGame && <strong>Du bist dabei.</strong>}
                {myPendingInvitation && !alreadyInGame && (
                  <>
                    <button type="button" onClick={() => answerInvitation(myPendingInvitation.id, true)}>
                      Einladung annehmen
                    </button>
                    <button
                      type="button"
                      className="session-secondary-action"
                      onClick={() => answerInvitation(myPendingInvitation.id, false)}
                    >
                      Ablehnen
                    </button>
                  </>
                )}
                {!canJoin && !isHost && !alreadyInGame && game.openSlots <= 0 && <strong>Aktuell keine freien Plätze.</strong>}
                {isHost && (
                  <a className="session-manage-link" href="#session-management">
                    Spieltermin verwalten
                  </a>
                )}
                {isHost && (
                  <button type="button" className="icon-link icon-invite session-secondary-action" onClick={toggleInvite}>
                    Freunde einladen
                  </button>
                )}
                {isHost && <span className="session-host-hint">Verwaltung und Tische findest du weiter unten.</span>}
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

              {isHost && pendingInvitations.length === 0 && (
                <p className="session-empty-note">Noch keine offenen Einladungen.</p>
              )}
            </div>

            <aside className="card session-side-card" id="session-chat">
              <div className="session-side-section">
                <h2>Chat</h2>
                <GameSessionMessagesPanel gameId={game.id} />
              </div>
              <div className="session-side-section session-share-box">
                <h2>Teilen</h2>
                <p>Öffentliche Vorschau für WhatsApp, Discord und Browser.</p>
                <button type="button" className="icon-link icon-share" onClick={copyShareText}>
                  Link kopieren
                </button>
              </div>
            </aside>
          </section>

          <section className="session-management-summary">
            <div className="session-summary-item">
              <strong>{game.tables.length}</strong>
              <span>{game.tables.length === 1 ? "Tisch" : "Tische"}</span>
            </div>
            <div className="session-summary-item">
              <strong>{pendingApplications.length}</strong>
              <span>Bewerbungen</span>
            </div>
            <div className="session-summary-item">
              <strong>{pendingWaitlist.length}</strong>
              <span>Warteliste</span>
            </div>
            <div className="session-summary-item">
              <strong>{pendingInvitations.length}</strong>
              <span>Einladungen</span>
            </div>
          </section>

          <section className="session-detail-section" id="session-management">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Tische & Plätze</p>
                <h2>Spieltermin organisieren</h2>
              </div>
              {isHost && <span>Bearbeiten, Bewerbungen und Zuweisungen sind hier gebündelt.</span>}
            </div>

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
          </section>

          {isHost && (
            <section className="session-danger-zone">
              <div>
                <h2>Spieltermin absagen</h2>
                <p>Teilnehmer werden benachrichtigt. Der Spieltermin wird nicht hart gelöscht.</p>
              </div>
              <button type="button" className="danger-button" onClick={cancelSession}>
                Spiel absagen
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}
