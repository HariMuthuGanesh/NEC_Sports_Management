# Action Required: Rotate Committed Secrets

`backend/.env.development` and `backend/.env.production` were committed to
git in commit `551d588` ("role hierarchy v2: schema + backend routes",
2026-09-09) on the **`main`** branch (also present on `feature-clone`) of
`HariMuthuGanesh/NEC_Sports_Management` on GitHub. They contain real values
for:

- `JWT_SECRET`
- `COOKIE_SECRET`
- `CSRF_SECRET`
- `MYSQL_HOST` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_PORT`
- `DEMO_COORDINATOR_PASSWORD`, `DEMO_PLAYER_PASSWORD`, `SEED_STUDENT_PASSWORD`

Anyone who has ever cloned, forked, or viewed `main` on GitHub has access to
these values, even after they are deleted from the latest commit — **deleting
the files does not remove them from git history**.

## What was done in this session (branch `arena/01a0a601-nec-sports-management`)

- Ran `git rm --cached backend/.env.development backend/.env.production` so
  neither file is tracked by git going forward from this branch.
- `.gitignore` already has a blanket `.env.*` rule (with only `.env.example`
  excluded), so once these two files are removed from the index they will
  stay untracked automatically — no gitignore changes were needed for this.
- The files still exist on local disk (untouched) so local `npm run dev` /
  `npm start` continue to work in this sandbox; they are just no longer
  staged for commit.

**This does NOT remove the secrets from git history on GitHub's `main`
branch** — that historical commit still exists there with the real values
in it, and this session cannot rewrite `main`'s history (it can only push to
`arena/01a0a601-nec-sports-management`, and rewriting a shared branch's
history is a destructive, high-blast-radius operation that should be done
deliberately, not silently by an agent).

## What YOU still need to do (outside this session)

### 1. Rotate every credential immediately (do this regardless of the history decision below)

Because the values are already public on GitHub, rotating them is the only
thing that actually neutralizes the exposure — removing them from git
history is good hygiene but doesn't help if the old values still work.

- **MySQL**: connect to the database server and change the password for the
  `MYSQL_USER` account shown in the old `.env.production`
  (`ALTER USER '<user>'@'%' IDENTIFIED BY '<new-strong-password>';` or your
  hosting provider's dashboard equivalent). Update your real deployment's
  environment variables (Render/Railway/VPS/etc.) with the new password —
  do NOT put it back in a committed file.
- **JWT_SECRET / COOKIE_SECRET / CSRF_SECRET**: generate new random values
  and set them in your deployment's environment variable configuration:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
  Run this three times for three independent secrets. Rotating
  `JWT_SECRET`/`COOKIE_SECRET` immediately invalidates all currently
  logged-in sessions (expected and desired here).
- **DEMO_COORDINATOR_PASSWORD / DEMO_PLAYER_PASSWORD / SEED_STUDENT_PASSWORD**:
  if any real (non-seed) accounts ever reused these demo passwords, force a
  password reset for those accounts. Otherwise just pick new values for
  future seeding.

### 2. Decide whether to purge the secrets from GitHub history

This is optional-but-recommended cleanup *after* rotation (rotation is what
actually matters for security; history purge is about not leaving stale
noise/confusion for anyone browsing the repo later). If you want it done:

1. Someone with push/admin access to `main` should run, from a fresh full
   (non-shallow) clone:
   ```bash
   pip install git-filter-repo   # or: brew install git-filter-repo
   git clone --no-local <repo-url> nec-purge && cd nec-purge
   git filter-repo --path backend/.env.development --path backend/.env.production --invert-paths
   ```
2. Force-push the rewritten history to `main`:
   ```bash
   git push origin --force --all
   git push origin --force --tags
   ```
3. **Every collaborator must re-clone** (or hard-reset + garbage-collect)
   after this — old local clones/forks will conflict with the rewritten
   history and may reintroduce the secrets if merged back.
4. Repeat the same `git filter-repo` pass against `feature-clone` (the only
   other branch found to contain these files), or delete that branch if it's
   no longer needed.

This session cannot perform step 1–3 itself: it is restricted to pushing
only to `arena/01a0a601-nec-sports-management`, and history-rewriting
`main` is a decision only you (the repo owner) should trigger deliberately.

### 3. Add a pre-commit/CI secret scanner going forward (optional, recommended)

To prevent recurrence, consider adding a tool like
[gitleaks](https://github.com/gitleaks/gitleaks) as a pre-commit hook or a
CI job so any future accidental `.env` commit fails fast instead of landing
on `main`.
