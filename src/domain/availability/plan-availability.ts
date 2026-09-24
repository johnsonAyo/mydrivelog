import type { Result } from "@/domain/shared/result";
import type {
  AvailabilityPlanningError,
  BufferWarning,
  NearbySlot,
  PlannedAvailability,
  SchedulingPolicy,
} from "./types";

const MILLISECONDS_PER_MINUTE = 60_000;

type PlanAvailabilityInput = {
  readonly startsAt: Date;
  readonly endsAt?: Date;
  readonly policy: SchedulingPolicy;
  readonly nearbySlots: readonly NearbySlot[];
};

export function planAvailability(
  input: PlanAvailabilityInput,
): Result<PlannedAvailability, AvailabilityPlanningError> {
  if (Number.isNaN(input.startsAt.getTime())) {
    return { ok: false, error: { code: "invalid_start" } };
  }

  const endsAt =
    input.endsAt ??
    new Date(input.startsAt.getTime() + input.policy.defaultSessionMinutes * MILLISECONDS_PER_MINUTE);

  if (
    Number.isNaN(endsAt.getTime()) ||
    endsAt.getTime() <= input.startsAt.getTime() ||
    input.policy.defaultSessionMinutes <= 0
  ) {
    return { ok: false, error: { code: "invalid_duration" } };
  }

  const overlapping = input.nearbySlots.find(
    (slot) => input.startsAt < slot.endsAt && endsAt > slot.startsAt,
  );

  if (overlapping) {
    return {
      ok: false,
      error: { code: "overlap", conflictingSlotId: overlapping.id },
    };
  }

  const warnings = input.nearbySlots.flatMap<BufferWarning>((slot) => {
    if (slot.endsAt <= input.startsAt) {
      const gapMinutes = differenceInMinutes(input.startsAt, slot.endsAt);
      return gapMinutes < input.policy.bufferWarningMinutes
        ? [{
            code: "short_buffer",
            adjacentSlotId: slot.id,
            gapMinutes,
            preferredMinutes: input.policy.bufferWarningMinutes,
            side: "before",
          }]
        : [];
    }

    if (slot.startsAt >= endsAt) {
      const gapMinutes = differenceInMinutes(slot.startsAt, endsAt);
      return gapMinutes < input.policy.bufferWarningMinutes
        ? [{
            code: "short_buffer",
            adjacentSlotId: slot.id,
            gapMinutes,
            preferredMinutes: input.policy.bufferWarningMinutes,
            side: "after",
          }]
        : [];
    }

    return [];
  });

  return {
    ok: true,
    value: { startsAt: input.startsAt, endsAt, warnings },
  };
}

function differenceInMinutes(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / MILLISECONDS_PER_MINUTE);
}
