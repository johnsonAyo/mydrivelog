# Lesson debrief implementation handoff

Status: agreed product behaviour; implementation in progress. This file is the durable handoff for another agent. Update the progress log and verification results as work lands. Do not treat the isolated component-lab examples as a working feature.

## Authority and current state

- The decisions in this file come from the instructor briefing on 25–26 September 2026. They override conflicting discovery text in `SPEC.md`; `docs/PRODUCT_DECISIONS.md` remains authoritative for the rest of the product.
- Start from the `staging` branch. At the start of this work, the worktree had an unrelated untracked `docs/research/` directory; leave it alone.
- The live bookings are in `collection_bookings` linked to `collection_slots`. Older bookings also exist in `bookings` linked to `availability_slots`; inspect which routes still expose them before choosing how the lesson read model represents both.
- Before this work, `src/app/today/page.tsx` redirected to `/calendar` and the `packages/ui/src/lessons.tsx` examples were inert. The implementation below now adds a real lesson route and Today page, but it has **not** been migrated or exercised against the live database. Do not mistake a passing build for a deployed feature.
- Follow the four layers in `docs/ARCHITECTURE.md`: presentation routes/UI, application use cases, framework-free domain policy, infrastructure repositories/provider adapters. Product UI components in `packages/ui` accept props and action slots; no direct database or API fetch inside them. Read `AGENTS.md` and the applicable Next 16 docs in `node_modules/next/dist/docs/` before editing App Router code.
- Follow `docs/COMPONENT_SYSTEM.md` and the `../styling-discipline` reference. Reuse product tokens/primitives and Tailwind conventions; no stray CSS or page-specific styling leakage. Run the CSS/style guards.

## Agreed behaviour

1. A booked lesson opens a single lesson detail view from both Calendar and Today. This is where the instructor prepares, writes private notes, drafts a learner recap, reviews prior context, and completes the lesson. No separate top-level Notes page.
2. The note area is available immediately after a booking is confirmed. The instructor can type before, during, or after the lesson. Drafts autosave durably with visible `Saving`, `Saved`, and recoverable error states; a failed save must never appear successful.
3. Use visibly separate areas named **Private notes** and **Recap for learner**. Private notes are only visible to the instructor and never appear on a public booking/availability link, in a learner email, in an AI request, or in provider/log payloads.
4. The learner recap is structured with three short prompts: **What we worked on**, **What to practise**, and **Next lesson focus**. The next-focus field is distinct data, not merely prose. Carry it into the instructor's next booked lesson for that same learner, including when the next booking is made later. An email includes the approved next focus only if the instructor sends that recap.
5. Skill outcomes are optional. The instructor selects only skills covered in that lesson and marks each **Introduced**, **Developing**, or **Confident**. They carry forward to the learner's history and appear in an approved learner recap. They are not required to complete a lesson.
6. Once the booked end time has passed, an uncompleted lesson is presented as **Awaiting debrief**. It remains so until the instructor explicitly completes it. Do not infer attendance, add a `missed` state, auto-complete, or send automatically. Explicit cancellations keep using the existing cancellation flow and are not treated as taught lessons awaiting debrief.
7. Completion and email are separate decisions. An instructor may complete with private notes only or without notes (with the spec's acknowledgement), and may complete without sending. Learner-facing sending is unavailable before the lesson ends. No automatic email on draft save or completion.
8. Before sending, show the exact learner-facing email/recap for review and require an explicit approval/send action. Address it only to that booking's learner email. Never display recap content through the general availability/booking link; students have no accounts.
9. Persist the exact sent recap as an immutable snapshot, distinct from editable draft and private note. Private notes remain editable after completion, retaining update metadata. A correction to a sent recap is a separately labelled follow-up communication, not mutation of history.
10. Save domain/debrief state independently of email-provider success. Show queued/delivered/needs-attention status; retries must target the same recap and cannot duplicate a debrief or change the sent snapshot. Use the project's email branding/provider adapter patterns, with no private content in logs.
11. Defer AI polishing for the first build. Do not add automatic AI or AI calls. The data and UI boundaries should leave room for a later explicit polish action, but no speculative AI integration now.

## Proposed implementation sequence

These are bounded vertical slices, not permission to claim the whole feature is done after the first slice. Record exact files and tests below as each slice lands.

1. **Domain and persistence:** define a lesson identity/read model that resolves a confirmed booking in its workspace; add Drizzle tables for editable debrief draft, optional per-lesson skill assessments, immutable sent recap/follow-up, and a durable email outbox or equivalent delivery record. Apply the schema directly to each target database. Separate private and shared columns/entities. Avoid cascading deletion of sent history through an editable draft. Plan the stable learner key using the current contact/email model; do not invent learner accounts.
2. **Application/API:** authenticated, workspace-scoped lesson read, autosave draft, completion, preview/send, follow-up, and delivery status/retry operations. Require `canWriteWorkspace` for mutations. Validate inputs, check confirmed booking and end-time rules, and make send/completion idempotent. Commit the recap snapshot and outbound message intent in one DB transaction; provider delivery happens afterward. No optimistic success for critical mutations.
3. **Isolated UI components:** develop lesson detail, status, private/shared editor, skill picker, carried-forward context, recap preview, and send/delivery states independently in `packages/ui`/component lab. Keep component props explicit and style within existing tokens/primitives. Test accessibility and responsive states, especially mobile typing and error recovery.
4. **Route composition:** add a real lesson detail/debrief page; link confirmed lesson rows/cards from Calendar and build the Today queue. Today should show chronological bookings and awaiting debriefs without inventing attendance states. Existing calendar availability planning must keep working.
5. **Email and resilience:** brand recap and follow-up templates, dispatch from the durable message record, expose delivery outcome/retry, and ensure provider failure never rolls back or duplicates a saved debrief.
6. **Verification:** typecheck, focused tests, full tests, lint, CSS/style guards, build, and manual keyboard/mobile flow. Verify workspace isolation, private-note exclusion, send cutoff, exact sent snapshot, follow-up, cancellation, provider failure/retry, and carried-forward next focus.

## Acceptance walkthrough

- Book a real lesson. Open it from Calendar/Today immediately. Add private preparation and a draft recap; navigate away and back and see persisted content with a trustworthy save indicator.
- At the scheduled end, see Awaiting debrief. Complete privately without sending. No email is queued. Private notes remain editable.
- On another ended lesson, choose skills and fill the three recap prompts. Preview the exact addressed email; approve/send. The learner receives only their own approved content, while the instructor sees the immutable snapshot and delivery state.
- Open the same learner's next booked lesson and see the previous next-focus prompt carried forward. Other learners' notes do not leak.
- Simulate email failure, retry the same message, and verify that neither the debrief nor the sent snapshot is duplicated.
- Verify an old booking is **not** labelled missed merely because its end time passed. Verify cancelled bookings do not appear in the awaiting-debrief queue.

## Progress log

- [x] 2026-09-26: Created this handoff before implementation.
- [x] Domain and persistence code: `src/domain/lessons/`, `src/infrastructure/database/schema.ts`, the direct schema-push workflow. A debrief belongs to exactly one collection or legacy booking; skills and immutable-message rows are separate. The local development database has the current tables; staging and production require separate schema verification.
- [x] Application/API code: `src/application/lessons/`, `src/infrastructure/lessons/`, and `/api/v1/lessons/[bookingId]` GET/PATCH, `/complete`, `/preview`, `/messages`, and `/messages/[messageId]/retry`. Mutations require a writable authenticated workspace; draft saves use a revision check. Sending saves a snapshot/message intent before calling the email provider.
- [x] UI and composition code: isolated `packages/ui/src/lesson-detail.tsx`; connected `src/components/lesson-workspace.tsx` and `/lessons/[bookingId]`; Today now lists booked lessons and awaiting debriefs, and collection bookings link to the lesson page. CSS is in the existing product stylesheet boundary.
- [x] Local static verification: `npm run verify` passes (CSS/style guards, typecheck, 51 tests, lint, production build). This does **not** include a database-backed walkthrough, mobile/keyboard inspection, or provider delivery test.
- [x] 2026-09-26: Reworked the shared instructor navigation for mobile: a compact brand/menu row, collapsible navigation and sign out, and a shorter Calendar heading. Checked the menu at 375px and 500px widths and the desktop sidebar at 1280px. This does not complete the debrief-specific mobile and keyboard walkthrough below.
- [ ] Push the current schema to the intended staging and production databases after confirming each target; then run the acceptance walkthrough with real bookings.
- [ ] Add focused repository/route integration tests, especially workspace isolation, concurrent autosave, cancellation, exact snapshot, recipient, and delivery retry.
- [ ] Verify provider delivery and failure/retry. The current `lesson-delivery.ts` records provider acceptance as `delivered`, not a downstream delivery webhook. Resend receives an idempotency key; the Brevo branch currently does not provide equivalent retry de-duplication. Resolve this before claiming exactly-once email delivery.
- [ ] Manual responsive and accessibility QA, including failed autosave, multiple skill rows, and Today/Calendar navigation.

## Current API contract and continuation point

- `GET /api/v1/lessons/:bookingId` returns `{ data: InstructorLesson }` with `draft`, `messages`, `previousNextFocus`, and `previousSkills`. It uses `Cache-Control: private, no-store`.
- `PATCH /api/v1/lessons/:bookingId` accepts `expectedRevision`, `privateNotes`, the three shared recap fields, and `skills: [{ skill, outcome }]`; a stale revision returns 409. The client excludes blank in-progress skill rows from autosave.
- `POST /complete` accepts `{ acknowledgeEmpty: boolean }`. Completion requires the booked end time; an empty debrief needs explicit acknowledgement. Completion never sends email.
- `POST /preview` accepts `{ kind: "recap" | "follow_up", correction? }` and returns the recipient, exact subject/body, and a hash. `POST /messages` requires that hash, a UUID idempotency key, and the expected draft revision. The transaction stores the approved snapshot before delivery is attempted. The retry route addresses that same saved message.
- The current UI is an initial complete route, not a finished design review. Keep presentation in `packages/ui` and orchestration in `src/components/lesson-workspace.tsx`; do not put database access into the UI package.

## Constraints for the next agent

- Read the repo status first and preserve unrelated changes.
- Update this document when a decision is refined or a slice is completed. Distinguish implemented, tested, and merely planned work.
- Never commit credentials or push the schema to production without verifying the target database.
- Do not claim a working recap email until delivery, error, and retry paths have been exercised.
