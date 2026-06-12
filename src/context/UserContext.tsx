/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getAuthMe, logout as logoutApi, type AuthUserResponse } from "../api/authApi";
import DatabaseUnavailableOverlay from "../components/DatabaseUnavailableOverlay";
import LoginPage from "../pages/LoginPage";

export type User = {
  userId: string;
  displayName: string;
  email?: string | null;
  isSystemAdmin: boolean;
  isDevUser: boolean;
  isImpersonating: boolean;
};

type UserContextValue = User & {
  availableUsers: User[];
  setUser: (user: User) => void;
  reloadUsers: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

type BootstrapState = "loading" | "ready" | "login" | "unavailable";

function toUser(authUser: AuthUserResponse): User {
  return {
    userId: authUser.userId,
    displayName: authUser.displayName,
    email: authUser.email,
    isSystemAdmin: authUser.isSystemAdmin,
    isDevUser: authUser.isDevUser,
    isImpersonating: authUser.isImpersonating,
  };
}

export function UserProvider({ children }: Props) {
  const [state, setState] = useState<BootstrapState>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const [technicalHint, setTechnicalHint] = useState("");

  const loadSession = useCallback(async () => {
    try {
      setState("loading");
      setTechnicalHint("");

      const authUser = await getAuthMe();
      setUserState(toUser(authUser));
      setState("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "API nicht erreichbar";
      if (message.toLowerCase().includes("nicht angemeldet") || message.includes("401")) {
        setUserState(null);
        setState("login");
        return;
      }

      console.error("Initialisierung fehlgeschlagen", err);
      setUserState(null);
      setTechnicalHint(message);
      setState("unavailable");
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSession();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadSession]);

  async function handleLogout() {
    await logoutApi();
    setUserState(null);
    setState("login");
  }

  function handleSetUser(nextUser: User) {
    setUserState(nextUser);
  }

  if (state === "login") {
    return <LoginPage onLogin={() => void loadSession()} />;
  }

  if (state !== "ready" || !user) {
    return (
      <DatabaseUnavailableOverlay
        loading={state === "loading"}
        technicalHint={technicalHint}
        onRetry={() => void loadSession()}
      />
    );
  }

  return (
    <UserContext.Provider
      value={{
        ...user,
        availableUsers: [],
        setUser: handleSetUser,
        reloadUsers: loadSession,
        refreshAuth: loadSession,
        logout: handleLogout,
      }}
    >
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
