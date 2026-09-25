const DAY_MS = 86_400_000;

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

export function addCalendarDays(value: string, days: number) {
  const date = calendarDate(value);
  if (!date) throw new Error("Invalid calendar date");
  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function mondayOf(value: string) {
  const date = calendarDate(value);
  if (!date) throw new Error("Invalid calendar date");
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addCalendarDays(value, -daysSinceMonday);
}

export function isMonday(value: string) {
  return calendarDate(value) !== null && mondayOf(value) === value;
}

export function weeksTouchingMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid calendar month");
  const first = `${month}-01`;
  const following = month === `${month.slice(0, 4)}-12`
    ? `${Number(month.slice(0, 4)) + 1}-01-01`
    : `${month.slice(0, 4)}-${String(Number(month.slice(5)) + 1).padStart(2, "0")}-01`;
  const last = addCalendarDays(following, -1);
  const weeks: string[] = [];
  for (let week = mondayOf(first); week <= last; week = addCalendarDays(week, 7)) weeks.push(week);
  return weeks;
}

export function weekLabel(weekStart: string) {
  const first = calendarDate(weekStart);
  if (!first || !isMonday(weekStart)) throw new Error("A week must start on Monday");
  const last = calendarDate(addCalendarDays(weekStart, 6))!;
  const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
  const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
  const year = new Intl.DateTimeFormat("en-GB", { year: "numeric", timeZone: "UTC" });
  const firstPart = `${day.format(first)}${first.getUTCMonth() === last.getUTCMonth() ? "" : ` ${month.format(first)}`}${first.getUTCFullYear() === last.getUTCFullYear() ? "" : ` ${year.format(first)}`}`;
  return `${firstPart}–${day.format(last)} ${month.format(last)} ${year.format(last)}`;
}

export function localDateInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isWithinWeek(instant: Date, weekStart: string, timeZone: string) {
  const date = localDateInZone(instant, timeZone);
  return date >= weekStart && date <= addCalendarDays(weekStart, 6);
}
