import { useCallback, useState } from "react";
import { getGameMessages, sendGameMessage } from "../api/messagesApi";
import { useUser } from "../context/UserContext";
import type { MessageDto } from "../types/game";
import MessageThreadPanel from "./MessageThreadPanel";

type Props = {
  gameId: string;
  canWrite?: boolean;
};

export default function GameSessionMessagesPanel({ gameId, canWrite = true }: Props) {
  const user = useUser();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await getGameMessages(gameId, user));
    } finally {
      setLoading(false);
    }
  }, [gameId, user]);

  const send = useCallback(async (body: string) => {
    const created = await sendGameMessage(gameId, { body }, user);
    setMessages((prev) => [...prev, created]);
  }, [gameId, user]);

  return (
    <div className="session-comments-panel">
      <MessageThreadPanel
        title="Kommentare zum Spieltermin"
        description="Hier klärt ihr Absprachen zum Spieltermin. Neue Kommentare erscheinen nach dem Absenden oder Nachladen."
        initiallyOpen
        messages={messages}
        loading={loading}
        onLoad={load}
        onSend={send}
        canWrite={canWrite}
        emptyText="Noch keine Kommentare. Schreib die erste Nachricht zum Spieltermin."
        readOnlyText="Du kannst die Kommentare lesen. Schreiben ist für Host, Teilnehmer und eingeladene Spieler möglich."
        loadingText="Kommentare werden geladen..."
        placeholder="Kommentar schreiben..."
        submitLabel="Kommentar senden"
        sendingLabel="Sendet..."
        successText="Kommentar gesendet"
        itemLabelSingular="Kommentar"
        itemLabelPlural="Kommentare"
      />
    </div>
  );
}
