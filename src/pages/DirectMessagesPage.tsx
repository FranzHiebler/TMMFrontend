import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getConversation,
  getConversations,
  markConversationRead,
  sendDirectMessage,
} from "../api/messagesApi";
import MessageThreadPanel from "../components/MessageThreadPanel";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import type { ConversationDto, MessageDto } from "../types/game";

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

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const next = await getConversations(user);
      setConversations(next);
      setSelectedId((current) => current ?? next[0]?.id ?? null);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Conversations konnten nicht geladen werden");
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
    const conversationId = searchParams.get("conversationId");
    if (conversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(conversationId);
    }
  }, [searchParams]);

  async function send(body: string) {
    const request = selectedId
      ? { conversationId: selectedId, recipients: [], body }
      : {
          recipients: [{
            userId: recipientId.trim(),
            displayName: recipientName.trim() || recipientId.trim(),
          }],
          body,
        };

    const created = await sendDirectMessage(request, user);
    setMessages((prev) => [...prev, created]);

    if (!selectedId && created.conversationId) {
      setSelectedId(created.conversationId);
      setRecipientId("");
      setRecipientName("");
      await loadConversations();
    }
  }

  return (
    <main className="page messages-page">
      <div className="page-header">
        <div>
          <h1>Nachrichten</h1>
          <p className="page-subtitle">Direkte Absprachen und Spielrunden-Kommunikation an einem Ort.</p>
        </div>
      </div>

      <div className="messages-layout">
        <aside className="conversation-list-panel">
          <div className="conversation-list-header">
            <b>Conversations</b>
            <button type="button" onClick={() => {
              setSelectedId(null);
              setMessages([]);
            }}>
              Neu
            </button>
          </div>

          {loadingList && <div className="thread-empty">Lade Conversations...</div>}
          {!loadingList && conversations.length === 0 && (
            <div className="thread-empty">Noch keine Direktnachrichten.</div>
          )}

          {conversations.map((conversation) => {
            const title = conversation.participants
              .filter((participant) => participant.userId !== user.userId)
              .map((participant) => participant.displayName)
              .join(", ") || "Conversation";

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
              <label>
                User-ID
                <input
                  value={recipientId}
                  placeholder="ObjectId des Empfängers"
                  onChange={(e) => setRecipientId(e.target.value)}
                />
              </label>
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

          <MessageThreadPanel
            title={threadTitle}
            initiallyOpen
            messages={messages}
            loading={loadingThread}
            onLoad={loadThread}
            onSend={send}
          />
        </section>
      </div>
    </main>
  );
}
