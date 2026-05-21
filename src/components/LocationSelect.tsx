import type { LocationResponse } from "../types/game";

type Props = {
  locations: LocationResponse[];
  value: string;
  onChange: (id: string) => void;
  onCreateClick: () => void;
};

export default function LocationSelect({
  locations,
  value,
  onChange,
  onCreateClick,
}: Props) {
  return (
    <div className="location-select-row">
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Location wählen</option>

        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name} ({l.city})
            {l.role ? ` - ${l.role}` : ""}
            {l.isOpen ? " - Öffentlich" : ""}
          </option>
        ))}
      </select>

      <button type="button" onClick={onCreateClick}>
        + Neue Location
      </button>
    </div>
  );
}