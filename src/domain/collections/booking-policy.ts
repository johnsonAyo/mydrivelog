export function weeklyBookingLimit(allowance: string): number | null {
  const limits: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  return limits[allowance] ?? null;
}

export function hasBookingNotice(startsAt: string | Date, noticeHours: number, now = new Date()): boolean {
  return new Date(startsAt).getTime() > now.getTime() + noticeHours * 3_600_000;
}

export function canLearnerChange(startsAt: string | Date, now = new Date()): boolean {
  return new Date(startsAt).getTime() - now.getTime() >= 48 * 3_600_000;
}
