export function timeFromDate(dateTime?: string | null) {
  if (!dateTime) return "";

  const date = new Date(dateTime);

  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function combineDateWithTime(baseDateTime: string, time: string) {
  const base = new Date(baseDateTime);
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hours,
    minutes
  ).toISOString();
}

export function combineLocalDateInputWithTime(dateTimeLocal: string, time: string) {
  if (!dateTimeLocal || !time) return null;

  const [year, month, day] = dateTimeLocal.slice(0, 10).split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(year, month - 1, day, hours, minutes).toISOString();
}