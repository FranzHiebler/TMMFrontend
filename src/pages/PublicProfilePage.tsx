import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicUserProfile } from "../api/usersApi";
import DirectMessageButton from "../components/DirectMessageButton";
import Message from "../components/Message";
import { useUser } from "../context/UserContext";
import type { PublicUserProfileResponse } from "../types/game";

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

function ProfileValue({
    label,
    value,
    hidden,
    baseUrl,
}: {
    label: string;
    value?: string | null;
    hidden?: boolean;
    baseUrl?: string;
}) {
    if (!value && !hidden) return null;

    const username = value ? getUsername(value) : "";
    const href = value?.trim().startsWith("http")
        ? value.trim()
        : baseUrl && username
            ? `${baseUrl}${encodeURIComponent(username)}`
            : null;

    return (
        <div className={`public-profile-row ${hidden ? "is-hidden" : ""}`}>
            <span>{label}</span>

            {hidden ? (
                <>
                    <b>••••••</b>
                    <small>Ausgeblendet</small>
                </>
            ) : href ? (
                <a className="profile-link" href={href} target="_blank" rel="noreferrer">
                    {username}
                </a>
            ) : (
                <b>{username}</b>
            )}
        </div>
    );
}

export default function PublicProfilePage() {
    const { userId } = useParams();
    const user = useUser();

    const [profile, setProfile] = useState<PublicUserProfileResponse | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    const hiddenFields = useMemo(
        () => new Set(profile?.hiddenFields ?? []),
        [profile?.hiddenFields]
    );

    useEffect(() => {
        async function load() {
            if (!userId) {
                setError("UserId fehlt.");
                setLoading(false);
                return;
            }

            try {
                setError("");
                setProfile(await getPublicUserProfile(userId, user));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Profil konnte nicht geladen werden.");
            } finally {
                setLoading(false);
            }
        }

        void load();
    }, [user, userId]);

    return (
        <main className="container public-profile-page">
            <Link to="/friends" className="back-link">
                ← Zurück zu Freunde
            </Link>

            <Message text={loading ? "Lade Profil..." : ""} type="info" />
            <Message text={error} type="error" />

            {!loading && profile && (
                <section className="card public-profile-card">
                    <div className="public-profile-header">
                        <div className="public-profile-avatar">
                            {profile.profileImageUrl ? (
                                <img src={profile.profileImageUrl} alt={profile.displayName} />
                            ) : (
                                <span>{profile.displayName.slice(0, 1).toUpperCase()}</span>
                            )}
                        </div>

                        <div>
                            <h1>{profile.displayName}</h1>
                            <p className="page-subtitle">
                                {profile.isFriend ? "Freund" : "Öffentliches Profil"}
                            </p>
                        </div>

                        {profile.canBeContacted && profile.userId !== user.userId && (
                            <DirectMessageButton
                                recipientUserId={profile.userId}
                                recipientDisplayName={profile.displayName}
                                contextLabel="aus dem öffentlichen Profil"
                            />
                        )}
                    </div>

                    <h2>Kontakt</h2>
                    <div className="public-profile-grid">
                        <ProfileValue label="E-Mail" value={profile.email} hidden={hiddenFields.has("email")} />
                        <ProfileValue label="Telefon" value={profile.phoneNumber} hidden={hiddenFields.has("phoneNumber")} />
                        <ProfileValue label="Straße" value={profile.streetAddress} hidden={hiddenFields.has("streetAddress")} />
                        <ProfileValue label="PLZ" value={profile.postalCode} hidden={hiddenFields.has("postalCode")} />
                        <ProfileValue label="Ort" value={profile.city} hidden={hiddenFields.has("city")} />
                    </div>

                    <h2>Tabletop-Profile</h2>
                    <div className="public-profile-grid">
                        <ProfileValue label="TabletopTO" value={profile.tabletopTo} hidden={hiddenFields.has("tabletopTo")} baseUrl="https://tabletop.to/" />
                        <ProfileValue label="Tabletop Herald" value={profile.tabletopHerald} hidden={hiddenFields.has("tabletopHerald")} baseUrl="https://tabletop-herald.com/" />
                        <ProfileValue label="T3" value={profile.t3} hidden={hiddenFields.has("t3")} baseUrl="https://www.tabletopturniere.de/t3_user.php?username=" />
                        <ProfileValue label="NewRecruit" value={profile.newRecruit} hidden={hiddenFields.has("newRecruit")} baseUrl="https://www.newrecruit.eu/app/user/" />
                        <ProfileValue label="Best Coast Pairings / BCP" value={profile.bestSportsPairings} hidden={hiddenFields.has("bestSportsPairings")} baseUrl="https://www.bestcoastpairings.com/profile/" />
                    </div>
                </section>
            )}
        </main>
    );
}