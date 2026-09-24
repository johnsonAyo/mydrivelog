export type IssueChallenge = {
  readonly email: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly now: Date;
};

export type ConsumeChallenge = {
  readonly tokenHash: string;
  readonly sessionTokenHash: string;
  readonly sessionExpiresAt: Date;
  readonly now: Date;
};

export type VerifiedAccess = {
  readonly identityId: string;
  readonly workspaceId: string;
  readonly trialEndsAt: Date;
};

export interface AuthRepository {
  issueChallenge(input: IssueChallenge): Promise<"issued" | "rate_limited">;
  consumeChallenge(input: ConsumeChallenge): Promise<VerifiedAccess | null>;
}

export interface AccessEmailSender {
  sendAccessLink(input: { readonly to: string; readonly url: string }): Promise<void>;
}
