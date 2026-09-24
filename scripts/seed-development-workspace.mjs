import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const workspaceId = process.env.DEV_WORKSPACE_ID;

if (!databaseUrl || !workspaceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
  throw new Error("DATABASE_URL and a valid DEV_WORKSPACE_ID are required");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  await sql.begin(async (transaction) => {
    await transaction`
      insert into instructor_identities (email)
      values ('development-instructor@drivetrack.local')
      on conflict do nothing
    `;
    const [identity] = await transaction`
      select id from instructor_identities
      where lower(email) = 'development-instructor@drivetrack.local'
    `;
    await transaction`
      insert into workspaces (id, owner_identity_id, name)
      values (${workspaceId}, ${identity.id}, 'Development workspace')
      on conflict do nothing
    `;
    const [workspace] = await transaction`
      select owner_identity_id from workspaces where id = ${workspaceId}
    `;
    if (!workspace || workspace.owner_identity_id !== identity.id) {
      throw new Error("DEV_WORKSPACE_ID does not identify the seeded development workspace");
    }
  });
  console.log("Development workspace is ready.");
} finally {
  await sql.end();
}
