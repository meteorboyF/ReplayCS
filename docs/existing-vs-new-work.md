# Existing versus new work

ReplayCS is a new product built during this completion effort. It used selected educational
references from the user's Interview-Prep repository, but it did not import that repository's Git
history or present pre-existing study content as new product engineering.

## Before Build Week

Source: `https://github.com/meteorboyF/Interview-Prep.git` at
`f3e8c22534819ad3f7351e55fbd040f6de098356`.

The source contained:

- an Astro 5 study site with Svelte islands and interview-preparation navigation;
- DSA I/II Markdown notes, examples, complexity explanations, and misconceptions;
- DBMS Markdown guides covering SQL, joins, normalization, indexing, and transactions;
- a nested Svelte 5 + Vite + sql.js trainer with 13 categories, 26 lessons, 99 runnable examples,
  and a ten-table HR dataset;
- SQL-oriented ExplainPlan, simulated concurrency, normalization, result-table, and schema
  visualizers;
- browser progress helpers tied to the prior trainer.

It did **not** contain the ReplayCS product identity, SvelteKit application, unified trace schema,
snapshot player, prediction-first loop, per-line four-language mapping, Replay My Mistake, grounded
mentor UI, adaptive ReplayCS learner profile, OS/network trace engines, Challenge Arena, Judge Demo,
Vercel production setup, or ReplayCS test suite.

No license file was found in the audited source. This document records provenance; it is not proof of
ownership or permission for third-party redistribution.

## Built during Build Week

- ReplayCS branding, execution-laboratory interaction model, responsive application shell, routes,
  onboarding, subject maps, progress dashboard, and judge journey.
- Typed deterministic engines and serializable state histories for Binary Search; three sorting
  algorithms; BFS/DFS; SQL logical stages; five CPU scheduling policies; and Packet Journey.
- Prediction checkpoints, local scoring, trace controls, exact backward restoration, bounded custom
  input, visible mutations, and domain visualizations.
- Semantic C, C++, Java, and Python line mapping for Binary Search with state-preserving switching.
- Replay My Mistake comparison, first-divergence evidence, misconception tagging, recovery, and
  idempotent XP.
- Versioned browser-local preferences, XP, accuracy, hearts, mastery, activities, badges,
  misconception evidence, recommendations, exports, and challenge completion.
- A five-subject deterministic Challenge Arena and a guided Judge Demo that links real product
  interactions.
- Server-only OpenAI Responses API integration with bounded Zod schemas, GPT-5.6 grounding,
  English/Bangla explanation settings, timeout/retry behavior, in-memory limiting, and deterministic
  fallback.
- Vitest engine/progress/API tests, Playwright learner/mobile/production journeys, GitHub Actions,
  Vercel server deployment, safe health metadata, rollback/recovery procedures, and submission docs.

## Adaptation map

| Prior material                            | ReplayCS treatment                                            | New engineering                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Binary Search concepts in DSA notes       | Concepts referenced; implementation rewritten                 | Typed snapshots, predictions, validation, four-language semantic map, tests                                 |
| DSA topic taxonomy                        | Selected and reframed without interview branding              | ReplayCS subject maps, truthful live/planned states, interactive routes                                     |
| HR dataset/query patterns                 | Small representative fixture adapted                          | Deterministic intermediate relations, two scenarios, LEFT/INNER JOIN and NULL semantics, predictions, tests |
| ExplainPlan visualizer                    | Reference only; not copied                                    | Logical-versus-illustrative-physical teaching panel built for ReplayCS                                      |
| Concurrency and normalization visualizers | Audited and deferred; not copied                              | Future trace adapters remain roadmap work                                                                   |
| Results/schema components                 | Reference only because they were coupled to sql.js/store APIs | ReplayCS table/state presentation and engine boundary built separately                                      |
| Astro/SQL trainer navigation and branding | Rejected                                                      | New SvelteKit application shell and ReplayCS identity                                                       |
| SQL database binary/free-form sandbox     | Rejected                                                      | Bounded curated scenarios that execute no learner SQL                                                       |

## Deliberately excluded

Electronics material, career/interview question banks, Interview-Prep branding, generated `dist`,
dependency directories, DOCX files, the upstream database binary, free-form code/SQL execution, and
unlicensed third-party media were not migrated.

For file-level decisions, read [source-audit.md](source-audit.md) and
[migration-map.md](migration-map.md). For implementation evidence, read
[codex-collaboration.md](codex-collaboration.md) and inspect the timestamped ReplayCS commit history.
