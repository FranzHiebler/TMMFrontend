import { type GameResponse } from "../types/game";
import { gameJoinModeLabel } from "../helpers/gameLabels";
import DirectMessageButton from "./DirectMessageButton";
import { Link } from "react-router-dom";

type Props = {
  game: GameResponse;
};

export default function GameCardHeader({ game }: Props) {
  const assignedPlayers = game.tables.reduce((sum, table) => sum + table.assignedPlayers.length, 0);
  const totalSeats = game.tables.reduce((sum, table) => sum + table.maxPlayers, 0);
  const freeSeats = Math.max(totalSeats - assignedPlayers, 0);

  return (
    <div className="game-session-header">
      <h3>{game.title}</h3>

      <div className="game-session-meta">
        <div className="game-session-meta-item">
          <span className="meta-label">Host</span>
          <span className="inline-user-action">
            {game.host ? (
              <Link className="profile-link" to={`/users/${game.host.userId}`}>
                {game.host.displayName}
              </Link>
            ) : (
              "-"
            )}
            {game.host && (
              <DirectMessageButton
                recipientUserId={game.host.userId}
                recipientDisplayName={game.host.displayName}
                contextLabel={`aus GameSession ${game.title}`}
                compact
              />
            )}
          </span>
        </div>

        <div className="game-session-meta-item">
          <span className="meta-label">Ort</span>
          <span>
            {game.location?.name}
            {game.location?.city ? `, ${game.location.city}` : ""}
          </span>
        </div>

        <div className="game-session-meta-item">
          <span className="meta-label">Start</span>
          <span>{new Date(game.startTimeUtc).toLocaleString("de-DE")}</span>
        </div>

        <div className="game-session-meta-item">
          <span className="meta-label">Modus</span>
          <span>
            {gameJoinModeLabel(game.joinMode)}
          </span>
        </div>

        <div className="game-session-meta-item">
          <span className="meta-label">Plätze</span>
          <span>
            {assignedPlayers}/{totalSeats} · {freeSeats} frei
          </span>
        </div>
      </div>

      {game.description && <p className="game-session-description">{game.description}</p>}
    </div>
  );
}
