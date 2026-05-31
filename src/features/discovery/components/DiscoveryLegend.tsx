type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function DiscoveryLegend({ collapsed, onToggle }: Props) {
  return (
    <div className={`discovery-map-legend ${collapsed ? "legend-collapsed" : ""}`}>
      <div className="discovery-legend-header">
        <button
          type="button"
          className="overlay-toggle"
          aria-label={collapsed ? "Legende öffnen" : "Legende einklappen"}
          onClick={onToggle}
        >
          {collapsed ? "?" : "‹"}
        </button>
      </div>
      {!collapsed && (
        <>
          <span><i className="legend-dot location" /> Spielort</span>
          <span><i className="legend-dot own-location-base" /> Eigener Spielort</span>
          <span><i className="legend-dot event" /> Spiel</span>
          <span><i className="legend-dot participant" /> Teilnahme</span>
          <span><i className="legend-dot host" /> Host</span>
          <span><i className="legend-dot player" /> Spieler</span>
          <span><i className="legend-dot player-approximate" /> Ungefähr</span>
          <span><i className="legend-dot player-looking" /> Sucht</span>
          <span><i className="legend-dot player-me" /> Ich</span>
        </>
      )}
    </div>
  );
}
