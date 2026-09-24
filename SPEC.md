# DriveTrack — Product and Engineering Specification

> **Historical discovery draft.** This document preserves earlier route and workflow detail but is not the implementation authority where it conflicts with [confirmed product decisions](docs/PRODUCT_DECISIONS.md). In particular, do **not** build the roster or Students destination described below: there is no student-management module or student account. The old prohibition on payments refers to student lesson payments; it has been superseded for DriveTrack subscription billing. The old invite-only pilot, no-trial, and no-checkout assumptions are also superseded by public Solo signup, a 14-day no-card trial, and planned self-serve subscription checkout. The current repository architecture and route implementation live in `docs/ARCHITECTURE.md` and the source tree. Reconcile this draft before using any remaining route-level requirements as build tickets.

**Internal codename:** `gbot`
**Product name:** DriveTrack
**Launch market:** United Kingdom
**Milestone:** Private production pilot with 3–5 independent driving instructors
**Document status:** Confirmed product direction; implementation-ready baseline

## Problem Statement

Independent driving instructors run a time-sensitive service from a car. Their working day is split between lessons, travel, student communication, availability planning, cancellations, and recording what happened after each lesson. Generic calendars and booking products handle appointments, but they do not reflect the way driving lessons actually work:

- instructors release a changing supply of lesson slots rather than maintaining one permanent public booking page;
- travel gaps matter, but legitimate exceptions must remain possible;
- students may book, cancel, or reschedule without needing another account or dashboard;
- instructors need enough student context to act quickly, but not a full student-management system;
- a useful post-lesson recap must be captured in under a minute while the lesson is still fresh;
- the instructor's private observations must remain separate from student-facing notes;
- booking conflicts and weekly limits must remain correct under concurrent requests;
- confirmations, updates, and recaps must be dependable even when an email provider is temporarily unavailable.

The existing repository proves a strong styling discipline, but it is not yet a product system. It has a token vocabulary and foundational UI primitives, while DriveTrack requires a complete, opinionated application experience: responsive navigation, an exceptional calendar, overlays, data-display patterns, state feedback, motion rules, accessibility, and production-grade application boundaries.

The product must not feel like a generic administration template or a weekend prototype. It should feel calm, precise, and purpose-built. Its quality must be visible in the hierarchy, language, transitions, empty states, keyboard behavior, mobile ergonomics, failure recovery, and the correctness of the underlying workflows—not through decorative “AI” styling.

The first milestone succeeds when real UK instructors can use DriveTrack with real students and real bookings, safely and confidently, without payment handling, student accounts, team administration, or unnecessary operational complexity.

## Solution

DriveTrack is an instructor-first scheduling and lesson-debrief workspace with a deliberately small student surface.

The public marketing site and the authenticated product ship as one Next.js application and one deployment. The root route is the public DriveTrack landing page, supported by focused product, privacy, and terms pages. Marketing and product use the same design tokens, typography, components, accessibility standard, and quality bar while retaining distinct layouts and information architecture. A signed-in instructor may still visit the landing page; the primary call to action changes from **Sign in** to **Open DriveTrack** rather than forcing a redirect.

The instructor signs in by email magic link, completes a concise onboarding flow, maintains a lightweight roster, creates availability on a weekly calendar, selects draft slots for a release, chooses recipients, previews the communication, and publishes secure student-specific booking links. A student opens the link, sees that the page is specifically for them, and claims an available slot without registration or form filling. They can later cancel or atomically reschedule through a secure management link when the booking is outside the 48-hour boundary.

After a lesson ends, it appears as **Awaiting debrief**. The instructor records skill outcomes, rough shared notes, and optional private notes. DriveTrack can explicitly polish the shared notes into a clearer recap and practice goals; the instructor must review and approve the text before sending. Private notes are never included in the AI request. The saved debrief is independent of email delivery, so provider failures cannot lose instructor work.

The core instructor application has four destinations:

1. **Today** — the mobile-first command surface for the working day, direct booking, student lookup, contact actions, cancellations, and fast debriefs.
2. **Calendar** — the signature planning surface for creating availability, detecting conflicts and tight travel gaps, managing released slots, and handling student-aware changes.
3. **Students** — a lightweight internal roster with booking history, lesson history, contact details, practical-driving context, and private notes.
4. **Settings** — workspace profile, duration and buffer defaults, booking allowance, student contact options, appearance, skills, and operational preferences.

On desktop and tablet, navigation uses a narrow sidebar and gives the calendar room to breathe. On mobile, navigation uses a bottom bar and prioritises actions that can be completed safely in a car between lessons. Mobile is not a compressed desktop interface: it is a command surface designed around Today, direct booking, lookup, cancellation, and a sub-60-second debrief.

The visual system is a premium operational cockpit: typographically confident, restrained, high-contrast where needed, and rich in small interaction details. Light and dark themes are first-class. The default follows the system setting, with explicit System, Light, and Dark preferences. The calendar is the signature expression of the brand. “Post-AI” means intelligent defaults, concise assistance, contextual actions, and graceful state handling—not gradients, glowing chrome, or a generic chatbot.

## User Stories

1. As a new instructor, I can request a sign-in magic link using my email address so that I do not need to create or remember a password.
2. As an instructor, I receive a single-use, time-limited sign-in link and can establish a secure session after opening it.
3. As an instructor, I can sign out of the current device and invalidate its session.
4. As an instructor, I cannot access another workspace's students, slots, bookings, debriefs, settings, or operational events.
5. As a suspended workspace owner, I cannot operate the product, while the system retains the workspace data for support and recovery.
6. As a new instructor, I can complete onboarding by entering my display name, required telephone number, business or trading name if applicable, and timezone.
7. As a UK instructor, I receive UK-appropriate defaults: Europe/London time, Monday-first weeks, UK date formatting, UK terminology, and UK-friendly phone/address presentation.
8. As an instructor, I can choose whether students are offered Call, Text, or both when a booking is inside the self-service cancellation boundary.
9. As an instructor, I can set my preferred appearance to System, Light, or Dark.
10. As an instructor, I can see a useful first-run state that guides me to add a student and create availability without presenting a blank dashboard.
11. As an instructor, I can add a student with only a name and email address.
12. As an instructor, I can optionally record a student's telephone number, pickup address, transmission preference, and practical-test date.
13. As an instructor, I can edit the student details that DriveTrack uses for communication and operational context.
14. As an instructor, I can search and quickly open a student from both desktop and mobile.
15. As an instructor, I can see a student's upcoming bookings, past lessons, debrief history, and private notes in one coherent record.
16. As an instructor, I can archive an inactive student without destroying their lesson and booking history.
17. As an instructor, I can restore an archived student.
18. As an instructor, I can permanently delete a student through a separate, strongly confirmed action with a short recovery period.
19. As an instructor, I understand that permanently deleting a student revokes all outstanding action links.
20. As a student, I do not need to create an account, password, profile, or permanent dashboard.
21. As a student, I do not edit my own roster data; I can ask the instructor to correct it.
22. As an instructor, I can create an availability slot by clicking or dragging over the desktop or tablet weekly calendar.
23. As an instructor on mobile, I can tap a time region and confirm the proposed slot in a bottom sheet.
24. As an instructor, a new slot defaults to a two-hour duration.
25. As an instructor, I can change the default session duration in settings.
26. As an instructor, I can override the duration for an individual slot.
27. As an instructor, I can select additional days and duplicate a slot at the same time without recreating each one manually.
28. As an instructor, I cannot create or move a slot so that it overlaps another active slot or booking.
29. As an instructor, I can configure a travel-buffer warning threshold of 0, 15, 30, 45, or 60 minutes, with 30 minutes as the initial default.
30. As an instructor, when a proposed slot creates a gap below my travel-buffer preference, I see the exact gap and can deliberately choose **Keep anyway**.
31. As an instructor, a travel-buffer warning never becomes an absolute booking roadblock.
32. As an instructor, I can distinguish Draft, Open, Booked, Awaiting debrief, Completed, and unavailable calendar states without relying on colour alone.
33. As a keyboard user, I can navigate the calendar, create a slot, open a slot, and reach its actions without a pointer.
34. As a screen-reader user, I hear useful dates, times, durations, states, and student names for calendar items.
35. As an instructor, I can select specific draft slots to include in an availability release.
36. As an instructor, I can use **Select all drafts in range** as an explicit shortcut.
37. As an instructor, DriveTrack never silently adds all drafts to a release.
38. As an instructor, I can choose exactly which active students receive a release.
39. As an instructor, I can review a polished summary of the selected slots, recipients, booking allowance, and link expiry before publishing.
40. As an instructor, publishing a release makes only the selected slots bookable by its selected recipients.
41. As an instructor, I can see whether a release is Draft, Published, Expired, or Revoked.
42. As an instructor, I can revoke a release and immediately invalidate its outstanding booking links.
43. As an instructor, I can resend a student's release email without creating a second release or changing the booking inventory.
44. As a student, I receive a secure, opaque link scoped to me and one availability release.
45. As a student, the booking page clearly says **Booking for [my name]** so that a forwarded link does not silently change identity.
46. As a student, I can see only the currently valid and available slots in the release sent to me.
47. As a student, I can claim a slot with one intentional confirmation action and without re-entering information already held by the instructor.
48. As a student, if another person claims the slot first, I receive an immediate, calm explanation and can choose another remaining slot.
49. As an instructor, two concurrent claim requests can never produce two active bookings for one slot.
50. As an instructor, multiple bookings per student are allowed by default.
51. As an instructor, I can change the self-service weekly allowance to unlimited, two sessions, or one session per student per calendar week.
52. As a student, the weekly allowance applies across all releases in the instructor's workspace, not only within the current email.
53. As a student, the calendar week is calculated Monday through Sunday in the workspace timezone.
54. As an instructor, I can directly book a student even when it exceeds the configured weekly allowance after acknowledging a clear warning.
55. As an instructor, a direct booking can never override a genuine time overlap.
56. As a student, a successful claim is persisted before I am shown a confirmation state.
57. As a student, I receive an email confirmation with the lesson date, time, duration, instructor identity, and management link.
58. As an instructor, I can see the confirmed booking immediately even if confirmation email delivery is delayed.
59. As a student, I can open my secure management link without signing in.
60. As a student, when a lesson starts at least 48 hours from the current time, I can cancel it through the management page.
61. As a student, when a lesson starts at least 48 hours from the current time, I can reschedule it into another eligible slot.
62. As a student, rescheduling claims the replacement and releases the original booking as one atomic operation.
63. As a student, if the replacement becomes unavailable during rescheduling, my original booking remains intact.
64. As a student, inside the 48-hour boundary I cannot self-cancel or self-reschedule and I see the configured Call, Text, or both contact actions.
65. As an instructor, I can cancel or reschedule a booking on a student's behalf with an explicit reason and confirmation step.
66. As an instructor, when a cancellation reopens a slot, it becomes available again in its original active release when that release remains valid.
67. As an instructor, reopening a slot does not automatically send a mass email.
68. As an instructor, I can explicitly choose **Notify students**, review the eligible recipient count and message, and then send an availability update.
69. As an instructor, I can edit an unbooked released slot and see that its release is now marked Updated.
70. As an instructor, after editing an unbooked released slot I can choose whether to send an update email; DriveTrack does not send one silently.
71. As an instructor, editing a booked slot enters a student-aware reschedule flow and cannot silently mutate the student's confirmed appointment.
72. As an instructor, deleting an unbooked slot removes it from active releases and records the action in the operational audit.
73. As an instructor, I can see today's lessons, useful gaps, tight-buffer warnings, and outstanding debriefs in chronological order.
74. As an instructor on mobile, I can open the relevant student, contact them, cancel a lesson, or begin a debrief from Today with minimal navigation.
75. As an instructor, I can make a direct booking from Today in under a minute.
76. As an instructor, after a lesson's end time the lesson appears as Awaiting debrief; the system does not falsely mark it completed.
77. As an instructor, I can start a debrief from Today, the Calendar, or the student's history without creating a separate top-level module.
78. As an instructor, I can record driving skills using the built-in UK practical-driving taxonomy.
79. As an instructor, I can mark each selected skill as Introduced, Developing, or Confident.
80. As an instructor, I can create and manage custom skills alongside the built-in taxonomy.
81. As an instructor, I can enter rough shared notes intended for the student.
82. As an instructor, I can separately enter private notes that are never shown or emailed to the student.
83. As an instructor, I can explicitly choose **Polish recap** to turn my rough shared notes and structured skill outcomes into a clearer proposed recap and practice goals.
84. As an instructor, AI polishing never starts automatically and never sends text automatically.
85. As an instructor, I can review and edit the proposed recap before approving it.
86. As an instructor, private notes, private profile fields, and unrelated student history are never included in the AI request.
87. As an instructor, if AI polishing fails or is unavailable, I can keep editing and send my original notes.
88. As an instructor, I can save the private note and complete the lesson without sending a recap.
89. As an instructor, I can complete the lesson with no notes after acknowledging the choice.
90. As an instructor, I can approve and send a recap while completing the lesson.
91. As a student, I receive a clean email recap containing the approved shared summary, skill outcomes, and practice goals.
92. As an instructor, the exact sent recap is retained as an immutable snapshot.
93. As an instructor, I cannot rewrite history by editing a recap already sent to the student.
94. As an instructor, I can correct or extend a sent recap by creating an explicit follow-up communication.
95. As an instructor, I can continue to edit private notes after lesson completion, with update metadata retained.
96. As an instructor, saving a booking, cancellation, reschedule, release, or debrief succeeds or fails independently of email provider availability.
97. As an instructor, I can see communication status expressed as Queued, Delivered, or Needs attention.
98. As an instructor, I can retry a communication in Needs attention without repeating the underlying domain action.
99. As an instructor, retrying an email cannot create a duplicate booking, cancellation, or debrief.
100. As an instructor, automated outbound communication is email only in the first milestone.
101. As an instructor, DriveTrack can open my device's telephone or messaging application for direct contact but does not send application SMS messages.
102. As an instructor, I never see payment, pricing, invoice, balance, checkout, or payment-status controls anywhere in the product.
103. As a student, I am never asked for payment information in DriveTrack.
104. As a user, I see loading, empty, success, partial-failure, and error states that preserve context and tell me what I can do next.
105. As a user, destructive or student-impacting actions identify the target and consequence before confirmation.
106. As a user, temporary optimistic feedback never masks a server rejection or persistence failure.
107. As a keyboard user, I can operate every core flow with a visible focus indicator.
108. As a user who requests reduced motion, I can use the product without non-essential animation.
109. As a low-vision or colour-vision-deficient user, content and states meet WCAG 2.2 AA contrast requirements and never rely on colour alone.
110. As a mobile user, primary targets are comfortably tappable, bottom sheets respect safe areas, and consequential actions are not placed where accidental touches are likely.
111. As an instructor switching devices or themes, I receive a coherent, recognisably DriveTrack experience rather than separate-looking interfaces.
112. As a pilot operator, I can diagnose delivery failures and important domain actions without reading private note content or relying on raw database inspection.
113. As a prospective instructor, I can understand what DriveTrack is, who it is for, and why it is different within the first screen of the public landing page.
114. As a prospective instructor, I can inspect concrete product workflows and benefits rather than relying on generic claims or decorative mockups.
115. As a prospective pilot user, I can reach sign-in or contact the published pilot email from a clear call to action without encountering public self-service workspace creation.
116. As a signed-in instructor visiting the public site, I can deliberately open DriveTrack without being forcibly redirected away from marketing content.
117. As a visitor, I can read the product's privacy and terms information before sharing an email address or opening a student booking link.
118. As a visitor on mobile or desktop, I receive a fast, accessible, search-readable landing experience that has the same visual quality as the product.
119. As an instructor, I see committed changes reflected across Today, Calendar, Students, Releases, and detail surfaces without contradictory stale state or a false optimistic success.

## Implementation Decisions

### 1. Product boundary and tenancy

- A **Workspace** is the tenant boundary. Every business record carries a workspace identifier, and repository queries require it.
- The pilot supports one instructor-owner per workspace. The data model may represent membership so ownership can evolve later, but there is no team, invitation, permissions, or role-management UI in this milestone.
- Workspace entitlement is an internal operational state: Active or Suspended. There is no billing or subscription domain.
- The instructor is the only authenticated product user. Students are contacts and booking participants, not application users.
- Permanent identifiers use non-sequential values suitable for public URLs. Opaque action tokens are random, single-purpose, revocable, and stored only as hashes.

### 2. Application architecture

- Retain the existing pnpm monorepo and use its Next.js 15 App Router application as the single application and deployment for both the marketing site and the authenticated product. Do not create a second frontend or duplicate the design system.
- Use route groups and nested layouts to separate the public marketing shell, authentication/onboarding shell, authenticated instructor shell, and token-scoped student shell without adding group names to public URLs.
- Marketing pages are Server Component-first and statically rendered wherever their content permits. Product routes use Server Components for initial, permission-checked reads and focused Client Components only where live interaction requires them.
- Organise product code by feature and domain capability rather than by generic technical buckets. Expected capabilities include authentication, workspace onboarding, roster, availability, releases, booking, debriefs, communications, and audit.
- Keep presentation, application, domain, and infrastructure responsibilities explicit:
  - **Presentation** handles routes, components, request parsing, view models, and user feedback.
  - **Application** coordinates use cases and transaction boundaries.
  - **Domain** owns policies, state transitions, time rules, and typed failures without depending on Next.js, the database client, email provider, or AI provider.
  - **Infrastructure** implements repositories and external-provider adapters.
- UI components and route handlers do not access the database directly. They invoke application use cases.
- Server Actions may support authenticated instructor interactions. Route handlers support public token flows, provider webhooks, and job callbacks. Both use the same application layer.
- Shared code remains framework-neutral. Framework request/response types, database rows, and provider payloads do not leak into domain contracts.
- Repository and provider contracts use interfaces when implementations are injected. Unions, aliases, component props, and finite states use types. Imports used only for typing are type-only imports.
- Expected business failures are typed and mapped deliberately to user-safe outcomes. Unknown failures are logged with a correlation identifier and returned without stack traces, SQL, or provider internals.

### 3. State, data access, caching, and invalidation

#### State ownership

- **Server state:** TanStack Query owns mutable server-derived data used by interactive Client Components. Server Components may prefetch and hydrate queries when that removes a visible loading transition, but they do not create a second cache contract.
- **Navigational state:** allowlisted URL path and query parameters own shareable or restorable state such as calendar date/view, focused slot, search, filters, sort, and pagination. Browser refresh, back, and forward must preserve it.
- **Ephemeral view state:** local React state or a reducer owns open menus, draft selections, staged form steps, disclosure state, and other state that does not need to survive navigation.
- **Forms:** React Hook Form manages client form interaction; Zod schemas validate at the server boundary and may be shared for equivalent client feedback. Client validation is assistance, never authority.
- Do not introduce Redux or a global Zustand store for the pilot. If calendar interaction later demonstrates genuinely cross-tree, high-frequency client state that URL, query, and local state cannot represent cleanly, add a feature-scoped store only after an architecture decision record documents the measured need and lifetime.

#### Database querying and transactions

- Use Neon PostgreSQL as the system of record, Drizzle ORM for typed schema/query construction, and Drizzle Kit for migrations. Use a Neon driver and execution mode that support real transactions for atomic booking, cancellation, rescheduling, release publication, token consumption, and outbox persistence.
- Only infrastructure repository implementations issue database queries. Pages, components, Server Actions, route handlers, and domain services do not import the database client directly.
- Repository operations accept workspace scope explicitly. Application use cases own transaction boundaries and return domain-shaped results rather than Drizzle rows.
- Raw SQL is permitted inside the infrastructure layer when PostgreSQL constraints, locking, exclusion behavior, or a query plan require it. The reason, invariant, and coverage must be documented beside the implementation; raw SQL is not an escape from repository boundaries.
- Schema changes are forward migrations committed with the code that consumes them. Production migration and application compatibility must not depend on destructive reset or manual database editing.

#### Rendering and cache policy

- Public marketing routes are statically rendered and CDN-cacheable. A small client island may resolve the current session through the private, `no-store` session endpoint to adapt the primary call to action; this must not make the page body dynamic or place personalised data in shared output. A deployment invalidates changed bundled content; if an external content source is introduced later, its signed webhook must revalidate only the affected tag or path.
- Magic-link, token-bearing, authentication, and student booking-management responses are private and dynamically rendered with `no-store`. Tokens must never enter shared cache keys, analytics, logs, or static output.
- Authenticated product routes are dynamically rendered by default. Any server-rendered cache introduced for a safe shared fragment must declare its owner, tag, lifetime, and mutation invalidators next to the data access code.
- TanStack Query uses a central typed query-key factory. Feature code imports keys rather than composing unrelated string arrays.
- Use named policy constants rather than scattered durations:
  - `INVENTORY_STALE_TIME = 0` for bookable availability, booking eligibility, release inventory, and other contention-sensitive reads;
  - `OPERATIONAL_STALE_TIME = 30 seconds` for Today, Calendar summaries, rosters, student detail, release status, and communication status;
  - `REFERENCE_STALE_TIME = 5 minutes` for settings, skill taxonomy, and stable select-option data.
- Contention-sensitive queries refetch when the surface mounts, regains focus, or reconnects. A fresh-looking client cache never bypasses server-side eligibility, overlap, weekly-limit, token, or transaction checks.

#### Mutation and invalidation contract

1. Submit the typed command and show a pending state scoped to the affected action.
2. Validate and commit the domain mutation, audit event, and outbox message in the required database transaction.
3. Return the committed aggregate identifiers/version and a typed outcome. A failed transaction does not invalidate as if it succeeded.
4. Update only response-exact cached detail when doing so cannot invent state, then invalidate the affected query-key families.
5. Revalidate affected Next.js paths or tags when Server Component output exists, and refresh the current route when it contains one of those summaries.
6. Keep the UI pending or explicitly refreshing until the authoritative result is observable; provider delivery may continue independently through its visible communication state.

The initial mutation-to-cache map is mandatory:

- availability create/edit/delete invalidates the affected Calendar date range, Today when relevant, release drafts containing the slot, and public inventory derived from the slot;
- booking claim/create/cancel/reschedule invalidates the booking detail, affected student, affected Calendar ranges, Today dates, owning release, and token-scoped availability/management result;
- student create/edit/archive/restore/delete invalidates roster queries, student detail, recipient selectors, and any visible Today/Calendar identity summaries;
- release create/publish/revoke/update invalidates release detail/list, affected Calendar slots, recipient link status, and public release inventory;
- debrief draft/completion/follow-up invalidates the lesson, Today queue, Calendar lesson state, and student history;
- settings or skill changes invalidate their detail/reference keys and the future forms whose defaults or options they supply, without rewriting historical records;
- communication enqueue/retry/webhook changes invalidate the communication list/status and the owning release, booking, or lesson surface.

Do not use an application-wide “invalidate everything” call as the normal mutation strategy. Critical mutations—booking, cancellation, rescheduling, deletion, release publication/revocation, debrief completion, and email resend—must not show optimistic success. Optimistic interaction is limited to reversible presentation state such as selection, expansion, ordering previews, or a draft that remains visibly unsaved.

### 4. Route and interaction contract

Routes are part of the product contract. A route owns entry, loading, empty, ready, expected-error, unexpected-error, and not-found behaviour for its surface. It does not own domain policy; mutations delegate to application use cases and return typed outcomes.

#### Route conventions

- `/` is the public marketing landing page, not a session gateway. It remains accessible to signed-out and signed-in visitors. Its primary action is **Sign in** for a signed-out visitor and **Open DriveTrack** for an authenticated owner; pilot-access enquiries use the published contact email rather than creating accounts automatically.
- Authenticated instructor routes require a valid session, an Active workspace entitlement, and workspace ownership of every referenced resource.
- Public student routes require a valid purpose-scoped token. They do not create a student session or grant access to any other student or workspace resource.
- A missing instructor resource returns the product's not-found surface. A resource belonging to another workspace is indistinguishable from a missing resource.
- Suspended workspaces route the instructor to a dedicated access-unavailable state with sign-out and support options. Public booking actions for a suspended workspace are unavailable.
- Mutations use POST semantics, validate on the server, and follow a redirect or state-refresh pattern that prevents accidental form resubmission.
- Internal identifiers may appear in authenticated URLs. Public URLs contain only opaque tokens, never student, booking, release, or workspace identifiers.
- Route query parameters are an allowlisted view contract, not an alternative database. Supported calendar parameters are `date`, `view`, and optional focused `slot`; supported list parameters are `query`, `status`, `sort`, and `page` where relevant.
- Dates in URLs use ISO calendar dates. Instants sent across a mutation boundary include an offset or use UTC. The server remains authoritative for eligibility and time boundaries.
- Overlay routes remain deep-linkable. On desktop they may render as a dialog or side panel; on mobile they may render as a full-height sheet or page. Refreshing the URL must retain a complete, operable surface.
- The browser back action closes a route-driven overlay and restores the prior scroll, date, filters, and focus when possible.
- Unknown routes use a branded not-found page with a safe route back to Today or sign-in. Route failures never expose stack traces, raw provider errors, or record existence across tenancy boundaries.

#### Marketing, authentication, and onboarding routes

| Route                            | Access                                                               | Responsibility and terminal outcomes                                                                                                                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                              | Public                                                               | Primary DriveTrack landing page: audience and problem framing, product promise, concrete workflow evidence, signature product visuals, pilot positioning, trust/accessibility cues, and clear sign-in and pilot-contact actions. A valid session changes the primary action to **Open DriveTrack**; it does not force a redirect. |
| `/features`                      | Public                                                               | Expand the instructor workflows—Today, Calendar, releases, student-scoped booking, and debriefs—with honest product evidence and a path back to the primary action.                                                                                                                                                               |
| `/privacy`                       | Public                                                               | Explain the UK pilot's data handling in readable language, including instructor/student data, secure links, email, AI-assisted recap boundaries, retention contacts, and effective date.                                                                                                                                          |
| `/terms`                         | Public                                                               | State the pilot service terms, acceptable use, availability limitations, instructor responsibilities, and contact details with an effective date.                                                                                                                                                                                 |
| `/robots.txt` and `/sitemap.xml` | Public metadata                                                      | Generated from the canonical production origin. Index marketing and policy routes; exclude authenticated, authentication, API, token-bearing, and operational routes.                                                                                                                                                             |
| `/sign-in`                       | Signed-out primary; authenticated owners may continue to the product | Collect instructor email, submit a magic-link request, show validation/rate-limit/provider-safe errors, and continue to the check-email state. An authenticated, onboarded owner sees an **Open DriveTrack** action; an incomplete owner continues onboarding.                                                                    |
| `/auth/check-email`              | Public                                                               | Confirm that a link was requested without revealing whether an address already exists. Allow a bounded resend and a change-email action.                                                                                                                                                                                          |
| `/auth/verify`                   | Public, single-use token                                             | Consume the email token, rotate/create the secure session, and redirect an incomplete owner to `/onboarding` or an active onboarded owner to `/today`. Expired, used, malformed, or revoked tokens show a recoverable verification state without exposing account existence.                                                      |
| `/onboarding`                    | Authenticated, incomplete workspace                                  | Capture required profile and UK operating defaults. Successful completion creates/activates the workspace configuration and redirects to `/today`. An already-onboarded owner is redirected to `/today`.                                                                                                                          |
| `/access-unavailable`            | Authenticated, suspended workspace                                   | Explain that workspace access is unavailable and expose only support and sign-out actions.                                                                                                                                                                                                                                        |

#### Authenticated instructor routes

| Route                              | Primary responsibility                       | Core states and actions                                                                                                                                                                                                        | Responsive contract                                                                                             |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `/today`                           | Working-day command surface                  | Chronological lessons, next-lesson emphasis, exact buffer warnings, direct booking entry, student contact, cancellation entry, and Awaiting debrief queue. Empty states distinguish no lessons from a filtered or failed load. | Desktop presents a composed day timeline; mobile prioritises the next action and thumb-reachable controls.      |
| `/calendar`                        | Availability and booking overview            | Week/day navigation; Draft, Open, Booked, Awaiting debrief, Completed, and unavailable states; selection mode; release creation entry; date/view query state.                                                                  | Weekly planning grid on desktop/tablet; focused day/agenda treatment on mobile with equivalent actions.         |
| `/calendar/slots/new`              | Create one or duplicated availability slots  | Proposed start/end, duration default, selected days, overlap failure, exact buffer warning, explicit Keep anyway acknowledgement, save/cancel.                                                                                 | Dialog or anchored panel on large screens; bottom sheet/full page on mobile.                                    |
| `/calendar/slots/[slotId]`         | Inspect and act on one slot                  | State-aware details; edit; delete unbooked slot; direct booking; release membership; communication update choice; booked-slot reschedule entry.                                                                                | Side panel/dialog on large screens; full-height sheet/page on mobile.                                           |
| `/students`                        | Lightweight roster                           | Search, Active/Archived filter, next-booking context, add entry, recoverable load failure, and first-student empty state.                                                                                                      | Scannable list/table on wide screens; identity-first list on mobile.                                            |
| `/students/new`                    | Create a roster record                       | Required name/email, optional driving context, duplicate/validation handling, save/cancel, and return to the created record.                                                                                                   | Dialog or page on large screens; full page on mobile.                                                           |
| `/students/[studentId]`            | Student operational record                   | Contact actions, next booking, history, debriefs, private notes, edit, direct booking, archive/restore, and separately confirmed deletion request.                                                                             | Split overview/history on wide screens; ordered single column with sticky key actions on mobile.                |
| `/students/[studentId]/edit`       | Maintain instructor-owned student data       | Edit permitted fields, retain input on validation/conflict errors, and return to student detail on success.                                                                                                                    | Dialog/side panel or full mobile page.                                                                          |
| `/students/[studentId]/book`       | Direct instructor booking                    | Choose an eligible slot or create a compatible one, show overlap errors, show weekly-allowance warning, require override acknowledgement when needed, and confirm the persisted booking.                                       | Fast two-step surface with mobile-first controls.                                                               |
| `/bookings/[bookingId]`            | Instructor management of a confirmed booking | View booking and communication state; cancel; begin student-aware reschedule; resend confirmation; contact student; navigate to student and calendar context.                                                                  | Detail panel on wide screens; task-focused page on mobile.                                                      |
| `/bookings/[bookingId]/reschedule` | Instructor-aware booking move                | Select replacement, retain original until atomic success, explain conflicts, optionally record reason, and send confirmation after persistence.                                                                                | Calendar-assisted desktop flow; eligible-slot list/day picker on mobile.                                        |
| `/lessons/[lessonId]/debrief`      | Complete the post-lesson workflow            | Skills and outcomes, rough shared notes, private notes, explicit Polish recap, editable proposal, complete-and-send, complete-private-only, or acknowledged complete-without-notes.                                            | Composed review workspace on desktop; short staged flow optimised for completion in under 60 seconds on mobile. |
| `/releases/new`                    | Build and publish a release                  | Confirm explicitly selected draft slots, select recipients, review booking policy/expiry/message, publish once, and show partial email-queue status without rolling back the release.                                          | Multi-pane review on wide screens; clear staged flow on mobile.                                                 |
| `/releases/[releaseId]`            | Operate one release                          | Status, selected slots, recipient/link status, booking results, updated marker, resend per recipient, revoke, and explicit Notify students for reopened availability.                                                          | Dense operational table on desktop; filtered recipient and slot lists on mobile.                                |
| `/settings`                        | Settings gateway                             | Redirect to `/settings/profile`; it does not maintain a second settings implementation.                                                                                                                                        | Same behaviour at all sizes.                                                                                    |
| `/settings/profile`                | Instructor/workspace identity                | Display name, business name, email display, required telephone, timezone, validation, and save confirmation.                                                                                                                   | Grouped form with sticky save only when needed.                                                                 |
| `/settings/scheduling`             | Scheduling defaults                          | Default session duration, buffer-warning threshold, and weekly self-service allowance, with clear explanation that changes affect future decisions rather than rewriting history.                                              | Compact grouped controls at all sizes.                                                                          |
| `/settings/communications`         | Student contact and email operations         | Call/Text availability, sender presentation, recent Needs attention deliveries, safe resend, and communication status explanation.                                                                                             | Table/list adapts without hiding recipient, purpose, state, or retry action.                                    |
| `/settings/skills`                 | Driving-skill taxonomy                       | Browse built-in UK skills; create, reorder, rename, archive, and restore custom skills while protecting historical assessments.                                                                                                | Reorder has keyboard/button alternatives to drag gestures.                                                      |
| `/settings/appearance`             | Theme preference                             | Choose System, Light, or Dark and preview the effect without an unrelated page reload.                                                                                                                                         | Immediate equivalent behaviour at all sizes.                                                                    |

#### Public student routes

| Route                         | Token scope                   | Responsibility and terminal outcomes                                                                                                                                                                                                                                                           |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/book/[token]`               | One student + one release     | Show **Booking for [student name]**, release summary, and currently eligible slots. Claim uses one confirmation action. Terminal states cover confirmed booking, slot-lost conflict with remaining choices, weekly-limit reached, expired/revoked release, invalid token, and no availability. |
| `/booking/[token]`            | One confirmed booking         | Show the confirmed lesson and instructor contact. When at least 48 hours away, expose cancellation and reschedule; inside 48 hours, replace them with the configured Call/Text actions. Terminal states cover cancelled, replaced, expired/revoked link, and unavailable workspace.            |
| `/booking/[token]/reschedule` | Same booking management scope | Show eligible replacement slots, keep the original booking visible until confirmation, execute the atomic swap, and return to the management route for the replacement. A lost replacement leaves the original intact and the route operable.                                                  |

Public pages deliberately contain no general navigation, roster access, student-edit controls, account prompts, payment controls, or links that reveal another student or release.

#### HTTP, webhook, and job routes

| Method and route                                  | Caller and protection                                      | Application command and response contract                                                                                                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/auth/session`                           | Same-origin public read; private `no-store` response       | Return only `signedOut`, `onboardingRequired`, `active`, or `accessUnavailable` for CTA adaptation. It returns no profile, workspace, student, or token data.                             |
| `POST /api/auth/magic-link`                       | Public; rate-limited and anti-automation protected         | Request a sign-in token and return the same accepted response regardless of account existence. Provider failure returns a retryable safe error.                                           |
| `POST /api/public/releases/[token]/claims`        | Student release token; rate-limited                        | Execute `claimReleasedSlot`. Return confirmed, slot conflict, allowance conflict, release unavailable, or invalid-request outcomes without leaking unrelated records.                     |
| `POST /api/public/bookings/[token]/cancellations` | Booking management token; rate-limited                     | Execute `cancelStudentBooking`. Return cancelled, inside-boundary, already-cancelled, or unavailable outcomes idempotently.                                                               |
| `POST /api/public/bookings/[token]/reschedules`   | Booking management token; rate-limited                     | Execute `rescheduleStudentBooking` atomically. Return replaced, replacement-conflict, inside-boundary, or unavailable outcomes; replacement conflict preserves the original.              |
| `POST /api/ai/recaps/polish`                      | Authenticated owner; workspace authorised and rate-limited | Execute `polishSharedRecap` with allowlisted shared input. Return editable draft, validation failure, rate limit, or recoverable provider failure. It never completes or sends a debrief. |
| `POST /api/webhooks/email`                        | Email provider; verified signature and replay protection   | Record provider delivery/failure transitions idempotently. Acknowledge duplicate or out-of-order events safely.                                                                           |
| `POST /api/jobs/communications/deliver`           | Queue service; signed request and idempotency key          | Deliver one persisted outbox communication, record the attempt, retry transient failure, and mark exhausted/permanent failure Needs attention.                                            |
| `POST /api/jobs/releases/expire`                  | Scheduler; signed request                                  | Expire due releases and their outstanding release tokens idempotently without changing confirmed bookings.                                                                                |
| `POST /api/jobs/students/finalise-deletions`      | Scheduler; signed request                                  | Finalise eligible pending deletions according to the retention policy, revoke tokens, and retain only permitted audit evidence.                                                           |

Authenticated instructor mutations normally use server-side commands from their owning page instead of duplicating a public HTTP API. The stable application commands are:

- `completeOnboarding`
- `createStudent`, `updateStudent`, `archiveStudent`, `restoreStudent`, and `requestStudentDeletion`
- `createAvailability`, `updateAvailability`, `deleteAvailability`, and `duplicateAvailability`
- `createReleaseDraft`, `publishRelease`, `revokeRelease`, `resendReleaseEmail`, and `notifyReopenedAvailability`
- `createDirectBooking`, `cancelInstructorBooking`, and `rescheduleInstructorBooking`
- `saveDebriefDraft`, `completeDebrief`, `sendApprovedRecap`, and `sendRecapFollowUp`
- `retryCommunication`
- `updateProfileSettings`, `updateSchedulingSettings`, `updateCommunicationSettings`, `updateAppearanceSettings`, and custom-skill commands

Every command defines its actor, workspace, validated input, preconditions, transaction boundary, typed success result, typed expected failures, audit event, and required outbox messages. Pages consume those contracts; they do not recreate their rules.

#### Route-state completeness

Every user-facing route is incomplete until it specifies and implements each applicable item below, or explicitly records why an item does not apply:

1. initial loading or streamed-shell behaviour without destructive layout shift;
2. first-use empty state and the next useful action;
3. populated/ready state;
4. field validation with retained input;
5. expected domain conflicts such as overlap, stale state, weekly allowance, or lost claim;
6. expired/revoked token behaviour where applicable;
7. unexpected failure with correlation reference and safe retry/navigation;
8. unauthenticated, unauthorised, suspended, and not-found outcomes appropriate to its access model;
9. pending mutation protection against duplicate submission;
10. success confirmation based on persisted state rather than animation alone;
11. keyboard, screen-reader, reduced-motion, mobile, tablet, desktop, light-theme, and dark-theme behaviour;
12. analytics and logging exclusions for tokens and private/student-sensitive content.

### 5. Persistence and core data model

- Use PostgreSQL as the system of record, deployed on Neon for the pilot.
- Store timestamps as UTC instants. Store the workspace timezone as an IANA identifier and perform human calendar calculations in that timezone.
- Store telephone numbers in an international canonical form when parseable while presenting UK-friendly formatting.
- Database constraints reinforce, rather than replace, domain rules.
- The conceptual model contains:
  - **Workspace** — identity, entitlement, timezone, session-duration default, buffer preference, weekly booking allowance, student contact modes, and theme preference.
  - **Instructor identity/session** — verified email identity, profile, magic-link lifecycle, and secure sessions.
  - **Student** — required name and email, optional telephone, pickup address, transmission preference, practical-test date, lifecycle status, and recovery metadata.
  - **Skill** — built-in or workspace-defined UK driving skill with ordering and active state.
  - **Availability slot** — start, end, lifecycle state, source, and release relationship.
  - **Availability release** — draft/published/expired/revoked lifecycle, expiry, selected-slot snapshot, configured audience, and update metadata.
  - **Release recipient** — student membership of a release and its scoped token state.
  - **Booking** — student, slot, confirmed/cancelled/rescheduled state, actor, timestamps, and lineage to any replacement booking.
  - **Lesson debrief** — completion state, private note, rough shared note, current draft recap, and timestamps.
  - **Skill assessment** — debrief skill and Introduced/Developing/Confident outcome.
  - **Sent recap** — immutable, rendered student-facing snapshot and follow-up relationship.
  - **Communication** — purpose, recipient, payload snapshot or template data, delivery state, provider identifiers, retry count, and last failure classification.
  - **Action link** — token hash, purpose, subject, expiry, revocation, and optional single-use metadata.
  - **Audit event** — important actor, action, target, time, and safe operational metadata.
- Private notes and sent recaps remain distinct fields/entities so visibility cannot be inferred from a generic note type at render time.
- Archival uses explicit lifecycle fields. Permanent deletion enters a short recoverable pending-deletion state before final erasure or anonymisation, subject to operational and legal requirements defined before pilot onboarding.

### 6. Domain time and booking rules

- A session defaults to two hours. Workspace settings define the default; every slot persists its own explicit start and end so historical duration never changes when the default changes.
- Active slots and bookings cannot overlap within a workspace. Enforce this inside the booking transaction and, where practical, with a PostgreSQL constraint or locking strategy that protects against races.
- Buffer preference is advisory. Compare a proposed or moved slot with its nearest active neighbours, calculate the exact gap, and return a warning when below the configured threshold. The confirming command carries an explicit warning acknowledgement.
- Booking claims lock or conditionally update the target slot inside one transaction. The transaction validates token scope, release state, recipient eligibility, slot state, overlap, and weekly allowance before creating the booking.
- A database uniqueness or exclusion guarantee ensures at most one active booking per slot.
- The weekly self-service allowance is Unlimited, 2, or 1, defaults to Unlimited, and counts confirmed student-claimed bookings across all releases. Weeks run Monday 00:00 through the following Monday 00:00 in the workspace timezone.
- Instructor direct booking uses the same overlap rules. It may exceed the weekly allowance only with an explicit override acknowledgement recorded in the audit.
- The self-service boundary is calculated from the current server time to the lesson start. A student may cancel or reschedule when the lesson is at least 48 hours away; inside 48 hours, self-service actions are unavailable.
- A reschedule is one application command and one database transaction: validate and claim the replacement, create lineage, cancel the original, and reopen the original slot if eligible. Any failure rolls back the whole operation.
- Cancelling a booking reopens the original slot only when its release is still published, unexpired, and unrecalled. Otherwise the slot returns to a non-public draft/withdrawn state chosen by the application policy.
- After a slot end time, the associated lesson is presented as Awaiting debrief. Completion occurs only through an instructor action.

### 7. Release and link security

- A release contains an explicit slot selection and explicit recipient selection. Publishing validates both lists again on the server.
- Release emails carry separate recipient-scoped tokens. A token authorises the intended student's actions only within its release and never exposes sequential identifiers.
- The booking surface always displays the intended student name and sends confirmations to the stored student email. Forwarding the link does not change identity or recipient.
- Release tokens expire with the release and can be revoked individually or collectively. Resending may rotate the token; once rotated, the previous token is invalid.
- Booking management uses a booking-scoped token that grants only the supported cancel/reschedule/view actions for that booking.
- Tokens are never written to application logs, analytics payloads, audit metadata, or email-delivery error messages.
- Public token endpoints are rate-limited and return deliberately non-enumerable responses for invalid, expired, revoked, or already-used links while still giving legitimate users a useful next step.

### 8. Communication reliability

- Use Resend through an application-owned email-port interface. React Email templates may render messages, but provider types remain in the infrastructure adapter.
- Domain state commits before email transmission. The same transaction writes a communication/outbox record for every required email.
- A managed HTTP queue is the initial asynchronous dispatcher. Jobs use stable idempotency keys and may be delivered more than once without duplicating domain actions or student-visible messages.
- Communication states shown to instructors are Queued, Delivered, and Needs attention. Internal states may include processing and provider-specific milestones, but they map to this user vocabulary.
- Provider acceptance is not described as final delivery. Delivery and permanent-failure webhooks update the communication record after signature verification.
- Transient failures retry with bounded exponential backoff. Permanent failures or exhausted retries become Needs attention and expose a safe resend action.
- Resending creates a new delivery attempt linked to the same domain event; it does not recreate the release, booking, cancellation, or recap.
- Student emails cover release invitations, booking confirmation, cancellation, reschedule confirmation, instructor-approved slot updates, reopened-availability notices, debrief recaps, and recap follow-ups.
- DriveTrack sends no SMS in this milestone. `tel:` and `sms:` actions hand control to the instructor's device.

### 9. AI-assisted recap

- AI assistance is limited to polishing instructor-authored shared notes into a proposed recap and clear practice goals.
- The feature is invoked only by the explicit **Polish recap** action.
- The request contains only the minimum required student-visible context: rough shared notes, selected skills and outcomes, and neutral lesson metadata when useful. It excludes private notes, phone, address, email, test date, unrelated history, and internal audit data.
- The model output is untrusted draft content. It is validated for shape and length, displayed as editable text, and cannot be sent without instructor approval.
- The instructor can revert to the original rough notes, regenerate, or continue manually.
- AI failure is a recoverable enhancement failure, not a debrief failure. Saving, completion, and manual sending remain available.
- Place the provider behind a small interface so the application is not coupled to one model vendor. Store operational metadata needed for observability, but do not retain raw prompts beyond the documented privacy policy.
- There is no conversational assistant, autonomous scheduling, automatic assessment, or student-facing AI in the pilot.

### 10. Instructor experience

- Desktop and tablet use a narrow sidebar with Today, Calendar, Students, and Settings. Debriefs are contextual and never a fifth destination.
- Mobile uses a bottom navigation bar for the same destinations, optimised around the most common between-lesson actions.
- Today opens to the current date and prioritises the next lesson, contact context, travel-gap warnings, direct booking, and debriefs awaiting action.
- Calendar uses a weekly grid on larger screens and a focused day/agenda treatment on narrow screens. It supports pointer, touch, and keyboard operation.
- Calendar items combine shape, iconography, text, and tone to express state. Colour alone is never the state carrier.
- Student details favour operational scanning: next booking, contact actions, practical-test context, recent outcomes, and private notes appear before low-frequency metadata.
- Settings are grouped by meaning rather than presented as one long form. Changes that affect future behaviour explain what is and is not retroactive.
- Destructive actions use an intentional confirmation pattern with the affected student, slot, release, or booking named explicitly.
- Success feedback is quiet and immediate. Error feedback remains adjacent to the failed action and preserves the user's input.

### 11. Visual system and UI bootstrap

- All application styling continues to obey the repository's styling discipline. No page invents visual values or adds a local styling vocabulary.
- Tokens remain in the approved token source. Global application styles remain in the approved global stylesheet. Missing reusable appearance is added to `@drivetrack/ui`, not patched into a page.
- Application code consumes component props and layout primitives for variant, tone, size, radius, contrast, width, loading, sections, spacing, and composition.
- The existing primitive set must be expanded before product pages depend on improvised substitutes. Required product-level primitives include:
  - application shell, sidebar, mobile bottom navigation, page header, and responsive content frame;
  - dialog, alert dialog, drawer/bottom sheet, popover, menu, tooltip, and toast/status region;
  - tabs or segmented control, avatar/identity display, skeleton, empty state, definition list, and data list/table patterns;
  - date/time field patterns, calendar grid building blocks, slot cards, status markers, and timeline/agenda items;
  - field composition with label, description, validation message, optional marker, and accessible identifiers;
  - command/search pattern for fast student lookup;
  - polished email-layout components that share brand tokens without depending on browser-only UI code.
- Replace divergent component vocabularies with the locked shared scales. Components do not introduce private size names such as `sm`, `md`, and `lg` when the system scale is `1` through `4`.
- Restrict or remove styling escape hatches that allow application pages to bypass the system. `className` may remain only where a documented composition need cannot be represented by the primitive API; each use must pass the discipline gate.
- Theme values must flow through the actual component system. A provider that exposes preferences without affecting component output is incomplete.
- The brand is a typographic DriveTrack wordmark with a restrained route/track motif. Do not use a generic steering-wheel mark.
- The aesthetic is calm and exact: disciplined typography, considered density, subtle layering, deliberate border and elevation hierarchy, concise copy, and sparing motion.
- Marketing uses the same primitive system but adds reusable public-site compositions for the header, hero, workflow narrative, product proof, trust/privacy content, calls to action, and footer. These are system-level compositions in `packages/ui` or feature components—not page-local CSS inventions.
- Product imagery on the marketing site must show plausible DriveTrack states and real interface density. Do not use an unrelated stock dashboard, impossible data, or a decorative mockup that the application cannot support.
- Avoid gratuitous gradients, neon glow, glass effects, oversized rounded cards, excessive pills, dashboard-card repetition, and decorative AI motifs.
- Motion explains relationship or state change. It is short, interruptible, and removed or reduced under `prefers-reduced-motion`.
- Both themes are designed and reviewed independently; dark mode is not an automatic colour inversion.

### 12. Accessibility and responsive behaviour

- Target WCAG 2.2 AA across core pilot flows.
- All controls have accessible names, visible focus, predictable reading order, and appropriate programmatic state.
- Pointer gestures have non-drag alternatives. Calendar creation and movement can be completed with keyboard and form controls.
- Dialogs, menus, popovers, and sheets manage focus correctly, close predictably, and restore focus to their trigger.
- Live regions announce asynchronous booking results and relevant delivery-state changes without excessive chatter.
- Date and time content uses semantic markup and unambiguous spoken labels.
- Touch targets, spacing, and fixed navigation respect mobile safe areas and real between-lesson use.
- Responsive behavior is specified at the component level. No workflow becomes inaccessible merely because the weekly grid changes to a mobile agenda.
- Loading placeholders preserve layout; empty states teach the next action; offline or interrupted requests preserve entered content wherever practical.

### 13. Security, privacy, and observability

- Authentication cookies are secure, HTTP-only, same-site appropriate, rotated after authentication, and invalidated on sign-out or security events.
- Mutations validate authorization on the server even when the UI hides an action.
- All external input is parsed and validated at the boundary, including route parameters, tokens, form data, queue jobs, and provider webhooks.
- Secrets remain server-side and are documented through example environment variables without real values.
- Logs are structured and correlated across request, job, and provider delivery. They omit tokens, private notes, AI prompt text, and unnecessary student personal data.
- Audit events cover security-sensitive and student-impacting actions: publish/revoke release, claim, direct booking override, cancel, reschedule, slot deletion, debrief completion, recap send/follow-up, archive, deletion request, and token revocation.
- Audit events are operational evidence, not a second source of truth. They record identifiers and safe metadata, not full content copies.
- Apply rate limits to authentication, public token endpoints, email resend, and AI polish actions.
- Define retention, deletion recovery duration, support access, and data-export procedure before the first external instructor is onboarded.
- Production monitoring covers application errors, queue age, repeated job failures, webhook verification failures, and elevated booking-conflict rates.

### 14. Code quality rules

- Code communicates domain intent. Prefer names such as `claimReleasedSlot`, `weeklyBookingAllowance`, and `cancelledByStudent` over vague names such as `handleData`, `item`, `flag`, or `process`.
- Domain values, routes, query keys, event names, time limits, and user-visible repeated labels are named constants or finite types rather than scattered literals.
- Use `unknown` at untrusted boundaries and narrow it through validation. `any` requires a written, local reason and an immediate narrowing strategy.
- Keep imports ordered and respect package boundaries. Deep imports that bypass a package's public API are prohibited.
- Keep functions and components small enough to reveal their intent. Aim for functions under 40 lines and justify functions over 60; aim for React components under 120 lines and justify components over 180. These are review signals, not incentives to create meaningless fragments.
- Extract application workflows into hooks or controllers when doing so makes server state, pending state, error handling, and orchestration clearer. Do not hide simple local UI state behind abstraction for its own sake.
- Comments explain non-obvious constraints or trade-offs, especially concurrency and time semantics. They do not narrate straightforward syntax or preserve dead attempts.
- Replace incorrect or obsolete implementations instead of layering new paths over them. Delete failed approaches, unused helpers, commented-out code, and temporary compatibility branches before merge.
- A feature is incomplete if it lacks loading, empty, success, validation, conflict, provider-failure, and permission-denied behavior appropriate to its surface.
- The repository public APIs, shared scales, and vocabulary remain the single source of truth. Applications do not redeclare tones, variants, sizes, radii, spacing scales, statuses, or policy options.

### 15. Delivery sequence

1. **System foundation and public launch surface:** implement `/`, `/features`, `/privacy`, `/terms`, `/sign-in`, `/auth/check-email`, `/auth/verify`, and `/access-unavailable`; establish the marketing/auth/product layouts, SEO metadata, real theme propagation, application shell, overlay primitives, field composition, responsive navigation, accessibility baseline, TanStack Query ownership and typed keys, Drizzle/Neon repository and transaction boundaries, authentication, cache-policy constants, and observability foundation.
2. **Onboarding, settings, and roster:** implement `/onboarding`, `/settings` and its five child routes, `/students`, `/students/new`, `/students/[studentId]`, and `/students/[studentId]/edit`; finish workspace defaults, student lifecycle, search, and detail behavior.
3. **Availability canvas:** implement `/today`, `/calendar`, `/calendar/slots/new`, and `/calendar/slots/[slotId]`; finish weekly/day views, slot creation and duplication, overlap protection, buffer warnings, state vocabulary, and responsive/keyboard operation.
4. **Release and claim:** implement `/releases/new`, `/releases/[releaseId]`, `/book/[token]`, the claim endpoint, release expiry job, communication delivery job, and email webhook; finish explicit selection, secure links, atomic claims, weekly allowance, confirmations, and the outbox.
5. **Booking management:** implement `/students/[studentId]/book`, `/bookings/[bookingId]`, `/bookings/[bookingId]/reschedule`, `/booking/[token]`, `/booking/[token]/reschedule`, and the public cancellation/reschedule endpoints; finish direct booking, the 48-hour boundary, atomic rescheduling, release reopening, student-aware edits, and notifications.
6. **Debrief:** implement `/lessons/[lessonId]/debrief` and the recap-polish endpoint; finish Awaiting debrief, skills taxonomy, private/shared notes, explicit AI polish, immutable recap snapshots, follow-ups, and delivery recovery.
7. **Pilot hardening:** implement deletion finalisation and complete cross-route accessibility, both-theme visual review, concurrency tests, provider recovery, privacy operations, monitoring, seed/demo data, and the pilot runbook. No route advances to pilot-ready while its route-state completeness checklist or traced journey remains unfinished.

Each phase must leave the main branch deployable. Later phases do not justify placeholders or knowingly broken states in completed flows.

## Testing Decisions

### Primary seam

The highest practical seam is the real web application running against a real PostgreSQL test database, exercised through end-to-end user journeys. This is the primary confidence layer because DriveTrack's main risks live across UI, application transactions, persistence, time policy, and asynchronous communication—not inside isolated component functions.

Focused domain and integration tests support that seam where exhaustive edge coverage or concurrency is difficult through a browser. Component tests are used selectively for complex reusable primitives and accessibility behaviour, not as a substitute for workflow coverage.

### End-to-end route traceability

The following journeys are the executable backbone of the pilot. Each row must become an end-to-end test or a small group of tests at the same browser/database seam. Provider calls are captured by controlled test adapters; the application, routing, persistence, and transaction behavior remain real.

| Journey                              | Route path                                                                                                              | Commands and boundaries exercised                                                         | Required observable outcome                                                                                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Marketing discovery                  | `/` → `/features` → `/privacy` or `/terms` → `/`                                                                        | Static rendering, responsive navigation, metadata, CTA session adaptation                 | A signed-out visitor can understand the product and reach sign-in or the published pilot contact; public policy pages are readable and linked; a signed-in owner sees **Open DriveTrack**; neither state is automatically redirected away from `/`. |
| First access                         | `/` → `/sign-in` → `/auth/check-email` → `/auth/verify` → `/onboarding` → `/today`                                      | Magic-link request/consume, session rotation, `completeOnboarding`                        | The owner reaches the correct product destination and UK defaults persist. Revisiting `/` shows the public landing page with **Open DriveTrack**. Invalid or reused verification links do not create a session.                                     |
| Roster setup                         | `/students` → `/students/new` → `/students/[studentId]` → `/students/[studentId]/edit`                                  | `createStudent`, `updateStudent`                                                          | The first-use state becomes a searchable roster record; validation retains input; refreshed detail reflects persisted data.                                                                                                                         |
| Student lifecycle                    | `/students/[studentId]` → `/students?status=archived` → `/students/[studentId]`                                         | `archiveStudent`, `restoreStudent`, `requestStudentDeletion`                              | Archive removes the student from active selection without losing history, restore reverses it, and deletion request revokes outstanding links while entering recoverable pending state.                                                             |
| Availability planning                | `/calendar?date=…&view=week` → `/calendar/slots/new` → `/calendar/slots/[slotId]`                                       | `createAvailability`, `duplicateAvailability`, `updateAvailability`, `deleteAvailability` | Two-hour default, custom duration, day duplication, overlap rejection, explicit buffer acknowledgement, refresh persistence, and browser-back context all behave correctly.                                                                         |
| Release publication                  | `/calendar` → `/releases/new` → `/releases/[releaseId]`                                                                 | `createReleaseDraft`, `publishRelease` and communication outbox creation                  | Only explicitly selected slots and recipients publish once; the release remains published when email is queued; recipient status is visible after refresh.                                                                                          |
| Student claim                        | Email link → `/book/[token]` → claim endpoint → confirmed `/booking/[token]` link                                       | `claimReleasedSlot`, transactional slot lock, confirmation outbox                         | The named student claims without a form, the slot becomes Booked, Calendar and Today agree, and confirmation is based on committed data.                                                                                                            |
| Concurrent claim                     | Two browser contexts at `/book/[token]` → claim endpoint                                                                | Competing `claimReleasedSlot` transactions                                                | Exactly one active booking exists; the winner sees confirmation; the loser sees a calm conflict with remaining choices and no false success.                                                                                                        |
| Weekly allowance and direct override | `/book/[token]` plus `/students/[studentId]/book`                                                                       | Weekly policy, `createDirectBooking`, override audit                                      | Self-service is stopped at the configured 1/2 limit across releases; instructor override requires acknowledgement and records an event; overlaps remain impossible.                                                                                 |
| Student cancellation                 | `/booking/[token]` → cancellation endpoint → `/releases/[releaseId]`                                                    | `cancelStudentBooking`, eligible slot reopening                                           | At least 48 hours away, cancellation persists and the eligible slot reopens; no broadcast is sent until the instructor explicitly uses Notify students. Inside 48 hours, contact actions replace cancellation.                                      |
| Student reschedule                   | `/booking/[token]` → `/booking/[token]/reschedule` → reschedule endpoint → replacement `/booking/[token]`               | `rescheduleStudentBooking` transaction                                                    | Success swaps bookings atomically. A deliberately lost replacement leaves the original confirmed and gives the student another choice.                                                                                                              |
| Instructor booking management        | `/bookings/[bookingId]` → `/bookings/[bookingId]/reschedule` → `/calendar`                                              | `cancelInstructorBooking`, `rescheduleInstructorBooking`, resend confirmation             | Student-impacting changes require confirmation, preserve history, update all instructor views, and create the right communication without silently moving the booking.                                                                              |
| Debrief and AI draft                 | `/today` → `/lessons/[lessonId]/debrief` → polish endpoint → `/students/[studentId]`                                    | `saveDebriefDraft`, `polishSharedRecap`, `completeDebrief`, `sendApprovedRecap`           | Shared/private content stays separated, AI output remains editable, completion persists before delivery, and the exact approved recap becomes an immutable snapshot.                                                                                |
| Delivery recovery                    | `/settings/communications` → owning `/releases/[releaseId]`, `/bookings/[bookingId]`, or lesson context                 | Delivery job, email webhook, `retryCommunication`                                         | A forced provider failure becomes Needs attention without losing domain state; retry creates a delivery attempt but no duplicate domain object; a valid webhook resolves status.                                                                    |
| Settings propagation                 | `/settings/profile` → `/settings/scheduling` → `/settings/communications` → `/settings/skills` → `/settings/appearance` | Settings and custom-skill commands                                                        | Future slots use the new duration; historical slots do not change; buffer/allowance/contact modes take effect at their next decision; custom skills appear in debrief; theme persists.                                                              |
| Responsive and accessible operation  | `/today`, `/calendar`, `/students/[studentId]`, `/lessons/[lessonId]/debrief`, `/book/[token]`                          | Route loaders and the same commands at multiple viewports                                 | Core tasks complete by keyboard and touch in light/dark themes; route-driven overlays survive refresh; focus restores on back; reduced motion and non-colour status remain intact.                                                                  |

In addition to the journeys above, every registered page route receives a route-contract test for its access guard, not-found behaviour, primary loading/ready/empty state, and unexpected-error boundary. Every HTTP/job route receives contract tests for method, validation, authentication/signature, idempotency, typed outcomes, and safe logging.

### Required end-to-end journeys

- Navigate the public landing, features, privacy, and terms surfaces on mobile and desktop; verify accurate metadata, keyboard access, responsive content, signed-out CTA, and signed-in **Open DriveTrack** behavior.
- Instructor magic-link sign-in, first-run onboarding, and session sign-out.
- Add, edit, archive, restore, and search for a student.
- Create two-hour availability, customise duration, duplicate days, and deliberately accept a buffer warning.
- Prevent an actual overlap with a clear retained-error state.
- Select slots and recipients, review a release, publish it, and open the student-scoped link.
- Claim a slot without entering student data and observe it in the instructor calendar.
- Lose a concurrent claim gracefully while the first claim remains the only booking.
- Enforce one- and two-per-week self-service allowances across releases and allow an audited instructor override.
- Cancel outside 48 hours and reopen the eligible slot without automatically broadcasting.
- Atomically reschedule outside 48 hours; prove the original remains when the replacement is lost to a race.
- Block self-service inside 48 hours and expose configured contact actions.
- Edit an unbooked released slot and require an explicit update-email choice.
- Route a booked-slot edit through the student-aware reschedule experience.
- Move an ended lesson to Awaiting debrief; complete it with a recap, private note only, or no notes.
- Polish shared notes, verify private content is absent from the request fixture, edit the result, approve it, and send.
- Preserve a saved debrief when email delivery fails; retry the communication without duplicating the debrief.
- Create an immutable recap follow-up rather than editing the original snapshot.
- Complete the core mobile Today flows and the desktop Calendar flows in both light and dark themes.

### Domain and integration coverage

- Test week boundaries, British Summer Time transitions, leap dates, exactly-48-hour behavior, and server/client clock separation.
- Test overlap and nearest-gap calculations with adjacent, contained, equal-boundary, and cross-midnight intervals.
- Test atomic claim and reschedule behavior using genuinely concurrent database operations, not mocked promises.
- Test every state transition for release, slot, booking, student lifecycle, debrief, link, and communication.
- Test workspace isolation at repository and application-service boundaries.
- Test token hashing, expiry, revocation, rotation, purpose scoping, and non-enumerable failure mapping.
- Test outbox/idempotency behavior with duplicate jobs, delayed jobs, retry exhaustion, and out-of-order provider webhooks.
- Test AI request construction as a privacy contract: only allowlisted shared fields may cross the provider boundary.
- Test structured error mapping for validation, not found, conflict, unauthorised, forbidden, rate-limited, and unexpected failures.
- Test the typed query-key factory and the complete mutation-to-cache map: successful commits invalidate only affected families, failed transactions do not publish successful cache state, and cross-route summaries converge on committed data.
- Test that contention-sensitive inventory is stale immediately and revalidated on mount, focus, and reconnect while the server still rejects races correctly.
- Test public marketing cache headers/static output separately from private `no-store` authentication and token-bearing routes. Assert that secure tokens never appear in cache keys, static artifacts, analytics fixtures, or structured logs.
- Test that critical mutations never present an optimistic success and that route/tag revalidation occurs only after the database transaction commits.

### UI and accessibility coverage

- Test reusable primitives for keyboard interaction, focus trap/restoration, accessible naming, reduced motion, and theme variants.
- Use semantic locators and user-facing roles/names in browser tests. Test identifiers are a last resort for non-semantic surfaces such as parts of the calendar grid.
- Avoid fixed sleeps. Wait on observable UI or server state.
- Test loading, empty, success, partial failure, validation, stale-link, conflict, and retry states.
- Test that URL-owned date, view, focus, search, filter, sort, and pagination state survives refresh and browser navigation without being duplicated into a global client store.
- Run automated accessibility checks on core pages and manually verify the calendar, bottom sheet, dialogs, focus order, screen-reader announcements, zoom/reflow, and touch targets.
- Perform deliberate visual review at representative mobile, tablet, laptop, and wide-desktop sizes in both themes. Visual snapshots may detect regression, but human review establishes the initial quality bar.

### Test data

- Use realistic builders with UK names, addresses, telephone formats, dates, timezones, and lesson schedules.
- Builders expose meaningful overrides while preserving valid defaults.
- Tests create their own state and clean it through scoped database reset helpers. They do not depend on execution order or shared mutable fixtures.
- Seed data for design review covers dense and sparse weeks, all calendar states, long names, missing optional data, communication failures, archived students, and outstanding debriefs.

### Quality gate

Before a change is considered complete, the repository must provide and pass one canonical command that includes:

1. formatting verification;
2. linting;
3. the existing CSS, arbitrary-value, and vocabulary guards;
4. TypeScript checking;
5. unit/domain and integration tests;
6. end-to-end tests for affected critical journeys;
7. production build;
8. replace-don't-layer heuristics and AI discipline review.

Until that unified command is added, contributors run the relevant test commands plus the repository's existing `pnpm verify`, `pnpm discipline`, and `pnpm discipline:ai`. Pre-push and CI must run the same canonical gate. Bypassing hooks is not an accepted delivery path.

Every handoff records commands run, pass/fail outcomes, any intentionally unrun checks with reasons, manual review performed, and residual risks. A green build does not replace visual, accessibility, or domain review.

## Out of Scope

- Student accounts, passwords, profiles, dashboards, or self-service profile editing.
- Payments, prices, packages, invoices, balances, refunds, deposits, or payment reminders.
- Subscriptions, trials, checkout, billing portals, or public self-serve workspace creation.
- Multi-instructor teams, staff invitations, permissions UI, commissions, or fleet management.
- Public marketplace discovery or a permanent public booking page.
- Automatic SMS or WhatsApp delivery from DriveTrack.
- Generic CRM pipelines, lead management, marketing automation, or sales reporting.
- Recurring availability templates or rule-based schedule generation.
- Route planning, maps, postcode travel-time calculation, or automatic travel optimisation.
- Automatic broadcasting when a slot reopens or changes.
- Automatic debrief completion, automatic recap sending, or autonomous AI decisions.
- A generic AI chatbot, student-facing AI, driving performance scoring, or lesson recommendations generated without instructor review.
- Full accounting, tax, payroll, mileage, expense, or instructor-performance reporting.
- Native iOS or Android applications; the pilot is a responsive web application.
- Non-UK localisation, multi-currency support, or region-specific driving taxonomies outside the UK.
- Broad public launch, enterprise scale, or premature infrastructure designed for unproven demand.
- A headless CMS, blog platform, campaign page builder, or separate marketing frontend. Pilot marketing content is versioned with the application.
- Decorative design work that does not strengthen usability, brand, accessibility, or operational confidence.

## Further Notes

- This specification treats the attached `Ticket_task` material as a code-quality reference, not as product requirements or a stack mandate. Its durable principles—domain intent, dependency direction, explicit failures, meaningful tests, evidence-based quality gates, and replace-don't-layer discipline—are adapted here to DriveTrack and the existing repository.
- The source product document supplied during discovery is superseded where the confirmed interview decisions differ. In particular: there is no student account, no payment domain, multiple weekly bookings are the default, the travel buffer is advisory, the two-hour duration is configurable, and the pilot is UK-only.
- The confirmed landing-page decision supersedes the earlier root-gateway assumption: `/` is public marketing, while successful verification routes directly to `/onboarding` or `/today` and authenticated marketing calls to action open `/today`.
- `gbot` is an internal codename only. Product UI, email, metadata, and pilot documentation use DriveTrack.
- The initial pilot should use a deliberately small cohort and direct founder support. Feedback should be captured against the confirmed workflows rather than converted immediately into broad platform features.
- Before the first external pilot account is created, settle the exact deletion-recovery duration, privacy notice, controller/processor responsibilities, AI data-retention configuration, support-access procedure, and email domain authentication.
- Product analytics, if introduced, must be minimal, privacy-aware, and unable to capture secure tokens, private notes, recap content, or unnecessary student personal data.
- Build quality in vertical slices. A beautiful shell without correct claims and recovery is not a pilot; correct transactions inside an unfinished interface do not meet the product bar either.
