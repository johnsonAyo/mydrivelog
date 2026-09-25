export type IssueCode = {
  readonly id: string;
  readonly email: string;
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly now: Date;
};

export type ConsumeCode = {
  readonly email: string;
  readonly code: string;
  readonly secret: string;
  readonly now: Date;
};

export type EstablishSession = {
  readonly email: string;
  readonly firebaseUid: string;
  readonly sessionTokenHash: string;
  readonly sessionExpiresAt: Date;
  readonly now: Date;
};

export interface AuthRepository {
  issueCode(input: IssueCode): Promise<"issued" | "rate_limited">;
  invalidateCode(id: string): Promise<void>;
  consumeCode(input: ConsumeCode): Promise<"valid" | "invalid">;
  establishSession(input: EstablishSession): Promise<{ needsOnboarding: boolean }>;
  completeOnboarding(input: { identityId: string; fullName: string }): Promise<void>;
  revokeSession(sessionTokenHash: string): Promise<void>;
}

export interface AccessEmailSender {
  sendAccessCode(input: { readonly to: string; readonly code: string }): Promise<void>;
}
