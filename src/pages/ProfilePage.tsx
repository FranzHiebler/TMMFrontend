import { useCallback, useEffect, useState } from "react";
import { getMyLocations } from "../api/locationsApi";
import { useMemo } from "react";
import { getCalendar } from "../api/gamesApi";
import { getCurrentUserProfile, updateCurrentUserProfile, uploadProfileImage } from "../api/usersApi";
import { getSystems } from "../api/systemsApi";
import Message from "../components/Message";
import LocationPicker from "../components/LocationPicker";
import { useUser } from "../context/UserContext";
import type {
  LocationResponse,
  ProfileFieldVisibility,
  SystemOption,
  UserProfileResponse,
  UserProfileVisibility,
  UserArmyProfileDto,
  CalendarItemResponse,
} from "../types/game";
import "leaflet/dist/leaflet.css";

const defaultVisibility: UserProfileVisibility = {
  email: "Private",
  phoneNumber: "Private",
  streetAddress: "Private",
  postalCode: "Private",
  city: "Private",
  tabletopTo: "Public",
  tabletopHerald: "Public",
  t3: "Public",
  newRecruit: "Public",
  bestSportsPairings: "Public",
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function visibilityValue(
  visibility: UserProfileVisibility | undefined,
  key: keyof UserProfileVisibility
): ProfileFieldVisibility {
  return visibility?.[key] ?? defaultVisibility[key];
}

function externalLink(value: string, baseUrl?: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return baseUrl ? `${baseUrl}${encodeURIComponent(trimmed)}` : `https://${trimmed}`;
}

type VisibilitySelectProps = {
  field: keyof UserProfileVisibility;
  visibility: UserProfileVisibility;
  onChange: (field: keyof UserProfileVisibility, value: ProfileFieldVisibility) => void;
};

function VisibilitySelect({ field, visibility, onChange }: VisibilitySelectProps) {
  const currentValue = visibilityValue(visibility, field);

  const options: { value: ProfileFieldVisibility; label: string }[] = [
    { value: "Public", label: "Öffentlich" },
    { value: "FriendsOnly", label: "Nur Freunde" },
    { value: "Private", label: "Privat" },
  ];

  return (
    <div className="visibility-radio-list" role="radiogroup" aria-label="Sichtbarkeit">
      {options.map((option) => (
        <label key={option.value} className="visibility-radio-option">
          <input
            type="radio"
            name={`visibility-${field}`}
            value={option.value}
            checked={currentValue === option.value}
            onChange={() => onChange(field, option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const user = useUser();

  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItemResponse[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [tabletopTo, setTabletopTo] = useState("");
  const [tabletopHerald, setTabletopHerald] = useState("");
  const [t3, setT3] = useState("");
  const [newRecruit, setNewRecruit] = useState("");
  const [bestSportsPairings, setBestSportsPairings] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [defaultLocationId, setDefaultLocationId] = useState("");
  const [canBeContacted, setCanBeContacted] = useState(true);
  const [hideProfile, setHideProfile] = useState(false);
  const [hideOnMap, setHideOnMap] = useState(false);
  const [hideParticipation, setHideParticipation] = useState(false);
  const [visibility, setVisibility] = useState<UserProfileVisibility>(defaultVisibility);
  const [favoriteSystemKeys, setFavoriteSystemKeys] = useState<string[]>([]);
  const [armies, setArmies] = useState<UserArmyProfileDto[]>([]);
  const [armySystemKey, setArmySystemKey] = useState("");
  const [armyName, setArmyName] = useState("");
  const [lookingActive, setLookingActive] = useState(false);
  const [lookingSystemKey, setLookingSystemKey] = useState("");
  const [lookingRadiusKm, setLookingRadiusKm] = useState("");
  const [lookingTimeNote, setLookingTimeNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [resolvingPosition, setResolvingPosition] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setError("");

      const [profileData, locationData, systemData, calendarData] = await Promise.all([
        getCurrentUserProfile(user),
        getMyLocations(user),
        getSystems(),
        getCalendar(user).catch(() => []),
      ]);

      setProfile(profileData);
      setLocations(locationData);
      setSystems(systemData);
      setCalendarItems(calendarData);
      setDisplayName(profileData.displayName);
      setFirstName(profileData.firstName ?? "");
      setLastName(profileData.lastName ?? "");
      setEmail(profileData.email ?? "");
      setPhoneNumber(profileData.phoneNumber ?? "");
      setStreetAddress(profileData.streetAddress ?? "");
      setPostalCode(profileData.postalCode ?? "");
      setCity(profileData.city ?? "");
      setLatitude(profileData.latitude ?? null);
      setLongitude(profileData.longitude ?? null);
      setTabletopTo(profileData.tabletopTo ?? "");
      setTabletopHerald(profileData.tabletopHerald ?? "");
      setT3(profileData.t3 ?? "");
      setNewRecruit(profileData.newRecruit ?? "");
      setBestSportsPairings(profileData.bestSportsPairings ?? "");
      setProfileImageUrl(profileData.profileImageUrl ?? "");
      setDefaultLocationId(profileData.defaultLocationId ?? "");
      setCanBeContacted(profileData.canBeContacted ?? true);
      setHideProfile(profileData.hideProfile ?? false);
      setHideOnMap(profileData.hideOnMap ?? false);
      setHideParticipation(profileData.hideParticipation ?? false);
      setVisibility({ ...defaultVisibility, ...(profileData.visibility ?? {}) });
      setFavoriteSystemKeys(profileData.favoriteSystemKeys ?? []);
      setArmies(profileData.armies ?? []);
      setLookingActive(profileData.lookingForGame?.isActive ?? false);
      setLookingSystemKey(profileData.lookingForGame?.systemKey ?? "");
      setLookingRadiusKm(profileData.lookingForGame?.radiusKm?.toString() ?? "");
      setLookingTimeNote(profileData.lookingForGame?.timeNote ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadProfile]);

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [success]);

  function resetPosition() {
    setLatitude(null);
    setLongitude(null);
  }

  function updateVisibility(key: keyof UserProfileVisibility, value: ProfileFieldVisibility) {
    setVisibility((prev) => ({ ...prev, [key]: value }));
  }

  function systemName(key: string) {
    return systems.find((system) => system.key === key)?.name ?? key;
  }

  function toggleFavoriteSystem(key: string) {
    setFavoriteSystemKeys((prev) =>
      prev.includes(key) ? prev.filter((value) => value !== key) : [...prev, key]
    );
  }

  function addArmy() {
    const trimmed = armyName.trim();
    if (!armySystemKey || !trimmed) return;

    setArmies((prev) => [...prev, { systemKey: armySystemKey, armyName: trimmed }]);
    setArmyName("");
  }

  function removeArmy(index: number) {
    setArmies((prev) => prev.filter((_, i) => i !== index));
  }

  async function resolvePositionFromAddress() {
    if (!streetAddress.trim() || !postalCode.trim() || !city.trim()) {
      setError("Bitte Straße, PLZ und Ort ausfüllen.");
      return;
    }

    const address = [streetAddress, postalCode, city, "Deutschland"]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");

    try {
      setResolvingPosition(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          address
        )}`
      );

      if (!response.ok) {
        throw new Error("Geocoding fehlgeschlagen.");
      }

      const data = (await response.json()) as { lat: string; lon: string }[];

      if (data.length === 0) {
        resetPosition();
        setError("Adresse konnte nicht gefunden werden.");
        return;
      }

      setLatitude(Number(data[0].lat));
      setLongitude(Number(data[0].lon));
      setSuccess("Position aus Adresse ermittelt.");
    } catch (err) {
      resetPosition();
      setError(err instanceof Error ? err.message : "Position konnte nicht ermittelt werden.");
    } finally {
      setResolvingPosition(false);
    }
  }

  async function handleProfileImageUpload() {
    if (!profileImageFile) {
      setError("Bitte wähle ein Bild aus.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(profileImageFile.type)) {
      setError("Bitte lade ein JPG-, PNG- oder WEBP-Bild hoch.");
      return;
    }

    if (profileImageFile.size > 2 * 1024 * 1024) {
      setError("Profilbild darf maximal 2 MB groß sein.");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");
      setSuccess("");

      const updated = await uploadProfileImage(profileImageFile, user);
      setProfile(updated);
      setProfileImageUrl(updated.profileImageUrl ?? "");
      setProfileImageFile(null);
      setSuccess("Profilbild hochgeladen.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profilbild konnte nicht hochgeladen werden.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handleProfileImageFileChange(file: File | null) {
    setSuccess("");

    if (!file) {
      setProfileImageFile(null);
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileImageFile(null);
      setError("Bitte lade ein JPG-, PNG- oder WEBP-Bild hoch.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileImageFile(null);
      setError("Profilbild darf maximal 2 MB groß sein.");
      return;
    }

    setError("");
    setProfileImageFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if ((latitude == null) !== (longitude == null)) {
      setError("Latitude und Longitude müssen gemeinsam gesetzt oder beide leer sein.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updated = await updateCurrentUserProfile(
        {
          displayName,
          firstName: emptyToNull(firstName),
          lastName: emptyToNull(lastName),
          email: emptyToNull(email),
          phoneNumber: emptyToNull(phoneNumber),
          streetAddress: emptyToNull(streetAddress),
          postalCode: emptyToNull(postalCode),
          city: emptyToNull(city),
          latitude,
          longitude,
          tabletopTo: emptyToNull(tabletopTo),
          tabletopHerald: emptyToNull(tabletopHerald),
          t3: emptyToNull(t3),
          newRecruit: emptyToNull(newRecruit),
          bestSportsPairings: emptyToNull(bestSportsPairings),
          profileImageUrl: emptyToNull(profileImageUrl),
          defaultLocationId: defaultLocationId || null,
          canBeContacted,
          hideProfile,
          hideOnMap,
          hideParticipation,
          visibility,
          favoriteSystemKeys,
          armies,
          lookingForGame: {
            isActive: lookingActive,
            systemKey: lookingActive ? emptyToNull(lookingSystemKey) : null,
            radiusKm: lookingActive && lookingRadiusKm ? Number(lookingRadiusKm) : null,
            timeNote: lookingActive ? emptyToNull(lookingTimeNote) : null,
          },
        },
        user
      );

      setProfile(updated);
      user.setUser({
        ...user,
        userId: updated.userId,
        displayName: updated.displayName,
      });

      setSuccess("Profil gespeichert.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profil konnte nicht gespeichert werden.");
    } finally {
      setSaving(false);
    }
  }

  const visibilitySelect = (field: keyof UserProfileVisibility) => (
    <VisibilitySelect field={field} visibility={visibility} onChange={updateVisibility} />
  );

  const profileLinkPreview = (value: string, baseUrl?: string) => {
    const href = externalLink(value, baseUrl);
    if (!href) return null;

    return (
      <a className="profile-preview-link" href={href} target="_blank" rel="noreferrer">
        Link öffnen
      </a>
    );
  };

  const profileImagePreviewUrl = useMemo(
    () => (profileImageFile ? URL.createObjectURL(profileImageFile) : ""),
    [profileImageFile]
  );

  useEffect(() => {
    if (!profileImagePreviewUrl) return;
    return () => URL.revokeObjectURL(profileImagePreviewUrl);
  }, [profileImagePreviewUrl]);

  const visibleProfileImageUrl = profileImagePreviewUrl || profileImageUrl;

  return (
    <main className="container">
      <Message text={loading ? "Lade Profil..." : ""} type="info" />
      <Message text={error} type="error" />
      <Message text={success} type="success" />

      {!loading && profile && (
        <form className="form profile-form profile-form-modern" onSubmit={handleSubmit}>
          <section className="card profile-hero-card">
            <div className="profile-avatar">
              {visibleProfileImageUrl ? <img src={visibleProfileImageUrl} alt="" /> : <span>{displayName.slice(0, 2).toUpperCase()}</span>}
            </div>
            <div>
              <p className="panel-kicker">Mein Profil</p>
              <h1>{displayName || "Mein Profil"}</h1>
              <div className="profile-status-row">
                <span className={!hideOnMap ? "status-ok" : "status-muted"}>
                  {!hideOnMap ? "Auf Karte sichtbar" : "Nicht auf Karte"}
                </span>
                <span className={!hideProfile ? "status-ok" : "status-muted"}>
                  {!hideProfile ? "Profil öffentlich" : "Profil versteckt"}
                </span>
                {lookingActive && <span className="status-accent">Sucht gerade ein Spiel</span>}
              </div>
            </div>
          </section>

          <section className="card profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h2>Öffentliche Angaben</h2>
                <p>Diese Daten bilden dein Profil. Sichtbarkeit stellst du direkt am jeweiligen Feld ein.</p>
              </div>
            </div>

            <div className="field">
              <label>Anzeigename</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div className="form-row-2">
              <div className="field">
                <label>Vorname</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>

              <div className="field">
                <label>Nachname</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="field profile-image-upload-field">
              <label>Profilbild</label>
              <div className="profile-image-upload-box">
                <div className="profile-image-upload-preview">
                  {visibleProfileImageUrl ? (
                    <img src={visibleProfileImageUrl} alt="" />
                  ) : (
                    <span>{displayName.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="profile-image-upload-content">
                  <strong>Bild vom Gerät hochladen</strong>
                  <small className="field-hint">JPG, PNG oder WEBP bis maximal 2 MB.</small>
                  <div className="profile-image-upload-row">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleProfileImageFileChange(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      disabled={!profileImageFile || uploadingImage}
                      onClick={handleProfileImageUpload}
                    >
                      {uploadingImage ? "Lade hoch..." : "Bild hochladen"}
                    </button>
                  </div>
                  {profileImageFile && (
                    <small className="field-hint">
                      Ausgewählt: {profileImageFile.name}
                    </small>
                  )}
                </div>
              </div>
            </div>

            <details className="optional-section">
              <summary>Stattdessen Bild-URL verwenden</summary>
              <div className="optional-section-body">
                <div className="field">
                  <label>Profilbild-URL</label>
                  <input value={profileImageUrl} onChange={(e) => setProfileImageUrl(e.target.value)} />
                  <small className="field-hint">Falls du lieber ein externes Bild verwenden möchtest.</small>
                </div>
              </div>
            </details>

            <label className="checkbox-row profile-toggle-card">
              <input
                type="checkbox"
                checked={canBeContacted}
                onChange={(e) => setCanBeContacted(e.target.checked)}
              />
              <span>
                Darf angeschrieben werden
                <small className="field-hint">Andere Spieler können dich über Nachrichten kontaktieren.</small>
              </span>
            </label>

            <div className="profile-field-with-visibility">
              <div className="field">
                <label>E-Mail</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
                {visibilitySelect("email")}
              </div>

              <div className="field">
                <label>Telefonnummer</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                {visibilitySelect("phoneNumber")}
              </div>
            </div>
          </section>

          <section className="card profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h2>Standort & Karte</h2>
                <p>Stadt öffentlich macht dich ungefähr auffindbar. Straße öffentlich kann einen genaueren Standort erlauben.</p>
              </div>
            </div>

            <label className="checkbox-row profile-toggle-card">
              <input type="checkbox" checked={hideOnMap} onChange={(e) => setHideOnMap(e.target.checked)} />
              <span>
                Mich nicht auf der Karte anzeigen
                <small className="field-hint">Ungefähre Positionen werden auf der Karte entsprechend markiert.</small>
              </span>
            </label>

            <div className="field">
              <label>Standard-Spielort</label>
              <select value={defaultLocationId} onChange={(e) => setDefaultLocationId(e.target.value)}>
                <option value="">Kein Standard-Spielort</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="profile-field-with-visibility">
              <div className="field">
                <label>Straße / Adresse</label>
                <input
                  value={streetAddress}
                  onChange={(e) => {
                    setStreetAddress(e.target.value);
                    resetPosition();
                  }}
                />
                {visibilitySelect("streetAddress")}
              </div>

              <div className="field">
                <label>PLZ</label>
                <input
                  value={postalCode}
                  onChange={(e) => {
                    setPostalCode(e.target.value);
                    resetPosition();
                  }}
                />
                {visibilitySelect("postalCode")}
              </div>

              <div className="field">
                <label>Ort</label>
                <input
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    resetPosition();
                  }}
                />
                {visibilitySelect("city")}
              </div>

              <div className="field profile-geo-picker">
                <label>Position für Karte und Suche</label>

                <div className="profile-geo-actions">
                  <button type="button" disabled={resolvingPosition} onClick={resolvePositionFromAddress}>
                    {resolvingPosition ? "Ermittle Position..." : "Position aus Adresse ermitteln"}
                  </button>

                  <button type="button" onClick={resetPosition}>
                    Position zurücksetzen
                  </button>
                </div>

                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  onChange={(lat, lng) => {
                    setLatitude(lat);
                    setLongitude(lng);
                  }}
                />

                {latitude != null && longitude != null ? (
                  <p className="field-hint">
                    Koordinaten gesetzt: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                  </p>
                ) : (
                  <p className="field-hint">
                    Position fehlt. Das Profil kann gespeichert werden, erscheint dann aber nicht auf der Karte.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h2>Tabletop-Profile</h2>
                <p>Diese Links können andere Spieler auf deinem öffentlichen Profil sehen, je nach Sichtbarkeit.</p>
              </div>
            </div>

            <div className="profile-field-with-visibility">
              <div className="field">
                <label>Tabletop.to</label>
                <input value={tabletopTo} onChange={(e) => setTabletopTo(e.target.value)} />
                {profileLinkPreview(tabletopTo, "https://tabletop.to/")}
                {visibilitySelect("tabletopTo")}
              </div>

              <div className="field">
                <label>Tabletop Herald</label>
                <input value={tabletopHerald} onChange={(e) => setTabletopHerald(e.target.value)} />
                {profileLinkPreview(tabletopHerald, "https://tabletop-herald.com/")}
                {visibilitySelect("tabletopHerald")}
              </div>

              <div className="field">
                <label>T3</label>
                <input value={t3} onChange={(e) => setT3(e.target.value)} />
                {profileLinkPreview(t3, "https://www.tabletopturniere.de/t3_user.php?username=")}
                {visibilitySelect("t3")}
              </div>

              <div className="field">
                <label>NewRecruit</label>
                <input value={newRecruit} onChange={(e) => setNewRecruit(e.target.value)} />
                {profileLinkPreview(newRecruit, "https://www.newrecruit.eu/app/user/")}
                {visibilitySelect("newRecruit")}
              </div>

              <div className="field">
                <label>Best Coast Pairings / BCP</label>
                <input
                  value={bestSportsPairings}
                  onChange={(e) => setBestSportsPairings(e.target.value)}
                />
                {profileLinkPreview(bestSportsPairings, "https://www.bestcoastpairings.com/profile/")}
                {visibilitySelect("bestSportsPairings")}
              </div>
            </div>
          </section>

          <section className="card profile-section-card profile-matchmaking-card">
            <div className="profile-section-heading">
              <div>
                <h2>Systeme & Armeen</h2>
                <p>Hilft bei Suche, Karte, Spielgesuchen und deinem öffentlichen Profil.</p>
              </div>
            </div>

            <div className="field">
              <label>Lieblingssysteme</label>
              <div className="systems-checkboxes">
                {systems.map((system) => (
                  <label key={system.key}>
                    <input
                      type="checkbox"
                      checked={favoriteSystemKeys.includes(system.key)}
                      onChange={() => toggleFavoriteSystem(system.key)}
                    />
                    {system.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Armeen</label>
              <div className="inline-add-system">
                <select value={armySystemKey} onChange={(e) => setArmySystemKey(e.target.value)}>
                  <option value="">System wählen</option>
                  {systems.map((system) => (
                    <option key={system.key} value={system.key}>{system.name}</option>
                  ))}
                </select>
                <input value={armyName} onChange={(e) => setArmyName(e.target.value)} placeholder="z.B. Space Wolves" />
                <button type="button" onClick={addArmy}>Armee hinzufügen</button>
              </div>

              {armies.length > 0 && (
                <div className="system-badge-row">
                  {armies.map((army, index) => (
                    <button key={`${army.systemKey}-${army.armyName}-${index}`} type="button" className="system-badge removable" onClick={() => removeArmy(index)}>
                      {systemName(army.systemKey)}: {army.armyName} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="checkbox-row profile-toggle-card">
              <input type="checkbox" checked={lookingActive} onChange={(e) => setLookingActive(e.target.checked)} />
              <span>
                Spieler sucht
                <small className="field-hint">Zeigt anderen, dass du aktuell ein Spiel suchst.</small>
              </span>
            </label>

            {lookingActive && (
              <div className="form-row-2">
                <div className="field">
                  <label>System</label>
                  <select value={lookingSystemKey} onChange={(e) => setLookingSystemKey(e.target.value)}>
                    <option value="">Egal / offen</option>
                    {systems.map((system) => (
                      <option key={system.key} value={system.key}>{system.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Umkreis</label>
                  <div className="input-with-unit">
                    <input type="number" min={1} max={500} value={lookingRadiusKm} onChange={(e) => setLookingRadiusKm(e.target.value)} />
                    <span>km</span>
                  </div>
                </div>

                <div className="field">
                  <label>Grobe Zeit / Notiz</label>
                  <input value={lookingTimeNote} onChange={(e) => setLookingTimeNote(e.target.value)} placeholder="z.B. Freitag Abend" />
                </div>
              </div>
            )}
          </section>

          <section className="card profile-section-card">
            <div className="profile-section-heading">
              <div>
                <h2>Privatsphäre</h2>
                <p>Öffentlich, Nur Freunde oder Privat steuerst du direkt an Kontakt-, Standort- und Profilfeldern.</p>
              </div>
            </div>

            <label className="checkbox-row profile-toggle-card">
              <input type="checkbox" checked={!hideProfile} onChange={(e) => setHideProfile(!e.target.checked)} />
              <span>
                Mein Profil darf gefunden werden
                <small className="field-hint">Andere Spieler können dein öffentliches Profil öffnen.</small>
              </span>
            </label>
            <label className="checkbox-row profile-toggle-card">
              <input type="checkbox" checked={!hideParticipation} onChange={(e) => setHideParticipation(!e.target.checked)} />
              <span>
                Meine Teilnahmen anzeigen
                <small className="field-hint">Vorbereitet: wird bei öffentlichen Spieltermin-Ansichten später vollständig berücksichtigt.</small>
              </span>
            </label>
          </section>

          <section className="card profile-section-card">
            <h2>Spielhistorie</h2>
            {calendarItems.filter((item) => item.status === "Closed").length === 0 && (
              <p className="field-hint">Noch keine abgeschlossenen Spiele.</p>
            )}
            {calendarItems.filter((item) => item.status === "Closed").slice(0, 8).map((item) => (
              <div key={item.id} className="list-row">
                <b>{item.title}</b>
                <span>{item.startTimeUtc ? new Date(item.startTimeUtc).toLocaleDateString("de-DE") : "Termin offen"}</span>
              </div>
            ))}
          </section>

          <div className="profile-save-bar">
            <button type="submit" disabled={saving}>
              {saving ? "Speichert..." : "Profil speichern"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

