import { useEffect, useState } from "react";
import { createSystem, getSystems, updateSystem } from "../api/systemsApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { SystemCategory, SystemOption } from "../types/game";

const categories: SystemCategory[] = ["Tabletop", "Brettspiel", "Rollenspiel", "TCG", "Sonstiges"];

const emptySystem: SystemOption = {
  key: "",
  name: "",
  shortCode: "",
  color: "#334155",
  markerColor: "#f97316",
  category: "Tabletop",
};

function isHexColor(value?: string | null) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "");
}

function ColorCell({
  value,
  onChange,
}: {
  value?: string | null;
  onChange: (value: string) => void;
}) {
  const safeValue = isHexColor(value) ? value! : "#334155";

  return (
    <div className="color-cell">
      <input type="color" value={safeValue} onChange={(e) => onChange(e.target.value)} />
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#334155" />
      <span style={{ background: safeValue }} aria-hidden="true" />
    </div>
  );
}

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
      await updateSystem(system.key, { ...system, category: system.category ?? "Tabletop" }, user);
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
      await createSystem({ ...draft, category: draft.category ?? "Tabletop" }, user);
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
          <p className="page-subtitle">Admin-Tabelle für Spielsysteme, Kategorien und Markerfarben.</p>
        </div>
      </div>

      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <section className="card systems-table-card">
        <div className="systems-table systems-table-categorized">
          <div className="systems-table-head">
            <span>Name</span>
            <span>Key</span>
            <span>Kürzel</span>
            <span>Kategorie</span>
            <span>Farbe</span>
            <span>Marker</span>
            <span />
          </div>

          {systems.map((system) => (
            <div key={system.key} className="systems-table-row">
              <input value={system.name} onChange={(e) => updateRow(system.key, { name: e.target.value })} />
              <input value={system.key} disabled />
              <input value={system.shortCode ?? ""} onChange={(e) => updateRow(system.key, { shortCode: e.target.value })} />
              <select value={system.category ?? "Tabletop"} onChange={(e) => updateRow(system.key, { category: e.target.value as SystemCategory })}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <ColorCell value={system.color} onChange={(color) => updateRow(system.key, { color })} />
              <ColorCell value={system.markerColor} onChange={(markerColor) => updateRow(system.key, { markerColor })} />
              <button type="button" title="Speichern" disabled={savingKey === system.key} onClick={() => save(system)}>
                Speichern
              </button>
            </div>
          ))}

          <div className="systems-table-row systems-table-new">
            <input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" />
            <input value={draft.key} onChange={(e) => setDraft((prev) => ({ ...prev, key: e.target.value }))} placeholder="key" />
            <input value={draft.shortCode ?? ""} onChange={(e) => setDraft((prev) => ({ ...prev, shortCode: e.target.value }))} placeholder="Kürzel" />
            <select value={draft.category ?? "Tabletop"} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value as SystemCategory }))}>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <ColorCell value={draft.color} onChange={(color) => setDraft((prev) => ({ ...prev, color }))} />
            <ColorCell value={draft.markerColor} onChange={(markerColor) => setDraft((prev) => ({ ...prev, markerColor }))} />
            <button type="button" title="Neues System" disabled={savingKey === "__new"} onClick={addSystem}>
              +
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
