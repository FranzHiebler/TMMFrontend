import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCalendar } from "../api/gamesApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { CalendarItemResponse } from "../types/game";

export default function CalendarPage() {
  const user = useUser();
  const [items, setItems] = useState<CalendarItemResponse[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getCalendar(user)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Kalender konnte nicht geladen werden."));
  }, [user]);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, CalendarItemResponse[]>>((acc, item) => {
      const key = item.startTimeUtc
        ? new Date(item.startTimeUtc).toLocaleDateString("de-DE", { month: "long", year: "numeric" })
        : "Ohne festen Termin";
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [items]);

  return (
    <main className="container">
      <h1>Kalender</h1>
      <Message text={error} type="error" />
      {Object.entries(grouped).map(([month, monthItems]) => (
        <section key={month} className="card">
          <h2>{month}</h2>
          {monthItems.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="list-row">
              <b>{item.title}</b>
              <span>
                {item.startTimeUtc ? new Date(item.startTimeUtc).toLocaleString("de-DE") : item.timeLabel || "Termin offen"}
                {item.locationName ? ` · ${item.locationName}` : ""}
              </span>
              <small>{item.kind} · {item.status}</small>
              <Link to={`/sessions/${item.id}`}>Öffnen</Link>
            </div>
          ))}
        </section>
      ))}
      {items.length === 0 && !error && <p className="muted">Keine Kalendereinträge.</p>}
    </main>
  );
}
