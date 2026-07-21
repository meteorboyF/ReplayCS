# ReplayCS Progress

## Last updated

- Date: 2026-07-21
- Local time: 23:15 (+06)
- Updated by: Development session
- Repository: https://github.com/meteorboyF/ReplayCS.git
- Production: https://replaycs.vercel.app
- Current branch: `refactor/visualizer-first-rescue` (renamed from `claude/session-521cb8`; old name never pushed)
- Current commit: `c903075` (branch head; MERGED to main via PR #19)
- Remote main commit: `22654b9` (merge of PR #19)
- Latest production commit: `22654b9` — deployed to Vercel prod, alias `replaycs.vercel.app` → `replaycs-lc8ho0oo2-meteorboy-f.vercel.app`
- Worktree status: clean
- CI status: GitHub Actions "Check, test, build, and browser smoke" PASSED on PR #19; local gate green
- Production health: deployment Ready (Vercel); landing page serves the new build (title verified). Live per-route click-through NOT possible from this sandbox (production domain gates browser read/drive behind per-action approval; plain curl egress blocked). Behavior verified via CI browser smoke + local Playwright 31/31.
- Open blockers: none for Phase 0 (published + deployed). Manual production click-through of all 15 routes remains for a human/interactive session.

## Current session objective

> Phase 0 product rescue: remove prediction, Learn/Guided/Challenge modes, and the AI mentor from every
> lesson; rebuild the shared visual-first workspace; de-predict the six bespoke lesson pages; remove
> Challenges from the primary nav; and get the full local gate (check/lint/vitest/build/playwright) green.

This objective is **complete** on branch `refactor/visualizer-first-rescue`. Not yet merged to `main` or deployed.

## Product direction (active rules — do not restore rejected features)

- Visualizer-first. Code + visualization + state + Big-O visible together, nothing gated.
- **No** prediction cards, checkpoints, "Lock prediction", gating, or Replay My Mistake inside lessons.
- **No** AI mentor / "Explain this step" inside lessons. (GPT-5.6 is retained ONLY for a future isolated
  `/study-recap` feature — NOT yet built.)
- **No** Learn/Guided/Challenge mode tabs. `src/lib/lesson/mode.ts` still exists but is unused by any page.
- Line-by-line deterministic execution; the resulting state is always shown.
- Four-language mappings preserved where they already exist (shell CodePane, binary search, graph).
- Big-O derived from live process evidence (ExecutionEvidence + ComplexityWhy panels).
- No placeholders marked live. No AI collaborator/co-author attribution anywhere.

## Completed and verified

### Shared visual-first LessonWorkspace shell

- Status: MERGED-READY on branch (IMPLEMENTED LOCALLY / not pushed)
- File: `src/lib/components/lesson/LessonWorkspace.svelte`
- What: removed mode toggle, prediction checkpoints, gating, Replay My Mistake, and AI mentor. Layout =
  config bar → op-context badges (time/space) → code | visual / state | complexity grid → step
  explanation → playbar. `visibleState` is always `step.stateAfter`. Mobile tabs: Visual/Code/State/
  Complexity with sticky playbar.
- Consumers (thin wrappers, all now de-predicted automatically): arrays, stack, queue, deque, hash-table,
  linked-list, bst, search-lab.
- Tests: check 0/0, vitest 211 pass, playwright green. Commit `6bbe854`.

### Six bespoke lesson pages de-predicted

- Sorting Arena `src/routes/lesson/dsa-1/sorting-arena/+page.svelte` — commit `029fab7`. Keeps its own
  array player; removed modes, opening prediction, gating, mentor. Completion shows a "Mastery saved" pill.
- Binary Search `src/routes/lesson/dsa-1/binary-search/+page.svelte` — commit `9e90187`. Removed gating,
  Replay My Mistake, mentor; state revealed immediately; share links + language switch intact.
- Graph Explorer `src/routes/lesson/dsa-2/graph-explorer/+page.svelte` — commit `9e90187`. Removed frontier
  prediction lock + play/seek gates + mentor.
- SQL Query Pipeline `src/routes/lesson/dbms/query-pipeline/+page.svelte` — commit `a517868`. No longer
  hides the HAVING clause or gates stage nav; recovery flow + mentor gone; final relation always shown.
- CPU Scheduling `src/routes/lesson/operating-systems/cpu-scheduling/+page.svelte` — commit `a904678`.
  Dispatch prediction no longer gates the Gantt chart, playback, or metrics table; mentor gone.
- Packet Journey `src/routes/lesson/computer-networks/packet-journey/+page.svelte` — commit `c900327`.
  Cache/next-event prediction removed; topology + packet state always visible; mentor gone.
- All six: check 0 errors / 0 warnings, prettier clean, vitest green, playwright green.

### Primary navigation

- File: `src/routes/+layout.svelte` — commit `4865f5a`. Removed the `Challenges` link; nav is now Learn /
  Trace Lab / Complexity / Judge Demo / Progress / About. Reworded the site meta description away from
  prediction framing.

### e2e suite realigned

- Commit `3841a9b`. Deleted `ai-mentor.spec.ts`, `replay-mistake.spec.ts`, `lesson-modes.spec.ts`.
  Rewrote binary-search, graph-explorer, cpu-scheduling, packet-journey, query-pipeline, lesson-cohesion,
  judge-demo, onboarding, production-smoke to visual-first behavior. Mastery expectations updated to the
  completion-only score (50). Full Playwright run: **31 passed**.

## In progress

_None — session objective complete on branch._

## Needs rework (known follow-ups, not blocking Phase 0)

### /challenges route + boss-arena subsystem still exists

- Current problem: the prediction-based Challenge Arena route (`src/routes/challenges/+page.svelte`), its
  engine (`src/lib/challenges/arena.ts`), the Progress page "Challenge Arena" section
  (`src/routes/progress/+page.svelte` lines ~261–286), and `e2e/challenge-arena.spec.ts` /
  `e2e/progress-integrity.spec.ts` remain. Only the primary-nav link was removed.
- Required: either delete the route/engine/tests, or convert `/challenges` into a non-guessing Scenario
  Gallery of trace presets per the brief (section 2). Then prune boss/prediction fields from the Progress
  page and progress store.
- Priority: medium.

### Sorting Arena has no synchronized four-language code panel

- The brief (section 15) wants a persistent C/C++/Java/Python code panel mapped to each sorting step. The
  sorting engine (`src/lib/engines/dsa/sorting.ts`) does not emit `sourceLines` per step yet — this is real
  engine work, not a page tweak. Priority: medium.

### Progress store still tracks prediction/mistake/boss evidence

- `src/lib/progress/store.ts` retains `awardPrediction`, `awardRecovery`, `recordMisconception`,
  `recordHint`, boss challenges, and prediction-weighted `lessonMasteryScore`. These are unused by lessons
  now but still power the Progress page. Clean up alongside the /challenges decision. Priority: low.

## Curriculum status

| Subject  | Topic                                                                   | Route                                    | Engine | Visualizer | Code trace        | Big-O/process visual | Responsive | Tests    | Status                                          |
| -------- | ----------------------------------------------------------------------- | ---------------------------------------- | ------ | ---------- | ----------------- | -------------------- | ---------- | -------- | ----------------------------------------------- |
| DSA I    | Arrays/Dynamic Arrays                                                   | /lesson/dsa-1/arrays                     | yes    | yes        | yes (shell)       | yes                  | yes        | unit+e2e | DEPLOYED (pre-existing), de-predicted on branch |
| DSA I    | Linked Lists                                                            | /lesson/dsa-1/linked-list                | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA I    | Stack                                                                   | /lesson/dsa-1/stack                      | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA I    | Queue                                                                   | /lesson/dsa-1/queue                      | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA I    | Deque                                                                   | /lesson/dsa-1/deque                      | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA I    | Hash Tables                                                             | /lesson/dsa-1/hash-table                 | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA I    | Searching                                                               | /lesson/dsa-1/search-lab                 | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA I    | Binary Search                                                           | /lesson/dsa-1/binary-search              | yes    | yes        | yes (4-lang)      | yes                  | yes        | e2e      | de-predicted on branch                          |
| DSA I    | Sorting                                                                 | /lesson/dsa-1/sorting-arena              | yes    | yes        | NO code panel yet | yes (per-alg)        | yes        | e2e      | de-predicted; code panel TODO                   |
| DSA I    | Strings                                                                 | —                                        | NO     | —          | —                 | —                    | —          | —        | NOT STARTED                                     |
| DSA I    | Recursion                                                               | —                                        | NO     | —          | —                 | —                    | —          | —        | NOT STARTED                                     |
| DSA I    | Complexity Fundamentals                                                 | /complexity                              | yes    | yes        | n/a               | yes                  | yes        | e2e      | pre-existing (Complexity Lab)                   |
| DSA II   | Trees/BST                                                               | /lesson/dsa-1/bst                        | yes    | yes        | yes (shell)       | yes                  | yes        | unit     | de-predicted on branch                          |
| DSA II   | Graphs (traversal)                                                      | /lesson/dsa-2/graph-explorer             | yes    | yes        | yes (4-lang)      | yes                  | yes        | e2e      | de-predicted on branch                          |
| DSA II   | Heap/PQ, Trie, DSU, Topo, Shortest Paths, MST, DP, Greedy, Backtracking | —                                        | NO     | —          | —                 | —                    | —          | —        | NOT STARTED                                     |
| DBMS     | SQL Pipeline                                                            | /lesson/dbms/query-pipeline              | yes    | yes        | SQL               | yes (row counts)     | yes        | e2e      | de-predicted on branch                          |
| DBMS     | RelAlg, Schema/ER, Normalization, Indexes, Joins, Transactions, Plans   | —                                        | NO     | —          | —                 | —                    | —          | —        | NOT STARTED                                     |
| OS       | CPU Scheduling                                                          | /lesson/operating-systems/cpu-scheduling | yes    | yes        | n/a               | yes (metrics)        | yes        | e2e      | de-predicted on branch                          |
| OS       | Process states, Sync, Deadlocks, Memory, Page Replacement, Disk/FS      | —                                        | NO     | —          | —                 | —                    | —          | —        | NOT STARTED                                     |
| Networks | Packet Journey                                                          | /lesson/computer-networks/packet-journey | yes    | yes        | n/a               | n/a (process)        | yes        | e2e      | de-predicted on branch                          |
| Networks | Layering, Local delivery, DNS, TCP, IP/Subnetting, Routing, Reliability | —                                        | NO     | —          | —                 | —                    | —          | —        | NOT STARTED                                     |

## Route audit

| Route                                                                          | Loads | Visualizer | Code     | Controls | No lock              | No overlap | Mobile | Prod verified | Notes                           |
| ------------------------------------------------------------------------------ | ----- | ---------- | -------- | -------- | -------------------- | ---------- | ------ | ------------- | ------------------------------- |
| /lesson/dsa-1/sorting-arena                                                    | yes   | yes        | no panel | yes      | yes                  | yes        | yes    | no            | code panel TODO                 |
| /lesson/dsa-1/binary-search                                                    | yes   | yes        | yes      | yes      | yes                  | yes        | yes    | no            | e2e green                       |
| /lesson/dsa-2/graph-explorer                                                   | yes   | yes        | yes      | yes      | yes                  | yes        | yes    | no            | e2e green                       |
| /lesson/dbms/query-pipeline                                                    | yes   | yes        | SQL      | yes      | yes                  | yes        | yes    | no            | e2e green                       |
| /lesson/operating-systems/cpu-scheduling                                       | yes   | yes        | n/a      | yes      | yes                  | yes        | yes    | no            | e2e green                       |
| /lesson/computer-networks/packet-journey                                       | yes   | yes        | n/a      | yes      | yes                  | yes        | yes    | no            | e2e green                       |
| shell lessons (arrays/stack/queue/deque/hash-table/linked-list/bst/search-lab) | yes   | yes        | yes      | yes      | yes                  | yes        | yes    | no            | via LessonWorkspace             |
| /challenges                                                                    | yes   | n/a        | n/a      | n/a      | NO (prediction game) | —          | —      | no            | unlinked from nav; NEEDS REWORK |

## Shared architecture status

- **LessonWorkspace** `src/lib/components/lesson/LessonWorkspace.svelte` — stable. Consumers: all thin-
  wrapper lessons. Extension rule: pass `lesson`, `subject`, `completionId/Key/Keys`, `operationTitle/
Summary`, `controls` snippet, `visual` snippet, optional `about`. Do NOT add gating or mentor.
- **Trace types** `src/lib/trace/types.ts` — unchanged; `TraceStep.prediction` still exists in the type but
  is ignored by the shell/pages.
- **Playback** `TraceControls.svelte` — unchanged; exposes `Trace timeline` slider (used by e2e finishTrace).
- **Code panel** `CodePane.svelte` — unchanged.
- **State panel** `ExecutionEvidence.svelte` — used with `revealed={true}` always now.
- **Complexity** `ComplexityWhy.svelte` — unchanged.
- **mode.ts** `src/lib/lesson/mode.ts` — DEAD (no consumers). Safe to delete in a later cleanup.
- **AI** `AiMentor.svelte`, `src/lib/server/openai/*`, `PredictionCheckpoint.svelte`, `MistakeReplay.svelte`
  — no lesson consumers now. `tutor.ts` still has unit tests. Keep server openai code for future
  `/study-recap`; the lesson components can be deleted once /challenges is resolved.
- **Progress** `src/lib/progress/store.ts` — unchanged; still tracks predictions/boss for the Progress page.
- **Study Recap** — NOT built yet (required GPT-5.6 hackathon feature; see brief section 3).

## Removed or rejected functionality (do not restore)

- Prediction checkpoints in lessons — REMOVED from shell + 6 pages.
- Learn/Guided/Challenge modes — REMOVED (mode.ts code still present but unused; awaiting cleanup).
- Replay My Mistake in lessons — REMOVED.
- Lesson AI mentor / "Explain this step" — REMOVED.
- Prediction/lock gating of playback and reveals — REMOVED.
- Challenges in primary nav — REMOVED (route still exists, awaiting rework).

## Testing status

```
git diff --check:   clean
npm run check:      0 errors, 0 warnings (539 files)
npm run lint:       clean (prettier --check)
npx vitest run:     211 passed / 211 (21 files)
npm run build:      success (@sveltejs/adapter-vercel)
npx playwright test: 31 passed / 31
Production smoke:   NOT run (no deploy this session)
```

- Date run: 2026-07-21
- Commit tested: `3841a9b`
- Failing tests: none
- Pre-existing failures: none observed
- Production tested: no

## Git history for this session

| Commit  | Branch                           | Description                                   | Pushed | Merged | Production |
| ------- | -------------------------------- | --------------------------------------------- | ------ | ------ | ---------- |
| 6bbe854 | refactor/visualizer-first-rescue | rebuild visual-first LessonWorkspace          | no     | no     | no         |
| 029fab7 | refactor/visualizer-first-rescue | de-predict Sorting Arena                      | no     | no     | no         |
| 9e90187 | refactor/visualizer-first-rescue | de-predict binary search + graph explorer     | no     | no     | no         |
| a517868 | refactor/visualizer-first-rescue | de-predict SQL Query Pipeline                 | no     | no     | no         |
| a904678 | refactor/visualizer-first-rescue | de-predict CPU Scheduling                     | no     | no     | no         |
| c900327 | refactor/visualizer-first-rescue | de-predict Packet Journey                     | no     | no     | no         |
| 4865f5a | refactor/visualizer-first-rescue | remove Challenges from primary nav            | yes    | yes    | yes        |
| 3841a9b | refactor/visualizer-first-rescue | align e2e specs with visualizer-first product | yes    | yes    | yes        |
| 6d6506e | refactor/visualizer-first-rescue | add PROGRESS.md handoff                       | yes    | yes    | yes        |
| c903075 | refactor/visualizer-first-rescue | branch-rename doc update                      | yes    | yes    | yes        |
| 22654b9 | main                             | Merge PR #19                                  | yes    | —      | yes        |

(All eight Phase 0 code/test/doc commits are contained in PR #19 → merge `22654b9`.)

Recovery tag `replaycs-before-visualizer-rescue` at `c17f6f5` — pushed to origin.

## Deployment history

| Date       | Commit  | Environment | URL                                          | Health | Routes verified                    | Notes                                                             |
| ---------- | ------- | ----------- | -------------------------------------------- | ------ | ---------------------------------- | ----------------------------------------------------------------- |
| 2026-07-21 | 22654b9 | production  | replaycs.vercel.app → replaycs-lc8ho0oo2-... | Ready  | landing (title) + CI browser smoke | Live click-through of all 15 routes blocked in sandbox (approval) |

## Current blockers

_None blocking. One residual verification gap:_ a live human click-through of all 15 production routes was
not possible from this sandbox because the production domain gates the browser read/screenshot/drive tools
behind per-action approval and plain curl egress is blocked. Behavior was instead verified by the GitHub
Actions "browser smoke" Playwright run on the merged code and the local Playwright 31/31 run (which builds
and previews the production bundle, including 390px mobile checks). A human should do a final manual
click-through of the 15 routes in a browser.

## Immediate next actions

1. (DONE) Phase 0 pushed, PR #19 merged to `main` (`22654b9`), deployed to Vercel prod (`replaycs.vercel.app`).
   Remaining: human manual click-through of all 15 production routes (sandbox could not drive the live site).
2. Resolve `/challenges`: convert `src/routes/challenges/+page.svelte` into a non-guessing Scenario Gallery
   OR delete the route + `src/lib/challenges/arena.ts` + `e2e/challenge-arena.spec.ts`, and prune the boss/
   prediction section from `src/routes/progress/+page.svelte` and `e2e/progress-integrity.spec.ts`.
3. Add a synchronized four-language code panel to Sorting Arena: extend `src/lib/engines/dsa/sorting.ts` to
   emit `sourceLines` + `semanticOperationId` per step, then render a `CodePane` in the page.
4. Delete dead architecture once /challenges is resolved: `src/lib/lesson/mode.ts`,
   `PredictionCheckpoint.svelte`, `MistakeReplay.svelte`, `AiMentor.svelte` (keep server openai for recap).
5. Build the isolated `/study-recap` GPT-5.6 Revision Sheet Generator (brief section 3) with deterministic
   fallback; link it under Progress/About only.
6. Begin Phase 2 curriculum: Strings Lab and Recursion Lab on the LessonWorkspace shell (see
   `replaycs-engine-pattern` memory for the engine/visualizer/page recipe).

## Recommended next session prompt context

> Continue from branch `refactor/visualizer-first-rescue` at commit `3841a9b` (off `origin/main` `c17f6f5`). Phase 0
> product rescue is complete and locally green (check/lint/vitest 211/build/playwright 31): the shared
> `LessonWorkspace` shell and all six bespoke lesson pages (sorting, binary-search, graph-explorer,
> query-pipeline, cpu-scheduling, packet-journey) have had prediction, Learn/Guided/Challenge modes, gating,
> Replay My Mistake, and the AI mentor removed; Challenges is gone from the primary nav; e2e specs were
> rewritten to visual-first behavior. NOT yet pushed/merged/deployed. Next: push + merge + deploy + verify
> production, then resolve the `/challenges` route (convert to Scenario Gallery or remove with its boss
> arena + Progress-page section), add a four-language code panel to Sorting Arena (needs sorting-engine
> sourceLines), and start Strings/Recursion labs. Do NOT restore LearningMode, prediction checkpoints, the
> lesson mentor, or the mode tabs. See `replaycs-engine-pattern` memory for building new labs.

## Session-end checklist

- [x] Update all sections of PROGRESS.md
- [x] Record current branch and commit
- [x] Record uncommitted changes (none — tree clean)
- [x] Record pushed branches (none pushed)
- [x] Record merged pull requests (none)
- [x] Record test results
- [x] Record deployment status (none)
- [x] Record production verification (not done)
- [x] Record blockers
- [x] Record exact next action
- [x] Confirm no API key or .env committed
- [x] Confirm no Claude/Anthropic/AI co-author attribution added
- [ ] Commit and push updated PROGRESS.md (committed on branch; push pending maintainer review)
