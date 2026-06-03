type Props = {
  banner: string;
  isLoading: boolean;
  visibleLocationCount: number;
  visiblePlayerCount: number;
  visibleGameCount: number;
  visiblePlayRequestCount: number;
  loadingLabels: string[];
};

export default function DiscoveryFilterPanel({
  banner,
  isLoading,
  visibleLocationCount,
  visiblePlayerCount,
  visibleGameCount,
  visiblePlayRequestCount,
  loadingLabels,
}: Props) {
  return (
    <div className="discovery-filter-status">
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
    </div>
  );
}
