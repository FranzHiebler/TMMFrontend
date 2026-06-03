import { useEffect, useMemo, useState } from "react";
import { getAdminFeedback, updateAdminFeedback } from "../api/feedbackApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { FeedbackResponse, FeedbackStatus, FeedbackType } from "../types/feedback";

const statusOptions: FeedbackStatus[] = ["Open", "InProgress", "Done", "Ignored"];
const typeOptions: Array<FeedbackType | ""> = ["", "Info", "Suggestion", "Bug"];

const typeLabels: Record<FeedbackType, string> = {
  Info: "Info",
  Suggestion: "Vorschlag",
  Bug: "Bug",
};

const statusLabels: Record<FeedbackStatus, string> = {
  Open: "Offen",
  InProgress: "In Arbeit",
  Done: "Erledigt",
  Ignored: "Ignoriert",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("de-DE");
}

function viewportLabel(item: FeedbackResponse) {
  if (!item.viewportWidth || !item.viewportHeight) return "Unbekannt";
  return `${item.viewportWidth} x ${item.viewportHeight}`;
}

export default function AdminFeedbackPage({ isAdmin }: { isAdmin: boolean }) {
  const user = useUser();
  const [items, setItems] = useState<FeedbackResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    }),
    [statusFilter, typeFilter]
  );

  useEffect(() => {
    if (!isAdmin) return;

    let cancelled = false;

    getAdminFeedback(user, filters)
      .then((next) => {
        if (!cancelled) setItems(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Feedback konnte nicht geladen werden.");
      });

    return () => {
      cancelled = true;
    };
  }, [filters, isAdmin, user]);

  async function updateItem(id: string, patch: { status?: FeedbackStatus; adminNote?: string | null }) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    try {
      setSavingId(id);
      setError("");
      setMessage("");
      const updated = await updateAdminFeedback(
        id,
        {
          status: patch.status ?? item.status,
          adminNote: patch.adminNote ?? item.adminNote ?? null,
        },
        user
      );
      setItems((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
      setMessage("Feedback aktualisiert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback konnte nicht aktualisiert werden.");
    } finally {
      setSavingId(null);
    }
  }

  if (!isAdmin) {
    return (
      <main className="container">
        <Message text="Du darfst diese Admin-Seite nicht öffnen." type="error" />
      </main>
    );
  }

  return (
    <main className="container admin-feedback-page">
      <div className="page-header">
        <div>
          <h1>Tester-Feedback</h1>
          <p className="page-subtitle">Interne Rückmeldungen aus der App auswerten und bearbeiten.</p>
        </div>
      </div>

      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <section className="card admin-feedback-filters">
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FeedbackStatus | "")}>
            <option value="">Alle</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Typ
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as FeedbackType | "")}>
            {typeOptions.map((type) => (
              <option key={type || "all"} value={type}>
                {type ? typeLabels[type] : "Alle"}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="admin-feedback-list">
        {items.length === 0 && <div className="card">Noch kein Feedback für diese Filter.</div>}

        {items.map((item) => (
          <article key={item.id} className="card admin-feedback-card">
            <div className="admin-feedback-card-header">
              <div>
                <span className={`feedback-pill feedback-pill-${item.type.toLowerCase()}`}>
                  {typeLabels[item.type]}
                </span>
                <span className="feedback-pill">{statusLabels[item.status]}</span>
              </div>
              <time>{formatDate(item.createdAtUtc)}</time>
            </div>

            <p className="admin-feedback-message">{item.message}</p>

            <dl className="admin-feedback-meta">
              <div>
                <dt>Nutzer</dt>
                <dd>{item.displayName} ({item.userId})</dd>
              </div>
              <div>
                <dt>Route</dt>
                <dd>{item.pathname || "-"}</dd>
              </div>
              <div>
                <dt>URL</dt>
                <dd>{item.pageUrl ? <a href={item.pageUrl}>{item.pageUrl}</a> : "-"}</dd>
              </div>
              <div>
                <dt>Titel</dt>
                <dd>{item.pageTitle || "-"}</dd>
              </div>
              <div>
                <dt>Viewport</dt>
                <dd>{viewportLabel(item)}</dd>
              </div>
              <div>
                <dt>Browser</dt>
                <dd>{item.userAgent || "-"}</dd>
              </div>
            </dl>

            <div className="admin-feedback-actions">
              <label>
                Status
                <select
                  value={item.status}
                  disabled={savingId === item.id}
                  onChange={(event) => updateItem(item.id, { status: event.target.value as FeedbackStatus })}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Admin-Notiz
                <textarea
                  value={item.adminNote ?? ""}
                  maxLength={2000}
                  disabled={savingId === item.id}
                  onChange={(event) =>
                    setItems((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, adminNote: event.target.value } : entry
                      )
                    )
                  }
                  onBlur={(event) => updateItem(item.id, { adminNote: event.target.value })}
                />
              </label>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
