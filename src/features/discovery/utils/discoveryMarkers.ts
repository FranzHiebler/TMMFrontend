import L from "leaflet";
import { systemShortCode } from "../../../helpers/systemLabels";
import type {
  GameDiscoveryResponse,
  LocationDiscoveryResponse,
  SystemOption,
  UserSearchResponse,
} from "../../../types/game";
import { shortDateText } from "./discoveryDates";

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
    .split("·")
    .flatMap((part) => part.split(":").slice(1).join(":").split(","))
    .map((value) => systemShortCode(cleanSystemLabel(value.replace(/\d+\s*Punkte/i, "")), systems))
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);
}

function systemBadgesHtml(labels: string[]) {
  if (labels.length === 0) return `<span class="map-system-badge">?</span>`;

  return labels.map((label) => `<span class="map-system-badge">${label}</span>`).join("");
}

export function gameMarkerIcon(game: GameDiscoveryResponse, indexAtLocation: number, systems: SystemOption[]) {
  const state = gameMarkerState(game);
  const offset = Math.min(indexAtLocation, 3) * 8;
  const systemLabels = systemLabelsFromSummary(game.tablesSummary, systems);

  return L.divIcon({
    className: "",
    html: `
      <div class="discovery-marker discovery-marker-${state}" style="transform: translate(${offset}px, -${offset}px)">
        <div class="marker-main-row">
          <span class="marker-symbol">S</span>
          <span>${shortDateText(game.startTimeUtc)}</span>
        </div>
        <div class="marker-system-row">${systemBadgesHtml(systemLabels)}</div>
      </div>
    `,
    iconSize: [104, 52],
    iconAnchor: [52, 26],
  });
}

export function locationMarkerIcon(location: LocationDiscoveryResponse) {
  const state = location.isOwnLocation ? "own-location-base" : "location";
  const count = location.upcomingGameCount > 0 ? location.upcomingGameCount.toString() : "";

  return L.divIcon({
    className: "",
    html: `
      <div class="location-marker location-marker-${state}">
        <span class="marker-icon marker-icon-house" aria-hidden="true"></span>
        ${count ? `<strong>${count}</strong>` : ""}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

export function playerMarkerIcon(player: UserSearchResponse, isMe: boolean) {
  const isLooking = player.lookingForGame?.isActive;
  const classes = [
    "player-marker",
    isMe ? "player-marker-me" : "player-marker-default",
    isLooking ? "player-marker-looking" : "",
  ].filter(Boolean).join(" ");

  return L.divIcon({
    className: "",
    html: `
      <div class="${classes}">
        <span class="marker-icon marker-icon-user" aria-hidden="true"></span>
        ${isLooking ? `<span class="marker-mini-label">sucht</span>` : ""}
      </div>
    `,
    iconSize: isLooking ? [36, 36] : [30, 30],
    iconAnchor: isLooking ? [18, 18] : [15, 15],
  });
}

export function playRequestMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div class="player-marker player-marker-looking">
        <span class="marker-icon marker-icon-user" aria-hidden="true"></span>
        <span class="marker-mini-label">sucht</span>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}
