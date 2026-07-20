# Interview-Prep source audit

## Repository identity

- Upstream: `https://github.com/meteorboyF/Interview-Prep.git`
- Audited clone: `/tmp/interview-prep-upstream-audit` (read-only temporary clone)
- Local SQL trainer copy found at `../interview_prep`; it has no `.git` metadata.
- Source commit: `f3e8c22534819ad3f7351e55fbd040f6de098356`
- ReplayCS upstream was empty on 2026-07-20, so there is no initial commit SHA.
- License: no license file found. Content is not assumed redistributable outside the repository owner's project; provenance is retained here.

## Framework and tooling

The root is Astro 5.6 with Svelte 5 islands, JavaScript ingestion scripts, and npm. The nested `sql-trainer/` is a Svelte 5 + TypeScript + Vite 6 SPA using `sql.js`. It has database validation and 99 lesson-query checks, but no Vitest, Playwright, SvelteKit, API layer, or shared trace schema. State is component-local plus small browser progress utilities. CSS is hand-authored global/component CSS.

## DSA 1

Files: `DSA 1/DSA1_Linked_Lists.md`, `DSA1_Sorting_Searching.md`, `DSA1_Stack_Queue_Graphs.md`, and `DSA1_Trees_and_Sets.md`. Useful material includes algorithms, examples, complexity explanations, and misconceptions. The generated Astro pages use prose, flashcards, code highlighting and iframe-style visual embeds; deterministic visualizer logic suitable for migration was not found.

## DSA 2

Files: `DSA 2/DSA2_Divide_and_Conquer.md`, `DSA2_Dynamic_Programming.md`, `DSA2_Greedy_Algorithms.md`, `DSA2_KMP_and_TSP.md`, `DSA2_Review_Basics.md`, the interview notebook, and complexity reference. The content is useful as lesson-authoring reference. Interview-question framing and rote-answer sections are excluded.

## DBMS

Six root Markdown guides cover modeling, normalization, SQL, joins/CTEs, indexing, and transactions. The nested trainer has 13 categories, 26 lessons, 99 runnable examples, a canonical ten-table HR dataset, and three meaningful visualizers: `ExplainPlan.svelte`, `ConcurrencySim.svelte`, and `NormalizationViz.svelte`. Other reusable UI includes results tables, schema relationships, and lesson/query panels.

## Accuracy, bugs, and debt

- The SQL trainer explicitly separates simulated two-session concurrency from actual single-connection SQLite behavior—an accurate and valuable teaching constraint.
- Visualizer state is embedded in UI components and cannot replay through a normalized trace.
- SQL content mixes SQLite execution with MySQL teaching metadata; ReplayCS must label logical versus physical execution clearly.
- Root and nested applications duplicate Svelte configuration and branding.
- The local `../interview_prep` copy is only the nested trainer and cannot establish source provenance by itself.
- No DSA algorithm unit tests or reusable DSA visualizers exist upstream.
- No source license is present.

## Material rejected

Electronics content/assets, interview questions, interview-preparation branding, flashcard/career positioning, old header/sidebar/navigation, generated `dist`, dependencies, DOCX files, the complete database binary, free-form SQL sandbox, and global styles are not migrated.

## Source behavior verification

The local SQL trainer already contained installed dependencies and a built `dist`. Static inspection confirmed its build pipeline and safety model. ReplayCS does not modify either source copy. See `migration-map.md` for item decisions.
