import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { AccessEmailSender, AuthRepository } from "@/application/auth/access-repository";
import { problem } from "./problem";

const emailSchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email().max(254)) });
const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
const LINK_MINUTES = 15;
const SESSION_DAYS = 30;

type Dependencies = {
  readonly auth: AuthRepository;
  readonly email: AccessEmailSender;
  readonly origin: string;
  readonly now?: () => Date;
};

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export function authRoutes({ auth, email, origin, now = () => new Date() }: Dependencies) {
  return {
    async requestLink(request: NextRequest) {
      const body = await request.json().catch(() => null);
      const parsed = emailSchema.safeParse(body);
      if (!parsed.success) {
        return noStore(problem(400, "invalid_email", "Enter a valid email address"));
      }

      const address = parsed.data.email;
      const token = randomBytes(32).toString("hex");
      const issuedAt = now();
      try {
        const result = await auth.issueChallenge({
          email: address,
          tokenHash: hash(token),
          expiresAt: new Date(issuedAt.getTime() + LINK_MINUTES * 60_000),
          now: issuedAt,
        });
        if (result === "issued") {
          const url = new URL("/auth/verify", origin);
          url.searchParams.set("token", token);
          await email.sendAccessLink({ to: address, url: url.toString() });
        }
        return noStore(NextResponse.json({ message: "If the address can receive mail, an access link is on its way." }, { status: 202 }));
      } catch {
        const correlationId = randomUUID();
        console.error("Access link request failed", { correlationId });
        return noStore(problem(503, "access_link_unavailable", "Could not send the access link right now", correlationId));
      }
    },

    async verify(request: NextRequest) {
      const body = await request.json().catch(() => null);
      const parsed = tokenSchema.safeParse(body);
      if (!parsed.success) {
        return noStore(problem(400, "invalid_access_link", "This access link is invalid or expired"));
      }

      const sessionToken = randomBytes(32).toString("hex");
      const verifiedAt = now();
      const sessionExpiresAt = new Date(verifiedAt.getTime() + SESSION_DAYS * 86_400_000);
      try {
        const access = await auth.consumeChallenge({
          tokenHash: hash(parsed.data.token),
          sessionTokenHash: hash(sessionToken),
          sessionExpiresAt,
          now: verifiedAt,
        });
        if (!access) {
          return noStore(problem(400, "invalid_access_link", "This access link is invalid or expired"));
        }

        const response = noStore(NextResponse.json({ next: "/today" }));
        response.cookies.set(process.env.SESSION_COOKIE_NAME ?? "drivetrack_session", sessionToken, {
          httpOnly: true,
          secure: new URL(origin).protocol === "https:",
          sameSite: "lax",
          path: "/",
          expires: sessionExpiresAt,
        });
        return response;
      } catch {
        const correlationId = randomUUID();
        console.error("Access link verification failed", { correlationId });
        return noStore(problem(503, "verification_unavailable", "Could not verify the access link right now", correlationId));
      }
    },
  };
}
