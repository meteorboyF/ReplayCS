# Known limitations

Last audited: 2026-07-20

ReplayCS has a public deployment, functional onboarding/progress, deterministic labs in every
advertised subject, Replay My Mistake, a connected mentor, Challenge Arena, and a guided Judge Demo.
It is still a bounded hackathon education product, not a code runner, database, network analyzer, or
complete CS curriculum. This document keeps those boundaries explicit.

## Production and release state

- The stable public URL is <https://replaycs.vercel.app>; `/api/health` and the production learner
  smoke path have been verified.
- At this audit the health endpoint reported `aiConfigured: false`. Production therefore uses the
  visible deterministic mentor fallback. The server-side GPT-5.6 path requires the project owner to
  add `OPENAI_API_KEY` in Vercel and create a new deployment.
- GitHub Actions is configured for pull requests and `main`, but a newly added workflow is not proven
  green until GitHub runs it after push. Final release must confirm that remote result rather than
  relying only on local checks.
- Git-based automatic Preview/Production deployment depends on the one-time Vercel dashboard
  repository connection. CLI deployment is documented and verified; dashboard connection status
  should be confirmed separately.

## Learning experience

- Every flagship lab has bounded deterministic state, prediction evidence, forward/backward
  playback, persisted completion/mastery, misconception tagging, and the shared grounded mentor.
- Binary Search and SQL Query Pipeline have the deepest recovery loop: side-by-side predicted/actual
  state, first-divergence replay, and a rewarded corrective check. Sorting, Graph, CPU, and Packet
  can record a misconception and request **Explain my mistake**, but do not yet provide the same
  visual side-by-side recovery component.
- Challenge Arena uses five curated two-checkpoint bosses. It supports check, retry, reveal, one-time
  completion XP, and replay; it is not procedural or GPT-generated challenge authoring.
- Judge Demo is a persistent guided checklist that opens real labs in new tabs. Checklist state marks
  tour position only; it does not infer that every linked interaction was completed and does not
  award XP itself.
- Some subject cards remain labeled planned. Linked lists, trees/heaps/DP, normalization/indexing/
  concurrency, page replacement/deadlock, and TCP/subnetting/routing are roadmap topics, not shipped
  labs.
- ReplayCS does not execute arbitrary C, C++, Java, Python, SQL, shell commands, or uploaded files.

## Domain-model boundaries

- Binary Search accepts 2–16 ascending integers, permits duplicates, and uses curated semantic source
  mappings. It is not an arbitrary-code debugger.
- Curated C, C++, Java, and Python semantic mapping exists for Binary Search and Graph Explorer.
  SQL, CPU Scheduling, and Packet Journey must not be described as four-language simulations, and
  there is no side-by-side language comparison.
- SQL uses two bounded in-memory HR scenarios. The displayed order is an educational logical model;
  the physical-plan panel is illustrative, not captured output from a database optimizer. Learner SQL,
  subqueries, normalization, indexing, transactions, and concurrency are not executed.
- CPU Scheduling uses documented deterministic arrival, priority, tie-breaking, and quantum rules.
  It does not model multiprocessor scheduling, context-switch cost, I/O blocking, or a real kernel.
- Packet Journey uses reserved/illustrative addresses and a bounded conceptual topology. It is not a
  packet capture; timing, recursive DNS infrastructure, retransmission, congestion control, and many
  middleboxes are simplified or outside this lab.

## AI mentor

- GPT-5.6 is connected through the shared mentor in every shipped flagship lab. The quality/depth of
  domain context varies with each state model; Binary Search and Graph Explorer have four-language
  programming source maps, while SQL, CPU, and Packet supply their relevant clause/operation
  context.
- The mentor is request/response rather than token-streaming. It supports explain, why, hint,
  simplify, and mistake interactions but is not a free-form general chatbot or a complete multi-step
  hint ladder.
- The OpenAI client times out after 12 seconds and retries once. A validated deterministic fallback
  handles a missing key, upstream failure, or invalid structured output, but there is no response
  cache, token/cost dashboard, user-cancel control, or broad mocked model-quality evaluation suite.
- Rate limiting is an in-memory per-process map. It is not shared or globally consistent across
  Vercel serverless instances and must not be presented as distributed abuse prevention.
- Exact answers, traces, XP, and recommendations remain deterministic. GPT-5.6 does not execute code
  or SQL and must not be credited with the canonical state.

## Progress, privacy, and gamification

- Progress and onboarding preferences use versioned browser local storage. There are no accounts,
  cloud backup, cross-device synchronization, classrooms, or leaderboards.
- Lesson mastery is a transparent interaction score, not a psychometric assessment: 50 points for
  trace completion, 30 for a correct prediction or recovery, and 20 for an unhinted first try with no
  unresolved mistake or for fully recovering all recorded mistakes. Later recovery can improve the
  score without re-awarding the 25 XP lesson completion; the recovery itself can award 6 XP once.
- The dashboard persists and reports first-attempt evidence, average attempts per evidenced
  checkpoint, mentor hint requests, recent XP activity, language interactions, and boss progress.
  Language counts represent onboarding/code-tab interactions, not proof that a lesson was completed
  in that language; a hint count records the request, not the quality of the response.
- Export is local JSON. Corrupt v1–v3 data is sanitized and blocked storage access no longer crashes
  the product, but the UI does not yet tell a learner that persistence failed. Clearing browser data
  removes progress.
- The “streak” is consecutive correct prediction evidence, not a calendar-day streak.
- XP and boss/recovery completion are idempotent for known evidence IDs, but there is no server-side
  anti-tamper authority. A learner can edit their own browser storage.
- Revealing a boss checkpoint turns that attempt into practice-only and prevents completion/XP.
  Individual correct boss answers are not all folded into the global prediction-accuracy metric.
- Recommendations are transparent deterministic rules, currently much smaller than a full knowledge
  graph or spaced-repetition scheduler.

## Accessibility, devices, and testing

- Responsive layouts, visible focus, semantic controls, reduced-motion styles, and a mobile flagship
  production smoke test exist. The complete cross-domain journey has not been certified against a
  WCAG conformance level.
- Automated axe testing, screen-reader matrix testing, and full keyboard audits are not configured.
- Playwright currently targets desktop Chromium; Firefox, WebKit, and a broad physical-device matrix
  remain future coverage.
- Dynamic visual state has useful labels in the newer labs, but some dense diagrams/tables still need
  richer screen-reader summaries and non-visual equivalence.
- Production smoke covers health, landing/onboarding, and the mobile Binary Search flagship. It is not
  a synthetic monitor or availability SLA.

## Operations, provenance, and license

- There is no user database, analytics warehouse, distributed cache, queue, or centralized telemetry.
- Vercel Hobby rollback limitations may restrict instant rollback to the immediately previous
  production deployment; Git revert remains the durable recovery path.
- The prior Interview-Prep source had no detected license file. ReplayCS has no selected open-source
  license, and ownership/redistribution rights must be confirmed before adding one or inviting reuse.
- Screenshot assets are generated from the real app. They can become stale after UI changes and
  should be regenerated with `npm run screenshots` before a final submission update.

See [product-completion-board.md](product-completion-board.md) for current acceptance status and
[judge-testing-guide.md](judge-testing-guide.md) for the reproducible happy path.
