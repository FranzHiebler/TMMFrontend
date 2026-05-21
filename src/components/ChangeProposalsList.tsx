import type { GameChangeProposalDto, GameTableDto } from "../types/game";
import { Link } from "react-router-dom";

type Props = {
  proposals: GameChangeProposalDto[];
  tables: GameTableDto[];
  isHost: boolean;
  busyKey: string | null;
  onResolveProposal: (proposalId: string, action: "accept" | "reject") => void;
};

function proposalSummary(proposal: GameChangeProposalDto, table?: GameTableDto) {
  const parts: string[] = [];

  if (proposal.proposedStartTimeUtc) {
    parts.push(`Uhrzeit: ${new Date(proposal.proposedStartTimeUtc).toLocaleString("de-DE")}`);
  }

  if (proposal.proposedSystems?.length) {
    parts.push(`System: ${proposal.proposedSystems.join(", ")}`);
  }

  if (proposal.proposedPoints != null) {
    parts.push(`Punkte: ${proposal.proposedPoints}`);
  }

  const tablePrefix = table ? `${table.name}: ` : "";
  return `${tablePrefix}${parts.join(" | ")}`;
}

export default function ChangeProposalsList({
  proposals,
  tables,
  isHost,
  busyKey,
  onResolveProposal,
}: Props) {
  if (proposals.length === 0) return null;

  return (
    <div className="proposal-list">
      <h4>Offene Änderungsvorschläge</h4>

      {proposals.map((proposal) => {
        const table = tables.find((t) => t.id === proposal.tableId);

        return (
          <div key={proposal.id} className="proposal-row">
            <div>
              <Link className="profile-link" to={`/users/${proposal.proposedBy.userId}`}>
                {proposal.proposedBy.displayName}
              </Link>{" "}
              <span>{proposalSummary(proposal, table)}</span>
              {proposal.message && <p>{proposal.message}</p>}
            </div>

            {isHost && (
              <div className="proposal-actions">
                <button
                  type="button"
                  disabled={busyKey === `proposal-accept-${proposal.id}`}
                  onClick={() => onResolveProposal(proposal.id, "accept")}
                >
                  Annehmen
                </button>

                <button
                  type="button"
                  disabled={busyKey === `proposal-reject-${proposal.id}`}
                  onClick={() => onResolveProposal(proposal.id, "reject")}
                >
                  Ablehnen
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}