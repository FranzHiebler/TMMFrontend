/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getTestUsers } from "../api/usersApi";
import DatabaseUnavailableOverlay from "../components/DatabaseUnavailableOverlay";

export type User = {
  userId: string;
  displayName: string;
};

type UserContextValue = User & {
  availableUsers: User[];
  setUser: (user: User) => void;
  reloadUsers: () => Promise<void>;
};

const STORAGE_KEY = "tmm-current-user";

const UserContext = createContext<UserContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

type BootstrapState = "loading" | "ready" | "unavailable";

function readStoredUserId() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<User>;
    return typeof parsed.userId === "string" ? parsed.userId : null;
  } catch {
    return null;
  }
}

function persistUser(user: User) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function UserProvider({ children }: Props) {
  const [state, setState] = useState<BootstrapState>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [technicalHint, setTechnicalHint] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setState("loading");
      setTechnicalHint("");

      const users = await getTestUsers();
      if (users.length === 0) {
        throw new Error("Keine Testnutzer geladen.");
      }

      const storedUserId = readStoredUserId();
      const selected = users.find((candidate) => candidate.userId === storedUserId) ?? users[0];

      setAvailableUsers(users);
      setUserState(selected);
      persistUser(selected);
      setState("ready");
    } catch (err) {
      console.error("Initialisierung fehlgeschlagen", err);
      localStorage.removeItem(STORAGE_KEY);
      setAvailableUsers([]);
      setUserState(null);
      setTechnicalHint(err instanceof Error ? err.message : "API nicht erreichbar");
      setState("unavailable");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadUsers]);

  function setUser(nextUser: User) {
    const validated = availableUsers.find((candidate) => candidate.userId === nextUser.userId);
    if (!validated) return;

    persistUser(validated);
    setUserState(validated);
  }

  if (state !== "ready" || !user) {
    return (
      <DatabaseUnavailableOverlay
        loading={state === "loading"}
        technicalHint={technicalHint}
        onRetry={() => void loadUsers()}
      />
    );
  }

  return (
    <UserContext.Provider value={{ ...user, availableUsers, setUser, reloadUsers: loadUsers }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("UserContext ist noch nicht initialisiert.");
  }

  return context;
}
