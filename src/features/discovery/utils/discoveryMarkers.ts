import L from "leaflet";
import { systemShortCode } from "../../../helpers/systemLabels";
import type {
  GameDiscoveryResponse,
  LocationDiscoveryResponse,
  PlayRequestDto,
  SystemOption,
  UserSearchResponse,
} from "../../../types/game";
import { shortDateText } from "./discoveryDates";

const MARKER_ICON_SIZE: [number, number] = [48, 48];
const MARKER_ICON_ANCHOR: [number, number] = [24, 24];

function gameMarkerState(game: GameDiscoveryResponse) {
  if (game.isHost) return "host";
  if (game.isParticipant) return "participant";
  return "event";
}

export function cleanSystemLabel(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (cleaned.toLowerCase() === "egal") return "Egal";
  return cleaned.length <= 8 ? cleaned : cleaned.slice(0, 8);
}

export function systemLabelsFromSummary(summary: string, systems: SystemOption[]) {
  if (!summary.trim()) return [];

  return summary
    .split(/\s*(?:·|Â·|Ã‚Â·)\s*/)
    .flatMap((part) => part.split(":").slice(1).join(":").split(","))
    .map((value) => systemShortCode(cleanSystemLabel(value.replace(/\d+\s*Punkte/i, "")), systems))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortDisplay(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
}

function markerHtml({
  kind,
  state,
  glyph,
  activeLabel,
  isActive,
  isApproximate = false,
  markerScale,
  visualOffsetX,
  visualOffsetY,
}: {
  kind: string;
  state?: string;
  glyph: string;
  activeLabel?: string;
  isActive: boolean;
  isApproximate?: boolean;
  markerScale: number;
  visualOffsetX: number;
  visualOffsetY: number;
}) {
  const classes = [
    "map-diamond-marker",
    `map-diamond-${kind}`,
    state ? `map-diamond-${state}` : "",
    isActive ? "map-diamond-active" : "",
    isApproximate ? "map-diamond-approximate" : "",
  ].filter(Boolean).join(" ");

  return `
    <div class="map-diamond-wrap ${isActive ? "map-diamond-wrap-active" : ""}" style="--marker-scale: ${markerScale}; transform: translate(${visualOffsetX}px, ${visualOffsetY}px)">
      ${isActive && activeLabel ? `<span class="map-diamond-pill">${escapeHtml(activeLabel)}</span>` : ""}
      <div class="${classes}">
        <span class="map-diamond-glyph ${glyph}" aria-hidden="true"></span>
      </div>
    </div>
  `;
}

export function gameMarkerIcon(
  game: GameDiscoveryResponse,
  _indexAtLocation: number,
  systems: SystemOption[],
  isActive = false,
  visualOffsetX = 0,
  visualOffsetY = 0,
  markerScale = 1
) {
  const systemLabels = systemLabelsFromSummary(game.tablesSummary, systems);
  const systemText = systemLabels.slice(0, 2).join(" · ") || "Termin";
  const activeLabel = `${shortDateText(game.startTimeUtc)} · ${shortDisplay(systemText, 10)}`;

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "session",
      state: gameMarkerState(game),
      glyph: "map-glyph-game",
      activeLabel,
      isActive,
      markerScale,
      visualOffsetX,
      visualOffsetY,
    }),
    iconSize: MARKER_ICON_SIZE,
    iconAnchor: MARKER_ICON_ANCHOR,
    popupAnchor: [0, -20],
  });
}

export function locationMarkerIcon(
  location: LocationDiscoveryResponse,
  isActive = false,
  visualOffsetX = 0,
  visualOffsetY = 0,
  markerScale = 1
) {
  const state = location.isOwnLocation ? "own-location-base" : "location";
  const isApproximate = location.locationPrecision === "approximate";

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "location",
      state,
      glyph: "map-glyph-location",
      activeLabel: shortDisplay(location.name, 18),
      isActive,
      isApproximate,
      markerScale,
      visualOffsetX,
      visualOffsetY,
    }),
    iconSize: MARKER_ICON_SIZE,
    iconAnchor: MARKER_ICON_ANCHOR,
    popupAnchor: [0, -20],
  });
}

export function playerMarkerIcon(
  player: UserSearchResponse,
  isMe: boolean,
  isFriend = false,
  isActive = false,
  visualOffsetX = 0,
  visualOffsetY = 0,
  markerScale = 1
) {
  const isApproximate = player.locationPrecision === "approximate";
  const state = isMe ? "me" : isFriend ? "friend" : "player";

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "player",
      state,
      glyph: "map-glyph-user",
      activeLabel: shortDisplay(player.displayName, 18),
      isActive,
      isApproximate,
      markerScale,
      visualOffsetX,
      visualOffsetY,
    }),
    iconSize: MARKER_ICON_SIZE,
    iconAnchor: MARKER_ICON_ANCHOR,
    popupAnchor: [0, -20],
  });
}

export function playRequestMarkerIcon(
  request: PlayRequestDto,
  systems: SystemOption[],
  isActive = false,
  visualOffsetX = 0,
  visualOffsetY = 0,
  markerScale = 1
) {
  const isApproximate = request.locationPrecision === "approximate";
  const systemText = systemShortCode(request.systemKey, systems);

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "play-request",
      glyph: "map-glyph-search",
      activeLabel: `Gesuch · ${shortDisplay(systemText, 10)}`,
      isActive,
      isApproximate,
      markerScale,
      visualOffsetX,
      visualOffsetY,
    }),
    iconSize: MARKER_ICON_SIZE,
    iconAnchor: MARKER_ICON_ANCHOR,
    popupAnchor: [0, -20],
  });
}
