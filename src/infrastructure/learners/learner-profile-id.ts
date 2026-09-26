import { createHash } from "node:crypto";

export function learnerProfileId(workspaceId: string, sourceEmail: string) {
  return createHash("sha256").update(`${workspaceId}:${sourceEmail.toLowerCase()}`).digest("hex");
}
