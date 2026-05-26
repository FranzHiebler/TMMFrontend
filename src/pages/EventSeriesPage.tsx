import { useCallback, useEffect, useMemo, useState } from "react";
import { createEventSeries, createNextSeriesSession, getEventSeries, updateEventSeries } from "../api/eventSeriesApi";
import { getMyLocations } from "../api/locationsApi";
import { getSystems } from "../api/systemsApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { CreateEventSeriesRequest, EventRecurrenceKind, EventSeriesDto, LocationResponse, SystemOption } from "../types/game";

const weekdays = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

type SeriesFormState = {
  title: string;
  locationId: string;
  systemKey: string;
  dayOfWeek: string;
  recurrenceKind: EventRecurrenceKind;
  timeLabel: string;
  startHour: string;
  defaultMaxPlayers: string;
  description: string;
  startDate: string;
  endDate: string;
};

function emptyForm(locationId = ""): SeriesFormState {
  return {
    title: "",
    locationId,
    systemKey: "",
    dayOfWeek: "4",
    recurrenceKind: "Weekly",
    timeLabel: "Abend",
    startHour: "18",
    defaultMaxPlayers: "2",
    description: "",
    startDate: "",
    endDate: "",
  };
}

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toRequest(form: SeriesFormState): CreateEventSeriesRequest {
  return {
    title: form.title,
    locationId: form.locationId,
    systemKeys: form.systemKey ? [form.systemKey] : [],
    recurrenceKind: form.recurrenceKind,
    dayOfWeek: Number(form.dayOfWeek),
    timeLabel: form.timeLabel || null,
    startHour: Number(form.startHour || 18),
    defaultMaxPlayers: Number(form.defaultMaxPlayers || 2),
    description: form.description || null,
    startDateUtc: form.startDate ? new Date(`${form.startDate}T00:00:00`).toISOString() : null,
    endDateUtc: form.endDate ? new Date(`${form.endDate}T00:00:00`).toISOString() : null,
  };
}

function formFromSeries(series: EventSeriesDto): SeriesFormState {
  return {
    title: series.title,
    locationId: series.locationId,
    systemKey: series.systemKeys[0] ?? "",
    dayOfWeek: String(series.dayOfWeek),
    recurrenceKind: series.recurrenceKind,
    timeLabel: series.timeLabel ?? "",
    startHour: String(series.startHour),
    defaultMaxPlayers: String(series.defaultMaxPlayers),
    description: series.description ?? "",
    startDate: dateInputValue(series.startDateUtc),
    endDate: dateInputValue(series.endDateUtc),
  };
}

export default function EventSeriesPage() {
  const user = useUser();
  const [series, setSeries] = useState<EventSeriesDto[]>([]);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [form, setForm] = useState<SeriesFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const systemsByCategory = useMemo(() => {
    return systems.reduce<Record<string, SystemOption[]>>((acc, system) => {
      const category = system.category ?? "Tabletop";
      acc[category] = [...(acc[category] ?? []), system];
      return acc;
    }, {});
  }, [systems]);

  const load = useCallback(async () => {
    const [nextSeries, nextLocations, nextSystems] = await Promise.all([
      getEventSeries(user),
      getMyLocations(user),
      getSystems().catch(() => []),
    ]);
    setSeries(nextSeries);
    setLocations(nextLocations);
    setSystems(nextSystems);
    setForm((current) => ({ ...current, locationId: current.locationId || nextLocations[0]?.id || "" }));
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
      if (editingId) {
        await updateEventSeries(editingId, toRequest(form), user);
        setMessage("Serie gespeichert.");
      } else {
        await createEventSeries(toRequest(form), user);
        setMessage("Serie erstellt.");
      }
      setEditingId(null);
      setForm(emptyForm(locations[0]?.id || ""));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Serie konnte nicht gespeichert werden.");
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
        <h2>{editingId ? "Serie bearbeiten" : "Serie anlegen"}</h2>
        <div className="form-row-2">
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="z.B. Clubabend" />
          <select value={form.locationId} onChange={(e) => setForm((prev) => ({ ...prev, locationId: e.target.value }))}>
            {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <select value={form.systemKey} onChange={(e) => setForm((prev) => ({ ...prev, systemKey: e.target.value }))}>
            <option value="">System offen</option>
            {Object.entries(systemsByCategory).map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((system) => <option key={system.key} value={system.key}>{system.name}</option>)}
              </optgroup>
            ))}
          </select>
          <select value={form.recurrenceKind} onChange={(e) => setForm((prev) => ({ ...prev, recurrenceKind: e.target.value as EventRecurrenceKind }))}>
            <option value="Weekly">Wöchentlich</option>
            <option value="BiWeekly">Alle zwei Wochen</option>
            <option value="MonthlyFirstWeekday">Erster Wochentag im Monat</option>
          </select>
          <select value={form.dayOfWeek} onChange={(e) => setForm((prev) => ({ ...prev, dayOfWeek: e.target.value }))}>
            {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
          <input value={form.timeLabel} onChange={(e) => setForm((prev) => ({ ...prev, timeLabel: e.target.value }))} placeholder="Abend" />
          <input type="number" min={0} max={23} value={form.startHour} onChange={(e) => setForm((prev) => ({ ...prev, startHour: e.target.value }))} />
          <input type="number" min={1} max={20} value={form.defaultMaxPlayers} onChange={(e) => setForm((prev) => ({ ...prev, defaultMaxPlayers: e.target.value }))} />
          <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} aria-label="Startdatum" />
          <input type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} aria-label="Enddatum optional" />
          <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Beschreibung" />
        </div>
        <div className="button-row">
          <button type="submit">{editingId ? "Änderungen speichern" : "Serie speichern"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm(locations[0]?.id || "")); }}>Abbrechen</button>}
        </div>
      </form>

      <section className="card">
        <h2>Serien</h2>
        {series.map((item) => (
          <div key={item.id} className="list-row">
            <b>{item.title}</b>
            <span>{item.location.name} · {item.timeLabel}</span>
            <small>Nächste: {item.upcomingStartTimesUtc.slice(0, 3).map((date) => new Date(date).toLocaleDateString("de-DE")).join(", ") || "keine im Zeitraum"}</small>
            <div className="button-row">
              <button type="button" onClick={() => { setEditingId(item.id); setForm(formFromSeries(item)); }}>Bearbeiten</button>
              <button type="button" onClick={() => createNext(item.id)}>Nächste Session erzeugen</button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
