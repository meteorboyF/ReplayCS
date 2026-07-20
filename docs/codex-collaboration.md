# Codex collaboration record

This document records how Codex contributed to ReplayCS without claiming that an AI session replaced
user product ownership. Repository history, source-audit documents, tests, and deployments are the
primary evidence. No Codex session identifier has been invented.

```dotenv
CODEX_SESSION_ID=ADD_FROM_CODEX_FEEDBACK_COMMAND
```

Before submission, the user should run `/feedback` in the relevant Codex session, copy the session
identifier it provides, and replace only the placeholder value above. Do not paste an API key,
access token, or unrelated credential.

## User-directed product decisions

The user supplied or explicitly required:

- the ReplayCS promise: teach learners to predict what the computer will do next;
- five-subject scope spanning DSA I, DSA II, DBMS, Operating Systems, and Networks;
- GPT-5.6 as a grounded tutor while deterministic engines retain trace/scoring authority;
- Replay My Mistake, adaptive progress, challenges, and an under-three-minute Judge Demo;
- immediate public deployment rather than waiting for every feature;
- truthful fallback behavior with no OpenAI key;
- focused branches, incremental verified commits, immediate remote pushes, and no rewritten history;
- judge-facing provenance, limitations, testing, deployment, and recovery documentation.

These constraints shaped implementation priorities and acceptance tests. The user retained final
control of product scope, credentials, deployment ownership, merges, and release approval.

Two explicit user course corrections are preserved in the working record: deploy a stable baseline
before waiting for the full curriculum, and keep pushing every verified incremental checkpoint to
the remote so a failure could be recovered. Those directions changed delivery order and made Git/
Vercel recovery evidence a first-class part of the product sprint.

The available repository history does not record a named Codex proposal that the user explicitly
rejected. This record therefore does not fabricate one. If the submission needs that narrative, add
only a specific decision that can be verified from the actual conversation or commit history.

## Source Codex audited

Codex audited `meteorboyF/Interview-Prep` at commit
`f3e8c22534819ad3f7351e55fbd040f6de098356` and a local SQL trainer copy. The audit covered:

- Astro/Svelte project structure and generated study-site material;
- DSA I/II Markdown references;
- DBMS guides, HR dataset concepts, and the nested Svelte/sql.js trainer;
- the existing ExplainPlan, ConcurrencySim, NormalizationViz, and table/schema components;
- build output, duplicate configuration, safety model, and absence of a source license.

The findings and exclusions are in [source-audit.md](source-audit.md) and
[migration-map.md](migration-map.md).

## What was adapted, migrated, or rejected

- DSA and DBMS teaching references informed lesson authoring, but the deterministic engines and
  source mappings were rewritten as typed ReplayCS modules.
- A small representative HR domain and query patterns were adapted into curated in-memory SQL
  scenarios. ReplayCS does not ship the upstream database binary or free-form SQL sandbox.
- Existing ExplainPlan, concurrency, normalization, result-table, and schema components were audited
  as references; none was copied wholesale into the current product.
- Interview branding/navigation, career material, electronics content, generated build output,
  dependencies, DOCX files, and interview-question framing were deliberately excluded.

## Architecture and systems Codex helped create

Codex collaborated on:

- the SvelteKit application shell and subject/lesson information architecture;
- deterministic, serializable trace snapshots and forward/backward playback;
- semantic cross-language source mapping for Binary Search and Graph Explorer;
- the versioned Operation Complexity model, safe growth evaluator, 15-family reference, shared
  explorer, and case-matched exact work evidence for iterative Binary Search;
- bounded input validation and domain-specific engines for sorting, traversal, SQL, scheduling, and
  packet journeys;
- local deterministic scoring, versioned progress, mastery, misconception evidence, idempotent XP,
  onboarding, returning-learner routing, first-attempt/attempt metrics, hint and language evidence,
  recent activity, boss progress, and recommendations;
- the server-only OpenAI Responses API boundary, Zod structured response, timeout/retry/fallback,
  and safe health metadata;
- Replay My Mistake and deterministic recovery challenges;
- the five-boss Challenge Arena (Binary Bounds, BFS Frontier, SQL Pipeline, Round Robin, and Packet
  Route) and Judge Demo integration around real labs;
- Vercel deployment, production smoke checks, milestone/recovery strategy, and GitHub Actions;
- architecture, provenance, operational, testing, demo, and submission documentation.

Execution truth, UI rendering, learner evidence, and optional AI wording remain separate boundaries.
That separation is documented in [architecture.md](architecture.md) and
[openai-integration.md](openai-integration.md).

## Tests Codex helped generate

The test suite includes deterministic unit coverage for:

- Binary Search found/not-found traces, mappings, validation, and progress rewards;
- Bubble, Selection, and Insertion Sort operations;
- BFS and DFS traversal orders and graph validation;
- SQL source rows, joins, NULL preservation, grouping, filtering, ordering, and limits;
- FCFS, SJF, SRTF, Priority, and Round Robin scheduling metrics/tie behavior;
- cold/warm Packet Journey order and addressing assumptions;
- complexity catalog validation, bounded growth evaluation, and dynamic-array amortized accounting;
- health metadata and AI fallback contracts.

Playwright journeys cover onboarding and the returning CTA, custom input, reverse restoration,
keyboard code tabs, language preservation, mentor fallback and hint persistence, Replay My Mistake
recovery, evidence-derived Progress panels, SQL, scheduling, packet tracing, five-boss challenges,
Judge Demo, mobile flagship smoke, and production health. The exact current count should be taken
from the final CI run rather than hard-coded here. The complexity foundation adds a focused browser
journey for case-matched visual/source work, honest omission of unsupported modes, mobile overflow,
and serious/critical axe findings.

## Recoverable evidence

ReplayCS kept work visible as focused commits and merge milestones instead of squashing it into one
submission commit. Representative published checkpoints include:

| Evidence                                     | Commit or tag                  |
| -------------------------------------------- | ------------------------------ |
| Source audit and migration record            | `57a8a52`                      |
| Unified trace engine and Binary Search       | `721420c`                      |
| Server-side OpenAI tutoring foundation       | `c56d092`                      |
| Connected mentor and Replay My Mistake merge | `00271b5`                      |
| Onboarding and adaptive profile merge        | `03dfd6b`                      |
| Tested DSA curriculum milestone              | `replaycs-dsa-curriculum`      |
| Verified production baseline                 | `replaycs-production-baseline` |
| Tested OS curriculum milestone               | `replaycs-os-curriculum`       |
| Tested Networks curriculum milestone         | `replaycs-networks-curriculum` |
| Tested DBMS curriculum milestone             | `replaycs-dbms-curriculum`     |
| Guided Judge Demo release                    | `replaycs-judge-demo`          |
| Five-boss Challenge Arena release            | `replaycs-challenge-arena`     |
| Operation-complexity data model              | `cdd63d4`                      |
| Operation Complexity explorer foundation     | `28d4f6b`                      |

Inspect author and committer timestamps with:

```bash
git log --reverse --format='%h %aI %cI %s'
git show --stat [commit-or-tag]
git tag --list 'replaycs-*'
```

The recovery policy in [recovery-guide.md](recovery-guide.md) protects this evidence: feature
changes are reverted with new commits, never hidden by force-pushing or moving published tags.

## Human verification still required

Codex output was checked with Svelte/TypeScript validation, formatting, deterministic tests,
production builds, Playwright, and production smoke tests. The user should still complete the final
Judge Demo rehearsal, verify GPT-5.6 after personally adding the production key if desired, confirm
GitHub Actions is green, review all submission claims, confirm source ownership/redistribution
rights, insert the real feedback session ID, and approve the release tag.
