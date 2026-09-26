import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to set up database invariants.");
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

try {
  await sql`CREATE EXTENSION IF NOT EXISTS btree_gist`;
  const [constraint] = await sql`
    SELECT pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    WHERE c.conrelid = 'availability_slots'::regclass
      AND c.conname = 'availability_slots_no_workspace_overlap'
  `;
  if (!constraint) {
    await sql`
      ALTER TABLE availability_slots
      ADD CONSTRAINT availability_slots_no_workspace_overlap
      EXCLUDE USING gist (
        workspace_id WITH =,
        tstzrange(starts_at, ends_at, '[)') WITH &&
      ) WHERE (status <> 'withdrawn')
    `;
  } else if (!constraint.definition.includes("EXCLUDE USING gist") || !constraint.definition.includes("tstzrange")) {
    throw new Error("Existing availability overlap constraint differs from the required rule.");
  }
  console.log("Database overlap protection is ready.");
} finally {
  await sql.end();
}
