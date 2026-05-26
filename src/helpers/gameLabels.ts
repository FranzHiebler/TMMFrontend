import { GameJoinMode, type GameSessionState, type GameTableDto } from "../types/game";
import type { SystemOption } from "../types/game";
import { systemShortCode } from "./systemLabels";

export function gameJoinModeLabel(joinMode: GameJoinMode) {
  if (joinMode === GameJoinMode.ApprovalRequired) return "Bewerbung erforderlich";
  if (joinMode === GameJoinMode.FirstComeFirstServe) return "Direkter Beitritt";

  return joinMode;
}

export function gameSessionStateLabel(status: GameSessionState) {
  if (status === "Open") return "Offen";
  if (status === "Full") return "Voll";
  if (status === "Closed") return "Geschlossen";
  if (status === "Cancelled") return "Abgesagt";

  return status;
}

export function gameTableSystemsLabel(table: GameTableDto) {
  if (!table.systems || table.systems.length === 0) return "Egal";
  if (table.systems.some((x) => x.toLowerCase() === "egal")) return "Egal";

  return table.systems.join(", ");
}

export function gameTableSystemsShortLabel(table: GameTableDto, systems: SystemOption[]) {
  if (!table.systems || table.systems.length === 0) return "Egal";
  if (table.systems.some((x) => x.toLowerCase() === "egal")) return "Egal";

  return table.systems.map((system) => systemShortCode(system, systems)).join(", ");
}
