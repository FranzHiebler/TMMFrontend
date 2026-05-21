import { useCallback, useEffect, useState } from "react";
import { getMyLocations } from "../api/locationsApi";
import type { LocationResponse } from "../types/game";
import LocationList from "../components/LocationList";
import LocationModal from "../components/LocationModal";
import { useUser } from "../context/UserContext";
import Message from "../components/Message";

export default function LocationsPage() {
  const user = useUser();

  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editLocation, setEditLocation] = useState<LocationResponse | null>(null);

  const loadLocations = useCallback(async () => {
    try {
      const data = await getMyLocations(user);
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Locations konnten nicht geladen werden.");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLocations();
  }, [loadLocations]);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Meine Locations ({locations.length})</h1>

        <button type="button" onClick={() => setShowModal(true)}>
          + Neue Location
        </button>
      </div>

      <Message text={loading ? "Lade Locations..." : ""} type="info" />
      <Message text={error} type="error" />

      {!loading && !error && (
        <LocationList
          locations={locations}
          onEdit={(loc) => setEditLocation(loc)}
          editLocation={editLocation}
          onEditCancel={() => setEditLocation(null)}
          onEditDone={(loc) => {
            setLocations((prev) => prev.map((location) => (location.id === loc.id ? loc : location)));
            setEditLocation(null);
          }}
        />
      )}

      {showModal && (
        <LocationModal
          onClose={() => {
            setShowModal(false);
          }}
          onCreated={(loc) => {
            setLocations((prev) =>
              prev.some((l) => l.id === loc.id)
                ? prev.map((l) => (l.id === loc.id ? loc : l))
                : [...prev, loc]
            );

            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
