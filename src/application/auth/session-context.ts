export type SessionContext = {
  readonly identityId: string;
  readonly workspaceId: string;
  readonly workspaceStatus: "active" | "suspended";
  readonly pilotActive: boolean;
  readonly trialEndsAt: Date | null;
  readonly paidThrough: Date | null;
  readonly instructorName?: string | null;
  readonly testingWorkspace?: true;
};

export interface SessionResolver {
  resolve(rawToken: string | null): Promise<SessionContext | null>;
}

export function instructorFirstName(fullName?: string | null): string {
  if (!fullName) return "Alex";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "Alex";
}
