import { useState } from "react";
import type { GameResponse, UpdateGameSessionRequest } from "../types/game";

type Props = {
  game: GameResponse;
  isBusy: boolean;
  onCancel: () => void;
  onSave: (request: UpdateGameSessionRequest) => Promise<boolean>;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function GameSessionEditForm({ game, isBusy, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(game.title);
  const [startTime, setStartTime] = useState(toDateTimeLocal(game.startTimeUtc));
  const [description, setDescription] = useState(game.description ?? "");

  async function submit() {
    const success = await onSave({
      title,
      startTimeUtc: new Date(startTime).toISOString(),
      description: description.trim() || null,
    });

    if (success) onCancel();
  }

  return (
    <div className="card form session-edit-form">
      <h3>Session bearbeiten</h3>

      <div className="field">
        <label>Titel</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="field">
        <label>Start der Session</label>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Beschreibung</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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