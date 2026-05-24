import { useEffect, useState } from "react";
import { createSystem, getSystems, updateSystem } from "../api/systemsApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { SystemOption } from "../types/game";

const emptySystem: SystemOption = {
  key: "",
  name: "",
  shortCode: "",
  color: "",
  markerColor: "",
};

export default function SystemsAdminPage() {
  const user = useUser();
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [draft, setDraft] = useState<SystemOption>(emptySystem);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function loadSystems() {
    setSystems(await getSystems());
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSystems().catch((err: Error) => setError(err.message));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  function updateRow(key: string, patch: Partial<SystemOption>) {
    setSystems((prev) =>
      prev.map((system) => (system.key === key ? { ...system, ...patch } : system))
    );
  }

  async function save(system: SystemOption) {
    try {
      setSavingKey(system.key);
      setError("");
      setMessage("");
      await updateSystem(system.key, system, user);
      setMessage("System gespeichert.");
      await loadSystems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "System konnte nicht gespeichert werden.");
    } finally {
      setSavingKey(null);
    }
  }

  async function addSystem() {
    try {
      setSavingKey("__new");
      setError("");
      setMessage("");
      await createSystem(draft, user);
      setDraft(emptySystem);
      setMessage("System angelegt.");
      await loadSystems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "System konnte nicht angelegt werden.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Systeme</h1>
          <p className="page-subtitle">Admin-Tabelle für Spielsysteme und Markerfarben.</p>
        </div>
      </div>

      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <section className="card systems-table-card">
        <div className="systems-table">
          <div className="systems-table-head">
            <span>Name</span>
            <span>Key</span>
            <span>Kürzel</span>
            <span>Farbe</span>
            <span>Marker</span>
            <span />
          </div>

          {systems.map((system) => (
            <div key={system.key} className="systems-table-row">
              <input value={system.name} onChange={(e) => updateRow(system.key, { name: e.target.value })} />
              <input value={system.key} disabled />
              <input value={system.shortCode ?? ""} onChange={(e) => updateRow(system.key, { shortCode: e.target.value })} />
              <input value={system.color ?? ""} onChange={(e) => updateRow(system.key, { color: e.target.value })} placeholder="#334155" />
              <input value={system.markerColor ?? ""} onChange={(e) => updateRow(system.key, { markerColor: e.target.value })} placeholder="#f97316" />
              <button type="button" title="Speichern" disabled={savingKey === system.key} onClick={() => save(system)}>
                💾
              </button>
            </div>
          ))}

          <div className="systems-table-row systems-table-new">
            <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />
            <input value={draft.key} onChange={(e) => setDraft((prev) => ({ ...prev, key: e.target.value }))} placeholder="key" />
            <input value={draft.shortCode ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, shortCode: e.target.value }))} placeholder="Kürzel" />
            <input value={draft.color ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))} placeholder="#334155" />
            <input value={draft.markerColor ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, markerColor: e.target.value }))} placeholder="#f97316" />
            <button type="button" title="Neues System" disabled={savingKey === "__new"} onClick={addSystem}>
              +
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
