import type { LocationResponse, LocationRole } from "../types/game";

export function locationRoleLabel(role: LocationRole | string) {
  if (role === "Owner") return "Besitzer";
  if (role === "Admin") return "Admin";
  if (role === "Manager") return "Verwalter";
  if (role === "Member") return "Mitglied";
  if (role === "Applicant") return "Bewerber";

  return role;
}

export function locationMembershipLabel(location: LocationResponse) {
  if (location.role === "Applicant") return "Anfrage läuft";

  if (location.role) {
    return `Deine Rolle: ${locationRoleLabel(location.role)}`;
  }

  if (location.isOpen) {
    return "Öffentliche Location";
  }

  return "Noch kein Mitglied";
}