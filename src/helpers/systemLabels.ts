import type { SystemOption } from "../types/game";

export function systemName(systemKey: string | null | undefined, systems: SystemOption[]) {
  if (!systemKey) return "";

  return systems.find((system) => system.key === systemKey)?.name ?? systemKey;
}

export function systemNames(systemKeys: string[] | null | undefined, systems: SystemOption[]) {
  return (systemKeys ?? []).map((key) => systemName(key, systems)).filter(Boolean);
}

export function listLabel(values: string[]) {
  return values.length ? values.join(", ") : "Keine Angaben";
}
