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

Binary Search uses the normalized `TraceLesson`/`TraceStep` model with semantic operation IDs. C,
C++, Java, and Python source maps point to the same semantic step, so switching syntax does not reset
state. Newer domain engines keep the same deterministic snapshot/navigation principles while using
typed domain-specific tables, process states, graph frontiers, and network envelopes.

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

## Learner evidence

`src/lib/progress` stores a versioned profile in browser local storage: onboarding preferences, XP,
prediction attempts/accuracy, hearts, streak, completion, mastery, misconception evidence,
recoveries, recent activity, badges, and completed bosses. Evidence IDs make normal prediction/
recovery/lesson/boss rewards idempotent. Recommendations are deterministic rules, not model-scored
learner diagnoses.

There is intentionally no account or server learner database in the hackathon release.

## AI boundary

`src/lib/server/openai` reads server-only environment variables and calls the OpenAI Responses API.
`/api/ai/explain-step` validates a bounded trace context with Zod, applies a small in-memory limiter,
and returns structured GPT-5.6 output or a deterministic fallback. The panel identifies the source.
The model cannot mutate the lesson, decide the correct answer, or award progress. See
[openai-integration.md](openai-integration.md).

## Runtime and operations

SvelteKit uses `@sveltejs/adapter-vercel` with Node.js 22 so page rendering, `/api/ai/*`, and
`/api/health` remain server-capable in production. Feature branches are recoverable Git checkpoints;
Vercel Preview/Production deploy the same application boundary. Vitest, Svelte check, Prettier,
production build, and Playwright form the release gate encoded in `.github/workflows/ci.yml`.

Operational detail: [deployment.md](deployment.md), [recovery-guide.md](recovery-guide.md), and
[known-limitations.md](known-limitations.md).
