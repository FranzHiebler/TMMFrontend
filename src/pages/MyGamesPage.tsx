import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getCalendar } from "../api/gamesApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { CalendarItemResponse } from "../types/game";

type ViewMode = "list" | "calendar";
type MyGamesFilter = "all" | "host" | "participant" | "application" | "invitation" | "waitlist" | "past";

const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const filters: Array<{ key: MyGamesFilter; label: string; emptyTitle: string; emptyText: string }> = [
  {
    key: "all",
    label: "Aktuell",
    emptyTitle: "Du hast noch keine Spieltermine.",
    emptyText: "Entdecke Spieltermine auf der Karte oder biete selbst einen Termin an.",
  },
  {
    key: "host",
    label: "Von mir erstellt",
    emptyTitle: "Du veranstaltest aktuell keinen Spieltermin.",
    emptyText: "Biete einen Spieltermin an, wenn du Platz hast oder Mitspieler suchst.",
  },
  {
    key: "participant",
    label: "Ich nehme teil",
    emptyTitle: "Du nimmst aktuell an keinem Spieltermin teil.",
    emptyText: "Schau auf der Karte nach passenden Terminen in deiner Nähe.",
  },
  {
    key: "application",
    label: "Meine Bewerbungen",
    emptyTitle: "Keine offenen Bewerbungen.",
    emptyText: "Sobald du dich auf einen Spieltermin bewirbst, siehst du ihn hier.",
  },
  {
    key: "invitation",
    label: "Einladungen",
    emptyTitle: "Keine offenen Einladungen.",
    emptyText: "Einladungen von Freunden oder Hosts erscheinen hier.",
  },
  {
    key: "waitlist",
    label: "Warteliste",
    emptyTitle: "Du stehst auf keiner Warteliste.",
    emptyText: "Wenn ein Spieltermin voll ist, kannst du dich später hier wiederfinden.",
  },
  {
    key: "past",
    label: "Archiv",
    emptyTitle: "Noch keine vergangenen Spieltermine.",
    emptyText: "Abgesagte, geschlossene oder vergangene Termine werden hier gesammelt.",
  },
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
      return "Von mir erstellt";
    case "Teilnahme":
      return "Ich nehme teil";
    case "Bewerbung":
      return "Bewerbung offen";
    case "Einladung":
      return "Eingeladen";
    case "Warteliste":
      return "Warteliste";
    default:
      return kind || "Spieltermin";
  }
}

function roleHint(kind: string) {
  switch (kind) {
    case "Host":
      return "Du veranstaltest diesen Termin.";
    case "Teilnahme":
      return "Du bist als Spieler dabei.";
    case "Bewerbung":
      return "Du wartest noch auf Zusage.";
    case "Einladung":
      return "Du wurdest eingeladen.";
    case "Warteliste":
      return "Du wartest auf einen freien Platz.";
    default:
      return "Dieser Spieltermin betrifft dich.";
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
        <div className="my-overview-title-row">
          <span className={`role-pill role-${item.kind.toLowerCase()}`}>{roleLabel(item.kind)}</span>
          <span className="status-pill">{statusLabel(item.status)}</span>
        </div>
        <h2>{item.title}</h2>
        <p className="my-overview-role-hint">{roleHint(item.kind)}</p>
        <div className="my-overview-meta">
          <span>{timeLabel(item)}</span>
          <span>{item.locationName || "Spielort offen"}</span>
          {item.locationCity && <span>{item.locationCity}</span>}
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

  const activeItems = useMemo(
    () => items.filter((item) => !isPast(item, now)),
    [items, now]
  );

  const summaryCounts = useMemo(() => ({
    host: activeItems.filter((item) => item.kind === "Host").length,
    participant: activeItems.filter((item) => item.kind === "Teilnahme").length,
    application: activeItems.filter((item) => item.kind === "Bewerbung").length,
    invitation: activeItems.filter((item) => item.kind === "Einladung").length,
    waitlist: activeItems.filter((item) => item.kind === "Warteliste").length,
  }), [activeItems]);

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
  const activeFilter = filters.find((item) => item.key === filter) ?? filters[0];

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
            Alles, was dich betrifft: eigene Termine, Teilnahmen, Bewerbungen, Einladungen und Warteliste.
          </p>
        </div>
      </div>

      <Message text={loading ? "Lade Meine Spiele..." : ""} type="info" />
      <Message text={error} type="error" />

      {!loading && !error && (
        <section className="my-games-summary" aria-label="Meine Spiele Übersicht">
          <div>
            <strong>{activeItems.length}</strong>
            <span>Aktuelle Termine</span>
          </div>
          <div>
            <strong>{summaryCounts.host}</strong>
            <span>Von mir erstellt</span>
          </div>
          <div>
            <strong>{summaryCounts.participant}</strong>
            <span>Ich nehme teil</span>
          </div>
          <div>
            <strong>{summaryCounts.application + summaryCounts.invitation + summaryCounts.waitlist}</strong>
            <span>Offen</span>
          </div>
        </section>
      )}

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
          <h2>{activeFilter.emptyTitle}</h2>
          <p>{activeFilter.emptyText}</p>
          <div className="button-row">
            <Link to="/">Spieltermine entdecken</Link>
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
            {selectedItems.length === 0 && <p className="muted">Keine Spieltermine an diesem Tag.</p>}
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
