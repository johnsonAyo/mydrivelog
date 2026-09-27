<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Promotion: `staging` is the only branch that merges to `main`

`main` is production. `staging` is the working branch. Do the work on `staging`, push there, and promote it with a pull request. Nothing else merges into `main`.

Always merge with a **merge commit**. The repository enforces this — `allow_squash_merge` and `allow_rebase_merge` are both `false` — so do not work around it. Squash and rebase rewrite commits into new SHAs, which means `staging` stops being an ancestor of `main`. Git can no longer tell which work already shipped, so every later promotion re-applies the whole branch: stale files, spurious conflicts, and a diff that no longer describes a real change. A merge commit records `staging`'s exact SHAs, so `main` can always be advanced by only what is new.

The pull request must have `staging` as its head branch. `.github/workflows/launch-journey.yml` identifies the environment by asking the deployment's `/api/v1/health` what it is, and publishes the `Launch gate (staging)` status only for a build of `staging`. A pull request from any other branch deploys a preview that reports `development`, resolves to `target=none`, and publishes nothing — `main`'s required check can then never be satisfied and the pull request blocks forever with no check listed. That symptom means the head branch is wrong. Correct it by merging `main` into `staging`, pushing, and opening the pull request from `staging`.

Expect the gate to take a few minutes: on staging it runs the real sign-in → invitation → booking → email delivery journey, and on production a read-only smoke check. Do not merge around it. Confirm ancestry is intact with `git merge-base --is-ancestor origin/main origin/staging`; a repair merge changes no files, so `git diff --stat origin/staging HEAD` should come back empty.
