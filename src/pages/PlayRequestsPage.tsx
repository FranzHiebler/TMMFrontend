import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPlayRequest, getMyPlayRequests, getPlayRequests, closePlayRequest } from "../api/playRequestsApi";
import { getSystems } from "../api/systemsApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import { systemName } from "../helpers/systemLabels";
import type { PlayRequestDto, SystemOption } from "../types/game";

export default function PlayRequestsPage() {
  const user = useUser();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<PlayRequestDto[]>([]);
  const [mine, setMine] = useState<PlayRequestDto[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [systemKey, setSystemKey] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [radiusKm, setRadiusKm] = useState("50");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [all, my, sys] = await Promise.all([
      getPlayRequests(user),
      getMyPlayRequests(user),
      getSystems().catch(() => []),
    ]);
    setRequests(all);
    setMine(my);
    setSystems(sys);
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Spielgesuche konnten nicht geladen werden."));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt) return;
    const timeout = window.setTimeout(() => setNote(prompt), 0);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!systemKey) {
      setError("Bitte System wählen.");
      return;
    }

    try {
      setError("");
      await createPlayRequest(
        {
          systemKey,
          timeNote: timeNote || null,
          radiusKm: radiusKm ? Number(radiusKm) : null,
          note: note || null,
        },
        user
      );
      setMessage("Spielgesuch erstellt.");
      setTimeNote("");
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spielgesuch konnte nicht erstellt werden.");
    }
  }

  async function close(id: string) {
    await closePlayRequest(id, user);
    await load();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Spielgesuche</h1>
          <p className="page-subtitle">Leichter Einstieg: Ich suche ein Spiel.</p>
        </div>
        <Link className="nav-create-button" to="/games/create">Spieltermin anbieten</Link>
      </div>

      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <form className="card form" onSubmit={submit}>
        <h2>Neues Spielgesuch</h2>
        <div className="form-row-2">
          <label>
            <span>System</span>
            <select value={systemKey} onChange={(e) => setSystemKey(e.target.value)}>
              <option value="">System wählen</option>
              {systems.map((system) => <option key={system.key} value={system.key}>{system.name}</option>)}
            </select>
          </label>
          <label>
            <span>Grobe Zeit</span>
            <input value={timeNote} onChange={(e) => setTimeNote(e.target.value)} placeholder="z.B. Freitag Abend" />
          </label>
          <label>
            <span>Radius</span>
            <input type="number" min={1} max={500} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
          </label>
          <label>
            <span>Notiz</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
          </label>
        </div>
        <button type="submit">Spielgesuch veröffentlichen</button>
      </form>

      <section className="card">
        <h2>Meine Spielgesuche</h2>
        {mine.length === 0 && <p className="muted">Noch keine eigenen Spielgesuche.</p>}
        {mine.map((request) => (
          <div key={request.id} className="list-row">
            <b>{systemName(request.systemKey, systems)}</b>
            <span>{request.timeNote || "Zeit offen"} · {request.status}</span>
            {request.status === "Open" && <button type="button" onClick={() => close(request.id)}>Schließen</button>}
            {request.convertedGameId && <Link to={`/sessions/${request.convertedGameId}`}>Spieltermin öffnen</Link>}
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Offene Gesuche</h2>
        {requests.length === 0 && <p className="muted">Keine offenen Spielgesuche.</p>}
        {requests.map((request) => (
          <div key={request.id} className="list-row">
            <b>{request.owner.displayName}</b>
            <span>{systemName(request.systemKey, systems)} · {request.timeNote || "Zeit offen"}</span>
            {request.note && <small>{request.note}</small>}
          </div>
        ))}
      </section>
    </main>
  );
}
