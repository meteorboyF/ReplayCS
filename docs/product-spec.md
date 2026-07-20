# Product specification

## Promise and audience

ReplayCS teaches undergraduate and self-directed computer science learners to predict what a
computer will do next. It targets the gap between recognizing a solution after reveal and carrying a
correct execution model before reveal.

The product loop is:

```text
inspect → predict → reveal deterministic state → compare → recover/explain → record evidence → retry
```

## Launch experience

- No account is required; first visit may configure level, goal, preferred code/explanation
  language, subject interests, and daily goal or skip to safe defaults.
- The learner opens a curated scenario or validated bounded input.
- A meaningful checkpoint gates reveal until a prediction is locked.
- Forward, backward, play, timeline, and restart operate on exact state histories.
- Deterministic feedback identifies the correct state. Binary Search and SQL can preserve the wrong
  state and run Replay My Mistake recovery.
- GPT-5.6 may explain a supplied trace in English/Bangla at four depths; fallback keeps the same
  interface usable without a key.
- Real evidence updates versioned local XP, accuracy, mastery, misconceptions, activities, badges,
  bosses, and deterministic recommendations.

## Shipped curriculum

- DSA I: Binary Search and Sorting Arena.
- DSA II: Graph Explorer with BFS and two DFS modes.
- DBMS: two-scenario SQL Query Pipeline with logical/physical distinction.
- Operating Systems: five-policy CPU Scheduling Arena.
- Computer Networks: cold/warm Packet Journey.
- Cross-subject: one deterministic two-checkpoint Challenge Arena boss per subject.

Only Binary Search claims C/C++/Java/Python semantic source mapping. Planned cards remain visibly
planned and are not included in shipped-functionality counts.

## Completion and rewards

XP is awarded from idempotent evidence IDs. A correct unique prediction, successful mistake
recovery, completed supported lesson, or first completion of a boss may reward progress. Merely
visiting Judge Demo or replaying a completed boss does not. Recommendations use deterministic profile
rules; GPT-5.6 does not compute mastery or decide unlocks.

## Judge experience

`/judge-demo` is a five-stop, approximately 2:50 checklist using stable real links: Binary Search
recovery/language/mentor; SQL HAVING; Round Robin; Packet Journey; and Progress. It bypasses long
onboarding, persists tour position locally, works without a key, and clearly distinguishes model and
fallback sources.

## Non-functional requirements

- Server secrets never enter browser code.
- Canonical trace state is serializable, deterministic, and engine-tested.
- Invalid input is bounded and explained without executing arbitrary code/SQL.
- Core routes are responsive, keyboard-usable, and reduced-motion friendly.
- Main remains deployable; focused feature commits are pushed and recoverable.
- PR/main CI runs check, formatting, unit, build, and Chromium browser journeys.
- Production exposes safe uncached health metadata and documented rollback.

## Intentional exclusions

Arbitrary code or SQL execution, user accounts/cloud sync, complete topic coverage, multi-user
classes, leaderboards, distributed rate limiting/caching, production DB optimizer capture, packet
capture, and AI-generated execution truth are outside the hackathon release. Full boundaries are in
[known-limitations.md](known-limitations.md).
