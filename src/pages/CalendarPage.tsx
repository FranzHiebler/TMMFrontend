import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCalendar } from "../api/gamesApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { CalendarItemResponse } from "../types/game";

const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const filters = [
  { key: "all", label: "Alle" },
  { key: "host", label: "Ich veranstalte" },
  { key: "participant", label: "Ich nehme teil" },
  { key: "invitation", label: "Einladungen" },
  { key: "application", label: "Bewerbungen" },
];

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calendarDays(month: Date) {
  const start = monthStart(month);
  const mondayOffset = (start.getDay() + 6) % 7;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(cursor);
    next.setDate(cursor.getDate() + index);
    return next;
  });
}

function matchesFilter(item: CalendarItemResponse, filter: string) {
  if (filter === "all") return true;
  const text = `${item.kind} ${item.status}`.toLowerCase();
  if (filter === "host") return text.includes("host");
  if (filter === "participant") return text.includes("participant") || text.includes("teil");
  if (filter === "invitation") return text.includes("invitation") || text.includes("einladung");
  if (filter === "application") return text.includes("application") || text.includes("bewerbung");
  return true;
}

export default function CalendarPage() {
  const user = useUser();
  const [items, setItems] = useState<CalendarItemResponse[]>([]);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getCalendar(user)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Kalender konnte nicht geladen werden."));
  }, [user]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items]
  );

  const timedItems = filteredItems.filter((item) => item.startTimeUtc);
  const openItems = filteredItems.filter((item) => !item.startTimeUtc);

  const itemsByDay = useMemo(() => {
    return timedItems.reduce<Record<string, CalendarItemResponse[]>>((acc, item) => {
      const key = dayKey(new Date(item.startTimeUtc!));
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    }, {});
  }, [timedItems]);

  const selectedItems = itemsByDay[selectedDay] ?? [];
  const monthLabel = month.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  function moveMonth(delta: number) {
    const next = new Date(month);
    next.setMonth(next.getMonth() + delta);
    setMonth(monthStart(next));
  }

  return (
    <main className="container calendar-page">
      <div className="page-header">
        <div>
          <h1>Kalender</h1>
          <p className="page-subtitle">Monatsübersicht am Desktop, Agenda auf kleinen Bildschirmen.</p>
        </div>
      </div>

      <Message text={error} type="error" />

      <div className="calendar-toolbar">
        <button type="button" onClick={() => moveMonth(-1)}>Vorheriger Monat</button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={() => moveMonth(1)}>Nächster Monat</button>
      </div>

      <div className="calendar-filters">
        {filters.map((item) => (
          <button key={item.key} type="button" className={filter === item.key ? "active" : ""} onClick={() => setFilter(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      <section className="calendar-grid card">
        {weekdays.map((day) => <b key={day}>{day}</b>)}
        {calendarDays(month).map((day) => {
          const key = dayKey(day);
          const dayItems = itemsByDay[key] ?? [];
          return (
            <button
              key={key}
              type="button"
              className={`calendar-day ${day.getMonth() === month.getMonth() ? "" : "muted"} ${selectedDay === key ? "selected" : ""}`}
              onClick={() => setSelectedDay(key)}
            >
              <span>{day.getDate()}</span>
              {dayItems.slice(0, 3).map((item) => (
                <small key={`${item.kind}-${item.id}`}>{item.title}</small>
              ))}
              {dayItems.length > 3 && <em>+{dayItems.length - 3}</em>}
            </button>
          );
        })}
      </section>

      <section className="card calendar-agenda">
        <h2>{new Date(selectedDay).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}</h2>
        {selectedItems.length === 0 && <p className="muted">Keine Einträge an diesem Tag.</p>}
        {selectedItems.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="list-row">
            <b>{item.title}</b>
            <span>
              {new Date(item.startTimeUtc!).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              {item.locationName ? ` · ${item.locationName}` : ""}
            </span>
            <small>{item.kind} · {item.status}</small>
            <Link to={`/sessions/${item.id}`}>Öffnen</Link>
          </div>
        ))}
      </section>

      {openItems.length > 0 && (
        <section className="card calendar-agenda">
          <h2>Ohne Termin</h2>
          {openItems.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="list-row">
              <b>{item.title}</b>
              <span>{item.timeLabel || "Termin offen"}</span>
              <Link to={`/sessions/${item.id}`}>Öffnen</Link>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
