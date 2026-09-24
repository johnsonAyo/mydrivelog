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
17. The production authentication provider is still undecided (Google Cloud or Firebase are under consideration). Product-screen previews must be viewable without authentication, email configuration, or a database; sample data and disabled controls must be explicit. The existing email-link flow is provisional rather than a provider commitment.
