# R▶ ReplayCS

> **Pause computer science. Trace every state. Understand what actually happens.**

ReplayCS is an execution laboratory for learning to think like a computer. Learners predict the next line or state, reveal a deterministic mutation, inspect what changed, and ask an optional AI mentor _why_. AI explains trace truth; it never invents execution truth.

## MVP features

- Binary search with exact forward/backward state, active lines, range visualization, predictions, and C/C++/Java/Python tabs
- A compound SQL logical pipeline: FROM → JOIN → WHERE → GROUP BY → SELECT/aggregate → ORDER BY → LIMIT
- Subject maps for DSA I, DSA II, DBMS, Operating Systems, and Computer Networks
- XP, streak, one badge, completion, idempotent rewards, and versioned local persistence
- Server-only OpenAI Responses API integration with structured validation and deterministic fallback
- Responsive, keyboard-focused, reduced-motion-friendly execution-lab interface

## Architecture

```text
Curated lesson → deterministic engine → serializable TraceStep snapshots
                                             │
                         semantic source map ─┼─ visual primitives
                                             ├─ prediction + progress
                                             └─ grounded AI explanation (optional)
```

Trace generation, playback/rendering, subject content, AI, and progress are separate modules. Selecting a prior snapshot restores exact earlier state. See [architecture](docs/architecture.md), [product spec](docs/product-spec.md), and [build plan](docs/build-plan.md).

## Local setup

Requires a current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

Add your OpenAI API key to `.env` as `OPENAI_API_KEY`. Do not commit the file. AI is optional; every lesson works with deterministic explanations without a key.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
```

## Verification

```bash
npm run check
npm run lint
npm run test
npx playwright install chromium # once
npm run test:e2e
npm run build
```

Adapter-auto selects a deployment adapter for common SvelteKit hosts. For a fixed platform, install its official adapter and update `svelte.config.js`.

## Three-minute demo

1. Open Binary Search, predict `mid`, reveal state, move backward, then switch C++ → Python without resetting.
2. Open SQL Pipeline and walk the intermediate relations through JOIN, filter, grouping, aggregation and sorting.
3. Show XP persistence and the DSA/DBMS/OS/networks roadmap.

## Existing-work disclosure

ReplayCS is a new product. Interview-Prep commit `f3e8c22534819ad3f7351e55fbd040f6de098356` supplied selected educational references and an HR dataset concept. The deterministic engine, multi-language manual trace, player, product UI, SQL stage engine, AI boundary, progress system and tests are new. See the [source audit](docs/source-audit.md), [migration map](docs/migration-map.md), and [Devpost notes](docs/devpost-submission-notes.md).

## Security and privacy

The API key is server-side and ignored by Git. Inputs are validated and bounded; user code and SQL are never executed. Exact answers are evaluated locally. Avoid placing private information in learner explanations. The MVP stores only learning progress in local browser storage.

## Limitations and roadmap

The current deep lessons are binary search and a SQL logical pipeline. Bubble sort, BFS, DBMS physical plans, and connected mentor UI are next. Arbitrary code execution, user accounts, complete OS/networks curricula and distributed production rate limiting are intentionally out of scope.

Screenshot/GIF placeholders: landing trace preview, binary-search checkpoint, and SQL pipeline.

## License

No license has yet been selected. The audited Interview-Prep source also contains no license file; provenance is documented and redistribution rights should be clarified before public reuse.
