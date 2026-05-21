import { useState } from "react";
import type {
  GameResponse,
  GameTableDto,
  GameJoinMode,
  UpdateGameTableRequest,
} from "../types/game";
import { gameTableSystemsLabel } from "../helpers/gameLabels";
import AssignedPlayersList from "./AssignedPlayersList";
import ApplicationsList from "./ApplicationsList";
import GameTableActions from "./GameTableActions";
import GameProposalForm from "./GameProposalForm";
import GameTableEditForm from "./GameTableEditForm";
import Message from "./Message";
import GameTableMessagesPanel from "./GameTableMessagesPanel";

type Props = {
  game: GameResponse;
  table: GameTableDto;
  isHost: boolean;
  isApproval: boolean;
  alreadyInGame: boolean;
  joiningKey: string | null;
  messageByKey: Record<string, string>;
  currentUserId: string;
  busyKey: string | null;

  openProposalTableId: string | null;
  proposalStartTime: string;
  proposalSystems: string[];
  proposalCustomSystems: string;
  proposalPoints: string;
  proposalMessage: string;

  onJoin: (gameId: string, tableId: string, joinMode: GameJoinMode, systemKey?: string) => void;
  onOpenProposalTableIdChange: (tableId: string | null) => void;
  onOpenProposalTable: (table: GameTableDto) => void;
  onProposalStartTimeChange: (value: string) => void;
  onToggleProposalSystem: (system: string) => void;
  onProposalCustomSystemsChange: (value: string) => void;
  onProposalPointsChange: (value: string) => void;
  onProposalMessageChange: (value: string) => void;
  onSubmitProposal: (table: GameTableDto) => void;

  onUpdateTable: (tableId: string, request: UpdateGameTableRequest) => Promise<boolean>;
  onAcceptApplication: (tableId: string, applicationId: string) => void;
  onRejectApplication: (applicationId: string) => void;

  onRemovePlayer: (tableId: string, userId: string) => void;
  onDragPlayerStart: (userId: string) => void;
  onDragPlayerEnd: () => void;
  onDropPlayer: (targetTableId: string) => void;
};

export default function GameTableCard({
  game,
  table,
  isHost,
  isApproval,
  alreadyInGame,
  joiningKey,
  messageByKey,
  currentUserId,
  busyKey,
  openProposalTableId,
  proposalStartTime,
  proposalSystems,
  proposalCustomSystems,
  proposalPoints,
  proposalMessage,
  onJoin,
  onOpenProposalTableIdChange,
  onOpenProposalTable,
  onProposalStartTimeChange,
  onToggleProposalSystem,
  onProposalCustomSystemsChange,
  onProposalPointsChange,
  onProposalMessageChange,
  onSubmitProposal,
  onUpdateTable,
  onAcceptApplication,
  onRejectApplication,
  onRemovePlayer,
  onDragPlayerStart,
  onDragPlayerEnd,
  onDropPlayer,
}: Props) {
  const [isEditingTable, setIsEditingTable] = useState(false);

  const key = `${game.id}_${table.id}`;
  const isFull = table.openSlots <= 0;
  const isJoining = joiningKey === key;
  const isAssignedToTable = table.assignedPlayers.some((p) => p.userId === currentUserId);
  const pendingApplications = table.applications.filter((a) => a.status === "Pending");

  const systemKey =
    !table.systems.length || table.systems.some((x) => x.toLowerCase() === "egal")
      ? undefined
      : table.systems[0];

  const availableSystems = table.systems.length ? table.systems : ["egal"];

  return (
    <div
      className="card game-table-card"
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropPlayer(table.id)}
    >
      <div className="game-table-header">
        <div>
          <h4>{table.name}</h4>
          <div className="game-table-subtitle">
            {table.assignedPlayers.length}/{table.maxPlayers} Spieler · {table.openSlots} frei
          </div>
        </div>

        <div className="table-actions">
          <GameTableActions
            isFull={isFull}
            isJoining={isJoining}
            alreadyInGame={alreadyInGame}
            isApproval={isApproval}
            isAssignedToTable={isAssignedToTable}
            onJoin={() => onJoin(game.id, table.id, game.joinMode, systemKey)}
            onToggleProposal={() => {
              if (openProposalTableId === table.id) {
                onOpenProposalTableIdChange(null);
                return;
              }

              onOpenProposalTable(table);
            }}
          />

          {isHost && (
            <button type="button" onClick={() => setIsEditingTable((prev) => !prev)}>
              {isEditingTable ? "Bearbeiten schließen" : "Tisch bearbeiten"}
            </button>
          )}
        </div>
      </div>

      <div className="game-table-meta">
        <div>
          <b>System:</b> {gameTableSystemsLabel(table)}
        </div>

        {table.startTimeUtc && (
          <div>
            <b>Start:</b>{" "}
            {new Date(table.startTimeUtc).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}

        {table.points != null && (
          <div>
            <b>Punkte:</b> {table.points}
          </div>
        )}

        {table.scenario && (
          <div>
            <b>Szenario:</b> {table.scenario}
          </div>
        )}
      </div>

      {table.notes && <div className="game-table-notes">{table.notes}</div>}

      {isEditingTable && (
        <GameTableEditForm
          table={table}
          gameStartTimeUtc={game.startTimeUtc}
          isBusy={busyKey === `table-edit-${table.id}`}
          onCancel={() => setIsEditingTable(false)}
          onSave={(request) => onUpdateTable(table.id, request)}
        />
      )}

      <AssignedPlayersList
        table={table}
        isHost={isHost}
        busyKey={busyKey}
        onRemovePlayer={onRemovePlayer}
        onDragPlayerStart={onDragPlayerStart}
        onDragPlayerEnd={onDragPlayerEnd}
      />

      {openProposalTableId === table.id && (
        <GameProposalForm
          proposalStartTime={proposalStartTime}
          proposalSystems={proposalSystems}
          proposalCustomSystems={proposalCustomSystems}
          proposalPoints={proposalPoints}
          proposalMessage={proposalMessage}
          availableSystems={availableSystems}
          isBusy={busyKey === `proposal-submit-${table.id}`}
          onProposalStartTimeChange={onProposalStartTimeChange}
          onToggleProposalSystem={onToggleProposalSystem}
          onProposalCustomSystemsChange={onProposalCustomSystemsChange}
          onProposalPointsChange={onProposalPointsChange}
          onProposalMessageChange={onProposalMessageChange}
          onSubmit={() => onSubmitProposal(table)}
        />
      )}

      <Message text={messageByKey[key]} type="info" />

      <ApplicationsList
        table={table}
        isHost={isHost}
        pendingApplications={pendingApplications}
        busyKey={busyKey}
        onAcceptApplication={onAcceptApplication}
        onRejectApplication={onRejectApplication}
      />

      <GameTableMessagesPanel gameId={game.id} tableId={table.id} />
    </div>
  );
}
