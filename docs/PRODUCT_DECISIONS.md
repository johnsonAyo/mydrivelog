# Confirmed product decisions

This document records the user decisions that override older discovery notes and the original starter specification.

1. DriveTrack is a standalone product repository. `styling-discipline` remains intact as a reusable starter/reference and is not imported as a package.
2. Instructors are the only authenticated product users.
3. Students do not have accounts, profiles, dashboards, or a management area. They receive purpose-scoped booking/management links and email communication.
4. DriveTrack does not include payments or any billing-adjacent workflow.
5. The pilot is UK-only.
6. The default session duration is two hours and is configurable for future sessions.
7. A short travel buffer produces a warning only. It never blocks an instructor action.
8. Student self-service booking defaults to unlimited sessions per week; an instructor may restrict it to two or one.
9. The public marketing site and product use one Next.js deployment, while remaining separate route shells.
10. Mutable client server-state will use TanStack Query; URL parameters own navigational state; local React state owns ephemeral view state. No global Redux/Zustand store is planned for the pilot.
