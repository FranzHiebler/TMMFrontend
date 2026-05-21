import type { LocationJoinRequestResponse } from "../types/game";

type Props = {
  joinRequests: LocationJoinRequestResponse[];
  busyKey: string | null;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

export default function LocationJoinRequestsList({
  joinRequests,
  busyKey,
  onAccept,
  onReject,
}: Props) {
  if (joinRequests.length === 0) return null;

  return (
    <div className="proposal-list">
      <h4>Beitrittsanfragen</h4>

      {joinRequests.map((request) => (
        <div key={request.id} className="proposal-row">
          <div>
            <b>{request.displayName}</b>
            {request.message && <p>{request.message}</p>}
          </div>

          <div className="proposal-actions">
            <button
              type="button"
              disabled={busyKey === `accept-${request.id}`}
              onClick={() => onAccept(request.id)}
            >
              Annehmen
            </button>

            <button
              type="button"
              disabled={busyKey === `reject-${request.id}`}
              onClick={() => onReject(request.id)}
            >
              Ablehnen
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}