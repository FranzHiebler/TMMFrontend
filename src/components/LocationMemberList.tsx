import type { LocationMemberResponse, LocationRole } from "../types/game";
import { locationRoleLabel } from "../helpers/locationLabels";
import DirectMessageButton from "./DirectMessageButton";

type Props = {
  members: LocationMemberResponse[];
  canEdit: boolean;
  assignableRoles: LocationRole[];
  busyKey: string | null;
  canModify: (member: LocationMemberResponse) => boolean;
  onChangeRole: (member: LocationMemberResponse, role: LocationRole) => void;
  onRemove: (userId: string) => void;
};

export default function LocationMemberList({
  members,
  canEdit,
  assignableRoles,
  busyKey,
  canModify,
  onChangeRole,
  onRemove,
}: Props) {
  return (
    <div className="member-list">
      {members.length === 0 && (
        <div className="message message-info">Keine Mitglieder hinterlegt.</div>
      )}

      {members.map((m) => (
        <div key={m.userId} className="member-row">
          <span>{m.displayName || m.userId}</span>

          {canEdit && canModify(m) ? (
            <>
              <select
                value={m.role}
                disabled={busyKey === `role-${m.userId}`}
                onChange={(e) => onChangeRole(m, e.target.value as LocationRole)}
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {locationRoleLabel(r)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={busyKey === `remove-${m.userId}`}
                onClick={() => onRemove(m.userId)}
              >
                Entfernen
              </button>
              <DirectMessageButton
                recipientUserId={m.userId}
                recipientDisplayName={m.displayName || m.userId}
                contextLabel="aus der Location"
                compact
              />
            </>
          ) : (
            <>
              <strong>{locationRoleLabel(m.role)}</strong>
              <DirectMessageButton
                recipientUserId={m.userId}
                recipientDisplayName={m.displayName || m.userId}
                contextLabel="aus der Location"
                compact
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
