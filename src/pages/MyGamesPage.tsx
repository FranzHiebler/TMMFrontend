import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCalendar } from "../api/gamesApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { CalendarItemResponse } from "../types/game";

type ViewMode = "list" | "calendar";
type MyGamesFilter = "all" | "host" | "participant" | "application" | "invitation" | "waitlist" | "past";

const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const filters: Array<{ key: MyGamesFilter; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "host", label: "Ich hoste" },
  { key: "participant", label: "Ich spiele mit" },
  { key: "application", label: "Bewerbungen" },
  { key: "invitation", label: "Einladungen" },
  { key: "waitlist", label: "Warteliste" },
  { key: "past", label: "Vergangen" },
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

function itemDate(item: CalendarItemResponse) {
  return item.startTimeUtc ? new Date(item.startTimeUtc).getTime() : Number.POSITIVE_INFINITY;
}

function isPast(item: CalendarItemResponse, now: number) {
  if (item.status === "Closed" || item.status === "Cancelled") return true;
  return item.startTimeUtc ? new Date(item.startTimeUtc).getTime() < now : false;
}

function roleLabel(kind: string) {
  switch (kind) {
    case "Host":
      return "Host";
    case "Teilnahme":
      return "Teilnehmer";
    case "Bewerbung":
      return "Bewerbung";
    case "Einladung":
      return "Einladung";
    case "Warteliste":
      return "Warteliste";
    default:
      return kind || "Spieltermin";
  }
}

function statusLabel(status?: string | null) {
  switch (status) {
    case "Cancelled":
      return "Abgesagt";
    case "Closed":
      return "Geschlossen";
    case "Full":
      return "Voll";
    case "Open":
      return "Offen";
    default:
      return status || "Offen";
  }
}

function timeLabel(item: CalendarItemResponse) {
  if (!item.startTimeUtc) return item.timeLabel || "Termin offen";
  if (item.timingMode === "Open") return "Termin offen";
  if (item.timeLabel) return item.timeLabel;
  return new Date(item.startTimeUtc).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function matchesFilter(item: CalendarItemResponse, filter: MyGamesFilter, now: number) {
  if (filter === "past") return isPast(item, now);
  if (isPast(item, now)) return false;
  if (filter === "all") return true;
  if (filter === "host") return item.kind === "Host";
  if (filter === "participant") return item.kind === "Teilnahme";
  if (filter === "application") return item.kind === "Bewerbung";
  if (filter === "invitation") return item.kind === "Einladung";
  if (filter === "waitlist") return item.kind === "Warteliste";
  return true;
}

function MyGameItem({ item }: { item: CalendarItemResponse }) {
  return (
    <article className="my-overview-card">
      <div className="my-overview-main">
        <span className={`role-pill role-${item.kind.toLowerCase()}`}>{roleLabel(item.kind)}</span>
        <h2>{item.title}</h2>
        <div className="my-overview-meta">
          <span>{timeLabel(item)}</span>
          <span>{item.locationName || "Spielort offen"}</span>
          {item.locationCity && <span>{item.locationCity}</span>}
          <span>{statusLabel(item.status)}</span>
        </div>
      </div>
      <Link to={`/sessions/${item.id}`}>Öffnen</Link>
    </article>
  );
}

export default function MyGamesPage() {
  const user = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<CalendarItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<MyGamesFilter>("all");
  const [view, setView] = useState<ViewMode>(() => searchParams.get("view") === "calendar" ? "calendar" : "list");
  const [month, setMonth] = useState(() => monthStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const next = await getCalendar(user);
        if (!cancelled) setItems(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Meine Spiele konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (searchParams.get("view") === view) return;
    const next = new URLSearchParams(searchParams);
    next.set("view", view);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, view]);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter, now)),
    [filter, items, now]
  );

  const sortedItems = useMemo(
    () => [...filteredItems].sort((a, b) => itemDate(a) - itemDate(b)),
    [filteredItems]
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
    <main className="container my-games-page">
      <div className="page-header">
        <div>
          <h1>Meine Spiele</h1>
          <p className="page-subtitle">
            Deine Spieltermine, Einladungen, Bewerbungen und Warteliste an einem Ort.
          </p>
        </div>
      </div>

      <Message text={loading ? "Lade Meine Spiele..." : ""} type="info" />
      <Message text={error} type="error" />

      <div className="my-games-view-tabs">
        <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>
          Liste
        </button>
        <button type="button" className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>
          Kalender
        </button>
      </div>

      <div className="calendar-filters my-games-filters">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            className={filter === item.key ? "active" : ""}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!loading && !error && sortedItems.length === 0 && (
        <section className="card my-games-empty">
          <h2>Du hast noch keine Spieltermine.</h2>
          <p>Starte mit einem eigenen Spieltermin oder erstelle ein Spielgesuch.</p>
          <div className="button-row">
            <Link to="/games/create">Spieltermin anbieten</Link>
            <Link to="/play-requests">Spiel suchen</Link>
          </div>
        </section>
      )}

      {!loading && !error && sortedItems.length > 0 && view === "list" && (
        <section className="my-overview-list">
          {sortedItems.map((item) => <MyGameItem key={`${item.kind}-${item.id}`} item={item} />)}
        </section>
      )}

      {!loading && !error && sortedItems.length > 0 && view === "calendar" && (
        <>
          <div className="calendar-toolbar">
            <button type="button" onClick={() => moveMonth(-1)}>Vorheriger Monat</button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => moveMonth(1)}>Nächster Monat</button>
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
            {selectedItems.map((item) => <MyGameItem key={`${item.kind}-${item.id}`} item={item} />)}
          </section>

          {openItems.length > 0 && (
            <section className="card calendar-agenda">
              <h2>Ohne Termin</h2>
              {openItems.map((item) => <MyGameItem key={`${item.kind}-${item.id}`} item={item} />)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
