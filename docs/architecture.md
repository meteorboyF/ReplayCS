# ReplayCS architecture

ReplayCS separates deterministic execution truth, UI playback, learner evidence, and optional AI
wording. This lets the product use GPT-5.6 without asking a probabilistic model to invent an array,
relation, Gantt chart, or packet order.

## System map

```text
curated scenario / bounded learner input
                    │
                    ▼
          pure deterministic engine
                    │
                    ▼
       serializable snapshots / events
          │            │            │
          ▼            ▼            ▼
   source mapping   visual state   controls
          └────────────┬────────────┘
                       ▼
             local prediction scoring
                       │
              ┌────────┴─────────┐
              ▼                  ▼
      versioned progress   bounded StepContext
      mastery/recovery     POST /api/ai/*
                                  │
                         GPT-5.6 or fallback
```

## Deterministic engines

Pure TypeScript modules under `src/lib/engines` accept validated inputs and return complete state
histories. Current engines cover Binary Search; Bubble, Selection, and Insertion Sort; BFS and DFS;
SQL logical stages; FCFS, SJF, SRTF, Priority, and Round Robin scheduling; and cold/warm Packet
Journey events. Vitest asserts intermediate and final truth independent of Svelte rendering.

Binary Search and Graph Explorer use the normalized `TraceLesson`/`TraceStep` model with semantic
operation IDs. Their C, C++, Java, and Python source maps point to the same semantic operation, so
switching syntax does not reset state. The other domain engines keep the same deterministic
snapshot/navigation principles while using typed relations, process states, and network envelopes.

Selecting an earlier snapshot restores it directly. Playback never attempts to infer a previous
state by running an animation backward.

## Presentation and routes

SvelteKit routes own scenario selection, input validation, playback position, prediction gating,
completion, and URL state. Shared components provide TraceControls, PredictionCheckpoint, code
mapping, AI mentor, and Replay My Mistake; domain components render arrays, graph frontier, SQL
relations, Gantt/process tables, and packet/layer/address state.

All learner input is bounded. ReplayCS does not execute submitted code or SQL. SQL's logical model
and illustrative physical plan are labeled separately; Packet Journey uses reserved/illustrative
addresses and an explicit simplification notice.

Challenge Arena evaluates five curated, two-checkpoint boss traces locally. A reveal marks the whole
run as guided practice, so that run cannot clear the boss or award XP. Judge Demo is a separately
persisted tour checklist that deep-links to real labs; checking a tour stop neither claims the linked
interaction happened nor awards learning progress.

## Learner evidence

`src/lib/progress` stores a versioned profile in browser local storage: onboarding preferences, XP,
prediction attempts and first-attempt evidence, hearts, streak, completion, misconception evidence,
recoveries, hint requests, code-language interactions, recent XP activity, badges, completed bosses,
and derived lesson mastery. Evidence IDs make prediction, recovery, lesson, and boss rewards
idempotent. Recommendations are deterministic rules over live lessons, learner interests,
completion, and unresolved mistake evidence—not model-scored diagnoses.

Mastery uses an inspectable 50/30/20 rule: trace completion contributes 50 points; a correct
prediction or recovery contributes 30; and either an unhinted first-try success with no unresolved
mistake or full recovery contributes 20. Later recovery can raise mastery without awarding lesson XP
again, although the idempotent recovery itself can award 6 XP. A cleared Challenge Arena boss records
100 mastery for that boss.

There is intentionally no account or server learner database in the hackathon release.

## AI boundary

`src/lib/server/openai` reads server-only environment variables and calls the OpenAI Responses API.
`/api/ai/explain-step` validates a bounded trace context with Zod, applies a small in-memory limiter,
and returns structured GPT-5.6 output or a deterministic fallback for a missing key, upstream error,
or invalid structured output. The panel identifies the source. The model cannot mutate the lesson,
decide the correct answer, or award progress. See [openai-integration.md](openai-integration.md).

## Runtime and operations

SvelteKit uses `@sveltejs/adapter-vercel` with Node.js 22 so page rendering, `/api/ai/*`, and
`/api/health` remain server-capable in production. Feature branches are recoverable Git checkpoints;
Vercel Preview/Production deploy the same application boundary. Vitest, Svelte check, Prettier,
production build, and Playwright form the release gate encoded in `.github/workflows/ci.yml`.

Operational detail: [deployment.md](deployment.md), [recovery-guide.md](recovery-guide.md), and
[known-limitations.md](known-limitations.md).
