# Architecture

SvelteKit routes render a shared application shell and subject dashboards. Typed content definitions select deterministic engines under `src/lib/engines`; engines emit serializable `TraceLesson`/`TraceStep` data. UI components consume this normalized model without knowing the algorithm. A selected step is the source of display state, so backward navigation restores snapshots instead of reversing animations.

Semantic operation IDs map the same step to C, C++, Java and Python source lines. Visual primitives render arrays today and can render tables, queues, graphs, processes and packets later. The SQL adapter returns named intermediate relations and explicitly teaches logical processing rather than claiming a physical optimizer plan.

Versioned learner progress is stored in local storage. Prediction IDs make XP idempotent. API keys and OpenAI clients live only in `src/lib/server`. `/api/ai/*` validates bounded request bodies; deterministic evaluation handles exact predictions. AI receives the already-computed trace, uses structured output, times out, retries once, and falls back without crashing. No user code or SQL is executed.

Unit tests cover engines and rewards; Svelte checks cover component contracts; Playwright owns critical journeys. Errors produce typed client responses and the route error page restores navigation. Deployment uses adapter-auto.
