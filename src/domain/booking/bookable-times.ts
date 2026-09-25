export type BookingWindow = {
  startsAt: Date;
  endsAt: Date;
  sessionMinutes: number;
  bufferMinutes: number;
};

export function bookableTimes(window: BookingWindow, occupiedStarts: readonly Date[], now: Date): Date[] {
  const duration = window.sessionMinutes * 60_000;
  const step = (window.sessionMinutes + window.bufferMinutes) * 60_000;
  if (duration <= 0 || step < duration || window.endsAt <= window.startsAt) return [];
  const occupied = new Set(occupiedStarts.map((date) => date.getTime()));
  const times: Date[] = [];
  for (let start = window.startsAt.getTime(); start + duration <= window.endsAt.getTime(); start += step) {
    if (start > now.getTime() && !occupied.has(start)) times.push(new Date(start));
  }
  return times;
}
