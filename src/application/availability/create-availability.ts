import { planAvailability } from "@/domain/availability/plan-availability";
import type { BufferWarning } from "@/domain/availability/types";
import type { AvailabilityRepository } from "./availability-repository";

type CreateAvailabilityInput = {
  readonly workspaceId: string;
  readonly startsAt: Date;
  readonly endsAt?: Date;
  readonly sessionMinutes?: number;
  readonly bufferMinutes?: number;
};

export type CreateAvailabilityResult =
  | {
      readonly ok: true;
      readonly slot: {
        readonly id: string;
        readonly startsAt: Date;
        readonly endsAt: Date;
        readonly status: "open";
      };
      readonly warnings: readonly BufferWarning[];
    }
  | { readonly ok: false; readonly reason: "workspace_not_ready" }
  | { readonly ok: false; readonly reason: "invalid_start" | "invalid_duration" }
  | { readonly ok: false; readonly reason: "overlap"; readonly conflictingSlotId?: string };

export function createAvailabilityUseCase(repository: AvailabilityRepository) {
  return async function createAvailability(
    input: CreateAvailabilityInput,
  ): Promise<CreateAvailabilityResult> {
    return repository.transaction(async (transaction) => {
      const policy = await transaction.getSchedulingPolicy(input.workspaceId);

      if (!policy) {
        return { ok: false, reason: "workspace_not_ready" };
      }

      const sessionMinutes = input.sessionMinutes ?? policy.defaultSessionMinutes;
      const bufferMinutes = input.bufferMinutes ?? policy.bufferWarningMinutes;
      if (!Number.isInteger(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 480 || !Number.isInteger(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
        return { ok: false, reason: "invalid_duration" };
      }
      const effectivePolicy = { ...policy, defaultSessionMinutes: sessionMinutes, bufferWarningMinutes: bufferMinutes };
      const initialPlan = planAvailability({ ...input, policy: effectivePolicy, nearbySlots: [] });
      if (!initialPlan.ok) {
        return { ok: false, reason: initialPlan.error.code };
      }

      const nearbySlots = await transaction.findNearby(
        input.workspaceId,
        initialPlan.value.startsAt,
        initialPlan.value.endsAt,
      );
      const plan = planAvailability({ ...input, policy: effectivePolicy, nearbySlots });

      if (!plan.ok) {
        return plan.error.code === "overlap"
          ? {
              ok: false,
              reason: "overlap",
              conflictingSlotId: plan.error.conflictingSlotId,
            }
          : { ok: false, reason: plan.error.code };
      }

      const persisted = await transaction.insert({
        workspaceId: input.workspaceId,
        startsAt: plan.value.startsAt,
        endsAt: plan.value.endsAt,
        sessionMinutes,
        bufferMinutes,
      });

      if (!persisted.ok) {
        return { ok: false, reason: "overlap" };
      }

      return {
        ok: true,
        slot: {
          id: persisted.slot.id,
          startsAt: persisted.slot.startsAt,
          endsAt: persisted.slot.endsAt,
          status: persisted.slot.status,
          sessionMinutes,
          bufferMinutes,
        },
        warnings: plan.value.warnings,
      };
    });
  };
}
