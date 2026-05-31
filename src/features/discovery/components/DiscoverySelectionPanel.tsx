import { Link } from "react-router-dom";
import { systemShortCode, systemShortCodes } from "../../../helpers/systemLabels";
import type {
  GameDiscoveryResponse,
  LocationDiscoveryResponse,
  PlayRequestDto,
  SystemOption,
  UserSearchResponse,
} from "../../../types/game";
import { compactTimeText, dateTimeText } from "../utils/discoveryDates";
import { cleanSystemLabel, systemLabelsFromSummary } from "../utils/discoveryMarkers";

type Props = {
  selectedGame: GameDiscoveryResponse | null;
  selectedLocation: LocationDiscoveryResponse | null;
  selectedPlayer: UserSearchResponse | null;
  selectedPlayRequest: PlayRequestDto | null;
  selectedLocationGames: GameDiscoveryResponse[];
  selectedGameIndex: number;
  selectedHostName: string | null;
  selectedOccupiedSeats: number;
  selectedMaxSeats: number;
  systems: SystemOption[];
  onClose: () => void;
  onSelectGameAtOffset: (offset: number) => void;
  onCreateAtLocation: (locationId: string) => void;
};

function renderSystemBadges(labels: string[]) {
  if (labels.length === 0) {
    return <span className="system-badge muted">System offen</span>;
  }

  return labels.map((label) => (
    <span key={label} className="system-badge">
      {label}
    </span>
  ));
}

export default function DiscoverySelectionPanel({
  selectedGame,
  selectedLocation,
  selectedPlayer,
  selectedPlayRequest,
  selectedLocationGames,
  selectedGameIndex,
  selectedHostName,
  selectedOccupiedSeats,
  selectedMaxSeats,
  systems,
  onClose,
  onSelectGameAtOffset,
  onCreateAtLocation,
}: Props) {
  return (
    <>
      {selectedGame && (
        <article className="session-preview">
          <div className="session-preview-topbar compact-preview-topbar">
            <time>{compactTimeText(selectedGame)}</time>

            {selectedLocationGames.length > 1 && (
              <div className="session-preview-switcher">
                <button type="button" onClick={() => onSelectGameAtOffset(-1)} aria-label="Vorheriges Spiel">&lt;</button>
                <span>{selectedGameIndex + 1} / {selectedLocationGames.length}</span>
                <button type="button" onClick={() => onSelectGameAtOffset(1)} aria-label="Nächstes Spiel">&gt;</button>
              </div>
            )}

            <button
              className="preview-close"
              type="button"
              onClick={onClose}
              aria-label="Vorschau schließen"
            >
              ×
            </button>
          </div>

          <h2>{selectedGame.title}</h2>

          {selectedHostName && <p className="preview-host">von {selectedHostName}</p>}

          <div className="compact-session-preview">
            <span>
              {systemLabelsFromSummary(selectedGame.tablesSummary, systems).join(", ") || "System offen"}
              {" · "}
              {selectedGame.city || selectedGame.locationName}
              {" · "}
              {selectedOccupiedSeats}/{selectedMaxSeats}
            </span>
          </div>

          <div className="preview-actions">
            <Link to={`/sessions/${encodeURIComponent(selectedGame.gameId)}`}>
              Öffnen
            </Link>
          </div>
        </article>
      )}

      {selectedLocation && (
        <article className="session-preview location-preview">
          <button
            className="preview-close"
            type="button"
            onClick={onClose}
            aria-label="Vorschau schließen"
          >
            ×
          </button>

          <p className="panel-kicker">
            {selectedLocation.isOwnLocation
              ? `Eigener Spielort${selectedLocation.role ? ` · ${selectedLocation.role}` : ""}`
              : "Spielort"}
          </p>

          <h2>{selectedLocation.name}</h2>

          <div className="preview-meta-grid">
            <span>{selectedLocation.city}</span>
            {selectedLocation.address && <span>{selectedLocation.address}</span>}
            <span>{selectedLocation.upcomingGameCount} kommende Spiele</span>
            {selectedLocation.nextGameStartTimeUtc && (
              <span>nächste: {dateTimeText(selectedLocation.nextGameStartTimeUtc)}</span>
            )}
          </div>

          <div className="system-badge-row">
            {renderSystemBadges(systemShortCodes(selectedLocation.systemKeys, systems).map(cleanSystemLabel).filter(Boolean))}
          </div>

          <div className="preview-actions">
            <Link to="/locations">Details</Link>

            <button type="button" onClick={() => onCreateAtLocation(selectedLocation.locationId)}>
              Spiel hier erstellen
            </button>

            {selectedLocation.isOwnLocation && <Link to="/locations">Mitglieder</Link>}
          </div>
        </article>
      )}

      {selectedPlayer && (
        <article className="session-preview player-preview">
          <button
            className="preview-close"
            type="button"
            onClick={onClose}
            aria-label="Vorschau schließen"
          >
            ×
          </button>

          <p className="panel-kicker">Spieler</p>
          <h2>{selectedPlayer.displayName}</h2>

          <div className="preview-meta-grid">
            {selectedPlayer.city && <span>Ort: {selectedPlayer.city}</span>}
            {selectedPlayer.postalCode && <span>PLZ: {selectedPlayer.postalCode}</span>}
            {selectedPlayer.locationPrecision === "approximate" && <span>Ungefährer Standort</span>}
            {selectedPlayer.lookingForGame?.isActive && (
              <span>
                Sucht Spiel
                {selectedPlayer.lookingForGame.systemKey ? `: ${systemShortCode(selectedPlayer.lookingForGame.systemKey, systems)}` : ""}
                {selectedPlayer.lookingForGame.timeNote ? ` · ${selectedPlayer.lookingForGame.timeNote}` : ""}
              </span>
            )}
            {(selectedPlayer.favoriteSystemKeys ?? []).length > 0 && (
              <span>Systeme: {systemShortCodes(selectedPlayer.favoriteSystemKeys, systems).join(", ")}</span>
            )}
          </div>

          <div className="preview-actions">
            <Link to={`/users/${encodeURIComponent(selectedPlayer.userId)}`}>Profil öffnen</Link>
          </div>
        </article>
      )}

      {selectedPlayRequest && (
        <article className="session-preview player-preview">
          <button className="preview-close" type="button" onClick={onClose} aria-label="Vorschau schließen">
            ×
          </button>
          <p className="panel-kicker">Spielgesuch</p>
          <h2>{selectedPlayRequest.owner.displayName}</h2>
          <div className="preview-meta-grid">
            <span>System: {systemShortCode(selectedPlayRequest.systemKey, systems)}</span>
            {selectedPlayRequest.timeNote && <span>{selectedPlayRequest.timeNote}</span>}
            {selectedPlayRequest.city && <span>{selectedPlayRequest.city}</span>}
            {selectedPlayRequest.note && <span>{selectedPlayRequest.note}</span>}
          </div>
          <div className="preview-actions">
            <Link to="/play-requests">Gesuche öffnen</Link>
            <Link to={`/users/${encodeURIComponent(selectedPlayRequest.owner.userId)}`}>Profil öffnen</Link>
          </div>
        </article>
      )}
    </>
  );
}
