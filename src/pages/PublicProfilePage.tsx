import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sendFriendRequest } from "../api/friendsApi";
import { getSystems } from "../api/systemsApi";
import { getPublicUserProfile } from "../api/usersApi";
import DirectMessageButton from "../components/DirectMessageButton";
import Message from "../components/Message";
import { useToast } from "../context/ToastContext";
import { useUser } from "../context/UserContext";
import { listLabel, systemName, systemNames } from "../helpers/systemLabels";
import type { PublicUserProfileResponse, SystemOption } from "../types/game";

type PlatformProfile = {
  label: string;
  value?: string | null;
  hidden: boolean;
  baseUrl: string;
  description: string;
};

function getUsername(value: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("http")) return trimmed.replace(/^@/, "");

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    return (parts.at(-1) ?? url.hostname).replace(/^@/, "");
  } catch {
    return trimmed;
  }
}

function profileHref(value: string, baseUrl?: string) {
  const username = getUsername(value);
  if (value.trim().startsWith("http")) return value.trim();
  return baseUrl && username ? `${baseUrl}${encodeURIComponent(username)}` : null;
}

function ProfileValue({
  label,
  value,
  hidden,
}: {
  label: string;
  value?: string | null;
  hidden?: boolean;
}) {
  if (!value && !hidden) {
    return (
      <div className="public-profile-row is-empty">
        <span>{label}</span>
        <b>Nicht angegeben</b>
      </div>
    );
  }

  return (
    <div className={`public-profile-row ${hidden ? "is-hidden" : ""}`}>
      <span>{label}</span>
      {hidden ? (
        <b>Nicht öffentlich</b>
      ) : (
        <b>{value}</b>
      )}
    </div>
  );
}

function PlatformCard({ platform }: { platform: PlatformProfile }) {
  if (!platform.value && !platform.hidden) return null;

  if (platform.hidden) {
    return (
      <div className="platform-card is-hidden">
        <span>{platform.label}</span>
        <b>Nicht öffentlich</b>
        <small>{platform.description}</small>
      </div>
    );
  }

  const username = getUsername(platform.value ?? "");
  const href = profileHref(platform.value ?? "", platform.baseUrl);

  return (
    <a className="platform-card" href={href ?? undefined} target="_blank" rel="noreferrer">
      <span>{platform.label}</span>
      <b>{username || "Profil öffnen"}</b>
      <small>{platform.description}</small>
    </a>
  );
}

export default function PublicProfilePage() {
  const { userId } = useParams();
  const user = useUser();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<PublicUserProfileResponse | null>(null);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [friendBusy, setFriendBusy] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  const hiddenFields = useMemo(
    () => new Set(profile?.hiddenFields ?? []),
    [profile?.hiddenFields]
  );

  const favoriteSystems = useMemo(
    () => systemNames(profile?.favoriteSystemKeys ?? [], systems),
    [profile?.favoriteSystemKeys, systems]
  );

  const lookingSystem = profile?.lookingForGame?.systemKey
    ? systemName(profile.lookingForGame.systemKey, systems)
    : null;
  const statusText = profile?.lookingForGame?.isActive
    ? lookingSystem ? `Sucht ${lookingSystem}` : "Spieler sucht"
    : "Sucht aktuell kein Spiel";

  useEffect(() => {
    async function load() {
      if (!userId) {
        setError("UserId fehlt.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        const [profileData, systemData] = await Promise.all([
          getPublicUserProfile(userId, user),
          getSystems().catch(() => [] as SystemOption[]),
        ]);

        setProfile(profileData);
        setSystems(systemData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profil konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user, userId]);

  async function addFriend() {
    if (!profile) return;

    setFriendBusy(true);
    try {
      await sendFriendRequest(
        { receiverUserId: profile.userId, receiverDisplayName: profile.displayName },
        user
      );
      setFriendRequestSent(true);
      showToast("success", "Freundschaftsanfrage gesendet");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Anfrage konnte nicht gesendet werden");
    } finally {
      setFriendBusy(false);
    }
  }

  const platforms: PlatformProfile[] = profile
    ? [
        {
          label: "Tabletop.to",
          value: profile.tabletopTo,
          hidden: hiddenFields.has("tabletopTo"),
          baseUrl: "https://tabletop.to/",
          description: "Turniere und Events",
        },
        {
          label: "T3",
          value: profile.t3,
          hidden: hiddenFields.has("t3"),
          baseUrl: "https://www.tabletopturniere.de/t3_user.php?username=",
          description: "Tabletopturniere-Profil",
        },
        {
          label: "NewRecruit",
          value: profile.newRecruit,
          hidden: hiddenFields.has("newRecruit"),
          baseUrl: "https://www.newrecruit.eu/app/user/",
          description: "Listen und Armeen",
        },
        {
          label: "Best Coast Pairings",
          value: profile.bestSportsPairings,
          hidden: hiddenFields.has("bestSportsPairings"),
          baseUrl: "https://www.bestcoastpairings.com/profile/",
          description: "Event- und Pairing-Profil",
        },
        {
          label: "Tabletop Herald",
          value: profile.tabletopHerald,
          hidden: hiddenFields.has("tabletopHerald"),
          baseUrl: "https://tabletop-herald.com/",
          description: "Community-Profil",
        },
      ]
    : [];

  return (
    <main className="container public-profile-page">
      <Link to="/friends" className="back-link">
        Zurück zu Freunde
      </Link>

      <Message text={loading ? "Lade Profil..." : ""} type="info" />
      <Message text={error} type="error" />

      {!loading && profile && (
        <>
          <section className="card public-profile-hero">
            <div className="public-profile-avatar">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt={profile.displayName} />
              ) : (
                <span>{profile.displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            <div className="public-profile-hero-main">
              <div>
                <h1>{profile.displayName}</h1>
                <p>
                  {profile.city
                    ? profile.postalCode
                      ? `${profile.postalCode} ${profile.city}`
                      : profile.city
                    : "Region nicht öffentlich"}
                </p>
              </div>

              <div className="public-profile-badges">
                <span className={profile.lookingForGame?.isActive ? "status-accent" : "status-muted"}>
                  {statusText}
                </span>
                <span className={profile.isFriend ? "status-ok" : "status-muted"}>
                  {profile.isFriend ? "Freund" : "Profil öffentlich"}
                </span>
                {favoriteSystems.slice(0, 3).map((system) => (
                  <span key={system}>{system}</span>
                ))}
              </div>
            </div>

            <div className="public-profile-actions">
              {profile.canBeContacted && profile.userId !== user.userId && (
                <DirectMessageButton
                  recipientUserId={profile.userId}
                  recipientDisplayName={profile.displayName}
                  contextLabel="aus dem öffentlichen Profil"
                />
              )}

              {profile.userId !== user.userId && profile.isFriend && (
                <span className="friend-state-card">Bereits Freund</span>
              )}

              {profile.userId !== user.userId && !profile.isFriend && friendRequestSent && (
                <span className="friend-state-card">Freundschaftsanfrage gesendet</span>
              )}

              {profile.userId !== user.userId && !profile.isFriend && !friendRequestSent && (
                <button type="button" disabled={friendBusy} onClick={addFriend}>
                  {friendBusy ? "Sendet..." : "Freund hinzufügen"}
                </button>
              )}
            </div>
          </section>

          <section className="card public-profile-section">
            <div className="profile-section-heading">
              <div>
                <h2>Öffentliche Angaben</h2>
                <p>Sichtbare Daten werden angezeigt. Verborgene Felder bleiben als nicht öffentlich erkennbar.</p>
              </div>
            </div>
            <div className="public-profile-grid">
              <ProfileValue label="E-Mail" value={profile.email} hidden={hiddenFields.has("email")} />
              <ProfileValue label="Telefon" value={profile.phoneNumber} hidden={hiddenFields.has("phoneNumber")} />
              <ProfileValue label="Straße" value={profile.streetAddress} hidden={hiddenFields.has("streetAddress")} />
              <ProfileValue label="PLZ" value={profile.postalCode} hidden={hiddenFields.has("postalCode")} />
              <ProfileValue label="Ort" value={profile.city} hidden={hiddenFields.has("city")} />
            </div>
          </section>

          <section className="card public-profile-section">
            <div className="profile-section-heading">
              <div>
                <h2>Spielprofil</h2>
                <p>Systeme, Armeen und Suchstatus helfen anderen Spielern beim Einschätzen.</p>
              </div>
            </div>
            <div className="public-profile-grid">
              <div className="public-profile-row highlight">
                <span>Lieblingssysteme</span>
                <b>{listLabel(favoriteSystems)}</b>
              </div>

              <div className="public-profile-row highlight">
                <span>Suchstatus</span>
                <b>{statusText}</b>
                {profile.lookingForGame?.timeNote && <small>{profile.lookingForGame.timeNote}</small>}
                {profile.lookingForGame?.radiusKm && <small>Umkreis: {profile.lookingForGame.radiusKm} km</small>}
              </div>

              {(profile.armies ?? []).length === 0 && (
                <div className="public-profile-row is-empty">
                  <span>Armeen</span>
                  <b>Nicht angegeben</b>
                </div>
              )}

              {(profile.armies ?? []).map((army, index) => (
                <div key={`${army.systemKey}-${army.armyName}-${index}`} className="public-profile-row">
                  <span>{systemName(army.systemKey, systems)}</span>
                  <b>{army.armyName}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="card public-profile-section">
            <div className="profile-section-heading">
              <div>
                <h2>Tabletop-Profile</h2>
                <p>Externe Profile werden als Plattformlinks angezeigt, ohne rohe URLs im Profiltext.</p>
              </div>
            </div>
            <div className="platform-grid">
              {platforms.some((platform) => platform.value || platform.hidden) ? (
                platforms.map((platform) => <PlatformCard key={platform.label} platform={platform} />)
              ) : (
                <div className="public-profile-row is-empty">
                  <span>Externe Profile</span>
                  <b>Nicht angegeben</b>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
