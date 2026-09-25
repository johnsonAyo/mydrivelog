import type { SessionContext } from "./session-context";

export function canWriteWorkspace(session: SessionContext, now = new Date()): boolean {
  return session.workspaceStatus === "active" && (session.testingWorkspace === true ||
    (session.trialEndsAt !== null && session.trialEndsAt > now) ||
    (session.paidThrough !== null && session.paidThrough > now));
}
