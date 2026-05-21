import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GameJoinMode,
  type CreateGameRequest,
  type CreateGameTableRequest,
  type LocationResponse,
  type SystemOption,
} from "../types/game";
import { createGame } from "../api/gamesApi";
import { getMyLocations } from "../api/locationsApi";
import { getSystems } from "../api/systemsApi";
import LocationSelect from "./LocationSelect";
import LocationModal from "./LocationModal";
import GameTableEditor from "./GameTableEditor";
import { useUser } from "../context/UserContext";
import { useToast } from "../context/ToastContext";
import Message from "./Message";
import { getCurrentUserProfile } from "../api/usersApi";

function newTable(index: number): CreateGameTableRequest {
  return {
    name: `Tisch ${index}`,
    maxPlayers: 2,
    systems: [],
    scenario: "",
    points: null,
    notes: "",
  };
}

export default function CreateGameForm() {
  const user = useUser();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedLocationId = searchParams.get("locationId");

  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [tables, setTables] = useState<CreateGameTableRequest[]>([newTable(1)]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinMode, setJoinMode] = useState<GameJoinMode>(GameJoinMode.FirstComeFirstServe);

  const selectedLocation = locations.find((location) => location.id === locationId);
  const locationSystemKeys = selectedLocation?.systemKeys ?? [];
  const locationSystems = systems.filter((system) => locationSystemKeys.includes(system.key));

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [locationData, systemData, profileData] = await Promise.all([
          getMyLocations(user),
          getSystems(),
          getCurrentUserProfile(user),
        ]);

        if (!isMounted) return;

        setLocations(locationData);
        setSystems(systemData);

        const queryLocationExists =
          requestedLocationId &&
          locationData.some((location) => location.id === requestedLocationId);

        const defaultLocationExists =
          profileData.defaultLocationId &&
          locationData.some((location) => location.id === profileData.defaultLocationId);

        if (queryLocationExists) {
          setLocationId(requestedLocationId);
        } else if (defaultLocationExists) {
          setLocationId(profileData.defaultLocationId!);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Daten konnten nicht geladen werden");
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [user, requestedLocationId]);

  function updateTable(index: number, patch: Partial<CreateGameTableRequest>) {
    setTables((prev) => prev.map((table, i) => (i === index ? { ...table, ...patch } : table)));
  }

  function updateSessionStartTime(value: string) {
    const previousIso = startTime ? new Date(startTime).toISOString() : null;
    const nextIso = value ? new Date(value).toISOString() : null;

    setStartTime(value);

    if (!nextIso) return;

    setTables((prev) =>
      prev.map((table) => ({
        ...table,
        startTimeUtc:
          !table.startTimeUtc || table.startTimeUtc === previousIso
            ? nextIso
            : table.startTimeUtc,
      }))
    );
  }

  function addTable() {
    setTables((prev) => [...prev, newTable(prev.length + 1)]);
  }

  function removeTable(index: number) {
    setTables((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleSystem(index: number, key: string) {
    const table = tables[index];

    if (key === "egal") {
      updateTable(index, { systems: table.systems.includes("egal") ? [] : ["egal"] });
      return;
    }

    const withoutEgal = table.systems.filter((x) => x !== "egal");
    const next = withoutEgal.includes(key)
      ? withoutEgal.filter((x) => x !== key)
      : [...withoutEgal, key];

    updateTable(index, { systems: next });
  }

  function updateCustomSystems(index: number, value: string) {
    const table = tables[index];
    const selectedKnownSystems = table.systems.filter((key) =>
      key === "egal" || locationSystemKeys.includes(key)
    );

    const customSystems = value
      .split(",")
      .map((system) => system.trim())
      .filter(Boolean);

    updateTable(index, {
      systems: [...selectedKnownSystems.filter((key) => key !== "egal"), ...customSystems],
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !locationId || !startTime) {
      setError("Bitte Titel, Location und Startzeit ausfüllen.");
      return;
    }

    if (tables.length === 0 || tables.some((t) => !t.name || t.maxPlayers < 1)) {
      setError("Jeder Tisch braucht Name und mindestens 1 Spieler.");
      return;
    }

    const request: CreateGameRequest = {
      title,
      locationId,
      clubId: null,
      startTimeUtc: new Date(startTime).toISOString(),
      description: description || null,
      joinMode,
      tables: tables.map((t) => ({
        ...t,
        scenario: t.scenario || null,
        notes: t.notes || null,
        points: t.points || null,
        startTimeUtc: t.startTimeUtc || null,
      })),
    };

    try {
      setLoading(true);
      setError("");
      await createGame(request, user);
      showToast("success", "Session gespeichert");
      setTitle("");
      setDescription("");
      setStartTime("");
      setTables([newTable(1)]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Game konnte nicht erstellt werden";
      setError(message);
      showToast("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <Message text={error} type="error" />

      <form onSubmit={handleSubmit} className="form create-game-form">
        <div className="field">
          <label>Titel der Game Session</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Warhammer-Abend im Club"
          />
        </div>

        <div className="field">
          <label>Location</label>
          <LocationSelect
            locations={locations}
            value={locationId}
            onChange={setLocationId}
            onCreateClick={() => setShowLocationModal(true)}
          />
        </div>

        <div className="form-row-2">
          <div className="field">
            <label>Beitrittsmodus</label>
            <select value={joinMode} onChange={(e) => setJoinMode(e.target.value as GameJoinMode)}>
              <option value={GameJoinMode.FirstComeFirstServe}>Direkter Beitritt</option>
              <option value={GameJoinMode.ApprovalRequired}>Bewerbung erforderlich</option>
            </select>
          </div>

          <div className="field">
            <label>Start der Game Session</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => updateSessionStartTime(e.target.value)}
              title="Startzeitpunkt der Game Session"
            />
          </div>
        </div>

        <div className="field">
          <label>Beschreibung / grober Zeitrahmen</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="z.B. Aufbau ab 17:30 Uhr, Spielstart ca. 18 Uhr, Ende gegen 23 Uhr"
          />
        </div>

        <h2>Tische</h2>

        {tables.map((table, index) => (
          <GameTableEditor
            key={index}
            table={table}
            index={index}
            canRemove={tables.length > 1}
            sessionStartTime={startTime}
            locationSystemKeys={locationSystemKeys}
            locationSystems={locationSystems}
            onUpdateTable={updateTable}
            onRemoveTable={removeTable}
            onToggleSystem={toggleSystem}
            onCustomSystemsChange={updateCustomSystems}
          />
        ))}

        <button type="button" onClick={addTable}>
          + Tisch hinzufügen
        </button>

        <button type="submit" disabled={loading}>
          {loading ? "Speichere..." : "Game Session erstellen"}
        </button>
      </form>

      {showLocationModal && (
        <LocationModal
          onClose={() => setShowLocationModal(false)}
          onCreated={(loc) => {
            setLocations((prev) => [...prev, loc]);
            setLocationId(loc.id);
            setShowLocationModal(false);
          }}
        />
      )}
    </div>
  );
}
