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

const MARKER_ICON_SIZE: [number, number] = [84, 48];
const MARKER_ICON_ANCHOR: [number, number] = [42, 24];

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
  top,
  bottom,
  isActive,
  isApproximate = false,
  visualOffsetX,
  visualOffsetY,
}: {
  kind: string;
  state?: string;
  top: string;
  bottom: string;
  isActive: boolean;
  isApproximate?: boolean;
  visualOffsetX: number;
  visualOffsetY: number;
}) {
  const classes = [
    "map-card-marker",
    `map-card-${kind}`,
    state ? `map-card-${state}` : "",
    isActive ? "map-card-active" : "",
    isApproximate ? "map-card-approximate" : "",
  ].filter(Boolean).join(" ");

  return `
    <div class="map-card-marker-wrap" style="transform: translate(${visualOffsetX}px, ${visualOffsetY}px)">
      <div class="${classes}">
        <span class="map-card-marker-top">${escapeHtml(top)}</span>
        <span class="map-card-marker-bottom">${escapeHtml(bottom)}</span>
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
  visualOffsetY = 0
) {
  const systemLabels = systemLabelsFromSummary(game.tablesSummary, systems);
  const systemText = systemLabels.slice(0, 2).join(" · ") || "Termin";

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "session",
      state: gameMarkerState(game),
      top: shortDateText(game.startTimeUtc),
      bottom: shortDisplay(systemText, 12),
      isActive,
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
  visualOffsetY = 0
) {
  const state = location.isOwnLocation ? "own-location-base" : "location";
  const isApproximate = location.locationPrecision === "approximate";
  const count = location.upcomingGameCount > 0 ? ` · ${location.upcomingGameCount}` : "";

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "location",
      state,
      top: "Spielort",
      bottom: shortDisplay(`${location.name}${count}`, 14),
      isActive,
      isApproximate,
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
  visualOffsetY = 0
) {
  const isApproximate = player.locationPrecision === "approximate";
  const state = isMe ? "me" : isFriend ? "friend" : "player";

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "player",
      state,
      top: isMe ? "Ich" : isFriend ? "Freund" : "Spieler",
      bottom: shortDisplay(player.displayName, 14),
      isActive,
      isApproximate,
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
  visualOffsetY = 0
) {
  const isApproximate = request.locationPrecision === "approximate";

  return L.divIcon({
    className: "",
    html: markerHtml({
      kind: "play-request",
      top: "Gesuch",
      bottom: shortDisplay(systemShortCode(request.systemKey, systems), 14),
      isActive,
      isApproximate,
      visualOffsetX,
      visualOffsetY,
    }),
    iconSize: MARKER_ICON_SIZE,
    iconAnchor: MARKER_ICON_ANCHOR,
    popupAnchor: [0, -20],
  });
}
