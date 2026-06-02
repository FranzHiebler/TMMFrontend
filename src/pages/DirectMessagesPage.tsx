import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getFriends } from "../api/friendsApi";
import { getAllGames } from "../api/gamesApi";
import {
  getConversation,
  getConversations,
  markConversationRead,
  sendDirectMessage,
} from "../api/messagesApi";
import { searchUsers } from "../api/usersApi";
import MessageThreadPanel from "../components/MessageThreadPanel";
import NotificationBell from "../components/NotificationBell";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import type { ConversationDto, FriendDto, GameResponse, MessageDto, UserSearchResponse } from "../types/game";

export default function DirectMessagesPage() {
  const user = useUser();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientSearchResults, setRecipientSearchResults] = useState<UserSearchResponse[]>([]);
  const [games, setGames] = useState<GameResponse[]>([]);
  const [friends, setFriends] = useState<FriendDto[]>([]);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalSystem, setProposalSystem] = useState("");
  const [proposalTime, setProposalTime] = useState("");
  const [proposalLocation, setProposalLocation] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const threadTitle = selectedConversation
    ? selectedConversation.participants
        .filter((participant) => participant.userId !== user.userId)
        .map((participant) => participant.displayName)
        .join(", ") || "Direktnachricht"
    : "Neue Direktnachricht";

  const chatPartner =
    selectedConversation?.participants.find((participant) => participant.userId !== user.userId) ?? null;

  const chatPartnerFriend = useMemo(() => {
    if (!chatPartner) return null;
    return friends.find((friend) => friend.userId === chatPartner.userId) ?? null;
  }, [chatPartner, friends]);

  const sharedFutureGames = useMemo(() => {
    if (!chatPartner) return [];
    return games
      .filter((game) => new Date(game.startTimeUtc).getTime() >= now)
      .filter((game) =>
        game.tables.some((table) =>
          table.assignedPlayers.some((player) => player.userId === user.userId) &&
          table.assignedPlayers.some((player) => player.userId === chatPartner.userId)
        )
      )
      .slice(0, 3);
  }, [chatPartner, games, now, user.userId]);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const next = await getConversations(user);
      setConversations(next);
      setSelectedId((current) => current ?? next[0]?.id ?? null);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Chats konnten nicht geladen werden");
    } finally {
      setLoadingList(false);
    }
  }, [showToast, user]);

  const loadThread = useCallback(async () => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    setLoadingThread(true);
    try {
      const detail = await getConversation(selectedId, user);
      setMessages(detail.messages);
      await markConversationRead(selectedId, user);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === selectedId ? { ...conversation, unreadCount: 0 } : conversation
        )
      );
    } finally {
      setLoadingThread(false);
    }
  }, [selectedId, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNow(Date.now());
      void Promise.all([
        getAllGames().catch(() => []),
        getFriends(user).catch(() => []),
      ]).then(([nextGames, nextFriends]) => {
        setGames(nextGames);
        setFriends(nextFriends);
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [user]);

  useEffect(() => {
    const conversationId = searchParams.get("conversationId");
    if (conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(conversationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedId || recipientSearch.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecipientSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      void searchUsers(recipientSearch, user)
        .then((results) => {
          setRecipientSearchResults(results.filter((result) => result.userId !== user.userId).slice(0, 6));
        })
        .catch(() => setRecipientSearchResults([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [recipientSearch, selectedId, user]);

  async function send(body: string) {
    const proposalText = proposalOpen && (proposalSystem || proposalTime || proposalLocation)
      ? [
          "",
          "Spielvorschlag:",
          proposalSystem ? `System: ${proposalSystem}` : null,
          proposalTime ? `Zeit: ${proposalTime}` : null,
          proposalLocation ? `Spielort: ${proposalLocation}` : null,
        ].filter(Boolean).join("\n")
      : "";

    const request = selectedId
      ? { conversationId: selectedId, recipients: [], body: `${body}${proposalText}` }
      : {
          recipients: [{
            userId: recipientId.trim(),
            displayName: recipientName.trim() || recipientId.trim(),
          }],
          body: `${body}${proposalText}`,
        };

    const created = await sendDirectMessage(request, user);
    setMessages((prev) => [...prev, created]);

    if (!selectedId && created.conversationId) {
      setSelectedId(created.conversationId);
      setRecipientId("");
      setRecipientName("");
      await loadConversations();
    }

    setProposalOpen(false);
    setProposalSystem("");
    setProposalTime("");
    setProposalLocation("");
  }

  return (
    <main className="page messages-page">
      <div className="page-header">
        <div>
          <h1>Nachrichten</h1>
          <p className="page-subtitle">Direkte Absprachen und Spielrunden-Kommunikation an einem Ort.</p>
        </div>
        <NotificationBell />
      </div>

      <div className="messages-layout">
        <aside className="conversation-list-panel">
          <div className="conversation-list-header">
            <b>Chats</b>
            <button type="button" onClick={() => {
              setSelectedId(null);
              setMessages([]);
            }}>
              Neu
            </button>
          </div>

          {loadingList && <div className="thread-empty">Lade Chats...</div>}
          {!loadingList && conversations.length === 0 && (
            <div className="thread-empty">Noch keine Direktnachrichten.</div>
          )}

          {conversations.map((conversation) => {
            const title = conversation.participants
              .filter((participant) => participant.userId !== user.userId)
              .map((participant) => participant.displayName)
              .join(", ") || "Chat";

            return (
              <button
                key={conversation.id}
                type="button"
                className={`conversation-list-item ${selectedId === conversation.id ? "active" : ""}`}
                onClick={() => setSelectedId(conversation.id)}
              >
                <span>{title}</span>
                {conversation.lastMessagePreview && <small>{conversation.lastMessagePreview}</small>}
                {conversation.unreadCount > 0 && <b>{conversation.unreadCount}</b>}
              </button>
            );
          })}
        </aside>

        <section className="conversation-detail-panel">
          {!selectedId && (
            <div className="new-conversation-fields">
              <label className="recipient-search-field">
                Spieler suchen
                <input
                  value={recipientSearch}
                  placeholder="Name eingeben"
                  onChange={(e) => setRecipientSearch(e.target.value)}
                />
              </label>

              {recipientSearchResults.length > 0 && (
                <div className="friend-recipient-list">
                  <span>Suchergebnisse</span>
                  {recipientSearchResults.map((result) => (
                    <button
                      key={result.userId}
                      type="button"
                      className={recipientId === result.userId ? "active" : ""}
                      onClick={() => {
                        setRecipientId(result.userId);
                        setRecipientName(result.displayName);
                      }}
                    >
                      {result.displayName}
                    </button>
                  ))}
                </div>
              )}

              {friends.length > 0 && (
                <div className="friend-recipient-list">
                  <span>Freund auswählen</span>
                  {friends.map((friend) => (
                    <button
                      key={friend.userId}
                      type="button"
                      className={recipientId === friend.userId ? "active" : ""}
                      onClick={() => {
                        setRecipientId(friend.userId);
                        setRecipientName(friend.displayName);
                      }}
                    >
                      {friend.displayName}
                    </button>
                  ))}
                </div>
              )}

              <details className="testmode-recipient-fields">
                <summary>Testmodus: per User-ID starten</summary>
                <label>
                  User-ID
                  <input
                    value={recipientId}
                    placeholder="User-ID"
                    onChange={(e) => setRecipientId(e.target.value)}
                  />
                </label>
              </details>
              <label>
                Anzeigename
                <input
                  value={recipientName}
                  placeholder="Name"
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </label>
            </div>
          )}

          {chatPartner && (
            <section className="chat-context-card">
              <div>
                <b>{chatPartner.displayName}</b>
                <span className={`friend-status-pill ${chatPartnerFriend ? "is-friend" : ""}`}>
                  {chatPartnerFriend ? "Freund" : "Noch nicht befreundet"}
                </span>
              </div>
              <Link to={`/users/${chatPartner.userId}`}>Profil öffnen</Link>
            </section>
          )}

          <MessageThreadPanel
            title={threadTitle}
            initiallyOpen
            messages={messages}
            loading={loadingThread}
            onLoad={loadThread}
            onSend={send}
          />

          {chatPartner && (
            <section className="shared-games-strip">
              <b>Gemeinsame kommende Spiele mit {chatPartner.displayName}</b>
              {sharedFutureGames.length === 0 && <span>Keine kommenden gemeinsamen Spiele.</span>}
              {sharedFutureGames.map((game) => (
                <Link key={game.id} to={`/sessions/${game.id}`}>
                  {game.title} · {game.timeLabel || new Date(game.startTimeUtc).toLocaleDateString("de-DE")} · {game.location.name}
                </Link>
              ))}
            </section>
          )}

          <section className="message-proposal-box">
            <button type="button" onClick={() => setProposalOpen((open) => !open)}>
              {proposalOpen ? "Spielvorschlag ausblenden" : "+ Spielvorschlag anhängen"}
            </button>
            {proposalOpen && (
              <div className="form-row-2">
                <input value={proposalSystem} onChange={(e) => setProposalSystem(e.target.value)} placeholder="System" />
                <input value={proposalTime} onChange={(e) => setProposalTime(e.target.value)} placeholder="Datum / grobe Zeit" />
                <input value={proposalLocation} onChange={(e) => setProposalLocation(e.target.value)} placeholder="Spielort" />
                <small className="field-hint">MVP: Der Vorschlag wird strukturiert an die Nachricht angehängt. Annehmen/Ablehnen folgt später als echte Aktion.</small>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
