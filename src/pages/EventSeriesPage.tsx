import { useCallback, useEffect, useState } from "react";
import { createEventSeries, createNextSeriesSession, getEventSeries } from "../api/eventSeriesApi";
import { getMyLocations } from "../api/locationsApi";
import { getSystems } from "../api/systemsApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { EventSeriesDto, LocationResponse, SystemOption } from "../types/game";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function EventSeriesPage() {
  const user = useUser();
  const [series, setSeries] = useState<EventSeriesDto[]>([]);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [title, setTitle] = useState("");
  const [locationId, setLocationId] = useState("");
  const [systemKey, setSystemKey] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("4");
  const [recurrenceKind, setRecurrenceKind] = useState("Weekly");
  const [timeLabel, setTimeLabel] = useState("Abend");
  const [startHour, setStartHour] = useState("18");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [nextSeries, nextLocations, nextSystems] = await Promise.all([
      getEventSeries(user),
      getMyLocations(user),
      getSystems().catch(() => []),
    ]);
    setSeries(nextSeries);
    setLocations(nextLocations);
    setSystems(nextSystems);
    setLocationId((current) => current || nextLocations[0]?.id || "");
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Event-Serien konnten nicht geladen werden."));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError("");
      await createEventSeries(
        {
          title,
          locationId,
          systemKeys: systemKey ? [systemKey] : [],
          recurrenceKind: recurrenceKind as "Weekly" | "BiWeekly" | "MonthlyFirstWeekday",
          dayOfWeek: Number(dayOfWeek),
          timeLabel,
          startHour: Number(startHour),
          defaultMaxPlayers: 2,
          description: null,
        },
        user
      );
      setTitle("");
      setMessage("Event-Serie erstellt.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Event-Serie konnte nicht erstellt werden.");
    }
  }

  async function createNext(id: string) {
    const game = await createNextSeriesSession(id, user);
    setMessage(`Session erstellt: ${game.title}`);
  }

  return (
    <main className="container">
      <h1>Wiederkehrende Spiele</h1>
      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <form className="card form" onSubmit={submit}>
        <h2>Serie anlegen</h2>
        <div className="form-row-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Clubabend" />
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <select value={systemKey} onChange={(e) => setSystemKey(e.target.value)}>
            <option value="">System offen</option>
            {systems.map((system) => <option key={system.key} value={system.key}>{system.name}</option>)}
          </select>
          <select value={recurrenceKind} onChange={(e) => setRecurrenceKind(e.target.value)}>
            <option value="Weekly">Wöchentlich</option>
            <option value="BiWeekly">Alle zwei Wochen</option>
            <option value="MonthlyFirstWeekday">Erster Wochentag im Monat</option>
          </select>
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
            {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
          <input value={timeLabel} onChange={(e) => setTimeLabel(e.target.value)} placeholder="Abend" />
          <input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(e.target.value)} />
        </div>
        <button type="submit">Serie speichern</button>
      </form>

      <section className="card">
        <h2>Serien</h2>
        {series.map((item) => (
          <div key={item.id} className="list-row">
            <b>{item.title}</b>
            <span>{item.location.name} · {item.timeLabel}</span>
            <small>Nächste: {item.upcomingStartTimesUtc.slice(0, 3).map((date) => new Date(date).toLocaleDateString("de-DE")).join(", ")}</small>
            <button type="button" onClick={() => createNext(item.id)}>Nächste Session erzeugen</button>
          </div>
        ))}
      </section>
    </main>
  );
}
