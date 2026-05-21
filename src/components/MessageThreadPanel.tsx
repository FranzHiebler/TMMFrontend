import { useEffect, useRef, useState } from "react";
import type { MessageDto } from "../types/game";
import { useToast } from "../context/ToastContext";

type Props = {
  title: string;
  initiallyOpen?: boolean;
  messages: MessageDto[];
  loading: boolean;
  onLoad: () => Promise<void>;
  onSend: (body: string) => Promise<void>;
};

const maxLength = 2000;

export default function MessageThreadPanel({
  title,
  initiallyOpen = false,
  messages,
  loading,
  onLoad,
  onSend,
}: Props) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [body, setBody] = useState("");
  const [inlineError, setInlineError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    void onLoad().catch((error: Error) => showToast("error", error.message));
  }, [isOpen, onLoad, showToast]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [isOpen, messages.length]);

  async function submit() {
    const trimmed = body.trim();
    setInlineError("");

    if (!trimmed) {
      setInlineError("Bitte eine Nachricht eingeben.");
      return;
    }

    if (trimmed.length > maxLength) {
      setInlineError(`Maximal ${maxLength} Zeichen.`);
      return;
    }

    setIsSending(true);
    try {
      await onSend(trimmed);
      setBody("");
      showToast("success", "Nachricht gesendet");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="thread-panel">
      <button type="button" className="thread-toggle" onClick={() => setIsOpen((prev) => !prev)}>
        <span>{title}</span>
        <span className="thread-toggle-meta">
          {messages.length ? `${messages.length} Nachrichten` : "Nachrichten"}
        </span>
      </button>

      {isOpen && (
        <div className="thread-body">
          <div ref={listRef} className="thread-list">
            {loading && <div className="thread-empty">Nachrichten werden geladen...</div>}
            {!loading && messages.length === 0 && (
              <div className="thread-empty">Noch keine Nachrichten.</div>
            )}

            {messages.map((message) => (
              <article
                key={message.id}
                className={`thread-message ${message.isMine ? "thread-message-mine" : ""}`}
              >
                <div className="thread-message-meta">
                  <b>{message.author.displayName}</b>
                  <span>
                    {new Date(message.createdAtUtc).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p>{message.body}</p>
              </article>
            ))}
          </div>

          <div className="thread-composer">
            <textarea
              value={body}
              maxLength={maxLength}
              rows={3}
              placeholder="Nachricht schreiben..."
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="thread-composer-footer">
              <span className={body.length > maxLength - 120 ? "field-hint warning" : "field-hint"}>
                {body.length}/{maxLength}
              </span>
              <button type="button" disabled={isSending} onClick={submit}>
                {isSending ? "Sendet..." : "Senden"}
              </button>
            </div>
            {inlineError && <div className="field-error">{inlineError}</div>}
          </div>
        </div>
      )}
    </section>
  );
}
