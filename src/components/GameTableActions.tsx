type Props = {
  isFull: boolean;
  isJoining: boolean;
  alreadyInGame: boolean;
  isApproval: boolean;
  isAssignedToTable: boolean;
  onJoin: () => void;
  onToggleProposal: () => void;
};

export default function GameTableActions({
  isFull,
  isJoining,
  alreadyInGame,
  isApproval,
  isAssignedToTable,
  onJoin,
  onToggleProposal,
}: Props) {
  return (
    <div className="table-actions">
      <button disabled={isFull || isJoining || alreadyInGame} onClick={onJoin}>
        {isJoining
          ? "Bitte warten..."
          : isFull
            ? "Voll"
            : alreadyInGame
              ? "Bereits angemeldet"
              : isApproval
                ? "Bewerben"
                : "Beitreten"}
      </button>

      {isAssignedToTable && (
        <button type="button" onClick={onToggleProposal}>
          Änderung vorschlagen
        </button>
      )}
    </div>
  );
}