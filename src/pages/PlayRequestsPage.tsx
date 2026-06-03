import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPlayRequest, getMyPlayRequests, getPlayRequests, closePlayRequest } from "../api/playRequestsApi";
import { getMyLocations } from "../api/locationsApi";
import { getSystems } from "../api/systemsApi";
import LocationModal from "../components/LocationModal";
import LocationSelect from "../components/LocationSelect";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import { systemName } from "../helpers/systemLabels";
import type { LocationResponse, PlayRequestDto, SystemOption } from "../types/game";

type WizardStep = 0 | 1 | 2 | 3 | 4;

const wizardSteps = [
  "Was suchst du?",
  "Wo?",
  "Wann?",
  "Umkreis",
  "Vorschau",
] as const;

function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function precisionLabel(precision?: PlayRequestDto["locationPrecision"]) {
  if (precision === "exact") return "Genauer Spielort";
  if (precision === "approximate") return "Ungefährer Standort";
  return "Ohne Standort";
}

export default function PlayRequestsPage() {
  const user = useUser();
  const [searchParams] = useSearchParams();
  const highlightedRequestId = searchParams.get("requestId");
  const [requests, setRequests] = useState<PlayRequestDto[]>([]);
  const [mine, setMine] = useState<PlayRequestDto[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [systemKey, setSystemKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [exactDate, setExactDate] = useState("");
  const [exactTime, setExactTime] = useState("");
  const [radiusKm, setRadiusKm] = useState("50");
  const [note, setNote] = useState("");
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedLocation = locations.find((location) => location.id === locationId);
  const selectedSystemName = useMemo(
    () => (systemKey ? systemName(systemKey, systems) : ""),
    [systemKey, systems]
  );
  const exactTimeUtc = exactDate && exactTime ? combineDateAndTime(exactDate, exactTime) : null;
  const previewLocation = selectedLocation
    ? `${selectedLocation.name}, ${selectedLocation.city}`
    : "Ohne festen Spielort";
  const previewPrecision = selectedLocation
    ? "Standort nach Spielort-Sichtbarkeit"
    : "Ungefährer Standort, falls dein Profil das erlaubt";

  const load = useCallback(async () => {
    const [all, my, sys, locs] = await Promise.all([
      getPlayRequests(user),
      getMyPlayRequests(user),
      getSystems().catch(() => []),
      getMyLocations(user).catch(() => []),
    ]);
    setRequests(all);
    setMine(my);
    setSystems(sys);
    setLocations(locs);
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load().catch((err) => setError(err instanceof Error ? err.message : "Spielgesuche konnten nicht geladen werden."));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  useEffect(() => {
    const prompt = searchParams.get("prompt");
    if (!prompt) return;
    const timeout = window.setTimeout(() => setNote(prompt), 0);
    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  useEffect(() => {
    if (!highlightedRequestId) return;

    const timeout = window.setTimeout(() => {
      document
        .getElementById(`play-request-${highlightedRequestId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [highlightedRequestId, requests, mine]);

  function validateStep(step: WizardStep) {
    if (step === 0 && !systemKey) {
      return "Bitte wähle ein System aus.";
    }

    if (step === 3 && radiusKm && Number(radiusKm) < 1) {
      return "Bitte wähle einen Umkreis ab 1 km.";
    }

    if (step === 2 && ((exactDate && !exactTime) || (!exactDate && exactTime))) {
      return "Bitte Datum und Uhrzeit zusammen ausfüllen oder beide Felder leer lassen.";
    }

    return "";
  }

  function goToNextStep() {
    const validationError = validateStep(currentStep);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1) as WizardStep);
  }

  function goToPreviousStep() {
    setError("");
    setCurrentStep((step) => Math.max(step - 1, 0) as WizardStep);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (currentStep < wizardSteps.length - 1) {
      goToNextStep();
      return;
    }

    for (let step = 0; step < wizardSteps.length - 1; step += 1) {
      const validationError = validateStep(step as WizardStep);
      if (validationError) {
        setCurrentStep(step as WizardStep);
        setError(validationError);
        return;
      }
    }

    try {
      setError("");
      await createPlayRequest(
        {
          systemKey,
          locationId: locationId || null,
          timeNote: timeNote || null,
          exactTimeUtc,
          radiusKm: radiusKm ? Number(radiusKm) : null,
          note: note || null,
        },
        user
      );
      setMessage("Spielgesuch veröffentlicht.");
      setSystemKey("");
      setLocationId("");
      setTimeNote("");
      setExactDate("");
      setExactTime("");
      setRadiusKm("50");
      setNote("");
      setCurrentStep(0);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spielgesuch konnte nicht erstellt werden.");
    }
  }

  async function close(id: string) {
    await closePlayRequest(id, user);
    await load();
  }

  return (
    <main className="container">
      <div className="page-header">
        <div>
          <h1>Spielgesuche</h1>
          <p className="page-subtitle">Leichter Einstieg: Ich suche ein Spiel.</p>
        </div>
        <Link className="nav-create-button" to="/games/create">Spieltermin anbieten</Link>
      </div>

      <Message text={message} type="success" />
      <Message text={error} type="error" />

      <form className="form create-game-form-v2" onSubmit={submit}>
        <section className="card simple-session-card create-game-wizard">
          <div>
            <p className="panel-kicker">Neues Spielgesuch</p>
            <h2>Spiel suchen</h2>
            <p className="page-subtitle">
              Schritt {currentStep + 1} von {wizardSteps.length}: {wizardSteps[currentStep]}
            </p>
          </div>

          <div className="wizard-progress" aria-label="Fortschritt">
            {wizardSteps.map((step, index) => (
              <button
                key={step}
                type="button"
                className={index === currentStep ? "active" : index < currentStep ? "done" : ""}
                onClick={() => {
                  if (index <= currentStep) {
                    setCurrentStep(index as WizardStep);
                    setError("");
                  }
                }}
              >
                <span>{index + 1}</span>
                {step}
              </button>
            ))}
          </div>

          {currentStep === 0 && (
            <div className="wizard-step">
              <p className="inline-help">Sag anderen, was du gerne spielen möchtest.</p>
              <div className="field">
                <label>System</label>
                <select value={systemKey} onChange={(e) => setSystemKey(e.target.value)}>
                  <option value="">System wählen</option>
                  {systems.map((system) => (
                    <option key={system.key} value={system.key}>{system.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Kurze Notiz</label>
                <textarea
                  className="notes-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional: Was suchst du genau?"
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="wizard-step">
              <div className="field">
                <label>Spielort</label>
                <LocationSelect
                  locations={locations}
                  value={locationId}
                  onChange={setLocationId}
                  onCreateClick={() => setShowLocationModal(true)}
                />
              </div>
              {!locationId && (
                <Message
                  type="info"
                  text="Ohne festen Spielort kann die App deinen sichtbaren oder ungefähren Profilstandort nutzen, falls deine Profileinstellungen das erlauben."
                />
              )}
              {selectedLocation && (
                <p className="inline-help">Ausgewählt: {selectedLocation.name}, {selectedLocation.city}</p>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="wizard-step">
              <div className="field">
                <label>Zeitnotiz</label>
                <input
                  value={timeNote}
                  onChange={(e) => setTimeNote(e.target.value)}
                  placeholder="z.B. unter der Woche abends, Wochenende, Freitag ab 18 Uhr"
                />
              </div>
              <details className="optional-section">
                <summary>Konkreten Zeitpunkt ergänzen</summary>
                <div className="optional-section-body form-row-2">
                  <div className="field">
                    <label>Datum</label>
                    <input type="date" value={exactDate} onChange={(e) => setExactDate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Uhrzeit</label>
                    <input type="time" value={exactTime} onChange={(e) => setExactTime(e.target.value)} />
                  </div>
                </div>
              </details>
            </div>
          )}

          {currentStep === 3 && (
            <div className="wizard-step">
              <div className="field">
                <label>Umkreis: {radiusKm || 50} km</label>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={5}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                />
                <div className="range-scale">
                  <small>5 km</small>
                  <small>200 km</small>
                </div>
              </div>
              <div className="field">
                <label>Genauer Wert</label>
                <input type="number" min={1} max={500} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} />
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="wizard-step">
              <div className="create-preview-card">
                <div>
                  <small>System</small>
                  <strong>{selectedSystemName || "System fehlt"}</strong>
                </div>
                <div>
                  <small>Ort / Region</small>
                  <strong>{previewLocation}</strong>
                </div>
                <div>
                  <small>Standort</small>
                  <strong>{previewPrecision}</strong>
                </div>
                <div>
                  <small>Zeitraum</small>
                  <strong>{timeNote || (exactTimeUtc ? new Date(exactTimeUtc).toLocaleString("de-DE") : "Offen")}</strong>
                </div>
                <div>
                  <small>Umkreis</small>
                  <strong>{radiusKm || 50} km</strong>
                </div>
                <div>
                  <small>Notiz</small>
                  <strong>{note || "Keine Notiz"}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="wizard-actions">
            <button type="button" className="secondary-action" disabled={currentStep === 0} onClick={goToPreviousStep}>
              Zurück
            </button>
            {currentStep < wizardSteps.length - 1 ? (
              <button type="button" onClick={goToNextStep}>Weiter</button>
            ) : (
              <button type="submit">Spielgesuch veröffentlichen</button>
            )}
          </div>
        </section>
      </form>

      <section className="card">
        <h2>Meine Spielgesuche</h2>
        {mine.length === 0 && <p className="muted">Noch keine eigenen Spielgesuche.</p>}
        {mine.map((request) => (
          <div
            key={request.id}
            id={request.isMine ? undefined : `play-request-${request.id}`}
            className={`list-row ${!request.isMine && highlightedRequestId === request.id ? "context-highlight" : ""}`}
          >
            <b>{systemName(request.systemKey, systems)}</b>
            <span>
              {request.timeNote || "Zeit offen"} · {request.status} · {precisionLabel(request.locationPrecision)}
            </span>
            {request.note && <small>{request.note}</small>}
            {request.status === "Open" && <button type="button" onClick={() => close(request.id)}>Schließen</button>}
            {request.convertedGameId && <Link to={`/sessions/${request.convertedGameId}`}>Spieltermin öffnen</Link>}
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Offene Gesuche</h2>
        {requests.length === 0 && <p className="muted">Keine offenen Spielgesuche.</p>}
        {requests.map((request) => (
          <div
            key={request.id}
            id={`play-request-${request.id}`}
            className={`list-row ${highlightedRequestId === request.id ? "context-highlight" : ""}`}
          >
            <b>{request.owner.displayName}</b>
            <span>
              {systemName(request.systemKey, systems)} · {request.timeNote || "Zeit offen"} ·{" "}
              {precisionLabel(request.locationPrecision)}
            </span>
            {request.city && <small>Region: {request.city}</small>}
            {request.radiusKm != null && <small>Umkreis: {request.radiusKm} km</small>}
            {request.note && <small>{request.note}</small>}
          </div>
        ))}
      </section>

      {showLocationModal && (
        <LocationModal
          onClose={() => setShowLocationModal(false)}
          onCreated={(location) => {
            setLocations((current) => [...current, location]);
            setLocationId(location.id);
            setShowLocationModal(false);
          }}
        />
      )}
    </main>
  );
}
