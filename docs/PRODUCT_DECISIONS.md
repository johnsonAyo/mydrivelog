# Confirmed product decisions

This document records the user decisions that override older discovery notes and the original starter specification.

1. DriveTrack is a standalone product repository. `styling-discipline` remains intact as a reusable starter/reference and is not imported as a package.
2. Instructors are the only authenticated product users.
3. Students do not have accounts, profiles, dashboards, or a management area. They receive purpose-scoped booking/management links and email communication.
4. DriveTrack does not handle student lesson payments, balances, invoices, or refunds. Product subscription billing is a separate, now-confirmed capability.
5. The pilot is UK-only.
6. The default session duration is two hours and is configurable for future sessions.
7. A short travel buffer produces a warning only. It never blocks an instructor action.
8. Student self-service booking defaults to unlimited sessions per week; an instructor may restrict it to two or one.
9. The public marketing site and product use one Next.js deployment, while remaining separate route shells.
10. Mutable client server-state will use TanStack Query; URL parameters own navigational state; local React state owns ephemeral view state. No global Redux/Zustand store is planned for the pilot.
11. Public self-serve signup launches for independent instructors. Team accounts and Team pricing are deferred until shared calendars, instructor access, and team administration work.
12. Solo costs £24 per month with no student cap. Annual pricing has not been specified.
13. Every new Solo workspace starts a full-featured 14-day trial when the instructor creates the account. No card is required at signup; the trial end date is visible in the product.
14. Instructors can subscribe through self-serve checkout at the end of the trial. Until subscription billing is implemented and verified, no checkout or paid-state claim should be presented as live.
15. At trial expiry, an unpaid workspace becomes read-only: existing records remain viewable and exportable, but new bookings and edits are unavailable. Expired unpaid records remain accessible indefinitely, unless the instructor requests deletion. A later subscription restores write access.
16. Cancellation timing and failed-payment grace periods have not been explicitly agreed. Do not infer a deletion deadline from either event.
17. The production authentication provider is still undecided (Google Cloud or Firebase are under consideration). The existing email-link flow is provisional rather than a provider commitment.
18. Build one real application, not a parallel preview implementation. During local development, Calendar uses a seeded test workspace and the live database without authentication gates; the component lab remains an isolated, inert visual inventory. Add authentication when the user is ready to stand up the chosen provider, before any public launch.
19. The development database lives in a separate Neon account from the user's existing CLI account. Its credentials and the isolated CLI login remain git-ignored. Availability-list booking is the current live vertical slice; Today and debrief workflows follow separately.
20. An instructor plans availability by Monday–Sunday week, navigating by month. A month shows every week it touches (four to six, not a forced four-way split). Each workspace has at most one list per week, automatically named by its date range. The instructor may plan one or several future weeks, add multiple exact lesson times on each day, keep them private, and return to them later. A range-to-times generator is an optional shortcut, not the required path. Existing freely named lists remain accessible under Earlier lists rather than being silently changed.
21. Sharing a draft makes its current times bookable. A shared list remains editable; any new times saved privately stay hidden until explicitly made bookable. Already booked times are not offered to other recipients. The instructor sees who booked each time.
22. An instructor may invite an existing contact or enter a new name and email, and may separately create a reusable general link. Re-sending to an existing recipient replaces their personal link without removing confirmed bookings. New people using the general link provide a name and verify their email before booking.
23. The public booking page shows only currently bookable times and a recipient's own confirmed bookings. It does not reveal closed, private, or other people's booked times. The default session duration and advisory travel gap prefill availability creation but do not force rigid time patterns.
24. During the pilot season, customer-facing signup and marketing copy says "pilot", not "free trial", and does not advertise a 14-day period or Solo pricing. The priced 14-day free-trial offer is reserved for after the pilot. The existing 14-day access cutoff is still implemented; whether it should apply to pilot workspaces needs an explicit decision before inviting instructors.
