import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "../api/friendsApi";
import { searchUsers } from "../api/usersApi";
import DirectMessageButton from "../components/DirectMessageButton";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import { Link } from "react-router-dom";
import type { FriendDto, FriendRequestDto, UserSearchResponse } from "../types/game";

export default function FriendsPage() {
  const user = useUser();
  const { showToast } = useToast();

  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [requests, setRequests] = useState<FriendRequestDto[]>([]);
  const [results, setResults] = useState<UserSearchResponse[]>([]);
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const friendIds = useMemo(
    () => new Set(friends.map((friend) => friend.userId)),
    [friends]
  );

  const requestUserIds = useMemo(
    () => new Set(requests.map((request) => request.requesterUserId)),
    [requests]
  );

  const visibleResults = results.filter(
    (result) =>
      result.userId !== user.userId &&
      !friendIds.has(result.userId) &&
      !requestUserIds.has(result.userId)
  );

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [nextFriends, nextRequests] = await Promise.all([
        getFriends(user),
        getFriendRequests(user),
      ]);

      setFriends(nextFriends);
      setRequests(nextRequests);
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Freunde konnten nicht geladen werden"
      );
    } finally {
      setLoading(false);
    }
  }, [showToast, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return;
    }

    let isCurrent = true;

    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        const users = await searchUsers(normalizedQuery);

        if (isCurrent) {
          setResults(users);
        }
      } catch (error) {
        if (isCurrent) {
          showToast(
            "error",
            error instanceof Error ? error.message : "User-Suche fehlgeschlagen"
          );
        }
      } finally {
        if (isCurrent) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [query, showToast]);

  async function requestFriend(result: UserSearchResponse) {
    setBusyKey(`request-${result.userId}`);

    try {
      await sendFriendRequest(
        {
          receiverUserId: result.userId,
          receiverDisplayName: result.displayName,
        },
        user
      );

      showToast("success", "Freundschaftsanfrage gesendet");
      setQuery("");
      setResults([]);
      await load();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Anfrage konnte nicht gesendet werden"
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function accept(id: string) {
    setBusyKey(`accept-${id}`);

    try {
      await acceptFriendRequest(id, user);
      showToast("success", "Freundschaft angenommen");
      await load();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Anfrage konnte nicht angenommen werden"
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function reject(id: string) {
    setBusyKey(`reject-${id}`);

    try {
      await rejectFriendRequest(id, user);
      showToast("success", "Anfrage abgelehnt");
      await load();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Anfrage konnte nicht abgelehnt werden"
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(id: string) {
    const confirmed = window.confirm("Freund wirklich entfernen?");
    if (!confirmed) return;

    setBusyKey(`remove-${id}`);

    try {
      await removeFriend(id, user);
      showToast("success", "Freund entfernt");
      await load();
    } catch (error) {
      showToast(
        "error",
        error instanceof Error ? error.message : "Freund konnte nicht entfernt werden"
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="page friends-page">
      <div className="page-header">
        <div>
          <h1>Freunde</h1>
          <p className="page-subtitle">
            Finde Spieler wieder, verwalte Anfragen und schreibe direkt Nachrichten.
          </p>
        </div>

        <button type="button" onClick={load} disabled={loading}>
          {loading ? "Lädt..." : "Aktualisieren"}
        </button>
      </div>

      <section className="card friend-search-card">
        <div className="friend-section-header">
          <div>
            <h3>Freund hinzufügen</h3>
            <p className="field-hint">Suche nach Anzeigename. Mindestens zwei Zeichen.</p>
          </div>
        </div>

        <input
          value={query}
          placeholder="User suchen..."
          onChange={(event) => setQuery(event.target.value)}
        />

        {query.trim().length > 0 && query.trim().length < 2 && (
          <div className="thread-empty">Gib mindestens zwei Zeichen ein.</div>
        )}

        {searchLoading && <div className="thread-empty">Suche läuft...</div>}

        {!searchLoading && query.trim().length >= 2 && visibleResults.length === 0 && (
          <div className="thread-empty">Keine passenden User gefunden.</div>
        )}

        {visibleResults.length > 0 && (
          <div className="friend-result-list">
            {visibleResults.map((result) => (
              <div key={result.userId} className="friend-row">
                <div className="friend-main">
                  <Link className="profile-link" to={`/users/${result.userId}`}>
                    {result.displayName}
                  </Link>
                  <small>{result.userId}</small>
                </div>

                <button
                  type="button"
                  disabled={busyKey === `request-${result.userId}`}
                  onClick={() => requestFriend(result)}
                >
                  {busyKey === `request-${result.userId}` ? "Sendet..." : "Hinzufügen"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="friends-layout">
        <section className="card friend-card">
          <div className="friend-section-header">
            <div>
              <h3>Meine Freunde</h3>
              <p className="field-hint">{friends.length} Freund(e)</p>
            </div>
          </div>

          {loading && <div className="thread-empty">Freunde werden geladen...</div>}
          {!loading && friends.length === 0 && (
            <div className="thread-empty">Noch keine Freunde.</div>
          )}

          <div className="friend-list">
            {friends.map((friend) => (
              <div key={friend.id} className="friend-row">
                <div className="friend-main">
                  <Link className="profile-link" to={`/users/${friend.userId}`}>
                    {friend.displayName}
                  </Link>
                  <small>
                    Verbunden seit {new Date(friend.updatedAtUtc).toLocaleDateString("de-DE")}
                  </small>
                </div>

                <div className="friend-actions">
                  <DirectMessageButton
                    recipientUserId={friend.userId}
                    recipientDisplayName={friend.displayName}
                    contextLabel="aus deiner Freundesliste"
                    compact
                  />

                  <button
                    type="button"
                    disabled={busyKey === `remove-${friend.id}`}
                    onClick={() => remove(friend.id)}
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card friend-card">
          <div className="friend-section-header">
            <div>
              <h3>Anfragen</h3>
              <p className="field-hint">{requests.length} offen</p>
            </div>
          </div>

          {requests.length === 0 && <div className="thread-empty">Keine offenen Anfragen.</div>}

          <div className="friend-list">
            {requests.map((request) => (
              <div key={request.id} className="friend-row">
                <div className="friend-main">
                  <b>{request.requesterDisplayName}</b>
                  <small>{new Date(request.createdAtUtc).toLocaleString("de-DE")}</small>
                </div>

                <div className="friend-actions">
                  <button
                    type="button"
                    disabled={busyKey === `accept-${request.id}`}
                    onClick={() => accept(request.id)}
                  >
                    Annehmen
                  </button>

                  <button
                    type="button"
                    disabled={busyKey === `reject-${request.id}`}
                    onClick={() => reject(request.id)}
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}