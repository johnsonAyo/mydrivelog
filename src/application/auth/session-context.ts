export type SessionContext = {
  readonly identityId: string;
  readonly workspaceId: string;
  readonly workspaceStatus: "active" | "suspended";
};

export interface SessionResolver {
  resolve(rawToken: string): Promise<SessionContext | null>;
}
