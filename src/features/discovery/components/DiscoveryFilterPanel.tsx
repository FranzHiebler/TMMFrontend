type Props = {
  collapsed: boolean;
  banner: string;
  isLoading: boolean;
  visibleLocationCount: number;
  visiblePlayerCount: number;
  visibleGameCount: number;
  visiblePlayRequestCount: number;
  loadingLabels: string[];
  onToggleCollapsed: () => void;
};

export default function DiscoveryFilterPanel({
  collapsed,
  banner,
  isLoading,
  visibleLocationCount,
  visiblePlayerCount,
  visibleGameCount,
  visiblePlayRequestCount,
  loadingLabels,
  onToggleCollapsed,
}: Props) {
  return (
    <aside
      className={`discovery-panel discovery-panel-compact ${
        collapsed ? "discovery-panel-collapsed" : ""
      }`}
    >
      <div className="discovery-panel-header">
        <span>Filterstatus</span>
        <button
          type="button"
          className="overlay-toggle"
          aria-label={collapsed ? "Filterstatus öffnen" : "Filterstatus einklappen"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? "v" : "^"}
        </button>
      </div>

      {!collapsed && (
        <>
          {banner && <div className="message message-error">{banner}</div>}
          {isLoading && (
            <div className="discovery-loading-inline">
              Aktualisiere {loadingLabels.length > 0 ? loadingLabels.join(", ") : "Karte"}...
            </div>
          )}
          {!isLoading && !banner && (
            <p className="discovery-count">
              {visibleLocationCount} Spielorte · {visiblePlayerCount} Spieler ·{" "}
              {visibleGameCount} {visibleGameCount === 1 ? "Spieltermin" : "Spieltermine"} ·{" "}
              {visiblePlayRequestCount} {visiblePlayRequestCount === 1 ? "Spielgesuch" : "Spielgesuche"}
            </p>
          )}
        </>
      )}
    </aside>
  );
}
