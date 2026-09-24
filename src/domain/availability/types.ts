export type AvailabilitySlot = {
  readonly id: string;
  readonly workspaceId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly status: "open";
};

export type SchedulingPolicy = {
  readonly defaultSessionMinutes: number;
  readonly bufferWarningMinutes: number;
};

export type NearbySlot = Pick<AvailabilitySlot, "id" | "startsAt" | "endsAt">;

export type BufferWarning = {
  readonly code: "short_buffer";
  readonly adjacentSlotId: string;
  readonly gapMinutes: number;
  readonly preferredMinutes: number;
  readonly side: "before" | "after";
};

export type PlannedAvailability = {
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly warnings: readonly BufferWarning[];
};

export type AvailabilityPlanningError =
  | { readonly code: "invalid_start" }
  | { readonly code: "invalid_duration" }
  | {
      readonly code: "overlap";
      readonly conflictingSlotId: string;
    };
