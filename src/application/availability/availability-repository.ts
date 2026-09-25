import type {
  AvailabilitySlot,
  NearbySlot,
  SchedulingPolicy,
} from "@/domain/availability/types";

export type PersistAvailabilityInput = {
  readonly workspaceId: string;
  readonly startsAt: Date;
  readonly endsAt: Date;
  readonly sessionMinutes?: number;
  readonly bufferMinutes?: number;
};

export type PersistAvailabilityResult =
  | { readonly ok: true; readonly slot: AvailabilitySlot }
  | { readonly ok: false; readonly reason: "overlap" };

export interface AvailabilityTransaction {
  getSchedulingPolicy(workspaceId: string): Promise<SchedulingPolicy | null>;
  findNearby(workspaceId: string, startsAt: Date, endsAt: Date): Promise<readonly NearbySlot[]>;
  insert(input: PersistAvailabilityInput): Promise<PersistAvailabilityResult>;
}

export interface AvailabilityRepository {
  transaction<TResult>(
    work: (transaction: AvailabilityTransaction) => Promise<TResult>,
  ): Promise<TResult>;
  list(workspaceId: string, from: Date, to: Date): Promise<readonly AvailabilitySlot[]>;
  exportAll(workspaceId: string): Promise<readonly {
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: "open" | "booked" | "withdrawn";
  }[]>;
}
