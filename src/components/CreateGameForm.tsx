import { useEffect, useMemo, useState } from "react";
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

type TimeWindow = "morning" | "afternoon" | "evening" | "allDay";
type TimingMode = "Fixed" | "Rough" | "Open";

const timeWindowDefaults: Record<TimeWindow, string> = {
  morning: "10:00",
  afternoon: "14:00",
  evening: "18:00",
  allDay: "10:00",
};

const timeWindowLabels: Record<TimeWindow, string> = {
  morning: "Vormittag",
  afternoon: "Nachmittag",
  evening: "Abend",
  allDay: "Ganztags",
};

function newTable(index: number, patch?: Partial<CreateGameTableRequest>): CreateGameTableRequest {
  return {
    name: `Tisch ${index}`,
    maxPlayers: 2,
    systems: [],
    scenario: "",
    points: null,
    notes: "",
    ...patch,
  };
}

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

export default function CreateGameForm() {
  const user = useUser();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const requestedLocationId = searchParams.get("locationId");
  const prompt = searchParams.get("prompt");

  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [locationId, setLocationId] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [systemKey, setSystemKey] = useState("");
  const [customSystem, setCustomSystem] = useState("");
  const [gameDate, setGameDate] = useState("");
  const [timingMode, setTimingMode] = useState<TimingMode>("Rough");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("evening");
  const [exactTime, setExactTime] = useState("");
  const [freeSeats, setFreeSeats] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [scenario, setScenario] = useState("");
  const [joinMode, setJoinMode] = useState<GameJoinMode>(GameJoinMode.FirstComeFirstServe);
  const [showTableDetails, setShowTableDetails] = useState(false);
  const [tables, setTables] = useState<CreateGameTableRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedLocation = locations.find((location) => location.id === locationId);
  const locationSystemKeys = selectedLocation?.systemKeys ?? [];
  const locationSystems = systems.filter((system) => locationSystemKeys.includes(system.key));
  const visibleSystems = locationSystems.length ? locationSystems : systems;

  const selectedSystemLabel = useMemo(() => {
    if (systemKey === "__custom") return customSystem.trim();
    return systems.find((system) => system.key === systemKey)?.name ?? systemKey;
  }, [customSystem, systemKey, systems]);

  const effectiveTime = exactTime || timeWindowDefaults[timeWindow];
  const startTimeUtc = gameDate ? combineDateAndTime(gameDate, effectiveTime) : "";

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

  useEffect(() => {
    if (!prompt) return;
    const timeout = window.setTimeout(() => {
      setTitle(prompt.slice(0, 80));
      setDescription(`Aus Chat erstellt:\n${prompt}`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [prompt]);

  function updateTable(index: number, patch: Partial<CreateGameTableRequest>) {
    setTables((prev) => prev.map((table, i) => (i === index ? { ...table, ...patch } : table)));
  }

  function addTableMode() {
    const inheritedTable = buildSimpleTable("Tisch 1");
    setTables([inheritedTable, newTable(2, { systems: inheritedTable.systems })]);
    setShowTableDetails(true);
  }

  function addTable() {
    setTables((prev) => [...prev, newTable(prev.length + 1, { systems: buildSystems() })]);
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

  function buildSystems() {
    if (systemKey === "__custom") return customSystem.trim() ? [customSystem.trim()] : [];
    return systemKey ? [systemKey] : [];
  }

  function buildSimpleTable(name = "Spiel") {
    return newTable(1, {
      name,
      maxPlayers: Math.max(1, freeSeats),
      systems: buildSystems(),
      points: points ? Number(points) : null,
      scenario: scenario || null,
      startTimeUtc: null,
      notes: exactTime ? null : `Zeitfenster: ${timeWindowLabels[timeWindow]}`,
    });
  }

  function buildDescription() {
    const parts = [
      description.trim(),
      `Zeitfenster: ${timeWindowLabels[timeWindow]}${exactTime ? `, genaue Uhrzeit ${exactTime}` : ""}`,
    ].filter(Boolean);

    return parts.join("\n\n") || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const systemsForValidation = buildSystems();

    if (!systemKey || (systemKey === "__custom" && !customSystem.trim()) || !locationId || (timingMode !== "Open" && !gameDate)) {
      setError("Bitte System, Termin und Spielort ausfüllen.");
      return;
    }

    if (freeSeats < 1) {
      setError("Bitte mindestens einen freien Platz angeben.");
      return;
    }

    const requestTables = showTableDetails ? tables : [buildSimpleTable()];

    if (
      requestTables.length === 0 ||
      requestTables.some((table) => !table.name || table.maxPlayers < 1)
    ) {
      setError("Jeder Tisch braucht Name und mindestens 1 Spieler.");
      return;
    }

    if (!showTableDetails && systemsForValidation.length === 0) {
      setError("Bitte ein System auswählen oder als Freitext eintragen.");
      return;
    }

    const request: CreateGameRequest = {
      title: title.trim() || `${selectedSystemLabel} ${timeWindowLabels[timeWindow]}`,
      locationId,
      clubId: null,
      startTimeUtc: startTimeUtc || new Date(Date.now() + 30 * 86400000).toISOString(),
      timingMode,
      timeLabel: timingMode === "Open" ? "Termin offen" : timeWindowLabels[timeWindow],
      description: buildDescription(),
      joinMode,
      tables: requestTables.map((table) => ({
        ...table,
        scenario: table.scenario || null,
        notes: table.notes || null,
        points: table.points || null,
        startTimeUtc: table.startTimeUtc || null,
      })),
    };

    try {
      setLoading(true);
      setError("");
      await createGame(request, user);
      showToast("success", "Spieltermin gespeichert");
      setTitle("");
      setDescription("");
      setGameDate("");
      setTimingMode("Rough");
      setExactTime("");
      setPoints("");
      setScenario("");
      setShowTableDetails(false);
      setTables([]);
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

      <form onSubmit={handleSubmit} className="form create-game-form create-game-form-v2">
        <section className="card simple-session-card">
          <div>
            <p className="panel-kicker">Neuer Spieltermin</p>
            <h1>Spieltermin anbieten</h1>
            <p className="page-subtitle">Erst das Nötigste. Details kannst du aufklappen.</p>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>System</label>
              <select value={systemKey} onChange={(e) => setSystemKey(e.target.value)}>
                <option value="">System wählen</option>
                {visibleSystems.map((system) => (
                  <option key={system.key} value={system.key}>
                    {system.name}
                  </option>
                ))}
                <option value="__custom">Anderes System</option>
              </select>
            </div>

            {systemKey === "__custom" && (
              <div className="field">
                <label>System als Freitext</label>
                <input
                  value={customSystem}
                  onChange={(e) => setCustomSystem(e.target.value)}
                  placeholder="z.B. The Old World"
                />
              </div>
            )}
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Terminart</label>
              <select value={timingMode} onChange={(e) => setTimingMode(e.target.value as TimingMode)}>
                <option value="Rough">Grob</option>
                <option value="Fixed">Fest</option>
                <option value="Open">Noch offen</option>
              </select>
            </div>

            <div className="field">
              <label>Wann?</label>
              <input type="date" value={gameDate} disabled={timingMode === "Open"} onChange={(e) => setGameDate(e.target.value)} />
            </div>

            <div className="field">
              <label>Tageszeit</label>
              <div className="segmented-control">
                {(Object.keys(timeWindowLabels) as TimeWindow[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={timeWindow === key ? "active" : ""}
                    onClick={() => setTimeWindow(key)}
                  >
                    {timeWindowLabels[key]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Wo / Spielort</label>
              <LocationSelect
                locations={locations}
                value={locationId}
                onChange={setLocationId}
                onCreateClick={() => setShowLocationModal(true)}
              />
            </div>

            <div className="field">
              <label>Freie Plätze</label>
              <input
                type="number"
                min={1}
                value={freeSeats}
                onChange={(e) => setFreeSeats(Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        <details className="card optional-section">
          <summary>Optionale Angaben</summary>

          <div className="optional-section-body">
            <div className="form-row-2">
              <div className="field">
                <label>Genaue Uhrzeit</label>
                <input type="time" value={exactTime} onChange={(e) => setExactTime(e.target.value)} />
                <small>Ohne genaue Uhrzeit nutzt die App {timeWindowDefaults[timeWindow]} Uhr als technischen Start.</small>
              </div>

              <div className="field">
                <label>Bewerbungsmodus</label>
                <select value={joinMode} onChange={(e) => setJoinMode(e.target.value as GameJoinMode)}>
                  <option value={GameJoinMode.FirstComeFirstServe}>Direkter Beitritt</option>
                  <option value={GameJoinMode.ApprovalRequired}>Bewerbung erforderlich</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="field">
                <label>Punkte</label>
                <input value={points} type="number" onChange={(e) => setPoints(e.target.value)} placeholder="z.B. 2000" />
              </div>

              <div className="field">
                <label>Szenario</label>
                <input value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="field">
              <label>Beschreibung</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional: Aufbau, Besonderheiten, was du suchst..."
              />
            </div>

            <div className="field">
              <label>Titel</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional, sonst wird aus System und Tageszeit ein Titel erzeugt"
              />
            </div>
          </div>
        </details>

        {!showTableDetails ? (
          <button type="button" className="secondary-action" onClick={addTableMode}>
            + Weiteren Tisch hinzufügen
          </button>
        ) : (
          <section className="table-details-section">
            <div className="section-heading-row">
              <div>
                <h2>Tische</h2>
                <p className="page-subtitle">Tisch 1 wurde aus deinen Basisangaben übernommen.</p>
              </div>
              <button type="button" onClick={addTable}>
                + Tisch hinzufügen
              </button>
            </div>

            {tables.map((table, index) => (
              <GameTableEditor
                key={index}
                table={table}
                index={index}
                canRemove={tables.length > 1}
                sessionStartTime={gameDate ? `${gameDate}T${effectiveTime}` : ""}
                locationSystemKeys={locationSystemKeys}
                locationSystems={locationSystems}
                onUpdateTable={updateTable}
                onRemoveTable={removeTable}
                onToggleSystem={toggleSystem}
                onCustomSystemsChange={updateCustomSystems}
              />
            ))}
          </section>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Speichere..." : "Spieltermin anbieten"}
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



