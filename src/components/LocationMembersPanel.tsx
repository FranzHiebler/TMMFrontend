import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptLocationJoinRequest,
  getLocationJoinRequests,
  getLocationMembers,
  rejectLocationJoinRequest,
  removeLocationMember,
  upsertLocationMember,
} from "../api/locationsApi";
import { searchUsers } from "../api/usersApi";
import type {
  LocationMemberResponse,
  LocationResponse,
  LocationRole,
  UserSearchResponse,
  LocationJoinRequestResponse,
} from "../types/game";
import { useUser } from "../context/UserContext";
import LocationJoinRequestsList from "./LocationJoinRequestsList";
import LocationMemberList from "./LocationMemberList";
import LocationMemberAddForm from "./LocationMemberAddForm";
import Message from "./Message";

type Props = {
  location?: LocationResponse;
};

const ownerAssignableRoles: LocationRole[] = ["Admin", "Manager", "Member", "Applicant"];
const adminAssignableRoles: LocationRole[] = ["Manager", "Member", "Applicant"];

export default function LocationMembersPanel({ location }: Props) {
  const user = useUser();

  const [members, setMembers] = useState<LocationMemberResponse[]>([]);
  const [joinRequests, setJoinRequests] = useState<LocationJoinRequestResponse[]>([]);
  const [users, setUsers] = useState<UserSearchResponse[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState<LocationRole>("Member");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const canEdit = location?.role === "Owner" || location?.role === "Admin";

  const assignableRoles = useMemo<LocationRole[]>(() => {
    if (location?.role === "Owner") return ownerAssignableRoles;
    if (location?.role === "Admin") return adminAssignableRoles;
    return [];
  }, [location?.role]);

  const availableUsers = useMemo(() => {
    return users.filter((u) => !members.some((m) => m.userId === u.userId));
  }, [users, members]);

  const effectiveSelectedUserId =
    selectedUserId && availableUsers.some((u) => u.userId === selectedUserId)
      ? selectedUserId
      : availableUsers[0]?.userId ?? "";

  const loadMembers = useCallback(async () => {
    if (!location) return;
    setMembers(await getLocationMembers(location.id, user));
  }, [location, user]);

  const loadJoinRequests = useCallback(async () => {
    if (!location || !canEdit) return;
    setJoinRequests(await getLocationJoinRequests(location.id, user));
  }, [location, user, canEdit]);

  const loadUsers = useCallback(async () => {
    setUsers(await searchUsers(""));
  }, []);

  useEffect(() => {
    if (!success) return;

    const timeout = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  useEffect(() => {
    if (!location) return;

    async function init() {
      setError("");
      setSuccess("");
      await loadMembers();

      if (canEdit) {
        await Promise.all([loadUsers(), loadJoinRequests()]);
      }
    }

    init().catch((err) =>
      setError(err instanceof Error ? err.message : "Daten konnten nicht geladen werden")
    );
  }, [canEdit, loadMembers, loadUsers, loadJoinRequests, location]);

  async function acceptRequest(requestId: string) {
    if (!location) return;

    try {
      setBusyKey(`accept-${requestId}`);
      setError("");
      await acceptLocationJoinRequest(location.id, requestId, user);
      await Promise.all([loadMembers(), loadJoinRequests(), loadUsers()]);
      setSuccess("Beitrittsanfrage angenommen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beitrittsanfrage konnte nicht angenommen werden");
    } finally {
      setBusyKey(null);
    }
  }

  async function rejectRequest(requestId: string) {
    if (!location) return;

    try {
      setBusyKey(`reject-${requestId}`);
      setError("");
      await rejectLocationJoinRequest(location.id, requestId, user);
      await loadJoinRequests();
      setSuccess("Beitrittsanfrage abgelehnt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beitrittsanfrage konnte nicht abgelehnt werden");
    } finally {
      setBusyKey(null);
    }
  }

  async function addMember() {
    if (!location) return;

    const selected = users.find((x) => x.userId === effectiveSelectedUserId);
    if (!selected) return;

    try {
      setBusyKey("add-member");
      setError("");

      await upsertLocationMember(
        location.id,
        { userId: selected.userId, displayName: selected.displayName, role },
        user
      );

      setRole("Member");
      await Promise.all([loadMembers(), loadUsers()]);
      setSuccess("Mitglied hinzugefügt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mitglied konnte nicht hinzugefügt werden");
    } finally {
      setBusyKey(null);
    }
  }

  async function changeRole(member: LocationMemberResponse, newRole: LocationRole) {
    if (!location) return;

    try {
      setBusyKey(`role-${member.userId}`);
      setError("");

      await upsertLocationMember(
        location.id,
        {
          userId: member.userId,
          displayName: member.displayName || member.userId,
          role: newRole,
        },
        user
      );

      await loadMembers();
      setSuccess("Rolle geändert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rolle konnte nicht geändert werden");
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(userId: string) {
    if (!location) return;

    try {
      setBusyKey(`remove-${userId}`);
      setError("");
      await removeLocationMember(location.id, userId, user);
      await Promise.all([loadMembers(), loadUsers()]);
      setSuccess("Mitglied entfernt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mitglied konnte nicht entfernt werden");
    } finally {
      setBusyKey(null);
    }
  }

  function canModify(member: LocationMemberResponse) {
    if (member.role === "Owner") return false;
    if (location?.role === "Owner") return true;
    if (location?.role === "Admin") return member.role !== "Admin";
    return false;
  }

  if (!location) return null;

  return (
    <div className="card">
      <h4>Mitglieder</h4>

      <Message text={error} type="error" />
      <Message text={success} type="success" />

      {canEdit && (
        <LocationJoinRequestsList
          joinRequests={joinRequests}
          busyKey={busyKey}
          onAccept={acceptRequest}
          onReject={rejectRequest}
        />
      )}

      <LocationMemberList
        members={members}
        canEdit={canEdit}
        assignableRoles={assignableRoles}
        busyKey={busyKey}
        canModify={canModify}
        onChangeRole={changeRole}
        onRemove={remove}
      />

      {canEdit && (
        <div className="member-edit-block">
          <LocationMemberAddForm
            availableUsers={availableUsers}
            selectedUserId={effectiveSelectedUserId}
            role={role}
            assignableRoles={assignableRoles}
            busyKey={busyKey}
            onSelectedUserIdChange={setSelectedUserId}
            onRoleChange={setRole}
            onAddMember={addMember}
          />
        </div>
      )}
    </div>
  );
}