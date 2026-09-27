<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Work on `staging`. Never create a branch.

`main` is production. `staging` is the working branch, and it is the only branch that is meant to carry work.

Do the work directly on `staging`, commit and push to `staging`, and promote it with a pull request into `main`. **On no account create a branch** — not for a feature, not for a fix, not to isolate an experiment, not because it looks tidier or because another agent's notes suggested it. If a branch is genuinely wanted, that is the owner's explicit instruction for that specific piece of work, never an agent's own idea. Creating one unasked is a mistake even when the work itself is correct.

This is not a style preference. A side branch cannot reach production, and the reason is mechanical: `.github/workflows/launch-journey.yml` identifies the environment by asking the deployment's `/api/v1/health` what it is, and publishes the `Launch gate (staging)` status only for a build of `staging`. A pull request from any other branch deploys a preview that reports `development`, resolves to `target=none`, and never publishes a status, so `main`'s required check can never be satisfied. The gate now fails such a pull request loudly and names the offending head branch, so a stray branch is caught rather than left hanging — but a caught branch is still a branch that should not exist. Work on `staging` and the problem never arises.

Always merge with a **merge commit**. The repository enforces this — `allow_squash_merge` and `allow_rebase_merge` are both `false` — so do not work around it. Squash and rebase rewrite commits into new SHAs, which means `staging` stops being an ancestor of `main`. Git can no longer tell which work already shipped, so every later promotion re-applies the whole branch: stale files, spurious conflicts, and a diff that no longer describes a real change. A merge commit records `staging`'s exact SHAs, so `main` can always be advanced by only what is new.

If a promotion is blocked with a failure reading "Not a staging build", the head branch is wrong. Correct it by merging `main` into `staging`, pushing, and reopening the pull request from `staging`. Expect the gate to take a few minutes: on staging it runs the real sign-in → invitation → booking → email delivery journey, and on production a read-only smoke check. Do not merge around it. Confirm ancestry is intact with `git merge-base --is-ancestor origin/main origin/staging`; a repair merge changes no files, so `git diff --stat origin/staging HEAD` should come back empty.
