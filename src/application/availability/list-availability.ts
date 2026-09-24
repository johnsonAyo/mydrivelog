import type { AvailabilityRepository } from "./availability-repository";

type ListAvailabilityInput = {
  readonly workspaceId: string;
  readonly from: Date;
  readonly to: Date;
};

export function listAvailabilityUseCase(repository: AvailabilityRepository) {
  return function listAvailability(input: ListAvailabilityInput) {
    return repository.list(input.workspaceId, input.from, input.to);
  };
}
