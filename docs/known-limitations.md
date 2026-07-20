# Known limitations

Last audited: 2026-07-20

ReplayCS currently has a stable technical foundation and two implemented learner routes, but it is not yet a complete public hackathon submission. This document records product limits honestly so learner-facing copy, judging material, and release decisions do not overstate the build.

## Submission blockers

- No verified public production URL is recorded in the repository. The Vercel adapter and `/api/health` exist, but preview/production deployment and rollback have not been smoke-tested or documented.
- There is no onboarding flow, Judge Demo, Replay My Mistake experience, adaptive recommendation loop, or functional Challenge Arena.
- The OpenAI explain endpoint exists server-side, but the lesson UI does not call it. “Ask AI mentor” only displays a browser alert.
- DSA II, Operating Systems, and Computer Networks have dashboards but no functional lesson route. The landing page’s “BFS live” label is incorrect.
- DBMS Query Pipeline exists, but its dashboard card is marked `next`, renders as “Coming soon,” and does not link to the existing lesson.
- README/demo/submission assets are not final: there is no live URL, judge-testing guide, finished demo script, screenshot set, or final Devpost document.

## Learning experience

- Binary Search is the only route with the typed trace/prediction/source-mapping experience.
- Binary Search uses a fixed default input in the UI. The engine accepts arguments but silently sorts values; there is no user-facing validation, duplicate policy, or input-size limit.
- Only midpoint checkpoints accept learner input. There is no prediction gating before every meaningful reveal, no persisted attempt count, and no first-attempt accuracy.
- An incorrect answer shows a short deterministic explanation but does not preserve the learner’s predicted state, identify the first divergence, record a misconception, or generate a recovery challenge.
- Reaching the final Binary Search step awards completion even when the learner jumps there with the timeline; completion criteria are declared in the lesson model but not enforced by the page.
- The SQL lesson is an effective logical-order walkthrough, not a full ReplayCS lab: it has no prediction, trace schema, state-mutation inspector, mentor, XP, mastery, completion, restart, or custom/preset selection.
- SQL coverage is one fixed INNER JOIN query. LEFT JOIN, HAVING, SUM, subqueries, normalization, indexing/query plans, and concurrency are not implemented.
- SQL stages intentionally teach the conceptual logical processing model and must not be presented as a database optimizer’s physical execution plan.

## AI mentor

- `/api/ai/explain-step` supports request validation, structured response validation, a 12-second client timeout, one retry, and deterministic fallback. These capabilities are not yet exposed to learners.
- Hint, prediction-evaluation, recap, and challenge endpoints are limited deterministic stubs; challenge generation always returns `null`.
- The UI has no explanation-level selector, English/Bangla selector, hint ladder, scoped question input, mistake explanation, loading state, retry state, or distinct timeout/rate-limit/network/key states.
- Rate limiting is an in-memory per-process map. It is not globally reliable across Vercel/serverless instances and must not be described as production-distributed enforcement.
- There is no response cache, token/cost telemetry, abort control from the browser, or mocked AI evaluation suite.
- Without `OPENAI_API_KEY`, the server explanation route can return deterministic content, but the current UI does not render that fallback.

## Progress, adaptation, and gamification

- The version 1 local profile stores only XP, streak, completed lesson IDs, rewarded prediction IDs, and one optional badge.
- There is no level, mastery, accuracy, hint/attempt history, misconception evidence, preferences, subject strength/weakness, recent activity, language usage, boss progress, or recommendation.
- The displayed streak is a count of uniquely rewarded correct predictions, not a calendar learning streak.
- XP rewards are idempotent for known checkpoint/lesson IDs, but the product does not yet model attempts, hearts, daily/subject quests, recovery, boss challenges, or multi-language achievements.
- Progress is browser-local and does not sync between devices or browsers. There is no account system or cloud backup.
- Corrupt or old local-storage data safely falls back to an empty profile, but the learner receives no recovery explanation. `saveProgress` does not catch storage-denied/quota failures.
- Reset uses a native confirmation dialog. JSON export and privacy guidance are not implemented.

## Cross-language support

- Curated C, C++, Java, and Python mapping exists only for Binary Search.
- Language switching preserves the current Binary Search step and visualization; it does not persist as a learner preference or in the share URL.
- There is no side-by-side language comparison or language-specific pointer/reference teaching.
- DBMS, OS, and Networks must not be marketed as four-language simulations because mapped source code does not exist for those domains.

## Navigation, mobile, and accessibility

- On narrow viewports, Trace Lab, Challenges, and About are hidden from the main navigation with no replacement menu. Learn and Progress remain visible.
- Responsive CSS exists for the main layouts, but the full product has no mobile/tablet E2E or production-device smoke coverage.
- There is no skip link, active-route indicator, or documented keyboard shortcut system for playback.
- The language tabs expose tab roles but do not implement the expected arrow-key tab interaction.
- Dynamic trace and prediction feedback is not announced through an ARIA live region.
- Array and state visuals need richer screen-reader descriptions and stronger non-color status cues.
- The SQL table lacks a caption and explicit header scopes.
- Automated accessibility testing is not configured.

## Error, loading, and empty states

- A root error page and invalid-subject 404 exist; there is no lesson-level error boundary or trace-generation recovery UI.
- No custom-input UI exists, so validation and inline error association are absent.
- AI, clipboard, storage, and network failures do not have complete in-product recovery states.
- There are no loading indicators, skeletons, accessible busy announcements, or retry components.
- Empty progress shows zero-valued cards but no recommended first action. Challenge and unimplemented subject routes are roadmap placeholders, not functional empty states.
- Lesson completion has no dedicated success/next-step state.

## Testing and operations

- Current local verification passes: Svelte check, Prettier, 7 unit tests across 4 files, 1 Chromium E2E test, and the production build.
- Engine coverage is limited to Binary Search, one SQL fixture, progress idempotency, and the health endpoint.
- The only E2E test verifies Binary Search step preservation while switching from C++ to Python. It does not submit a prediction, verify persistence/completion, cover SQL, exercise failure states, or test the full learner/judge journey.
- There is no GitHub Actions workflow, automated accessibility test, mobile project, production smoke test, or AI mock/evaluation suite in the audited tree.
- Browser-console cleanliness and production behavior have not been documented as verified.

## Documentation, provenance, and licensing

- Source provenance and migration decisions are documented, including the Interview-Prep source commit.
- The audited source has no confirmed license, and ReplayCS has no selected license. Redistribution rights for migrated material should be confirmed before adding a license or inviting reuse.
- README still contains screenshot placeholders and stale deployment wording, and its demo outline ends by showing roadmap content rather than a finished cross-domain journey.
- The repository contains preliminary `docs/devpost-submission-notes.md`, not the required final `docs/devpost-submission.md`.
- No real Codex feedback session ID should be fabricated; the final collaboration document must retain `CODEX_SESSION_ID=ADD_FROM_CODEX_FEEDBACK_COMMAND` until the user supplies it.

## Intentional boundaries

- ReplayCS does not execute arbitrary C, C++, Java, Python, shell, or production SQL input.
- Trace engines—not GPT-5.6—must remain the source of execution truth and scoring.
- Local browser progress and deterministic no-key fallback are valid launch choices if described accurately; account sync and arbitrary-code execution are not required for the hackathon promise.

See [product-completion-board.md](product-completion-board.md) for acceptance criteria and priority for each gap.
