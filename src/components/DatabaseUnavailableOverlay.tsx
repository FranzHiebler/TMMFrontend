export type UnavailableKind = "api" | "database" | "auth" | "permission" | "server" | "profile" | "unknown";

type Props = {
  loading: boolean;
  kind: UnavailableKind;
  technicalHint: string;
  onRetry: () => void;
};

const messages: Record<UnavailableKind, { title: string; body: string }> = {
  api: {
    title: "Backend nicht erreichbar",
    body: "Die App konnte keine Verbindung zum Backend herstellen. Bitte prüfe deine Verbindung und versuche es erneut.",
  },
  database: {
    title: "Datenbank nicht verfügbar",
    body: "Das Backend läuft, aber zentrale Daten konnten nicht geladen werden. Bitte später erneut versuchen.",
  },
  auth: {
    title: "Anmeldung erforderlich",
    body: "Deine Anmeldung konnte nicht bestätigt werden. Bitte melde dich erneut an.",
  },
  permission: {
    title: "Keine Berechtigung",
    body: "Du bist angemeldet, darfst diese Daten aber nicht öffnen.",
  },
  server: {
    title: "Serverfehler",
    body: "Im Backend ist ein unerwarteter Fehler aufgetreten. Bitte später erneut versuchen.",
  },
  profile: {
    title: "Profil konnte nicht geladen werden",
    body: "Die Anmeldung ist vorhanden, aber dein Nutzerprofil konnte nicht geladen werden.",
  },
  unknown: {
    title: "App konnte nicht gestartet werden",
    body: "Die App konnte nicht vollständig initialisiert werden. Bitte versuche es erneut.",
  },
};

export default function DatabaseUnavailableOverlay({ loading, kind, technicalHint, onRetry }: Props) {
  const message = loading
    ? { title: "App wird geladen", body: "Die App prüft Anmeldung und Verbindung." }
    : messages[kind];

  return (
    <div className="app-unavailable-overlay" role="alertdialog" aria-modal="true">
      <section className="app-unavailable-card">
        <span className="nav-brand-mark">TMM</span>
        <h1>{message.title}</h1>
        <p>{message.body}</p>
        {!loading && technicalHint && <small>{technicalHint}</small>}
        <button type="button" onClick={onRetry} disabled={loading}>
          {loading ? "Lädt..." : "Erneut versuchen"}
        </button>
      </section>
    </div>
  );
}
