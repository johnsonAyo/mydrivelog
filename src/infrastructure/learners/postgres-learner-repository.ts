import { getDatabase } from "@/infrastructure/database/client";

type LearnerRow = { id: string | null; name: string; email: string; source_email: string; upcoming_count: number };

export async function listLearners(workspaceId: string) {
  const { client } = getDatabase();
  const rows = await client<LearnerRow[]>`
    with seen as (
      select distinct on (lower(person.email)) person.name, lower(person.email) as email from (
        select i.name, i.email, i.created_at as seen_at from collection_invitations i
          join availability_collections c on c.id = i.collection_id where c.workspace_id = ${workspaceId}
        union all
        select b.name, b.email, b.created_at as seen_at from collection_bookings b
          join availability_collections c on c.id = b.collection_id where c.workspace_id = ${workspaceId}
        union all
        select r.name, r.email, r.created_at as seen_at from release_recipients r
          join availability_releases a on a.id = r.release_id where a.workspace_id = ${workspaceId}
      ) person order by lower(person.email), person.seen_at desc
    ), directory as (
      select m.id, m.name, lower(m.email) as email, lower(m.source_email) as source_email from learner_contacts m where m.workspace_id = ${workspaceId}
      union all
      select null::uuid, s.name, s.email, s.email from seen s
        where not exists (select 1 from learner_contacts m where m.workspace_id = ${workspaceId}
          and (lower(m.source_email) = s.email or lower(m.email) = s.email))
    )
    select d.id, d.name, d.email, d.source_email,
      ((select count(*) from collection_bookings b join collection_slots s on s.id = b.slot_id
        join availability_collections c on c.id = b.collection_id
        where c.workspace_id = ${workspaceId} and b.status = 'confirmed' and s.starts_at > now()
          and lower(b.email) in (d.email, d.source_email))
      + (select count(*) from bookings b join release_recipients r on r.id = b.recipient_id
        where b.workspace_id = ${workspaceId} and b.status = 'confirmed' and b.starts_at > now()
          and lower(r.email) in (d.email, d.source_email)))::int as upcoming_count
    from directory d order by lower(d.name), d.email
  `;
  return rows.map((row) => ({ id: row.id, name: row.name, email: row.email, sourceEmail: row.source_email, upcomingLessons: row.upcoming_count }));
}

export async function saveLearner(workspaceId: string, input: { sourceEmail: string; name: string; email: string }) {
  const { client } = getDatabase();
  const [row] = await client<{ id: string }[]>`
    insert into learner_contacts (workspace_id, source_email, name, email)
    values (${workspaceId}, ${input.sourceEmail.toLowerCase()}, ${input.name}, ${input.email.toLowerCase()})
    on conflict (workspace_id, lower(source_email)) do update set name = excluded.name, email = excluded.email, updated_at = now()
    returning id
  `;
  return row.id;
}
