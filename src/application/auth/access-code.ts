import { createHmac } from "node:crypto";

export function hashAccessCode(secret: string, challengeId: string, email: string, code: string): string {
  return createHmac("sha256", secret).update(`${challengeId}:${email}:${code}`).digest("hex");
}
