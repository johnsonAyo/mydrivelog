export type ExactSlot = { startsAt: Date; endsAt: Date };

export function slotDurationMinutes(slot: ExactSlot) {
  return (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000;
}

export function slotsOverlap(first: ExactSlot, second: ExactSlot) {
  return first.startsAt < second.endsAt && second.startsAt < first.endsAt;
}

export function nearbyGapWarning(candidate: ExactSlot, others: readonly ExactSlot[], preferredMinutes: number) {
  if (preferredMinutes <= 0) return null;
  const gap = preferredMinutes * 60_000;
  return others.some((slot) => {
    const before = candidate.startsAt.getTime() - slot.endsAt.getTime();
    const after = slot.startsAt.getTime() - candidate.endsAt.getTime();
    return (before >= 0 && before < gap) || (after >= 0 && after < gap);
  }) ? `This leaves less than your preferred ${preferredMinutes}-minute gap. You can keep it if travel works for you.` : null;
}

export function generateExactSlots(range: ExactSlot, durationMinutes: number, gapMinutes: number) {
  if (durationMinutes < 15 || durationMinutes > 480 || gapMinutes < 0 || gapMinutes > 120 || range.endsAt <= range.startsAt) return [];
  const slots: ExactSlot[] = [];
  const duration = durationMinutes * 60_000;
  const step = (durationMinutes + gapMinutes) * 60_000;
  for (let start = range.startsAt.getTime(); start + duration <= range.endsAt.getTime(); start += step) {
    slots.push({ startsAt: new Date(start), endsAt: new Date(start + duration) });
    if (slots.length >= 100) break;
  }
  return slots;
}
