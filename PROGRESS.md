# ReplayCS progress

## Current status

- Updated: 2026-07-22 (+06)
- Working branch: `feat/study-recap-current`
- Working baseline: `e298072` (`origin/main`, merge of PR #30)
- Teammate UI baseline: `e75d3a9` (PRs #23 and #25–#29)
- Production commit: `e298072`
- Production: https://replaycs.vercel.app
- Deployment: `dpl_C6qLpB16DjeHPPbC27iC3YW8yAKX` (`READY`)
- Stable deployment URL: https://replaycs-2aumm6wez-meteorboy-f.vercel.app
- Recovery branch: `origin/feat/study-recap` at `2fb3489`
- Worktree: Study Recap is being adapted on current main; local `.claude/` is untracked and must not be committed.
- Immediate next action: complete the Study Recap full gate, merge/deploy it, then audit legacy progress-store consumers.

## Current teammate UI contract

- Global tokens and primitives live in `src/app.css`: dark navy background, `--surface`/`--raised` cards, teal `--primary`, violet `--secondary`, sky `--accent`, 18px `.panel` corners, system sans typography, and `--mono` for execution data.
- `src/routes/+layout.svelte` owns the sticky header, primary navigation, 1180px page shell, skip link, and footer. These must not be replaced.
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

- Study Recap: recovered source was transplanted onto current main without its stale Progress layout. The deterministic generator, server-only optional model rewrite, strict validation/schema, request size limit, timeout, safe fallback, English/Bangla and concise/exam-ready controls, subject/topic selection, teammate-style Progress CTA, and responsive page are implemented. Focused tests: 13/13 unit/API and 2/2 browser. Full gate, PR, merge, and deploy remain.
- Progress-store cleanup: not started. Current main already removed user-facing prediction metrics; legacy storage fields still require a compatibility-safe consumer audit.
- Strings Lab: not started.
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
4. Study Recap transplant/adaptation: in progress on `feat/study-recap-current`.
5. Compatibility-safe progress-store cleanup: pending after Study Recap.
6. Strings Lab: pending.
7. Recursion Lab: pending.

## Blockers

None. Git/Vercel writes and browser launches require managed approval in this environment.
