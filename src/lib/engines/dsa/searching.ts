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

export const SEARCHING_INPUT_MAX = 10;
export const SEARCH_HASH_BUCKETS = 7;

export type SearchStrategy = 'linear' | 'binary-iterative' | 'binary-recursive' | 'bst' | 'hash';

export interface SearchStrategyComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface SearchStrategyMetadata {
  id: SearchStrategy;
  label: string;
  description: string;
  requiresSorted: boolean;
  cases: readonly SearchStrategyComplexityCase[];
}

export interface SearchingConfig {
  strategy: SearchStrategy;
  values: number[];
  target?: number;
}

export const DEFAULT_SEARCHING_CONFIG: SearchingConfig = {
  strategy: 'binary-iterative',
  values: [2, 5, 8, 12, 16, 23, 38, 56],
  target: 23
};

const sortedAssumption = 'The array is sorted ascending; binary search is meaningless without it.';
const distinctAssumption = 'Values are distinct so every search has a single well-defined answer.';
const boundedPrimitiveAssumption =
  'Each displayed comparison, read, hash, or pointer move is one counted primitive.';

const strategy = (
  id: SearchStrategy,
  label: string,
  description: string,
  requiresSorted: boolean,
  cases: readonly SearchStrategyComplexityCase[]
): SearchStrategyMetadata => ({ id, label, description, requiresSorted, cases });

export const SEARCH_STRATEGIES: readonly SearchStrategyMetadata[] = [
  strategy(
    'linear',
    'Linear Search',
    'Compare every value from index 0 until a match or the end.',
    false,
    [
      {
        id: 'linear-best',
        label: 'Best — match at index 0',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Left-to-right scan',
        assumptions: [distinctAssumption, 'The first slot matches.'],
        description: 'The first comparison succeeds.'
      },
      {
        id: 'linear-average',
        label: 'Average — match inside',
        caseType: 'average',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Left-to-right scan',
        assumptions: [distinctAssumption, 'The match position is uniformly distributed.'],
        description: 'About half the array is compared on average.'
      },
      {
        id: 'linear-worst',
        label: 'Worst — last or absent',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Left-to-right scan',
        assumptions: [distinctAssumption, 'The target is last or absent.'],
        description: 'Every value needs one comparison.'
      }
    ]
  ),
  strategy(
    'binary-iterative',
    'Binary Search (iterative)',
    'Halve a sorted range with a loop until the target or an empty range remains.',
    true,
    [
      {
        id: 'binary-iterative-best',
        label: 'Best — first midpoint hits',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Loop with left/right bounds',
        assumptions: [sortedAssumption, distinctAssumption],
        description: 'The first midpoint comparison matches.'
      },
      {
        id: 'binary-iterative-worst',
        label: 'Worst — range shrinks to empty',
        caseType: 'worst',
        timeComplexity: 'O(log n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Loop with left/right bounds',
        assumptions: [sortedAssumption, distinctAssumption],
        description: 'Each comparison halves the range: at most ⌊log₂ n⌋ + 1 midpoints.'
      }
    ]
  ),
  strategy(
    'binary-recursive',
    'Binary Search (recursive)',
    'The same halving expressed as recursion — each half becomes a new stack frame.',
    true,
    [
      {
        id: 'binary-recursive-worst',
        label: 'Worst — one frame per halving',
        caseType: 'worst',
        timeComplexity: 'O(log n)',
        auxiliarySpace: 'O(log n)',
        implementationVariant: 'Recursion on the surviving half',
        assumptions: [sortedAssumption, distinctAssumption, 'No tail-call elimination is assumed.'],
        description:
          'Time matches the iterative version, but each halving keeps a live stack frame: O(log n) auxiliary space.'
      }
    ]
  ),
  strategy(
    'bst',
    'BST Search',
    'Follow left/right child pointers from the root, discarding a subtree per comparison.',
    false,
    [
      {
        id: 'bst-balanced',
        label: 'Balanced tree',
        caseType: 'average',
        timeComplexity: 'O(log n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Iterative descent, tree built by insertion order',
        assumptions: [distinctAssumption, 'Insertion order produced a roughly balanced tree.'],
        description: 'Each comparison descends one level of a log-depth tree.'
      },
      {
        id: 'bst-skewed',
        label: 'Degenerate (skewed) tree',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Iterative descent, tree built by insertion order',
        assumptions: [distinctAssumption, 'Sorted insertion order chained every node one-sided.'],
        description: 'A skewed BST is a linked list in disguise: one comparison per node.'
      }
    ]
  ),
  strategy(
    'hash',
    'Hash Lookup',
    'Hash the target straight to its bucket, then compare only that chain.',
    false,
    [
      {
        id: 'hash-expected',
        label: 'Expected — uniform hashing',
        caseType: 'expected',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: `Chaining, h(k) = k mod ${SEARCH_HASH_BUCKETS}`,
        assumptions: [
          distinctAssumption,
          'Keys distribute uniformly and the load factor is bounded.'
        ],
        description:
          'The bucket is computed, not searched for; its expected chain length is constant.'
      },
      {
        id: 'hash-worst',
        label: 'Worst — every key collides',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: `Chaining, h(k) = k mod ${SEARCH_HASH_BUCKETS}`,
        assumptions: [distinctAssumption, 'All keys hash into one bucket.'],
        description: 'A degenerate distribution reduces the table to a single chain.'
      }
    ]
  )
] as const;

export function getSearchStrategyMetadata(strategyId: SearchStrategy): SearchStrategyMetadata {
  const metadata = SEARCH_STRATEGIES.find((candidate) => candidate.id === strategyId);
  if (!metadata) throw new Error(`Unknown search strategy: ${String(strategyId)}`);
  return metadata;
}

interface BstNode {
  id: string;
  value: number;
  left: string | null;
  right: string | null;
  depth: number;
  inorder: number;
}

interface RuntimeState {
  strategy: SearchStrategy;
  array: number[];
  left: number | null;
  right: number | null;
  mid: number | null;
  i: number | null;
  depth: number;
  nodes: BstNode[];
  currentNode: string | null;
  buckets: number[][];
  homeBucket: number | null;
  chainPosition: number | null;
  comparedValues: number[];
  result: TraceValue;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  strategy: SearchStrategy;
  values: number[];
  displayValues: number[];
  target: number;
}

interface SelectedCase extends SearchStrategyComplexityCase {
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

function hashOf(key: number): number {
  return ((key % SEARCH_HASH_BUCKETS) + SEARCH_HASH_BUCKETS) % SEARCH_HASH_BUCKETS;
}

function buildBst(values: readonly number[]): BstNode[] {
  const nodes: BstNode[] = [];
  for (const value of values) {
    const id = `T${nodes.length + 1}`;
    if (nodes.length === 0) {
      nodes.push({ id, value, left: null, right: null, depth: 0, inorder: 0 });
      continue;
    }
    let cursor = nodes[0];
    let depth = 0;
    for (;;) {
      depth++;
      if (value < cursor.value) {
        if (cursor.left === null) {
          cursor.left = id;
          nodes.push({ id, value, left: null, right: null, depth, inorder: 0 });
          break;
        }
        cursor = nodes.find((node) => node.id === cursor.left)!;
      } else {
        if (cursor.right === null) {
          cursor.right = id;
          nodes.push({ id, value, left: null, right: null, depth, inorder: 0 });
          break;
        }
        cursor = nodes.find((node) => node.id === cursor.right)!;
      }
    }
  }
  // Assign in-order x positions for the grid layout.
  let position = 0;
  function walk(id: string | null) {
    if (!id) return;
    const node = nodes.find((candidate) => candidate.id === id)!;
    walk(node.left);
    node.inorder = position++;
    walk(node.right);
  }
  if (nodes.length) walk(nodes[0].id);
  return nodes;
}

export function bstHeight(values: readonly number[]): number {
  const nodes = buildBst(values);
  return nodes.reduce((maximum, node) => Math.max(maximum, node.depth), 0);
}

function resolveConfig(input: SearchingConfig): ResolvedConfig {
  if (!SEARCH_STRATEGIES.some((candidate) => candidate.id === input.strategy)) {
    throw new Error(`Unsupported search strategy: ${String(input.strategy)}`);
  }
  if (
    !Array.isArray(input.values) ||
    input.values.length < 2 ||
    input.values.length > SEARCHING_INPUT_MAX
  ) {
    throw new RangeError(`Use 2–${SEARCHING_INPUT_MAX} values so every comparison stays visible.`);
  }
  if (input.values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new TypeError('Search values must be non-negative safe integers.');
  }
  if (new Set(input.values).size !== input.values.length) {
    throw new RangeError('Values must be distinct so each search has one well-defined answer.');
  }
  const metadata = getSearchStrategyMetadata(input.strategy);
  const displayValues = metadata.requiresSorted
    ? [...input.values].sort((a, b) => a - b)
    : [...input.values];
  const target = input.target ?? displayValues[Math.floor(displayValues.length / 2)];
  if (!Number.isSafeInteger(target) || target < 0) {
    throw new TypeError('The target must be a non-negative safe integer.');
  }
  return { strategy: input.strategy, values: [...input.values], displayValues, target };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const buckets: number[][] = Array.from({ length: SEARCH_HASH_BUCKETS }, () => []);
  if (config.strategy === 'hash') {
    for (const value of config.displayValues) buckets[hashOf(value)].push(value);
  }
  return {
    strategy: config.strategy,
    array: [...config.displayValues],
    left: null,
    right: null,
    mid: null,
    i: null,
    depth: 0,
    nodes: config.strategy === 'bst' ? buildBst(config.displayValues) : [],
    currentNode: null,
    buckets,
    homeBucket: null,
    chainPosition: null,
    comparedValues: [],
    result: null,
    cumulativeWork: {},
    operationCount: 0
  };
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    strategy: config.strategy,
    target: config.target,
    array: [...state.array],
    left: state.left,
    right: state.right,
    mid: state.mid,
    i: state.i,
    depth: state.depth,
    nodes: state.nodes.map((node) => ({ ...node })) as unknown as TraceValue,
    currentNode: state.currentNode,
    buckets: state.buckets.map((chain) => [...chain]),
    homeBucket: state.homeBucket,
    chainPosition: state.chainPosition,
    comparedValues: [...state.comparedValues],
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = state.array.map((value, index) => ({
    id: `cell-${index}`,
    type: 'array-cell',
    label: `a[${index}]`,
    value,
    metadata: {
      compared: state.comparedValues.includes(value),
      isMid: state.mid === index,
      inRange:
        state.left !== null && state.right !== null
          ? index >= state.left && index <= state.right
          : true
    }
  }));
  for (const node of state.nodes) {
    entities.push({
      id: node.id,
      type: 'node',
      label: node.id,
      value: node.value,
      metadata: { left: node.left, right: node.right, depth: node.depth }
    });
  }
  entities.push({
    id: 'operation-count',
    type: 'variable',
    label: 'exact operations',
    value: state.operationCount
  });
  return entities;
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  for (const field of [
    'left',
    'right',
    'mid',
    'i',
    'depth',
    'currentNode',
    'homeBucket',
    'chainPosition',
    'result',
    'comparedValues'
  ]) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      mutations.push({
        entityId: field,
        property: 'value',
        previousValue: before[field],
        nextValue: after[field],
        animation: 'highlight'
      });
    }
  }
  return mutations;
}

export interface SearchingMistakeMetadata {
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
): { prediction: PredictionChallenge; mistake: SearchingMistakeMetadata } {
  return {
    prediction: {
      id,
      prompt,
      type,
      correctAnswer,
      explanation,
      misconceptionTags: [tag],
      xpReward: 10
    },
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
  let peakAuxiliary = 0;
  let peakOutput = 0;

  const add: TraceBuilder['add'] = (
    semantic,
    title,
    explanation,
    stepWork,
    mutate = () => {},
    checkpoint
  ) => {
    const before = traceState(state, config);
    mutate(state);
    const exactOperationCount = totalWork(stepWork);
    state.cumulativeWork = addWork(state.cumulativeWork, stepWork);
    state.operationCount += exactOperationCount;
    const after = traceState(state, config);

    const cursorAuxiliary = [
      state.left,
      state.mid,
      state.i,
      state.currentNode,
      state.homeBucket
    ].filter((value) => value !== null).length;
    const auxiliaryCurrent =
      config.strategy === 'binary-recursive' ? state.depth : Math.min(3, cursorAuxiliary);
    const outputCurrent = state.result === null ? 0 : 1;
    peakAuxiliary = Math.max(peakAuxiliary, auxiliaryCurrent);
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
        auxiliary: {
          current: auxiliaryCurrent,
          peak: peakAuxiliary,
          unit: config.strategy === 'binary-recursive' ? 'stack frames' : 'cursors'
        },
        output: { current: outputCurrent, peak: peakOutput, unit: 'reported values' },
        callStackDepth: config.strategy === 'binary-recursive' ? Math.max(1, state.depth) : 1
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

    const visualFocus: string[] = [];
    if (state.mid !== null) visualFocus.push(`cell-${state.mid}`);
    if (state.i !== null) visualFocus.push(`cell-${state.i}`);
    if (state.currentNode) visualFocus.push(state.currentNode);

    steps.push({
      id: `search-${config.strategy}-${steps.length}`,
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
        swaps: 0
      },
      complexityEvidence,
      metadata: {
        strategy: config.strategy,
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

function quad(
  semantic: string | undefined,
  c: string,
  cpp: string,
  java: string,
  python: string
): QuadSourceLine {
  return { semantic, c, cpp, java, python };
}

function strategySource(config: ResolvedConfig): QuadSourceLine[] {
  switch (config.strategy) {
    case 'linear':
      return [
        quad(
          undefined,
          'int linear(int a[], int n, int t) {',
          'int linear(const int* a, int n, int t) {',
          '  int linear(int[] a, int t) {',
          'def linear(a, t):'
        ),
        quad(
          'scan-check',
          '  for (int i = 0; i < n; ++i)',
          '  for (int i = 0; i < n; ++i)',
          '    for (int i = 0; i < a.length; i++)',
          '    for i in range(len(a)):'
        ),
        quad(
          'scan-compare',
          '    if (a[i] == t) return i;',
          '    if (a[i] == t) return i;',
          '      if (a[i] == t) return i;',
          '        if a[i] == t: return i'
        ),
        quad('report-missing', '  return -1;', '  return -1;', '    return -1;', '    return -1'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'binary-iterative':
      return [
        quad(
          undefined,
          'int bsearch_it(int a[], int n, int t) {',
          'int bsearch_it(const int* a, int n, int t) {',
          '  int bsearchIt(int[] a, int t) {',
          'def bsearch_it(a, t):'
        ),
        quad(
          'init-range',
          '  int lo = 0, hi = n - 1;',
          '  int lo = 0, hi = n - 1;',
          '    int lo = 0, hi = a.length - 1;',
          '    lo, hi = 0, len(a) - 1'
        ),
        quad(
          'check-range',
          '  while (lo <= hi) {',
          '  while (lo <= hi) {',
          '    while (lo <= hi) {',
          '    while lo <= hi:'
        ),
        quad(
          'take-mid',
          '    int mid = lo + (hi - lo) / 2;',
          '    int mid = lo + (hi - lo) / 2;',
          '      int mid = lo + (hi - lo) / 2;',
          '        mid = (lo + hi) // 2'
        ),
        quad(
          'compare-mid',
          '    if (a[mid] == t) return mid;',
          '    if (a[mid] == t) return mid;',
          '      if (a[mid] == t) return mid;',
          '        if a[mid] == t: return mid'
        ),
        quad(
          'discard-half',
          '    if (a[mid] < t) lo = mid + 1; else hi = mid - 1;',
          '    if (a[mid] < t) lo = mid + 1; else hi = mid - 1;',
          '      if (a[mid] < t) lo = mid + 1; else hi = mid - 1;',
          '        if a[mid] < t: lo = mid + 1\n        else: hi = mid - 1'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad('report-missing', '  return -1;', '  return -1;', '    return -1;', '    return -1'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'binary-recursive':
      return [
        quad(
          undefined,
          'int bsearch_rec(int a[], int lo, int hi, int t) {',
          'int bsearch_rec(const int* a, int lo, int hi, int t) {',
          '  int bsearchRec(int[] a, int lo, int hi, int t) {',
          'def bsearch_rec(a, lo, hi, t):'
        ),
        quad(
          'check-range',
          '  if (lo > hi) return -1;      /* base case */',
          '  if (lo > hi) return -1;      // base case',
          '    if (lo > hi) return -1;    // base case',
          '    if lo > hi: return -1  # base case'
        ),
        quad(
          'take-mid',
          '  int mid = lo + (hi - lo) / 2;',
          '  int mid = lo + (hi - lo) / 2;',
          '    int mid = lo + (hi - lo) / 2;',
          '    mid = (lo + hi) // 2'
        ),
        quad(
          'compare-mid',
          '  if (a[mid] == t) return mid;',
          '  if (a[mid] == t) return mid;',
          '    if (a[mid] == t) return mid;',
          '    if a[mid] == t: return mid'
        ),
        quad(
          'recurse-half',
          '  if (a[mid] < t) return bsearch_rec(a, mid + 1, hi, t);',
          '  if (a[mid] < t) return bsearch_rec(a, mid + 1, hi, t);',
          '    if (a[mid] < t) return bsearchRec(a, mid + 1, hi, t);',
          '    if a[mid] < t: return bsearch_rec(a, mid + 1, hi, t)'
        ),
        quad(
          'recurse-half-left',
          '  return bsearch_rec(a, lo, mid - 1, t);   /* new stack frame */',
          '  return bsearch_rec(a, lo, mid - 1, t);  // new stack frame',
          '    return bsearchRec(a, lo, mid - 1, t); // new stack frame',
          '    return bsearch_rec(a, lo, mid - 1, t)  # new stack frame'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'bst':
      return [
        quad(
          undefined,
          'Node* find(Node* root, int t) {',
          'Node* find(Node* root, int t) {',
          '  Node find(Node root, int t) {',
          'def find(root, t):'
        ),
        quad(
          'descend-init',
          '  Node* cur = root;',
          '  Node* cur = root;',
          '    Node cur = root;',
          '    cur = root'
        ),
        quad(
          'descend-check',
          '  while (cur != NULL) {',
          '  while (cur != nullptr) {',
          '    while (cur != null) {',
          '    while cur is not None:'
        ),
        quad(
          'compare-node',
          '    if (t == cur->value) return cur;',
          '    if (t == cur->value) return cur;',
          '      if (t == cur.value) return cur;',
          '        if t == cur.value: return cur'
        ),
        quad(
          'descend-child',
          '    cur = (t < cur->value) ? cur->left : cur->right;',
          '    cur = (t < cur->value) ? cur->left : cur->right;',
          '      cur = (t < cur.value) ? cur.left : cur.right;',
          '        cur = cur.left if t < cur.value else cur.right'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'report-missing',
          '  return NULL;',
          '  return nullptr;',
          '    return null;',
          '    return None'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'hash':
      return [
        quad(
          undefined,
          'bool contains(Table* t, int key) {',
          'bool contains(Table& t, int key) {',
          '  boolean contains(int key) {',
          'def contains(self, key):'
        ),
        quad(
          'hash-key',
          `  int b = key % ${SEARCH_HASH_BUCKETS};            /* h(k) = k mod m */`,
          `  int b = key % ${SEARCH_HASH_BUCKETS};             // h(k) = k mod m`,
          `    int b = key % ${SEARCH_HASH_BUCKETS};           // h(k) = k mod m`,
          `    b = key % ${SEARCH_HASH_BUCKETS}  # h(k) = k mod m`
        ),
        quad(
          'scan-chain',
          '  for (Node* c = t->bucket[b]; c; c = c->next)',
          '  for (Node* c = t.bucket[b]; c; c = c->next)',
          '    for (Node c = bucket[b]; c != null; c = c.next)',
          '        for existing in self.bucket[b]:'
        ),
        quad(
          'compare-key',
          '    if (c->key == key) return true;',
          '    if (c->key == key) return true;',
          '      if (c.key == key) return true;',
          '            if existing == key: return True'
        ),
        quad(
          'report-missing',
          '  return false;',
          '  return false;',
          '    return false;',
          '        return False'
        )
      ];
  }
}

function sourceLines(config: ResolvedConfig, language: SupportedLanguage): SourceLine[] {
  return strategySource(config).map((line, index) => ({
    id: `${config.strategy}-${index + 1}`,
    number: index + 1,
    text: line[language],
    ...(line.semantic ? { semanticOperationId: line.semantic } : {})
  }));
}

/** Exact value comparisons each strategy needs for this input and target. */
export function comparisonScoreboard(
  values: readonly number[],
  target: number
): Record<SearchStrategy, number> {
  const sorted = [...values].sort((a, b) => a - b);
  let linear = 0;
  for (const value of values) {
    linear++;
    if (value === target) break;
  }
  let binary = 0;
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    binary++;
    if (sorted[mid] === target) break;
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  const nodes = buildBst(values);
  let bst = 0;
  let cursor: BstNode | undefined = nodes[0];
  while (cursor) {
    bst++;
    if (cursor.value === target) break;
    const nextId: string | null = target < cursor.value ? cursor.left : cursor.right;
    cursor = nodes.find((node) => node.id === nextId);
  }
  const chain = values.filter((value) => hashOf(value) === hashOf(target));
  let hash = 0;
  for (const value of chain) {
    hash++;
    if (value === target) break;
  }
  if (chain.length === 0) hash = 0;
  return {
    linear,
    'binary-iterative': binary,
    'binary-recursive': binary,
    bst,
    hash
  };
}

function deriveComplexity(caseId: string, config: ResolvedConfig): string[] {
  const n = config.values.length;
  const halvings = Math.floor(Math.log2(n)) + 1;
  switch (caseId) {
    case 'binary-iterative-worst':
      return [
        `Each midpoint comparison discards half the remaining range: ${n} → ${Math.floor(n / 2)} → …`,
        `At most ⌊log₂ ${n}⌋ + 1 = ${halvings} midpoints are ever inspected.`,
        'Halving until one element remains is the definition of O(log n); two bounds are O(1) space.'
      ];
    case 'binary-recursive-worst':
      return [
        `The same ${halvings}-halving argument bounds time at O(log n).`,
        'But every recursive call keeps a live stack frame until the answer returns.',
        'Peak call depth equals the number of halvings: O(log n) auxiliary space — the cost of the recursive style.'
      ];
    case 'bst-balanced':
      return [
        'Each comparison discards one subtree, descending one level.',
        'A balanced tree over n keys has ⌈log₂(n+1)⌉ levels.',
        'One comparison per level is O(log n) time with two pointers of O(1) space.'
      ];
    case 'bst-skewed':
      return [
        'Sorted insertion order gave every node a single child: the tree is a chain.',
        `Descending the chain compares up to all ${n} nodes.`,
        'Without balancing, a BST degrades to O(n) — the reason AVL and red-black trees exist.'
      ];
    case 'hash-expected':
      return [
        `h(target) = target mod ${SEARCH_HASH_BUCKETS} lands on the bucket with one arithmetic step.`,
        'Under uniform hashing the expected chain length is the load factor, a constant.',
        'Constant expected comparisons is expected O(1) — no other strategy skips the search entirely.'
      ];
    case 'hash-worst':
      return [
        'Every key hashed into the same bucket.',
        `The single chain holds all ${n} keys, and each may need a comparison.`,
        'A degenerate hash reduces lookup to a linear scan: O(n).'
      ];
    case 'linear-best':
      return [
        'The first slot matches.',
        'One comparison finishes the search.',
        'A bounded count is O(1).'
      ];
    default:
      return [
        'The scan advances one slot per comparison with no way to skip ahead.',
        `Up to ${n} comparisons may be needed.`,
        'Work linear in n with a single cursor: O(n) time, O(1) space.'
      ];
  }
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const sorted = config.displayValues;
  let caseId: string;
  switch (config.strategy) {
    case 'linear': {
      const foundIndex = config.displayValues.indexOf(config.target);
      caseId =
        foundIndex === 0
          ? 'linear-best'
          : foundIndex > 0 && foundIndex < sorted.length - 1
            ? 'linear-average'
            : 'linear-worst';
      break;
    }
    case 'binary-iterative': {
      const mid = Math.floor((sorted.length - 1) / 2);
      caseId = sorted[mid] === config.target ? 'binary-iterative-best' : 'binary-iterative-worst';
      break;
    }
    case 'binary-recursive':
      caseId = 'binary-recursive-worst';
      break;
    case 'bst': {
      const height = bstHeight(config.displayValues);
      caseId =
        height >= config.displayValues.length - 1 && config.displayValues.length > 2
          ? 'bst-skewed'
          : 'bst-balanced';
      break;
    }
    case 'hash': {
      const chain = config.displayValues.filter((value) => hashOf(value) === hashOf(config.target));
      caseId =
        config.displayValues.length > 2 &&
        chain.length >= Math.ceil(config.displayValues.length * 0.75)
          ? 'hash-worst'
          : 'hash-expected';
      break;
    }
  }
  const metadata = getSearchStrategyMetadata(config.strategy);
  const selected = metadata.cases.find((candidate) => candidate.id === caseId) ?? metadata.cases[0];
  return { ...selected, derivation: deriveComplexity(selected.id, config) };
}

function runLinear(builder: TraceBuilder, config: ResolvedConfig) {
  const values = config.displayValues;
  const foundIndex = values.indexOf(config.target);
  const checkpoint = makePrediction(
    `search-lab:linear:${config.target}:checkpoint`,
    `How many comparisons does linear search make before finishing? (${config.target} ${foundIndex < 0 ? 'is absent' : `is at index ${foundIndex}`})`,
    'numeric',
    foundIndex < 0 ? values.length : foundIndex + 1,
    foundIndex < 0
      ? `Without order to exploit, all ${values.length} values must be compared before reporting absence.`
      : `Values 0..${foundIndex} are each compared once: ${foundIndex + 1} comparisons.`,
    'off-by-one',
    foundIndex < 0 ? 1 : foundIndex
  );
  let first = true;
  for (let index = 0; index < values.length; index++) {
    builder.add(
      'scan-check',
      `Advance to index ${index}`,
      'The scan cannot skip: nothing about an unsorted array says where the target hides.',
      { write: 1, comparison: 1 },
      (state) => {
        state.i = index;
      },
      first ? checkpoint : undefined
    );
    first = false;
    builder.add(
      'scan-compare',
      `Compare ${values[index]} with ${config.target}`,
      `${values[index]} ${values[index] === config.target ? 'matches — the scan stops' : 'does not match'}.`,
      { read: 1, comparison: 1 },
      (state) => {
        state.comparedValues = [...state.comparedValues, values[index]];
        if (values[index] === config.target) {
          state.result = index;
        }
      }
    );
    if (values[index] === config.target) return;
  }
  builder.add(
    'report-missing',
    'Report absent',
    `All ${values.length} values were compared without a match.`,
    { return: 1 },
    (state) => {
      state.result = -1;
    }
  );
}

function runBinary(builder: TraceBuilder, config: ResolvedConfig, recursive: boolean) {
  const values = config.displayValues;
  const n = values.length;
  const halvings = Math.floor(Math.log2(n)) + 1;
  const checkpoint = recursive
    ? makePrediction(
        `search-lab:binary-recursive:${config.target}:checkpoint`,
        `Iterative and recursive binary search do the SAME comparisons. What differs at ⌊log₂ ${n}⌋ + 1 = ${halvings} halvings?`,
        'text',
        'stack frames',
        `Each recursive call keeps a live stack frame until the result returns: O(log n) auxiliary space, versus O(1) for the loop.`,
        'recursive-base-case',
        'comparisons'
      )
    : makePrediction(
        `search-lab:binary-iterative:${config.target}:checkpoint`,
        `n = ${n}. At most how many midpoints can binary search ever inspect?`,
        'numeric',
        halvings,
        `Each comparison halves the range, so at most ⌊log₂ ${n}⌋ + 1 = ${halvings} midpoints — even if the target is absent.`,
        'loop-boundary',
        n
      );
  builder.add(
    'init-range',
    `Initialize lo = 0, hi = ${n - 1}`,
    recursive
      ? 'The first call covers the whole array; depth counts live stack frames.'
      : 'Two integers bound the search range; they are the only extra memory the loop ever uses.',
    { write: 2 },
    (state) => {
      state.left = 0;
      state.right = n - 1;
      if (recursive) state.depth = 1;
    },
    checkpoint
  );

  let lo = 0;
  let hi = n - 1;
  let found = false;
  while (lo <= hi) {
    const currentLo = lo;
    const currentHi = hi;
    builder.add(
      'check-range',
      `Check range [${currentLo}..${currentHi}]`,
      recursive
        ? `Frame ${builder.state.depth}: lo ≤ hi, so the range is non-empty.`
        : 'lo ≤ hi: the range is non-empty, so a midpoint exists.',
      { comparison: 1 }
    );
    const mid = Math.floor((currentLo + currentHi) / 2);
    builder.add(
      'take-mid',
      `Midpoint index ${mid} holds ${values[mid]}`,
      `mid = ⌊(${currentLo} + ${currentHi}) / 2⌋ = ${mid}.`,
      { read: 1, write: 1 },
      (state) => {
        state.mid = mid;
      }
    );
    builder.add(
      'compare-mid',
      `Compare ${values[mid]} with ${config.target}`,
      values[mid] === config.target
        ? `${values[mid]} matches: found after inspecting only ${builder.state.comparedValues.length + 1} value${builder.state.comparedValues.length === 0 ? '' : 's'}.`
        : values[mid] < config.target
          ? `${values[mid]} < ${config.target}: the target can only be in the right half.`
          : `${values[mid]} > ${config.target}: the target can only be in the left half.`,
      { comparison: 1 },
      (state) => {
        state.comparedValues = [...state.comparedValues, values[mid]];
        if (values[mid] === config.target) state.result = mid;
      }
    );
    if (values[mid] === config.target) {
      found = true;
      break;
    }
    const goRight = values[mid] < config.target;
    lo = goRight ? mid + 1 : lo;
    hi = goRight ? hi : mid - 1;
    builder.add(
      recursive ? (goRight ? 'recurse-half' : 'recurse-half-left') : 'discard-half',
      goRight
        ? `Discard the left half; range becomes [${lo}..${hi}]`
        : `Discard the right half; range becomes [${lo}..${hi}]`,
      recursive
        ? `A new stack frame is pushed for [${lo}..${hi}]; depth grows to ${builder.state.depth + 1}.`
        : `${currentHi - currentLo + 1 - (hi - lo + 1)} value${currentHi - currentLo - (hi - lo) === 1 ? ' is' : 's are'} eliminated without ever being read.`,
      recursive ? { write: 2, comparison: 1 } : { write: 1, comparison: 1 },
      (state) => {
        state.left = lo;
        state.right = hi;
        state.mid = null;
        if (recursive) state.depth += 1;
      }
    );
  }
  if (!found) {
    builder.add(
      'check-range',
      'Range is empty',
      'lo > hi: every possible location has been eliminated.',
      { comparison: 1 }
    );
    builder.add(
      'report-missing',
      'Report absent',
      `${config.target} is not in the array.`,
      { return: 1 },
      (state) => {
        state.result = -1;
      }
    );
  }
  if (recursive) {
    const depth = builder.state.depth;
    builder.add(
      'check-range',
      `Unwind ${depth} stack frame${depth === 1 ? '' : 's'}`,
      `The answer passes back up through every live frame — the O(log n) space the loop never spends.`,
      { return: depth },
      (state) => {
        state.depth = 0;
      }
    );
  }
}

function runBst(builder: TraceBuilder, config: ResolvedConfig) {
  const nodes = builder.state.nodes;
  const height = nodes.reduce((maximum, node) => Math.max(maximum, node.depth), 0);
  const skewed = height >= config.displayValues.length - 1 && config.displayValues.length > 2;
  const checkpoint = makePrediction(
    `search-lab:bst:${config.target}:checkpoint`,
    `This BST was built by inserting ${config.displayValues.join(', ')} in order. Its height is ${height}. Is the search O(log n) or O(n) here?`,
    'text',
    skewed ? 'O(n)' : 'O(log n)',
    skewed
      ? 'Near-sorted insertions chained the nodes one-sided; the tree is effectively a linked list, so descent is O(n).'
      : 'The insertion order kept the tree bushy, so each comparison discards a real subtree: O(log n).',
    'recursive-base-case',
    skewed ? 'O(log n)' : 'O(n)'
  );
  builder.add(
    'descend-init',
    `Start at root ${nodes[0]?.id ?? 'null'}`,
    'BST search never looks at the whole tree — only one root-to-leaf path.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.currentNode = nodes[0]?.id ?? null;
    },
    checkpoint
  );
  let cursor: BstNode | undefined = nodes[0];
  while (cursor) {
    const current: BstNode = cursor;
    builder.add(
      'descend-check',
      `Visit ${current.id} (depth ${current.depth})`,
      `${current.id} holds ${current.value}.`,
      { comparison: 1 },
      (state) => {
        state.currentNode = current.id;
      }
    );
    builder.add(
      'compare-node',
      `Compare ${config.target} with ${current.value}`,
      config.target === current.value
        ? `${config.target} matches at depth ${current.depth}.`
        : config.target < current.value
          ? `${config.target} < ${current.value}: the entire right subtree is discarded unseen.`
          : `${config.target} > ${current.value}: the entire left subtree is discarded unseen.`,
      { read: 1, comparison: 1 },
      (state) => {
        state.comparedValues = [...state.comparedValues, current.value];
        if (config.target === current.value) state.result = current.id;
      }
    );
    if (config.target === current.value) return;
    const nextId: string | null = config.target < current.value ? current.left : current.right;
    builder.add(
      'descend-child',
      nextId ? `Descend to ${nextId}` : 'Reach a null child',
      nextId
        ? `The ${config.target < current.value ? 'left' : 'right'} child pointer is followed.`
        : 'No child exists in the required direction.',
      { 'pointer-read': 1, 'pointer-write': 1 },
      (state) => {
        state.currentNode = nextId;
      }
    );
    cursor = nodes.find((node) => node.id === nextId);
  }
  builder.add(
    'report-missing',
    'Report absent',
    `${config.target} is not in the tree; only one path was inspected.`,
    { return: 1 },
    (state) => {
      state.result = null;
      state.result = 'absent';
    }
  );
}

function runHash(builder: TraceBuilder, config: ResolvedConfig) {
  const home = hashOf(config.target);
  const chain = builder.state.buckets[home];
  const position = chain.indexOf(config.target);
  const checkpoint = makePrediction(
    `search-lab:hash:${config.target}:checkpoint`,
    `m = ${SEARCH_HASH_BUCKETS} buckets. How many of the ${config.displayValues.length} stored keys does hash lookup compare?`,
    'numeric',
    position >= 0 ? position + 1 : chain.length,
    `Only bucket ${home}'s chain (${chain.length} key${chain.length === 1 ? '' : 's'}) is ever touched — hashing computes the location instead of searching for it.`,
    'hash-vs-bucket',
    config.displayValues.length
  );
  builder.add(
    'hash-key',
    `Hash ${config.target}`,
    `h(${config.target}) = ${config.target} mod ${SEARCH_HASH_BUCKETS} = ${home}. One arithmetic step replaces the entire search phase.`,
    { read: 1, write: 1 },
    (state) => {
      state.homeBucket = home;
    },
    checkpoint
  );
  if (chain.length === 0) {
    builder.add(
      'scan-chain',
      `Bucket ${home} is empty`,
      'An empty chain proves absence immediately.',
      { read: 1, comparison: 1 }
    );
    builder.add(
      'report-missing',
      'Report absent',
      `${config.target} is not stored.`,
      { return: 1 },
      (state) => {
        state.result = false;
      }
    );
    return;
  }
  for (let index = 0; index < chain.length; index++) {
    builder.add(
      'scan-chain',
      `Visit chain node ${index + 1}`,
      `Bucket ${home}'s chain is walked in order.`,
      { read: 1, 'loop-iteration': 1 },
      (state) => {
        state.chainPosition = index;
      }
    );
    builder.add(
      'compare-key',
      `Compare ${chain[index]} with ${config.target}`,
      `${chain[index]} ${chain[index] === config.target ? 'matches' : 'does not match'}.`,
      { comparison: 1 },
      (state) => {
        state.comparedValues = [...state.comparedValues, chain[index]];
        if (chain[index] === config.target) state.result = true;
      }
    );
    if (chain[index] === config.target) return;
  }
  builder.add(
    'report-missing',
    'Report absent',
    `The whole chain was compared; the other ${SEARCH_HASH_BUCKETS - 1} buckets were never touched.`,
    { return: 1 },
    (state) => {
      state.result = false;
    }
  );
}

const LESSON_OBJECTIVES = [
  'Compare the exact comparison counts of linear, binary, BST, and hash search on the same input',
  'Explain why halving a sorted range bounds binary search at ⌊log₂ n⌋ + 1 comparisons',
  'Show how recursion trades O(1) for O(log n) auxiliary space, and how a skewed BST degrades to O(n)'
];

export function createSearchingLesson(
  input: SearchingConfig = DEFAULT_SEARCHING_CONFIG
): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));
  switch (config.strategy) {
    case 'linear':
      runLinear(builder, config);
      break;
    case 'binary-iterative':
      runBinary(builder, config, false);
      break;
    case 'binary-recursive':
      runBinary(builder, config, true);
      break;
    case 'bst':
      runBst(builder, config);
      break;
    case 'hash':
      runHash(builder, config);
      break;
  }
  const metadata = getSearchStrategyMetadata(config.strategy);
  return {
    id: 'search-lab',
    subject: 'dsa-1',
    topic: 'Searching',
    title: `Search Lab — ${metadata.label}`,
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
