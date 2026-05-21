import type { LocationResponse } from "../types/game";
import LocationModal from "./LocationModal";
import LocationMembersPanel from "./LocationMembersPanel";
import { locationMembershipLabel } from "../helpers/locationLabels";

type Props = {
  locations: LocationResponse[];
  onEdit: (location: LocationResponse) => void;
  editLocation?: LocationResponse | null;
  onEditDone: (location: LocationResponse) => void;
  onEditCancel: () => void;
};

export default function LocationList({ locations, onEdit, editLocation, onEditDone, onEditCancel }: Props) {
  return (
    <div className="location-list">
      {locations.map((loc) => (
        <div key={loc.id} className="card location-card-grid">
          <div className="location-main">
            <h3>{loc.name}</h3>
            <p>{loc.city}</p>
            {loc.address && <p>{loc.address}</p>}
            
            <small>{locationMembershipLabel(loc)}</small>
            {(loc.systemKeys ?? []).length > 0 && (
              <p>Systeme: {(loc.systemKeys ?? []).join(", ")}</p>
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
