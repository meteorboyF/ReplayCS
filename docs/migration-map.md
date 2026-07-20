# Migration map

Source repository for every item: [`meteorboyF/Interview-Prep`](https://github.com/meteorboyF/Interview-Prep)
at commit [`f3e8c22534819ad3f7351e55fbd040f6de098356`](https://github.com/meteorboyF/Interview-Prep/tree/f3e8c22534819ad3f7351e55fbd040f6de098356).
That SHA belongs to the source repository and is not expected to resolve in the ReplayCS Git object
database. It is provenance, not a ReplayCS recovery point; use the published `replaycs-*` tags in
the [recovery guide](recovery-guide.md) for restoration.

All shipped engine and UI code was rewritten for ReplayCS's typed deterministic trace model. The
source repository had no license file at audit time, so this map records conceptual adaptation and
explicit rejection rather than claiming copied components or general redistribution rights.

| Source item                           | Source path                                                                               | ReplayCS destination                    | Decision                           | Required changes                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| Binary-search lesson material         | `DSA 1/DSA1_Sorting_Searching.md`                                                         | `src/lib/engines/dsa/binarySearch.ts`   | Adapt concepts; rewrite code       | New typed deterministic trace, predictions, tests, and four-language semantic map |
| DSA topic taxonomy                    | `DSA 1/*.md`, `DSA 2/*.md`                                                                | `src/lib/content/subjects.ts`           | Selective adaptation               | Remove interview framing; present product roadmap honestly                        |
| HR dataset/query patterns             | `sql-trainer/data/*`, lessons in `sql-trainer/src/lib/lessons/`                           | `src/lib/engines/dbms/queryPipeline.ts` | Adapt small representative fixture | Keep one consistent HR domain; deterministic in-memory stages                     |
| Explain-plan visualizer               | `sql-trainer/src/lib/components/ExplainPlan.svelte`                                       | SQL logical/physical teaching panel     | Reference concept; do not copy     | Build a new illustrative plan and explicitly disclaim optimizer output            |
| Concurrency simulator                 | `sql-trainer/src/lib/components/ConcurrencySim.svelte`                                    | Future DBMS transaction lesson          | Defer/refactor                     | Convert timeline to lock/process trace steps                                      |
| Normalization visualizer              | `sql-trainer/src/lib/components/NormalizationViz.svelte`                                  | Future normalization lesson             | Defer/refactor                     | Separate facts from UI and use table entities                                     |
| Results/schema components             | `sql-trainer/src/lib/components/{ResultsTable,RelationshipDiagram,SchemaExplorer}.svelte` | Future visual primitives                | Reference only                     | Existing components are coupled to sql.js/store APIs                              |
| Interview dashboard/navigation        | root Astro pages and SQL `App.svelte`                                                     | Not migrated                            | Reject                             | ReplayCS has new information architecture and branding                            |
| Electronics/career/interview material | `Electronics/`, `questions.astro`, notebook question banks                                | Not migrated                            | Reject                             | Outside product scope                                                             |
| SQL binaries/build pipeline           | `sql-trainer/public/*.sqlite`, scripts                                                    | Not migrated                            | Reject for launch                  | Curated lessons are safer and smaller as validated fixture data                   |

## Migration invariants

- Source material can guide lesson concepts, examples, and misconception selection; it cannot be
  treated as tested ReplayCS engine code.
- Every migrated behavior must have a deterministic state transition and repository-owned tests.
- Logical SQL teaching stages must remain labeled as illustrative semantics, not captured optimizer
  output.
- Interview, career, electronics, generated build output, database binaries, and source navigation
  stay outside ReplayCS unless a later reviewed migration explicitly changes this map.
- A future migration records its source path, exact source commit, destination, licensing decision,
  rewrite boundary, and verification before release.
