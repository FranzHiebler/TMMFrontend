import { useEffect, useState } from "react";
import { getSystems } from "../api/systemsApi";
import type { LocationResponse, SystemOption } from "../types/game";
import LocationModal from "./LocationModal";
import LocationMembersPanel from "./LocationMembersPanel";
import { locationMembershipLabel } from "../helpers/locationLabels";
import { systemNames } from "../helpers/systemLabels";

type Props = {
  locations: LocationResponse[];
  highlightedLocationId?: string | null;
  onEdit: (location: LocationResponse) => void;
  editLocation?: LocationResponse | null;
  onEditDone: (location: LocationResponse) => void;
  onEditCancel: () => void;
};

export default function LocationList({
  locations,
  highlightedLocationId,
  onEdit,
  editLocation,
  onEditDone,
  onEditCancel,
}: Props) {
  const [systems, setSystems] = useState<SystemOption[]>([]);

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => setSystems([]));
  }, []);

  return (
    <div className="location-list">
      {locations.map((loc) => (
        <div
          key={loc.id}
          id={`location-${loc.id}`}
          className={`card location-card-grid ${highlightedLocationId === loc.id ? "context-highlight" : ""}`}
        >
          <div className="location-main">
            <h3>{loc.name}</h3>
            <p>{loc.city}</p>
            {loc.address && <p>{loc.address}</p>}
            
            <small>{locationMembershipLabel(loc)}</small>
            {(loc.systemKeys ?? []).length > 0 && (
              <p>Systeme: {systemNames(loc.systemKeys, systems).join(", ")}</p>
            )}

            <div className="location-actions">
              <button type="button" onClick={() => onEdit(loc)}>
                Bearbeiten
              </button>
            </div>

            {editLocation?.id === loc.id && (
              <LocationModal
                inline
                location={editLocation}
                onClose={onEditCancel}
                onCreated={onEditDone}
              />
            )}
          </div>

          <div className="location-members-side">
            <LocationMembersPanel location={loc} />
          </div>
        </div>
      ))}
    </div>
  );
}
