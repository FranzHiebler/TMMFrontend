import { useEffect, useState } from "react";
import {
  requestLocationMembership,
  searchNearbyLocations,
} from "../api/locationsApi";
import { getSystems } from "../api/systemsApi";
import type { LocationResponse, SystemOption } from "../types/game";
import { useUser } from "../context/UserContext";
import LocationPicker from "../components/LocationPicker";
import Message from "../components/Message";

export default function NearbyPage() {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Bad Orb");
  const [latitude, setLatitude] = useState<number | null>(50.5558);
  const [longitude, setLongitude] = useState<number | null>(9.6808);
  const [radiusKm, setRadiusKm] = useState("25");
  const [systemKey, setSystemKey] = useState("");
  const [systems, setSystems] = useState<SystemOption[]>([]);

  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const user = useUser();

  useEffect(() => {
    getSystems()
      .then(setSystems)
      .catch(() => setSystems([]));
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function searchAddress() {
    const query = `${address}, ${city}, Deutschland`.trim();
    if (query.length < 5) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=de&q=${encodeURIComponent(query)}&limit=1`
    );

    const data = await res.json();

    if (!data.length) {
      setMessageType("error");
      setMessage("Adresse nicht gefunden. Bitte Marker manuell setzen.");
      return;
    }

    setMessage("");
    setLatitude(Number(data[0].lat));
    setLongitude(Number(data[0].lon));
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();

    if (latitude == null || longitude == null) {
      setMessageType("error");
      setMessage("Bitte Standort auswählen.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const data = await searchNearbyLocations(
        {
          latitude,
          longitude,
          radiusKm: Number(radiusKm),
          systemKey: systemKey || undefined,
        },
        user
      );

      setLocations(data);
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Fehler bei Nearby Search");
    } finally {
      setLoading(false);
    }
  }

  async function requestMembership(locationId: string) {
    try {
      setRequestingId(locationId);
      setMessage("");
      await requestLocationMembership(locationId, null, user);
      setLocations((prev) => prev.filter((location) => location.id !== locationId));
      setMessageType("success");
      setMessage("Aufnahmeanfrage gesendet");
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Anfrage fehlgeschlagen");
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="container">
      <h1>Locations in der Nähe</h1>

      <Message text={message} type={messageType} />

      <form onSubmit={handleSearch} className="form">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Stadt" />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse optional" />

        <button type="button" onClick={searchAddress}>
          Adresse suchen
        </button>

        <LocationPicker
          latitude={latitude}
          longitude={longitude}
          onChange={(lat, lng) => {
            setLatitude(lat);
            setLongitude(lng);
          }}
        />

        <div className="input-with-unit">
          <input
            type="number"
            min={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(e.target.value)}
            placeholder="Radius"
          />
          <span>km</span>
        </div>

        <select value={systemKey} onChange={(e) => setSystemKey(e.target.value)}>
          <option value="">Alle Systeme</option>
          {systems.map((system) => (
            <option key={system.key} value={system.key}>
              {system.name}
            </option>
          ))}
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Suche..." : "Locations suchen"}
        </button>
      </form>

      {!loading && locations.length === 0 && (
        <p>Keine unbekannten Locations gefunden.</p>
      )}

      <div className="location-list">
        {locations.map((location) => (
          <div key={location.id} className="card">
            <h3>{location.name}</h3>
            <p>{location.city}</p>
            {location.address && <p>{location.address}</p>}
            {(location.systemKeys ?? []).length > 0 && (
              <p>Systeme: {(location.systemKeys ?? []).join(", ")}</p>
            )}
            <button
              type="button"
              disabled={requestingId === location.id}
              onClick={() => requestMembership(location.id)}
            >
              {requestingId === location.id ? "Sendet..." : "Aufnahme anfragen"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
