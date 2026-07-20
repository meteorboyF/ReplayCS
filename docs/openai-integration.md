# OpenAI integration

ReplayCS uses GPT-5.6 as an optional grounded teaching layer. Deterministic engines—not the model—
generate execution state, score exact predictions, assign XP, and select recommendations.

## Request path and trust boundary

```text
lesson engine computes canonical state
              │
              ▼
UI builds bounded StepContext
              │ POST /api/ai/explain-step
              ▼
SvelteKit server validates with Zod
        ┌─────┴──────────────┐
        ▼                    ▼
OPENAI_API_KEY present   key absent / upstream failure
Responses API, GPT-5.6   deterministic fallback
        └─────┬──────────────┘
              ▼
structured AiStepExplanation rendered with source badge
```

The browser never receives `OPENAI_API_KEY` and no public-prefixed environment variable contains it.
`src/lib/server/openai/client.ts` owns the OpenAI client;
`src/lib/server/openai/tutor.ts` owns the grounded request and fallback; Zod schemas in
`src/lib/server/openai/schemas.ts` bound both context and response shape.

The model defaults to `gpt-5.6` and uses the Responses API with low reasoning effort, low text
verbosity, a structured format, a 700-output-token bound, a 12-second timeout, and one retry. The
model instruction treats the supplied deterministic trace as absolute truth and forbids invented
state or unexecuted operations.

## Grounding context

The shared mentor panels in every flagship lab can send:

- subject, lesson, and learning objective;
- active semantic source/operation lines;
- state before, recorded mutation, and state after;
- deterministic explanation;
- current prediction, learner answer, and correct deterministic answer;
- known misconception tags;
- selected programming language where relevant;
- learner level and explanation depth;
- English or Bangla explanation language;
- one scoped learner question of at most 300 characters.

The mentor supports `explain`, `why`, `hint`, `simplify`, and context-triggered `mistake`
interactions. It returns a summary, why the operation happened now, what changed/held stable, a
possible common mistake, grounding note, and check question. Technical terms and identifiers remain
intact in Bangla teaching text.

## Fallback and errors

If `OPENAI_API_KEY` is absent, `getOpenAI()` returns no client and the route immediately responds with
`source: "fallback"` and `reason: "not-configured"`. If the upstream call fails after timeout/retry,
the route responds with the same validated deterministic explanation and `reason: "upstream-error"`.
The UI labels the source as **Deterministic**, explains why fallback was used, and keeps the lesson
interactive.

The route rejects request bodies over 20 KB, rejects invalid trace context, omits stack traces, and
applies an in-memory 12-requests-per-minute client-address limit. The UI handles loading, retry, and
rate-limit states. That limiter is per server process and is not globally consistent across
serverless instances.

The other `/api/ai/*` routes are intentionally limited deterministic foundations. Challenge Arena
uses curated deterministic bosses; `/api/ai/generate-challenge` does not fabricate a challenge when
generation is unavailable.

## Configuration and verification

Local uncommitted `.env`:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

For Vercel, the project owner adds the variables separately to Preview and Production, then creates
new deployments. Never paste the key in chat, commit it, or place it in a shell command that will be
recorded in history.

Check safe availability at <https://replaycs.vercel.app/api/health>. The endpoint reveals only a
boolean `aiConfigured`, never the value. Verify both modes:

1. Without a key, open Binary Search at `?step=2`, choose **Explain this step**, and confirm the
   deterministic badge/message and grounded midpoint explanation.
2. With a key added by the owner, redeploy, confirm `aiConfigured: true`, request the same step, and
   confirm the **GPT-5.6** badge and structured trace-grounded response.
3. In both modes, submit a prediction before and after the request and confirm canonical state and
   scoring are unchanged.

## Current limitations

Responses are not token-streamed; there is no shared response cache, user cancellation, distributed
limiter, token/cost dashboard, or comprehensive model-quality fixture suite. Binary Search and SQL
have richer side-by-side mistake recovery than the other mentor-enabled labs. See
[known-limitations.md](known-limitations.md) for the full production boundary.

Official model guidance: <https://developers.openai.com/api/docs/guides/model-guidance?model=gpt-5.6>
