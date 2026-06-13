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
    .split(/\s*(?:·|Â·)\s*/)
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

function systemBadgesHtml(labels: string[]) {
  if (labels.length === 0) return `<span class="map-system-badge">?</span>`;

  return labels.map((label) => `<span class="map-system-badge">${escapeHtml(label)}</span>`).join("");
}

function stackBadgeHtml(count: number) {
  return count > 1 ? `<span class="marker-stack-badge">${count}</span>` : "";
}

function approximateRingHtml(isApproximate: boolean) {
  if (!isApproximate) return "";

  return `<span class="marker-approx-ring" aria-hidden="true"><svg viewBox="0 0 44 44" focusable="false"><path d="M22 3 C28 3 31 7 36 10 C42 15 40 23 39 28 C37 36 30 39 23 41 C16 43 11 39 7 35 C2 30 3 22 5 16 C7 9 14 4 22 3 Z" /></svg></span>`;
}

export function gameMarkerIcon(
  game: GameDiscoveryResponse,
  indexAtLocation: number,
  systems: SystemOption[],
  isActive = false,
  stackCount = 1,
  visualOffsetX = 0,
  visualOffsetY = 0
) {
  const state = gameMarkerState(game);
  const baseOffset = stackCount > 1 ? 0 : Math.min(indexAtLocation, 3) * 8;
  const offsetX = baseOffset + visualOffsetX;
  const offsetY = -baseOffset + visualOffsetY;
  const systemLabels = systemLabelsFromSummary(game.tablesSummary, systems);
  const shortDate = shortDateText(game.startTimeUtc);
  const labelText = `${shortDate} · ${systemLabels.slice(0, 2).join(", ") || "Spieltermin"}`;

  return L.divIcon({
    className: "",
    html: `
      <div class="map-marker-wrap map-marker-game ${isActive ? "map-marker-active" : ""}" style="transform: translate(${offsetX}px, ${offsetY}px)">
        ${isActive ? `<div class="map-marker-label">${escapeHtml(labelText)}</div>` : ""}
        <div class="game-dot-marker discovery-marker-${state}">
          <span class="marker-symbol">S</span>
          <span class="game-dot-date">${escapeHtml(shortDate)}</span>
          ${stackBadgeHtml(stackCount)}
        </div>
        ${isActive ? `<div class="marker-system-row">${systemBadgesHtml(systemLabels)}</div>` : ""}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function locationMarkerIcon(
  location: LocationDiscoveryResponse,
  isActive = false,
  stackCount = 1,
  visualOffsetX = 0,
  visualOffsetY = 0
) {
  const state = location.isOwnLocation ? "own-location-base" : "location";
  const count = location.upcomingGameCount > 0 ? location.upcomingGameCount.toString() : "";
  const isApproximate = location.locationPrecision === "approximate";

  return L.divIcon({
    className: "",
    html: `
      <div class="map-marker-wrap ${isActive ? "map-marker-active" : ""}" style="transform: translate(${visualOffsetX}px, ${visualOffsetY}px)">
        ${isActive ? `<div class="map-marker-label">${escapeHtml(location.name)}</div>` : ""}
        <div class="location-marker location-marker-${state} ${isApproximate ? "location-marker-approximate" : ""}">
          ${approximateRingHtml(isApproximate)}
          <span class="marker-icon marker-icon-house" aria-hidden="true"></span>
          ${count ? `<strong>${escapeHtml(count)}</strong>` : ""}
          ${stackBadgeHtml(stackCount)}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function playerMarkerIcon(
  player: UserSearchResponse,
  isMe: boolean,
  isFriend = false,
  isActive = false,
  stackCount = 1,
  visualOffsetX = 0,
  visualOffsetY = 0
) {
  const isApproximate = player.locationPrecision === "approximate";
  const classes = [
    "player-marker",
    isMe ? "player-marker-me" : "player-marker-default",
    isFriend ? "player-marker-friend" : "",
    isApproximate ? "player-marker-approximate" : "",
  ].filter(Boolean).join(" ");

  return L.divIcon({
    className: "",
    html: `
      <div class="map-marker-wrap ${isActive ? "map-marker-active" : ""}" style="transform: translate(${visualOffsetX}px, ${visualOffsetY}px)">
        ${isActive ? `<div class="map-marker-label">${escapeHtml(player.displayName)}</div>` : ""}
        <div class="${classes}">
          ${approximateRingHtml(isApproximate)}
          <span class="marker-icon marker-icon-user" aria-hidden="true"></span>
          ${isFriend ? `<span class="marker-friend-label">Freund</span>` : ""}
          ${isApproximate ? `<span class="marker-approx-label">&asymp;</span>` : ""}
          ${stackBadgeHtml(stackCount)}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

export function playRequestMarkerIcon(
  request: PlayRequestDto,
  isActive = false,
  stackCount = 1,
  visualOffsetX = 0,
  visualOffsetY = 0
) {
  const isApproximate = request.locationPrecision === "approximate";
  const classes = [
    "player-marker",
    "play-request-marker",
    isApproximate ? "player-marker-approximate" : "",
  ].filter(Boolean).join(" ");

  return L.divIcon({
    className: "",
    html: `
      <div class="map-marker-wrap ${isActive ? "map-marker-active" : ""}" style="transform: translate(${visualOffsetX}px, ${visualOffsetY}px)">
        ${isActive ? `<div class="map-marker-label">Spielgesuch</div>` : ""}
        <div class="${classes}">
          ${approximateRingHtml(isApproximate)}
          <span class="marker-icon marker-icon-user" aria-hidden="true"></span>
          ${isApproximate ? `<span class="marker-approx-label">&asymp;</span>` : ""}
          <span class="marker-mini-label">Gesuch</span>
          ${stackBadgeHtml(stackCount)}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}
