import { useState } from "react";
import { useUser } from "../context/UserContext";
import {
  type GameChangeProposalDto,
  type GameResponse,
  type GameTableDto,
  GameJoinMode,
} from "../types/game";
import { useGameCardActions } from "../hooks/useGameCardActions";
import { combineDateWithTime, timeFromDate } from "../helpers/dateTime";
import GameCardHeader from "./GameCardHeader";
import GameTableCard from "./GameTableCard";
import ChangeProposalsList from "./ChangeProposalsList";
import GameSessionEditForm from "./GameSessionEditForm";
import Message from "./Message";
import GameSessionMessagesPanel from "./GameSessionMessagesPanel";

type Props = {
  game: GameResponse;
  joiningKey: string | null;
  messageByKey: Record<string, string>;
  currentUserId: string;
  onJoin: (gameId: string, tableId: string, joinMode: GameJoinMode, systemKey?: string) => void;
  onGameUpdated?: (game: GameResponse) => void;
};

export default function GameCard({
  game,
  joiningKey,
  currentUserId,
  messageByKey,
  onJoin,
  onGameUpdated,
}: Props) {
  const user = useUser();

  const [isEditingSession, setIsEditingSession] = useState(false);
  const [openProposalTableId, setOpenProposalTableId] = useState<string | null>(null);
  const [proposalStartTime, setProposalStartTime] = useState("");
  const [proposalSystems, setProposalSystems] = useState<string[]>([]);
  const [proposalCustomSystems, setProposalCustomSystems] = useState("");
  const [proposalPoints, setProposalPoints] = useState("");
  const [proposalMessage, setProposalMessage] = useState("");

  const {
    busyKey,
    message,
    setDraggedPlayerId,
    saveSession,
    saveTable,
    submitProposal,
    resolveProposal,
    acceptApplication,
    declineApplication,
    removeAssignedPlayer,
    moveAssignedPlayer,
  } = useGameCardActions({ game, user, onGameUpdated });

  const isApproval = game.joinMode === GameJoinMode.ApprovalRequired;
  const isHost = game.host?.userId === currentUserId;

  const alreadyInGame = game.tables.some((t) =>
    t.assignedPlayers.some((p) => p.userId === currentUserId)
  );

  const pendingProposals = (game.changeProposals ?? []).filter((p) => p.status === "Pending");

  function resetProposalForm() {
    setProposalStartTime("");
    setProposalSystems([]);
    setProposalCustomSystems("");
    setProposalPoints("");
    setProposalMessage("");
  }

  function openProposalForm(table: GameTableDto) {
    const startSource = table.startTimeUtc ?? game.startTimeUtc;

    setOpenProposalTableId(table.id);
    setProposalStartTime(timeFromDate(startSource));
    setProposalSystems(table.systems.length ? table.systems : ["egal"]);
    setProposalCustomSystems("");
    setProposalPoints(table.points?.toString() ?? "");
    setProposalMessage("");
  }

  function toggleProposalSystem(system: string) {
    if (system === "egal") {
      setProposalSystems((prev) => (prev.includes("egal") ? [] : ["egal"]));
      return;
    }

    setProposalSystems((prev) => {
      const withoutEgal = prev.filter((x) => x !== "egal");

      return withoutEgal.includes(system)
        ? withoutEgal.filter((x) => x !== system)
        : [...withoutEgal, system];
    });
  }

  async function handleSubmitProposal(table: GameTableDto) {
    const customSystems = proposalCustomSystems
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const systems = [...proposalSystems.filter((x) => x !== "egal"), ...customSystems];

    const success = await submitProposal(table, {
      tableId: table.id,
      proposedStartTimeUtc: proposalStartTime
        ? combineDateWithTime(table.startTimeUtc ?? game.startTimeUtc, proposalStartTime)
        : null,
      proposedSystems: proposalSystems.includes("egal")
        ? ["egal"]
        : systems.length
          ? systems
          : null,
      proposedPoints: proposalPoints ? Number(proposalPoints) : null,
      message: proposalMessage.trim() || null,
    });

    if (success) {
      setOpenProposalTableId(null);
      resetProposalForm();
    }
  }

  return (
    <div className="card">
      <GameCardHeader game={game} />

      <Message text={message?.text} type={message?.type} />

      {isHost && (
        <div className="host-edit-bar">
          <button type="button" onClick={() => setIsEditingSession((prev) => !prev)}>
            {isEditingSession ? "Bearbeiten schließen" : "Session bearbeiten"}
          </button>
        </div>
      )}

      {isEditingSession && (
        <GameSessionEditForm
          game={game}
          isBusy={busyKey === "session-edit"}
          onCancel={() => setIsEditingSession(false)}
          onSave={saveSession}
        />
      )}

      <div className="game-tables-grid">
        {game.tables.map((table) => (
          <GameTableCard
            key={table.id}
            game={game}
            table={table}
            isHost={isHost}
            isApproval={isApproval}
            alreadyInGame={alreadyInGame}
            joiningKey={joiningKey}
            messageByKey={messageByKey}
            currentUserId={currentUserId}
            busyKey={busyKey}
            openProposalTableId={openProposalTableId}
            proposalStartTime={proposalStartTime}
            proposalSystems={proposalSystems}
            proposalCustomSystems={proposalCustomSystems}
            proposalPoints={proposalPoints}
            proposalMessage={proposalMessage}
            onJoin={onJoin}
            onOpenProposalTableIdChange={setOpenProposalTableId}
            onOpenProposalTable={openProposalForm}
            onProposalStartTimeChange={setProposalStartTime}
            onToggleProposalSystem={toggleProposalSystem}
            onProposalCustomSystemsChange={setProposalCustomSystems}
            onProposalPointsChange={setProposalPoints}
            onProposalMessageChange={setProposalMessage}
            onSubmitProposal={handleSubmitProposal}
            onUpdateTable={saveTable}
            onAcceptApplication={acceptApplication}
            onRejectApplication={declineApplication}
            onRemovePlayer={removeAssignedPlayer}
            onDragPlayerStart={setDraggedPlayerId}
            onDragPlayerEnd={() => setDraggedPlayerId(null)}
            onDropPlayer={moveAssignedPlayer}
          />
        ))}
      </div>

      <ChangeProposalsList
        proposals={pendingProposals as GameChangeProposalDto[]}
        tables={game.tables}
        isHost={isHost}
        busyKey={busyKey}
        onResolveProposal={resolveProposal}
      />

      <GameSessionMessagesPanel gameId={game.id} />
    </div>
  );
}
