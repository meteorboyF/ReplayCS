# ReplayCS progress

## Current status

- Updated: 2026-07-22 (+06)
- Working branch: `feat/strings-lab`
- Working baseline: `4e9310b` (`origin/main`, merge of PR #34)
- Teammate UI baseline: `d007dce` (PR #33, light-first theme and theme toggle), layered on the earlier `e75d3a9` redesign
- Production commit: `4e9310b`
- Production: https://replaycs.vercel.app
- Deployment: `dpl_HcX8sThH4wL3N9z5mqBWz3nfCJ6x` (`READY`)
- Stable deployment URL: https://replaycs-bf3kokpeo-meteorboy-f.vercel.app
- Recovery branch: `origin/feat/study-recap` at `2fb3489`
- Worktree: Strings Lab implementation and regression coverage are in progress; local `.claude/` is untracked and must not be committed.
- Immediate next action: complete the Strings full gate, merge/deploy it, then build Recursion Lab from current main.

## Current teammate UI contract

- Global tokens and primitives live in `src/app.css`: light surfaces are the default, `[data-theme='dark']` supplies the dark palette, teal `--primary`, violet `--secondary`, sky `--accent`, 18px `.panel` corners, system sans typography, and `--mono` for execution data.
- `src/routes/+layout.svelte` owns the sticky header, primary navigation, 1180px page shell, skip link, footer, persisted theme selection, and accessible light/dark toggle. These must not be replaced.
- Teammate page patterns are implemented by the current Landing, Onboarding, Learn, Trace Lab, Scenario Gallery, and Progress routes. Reuse their restrained hierarchy, one promoted next action, grouped subject cards, compact eyebrow labels, and deferred secondary settings.
- `src/lib/components/ui/ProgressBar.svelte` is the approved shared progress indicator.
- Lessons continue to use `src/lib/components/lesson/LessonWorkspace.svelte`, `CodePane.svelte`, `TraceControls.svelte`, `ExecutionEvidence.svelte`, and the existing complexity components. Do not restore older lesson shells.
- Approved controls are the global button/select/input styling with visible `:focus-visible` outlines. New pages must not invent another palette, typography scale, card primitive, or focus treatment.
- Responsive rules: global navigation becomes horizontally scrollable below 760px; LessonWorkspace collapses below 1000px and uses mobile tabs/sticky playback below 680px; page-specific grids must collapse before their fixed/min-content children overflow.
- Mobile conventions: single-column cards, reachable controls, horizontally contained internal visualizations, and no page-level horizontal overflow.
- Preserve the teammate versions of `src/routes/+page.svelte`, `onboarding/+page.svelte`, `learn/[subject]/+page.svelte`, `trace-lab/+page.svelte`, `challenges/+page.svelte`, and `progress/+page.svelte`. Future work may extend them narrowly but must not overwrite them with recovery-branch copies.

## Production UI audit

Automated against the public alias at 1440×900, 1280×800, 1024×768, and 390×844. The audit checks successful responses, visible main content, console/page errors, page-level overflow, and absence of prediction/lesson-AI UI. Lesson interaction coverage checks Next, Previous, Restart, Play, and timeline access.

| Route group                   | Loads | Code | Visualizer | Controls | No overlap/overflow | Mobile | Console clean | Verified   |
| ----------------------------- | ----- | ---- | ---------- | -------- | ------------------- | ------ | ------------- | ---------- |
| Landing, Learn, Trace Lab     | yes   | n/a  | n/a        | yes      | yes                 | yes    | yes           | production |
| Complexity, Progress          | yes   | n/a  | yes        | yes      | yes                 | yes    | yes           | production |
| Scenario Gallery, Judge Demo  | yes   | n/a  | n/a        | yes      | yes                 | yes    | yes           | production |
| Arrays, Linked List, Stack    | yes   | yes  | yes        | yes      | yes                 | yes    | yes           | production |
| Queue, Deque, Hash Table      | yes   | yes  | yes        | yes      | yes                 | yes    | yes           | production |
| Searching, Binary Search, BST | yes   | yes  | yes        | yes      | yes                 | yes    | yes           | production |
| Sorting Arena                 | yes   | yes  | yes        | yes      | yes                 | yes    | yes           | production |
| Graph Explorer                | yes   | yes  | yes        | yes      | yes                 | yes    | yes           | production |
| SQL Query Pipeline            | yes   | SQL  | yes        | yes      | yes                 | yes    | yes           | production |
| CPU Scheduling                | yes   | n/a  | yes        | yes      | yes                 | yes    | yes           | production |
| Packet Journey                | yes   | n/a  | yes        | yes      | yes                 | yes    | yes           | production |

The only product regression found was the Sorting Arena setup form extending the document to 1147px at a 1024px viewport. PR #30 stacks the setup grid at the existing 1100px breakpoint while preserving the teammate/global visual language. The deployed repair and all lesson controls passed 15/15 focused production checks.

## Recovery and feature status

- Study Recap: complete, merged in PR #31, and deployed from `1c99536`. The deterministic generator, server-only optional model rewrite, strict validation/schema, request size limit, timeout, safe fallback, English/Bangla and concise/exam-ready controls, subject/topic selection, teammate-style Progress CTA, and responsive page are implemented.
- Progress-store cleanup: complete in PR #32 and deployed from `3003dd4`. Version 4 removes obsolete prediction-era dependencies while accepting versions 1–4 and safely ignoring legacy stored properties.
- Light-theme regression repair: complete in PR #34 and deployed from `4e9310b`. The public Complexity Lab passes behavior and serious/critical WCAG checks (2/2).
- Strings Lab: implemented locally with nine operations, bounded inputs, C/C++/Java/Python semantic source mapping, character/allocation/copy/capacity visualization, cumulative work evidence, best/worst search, immutable O(n²) versus builder O(n), curriculum wiring, and mobile/language-preservation tests. Full gate: check/lint clean, 205/205 unit/API tests, build pass, and 146/146 browser tests.
- Recursion Lab: not started.

## Validation

UI milestone `e298072`:

- `git diff --check`: pass
- `npm run check`: 0 errors, 0 warnings
- `npm run lint`: pass
- `npx vitest run`: 201/201 pass (20 files)
- `npm run build`: pass
- `npx playwright test`: 132/132 pass
- Public route/viewport audit: all required routes passed after the Sorting fix; deployed focused regression/control verification is 15/15.
- Study Recap focused checks: Svelte check clean, 13/13 unit/API tests, 2/2 browser tests.

## Product rules

- Visual execution remains unrestricted: Previous, Next, Play/Pause, Restart, seeking, speed, language, presets, and bounded custom input.
- Do not restore predictions, modes, gating, hidden state, lesson AI, boss battles, or placeholder live curriculum cards.
- GPT enhancement is isolated to Study Recap and may rewrite presentation only; deterministic facts and learner state remain authoritative.
- No AI-system authorship, co-authorship, contributor metadata, source attribution, or branch naming.

## Milestones

1. Teammate UI deployed from current main: complete.
2. Production audit: complete; one tablet overflow identified.
3. UI regression repair and durable audit test: complete (PR #30, production `e298072`).
4. Study Recap transplant/adaptation: complete (PR #31, production `1c99536`).
5. Compatibility-safe progress-store cleanup: complete (PR #32, production `3003dd4`).
6. Light-theme accessibility regression: complete (PR #34, production `4e9310b`, public verification 2/2).
7. Strings Lab: implemented locally; full gate green and ready for PR.
8. Recursion Lab: pending.

## Blockers

The Study Recap deployment is `READY` and aliased, but this environment currently times out connecting to the public alias even for `/`; the direct deployment URL is protected by Vercel SSO. Retry public verification when alias connectivity recovers. Git/Vercel writes and browser launches require managed approval.
