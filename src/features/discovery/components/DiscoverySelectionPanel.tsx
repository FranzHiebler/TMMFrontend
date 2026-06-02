import { Link } from "react-router-dom";
import DirectMessageButton from "../../../components/DirectMessageButton";
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
  selectionItemCount: number;
  selectionItemIndex: number;
  selectedHostName: string | null;
  selectedOccupiedSeats: number;
  selectedMaxSeats: number;
  systems: SystemOption[];
  onClose: () => void;
  onSelectItemAtOffset: (offset: number) => void;
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
  selectionItemCount,
  selectionItemIndex,
  selectedHostName,
  selectedOccupiedSeats,
  selectedMaxSeats,
  systems,
  onClose,
  onSelectItemAtOffset,
  onCreateAtLocation,
}: Props) {
  const showSwitcher = selectionItemCount > 1 && selectionItemIndex >= 0;
  const switcher = showSwitcher ? (
    <div className="session-preview-switcher">
      <button type="button" onClick={() => onSelectItemAtOffset(-1)} aria-label="Vorheriger Eintrag">
        &lt;
      </button>
      <span>{selectionItemIndex + 1} / {selectionItemCount}</span>
      <button type="button" onClick={() => onSelectItemAtOffset(1)} aria-label="Nächster Eintrag">
        &gt;
      </button>
    </div>
  ) : null;
  const closeButton = (
    <button className="preview-close" type="button" onClick={onClose} aria-label="Vorschau schließen">
      ×
    </button>
  );

  return (
    <>
      {selectedGame && (
        <article className="session-preview">
          <div className="session-preview-topbar compact-preview-topbar">
            <time>{compactTimeText(selectedGame)}</time>
            {switcher}
            {closeButton}
          </div>

          <p className="panel-kicker">Spieltermin</p>
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
            <Link to={`/sessions/${encodeURIComponent(selectedGame.gameId)}`}>Öffnen</Link>
          </div>
        </article>
      )}

      {selectedLocation && (
        <article className="session-preview location-preview">
          <div className="session-preview-topbar compact-preview-topbar">
            <p className="panel-kicker">
              {selectedLocation.isOwnLocation
                ? `Eigener Spielort${selectedLocation.role ? ` · ${selectedLocation.role}` : ""}`
                : "Spielort"}
            </p>
            {switcher}
            {closeButton}
          </div>

          <h2>{selectedLocation.name}</h2>

          <div className="preview-meta-grid">
            <span>{selectedLocation.city}</span>
            {selectedLocation.address && <span>{selectedLocation.address}</span>}
            {selectedLocation.locationPrecision === "approximate" && <span>Ungefährer Spielort</span>}
            <span>{selectedLocation.upcomingGameCount} kommende Spieltermine</span>
            {selectedLocation.nextGameStartTimeUtc && (
              <span>nächste: {dateTimeText(selectedLocation.nextGameStartTimeUtc)}</span>
            )}
          </div>

          <div className="system-badge-row">
            {renderSystemBadges(
              systemShortCodes(selectedLocation.systemKeys, systems).map(cleanSystemLabel).filter(Boolean)
            )}
          </div>

          <div className="preview-actions">
            <Link to="/locations">Spielort öffnen</Link>

            <button type="button" onClick={() => onCreateAtLocation(selectedLocation.locationId)}>
              Spieltermin hier anbieten
            </button>

            {selectedLocation.isOwnLocation && <Link to="/locations">Mitglieder</Link>}
          </div>
        </article>
      )}

      {selectedPlayer && (
        <article className="session-preview player-preview">
          <div className="session-preview-topbar compact-preview-topbar">
            <p className="panel-kicker">Spieler</p>
            {switcher}
            {closeButton}
          </div>

          <h2>{selectedPlayer.displayName}</h2>

          <div className="preview-meta-grid">
            {selectedPlayer.city && <span>Ort: {selectedPlayer.city}</span>}
            {selectedPlayer.postalCode && <span>PLZ: {selectedPlayer.postalCode}</span>}
            {selectedPlayer.locationPrecision === "approximate" && <span>Ungefährer Standort</span>}
            {(selectedPlayer.favoriteSystemKeys ?? []).length > 0 && (
              <span>Systeme: {systemShortCodes(selectedPlayer.favoriteSystemKeys, systems).join(", ")}</span>
            )}
          </div>

          <div className="preview-actions">
            <Link to={`/users/${encodeURIComponent(selectedPlayer.userId)}`}>Profil öffnen</Link>
            <DirectMessageButton
              recipientUserId={selectedPlayer.userId}
              recipientDisplayName={selectedPlayer.displayName}
              contextLabel="von der Karte"
              compact
            />
          </div>
        </article>
      )}

      {selectedPlayRequest && (
        <article className="session-preview player-preview">
          <div className="session-preview-topbar compact-preview-topbar">
            <p className="panel-kicker">Spielgesuch</p>
            {switcher}
            {closeButton}
          </div>

          <h2>{selectedPlayRequest.owner.displayName}</h2>
          <div className="preview-meta-grid">
            <span>System: {systemShortCode(selectedPlayRequest.systemKey, systems)}</span>
            <span>Besitzer: {selectedPlayRequest.owner.displayName}</span>
            {selectedPlayRequest.locationName && <span>Spielort: {selectedPlayRequest.locationName}</span>}
            {selectedPlayRequest.city && <span>Ort: {selectedPlayRequest.city}</span>}
            {selectedPlayRequest.timeNote && <span>Zeit: {selectedPlayRequest.timeNote}</span>}
            {selectedPlayRequest.radiusKm && <span>Radius: {selectedPlayRequest.radiusKm} km</span>}
            {selectedPlayRequest.locationPrecision === "approximate" && <span>Ungefährer Standort</span>}
            {selectedPlayRequest.note && <span>{selectedPlayRequest.note}</span>}
          </div>
          <div className="preview-actions">
            <Link to="/play-requests">{selectedPlayRequest.isMine ? "Verwalten" : "Antworten"}</Link>
            <Link to={`/users/${encodeURIComponent(selectedPlayRequest.owner.userId)}`}>Profil öffnen</Link>
            <DirectMessageButton
              recipientUserId={selectedPlayRequest.owner.userId}
              recipientDisplayName={selectedPlayRequest.owner.displayName}
              contextLabel="aus einem Spielgesuch"
              compact
            />
          </div>
        </article>
      )}
    </>
  );
}
