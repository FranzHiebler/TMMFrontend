type Props = {
  collapsed: boolean;
  showLocations: boolean;
  showPlayers: boolean;
  showMySessions: boolean;
  showAllSessions: boolean;
  timeWindowDays: number;
  radiusKm: number;
  banner: string;
  isLoading: boolean;
  visibleLocationCount: number;
  visiblePlayerCount: number;
  visibleGameCount: number;
  onToggleCollapsed: () => void;
  onShowLocationsChange: (value: boolean) => void;
  onShowPlayersChange: (value: boolean) => void;
  onShowMySessionsChange: (value: boolean) => void;
  onShowAllSessionsChange: (value: boolean) => void;
  onTimeWindowDaysChange: (value: number) => void;
  onRadiusKmChange: (value: number) => void;
};

export default function DiscoveryFilterPanel({
  collapsed,
  showLocations,
  showPlayers,
  showMySessions,
  showAllSessions,
  timeWindowDays,
  radiusKm,
  banner,
  isLoading,
  visibleLocationCount,
  visiblePlayerCount,
  visibleGameCount,
  onToggleCollapsed,
  onShowLocationsChange,
  onShowPlayersChange,
  onShowMySessionsChange,
  onShowAllSessionsChange,
  onTimeWindowDaysChange,
  onRadiusKmChange,
}: Props) {
  return (
    <aside
      className={`discovery-panel discovery-panel-compact ${
        collapsed ? "discovery-panel-collapsed" : ""
      }`}
    >
      <div className="discovery-panel-header">
        <button
          type="button"
          className="overlay-toggle"
          aria-label={collapsed ? "Filter öffnen" : "Filter einklappen"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="discovery-filter-box discovery-filter-box-compact">
            <label title="Spielorte im gewählten Umkreis">
              <input
                type="checkbox"
                checked={showLocations}
                onChange={(event) => onShowLocationsChange(event.target.checked)}
              />
              <span>Spielorte</span>
            </label>

            <label title="Spieler mit sichtbarem Profil im Umkreis">
              <input
                type="checkbox"
                checked={showPlayers}
                onChange={(event) => onShowPlayersChange(event.target.checked)}
              />
              <span>Spieler</span>
            </label>

            <label title="Sessions, die du veranstaltest oder an denen du teilnimmst">
              <input
                type="checkbox"
                checked={showMySessions}
                onChange={(event) => onShowMySessionsChange(event.target.checked)}
              />
              <span>Meine Sessions</span>
            </label>

            <label title="Alle sichtbaren Sessions im Umkreis">
              <input
                type="checkbox"
                checked={showAllSessions}
                onChange={(event) => onShowAllSessionsChange(event.target.checked)}
              />
              <span>Öffentliche Sessions</span>
            </label>
          </div>

          <label className="day-slider">
            <input
              type="range"
              min={1}
              max={56}
              value={timeWindowDays}
              onChange={(event) => onTimeWindowDaysChange(Number(event.target.value))}
            />
            <span className="range-scale">
              <small>1</small>
              <small>{timeWindowDays} Tage</small>
              <small>56</small>
            </span>
          </label>

          <label className="day-slider radius-slider">
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={radiusKm}
              onChange={(event) => onRadiusKmChange(Number(event.target.value))}
            />
            <span className="range-scale">
              <small>10</small>
              <small>{radiusKm} km</small>
              <small>200</small>
            </span>
          </label>

          {banner && <div className="message message-error">{banner}</div>}
          {isLoading && <div className="discovery-skeleton" />}
          {!isLoading && !banner && (
            <p className="discovery-count">
              {visibleLocationCount} Spielorte · {visiblePlayerCount} Spieler ·{" "}
              {visibleGameCount} {visibleGameCount === 1 ? "Session" : "Sessions"}
            </p>
          )}
        </>
      )}
    </aside>
  );
}
