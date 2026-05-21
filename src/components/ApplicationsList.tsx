import type { TableApplicationDto, GameTableDto } from "../types/game";
import { Link } from "react-router-dom";
import DirectMessageButton from "./DirectMessageButton";

type Props = {
  table: GameTableDto;
  isHost: boolean;
  pendingApplications: TableApplicationDto[];
  busyKey: string | null;
  onAcceptApplication: (tableId: string, applicationId: string) => void;
  onRejectApplication: (applicationId: string) => void;
};

export default function ApplicationsList({
  table,
  isHost,
  pendingApplications,
  busyKey,
  onAcceptApplication,
  onRejectApplication,
}: Props) {
  if (!isHost || pendingApplications.length === 0) return null;

  return (
    <div className="applications-section">
      <h5>Bewerbungen</h5>

      <div className="proposal-list compact">
        {pendingApplications.map((application) => (
          <div key={application.id} className="proposal-row compact">
            <div>
                <Link className="profile-link" to={`/users/${application.player.userId}`}>
                  {application.player.displayName}
                </Link>
              {application.systemKey && <div>System: {application.systemKey}</div>}
              {application.message && <p>{application.message}</p>}
            </div>

            <div className="proposal-actions">
              <DirectMessageButton
                recipientUserId={application.player.userId}
                recipientDisplayName={application.player.displayName}
                contextLabel={`aus Bewerbung für ${table.name}`}
                compact
              />

              <button
                type="button"
                disabled={busyKey === `application-accept-${application.id}`}
                onClick={() => onAcceptApplication(table.id, application.id)}
              >
                Annehmen
              </button>

              <button
                type="button"
                disabled={busyKey === `application-reject-${application.id}`}
                onClick={() => onRejectApplication(application.id)}
              >
                Ablehnen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
