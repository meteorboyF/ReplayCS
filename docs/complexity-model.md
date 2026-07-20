# Operation complexity model

Status: foundation model v1, 2026-07-20

ReplayCS treats complexity as a claim about counted work under explicit assumptions. It does not
infer Big O from elapsed time, and the chart's vertical values are representative operation counts,
not milliseconds.

## Analysis contract

Every authored operation case records:

1. the input dimensions (`n`, `m`, `V`, `E`, or output size `k`);
2. the implementation variant and best, average, worst, expected, or amortized case;
3. the primitive work being counted, such as comparisons, reads, writes, calls, or edge visits;
4. an exact scenario count or a clearly labeled upper bound before asymptotic simplification;
5. time and auxiliary-space claims, assumptions, derivation steps, and misconception tags.

Changing the representation, implementation, selected case, or assumptions can change the valid
claim. Auxiliary space is modeled separately from returned output.

## Versioned data boundary

[`types.ts`](../src/lib/complexity/types.ts) defines serializable `OperationDefinition`,
`OperationComplexityCase`, `ComplexityFamilyDefinition`, and `ComplexityEvidence` records. Model
version 1 makes authored cases stable data rather than prose embedded in a page.

`ComplexityEvidence` can hold per-step and cumulative primitive counts, exact operation count,
input dimensions, call-stack depth, and current/peak auxiliary and output space. `TraceStep` accepts
that record as optional evidence. Existing traces still work without it. The Complexity Lab supplies
explicit case metadata to three iterative Binary Search traces—best, average, and worst—and every
step carries exact and cumulative read/write/comparison/return evidence. The recursive-space case
does not reuse the iterative source or fabricate stack frames. Dynamic-array append has authored
cases but no deterministic trace engine yet.

The shared Operation Complexity Explorer supports nine modes: overview, visual trace, code trace,
cases, implementations, derivation, growth, space, and challenge. Visual and code modes appear only
when the selected case has a matching deterministic trace; unsupported modes are omitted instead of
publishing placeholder states.

## Family catalog

The catalog contains 15 analysis families:

| Coverage group                 | Families                                                                                     | Interactive curve |
| ------------------------------ | -------------------------------------------------------------------------------------------- | ----------------- |
| One primary input              | `O(1)`, `O(log n)`, `O(sqrt n)`, `O(n)`, `O(n log n)`, `O(n^2)`, `O(n^3)`, `O(2^n)`, `O(n!)` | Yes               |
| Independent input dimensions   | `O(n + m)`, `O(nm)`, `O(V + E)`, `O((V + E) log V)`, `O(log n + k)`                          | Reference only    |
| Cost distributed over a series | Amortized `O(1)`                                                                             | Reference only    |

Each family includes a representative formula, real scenarios, assumptions, a derivation, and a
default example input. This is complete reference/chart coverage, not a claim that 15 executable
algorithm labs exist. See [operation-case coverage](operation-case-coverage.md) for the narrower
set connected to authored operations.

## Growth evaluator boundaries

[`growth.ts`](../src/lib/complexity/growth.ts) evaluates the catalog deterministically:

- logarithms use base 2 and displayed counts round up;
- finite inputs are floored to integers of at least 1;
- omitted `m` defaults to `n`, `V` defaults to `n`, `E` defaults to `m`, and `k` defaults to 1;
- chart series accept `n` from 1 through 50;
- explosive results cap at `1,000,000,000` and remain visibly marked as capped;
- `custom` formulas display as scenario-defined instead of executing arbitrary expressions.

These boundaries keep exponential and factorial comparisons safe and reproducible. They are not a
benchmarking harness and do not model CPU, cache, compiler, runtime, or allocation timing.

## Validation and extension

[`validate.ts`](../src/lib/complexity/validate.ts) checks unique family/case identifiers, parent and
variant references, non-empty assumptions, and non-empty derivations. Growth and catalog behavior
have focused unit tests.

To add an operation, author and validate its cases, connect a deterministic `TraceLesson` when one
exists, add per-step `ComplexityEvidence` only when the engine can count it exactly, and test each
case/variant boundary. Do not promote a family example or a placeholder mode as a completed lesson.
