# ReplayCS deployment guide

ReplayCS is a SvelteKit application deployed to Vercel with server routes enabled. It must not be
configured as a static-only site because `/api/ai/*` and `/api/health` execute on the server.

## Current deployment status

| Item                       | Value                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Production URL             | `https://replaycs.vercel.app`                                                              |
| Vercel account/team        | `meteorboy-f`                                                                              |
| Vercel project name and ID | `replaycs` / `prj_krxZW0eGkuFVme30ZAx2AG6OWFU7`                                            |
| Git repository             | `https://github.com/meteorboyF/ReplayCS.git`                                               |
| Production branch          | `main`                                                                                     |
| Framework                  | SvelteKit                                                                                  |
| Adapter                    | `@sveltejs/adapter-vercel`                                                                 |
| Vercel build Node.js       | 24.x (verified project setting)                                                            |
| Function runtime           | Node.js 22 (`nodejs22.x` in `svelte.config.js`)                                            |
| Install command            | Vercel npm auto-detection from `package-lock.json`; local/CI reproducibility uses `npm ci` |
| Build command              | SvelteKit framework default (`vite build`, the command behind `npm run build`)             |
| Output directory           | Managed by the SvelteKit Vercel adapter; do not set a static output directory              |
| Health endpoint            | `/api/health`                                                                              |
| AI state at docs audit     | Not configured; deterministic mentor fallback verified                                     |
| Git deployment connection  | One-time provider connection/Production Branch confirmation still required                 |

The first verified CLI production deployment completed on 2026-07-20, and later curriculum
milestones were deployed to the same stable alias. The health endpoint and automated public learner
smoke passed. Deployment-specific URLs remain visible in the Vercel dashboard for rollback and
audit.

## One-time Vercel setup

Authentication is an interactive user action. Run this locally; never paste a password, API token,
or `OPENAI_API_KEY` into chat or a committed file:

```bash
npx vercel@latest login
npx vercel@latest whoami
npx vercel@latest link --yes --project replaycs --scope meteorboy-f
```

During `link`, select the correct account/team and link or create the ReplayCS project. The generated
`.vercel/` directory contains local project metadata and is ignored by Git.

The CLI project and production domain are verified. Git-based automatic deployments still depend on
a one-time provider connection: import/connect `meteorboyF/ReplayCS` in the dashboard (or, from an
already linked clean checkout, run `npx vercel@latest git connect
https://github.com/meteorboyF/ReplayCS.git`). Verify the SvelteKit framework preset and set `main` as
the Production Branch under **Project Settings → Environments → Production → Branch Tracking**.
Once connected, branch pushes and pull requests create Preview deployments and updates to `main`
create Production deployments.

Before the first remote deployment, verify locally:

```bash
npm ci
npm run check
npm run lint
npm run test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
git status --short
```

Do not deploy from a dirty worktree. `git status --short` must be empty for a CLI production deploy,
and the exact deployed SHA must already be pushed.

## Environment variables

| Variable                | Required          | Environments               | Purpose                                        |
| ----------------------- | ----------------- | -------------------------- | ---------------------------------------------- |
| `OPENAI_API_KEY`        | No                | Local, Preview, Production | Enables server-side GPT-5.6 mentor responses   |
| `OPENAI_MODEL`          | No                | Local, Preview, Production | Model override; defaults to `gpt-5.6`          |
| `VERCEL_GIT_COMMIT_SHA` | Managed by Vercel | Preview, Production        | Reported as the build version by `/api/health` |

For local development, copy the template and edit `.env` locally:

```bash
cp .env.example .env
```

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

`.env` is ignored by Git. `OPENAI_API_KEY` is read only by server code; never rename it to a
browser-exposed/public-prefixed variable.

For Vercel, add the key yourself in **Project Settings → Environment Variables** and select both
**Preview** and **Production**. Add `OPENAI_MODEL=gpt-5.6` to the same environments. Do not send the
key to another person or place it in a command that will be saved in shell history. Environment
variable changes apply only to new deployments, so redeploy both environments afterward.

The application intentionally remains usable without `OPENAI_API_KEY`: deterministic lesson content
and fallback explanations continue to work, and `/api/health` reports `"aiConfigured": false`.

## Preview workflow

The normal workflow keeps `main` deployable:

1. Synchronize `main`, create one focused feature branch, implement and test one coherent change.
2. Commit with a descriptive message and push the branch immediately.
3. Open a pull request. The Git integration creates a commit-specific Preview URL and a
   branch-specific URL.
4. Smoke-test the Preview URL and inspect deployment logs. Fix failures with additional focused
   commits on the same branch.
5. Merge only after checks and preview validation pass.

Representative commands:

```bash
git switch main
git pull --ff-only origin main
git switch -c feat/[focused-feature]
npm run check
npm run lint
npm run test
npm run build
git push -u origin HEAD
```

If Git automatic deployment has not yet been connected, a linked project can create the Preview
directly from a clean feature branch:

```bash
npx vercel@latest
```

Copy the URL printed by Vercel into the pull request/checkpoint report. A CLI preview is a fallback,
not a reason to skip pushing the corresponding Git commit.

Preview deployments may be protected by Vercel Authentication. Validate a protected preview with
the authenticated CLI instead of weakening protection:

```bash
npx vercel@latest curl /api/health --deployment PREVIEW_DEPLOYMENT_URL
```

### Preview smoke test

Against the Preview URL:

- Load the landing page and verify primary navigation.
- Open Binary Search; advance and reverse the trace, submit a prediction, and switch language.
- Open the DBMS query pipeline and verify intermediate and final rows.
- Reload and verify local progress persists.
- Request `/api/health` and confirm `status`, `app`, `aiConfigured`, and `version`.
- Exercise the AI mentor when configured and its deterministic unavailable state without a key.
- Check browser console errors, keyboard controls, and a mobile viewport.

## Production workflow

With the Git integration connected, merge the verified pull request into `main` and push `main`.
Vercel builds the production deployment from that commit and keeps the stable production domain
unchanged.

```bash
git switch main
git pull --ff-only origin main
git rev-parse HEAD
npm ci
npm run check
npm run lint
npm run test
npx playwright install --with-deps chromium
npm run test:e2e
npm run build
git status --short
```

Confirm the merge SHA is present on `origin/main`, then watch the Vercel deployment. If automatic Git
deployment is unavailable, deploy that same clean, pushed checkout explicitly:

```bash
npx vercel@latest --prod
```

Record the production URL, deployment ID, and Git SHA. Confirm the deployment metadata names the
same SHA already present on `origin/main`. Do not treat a successful build alone as a successful
release.

### Production validation

After every production deployment:

1. Load the stable production URL.
2. Open a DSA lesson and move forward and backward.
3. Submit a prediction and confirm feedback.
4. Open SQL Query Pipeline and inspect/predict its logical stages.
5. Open CPU Scheduling and Packet Journey and restore an earlier state in each.
6. Complete one Challenge Arena boss and reload Progress to verify persistence/idempotency.
7. Follow every Judge Demo link.
8. Check `/api/health`.
9. Test the AI mentor when `aiConfigured` is true and its labeled fallback when false.
10. Check for browser console and failed-network errors.
11. Test a mobile viewport and keyboard navigation.
12. Run the automated smoke/E2E suite against production when configured to do so safely.

## Health endpoint

`GET /api/health` returns non-sensitive, uncached deployment metadata:

```json
{
  "status": "ok",
  "app": "ReplayCS",
  "aiConfigured": true,
  "version": "git-commit-or-deployment-identity"
}
```

Check it after deployment:

```bash
curl --fail --silent --show-error https://replaycs.vercel.app/api/health
```

Run the browser production smoke suite without launching a local server:

```bash
REPLAYCS_BASE_URL=https://replaycs.vercel.app npx playwright test e2e/production-smoke.spec.ts
```

Expected behavior:

- HTTP status is `200`.
- `status` is `ok` and `app` is `ReplayCS`.
- `aiConfigured` is a boolean, not a secret or key value.
- `version` uses `VERCEL_GIT_COMMIT_SHA` or `GIT_COMMIT_SHA` when available, otherwise the safe
  `VERCEL_URL` deployment identity. Local development reports `development`.
- `Cache-Control` is `no-store`.

The health route must never return environment values, tokens, stack traces, user data, or full
configuration objects.

## Rollback

If production is unhealthy, first identify the deployment and check logs:

```bash
npx vercel@latest list --prod
npx vercel@latest inspect [bad-deployment-url] --logs
```

Restore the immediately previous production deployment and confirm completion:

```bash
npx vercel@latest rollback
npx vercel@latest rollback status
```

On Vercel Hobby, rollback is limited to the immediately previous production deployment. Where the
plan permits selecting an older production release, pass the known-good URL:

```bash
npx vercel@latest rollback [known-good-production-deployment-url]
```

The dashboard path is **Project → Deployments → previous production deployment → Rollback**. An
instant rollback reuses the selected build, including its build-time environment; it does not rebuild
with newly changed environment variables.

After traffic is restored, verify `/api/health` and the production smoke checklist. Then revert the
bad Git change on a new branch and merge the tested revert into `main`; otherwise a later deployment
can reintroduce the bug. Vercel disables automatic production-domain assignment while a project is
rolled back, so the tested fixed deployment must be promoted explicitly before normal branch-driven
promotion resumes. Follow [the recovery guide](recovery-guide.md) for the exact branch, revert, and
promotion sequence.

## Troubleshooting

### Vercel asks for authentication

Run `npx vercel@latest login`, complete the browser/email flow yourself, then confirm with
`npx vercel@latest whoami`. Do not share credentials or tokens.

### The CLI says the directory is not linked

Run `npx vercel@latest link`, select the intended account/team and ReplayCS project, then inspect
`.vercel/project.json` locally. Do not commit `.vercel/`.

### A feature branch has no Preview deployment

Confirm the GitHub repository is connected, the branch was pushed, and the branch is not configured
as Production. Inspect the Vercel Deployments page. Until Git integration is fixed, use
`npx vercel@latest` on the clean, pushed branch and attach its URL to the pull request.

### A merge to `main` did not update Production

Confirm `main` is the configured Production Branch, the merge SHA is on `origin/main`, and no ignored
build step or domain-assignment setting blocked deployment. Inspect the deployment rather than
re-running an unrelated build:

```bash
npx vercel@latest list --prod
npx vercel@latest inspect [deployment-url] --logs
```

### The build fails on Vercel but passes locally

Reproduce once with Node.js 24, which matches the verified Vercel build setting, and keep the Node.js
22 CI build green because deployed functions explicitly target `nodejs22.x`. Run `npm ci && npm run
build` from a clean clone and confirm `package-lock.json` is committed. Check that the framework
preset is SvelteKit and that no static output directory override is configured. Read the deployment
build logs for the first failure.

### `/api/*` returns 404 or behaves like a static file

Verify `@sveltejs/adapter-vercel` is active in `svelte.config.js`, the framework preset is SvelteKit,
and the project was not exported or configured as static-only. Redeploy after correcting settings.

### `/api/health` reports `aiConfigured: false`

The site is healthy but the AI key is absent from that deployment environment. Add
`OPENAI_API_KEY` to Preview and/or Production in the Vercel dashboard, then create a new deployment.
Do not print the key while diagnosing.

### An environment-variable change has no effect

Vercel environment changes do not modify an already-built deployment. Confirm the variable targets
the correct environment, then redeploy. Preview and Production values are configured separately.

### AI requests time out, rate-limit, or fall back

First confirm `/api/health`, then inspect function logs by deployment. ReplayCS should show a safe
fallback rather than fail the lesson. Verify the model name and account access without logging the
key. The current in-memory limiter is only a documented serverless fallback; it is not globally
consistent across instances and should be replaced with a shared store before high traffic.

### Production is broken after a release

Use the rollback procedure immediately, validate the restored deployment, then create a Git revert.
Do not force-push `main`, move a tag, delete deployment history, or attempt to repair history with a
hard reset.

Official references: [Vercel Git deployments](https://vercel.com/docs/git),
[environments and Preview deployments](https://vercel.com/docs/deployments/environments),
[environment variables](https://vercel.com/docs/environment-variables), and
[production rollback](https://vercel.com/docs/deployments/rollback-production-deployment).
