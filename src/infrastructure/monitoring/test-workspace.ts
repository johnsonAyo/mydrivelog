import { getDatabase } from "@/infrastructure/database/client";

// The journey check signs in as a dedicated instructor. Its workspace is found by
// the owner's email (MONITORING_TEST_INSTRUCTOR_EMAIL), never from request input.
const CACHE_MS = 5 * 60_000;
let cached: { id: string | null; until: number } | undefined;

export async function monitoringWorkspaceId(): Promise<string | null> {
  const email = process.env.MONITORING_TEST_INSTRUCTOR_EMAIL?.trim().toLowerCase();
  if (!email) return null;
  if (cached && cached.until > Date.now()) return cached.id;
  const { client } = getDatabase();
  const [row] = await client<{ id: string }[]>`
    select w.id from workspaces w join instructor_identities i on i.id = w.owner_identity_id
    where lower(i.email) = ${email} limit 1
  `;
  cached = { id: row?.id ?? null, until: row ? Date.now() + CACHE_MS : Date.now() + 30_000 };
  return cached.id;
}

export async function isMonitoringWorkspace(workspaceId: string | undefined): Promise<boolean> {
  if (!workspaceId) return false;
  return (await monitoringWorkspaceId()) === workspaceId;
}

/** Workspace and instructor behind a learner-side booking, so public activity can name the instructor. */
export async function bookingOwner(bookingId: string): Promise<{ workspaceId: string; instructorName: string | null } | null> {
  const { client } = getDatabase();
  const [row] = await client<{ workspace_id: string; full_name: string | null }[]>`
    select c.workspace_id, i.full_name from collection_bookings b
      join availability_collections c on c.id = b.collection_id
      join workspaces w on w.id = c.workspace_id
      join instructor_identities i on i.id = w.owner_identity_id
    where b.id = ${bookingId}
    union all
    select b.workspace_id, i.full_name from bookings b
      join workspaces w on w.id = b.workspace_id
      join instructor_identities i on i.id = w.owner_identity_id
    where b.id = ${bookingId}
    limit 1
  `;
  return row ? { workspaceId: row.workspace_id, instructorName: row.full_name } : null;
}
