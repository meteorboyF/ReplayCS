# Devpost submission draft

## Project

- **Name:** ReplayCS
- **Tagline:** Predict what the computer will do next—then replay every state until it makes sense.
- **Track:** Education
- **Live app:** <https://replaycs.vercel.app>
- **Judge Demo:** <https://replaycs.vercel.app/judge-demo>
- **Repository:** <https://github.com/meteorboyF/ReplayCS>

## Inspiration

Computer science students often memorize the final array, query result, schedule, or protocol story
without building an execution model. A conventional visualizer can make that worse: press Play,
watch colored boxes move, and feel familiar with an answer that was never predicted.

ReplayCS began with a different question: what if the learner had to pause the computer and commit
to its next state? A mistake would then become useful evidence. The goal is not another answer
generator; it is deliberate practice for thinking like an execution engine.

## What it does

ReplayCS is a prediction-first execution laboratory spanning five computer science subjects:

- **DSA I:** Binary Search and a Bubble/Selection/Insertion Sorting Arena.
- **DSA II:** BFS, iterative DFS, and recursive DFS in Graph Explorer.
- **DBMS:** two curated HR scenarios across
  `FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`.
- **Operating Systems:** FCFS, SJF, SRTF, Priority, and Round Robin CPU scheduling.
- **Computer Networks:** cold and warm browser-to-server Packet Journeys.

Every shipped engine computes deterministic intermediate state. Learners move forward and backward,
inspect before/after mutations, and answer checkpoints before meaningful reveals. Binary Search and
SQL add **Replay My Mistake**: the product preserves the learner's predicted state, identifies the
first divergence, replays deterministic truth, tags a misconception, and offers a recovery check.

Onboarding stores level, goal, subject, programming-language, explanation-language, and daily-goal
preferences without an account. On return, the landing page replaces its onboarding action with the
same deterministic next lesson shown on Progress. Real activity updates browser-local XP, overall
and first-attempt accuracy, average attempts, hints used, language activity, hearts, recent rewards,
mastery, misconception evidence, badges, and recommendations.

The Challenge Arena ships five fixed two-checkpoint challenges: **Binary Bounds Boss**, **BFS
Frontier Boss**, **SQL Pipeline Boss**, **Round Robin Boss**, and **Packet Route Boss**. Each boss
awards 30 XP once. Retry remains available, while revealing an answer makes the run practice-only
until the learner starts a fresh unassisted attempt. Judge Demo links the cross-domain story using
stable presets and the real labs rather than demo-only state.

## How it was built

ReplayCS uses SvelteKit 2 and Svelte 5 with TypeScript. Each learning engine is a pure deterministic
module covered by Vitest. Serializable snapshots power playback; selecting an earlier snapshot
restores exact state instead of trying to reverse an animation. Semantic operation identifiers keep
Binary Search's C, C++, Java, and Python source mappings synchronized with one trace.

The UI is responsive hand-authored CSS with bounded, validated input. Versioned local storage holds
the learner profile and canonical evidence IDs. Lesson mastery is transparent: 50 points for trace
completion, 30 for a demonstrated correct prediction or recovery, and 20 for first-try/no-hint
evidence or fully recovering every recorded mistake. XP and completion remain idempotent.

Playwright tests critical browser journeys, including custom input, backward restoration,
keyboard-operated code tabs, cross-language preservation, mentor fallback, mistake recovery,
returning-learner recommendations, progress integrity, SQL, scheduling, packet tracing, all five
bosses, Judge Demo, and production smoke. GitHub Actions runs checks, formatting, unit tests,
production build, and Chromium E2E on pull requests and `main`.

The app is deployed to Vercel with the SvelteKit Vercel adapter and server routes. `/api/health`
returns safe deployment/AI availability metadata. Focused feature branches, pushed commits,
milestone tags, production smoke tests, and documented rollback keep every stable state recoverable.

## How GPT-5.6 is used

GPT-5.6 is an optional grounded tutor, never the execution engine. Every flagship lab constructs a
bounded step context containing the learning objective, active operation, state before, mutation,
state after, learner prediction, misconception tags, selected language where relevant, learner
level, and requested explanation depth/language. A SvelteKit server route validates the request and
calls the OpenAI Responses API with structured Zod output.

The mentor can explain, answer a scoped “why,” give a hint, simplify, or explain a recorded mistake
at beginner, standard, exam-ready, or technical depth in English or Bangla. Scoring and canonical
state remain local and deterministic. If no key is configured, model output fails schema validation,
a call times out, or the upstream request fails, the same UI labels and displays a deterministic
fallback rather than breaking the lesson. `/api/health` reports configuration status without
exposing a secret; at the 2026-07-20 audit, production truthfully reported `aiConfigured: false`.

## How Codex was used

Codex acted as an architecture and implementation collaborator. It audited the prior Interview-Prep
source at a pinned commit, separated reusable teaching references from excluded interview/product
code, created the normalized trace boundary, helped implement pure engines and Svelte routes, wrote
unit/E2E coverage, diagnosed integration issues, prepared Vercel operations, and produced recovery
and judge documentation.

The user set the product promise, required GPT-5.6, chose five-subject breadth, insisted that AI
never own execution truth, required immediate public deployment, and mandated focused recoverable
Git pushes. Commit history preserves the work rather than compressing it into an opaque final dump.
The exact session placeholder and evidence are documented in
[`docs/codex-collaboration.md`](codex-collaboration.md); no session ID has been fabricated.

## Challenges we ran into

- **One trace contract across domains:** an array comparison, SQL relation, scheduler tick, and
  packet event look different. We kept deterministic snapshots and navigation principles shared
  while allowing domain-specific state models and visual primitives.
- **AI trust:** a tutor can sound convincing while inventing a step. We made deterministic state
  immutable input to the mentor, used structured output, and built a visible no-key/upstream fallback.
- **Honest physical-world modeling:** SQL logical order is not an optimizer plan, and Packet Journey
  is not a packet capture. Both labs explicitly label educational assumptions and illustrative data.
- **Progress without accounts:** versioned local persistence and idempotent evidence make a useful
  hackathon learner loop while avoiding a rushed authentication/database system.
- **Shipping safely under time pressure:** feature branches, incremental pushes, full merge gates,
  health checks, production smoke tests, milestone tags, and rollback docs preserved working states.

## Accomplishments we are proud of

- The interaction is prediction-first rather than autoplay-first.
- Replay My Mistake converts a wrong state into a visible, finishable recovery trace.
- The same learning architecture works across algorithms, relational data, scheduling, and networks.
- Binary Search stays on the same semantic operation while switching among four languages.
- GPT-5.6 is useful without being trusted as the source of execution truth.
- Every advertised subject has at least one real tested interactive lab.
- Mastery, first attempts, hints, language choices, recent rewards, and boss progress are inspectable
  evidence rather than a hidden model score.
- Returning learners get a real recommended lesson instead of being sent through onboarding again.
- The public product remains useful with no account and no OpenAI key.

## What we learned

Snapshots are more valuable than animation histories: they make rewind, URL state, testing, and AI
grounding all simpler. Prediction quality is also a stronger mastery signal than time-on-page. Most
importantly, graceful AI absence is a product feature. A tutoring interface earns trust when it says
which source produced an explanation and preserves the core lesson when the model is unavailable.

## What is next

The roadmap deepens each subject instead of pretending every curriculum card is already complete:
linked structures and trees; normalization, index plans, and transaction anomalies; page
replacement and deadlock; TCP reliability and subnetting. We also want the full visual mistake-
recovery component in every flagship lab, side-by-side language comparison, shared distributed rate
limiting/caching, cloud progress sync, broader browser and automated accessibility coverage, and
more recovery-driven challenges.

## Testing instructions

1. Open the [Judge Demo](https://replaycs.vercel.app/judge-demo) in a fresh browser; no sign-in is
   needed.
2. In Binary Search, deliberately predict midpoint `4` where the deterministic answer is `3`, then
   replay and recover with `3`.
3. Switch from Python to C++ and back without leaving the step, then invoke the mentor. A GPT-5.6 or
   explicitly labeled deterministic response is valid depending on `/api/health`.
4. In SQL, select `HAVING`; in Round Robin, predict `P1`; in Packet Journey, compare cold and warm
   cache paths.
5. In Binary Bounds Boss, answer `low = 4, high = 6` and then `31 at index 5`; confirm the one-time
   clear. The Arena map should also list BFS Frontier, SQL Pipeline, Round Robin, and Packet Route.
6. Inspect `/progress` for first-attempt/attempt metrics, hints, language activity, recent activity,
   `1/5` boss progress, mastery, misconceptions, and a live recommendation. Return home after
   onboarding and confirm **Continue · [lesson]** reaches that recommended route.

Exact expected states, local verification commands, supported fallback behavior, and troubleshooting
are in the [judge testing guide](judge-testing-guide.md). Known boundaries are documented in
[known limitations](known-limitations.md).
