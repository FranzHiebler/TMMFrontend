import { useCallback, useState } from "react";
import { getTableMessages, sendTableMessage } from "../api/messagesApi";
import { useUser } from "../context/UserContext";
import type { MessageDto } from "../types/game";
import MessageThreadPanel from "./MessageThreadPanel";

type Props = {
  gameId: string;
  tableId: string;
};

export default function GameTableMessagesPanel({ gameId, tableId }: Props) {
  const user = useUser();
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMessages(await getTableMessages(gameId, tableId, user));
    } finally {
      setLoading(false);
    }
  }, [gameId, tableId, user]);

  const send = useCallback(async (body: string) => {
    const created = await sendTableMessage(gameId, tableId, { body }, user);
    setMessages((prev) => [...prev, created]);
  }, [gameId, tableId, user]);

  return (
    <MessageThreadPanel
      title="Tisch-Nachrichten"
      messages={messages}
      loading={loading}
      onLoad={load}
      onSend={send}
    />
  );
}
