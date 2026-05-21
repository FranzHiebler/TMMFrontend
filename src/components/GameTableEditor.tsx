import type { CreateGameTableRequest, SystemOption } from "../types/game";
import GameTableSystemsPicker from "./GameTableSystemsPicker";
import { combineLocalDateInputWithTime, timeFromDate } from "../helpers/dateTime";

type Props = {
  table: CreateGameTableRequest;
  index: number;
  canRemove: boolean;
  locationSystemKeys: string[];
  locationSystems: SystemOption[];
  sessionStartTime: string;
  onUpdateTable: (index: number, patch: Partial<CreateGameTableRequest>) => void;
  onRemoveTable: (index: number) => void;
  onToggleSystem: (index: number, key: string) => void;
  onCustomSystemsChange: (index: number, value: string) => void;
};

export default function GameTableEditor({
  table,
  index,
  canRemove,
  locationSystemKeys,
  locationSystems,
  sessionStartTime,
  onUpdateTable,
  onRemoveTable,
  onToggleSystem,
  onCustomSystemsChange,
}: Props) {
  return (
    <div className="card game-table-editor">
      <div className="field">
        <label>Tischname</label>
        <input
          value={table.name}
          onChange={(e) => onUpdateTable(index, { name: e.target.value })}
          placeholder="z.B. Tisch 1"
        />
      </div>

      <div className="field">
        <label>Max. Spieler</label>
        <input
          type="number"
          min={1}
          value={table.maxPlayers}
          onChange={(e) => onUpdateTable(index, { maxPlayers: Number(e.target.value) })}
          placeholder="2"
        />
      </div>

      <GameTableSystemsPicker
        table={table}
        index={index}
        locationSystemKeys={locationSystemKeys}
        locationSystems={locationSystems}
        onToggleSystem={onToggleSystem}
        onCustomSystemsChange={onCustomSystemsChange}
      />

      <div className="form-row-2 table-wide">
        <div className="field">
          <label>Startzeit am Tisch</label>
          <input
            type="time"
            value={timeFromDate(table.startTimeUtc)}
            disabled={!sessionStartTime}
            onChange={(e) =>
              onUpdateTable(index, {
                startTimeUtc: combineLocalDateInputWithTime(
                  sessionStartTime,
                  e.target.value
                ),
              })
            }
          />
          {!sessionStartTime && (
            <small>Bitte zuerst Startdatum der Session wählen.</small>
          )}
        </div>

        <div className="field">
          <label>Punkte</label>
          <input
            type="number"
            value={table.points ?? ""}
            onChange={(e) =>
              onUpdateTable(index, {
                points: e.target.value ? Number(e.target.value) : null,
              })
            }
            placeholder="z.B. 2000"
          />
        </div>
      </div>

      <div className="field table-wide">
        <label>Szenario</label>
        <input
          value={table.scenario ?? ""}
          onChange={(e) => onUpdateTable(index, { scenario: e.target.value })}
          placeholder="Szenario optional"
        />
      </div>

      <div className="field table-wide">
        <label>Notizen</label>
        <textarea
          className="notes-textarea"
          value={table.notes ?? ""}
          onChange={(e) => onUpdateTable(index, { notes: e.target.value })}
          placeholder="Notizen optional, z.B. Gelände, Mission, Besonderheiten"
        />
      </div>

      {canRemove && (
        <button
          type="button"
          className="table-wide"
          onClick={() => onRemoveTable(index)}
        >
          Tisch entfernen
        </button>
      )}
    </div>
  );
}