import { useCallback, useEffect, useState } from "react";
import type { CreateLocationRequest, LocationResponse, SystemOption } from "../types/game";
import { createLocation, updateLocation } from "../api/locationsApi";
import { createSystem, getSystems } from "../api/systemsApi";
import "leaflet/dist/leaflet.css";
import LocationPicker from "./LocationPicker";
import { useUser } from "../context/UserContext";

type Props = {
  onClose: () => void;
  onCreated: (location: LocationResponse) => void;
  location?: LocationResponse;
  inline?: boolean;
};

export default function LocationModal({ onClose, onCreated, location, inline = false }: Props) {
  const user = useUser();

  const [name, setName] = useState(location?.name ?? "");
  const [city, setCity] = useState(location?.city ?? "");
  const [address, setAddress] = useState(location?.address ?? "");
  const [latitude, setLatitude] = useState<number | null>(location?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(location?.longitude ?? null);
  const [systemKeys, setSystemKeys] = useState<string[]>(location?.systemKeys ?? []);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [newSystemName, setNewSystemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = name.trim() && city.trim() && address.trim() && latitude != null && longitude != null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isValid) {
      setError("Bitte Name, Stadt, Adresse und Standort eingeben.");
      return;
    }

    const request: CreateLocationRequest = {
      name,
      city,
      address,
      latitude: latitude!,
      longitude: longitude!,
      systemKeys,
    };

    try {
      setLoading(true);
      setError("");

      if (location) {
        await updateLocation(location.id, request, user);
        onCreated({ ...location, ...request });
      } else {
        const created = await createLocation(request, user);
        onCreated(created);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern");
    } finally {
      setLoading(false);
    }
  }

  const searchAddress = useCallback(async () => {
    const query = `${address}, ${city}, Deutschland`.trim();
    if (query.length < 5) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=de&q=${encodeURIComponent(query)}&limit=1`
      );

      const data = await res.json();

      if (!data.length) {
        setError("Adresse nicht gefunden. Bitte Marker manuell setzen.");
        return;
      }

      setError("");
      setLatitude(Number(data[0].lat));
      setLongitude(Number(data[0].lon));
    } catch {
      setError("Adresse konnte nicht gesucht werden.");
    }
  }, [address, city]);

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => setSystems([]));
  }, []);

  function toggleSystem(key: string) {
    setSystemKeys((prev) =>
      prev.includes(key)
        ? prev.filter((systemKey) => systemKey !== key)
        : [...prev, key]
    );
  }

  async function addSystem() {
    const name = newSystemName.trim();
    if (!name) return;

    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    try {
      const created = await createSystem({ key, name }, user);
      setSystems((prev) => prev.some((system) => system.key === created.key) ? prev : [...prev, created]);
      setSystemKeys((prev) => prev.includes(created.key) ? prev : [...prev, created.key]);
      setNewSystemName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "System konnte nicht angelegt werden.");
    }
  }

  useEffect(() => {
    if (!city && !address) return;

    const timeout = window.setTimeout(() => {
      searchAddress();
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [city, address, searchAddress]);

  const content = (
    <div className={inline ? "inline-location-editor" : "modal"}>
      <h2>{location ? "Location bearbeiten" : "Neue Location"}</h2>

      {error && <div className="message message-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name der Location" />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Stadt" />

        <div>
          <b>Systeme in dieser Location</b>
          {systems.map((system) => (
            <label key={system.key}>
              <input
                type="checkbox"
                checked={systemKeys.includes(system.key)}
                onChange={() => toggleSystem(system.key)}
              />
              {system.name}
            </label>
          ))}

          <div className="inline-add-system">
            <input
              value={newSystemName}
              onChange={(e) => setNewSystemName(e.target.value)}
              placeholder="Neues System anlegen"
            />
            <button type="button" onClick={addSystem}>
              System hinzufügen
            </button>
          </div>

        </div>

        <input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setLatitude(null);
            setLongitude(null);
          }}
          placeholder="Straße, Hausnummer"
        />

        <LocationPicker latitude={latitude} longitude={longitude} onChange={(lat, lng) => {
          setLatitude(lat);
          setLongitude(lng);
        }} />

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Abbrechen</button>
          <button type="submit" disabled={loading || !isValid}>
            {loading ? "Speichert..." : "Speichern"}
          </button>
        </div>
      </form>
    </div>
  );

  if (inline) return content;

  return <div className="modal-backdrop">{content}</div>;
}
