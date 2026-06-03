type Props = {
  loading: boolean;
  technicalHint: string;
  onRetry: () => void;
};

export default function DatabaseUnavailableOverlay({ loading, technicalHint, onRetry }: Props) {
  return (
    <div className="app-unavailable-overlay" role="alertdialog" aria-modal="true">
      <section className="app-unavailable-card">
        <span className="nav-brand-mark">TMM</span>
        <h1>{loading ? "App wird geladen" : "Datenbank nicht verfügbar"}</h1>
        <p>
          {loading
            ? "Die App lädt die initialen Testdaten."
            : "Die App konnte keine Verbindung zum Backend oder zur Datenbank herstellen. Bitte später erneut versuchen."}
        </p>
        {!loading && technicalHint && <small>{technicalHint}</small>}
        <button type="button" onClick={onRetry} disabled={loading}>
          {loading ? "Lädt..." : "Erneut versuchen"}
        </button>
      </section>
    </div>
  );
}
