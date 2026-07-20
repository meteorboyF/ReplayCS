# Operation-case coverage

Coverage snapshot: 2026-07-20

The currently executable Operation Complexity Explorer interfaces cover Binary Search and
dynamic-array append. Here, executable means the case, derivation, growth, space, and challenge UI
responds to learner input; only Binary Search also has a connected deterministic trace. The broader
catalog of 15 families is reference coverage, and nine single-input families are available in the
shared growth chart. Those numbers do not mean that every ReplayCS lesson has operation-level
complexity instrumentation.

## Coverage levels

- **Family reference:** formula, scenarios, assumptions, and derivation are authored.
- **Interactive explorer:** implementation variants and named cases can be compared and challenged.
- **Deterministic trace:** real visual/source trace snapshots are connected to the explorer.
- **Step evidence:** exact primitive and space counts are attached to individual trace steps.

## Current matrix

| Area                         | Cases / reference                  | Interactive explorer | Deterministic trace | Step evidence  | Honest status                                                          |
| ---------------------------- | ---------------------------------- | -------------------- | ------------------- | -------------- | ---------------------------------------------------------------------- |
| Growth-family catalog        | All 15 families                    | 9 chartable curves   | Not applicable      | Not applicable | Reference/chart coverage                                               |
| Binary Search                | 4 cases across 2 variants          | Yes                  | 3 iterative cases   | Yes, 3 cases   | Case-matched visual/source traces carry exact step and cumulative work |
| Dynamic-array append         | 3 cases across 3 sequence states   | Yes                  | Not yet             | Not yet        | Case, derivation, growth, space, and challenge modes are interactive   |
| Sorting Arena                | No operation definitions yet       | No                   | Existing lab only   | No             | Shipped trace lab; expansion contract incomplete                       |
| Graph Explorer               | No operation definitions yet       | No                   | Existing lab only   | No             | Shipped trace lab; expansion contract incomplete                       |
| SQL Query Pipeline           | No operation definitions yet       | No                   | Existing lab only   | No             | Shipped trace lab; expansion contract incomplete                       |
| CPU Scheduling Arena         | No operation definitions yet       | No                   | Existing lab only   | No             | Shipped trace lab; expansion contract incomplete                       |
| Packet Journey               | No operation definitions yet       | No                   | Existing lab only   | No             | Shipped trace lab; expansion contract incomplete                       |
| Incomplete curriculum topics | No completed public operation labs | No                   | No                  | No             | Kept in internal metadata/docs and hidden from public lesson nav       |

“Existing lab only” means that a shipped deterministic ReplayCS lesson has its own working trace;
it does not yet expose that trace through the shared complexity explorer.

## Authored case inventory

| Operation            | Case / implementation         | Time             | Auxiliary space | Counting model / bound                                       |
| -------------------- | ----------------------------- | ---------------- | --------------- | ------------------------------------------------------------ |
| Binary Search        | First midpoint / iterative    | `O(1)` best      | `O(1)`          | 1 midpoint comparison                                        |
| Binary Search        | Typical target / iterative    | `O(log n)` avg.  | `O(1)`          | Position-dependent, bounded by `ceil(log2(n + 1))`           |
| Binary Search        | Last decision / iterative     | `O(log n)` worst | `O(1)`          | At most `ceil(log2(n + 1))` midpoint comparisons             |
| Binary Search        | Call stack / recursive        | `O(log n)` worst | `O(log n)`      | 1 stack frame per halving level                              |
| Dynamic-array append | Spare capacity                | `O(1)` best      | `O(1)`          | 1 element write                                              |
| Dynamic-array append | Resize event                  | `O(n)` worst     | `O(n)`          | `n` copies + 1 append                                        |
| Dynamic-array append | Geometric sequence of appends | amortized `O(1)` | `O(n)`          | Fewer than `3n` aggregate writes/copies with doubling growth |

Average-case and amortized claims are deliberately separate: Binary Search's average case assumes
a distribution over target positions, while dynamic-array amortization bounds total work across a
sequence without a probability assumption.

## Not claimed in this foundation

- The growth chart is not a wall-clock benchmark.
- A family reference card is not an executable lesson.
- The recursive Binary Search space case has no trace; ReplayCS does not present the iterative engine as recursive.
- Dynamic-array append does not yet provide fabricated visual states or source-line replay.
- Sorting, Graph, SQL, CPU, and Packet labs do not yet claim shared operation-case coverage.
- Linked structures, trees/heaps/DP, normalization/index/transactions, page replacement/deadlock,
  and deeper network topics remain incomplete and hidden from primary public lesson navigation.

An operation should move to full coverage only after its engine emits exact deterministic evidence,
all meaningful cases and implementation variants are authored, time and space derivations are
reviewed, and unit plus browser tests cover the public path.
