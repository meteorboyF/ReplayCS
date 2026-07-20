# ReplayCS recovery guide

This guide restores ReplayCS without rewriting published history. The canonical remote is
`https://github.com/meteorboyF/ReplayCS.git`, the deployable branch is `main`, and the stable
foundation is the annotated tag `replaycs-foundation-baseline` at commit
`c137a5eeb27709b715bab26617755381dd27a3a3`.

## Safety rules

- Fetch and inspect before changing a branch.
- Stop if `git status --short` shows work you do not understand. Never discard or overwrite it.
- Use a new recovery or revert branch, run the complete verification suite, and merge through a
  pull request when possible.
- Use `git pull --ff-only`; do not create an accidental merge while synchronizing.
- Never force-push a shared branch, rewrite published commits, move an existing recovery tag, or
  delete a remote branch that may contain recovery work.
- Never commit `.env`, `.env.local`, API keys, Vercel tokens, or deployment credentials.

## Inspect the current state

Run these commands from the repository root before any recovery operation:

```bash
git status --short --branch
git branch --show-current
git remote -v
git fetch origin --prune --tags
git log --oneline --decorate --graph -20
git rev-parse HEAD
git rev-parse origin/main
git show --no-patch --decorate replaycs-foundation-baseline
git rev-parse replaycs-foundation-baseline^{}
```

The final command must print:

```text
c137a5eeb27709b715bab26617755381dd27a3a3
```

If it does not, stop. Do not move or overwrite the published tag; investigate the local and remote
tag values first:

```bash
git ls-remote --tags origin replaycs-foundation-baseline
git show-ref --tags replaycs-foundation-baseline
```

## Create the exact foundation recovery branch

Use this procedure when the current product needs to be inspected or rebuilt from the known stable
foundation. It creates `recovery/foundation-c137a5e`; it does not change `main`.

```bash
git fetch origin --prune --tags
git status --short
git switch main
git pull --ff-only origin main
git switch -c recovery/foundation-c137a5e replaycs-foundation-baseline
git rev-parse HEAD
git push -u origin recovery/foundation-c137a5e
```

Before switching branches, `git status --short` should be empty. If it is not empty, do not stash,
reset, clean, or discard someone else's work merely to continue. Either finish that work or create a
separate clone/worktree after identifying every change.

`git rev-parse HEAD` on this recovery branch must report the full baseline SHA above. If the branch
already exists locally, use `git switch recovery/foundation-c137a5e`. If it exists only on the
remote, use:

```bash
git switch --track origin/recovery/foundation-c137a5e
```

Run the verification suite before treating the branch as recoverable:

```bash
npm ci
npm run check
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Revert a feature commit safely

Reverting adds a new commit that undoes an earlier commit. It preserves the audit trail and leaves
the original commit reachable. Replace the two bracketed values; do not include the brackets.

```bash
git fetch origin --prune
git switch main
git pull --ff-only origin main
git switch -c revert/[feature-name]-[short-sha]
git show --stat [full-feature-commit-sha]
git revert --no-edit [full-feature-commit-sha]
npm run check
npm run lint
npm run test
npm run test:e2e
npm run build
git diff --check HEAD^ HEAD
git push -u origin HEAD
```

Open a pull request from the revert branch into `main`, wait for checks, then merge it normally. If
the commit being reverted is a merge commit, first inspect its parents with
`git show --no-patch --pretty=raw [merge-commit-sha]`, then use:

```bash
git revert -m 1 [merge-commit-sha]
```

Do not guess the mainline parent of a complex merge. Ask for review when parent `1` is not clearly
the `main` side of the merge.

If several commits form one feature, prefer reverting the merge commit. When there is no feature
merge, inspect the ordered range and revert the commits in reverse chronological order on one
dedicated branch. Verify the resulting product rather than assuming a clean Git operation means a
safe application rollback.

## Restore a previous production deployment

When production is broken, restore service first and repair Git second.

### Fast Vercel rollback

From a linked project, inspect deployments and roll back to the immediately previous production
deployment:

```bash
npx vercel@latest list --prod
npx vercel@latest rollback
npx vercel@latest rollback status
```

Vercel Hobby projects can roll back only to the immediately previous production deployment. On a
plan that supports an older target, use its exact deployment URL:

```bash
npx vercel@latest rollback [known-good-production-deployment-url]
npx vercel@latest rollback status
```

The dashboard alternative is **Project → Deployments → select a previous production deployment →
Rollback**. Record the restored deployment URL and its Git SHA in the incident notes.

An instant rollback routes traffic to an existing build; it does not rebuild it with newly edited
environment variables. Validate the restored release immediately:

```bash
curl --fail --silent --show-error https://replaycs.vercel.app/api/health
```

Then test the landing page, a DSA trace in both directions, a prediction, the DBMS pipeline,
persistent progress, the AI mentor when configured, and a mobile viewport.

### Make source control agree with production

A Vercel rollback does not change `main`. Identify the bad commit from the deployment details,
create the revert branch described above, merge the verified revert, and let `main` produce a new
production deployment. This prevents the next ordinary deployment from silently restoring the
faulty code.

To undo an accidental Vercel rollback without rebuilding, promote the intended deployment:

```bash
npx vercel@latest promote [deployment-id-or-url]
npx vercel@latest promote status
```

See the [deployment guide](deployment.md) for the complete preview, production, smoke-test, and
rollback workflow.

## Why force-push is prohibited

A force-push changes which commits a shared branch names. That can remove the only easy reference to
a stable deployment, invalidate pull requests and preview links, break another contributor's local
history, and erase the chronological evidence of Build Week work. A normal revert is recoverable:
both the faulty change and its correction remain visible. If histories unexpectedly diverge, stop,
fetch, inspect the graph, and reconcile with a reviewed merge or revert—never with
`git push --force` or `git push --force-with-lease`.

## Recovery record

For every incident, record:

- UTC time and reporter
- failing production URL and deployment ID
- associated Git SHA
- last known-good deployment URL and Git SHA
- rollback command or dashboard action
- health and smoke-test results
- revert pull request and merge SHA
- final production deployment URL

Official references: [Vercel production rollback](https://vercel.com/docs/deployments/rollback-production-deployment),
[Vercel CLI rollback](https://vercel.com/docs/cli/rollback), and
[Git revert](https://git-scm.com/docs/git-revert).
