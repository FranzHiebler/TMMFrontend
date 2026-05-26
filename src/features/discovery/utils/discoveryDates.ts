import type { GameDiscoveryResponse } from "../../../types/game";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function rangeToDates(timeWindowDays: number) {
  const from = startOfToday();
  const to = new Date(from);
  to.setDate(to.getDate() + timeWindowDays);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function dateTimeText(startTimeUtc: string) {
  return new Date(startTimeUtc).toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortDateText(startTimeUtc: string) {
  return new Date(startTimeUtc).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function compactTimeText(game: GameDiscoveryResponse) {
  if (game.timingMode === "Open") return "offen";
  if (game.timeLabel) return `${shortDateText(game.startTimeUtc)} · ${game.timeLabel}`;
  return shortDateText(game.startTimeUtc);
}
