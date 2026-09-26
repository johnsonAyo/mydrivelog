export interface IdentityProvider {
  customTokenForVerifiedEmail(email: string): Promise<string>;
  verifyIdToken(idToken: string): Promise<{ uid: string; email: string; emailVerified: boolean }>;
}
