import type { SystemOption } from "../types/game";

export function systemName(systemKey: string | null | undefined, systems: SystemOption[]) {
  if (!systemKey) return "";

  return systems.find((system) => system.key === systemKey)?.name ?? systemKey;
}

export function systemShortCode(systemKeyOrName: string | null | undefined, systems: SystemOption[]) {
  if (!systemKeyOrName) return "";

  const normalized = systemKeyOrName.trim().toLowerCase();
  const system = systems.find(
    (candidate) =>
      candidate.key.toLowerCase() === normalized ||
      candidate.name.toLowerCase() === normalized ||
      candidate.shortCode?.toLowerCase() === normalized
  );

  return system?.shortCode || system?.name || systemKeyOrName;
}

export function systemNames(systemKeys: string[] | null | undefined, systems: SystemOption[]) {
  return (systemKeys ?? []).map((key) => systemName(key, systems)).filter(Boolean);
}

export function systemShortCodes(systemKeys: string[] | null | undefined, systems: SystemOption[]) {
  return (systemKeys ?? []).map((key) => systemShortCode(key, systems)).filter(Boolean);
}

export function listLabel(values: string[]) {
  return values.length ? values.join(", ") : "Keine Angaben";
}
