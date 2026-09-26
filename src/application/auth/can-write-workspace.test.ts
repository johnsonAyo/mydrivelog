import { describe, expect, it } from "vitest";
import { canWriteWorkspace } from "./can-write-workspace";

const now = new Date("2026-10-10T00:00:00.000Z");
const session = {
  identityId: "instructor-1",
  workspaceId: "workspace-1",
  workspaceStatus: "active" as const,
  trialEndsAt: new Date("2026-10-01T00:00:00.000Z"),
  paidThrough: null,
  pilotActive: true,
};

describe("workspace write access", () => {
  it("keeps pilot workspaces writable beyond the old trial date", () => {
    expect(canWriteWorkspace(session, now)).toBe(true);
  });

  it("ends pilot access only when explicitly disabled", () => {
    expect(canWriteWorkspace({ ...session, pilotActive: false }, now)).toBe(false);
  });

  it("does not allow a suspended pilot workspace to write", () => {
    expect(canWriteWorkspace({ ...session, workspaceStatus: "suspended" }, now)).toBe(false);
  });
});
