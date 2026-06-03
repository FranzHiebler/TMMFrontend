import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createFeedback } from "../api/feedbackApi";
import { useUser } from "../context/UserContext";
import type { FeedbackType } from "../types/feedback";

const typeOptions: Array<{ value: FeedbackType; label: string }> = [
  { value: "Info", label: "Info" },
  { value: "Suggestion", label: "Vorschlag" },
  { value: "Bug", label: "Bug" },
];

function collectContext() {
  return {
    pageUrl: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    pageTitle: document.title,
    userAgent: navigator.userAgent,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    referrer: document.referrer || null,
  };
}

export default function FeedbackBar() {
  const user = useUser();
  const [type, setType] = useState<FeedbackType>("Info");
  const [reporterName, setReporterName] = useState("");
  const [message, setMessage] = useState("");
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!statusText) return;

    const timeout = window.setTimeout(() => setStatusText(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [statusText]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = message.trim();
    if (!trimmed) {
      setError("Bitte kurze Rückmeldung eingeben.");
      return;
    }

    try {
      setSending(true);
      setError("");
      await createFeedback(
        {
          type,
          reporterName: reporterName.trim().slice(0, 120) || null,
          message: trimmed.slice(0, 1000),
          context: collectContext(),
        },
        user
      );
      setReporterName("");
      setMessage("");
      setStatusText("Feedback gesendet. Danke!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback konnte nicht gesendet werden.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="feedback-bar" onSubmit={submit} aria-label="Tester-Feedback">
      <label className="feedback-type">
        <span>Feedback</span>
        <select value={type} onChange={(event) => setType(event.target.value as FeedbackType)}>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <input
        value={reporterName}
        maxLength={120}
        onChange={(event) => setReporterName(event.target.value)}
        placeholder="Name optional"
      />

      <input
        value={message}
        maxLength={1000}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Kurzer Hinweis, Bug oder Vorschlag"
      />

      <button type="submit" disabled={sending}>
        {sending ? "Sendet..." : "Senden"}
      </button>

      {(statusText || error) && (
        <p className={error ? "feedback-message feedback-message-error" : "feedback-message"}>
          {error || statusText}
        </p>
      )}
    </form>
  );
}
