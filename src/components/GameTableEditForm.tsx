import { useState } from "react";
import { combineDateWithTime, timeFromDate } from "../helpers/dateTime";
import type { GameTableDto, UpdateGameTableRequest } from "../types/game";

type Props = {
  table: GameTableDto;
  gameStartTimeUtc: string;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (request: UpdateGameTableRequest) => Promise<boolean>;
};

export default function GameTableEditForm({
  table,
  gameStartTimeUtc,
  isBusy,
  onCancel,
  onSave,
}: Props) {
  const [name, setName] = useState(table.name);
  const [maxPlayers, setMaxPlayers] = useState(table.maxPlayers.toString());
  const [systems, setSystems] = useState(table.systems.join(", "));
  const [startTime, setStartTime] = useState(timeFromDate(table.startTimeUtc ?? gameStartTimeUtc));
  const [points, setPoints] = useState(table.points?.toString() ?? "");
  const [scenario, setScenario] = useState(table.scenario ?? "");
  const [notes, setNotes] = useState(table.notes ?? "");

  async function submit() {
    const systemList = systems
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const success = await onSave({
      name,
      maxPlayers: Number(maxPlayers),
      systems: systemList,
      startTimeUtc: startTime ? combineDateWithTime(gameStartTimeUtc, startTime) : null,
      points: points ? Number(points) : null,
      scenario: scenario.trim() || null,
      notes: notes.trim() || null,
    });

    if (success) onCancel();
  }

  return (
    <div className="proposal-form table-edit-form">
      <h5>Tisch bearbeiten</h5>

      <div className="field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-row-2">
        <div className="field">
          <label>Max. Spieler</label>
          <input
            type="number"
            min={table.assignedPlayers.length}
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Startzeit am Tisch</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>Systeme</label>
        <input
          value={systems}
          onChange={(e) => setSystems(e.target.value)}
          placeholder="Leer = egal, sonst z.B. tow, wh40k"
        />
      </div>

      <div className="form-row-2">
        <div className="field">
          <label>Punkte</label>
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Szenario</label>
          <input value={scenario} onChange={(e) => setScenario(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Notizen</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="edit-actions">
        <button type="button" disabled={isBusy} onClick={submit}>
          Speichern
        </button>
        <button type="button" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}