import { useEffect, useState } from "react";
import { createSystem, getSystems } from "../api/systemsApi";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { SystemOption } from "../types/game";

export default function SystemsAdminPage() {
  const user = useUser();

  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [color, setColor] = useState("");
  const [markerColor, setMarkerColor] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadSystems() {
    setSystems(await getSystems());
  }

  useEffect(() => {
    void loadSystems().catch((err: Error) => setError(err.message));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await createSystem(
        {
          key,
          name,
          shortCode: shortCode || null,
          color: color || null,
          markerColor: markerColor || null,
        },
        user
      );

      setKey("");
      setName("");
      setShortCode("");
      setColor("");
      setMarkerColor("");
      setMessage("System gespeichert.");
      await loadSystems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "System konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Systeme verwalten</h1>
          <p className="page-subtitle">Adminbereich für Spielsysteme und Markerfarben.</p>
        </div>
      </div>

      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <form className="card form-grid" onSubmit={submit}>
        <div className="field">
          <label>Key</label>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="wh40k" />
        </div>

        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Warhammer 40.000" />
        </div>

        <div className="field">
          <label>Kürzel</label>
          <input value={shortCode} onChange={(e) => setShortCode(e.target.value)} placeholder="40K" />
        </div>

        <div className="field">
          <label>Farbe</label>
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#334155" />
        </div>

        <div className="field">
          <label>Markerfarbe</label>
          <input value={markerColor} onChange={(e) => setMarkerColor(e.target.value)} placeholder="#f97316" />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Speichert..." : "System speichern"}
        </button>
      </form>

      <div className="card">
        <h2>Vorhandene Systeme</h2>
        {systems.length === 0 && <p>Noch keine Systeme vorhanden.</p>}

        <div className="system-badge-row">
          {systems.map((system) => (
            <span key={system.key} className="system-badge">
              {system.shortCode || system.name} ({system.key})
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}