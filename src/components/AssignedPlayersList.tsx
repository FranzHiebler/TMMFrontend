import type { GameTableDto } from "../types/game";
import { Link } from "react-router-dom";
import DirectMessageButton from "./DirectMessageButton";

type Props = {
  table: GameTableDto;
  isHost: boolean;
  busyKey: string | null;
  onRemovePlayer: (tableId: string, userId: string) => void;
  onDragPlayerStart: (userId: string) => void;
  onDragPlayerEnd: () => void;
};

export default function AssignedPlayersList({
  table,
  isHost,
  busyKey,
  onRemovePlayer,
  onDragPlayerStart,
  onDragPlayerEnd,
}: Props) {
  if (table.assignedPlayers.length === 0) return null;

  return (
    <div className="assigned-player-section">
      <h5>Zugewiesen</h5>

      <div className="assigned-player-list compact">
        {table.assignedPlayers.map((player) => (
          <div
            key={player.userId}
            className="assigned-player-row compact"
            draggable={isHost}
            onDragStart={() => onDragPlayerStart(player.userId)}
            onDragEnd={onDragPlayerEnd}
          >
            <Link className="assigned-player-name profile-link" to={`/users/${player.userId}`}>
              {player.displayName}
            </Link>

            <div className="assigned-player-actions">
              <DirectMessageButton
                recipientUserId={player.userId}
                recipientDisplayName={player.displayName}
                contextLabel={`vom Tisch ${table.name}`}
                compact
              />
              {isHost && (
                <button
                  type="button"
                  className="assigned-player-remove"
                  disabled={busyKey === `player-remove-${player.userId}`}
                  onClick={() => onRemovePlayer(table.id, player.userId)}
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
