export type SessionContext = {
  readonly identityId: string;
  readonly workspaceId: string;
  readonly workspaceStatus: "active" | "suspended";
  readonly trialEndsAt: Date | null;
  readonly paidThrough: Date | null;
};

export interface SessionResolver {
  resolve(rawToken: string): Promise<SessionContext | null>;
}
