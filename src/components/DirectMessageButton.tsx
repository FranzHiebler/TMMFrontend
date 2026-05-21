import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendDirectMessage } from "../api/messagesApi";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";

type Props = {
  recipientUserId: string;
  recipientDisplayName: string;
  contextLabel?: string;
  compact?: boolean;
};

const maxLength = 2000;

export default function DirectMessageButton({
  recipientUserId,
  recipientDisplayName,
  contextLabel,
  compact = false,
}: Props) {
  const user = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (recipientUserId === user.userId) return null;

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
      const message = await sendDirectMessage({
        recipients: [{ userId: recipientUserId, displayName: recipientDisplayName }],
        body: trimmed,
      }, user);

      setBody("");
      setConversationId(message.conversationId ?? null);
      showToast("success", "Nachricht gesendet");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={compact ? "button-compact" : undefined}
        onClick={() => setIsOpen(true)}
      >
        Nachricht
      </button>

      {isOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setIsOpen(false)}>
          <div className="modal direct-message-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Nachricht an {recipientDisplayName}</h3>
                {contextLabel && <p className="page-subtitle">{contextLabel}</p>}
              </div>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Dialog schließen">
                ×
              </button>
            </div>

            <textarea
              value={body}
              rows={5}
              maxLength={maxLength}
              placeholder="Kurze Nachricht schreiben..."
              onChange={(e) => setBody(e.target.value)}
            />

            <div className="thread-composer-footer">
              <span className="field-hint">{body.length}/{maxLength}</span>
              <div className="modal-actions-inline">
                {conversationId && (
                  <button type="button" onClick={() => navigate(`/messages?conversationId=${conversationId}`)}>
                    Konversation öffnen
                  </button>
                )}
                <button type="button" disabled={isSending} onClick={submit}>
                  {isSending ? "Sendet..." : "Senden"}
                </button>
              </div>
            </div>

            {inlineError && <div className="field-error">{inlineError}</div>}
          </div>
        </div>
      )}
    </>
  );
}
