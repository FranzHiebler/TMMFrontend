import { useCallback, useState } from "react";
import { getGameMessages, sendGameMessage } from "../api/messagesApi";
import { useUser } from "../context/UserContext";
import type { MessageDto } from "../types/game";
import MessageThreadPanel from "./MessageThreadPanel";

type Props = {
  gameId: string;
};

export default function GameSessionMessagesPanel({ gameId }: Props) {
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
    <MessageThreadPanel
      title="Session-Nachrichten"
      messages={messages}
      loading={loading}
      onLoad={load}
      onSend={send}
    />
  );
}
