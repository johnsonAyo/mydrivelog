import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashAccessCode } from "@/application/auth/access-code";
import type { AccessEmailSender, AuthRepository } from "@/application/auth/access-repository";
import type { IdentityProvider } from "@/application/auth/identity-provider";
import { problem } from "./problem";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
const requestSchema = z.object({ email: emailSchema });
const verifySchema = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/) });
const sessionSchema = z.object({ idToken: z.string().min(100) });
const CODE_MINUTES = 10;
const SESSION_DAYS = 30;

type Dependencies = {
  readonly auth: AuthRepository;
  readonly email: AccessEmailSender;
  readonly identity: IdentityProvider;
  readonly codeSecret: string;
  readonly now?: () => Date;
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function sameOrigin(request: NextRequest): boolean {
  const sentOrigin = request.headers.get("origin");
  return !sentOrigin || sentOrigin === request.nextUrl.origin;
}

export function authRoutes({ auth, email, identity, codeSecret, now = () => new Date() }: Dependencies) {
  return {
    async requestCode(request: NextRequest) {
      if (!sameOrigin(request)) return noStore(problem(403, "invalid_origin", "This request is not allowed"));
      const parsed = requestSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return noStore(problem(400, "invalid_email", "Enter a valid email address"));

      const address = parsed.data.email;
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const id = randomUUID();
      const issuedAt = now();
      let issued = false;
      try {
        const result = await auth.issueCode({
          id,
          email: address,
          codeHash: hashAccessCode(codeSecret, id, address, code),
          expiresAt: new Date(issuedAt.getTime() + CODE_MINUTES * 60_000),
          now: issuedAt,
        });
        if (result === "rate_limited") return noStore(problem(429, "code_rate_limited", "Please wait before requesting another code"));
        issued = true;
        await email.sendAccessCode({ to: address, code });
        return noStore(NextResponse.json({ message: "A sign-in code is on its way." }, { status: 202 }));
      } catch {
        if (issued) await auth.invalidateCode(id).catch(() => undefined);
        const correlationId = randomUUID();
        console.error("Access code request failed", { correlationId });
        return noStore(problem(503, "access_code_unavailable", "Could not send a sign-in code right now", correlationId));
      }
    },

    async verifyCode(request: NextRequest) {
      if (!sameOrigin(request)) return noStore(problem(403, "invalid_origin", "This request is not allowed"));
      const parsed = verifySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return noStore(problem(400, "invalid_code", "Enter the six-digit code from your email"));
      try {
        const result = await auth.consumeCode({ ...parsed.data, secret: codeSecret, now: now() });
        if (result === "invalid") return noStore(problem(400, "invalid_code", "That code is invalid or expired"));
        const customToken = await identity.customTokenForVerifiedEmail(parsed.data.email);
        return noStore(NextResponse.json({ customToken }));
      } catch {
        const correlationId = randomUUID();
        console.error("Access code verification failed", { correlationId });
        return noStore(problem(503, "verification_unavailable", "Could not verify the code right now", correlationId));
      }
    },

    async establishSession(request: NextRequest) {
      if (!sameOrigin(request)) return noStore(problem(403, "invalid_origin", "This request is not allowed"));
      const parsed = sessionSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return noStore(problem(400, "invalid_identity", "Sign in again to continue"));
      let verified;
      try {
        verified = await identity.verifyIdToken(parsed.data.idToken);
      } catch {
        return noStore(problem(401, "invalid_identity", "Sign in again to continue"));
      }
      if (!verified.emailVerified) return noStore(problem(401, "unverified_email", "Verify your email before continuing"));
      const sessionToken = randomBytes(32).toString("hex");
      const issuedAt = now();
      const sessionExpiresAt = new Date(issuedAt.getTime() + SESSION_DAYS * 86_400_000);
      try {
        const session = await auth.establishSession({
          email: verified.email,
          firebaseUid: verified.uid,
          sessionTokenHash: hash(sessionToken),
          sessionExpiresAt,
          now: issuedAt,
        });
        const response = noStore(NextResponse.json({ next: session.needsOnboarding ? "/onboarding" : "/calendar" }));
        response.cookies.set(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session", sessionToken, {
          httpOnly: true,
          secure: request.nextUrl.protocol === "https:",
          sameSite: "lax",
          path: "/",
          expires: sessionExpiresAt,
        });
        return response;
      } catch {
        const correlationId = randomUUID();
        console.error("Session creation failed", { correlationId });
        return noStore(problem(503, "session_unavailable", "Could not open your workspace right now", correlationId));
      }
    },
  };
}
