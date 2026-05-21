import { useCallback, useEffect, useState } from "react";
import { getMyLocations } from "../api/locationsApi";
import { getCurrentUserProfile, updateCurrentUserProfile } from "../api/usersApi";
import Message from "../components/Message";
import LocationPicker from "../components/LocationPicker";
import { useUser } from "../context/UserContext";
import type {
  LocationResponse,
  ProfileFieldVisibility,
  UserProfileResponse,
  UserProfileVisibility,
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
  const [displayName, setDisplayName] = useState("");
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
  const [defaultLocationId, setDefaultLocationId] = useState("");
  const [canBeContacted, setCanBeContacted] = useState(true);
  const [visibility, setVisibility] = useState<UserProfileVisibility>(defaultVisibility);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvingPosition, setResolvingPosition] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      setError("");

      const [profileData, locationData] = await Promise.all([
        getCurrentUserProfile(user),
        getMyLocations(user),
      ]);

      setProfile(profileData);
      setLocations(locationData);
      setDisplayName(profileData.displayName);
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
      setVisibility({ ...defaultVisibility, ...(profileData.visibility ?? {}) });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (latitude == null || longitude == null) {
      setError("Bitte zuerst die Position aus der Adresse ermitteln.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const updated = await updateCurrentUserProfile(
        {
          displayName,
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
          visibility,
        },
        user
      );

      setProfile(updated);
      user.setUser({
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

  return (
    <main className="container">
      <h1>Mein Profil</h1>

      <Message text={loading ? "Lade Profil..." : ""} type="info" />
      <Message text={error} type="error" />
      <Message text={success} type="success" />

      {!loading && profile && (
        <form className="card form profile-form" onSubmit={handleSubmit}>
          <h2>Basisdaten</h2>

          <div className="field">
            <label>Anzeigename</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="field">
            <label>Profilbild-URL</label>
            <input value={profileImageUrl} onChange={(e) => setProfileImageUrl(e.target.value)} />
          </div>

          <div className="field">
            <label>Standard-Location</label>
            <select value={defaultLocationId} onChange={(e) => setDefaultLocationId(e.target.value)}>
              <option value="">Keine Standard-Location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.city})
                </option>
              ))}
            </select>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={canBeContacted}
              onChange={(e) => setCanBeContacted(e.target.checked)}
            />
            Darf angeschrieben werden
          </label>

          <h2>Kontakt</h2>

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
              <label>Position für Suche</label>

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
                  Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                </p>
              ) : (
                <p className="field-hint">
                  Position fehlt. Ohne Koordinaten kann das Profil nicht gespeichert werden.
                </p>
              )}
            </div>
          </div>

          <h2>Tabletop-Profile</h2>

          <div className="profile-field-with-visibility">
            <div className="field">
              <label>TabletopTO</label>
              <input value={tabletopTo} onChange={(e) => setTabletopTo(e.target.value)} />
              {visibilitySelect("tabletopTo")}
            </div>

            <div className="field">
              <label>Tabletop Herald</label>
              <input value={tabletopHerald} onChange={(e) => setTabletopHerald(e.target.value)} />
              {visibilitySelect("tabletopHerald")}
            </div>

            <div className="field">
              <label>T3</label>
              <input value={t3} onChange={(e) => setT3(e.target.value)} />
              {visibilitySelect("t3")}
            </div>

            <div className="field">
              <label>NewRecruit</label>
              <input value={newRecruit} onChange={(e) => setNewRecruit(e.target.value)} />
              {visibilitySelect("newRecruit")}
            </div>

            <div className="field">
              <label>Best Coast Pairings / BCP</label>
              <input
                value={bestSportsPairings}
                onChange={(e) => setBestSportsPairings(e.target.value)}
              />
              {visibilitySelect("bestSportsPairings")}
            </div>
          </div>

          <button type="submit" disabled={saving || latitude == null || longitude == null}>
            {saving ? "Speichert..." : "Profil speichern"}
          </button>
        </form>
      )}
    </main>
  );
}