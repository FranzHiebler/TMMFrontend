import { useEffect, useMemo, useState } from "react";
import { searchUsers } from "../api/usersApi";
import { useUser, type User } from "../context/UserContext";

const DEV_USERS: User[] = [
  { userId: "64f1a2b3c4d5e6f7890abc12", displayName: "Franz" },
  { userId: "6b0000000000000000000011", displayName: "Björn S." },
  { userId: "6b000000000000000000000f", displayName: "David S." },
  { userId: "6b000000000000000000000b", displayName: "Zigor" },
  { userId: "6b0000000000000000000008", displayName: "Florian P." },
];

function mergeUsers(currentUser: User, loadedUsers: User[]) {
  const byId = new Map<string, User>();

  DEV_USERS.forEach((user) => byId.set(user.userId, user));
  loadedUsers.forEach((user) => byId.set(user.userId, user));
  byId.set(currentUser.userId, currentUser);

  return Array.from(byId.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "de")
  );
}

export default function UserSwitcher() {
  const user = useUser();
  const fallbackUsers = useMemo(
    () => mergeUsers(user, []),
    [user.userId, user.displayName]
  );
  const [users, setUsers] = useState<User[]>(fallbackUsers);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        const result = await searchUsers("");

        if (cancelled) return;

        const loadedUsers = result.map((u) => ({
          userId: u.userId,
          displayName: u.displayName,
        }));

        setUsers(mergeUsers(user, loadedUsers));
      } catch {
        if (!cancelled) {
          setUsers(mergeUsers(user, []));
        }
      }
    }

    setUsers(fallbackUsers);
    void loadUsers();

    return () => {
      cancelled = true;
    };
  }, [fallbackUsers, user]);

  return (
    <select
      className="user-switcher"
      value={user.userId}
      onChange={(e) => {
        const selected = users.find((u) => u.userId === e.target.value);
        if (selected) user.setUser(selected);
      }}
    >
      {users.map((u) => (
        <option key={u.userId} value={u.userId}>
          {u.displayName}
        </option>
      ))}
    </select>
  );
}