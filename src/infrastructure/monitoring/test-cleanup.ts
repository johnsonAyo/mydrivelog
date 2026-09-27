import { getDatabase } from "@/infrastructure/database/client";

/**
 * Deletes every record the journey check creates, inside the monitoring workspace only.
 * The workspace id always comes from monitoringWorkspaceId(), never from the request.
 * The workspace and its instructor stay, so the next run signs in to the same place.
 */
export async function deleteMonitoringRecords(workspaceId: string) {
  const { client } = getDatabase();
  return client.begin(async (sql) => {
    const count = async (query: PromiseLike<ArrayLike<unknown>>) => (await query).length;
    const messages = await count(sql`delete from lesson_messages where debrief_id in (select id from lesson_debriefs where workspace_id = ${workspaceId}) returning id`);
    const debriefs = await count(sql`delete from lesson_debriefs where workspace_id = ${workspaceId} returning id`);
    const bookings = await count(sql`delete from collection_bookings where collection_id in (select id from availability_collections where workspace_id = ${workspaceId}) returning id`);
    const weeks = await count(sql`delete from availability_collections where workspace_id = ${workspaceId} returning id`);
    const legacyBookings = await count(sql`delete from bookings where workspace_id = ${workspaceId} returning id`);
    const releases = await count(sql`delete from availability_releases where workspace_id = ${workspaceId} returning id`);
    const windows = await count(sql`delete from availability_slots where workspace_id = ${workspaceId} returning id`);
    const learners = await count(sql`delete from learner_contacts where workspace_id = ${workspaceId} returning id`);
    return { messages, debriefs, bookings, weeks, legacyBookings, releases, windows, learners };
  });
}
