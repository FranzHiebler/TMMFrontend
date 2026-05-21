import type { CreateGameTableRequest, SystemOption } from "../types/game";

type Props = {
    table: CreateGameTableRequest;
    index: number;
    locationSystemKeys: string[];
    locationSystems: SystemOption[];
    onToggleSystem: (index: number, key: string) => void;
    onCustomSystemsChange: (index: number, value: string) => void;
};

export default function GameTableSystemsPicker({
    table,
    index,
    locationSystemKeys,
    locationSystems,
    onToggleSystem,
    onCustomSystemsChange,
}: Props) {
    return (
        <div className="systems-picker table-wide">
            <b>Systeme:</b>
            
            <div className="systems-checkboxes">
                <label>
                    <input
                        type="checkbox"
                        checked={table.systems.includes("egal")}
                        onChange={() => onToggleSystem(index, "egal")}
                    />
                    Egal
                </label>

                {locationSystems.map((system) => (
                    <label key={system.key}>
                        <input
                            type="checkbox"
                            checked={table.systems.includes(system.key)}
                            disabled={table.systems.includes("egal")}
                            onChange={() => onToggleSystem(index, system.key)}
                        />
                        {system.name}
                    </label>
                ))}
            </div>

            {locationSystems.length === 0 && (
                <div className="message message-info">
                    Für diese Location sind noch keine Systeme ausgewählt.
                </div>
            )}

            <input
                value={table.systems
                    .filter((key) => key !== "egal" && !locationSystemKeys.includes(key))
                    .join(", ")}
                onChange={(e) => onCustomSystemsChange(index, e.target.value)}
                placeholder="Freitext-Systeme, z.B. Mordheim"
                disabled={table.systems.includes("egal")}
            />
        </div>
    );
}