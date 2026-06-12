import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDevUsers, startImpersonation, type DevUserResponse } from "../api/adminApi";
import Message from "../components/Message";
import { useUser, type User } from "../context/UserContext";

function toUser(authUser: {
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
}): User {
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

export default function AdminTestUsersPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [devUsers, setDevUsers] = useState<DevUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getDevUsers()
      .then((items) => {
        if (!cancelled) setDevUsers(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Dev-User konnten nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function start(targetUser: DevUserResponse) {
    try {
      setStartingId(targetUser.userId);
      setError("");
      const authUser = await startImpersonation(targetUser.userId);
      user.setUser(toUser(authUser));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Testansicht konnte nicht gestartet werden.");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <main className="page admin-page">
      <header className="page-header page-header-stack">
        <h1>Testansichten</h1>
        <p className="page-subtitle">Nur Dev-User können ausgewählt werden. Echte Nutzer bleiben geschützt.</p>
      </header>

      {error && <Message text={error} type="error" />}
      {loading && <div className="card">Dev-User werden geladen...</div>}

      {!loading && devUsers.length === 0 && (
        <div className="card">Keine Dev-User gefunden.</div>
      )}

      <div className="admin-user-list">
        {devUsers.map((item) => (
          <article key={item.userId} className="admin-user-row">
            <div>
              <b>{item.displayName}</b>
              <span>{item.email || "Keine E-Mail"}</span>
              {item.defaultLocationId && <small>Standard-Spielort: {item.defaultLocationId}</small>}
            </div>
            <button
              type="button"
              onClick={() => void start(item)}
              disabled={startingId === item.userId}
            >
              {startingId === item.userId ? "Wechsle..." : `Als ${item.displayName} ansehen`}
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
