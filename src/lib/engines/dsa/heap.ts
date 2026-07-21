import type {
  ComplexityCaseType,
  ComplexityClass,
  ComplexityEvidence,
  WorkCounts
} from '$lib/complexity/types';
import type {
  PredictionChallenge,
  SourceLine,
  SupportedLanguage,
  TraceEntity,
  TraceLesson,
  TraceMutation,
  TraceStep,
  TraceValue
} from '$lib/trace/types';

export const HEAP_INPUT_MAX = 10;

export type HeapOperation = 'peek' | 'insert' | 'extract' | 'search' | 'build';
export type HeapKind = 'max' | 'min';
export type HeapOperationGroup = 'Inspection' | 'Modification' | 'Construction';

export interface HeapComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface HeapOperationMetadata {
  id: HeapOperation;
  label: string;
  description: string;
  group: HeapOperationGroup;
  requiresValue: boolean;
  cases: readonly HeapComplexityCase[];
}

export interface HeapConfig {
  operation: HeapOperation;
  kind: HeapKind;
  values: number[];
  value?: number;
}

export const DEFAULT_HEAP_CONFIG: HeapConfig = {
  operation: 'insert',
  kind: 'max',
  values: [50, 30, 40, 10, 20, 35],
  value: 60
};

const arrayHeapAssumption = 'The heap is an array: node i has children 2i+1 and 2i+2, parent ⌊(i−1)/2⌋.';
const boundedPrimitiveAssumption =
  'Each displayed comparison, read, write, or swap is one counted primitive.';

const operation = (
  id: HeapOperation,
  label: string,
  description: string,
  group: HeapOperationGroup,
  flags: Partial<Pick<HeapOperationMetadata, 'requiresValue'>>,
  cases: readonly HeapComplexityCase[]
): HeapOperationMetadata => ({ id, label, description, group, requiresValue: false, ...flags, cases });

export const HEAP_OPERATIONS: readonly HeapOperationMetadata[] = [
  operation('peek', 'Peek root', 'Read the min or max at index 0 without changing the heap.', 'Inspection', {}, [
    {
      id: 'peek-root',
      label: 'Read index 0',
      caseType: 'worst',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Array root read',
      assumptions: [arrayHeapAssumption, 'The extreme element is always at the root.'],
      description: 'The heap invariant keeps the extreme at index 0, so peek is a single read.'
    }
  ]),
  operation('insert', 'Insert (sift-up)', 'Append at the end, then bubble up while it beats its parent.', 'Modification', { requiresValue: true }, [
    {
      id: 'insert-log',
      label: 'Sift up to the root',
      caseType: 'worst',
      timeComplexity: 'O(log n)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Append + sift-up',
      assumptions: [arrayHeapAssumption, 'A new element may travel from a leaf to the root.'],
      description: 'The new value rises at most one level per swap: at most ⌊log₂ n⌋ swaps.'
    }
  ]),
  operation('extract', 'Extract root (sift-down)', 'Swap root with the last leaf, shrink, then sift the new root down.', 'Modification', {}, [
    {
      id: 'extract-log',
      label: 'Sift down to a leaf',
      caseType: 'worst',
      timeComplexity: 'O(log n)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Swap-last + sift-down',
      assumptions: [arrayHeapAssumption, 'The demoted leaf may sink from the root to a leaf.'],
      description: 'The demoted value falls at most one level per swap: at most ⌊log₂ n⌋ swaps.'
    }
  ]),
  operation('search', 'Search', 'A heap only orders parent vs child, so finding an arbitrary value scans it all.', 'Inspection', { requiresValue: true }, [
    {
      id: 'search-linear',
      label: 'Scan every slot',
      caseType: 'worst',
      timeComplexity: 'O(n)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Linear scan',
      assumptions: [arrayHeapAssumption, 'Heap order says nothing about left-vs-right siblings.'],
      description: 'Unlike a BST, a heap gives no direction hint, so arbitrary search is linear.'
    }
  ]),
  operation('build', 'Build heap (heapify)', 'Sift down every non-leaf from the last one to the root — and it is O(n), not O(n log n).', 'Construction', {}, [
    {
      id: 'build-linear',
      label: 'Bottom-up heapify',
      caseType: 'worst',
      timeComplexity: 'O(n)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Bottom-up sift-down from ⌊n/2⌋−1',
      assumptions: [arrayHeapAssumption, 'Most nodes are near the leaves with tiny subtrees to sift.'],
      description: 'Summing sift-down costs weighted by how few deep nodes exist converges to O(n).'
    }
  ])
] as const;

export function getHeapOperationMetadata(operationId: HeapOperation): HeapOperationMetadata {
  const metadata = HEAP_OPERATIONS.find((candidate) => candidate.id === operationId);
  if (!metadata) throw new Error(`Unknown heap operation: ${String(operationId)}`);
  return metadata;
}

interface RuntimeState {
  kind: HeapKind;
  heap: number[];
  heapSize: number;
  compareA: number | null;
  compareB: number | null;
  cursor: number | null;
  swapped: number[];
  sorted: number[];
  result: TraceValue;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: HeapOperation;
  kind: HeapKind;
  values: number[];
  value: number;
}

interface SelectedCase extends HeapComplexityCase {
  derivation: string[];
}

function cloneWork(work: WorkCounts): WorkCounts {
  return { ...work };
}

function addWork(cumulative: WorkCounts, step: WorkCounts): WorkCounts {
  const next = cloneWork(cumulative);
  for (const [metric, count] of Object.entries(step)) {
    const key = metric as keyof WorkCounts;
    next[key] = (next[key] ?? 0) + (count ?? 0);
  }
  return next;
}

function totalWork(work: WorkCounts): number {
  return Object.values(work).reduce((sum, count) => sum + (count ?? 0), 0);
}

/** True if `child` should be above `parent` (violates the heap order). */
function beats(kind: HeapKind, child: number, parent: number): boolean {
  return kind === 'max' ? child > parent : child < parent;
}

function heapify(values: number[], kind: HeapKind): number[] {
  const heap = [...values];
  const n = heap.length;
  for (let root = Math.floor(n / 2) - 1; root >= 0; root--) {
    let current = root;
    for (;;) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let best = current;
      if (left < n && beats(kind, heap[left], heap[best])) best = left;
      if (right < n && beats(kind, heap[right], heap[best])) best = right;
      if (best === current) break;
      [heap[current], heap[best]] = [heap[best], heap[current]];
      current = best;
    }
  }
  return heap;
}

function resolveConfig(input: HeapConfig): ResolvedConfig {
  if (!HEAP_OPERATIONS.some((candidate) => candidate.id === input.operation)) {
    throw new Error(`Unsupported heap operation: ${String(input.operation)}`);
  }
  if (!Array.isArray(input.values) || input.values.length < 1 || input.values.length > HEAP_INPUT_MAX) {
    throw new RangeError(`Use 1–${HEAP_INPUT_MAX} values so the heap tree stays visible.`);
  }
  if (input.values.some((value) => !Number.isSafeInteger(value))) {
    throw new TypeError('Heap values must be safe integers.');
  }
  const value = input.value ?? 0;
  if (!Number.isSafeInteger(value)) throw new TypeError('The operation value must be a safe integer.');
  return { operation: input.operation, kind: input.kind, values: [...input.values], value };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  // Every operation except build starts from an already-valid heap.
  const heap = config.operation === 'build' ? [...config.values] : heapify(config.values, config.kind);
  return {
    kind: config.kind,
    heap,
    heapSize: heap.length,
    compareA: null,
    compareB: null,
    cursor: null,
    swapped: [],
    sorted: [],
    result: null,
    cumulativeWork: {},
    operationCount: 0
  };
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    kind: config.kind,
    value: config.value,
    heap: [...state.heap],
    heapSize: state.heapSize,
    compareA: state.compareA,
    compareB: state.compareB,
    cursor: state.cursor,
    swapped: [...state.swapped],
    sorted: [...state.sorted],
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = state.heap.map((value, index) => ({
    id: `slot-${index}`,
    type: 'array-cell',
    label: `heap[${index}]`,
    value,
    metadata: {
      inHeap: index < state.heapSize,
      parent: index === 0 ? null : Math.floor((index - 1) / 2),
      left: 2 * index + 1,
      right: 2 * index + 2,
      comparing: state.compareA === index || state.compareB === index,
      cursor: state.cursor === index,
      swapped: state.swapped.includes(index),
      sorted: state.sorted.includes(index)
    }
  }));
  entities.push(
    { id: 'var-heapSize', type: 'variable', label: 'heap size', value: state.heapSize },
    { id: 'operation-count', type: 'variable', label: 'exact operations', value: state.operationCount },
    { id: 'result', type: 'variable', label: 'result', value: state.result }
  );
  return entities;
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const beforeHeap = (before.heap as number[]) ?? [];
  const afterHeap = (after.heap as number[]) ?? [];
  for (let index = 0; index < Math.max(beforeHeap.length, afterHeap.length); index++) {
    if (beforeHeap[index] !== afterHeap[index]) {
      mutations.push({
        entityId: `slot-${index}`,
        property: 'value',
        previousValue: beforeHeap[index] ?? null,
        nextValue: afterHeap[index] ?? null,
        animation: 'swap'
      });
    }
  }
  for (const field of ['heapSize', 'compareA', 'compareB', 'cursor', 'result']) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      mutations.push({
        entityId: field === 'heapSize' ? 'var-heapSize' : field,
        property: 'value',
        previousValue: before[field],
        nextValue: after[field],
        animation: 'highlight'
      });
    }
  }
  return mutations;
}

export interface HeapMistakeMetadata {
  prompt: string;
  wrongAnswer: TraceValue;
  correctAnswer: TraceValue;
  explanation: string;
  tag: string;
}

function makePrediction(
  id: string,
  prompt: string,
  type: PredictionChallenge['type'],
  correctAnswer: TraceValue,
  explanation: string,
  tag: string,
  wrongAnswer: TraceValue
): { prediction: PredictionChallenge; mistake: HeapMistakeMetadata } {
  return {
    prediction: { id, prompt, type, correctAnswer, explanation, misconceptionTags: [tag], xpReward: 10 },
    mistake: { prompt, wrongAnswer, correctAnswer, explanation, tag }
  };
}

interface TraceBuilder {
  state: RuntimeState;
  steps: TraceStep[];
  add: (
    semantic: string,
    title: string,
    explanation: string,
    stepWork: WorkCounts,
    mutate?: (state: RuntimeState) => void,
    checkpoint?: ReturnType<typeof makePrediction>
  ) => void;
}

function createTraceBuilder(
  config: ResolvedConfig,
  complexityCase: SelectedCase,
  state: RuntimeState
): TraceBuilder {
  const steps: TraceStep[] = [];
  let peakOutput = 0;

  const add: TraceBuilder['add'] = (semantic, title, explanation, stepWork, mutate = () => {}, checkpoint) => {
    const before = traceState(state, config);
    mutate(state);
    const exactOperationCount = totalWork(stepWork);
    state.cumulativeWork = addWork(state.cumulativeWork, stepWork);
    state.operationCount += exactOperationCount;
    const after = traceState(state, config);

    const outputCurrent = state.result === null ? 0 : 1;
    peakOutput = Math.max(peakOutput, outputCurrent);

    const complexityEvidence: ComplexityEvidence = {
      caseId: complexityCase.id,
      selectedCase: complexityCase.caseType,
      implementationVariant: complexityCase.implementationVariant,
      inputSize: { n: config.values.length },
      exactOperationCount,
      cumulativeOperationCount: state.operationCount,
      stepWork: cloneWork(stepWork),
      cumulativeWork: cloneWork(state.cumulativeWork),
      timeComplexity: complexityCase.timeComplexity,
      auxiliarySpace: complexityCase.auxiliarySpace,
      space: {
        auxiliary: { current: 1, peak: 1, unit: 'swap temporary' },
        output: { current: outputCurrent, peak: peakOutput, unit: 'reported values' },
        callStackDepth: 1
      },
      assumptions: [
        ...new Set([
          ...complexityCase.assumptions,
          boundedPrimitiveAssumption,
          'Trace construction and visualization bookkeeping are excluded from the algorithm count.'
        ])
      ],
      derivation: [...complexityCase.derivation]
    };

    const visualFocus = [state.cursor, state.compareA, state.compareB]
      .filter((value): value is number => value !== null)
      .map((index) => `slot-${index}`);

    steps.push({
      id: `heap-${config.operation}-${steps.length}`,
      index: steps.length,
      title,
      eventType: semantic,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      stateBefore: before,
      stateAfter: after,
      entities: entitiesFor(state),
      mutations: mutationsBetween(before, after),
      deterministicExplanation: explanation,
      visualFocus: [...new Set(visualFocus)],
      ...(checkpoint ? { prediction: checkpoint.prediction } : {}),
      complexityCost: {
        comparisons: state.cumulativeWork.comparison ?? 0,
        reads: state.cumulativeWork.read ?? 0,
        writes: state.cumulativeWork.write ?? 0,
        swaps: state.cumulativeWork.swap ?? 0
      },
      complexityEvidence,
      metadata: {
        operation: config.operation,
        kind: config.kind,
        complexityCase: complexityCase.id,
        ...(checkpoint
          ? {
              mistake: {
                prompt: checkpoint.mistake.prompt,
                wrongAnswer: checkpoint.mistake.wrongAnswer,
                correctAnswer: checkpoint.mistake.correctAnswer,
                explanation: checkpoint.mistake.explanation,
                tag: checkpoint.mistake.tag
              }
            }
          : {})
      }
    });
  };
  return { state, steps, add };
}

interface QuadSourceLine {
  semantic?: string;
  c: string;
  cpp: string;
  java: string;
  python: string;
}

function quad(semantic: string | undefined, c: string, cpp: string, java: string, python: string): QuadSourceLine {
  return { semantic, c, cpp, java, python };
}

function operationSource(config: ResolvedConfig): QuadSourceLine[] {
  const cmp = config.kind === 'max' ? '>' : '<';
  const better = config.kind === 'max' ? 'larger' : 'smaller';
  switch (config.operation) {
    case 'peek':
      return [
        quad(undefined, 'int peek(int* h, int n) {', 'int peek(vector<int>& h) {', '  int peek() {', 'def peek(h):'),
        quad('peek-empty', '  if (n == 0) return ERROR;', '  if (h.empty()) return ERROR;', '    if (size == 0) return ERROR;', '    if not h: raise IndexError'),
        quad('peek-read', '  return h[0];   /* root is the extreme */', '  return h[0];   // root is the extreme', '    return h[0];  // root is the extreme', '    return h[0]  # root is the extreme'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert':
      return [
        quad(undefined, 'void insert(int* h, int* n, int v) {', 'void insert(vector<int>& h, int v) {', '  void insert(int v) {', 'def insert(h, v):'),
        quad('insert-append', '  h[(*n)++] = v; int i = *n - 1;', '  h.push_back(v); int i = h.size() - 1;', '    h[size++] = v; int i = size - 1;', '    h.append(v); i = len(h) - 1'),
        quad('sift-up-check', `  while (i > 0 && h[i] ${cmp} h[(i-1)/2]) {`, `  while (i > 0 && h[i] ${cmp} h[(i-1)/2]) {`, `    while (i > 0 && h[i] ${cmp} h[(i-1)/2]) {`, `    while i > 0 and h[i] ${cmp} h[(i-1)//2]:`),
        quad('sift-up-swap', '    swap(h[i], h[(i-1)/2]);', '    swap(h[i], h[(i-1)/2]);', '      swap(h, i, (i-1)/2);', '        h[i], h[(i-1)//2] = h[(i-1)//2], h[i]'),
        quad('sift-up-move', '    i = (i - 1) / 2;', '    i = (i - 1) / 2;', '      i = (i - 1) / 2;', '        i = (i - 1) // 2'),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'extract':
      return [
        quad(undefined, 'int extract(int* h, int* n) {', 'int extract(vector<int>& h) {', '  int extract() {', 'def extract(h):'),
        quad('extract-root', '  int top = h[0];', '  int top = h[0];', '    int top = h[0];', '    top = h[0]'),
        quad('extract-swap-last', '  h[0] = h[--(*n)];', '  h[0] = h.back(); h.pop_back();', '    h[0] = h[--size];', '    h[0] = h.pop()'),
        quad('sift-down-check', `  int i = 0; while (child ${cmp} h[i] exists) {`, `  int i = 0; while (child ${cmp} h[i] exists) {`, `    int i = 0; while (child ${cmp} h[i] exists) {`, `    i = 0`),
        quad('sift-down-pick', `    pick ${better} child c;`, `    pick ${better} child c;`, `      pick ${better} child c;`, `    # pick ${better} child c`),
        quad('sift-down-swap', '    swap(h[i], h[c]); i = c;', '    swap(h[i], h[c]); i = c;', '      swap(h, i, c); i = c;', '    h[i], h[c] = h[c], h[i]; i = c'),
        quad('extract-return', '  return top;', '  return top;', '    return top;', '    return top'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'search':
      return [
        quad(undefined, 'int find(int* h, int n, int v) {', 'int find(vector<int>& h, int v) {', '  int find(int v) {', 'def find(h, v):'),
        quad('search-check', '  for (int i = 0; i < n; ++i)', '  for (int i = 0; i < h.size(); ++i)', '    for (int i = 0; i < size; i++)', '    for i in range(len(h)):'),
        quad('search-compare', '    if (h[i] == v) return i;  /* no order hint */', '    if (h[i] == v) return i;  // no order hint', '      if (h[i] == v) return i;  // no order hint', '        if h[i] == v: return i  # no order hint'),
        quad('search-missing', '  return -1;', '  return -1;', '    return -1;', '    return -1'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'build':
      return [
        quad(undefined, 'void build(int* h, int n) {', 'void build(vector<int>& h) {', '  void build() {', 'def build(h):'),
        quad('build-start', '  for (int i = n/2 - 1; i >= 0; --i)', '  for (int i = h.size()/2 - 1; i >= 0; --i)', '    for (int i = size/2 - 1; i >= 0; i--)', '    for i in range(len(h)//2 - 1, -1, -1):'),
        quad('build-sift', '    siftDown(h, n, i);   /* leaves need no work */', '    siftDown(h, i);   // leaves need no work', '      siftDown(i);   // leaves need no work', '        sift_down(h, i)  # leaves need no work'),
        quad('sift-down-swap', '      // each sift-down bubbles i down its subtree', '      // each sift-down bubbles i down its subtree', '        // each sift-down bubbles i down its subtree', '        # each sift-down bubbles i down its subtree'),
        quad(undefined, '}', '}', '  }', '')
      ];
  }
}

function sourceLines(config: ResolvedConfig, language: SupportedLanguage): SourceLine[] {
  return operationSource(config).map((line, index) => ({
    id: `${config.operation}-${config.kind}-${index + 1}`,
    number: index + 1,
    text: line[language],
    ...(line.semantic ? { semanticOperationId: line.semantic } : {})
  }));
}

function deriveComplexity(caseId: string, config: ResolvedConfig): string[] {
  const n = config.values.length;
  const levels = Math.floor(Math.log2(Math.max(1, n))) + 1;
  switch (caseId) {
    case 'peek-root':
      return [
        'The heap invariant guarantees the extreme element sits at index 0.',
        'Reading one array slot is independent of the heap size.',
        'A single read is O(1) time and O(1) space.'
      ];
    case 'insert-log':
      return [
        'The new value is appended, then swapped upward while it beats its parent.',
        `A complete tree over ${n} nodes has ~${levels} levels, so at most ${levels - 1} swaps happen.`,
        'One swap per level bounds insert at O(log n) time, O(1) space.'
      ];
    case 'extract-log':
      return [
        'The last leaf is moved to the root, then sinks while a child beats it.',
        `The path from root to a leaf is ~${levels - 1} edges long.`,
        'One swap per level bounds extract at O(log n) time, O(1) space.'
      ];
    case 'search-linear':
      return [
        'Heap order relates a parent to its children, but not the two children to each other.',
        `With no way to prune, the scan may inspect all ${n} slots.`,
        'Arbitrary search is O(n) — the cost of a structure optimized only for the extreme.'
      ];
    case 'build-linear':
      return [
        'Nodes near the leaves have tiny subtrees: half the nodes sift 0 levels, a quarter sift 1, and so on.',
        'The total work is Σ (nodes at height h) × h = n · Σ h/2ʰ, and Σ h/2ʰ converges to 2.',
        'So bottom-up build-heap is O(n) — strictly better than n inserts at O(n log n).'
      ];
    default:
      return ['A bounded primitive count.'];
  }
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const metadata = getHeapOperationMetadata(config.operation);
  const selected = metadata.cases[0];
  return { ...selected, derivation: deriveComplexity(selected.id, config) };
}

function parentOf(index: number): number {
  return Math.floor((index - 1) / 2);
}

function runPeek(builder: TraceBuilder, config: ResolvedConfig) {
  const extreme = config.kind === 'max' ? 'maximum' : 'minimum';
  const root = builder.state.heap[0];
  const checkpoint = makePrediction(
    'heap-lab:peek:checkpoint',
    `In a ${config.kind}-heap, which index always holds the ${extreme}?`,
    'numeric',
    0,
    `The heap invariant forces the ${extreme} to index 0, so peek is O(1) — it never searches.`,
    'heap-root-location',
    Math.floor(builder.state.heap.length / 2)
  );
  builder.add('peek-empty', 'Confirm the heap is non-empty', 'A peek on an empty heap is an error; here the heap has elements.', { comparison: 1 }, (state) => {
    state.cursor = 0;
  }, checkpoint);
  builder.add('peek-read', `Read the root ${root}`, `The ${extreme} ${root} sits at index 0 by the heap invariant — no scan needed.`, { read: 1, return: 1 }, (state) => {
    state.result = root;
  });
}

function runInsert(builder: TraceBuilder, config: ResolvedConfig) {
  const kind = config.kind;
  const appended = config.value;
  const checkpoint = makePrediction(
    `heap-lab:insert:${appended}:checkpoint`,
    `Insert appends ${appended} at the end, then sifts up. Which index is its parent to compare against first?`,
    'numeric',
    parentOf(builder.state.heap.length),
    `The new leaf lands at index ${builder.state.heap.length}; its parent is ⌊(${builder.state.heap.length}−1)/2⌋ = ${parentOf(builder.state.heap.length)}. Sift-up only ever compares child to parent.`,
    'heap-parent-child-index',
    builder.state.heap.length - 1
  );
  builder.add(
    'insert-append',
    `Append ${appended} at index ${builder.state.heap.length}`,
    'A heap is a complete tree, so the new value must start at the next free leaf.',
    { write: 1 },
    (state) => {
      state.heap = [...state.heap, appended];
      state.heapSize = state.heap.length;
      state.cursor = state.heap.length - 1;
    },
    checkpoint
  );
  let index = builder.state.heap.length - 1;
  while (index > 0) {
    const parent = parentOf(index);
    const child = builder.state.heap[index];
    const parentValue = builder.state.heap[parent];
    const violates = beats(kind, child, parentValue);
    builder.add(
      'sift-up-check',
      `Compare ${child} with parent ${parentValue}`,
      violates
        ? `${child} ${kind === 'max' ? '>' : '<'} ${parentValue}: the heap order is violated, so swap up.`
        : `${child} does not beat ${parentValue}: the heap order holds, so stop.`,
      { read: 2, comparison: 1 },
      (state) => {
        state.cursor = index;
        state.compareA = index;
        state.compareB = parent;
      }
    );
    if (!violates) break;
    builder.add('sift-up-swap', `Swap up: ${child} ⇄ ${parentValue}`, `${child} rises one level toward the root.`, { swap: 1, write: 2 }, (state) => {
      [state.heap[index], state.heap[parent]] = [state.heap[parent], state.heap[index]];
      state.swapped = [index, parent];
    });
    builder.add('sift-up-move', `Move up to index ${parent}`, 'Keep sifting from the new position.', { write: 1 }, (state) => {
      state.cursor = parent;
      state.compareA = null;
      state.compareB = null;
    });
    index = parent;
  }
  builder.add('sift-up-check', 'Sift-up complete', `${appended} settled at index ${index} after climbing ${builder.state.heap.length - 1 - index} level(s) — at most ⌊log₂ n⌋.`, { return: 1 }, (state) => {
    state.result = appended;
    state.compareA = null;
    state.compareB = null;
    state.swapped = [];
  });
}

function runExtract(builder: TraceBuilder, config: ResolvedConfig) {
  const kind = config.kind;
  const root = builder.state.heap[0];
  const extreme = kind === 'max' ? 'maximum' : 'minimum';
  const checkpoint = makePrediction(
    'heap-lab:extract:checkpoint',
    `Extract removes the root ${root}. Which element takes the root's place BEFORE sifting down?`,
    'numeric',
    builder.state.heap[builder.state.heap.length - 1],
    `The last leaf (${builder.state.heap[builder.state.heap.length - 1]}) moves to the root so the tree stays complete; then it sinks. Taking a child directly would break completeness.`,
    'heap-extract-replacement',
    builder.state.heap[1] ?? root
  );
  builder.add('extract-root', `Save the root ${root}`, `The ${extreme} ${root} is the value being extracted.`, { read: 1 }, (state) => {
    state.cursor = 0;
    state.result = root;
  }, checkpoint);
  const last = builder.state.heap[builder.state.heap.length - 1];
  builder.add(
    'extract-swap-last',
    `Move last leaf ${last} to the root and shrink`,
    'The tree stays complete because the removed slot is the last one.',
    { swap: 1, write: 2 },
    (state) => {
      state.heap = [...state.heap];
      state.heap[0] = last;
      state.heap = state.heap.slice(0, state.heap.length - 1);
      state.heapSize = state.heap.length;
      state.swapped = [0];
      state.cursor = 0;
    }
  );
  let index = 0;
  const size = builder.state.heap.length;
  while (true) {
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    let best = index;
    if (left < size && beats(kind, builder.state.heap[left], builder.state.heap[best])) best = left;
    if (right < size && beats(kind, builder.state.heap[right], builder.state.heap[best])) best = right;
    const children = [left, right].filter((child) => child < size);
    if (children.length === 0) {
      builder.add('sift-down-check', `Index ${index} is a leaf`, 'No children remain, so sift-down stops.', { comparison: 1 });
      break;
    }
    builder.add(
      'sift-down-pick',
      `Compare index ${index} with child${children.length > 1 ? 'ren' : ''} ${children.map((child) => builder.state.heap[child]).join(', ')}`,
      best === index
        ? `${builder.state.heap[index]} already beats its children: the heap order holds here.`
        : `The ${kind === 'max' ? 'largest' : 'smallest'} child ${builder.state.heap[best]} beats ${builder.state.heap[index]}, so swap down.`,
      { read: children.length + 1, comparison: children.length },
      (state) => {
        state.cursor = index;
        state.compareA = index;
        state.compareB = best === index ? children[0] : best;
      }
    );
    if (best === index) break;
    const target = best;
    builder.add('sift-down-swap', `Swap down: ${builder.state.heap[index]} ⇄ ${builder.state.heap[best]}`, `The demoted value sinks one level toward the leaves.`, { swap: 1, write: 2 }, (state) => {
      [state.heap[index], state.heap[target]] = [state.heap[target], state.heap[index]];
      state.swapped = [index, target];
      state.cursor = target;
      state.compareA = null;
      state.compareB = null;
    });
    index = target;
  }
  builder.add('extract-return', `Return ${root}`, `Extraction cost one swap per level: at most ⌊log₂ n⌋ swaps.`, { return: 1 }, (state) => {
    state.result = root;
    state.compareA = null;
    state.compareB = null;
    state.swapped = [];
  });
}

function runSearch(builder: TraceBuilder, config: ResolvedConfig) {
  const target = config.value;
  const foundIndex = builder.state.heap.indexOf(target);
  const checkpoint = makePrediction(
    `heap-lab:search:${target}:checkpoint`,
    `Can a heap prune its search for ${target} the way a BST does?`,
    'text',
    'no',
    'A heap only orders parent vs child, not left vs right subtrees — so there is no direction to follow. Arbitrary search is a full O(n) scan.',
    'heap-search-order',
    'yes'
  );
  let emitted = false;
  for (let index = 0; index < builder.state.heap.length; index++) {
    const value = builder.state.heap[index];
    builder.add(
      'search-compare',
      `Compare heap[${index}] = ${value} with ${target}`,
      `${value} ${value === target ? 'matches' : 'does not match'}${index > 0 ? ' — and heap order gave no hint to skip earlier slots' : ''}.`,
      { read: 1, comparison: 1 },
      (state) => {
        state.cursor = index;
        if (value === target) state.result = index;
      },
      emitted ? undefined : checkpoint
    );
    emitted = true;
    if (value === target) return;
  }
  builder.add('search-missing', 'Report absent', `${target} is not in the heap; all ${builder.state.heap.length} slots were scanned.`, { return: 1 }, (state) => {
    state.result = -1;
  });
}

function runBuild(builder: TraceBuilder, config: ResolvedConfig) {
  const kind = config.kind;
  const n = builder.state.heap.length;
  const firstNonLeaf = Math.floor(n / 2) - 1;
  const checkpoint = makePrediction(
    'heap-lab:build:checkpoint',
    `Build-heap sifts down every non-leaf. With n = ${n}, which index does it START from (and why is starting here O(n))?`,
    'numeric',
    firstNonLeaf,
    `⌊n/2⌋ − 1 = ${firstNonLeaf} is the last non-leaf; the ${n - 1 - firstNonLeaf} nodes after it are leaves needing zero work. Because most nodes are shallow leaves, the total is O(n), not O(n log n).`,
    'build-heap-start',
    0
  );
  builder.add(
    'build-start',
    `Start at the last non-leaf, index ${firstNonLeaf}`,
    `Every index after ${firstNonLeaf} is a leaf — already a valid one-element heap — so heapify skips them entirely.`,
    { write: 1 },
    (state) => {
      state.cursor = firstNonLeaf;
      state.sorted = Array.from({ length: n - 1 - firstNonLeaf }, (_, offset) => firstNonLeaf + 1 + offset);
    },
    checkpoint
  );
  for (let root = firstNonLeaf; root >= 0; root--) {
    builder.add('build-sift', `Sift down index ${root} (value ${builder.state.heap[root]})`, `Repair the subtree rooted at ${root}; its children are already valid heaps.`, { read: 1 }, (state) => {
      state.cursor = root;
      state.compareA = root;
      state.compareB = null;
    });
    let index = root;
    for (;;) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let best = index;
      if (left < n && beats(kind, builder.state.heap[left], builder.state.heap[best])) best = left;
      if (right < n && beats(kind, builder.state.heap[right], builder.state.heap[best])) best = right;
      if (best === index) break;
      const target = best;
      builder.add('sift-down-swap', `Swap ${builder.state.heap[index]} ⇄ ${builder.state.heap[target]}`, `The larger/smaller child rises so index ${index} satisfies the heap order.`, { swap: 1, write: 2, comparison: 2 }, (state) => {
        [state.heap[index], state.heap[target]] = [state.heap[target], state.heap[index]];
        state.swapped = [index, target];
        state.cursor = target;
      });
      index = target;
    }
  }
  builder.add('build-start', 'Heap built', `All ${n} values now satisfy the ${kind}-heap order. Bottom-up heapify was O(n), beating ${n} separate O(log n) inserts.`, { return: 1 }, (state) => {
    state.result = `${kind}-heap`;
    state.cursor = null;
    state.compareA = null;
    state.compareB = null;
    state.swapped = [];
    state.sorted = [];
  });
}

const LESSON_OBJECTIVES = [
  'Use the array index map (children 2i+1, 2i+2; parent ⌊(i−1)/2⌋) to navigate a heap',
  'Trace sift-up on insert and sift-down on extract as O(log n) one-swap-per-level paths',
  'Explain why bottom-up build-heap is O(n) while arbitrary search is O(n)'
];

export function createHeapLesson(input: HeapConfig = DEFAULT_HEAP_CONFIG): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));
  switch (config.operation) {
    case 'peek':
      runPeek(builder, config);
      break;
    case 'insert':
      runInsert(builder, config);
      break;
    case 'extract':
      runExtract(builder, config);
      break;
    case 'search':
      runSearch(builder, config);
      break;
    case 'build':
      runBuild(builder, config);
      break;
  }
  const metadata = getHeapOperationMetadata(config.operation);
  return {
    id: 'heap-lab',
    subject: 'dsa-1',
    topic: 'Heap',
    title: `Heap Lab — ${metadata.label} (${config.kind}-heap)`,
    description: metadata.description,
    difficulty: 'intermediate',
    learningObjectives: LESSON_OBJECTIVES,
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: {
      c: sourceLines(config, 'c'),
      cpp: sourceLines(config, 'cpp'),
      java: sourceLines(config, 'java'),
      python: sourceLines(config, 'python')
    },
    initialState: traceState(initialRuntime(config), config),
    steps: builder.steps,
    completionCriteria: { requiredCorrectPredictions: 1, masteryThreshold: 0.8 }
  };
}
