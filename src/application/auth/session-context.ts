export type SessionContext = {
  readonly identityId: string;
  readonly workspaceId: string;
  readonly workspaceStatus: "active" | "suspended";
  readonly pilotActive: boolean;
  readonly trialEndsAt: Date | null;
  readonly paidThrough: Date | null;
  readonly testingWorkspace?: true;
};

export interface SessionResolver {
  resolve(rawToken: string | null): Promise<SessionContext | null>;
}
