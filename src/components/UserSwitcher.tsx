import { useUser } from "../context/UserContext";

export default function UserSwitcher() {
  const user = useUser();

  return (
    <select
      className="user-switcher"
      value={user.userId}
      aria-label="Testnutzer wechseln"
      onChange={(e) => {
        const selected = user.availableUsers.find((candidate) => candidate.userId === e.target.value);
        if (selected) user.setUser(selected);
      }}
    >
      {user.availableUsers.map((candidate) => (
        <option key={candidate.userId} value={candidate.userId}>
          {candidate.displayName}
        </option>
      ))}
    </select>
  );
}
