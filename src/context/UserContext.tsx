/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError } from "../api/apiError";
import { getAuthMe, logout as logoutApi, type AuthUserResponse } from "../api/authApi";
import DatabaseUnavailableOverlay, { type UnavailableKind } from "../components/DatabaseUnavailableOverlay";
import DebugPanel from "../components/DebugPanel";
import { recordProfileLoadError } from "../debug/debugInfo";
import LoginPage from "../pages/LoginPage";

export type User = {
  userId: string;
  displayName: string;
  email?: string | null;
  isSystemAdmin: boolean;
  realUserIsSystemAdmin: boolean;
  isDevUser: boolean;
  isImpersonating: boolean;
  realUserId?: string | null;
  realDisplayName?: string | null;
  effectiveUserId?: string | null;
  effectiveDisplayName?: string | null;
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
    realUserIsSystemAdmin: authUser.realUserIsSystemAdmin,
    isDevUser: authUser.isDevUser,
    isImpersonating: authUser.isImpersonating,
    realUserId: authUser.realUserId,
    realDisplayName: authUser.realDisplayName,
    effectiveUserId: authUser.effectiveUserId,
    effectiveDisplayName: authUser.effectiveDisplayName,
  };
}

export function UserProvider({ children }: Props) {
  const [state, setState] = useState<BootstrapState>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const [technicalHint, setTechnicalHint] = useState("");
  const [unavailableKind, setUnavailableKind] = useState<UnavailableKind>("unknown");

  const loadSession = useCallback(async () => {
    try {
      setState("loading");
      setTechnicalHint("");

      const authUser = await getAuthMe();
      setUserState(toUser(authUser));
      setState("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : "API nicht erreichbar";
      if (err instanceof ApiError && err.status === 401) {
        setUserState(null);
        setState("login");
        return;
      }

      console.error("Initialisierung fehlgeschlagen", err);
      setUserState(null);
      setUnavailableKind(classifyBootstrapError(err));
      setTechnicalHint(message);
      recordProfileLoadError(message);
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
    return (
      <>
        <LoginPage onLogin={() => void loadSession()} />
        <DebugPanel authStatus="nicht angemeldet" />
      </>
    );
  }

  if (state !== "ready" || !user) {
    return (
      <>
        <DatabaseUnavailableOverlay
          loading={state === "loading"}
          kind={unavailableKind}
          technicalHint={technicalHint}
          onRetry={() => void loadSession()}
        />
        <DebugPanel authStatus={state === "loading" ? "lädt" : "nicht verfügbar"} />
      </>
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
      <DebugPanel authStatus="angemeldet" userEmail={user.email} displayName={user.displayName} />
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

function classifyBootstrapError(err: unknown): UnavailableKind {
  if (err instanceof ApiError) {
    if (err.status === 401) return "auth";
    if (err.status === 403) return "permission";
    if (err.status >= 500) {
      const text = `${err.message} ${err.responseText}`.toLowerCase();
      return text.includes("mongo") || text.includes("database") || text.includes("datenbank")
        ? "database"
        : "server";
    }

    return "profile";
  }

  return "api";
}
