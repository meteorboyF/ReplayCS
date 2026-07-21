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

export const HASH_TABLE_INPUT_MAX = 8;
export const HASH_TABLE_MAX_BUCKETS = 16;
export const TOMBSTONE = -1;

export type HashTableOperation = 'insert' | 'search' | 'delete' | 'resize';
export type HashTableStrategy = 'chaining' | 'linear-probing';
export type HashTableOperationGroup = 'Modification' | 'Lookup' | 'Growth';

export interface HashTableComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface HashTableOperationMetadata {
  id: HashTableOperation;
  label: string;
  description: string;
  group: HashTableOperationGroup;
  requiresKey: boolean;
  cases: readonly HashTableComplexityCase[];
}

export interface HashTableConfig {
  operation: HashTableOperation;
  strategy: HashTableStrategy;
  keys: number[];
  key?: number;
  bucketCount?: number;
}

export const DEFAULT_HASH_TABLE_CONFIG: HashTableConfig = {
  operation: 'insert',
  strategy: 'chaining',
  keys: [12, 5, 21, 30],
  key: 19,
  bucketCount: 7
};

const uniformHashingAssumption =
  'Expected-case analysis assumes keys distribute uniformly across buckets (simple uniform hashing).';
const modHashAssumption = 'The teaching hash is h(k) = k mod m, where m is the bucket count.';
const boundedPrimitiveAssumption =
  'Each displayed hash computation, comparison, read, write, or allocation is one counted primitive.';

const operation = (
  id: HashTableOperation,
  label: string,
  description: string,
  group: HashTableOperationGroup,
  flags: Partial<Pick<HashTableOperationMetadata, 'requiresKey'>>,
  cases: readonly HashTableComplexityCase[]
): HashTableOperationMetadata => ({
  id,
  label,
  description,
  group,
  requiresKey: false,
  ...flags,
  cases
});

export const HASH_TABLE_OPERATIONS: readonly HashTableOperationMetadata[] = [
  operation(
    'insert',
    'Insert',
    'Hash the key, pick a bucket, then place the key past any collisions.',
    'Modification',
    { requiresKey: true },
    [
      {
        id: 'insert-expected',
        label: 'Expected — short chain / near-empty probe run',
        caseType: 'expected',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Uniform distribution',
        assumptions: [
          modHashAssumption,
          uniformHashingAssumption,
          'The load factor is kept bounded.'
        ],
        description:
          'With uniform hashing, the visited chain or probe run has O(1) expected length.'
      },
      {
        id: 'insert-worst',
        label: 'Worst — every key collides',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Collision-heavy distribution',
        assumptions: [modHashAssumption, 'All stored keys landed in the same bucket or cluster.'],
        description: 'A degenerate distribution turns the table into one long chain or cluster.'
      },
      {
        id: 'insert-resize',
        label: 'Resize triggered — rehash all keys',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(n)',
        implementationVariant: 'Doubled bucket array',
        assumptions: [modHashAssumption, 'The insert pushes the load factor over the threshold.'],
        description: 'Every stored key is rehashed into a new bucket array before the insert lands.'
      },
      {
        id: 'insert-amortized',
        label: 'Amortized over doubling',
        caseType: 'amortized',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Doubled bucket array',
        assumptions: [
          modHashAssumption,
          uniformHashingAssumption,
          'Bucket count doubles on resize.'
        ],
        description: 'Rehash totals form a geometric series, so each insert averages O(1).'
      }
    ]
  ),
  operation(
    'search',
    'Search',
    'Hash the key, then compare along the chain or probe run until found or exhausted.',
    'Lookup',
    { requiresKey: true },
    [
      {
        id: 'search-expected',
        label: 'Expected — short chain / probe run',
        caseType: 'expected',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Uniform distribution',
        assumptions: [
          modHashAssumption,
          uniformHashingAssumption,
          'The load factor is kept bounded.'
        ],
        description: 'Expected chain length is the load factor, a constant.'
      },
      {
        id: 'search-worst',
        label: 'Worst — one long chain or cluster',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Collision-heavy distribution',
        assumptions: [modHashAssumption, 'All stored keys collide into one bucket or cluster.'],
        description: 'Every stored key may need one comparison.'
      }
    ]
  ),
  operation(
    'delete',
    'Delete',
    'Find the key, then unlink it (chaining) or leave a tombstone (probing).',
    'Modification',
    { requiresKey: true },
    [
      {
        id: 'delete-expected',
        label: 'Expected — short chain / probe run',
        caseType: 'expected',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Uniform distribution',
        assumptions: [
          modHashAssumption,
          uniformHashingAssumption,
          'The load factor is kept bounded.'
        ],
        description: 'The search dominates; unlinking or tombstoning is constant.'
      },
      {
        id: 'delete-worst',
        label: 'Worst — one long chain or cluster',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Collision-heavy distribution',
        assumptions: [modHashAssumption, 'All stored keys collide into one bucket or cluster.'],
        description: 'Finding the key may require comparing every stored key first.'
      }
    ]
  ),
  operation(
    'resize',
    'Resize & rehash',
    'Double the bucket array and rehash every stored key into its new bucket.',
    'Growth',
    {},
    [
      {
        id: 'resize-full',
        label: 'All n keys rehash',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(n)',
        implementationVariant: 'Doubled bucket array',
        assumptions: [modHashAssumption, 'The new bucket array is allocated before rehashing.'],
        description: 'Each stored key is hashed once more and placed into the new array.'
      }
    ]
  )
] as const;

export function getHashTableOperationMetadata(
  operationId: HashTableOperation
): HashTableOperationMetadata {
  const metadata = HASH_TABLE_OPERATIONS.find((candidate) => candidate.id === operationId);
  if (!metadata) throw new Error(`Unknown hash-table operation: ${String(operationId)}`);
  return metadata;
}

// Slot content for linear probing: a key, null (never used), or TOMBSTONE (deleted).
type ProbeSlot = number | null;

interface RuntimeState {
  strategy: HashTableStrategy;
  buckets: number[][]; // chaining: bucket -> chain of keys
  slots: ProbeSlot[]; // probing: flat slot table
  oldBuckets: number[][] | null;
  oldSlots: ProbeSlot[] | null;
  bucketCount: number;
  oldBucketCount: number | null;
  size: number;
  hashedKey: number | null;
  homeBucket: number | null;
  probeIndex: number | null;
  chainPosition: number | null;
  comparedKeys: number[];
  tombstones: number[];
  result: TraceValue;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: HashTableOperation;
  strategy: HashTableStrategy;
  keys: number[];
  key: number;
  bucketCount: number;
}

interface SelectedCase extends HashTableComplexityCase {
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

export function hashOf(key: number, bucketCount: number): number {
  return ((key % bucketCount) + bucketCount) % bucketCount;
}

export function loadFactorOf(size: number, bucketCount: number): number {
  return bucketCount === 0 ? 0 : Math.round((size / bucketCount) * 100) / 100;
}

function resolveConfig(input: HashTableConfig): ResolvedConfig {
  if (!HASH_TABLE_OPERATIONS.some((candidate) => candidate.id === input.operation)) {
    throw new Error(`Unsupported hash-table operation: ${String(input.operation)}`);
  }
  if (!Array.isArray(input.keys) || input.keys.length > HASH_TABLE_INPUT_MAX) {
    throw new RangeError(`Use at most ${HASH_TABLE_INPUT_MAX} keys so every bucket stays visible.`);
  }
  if (input.keys.some((key) => !Number.isSafeInteger(key) || key < 0)) {
    throw new TypeError('Hash-table keys must be non-negative safe integers.');
  }
  if (new Set(input.keys).size !== input.keys.length) {
    throw new RangeError('Keys must be distinct; this table stores a set of keys.');
  }
  const bucketCount = input.bucketCount ?? 7;
  if (!Number.isInteger(bucketCount) || bucketCount < 2 || bucketCount > HASH_TABLE_MAX_BUCKETS) {
    throw new RangeError(`Bucket count must be between 2 and ${HASH_TABLE_MAX_BUCKETS}.`);
  }
  const key = input.key ?? 19;
  if (!Number.isSafeInteger(key) || key < 0) {
    throw new TypeError('The operation key must be a non-negative safe integer.');
  }
  if (input.strategy === 'linear-probing' && input.keys.length >= bucketCount) {
    throw new RangeError(
      'Linear probing needs at least one free slot: use fewer keys than buckets.'
    );
  }
  return {
    operation: input.operation,
    strategy: input.strategy,
    keys: [...input.keys],
    key,
    bucketCount
  };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const buckets: number[][] = Array.from({ length: config.bucketCount }, () => []);
  const slots: ProbeSlot[] = Array.from({ length: config.bucketCount }, () => null);
  for (const key of config.keys) {
    const home = hashOf(key, config.bucketCount);
    if (config.strategy === 'chaining') {
      buckets[home].push(key);
    } else {
      let index = home;
      while (slots[index] !== null) index = (index + 1) % config.bucketCount;
      slots[index] = key;
    }
  }
  return {
    strategy: config.strategy,
    buckets,
    slots,
    oldBuckets: null,
    oldSlots: null,
    bucketCount: config.bucketCount,
    oldBucketCount: null,
    size: config.keys.length,
    hashedKey: null,
    homeBucket: null,
    probeIndex: null,
    chainPosition: null,
    comparedKeys: [],
    tombstones: [],
    result: null,
    cumulativeWork: {},
    operationCount: 0
  };
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    strategy: config.strategy,
    key: config.key,
    keys: [...config.keys],
    buckets: state.buckets.map((chain) => [...chain]),
    slots: [...state.slots],
    oldBuckets: state.oldBuckets ? state.oldBuckets.map((chain) => [...chain]) : null,
    oldSlots: state.oldSlots ? [...state.oldSlots] : null,
    bucketCount: state.bucketCount,
    oldBucketCount: state.oldBucketCount,
    size: state.size,
    loadFactor: loadFactorOf(state.size, state.bucketCount),
    hashedKey: state.hashedKey,
    homeBucket: state.homeBucket,
    probeIndex: state.probeIndex,
    chainPosition: state.chainPosition,
    comparedKeys: [...state.comparedKeys],
    tombstones: [...state.tombstones],
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = [];
  if (state.strategy === 'chaining') {
    state.buckets.forEach((chain, index) => {
      entities.push({
        id: `bucket-${index}`,
        type: 'array-cell',
        label: `bucket[${index}]`,
        value: chain.length,
        metadata: {
          chain: [...chain],
          isHome: state.homeBucket === index
        }
      });
    });
  } else {
    state.slots.forEach((slot, index) => {
      entities.push({
        id: `slot-${index}`,
        type: 'array-cell',
        label: `slot[${index}]`,
        value: slot,
        metadata: {
          isHome: state.homeBucket === index,
          isProbe: state.probeIndex === index,
          isTombstone: slot === TOMBSTONE
        }
      });
    });
  }
  entities.push(
    { id: 'var-size', type: 'variable', label: 'size', value: state.size },
    { id: 'var-bucketCount', type: 'variable', label: 'buckets', value: state.bucketCount },
    {
      id: 'var-loadFactor',
      type: 'variable',
      label: 'load factor',
      value: loadFactorOf(state.size, state.bucketCount)
    },
    {
      id: 'operation-count',
      type: 'variable',
      label: 'exact operations',
      value: state.operationCount
    }
  );
  return entities;
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const strategy = before.strategy as HashTableStrategy;

  if (strategy === 'chaining') {
    const beforeBuckets = (before.buckets as number[][]) ?? [];
    const afterBuckets = (after.buckets as number[][]) ?? [];
    const max = Math.max(beforeBuckets.length, afterBuckets.length);
    for (let index = 0; index < max; index++) {
      if (
        JSON.stringify(beforeBuckets[index] ?? []) !== JSON.stringify(afterBuckets[index] ?? [])
      ) {
        mutations.push({
          entityId: `bucket-${index}`,
          property: 'chain',
          previousValue: beforeBuckets[index] ?? [],
          nextValue: afterBuckets[index] ?? [],
          animation: 'highlight'
        });
      }
    }
  } else {
    const beforeSlots = (before.slots as ProbeSlot[]) ?? [];
    const afterSlots = (after.slots as ProbeSlot[]) ?? [];
    const max = Math.max(beforeSlots.length, afterSlots.length);
    for (let index = 0; index < max; index++) {
      if ((beforeSlots[index] ?? null) !== (afterSlots[index] ?? null)) {
        mutations.push({
          entityId: `slot-${index}`,
          property: 'value',
          previousValue: beforeSlots[index] ?? null,
          nextValue: afterSlots[index] ?? null,
          animation: afterSlots[index] === null ? 'remove' : 'highlight'
        });
      }
    }
  }

  for (const field of ['size', 'bucketCount', 'loadFactor', 'homeBucket', 'probeIndex', 'result']) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      mutations.push({
        entityId:
          field === 'result'
            ? 'result'
            : field === 'size'
              ? 'var-size'
              : field === 'bucketCount'
                ? 'var-bucketCount'
                : field === 'loadFactor'
                  ? 'var-loadFactor'
                  : field,
        property: 'value',
        previousValue: before[field],
        nextValue: after[field],
        animation: 'highlight'
      });
    }
  }
  return mutations;
}

export interface HashTableMistakeMetadata {
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
): { prediction: PredictionChallenge; mistake: HashTableMistakeMetadata } {
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

    const bufferAuxiliary =
      (state.oldBuckets ? state.bucketCount : 0) + (state.oldSlots ? state.bucketCount : 0);
    const cursorAuxiliary = [state.homeBucket, state.probeIndex, state.chainPosition].filter(
      (value) => value !== null
    ).length;
    const auxiliaryCurrent = bufferAuxiliary + Math.min(3, cursorAuxiliary);
    const outputCurrent = state.result === null ? 0 : 1;
    peakAuxiliary = Math.max(peakAuxiliary, auxiliaryCurrent);
    peakOutput = Math.max(peakOutput, outputCurrent);

    const complexityEvidence: ComplexityEvidence = {
      caseId: complexityCase.id,
      selectedCase: complexityCase.caseType,
      implementationVariant: complexityCase.implementationVariant,
      inputSize: { n: config.keys.length },
      exactOperationCount,
      cumulativeOperationCount: state.operationCount,
      stepWork: cloneWork(stepWork),
      cumulativeWork: cloneWork(state.cumulativeWork),
      timeComplexity: complexityCase.timeComplexity,
      auxiliarySpace: complexityCase.auxiliarySpace,
      space: {
        auxiliary: { current: auxiliaryCurrent, peak: peakAuxiliary, unit: 'buckets + cursors' },
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

    const visualFocus: string[] = [];
    if (state.homeBucket !== null) {
      visualFocus.push(
        state.strategy === 'chaining' ? `bucket-${state.homeBucket}` : `slot-${state.homeBucket}`
      );
    }
    if (state.probeIndex !== null && state.strategy === 'linear-probing') {
      visualFocus.push(`slot-${state.probeIndex}`);
    }

    steps.push({
      id: `hash-table-${config.operation}-${steps.length}`,
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

function operationSource(config: ResolvedConfig): QuadSourceLine[] {
  const chain = config.strategy === 'chaining';
  switch (config.operation) {
    case 'insert':
      if (chain) {
        return [
          quad(
            undefined,
            'void insert(Table* t, int key) {',
            'void insert(Table& t, int key) {',
            '  void insert(int key) {',
            '    def insert(self, key):'
          ),
          quad(
            'hash-key',
            '  int b = key % t->m;              /* h(k) = k mod m */',
            '  int b = key % t.m;               // h(k) = k mod m',
            '    int b = key % m;               // h(k) = k mod m',
            '        b = key % self.m  # h(k) = k mod m'
          ),
          quad(
            'check-load',
            '  if ((t->n + 1.0) / t->m > 0.75) resize(t);',
            '  if ((t.n + 1.0) / t.m > 0.75) resize(t);',
            '    if ((n + 1.0) / m > 0.75) resize();',
            '        if (self.n + 1) / self.m > 0.75: self._resize()'
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
            '    if (c->key == key) return;    /* already stored */',
            '    if (c->key == key) return;    // already stored',
            '      if (c.key == key) return;    // already stored',
            '            if existing == key: return  # already stored'
          ),
          quad(
            'link-key',
            '  push_front(&t->bucket[b], key);',
            '  t.bucket[b].push_front(key);',
            '    bucket[b].addFirst(key);',
            '        self.bucket[b].append(key)'
          ),
          quad('grow-size', '  t->n++;', '  t.n++;', '    n++;', '        self.n += 1'),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      return [
        quad(
          undefined,
          'void insert(Table* t, int key) {',
          'void insert(Table& t, int key) {',
          '  void insert(int key) {',
          '    def insert(self, key):'
        ),
        quad(
          'hash-key',
          '  int i = key % t->m;              /* h(k) = k mod m */',
          '  int i = key % t.m;               // h(k) = k mod m',
          '    int i = key % m;               // h(k) = k mod m',
          '        i = key % self.m  # h(k) = k mod m'
        ),
        quad(
          'check-load',
          '  if ((t->n + 1.0) / t->m > 0.75) resize(t);',
          '  if ((t.n + 1.0) / t.m > 0.75) resize(t);',
          '    if ((n + 1.0) / m > 0.75) resize();',
          '        if (self.n + 1) / self.m > 0.75: self._resize()'
        ),
        quad(
          'probe-slot',
          '  while (t->slot[i] != EMPTY && t->slot[i] != TOMB) {',
          '  while (t.slot[i] != EMPTY && t.slot[i] != TOMB) {',
          '    while (slot[i] != EMPTY && slot[i] != TOMB) {',
          '        while self.slot[i] not in (EMPTY, TOMB):'
        ),
        quad(
          'compare-key',
          '    if (t->slot[i] == key) return; /* already stored */',
          '    if (t.slot[i] == key) return; // already stored',
          '      if (slot[i] == key) return;  // already stored',
          '            if self.slot[i] == key: return'
        ),
        quad(
          'advance-probe',
          '    i = (i + 1) % t->m;            /* linear probe */',
          '    i = (i + 1) % t.m;             // linear probe',
          '      i = (i + 1) % m;             // linear probe',
          '            i = (i + 1) % self.m  # linear probe'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'link-key',
          '  t->slot[i] = key;',
          '  t.slot[i] = key;',
          '    slot[i] = key;',
          '        self.slot[i] = key'
        ),
        quad('grow-size', '  t->n++;', '  t.n++;', '    n++;', '        self.n += 1'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'search':
      if (chain) {
        return [
          quad(
            undefined,
            'bool search(Table* t, int key) {',
            'bool search(Table& t, int key) {',
            '  boolean search(int key) {',
            '    def search(self, key):'
          ),
          quad(
            'hash-key',
            '  int b = key % t->m;              /* h(k) = k mod m */',
            '  int b = key % t.m;               // h(k) = k mod m',
            '    int b = key % m;               // h(k) = k mod m',
            '        b = key % self.m  # h(k) = k mod m'
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
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      return [
        quad(
          undefined,
          'bool search(Table* t, int key) {',
          'bool search(Table& t, int key) {',
          '  boolean search(int key) {',
          '    def search(self, key):'
        ),
        quad(
          'hash-key',
          '  int i = key % t->m;              /* h(k) = k mod m */',
          '  int i = key % t.m;               // h(k) = k mod m',
          '    int i = key % m;               // h(k) = k mod m',
          '        i = key % self.m  # h(k) = k mod m'
        ),
        quad(
          'probe-slot',
          '  while (t->slot[i] != EMPTY) {    /* tombstones do NOT stop the scan */',
          '  while (t.slot[i] != EMPTY) {     // tombstones do NOT stop the scan',
          '    while (slot[i] != EMPTY) {     // tombstones do NOT stop the scan',
          '        while self.slot[i] != EMPTY:  # tombstones do NOT stop the scan'
        ),
        quad(
          'compare-key',
          '    if (t->slot[i] == key) return true;',
          '    if (t.slot[i] == key) return true;',
          '      if (slot[i] == key) return true;',
          '            if self.slot[i] == key: return True'
        ),
        quad(
          'advance-probe',
          '    i = (i + 1) % t->m;',
          '    i = (i + 1) % t.m;',
          '      i = (i + 1) % m;',
          '            i = (i + 1) % self.m'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'report-missing',
          '  return false;                    /* reached a never-used slot */',
          '  return false;                    // reached a never-used slot',
          '    return false;                  // reached a never-used slot',
          '        return False  # reached a never-used slot'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete':
      if (chain) {
        return [
          quad(
            undefined,
            'bool erase(Table* t, int key) {',
            'bool erase(Table& t, int key) {',
            '  boolean delete(int key) {',
            '    def delete(self, key):'
          ),
          quad(
            'hash-key',
            '  int b = key % t->m;              /* h(k) = k mod m */',
            '  int b = key % t.m;               // h(k) = k mod m',
            '    int b = key % m;               // h(k) = k mod m',
            '        b = key % self.m  # h(k) = k mod m'
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
            '    if (c->key == key) {',
            '    if (c->key == key) {',
            '      if (c.key == key) {',
            '            if existing == key:'
          ),
          quad(
            'unlink-key',
            '      unlink(&t->bucket[b], c); t->n--; return true;',
            '      t.bucket[b].erase(c); t.n--; return true;',
            '        bucket[b].remove(c); n--; return true;',
            '                self.bucket[b].remove(key); self.n -= 1; return True'
          ),
          quad(undefined, '    }', '    }', '      }', ''),
          quad(
            'report-missing',
            '  return false;',
            '  return false;',
            '    return false;',
            '        return False'
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      return [
        quad(
          undefined,
          'bool erase(Table* t, int key) {',
          'bool erase(Table& t, int key) {',
          '  boolean delete(int key) {',
          '    def delete(self, key):'
        ),
        quad(
          'hash-key',
          '  int i = key % t->m;              /* h(k) = k mod m */',
          '  int i = key % t.m;               // h(k) = k mod m',
          '    int i = key % m;               // h(k) = k mod m',
          '        i = key % self.m  # h(k) = k mod m'
        ),
        quad(
          'probe-slot',
          '  while (t->slot[i] != EMPTY) {',
          '  while (t.slot[i] != EMPTY) {',
          '    while (slot[i] != EMPTY) {',
          '        while self.slot[i] != EMPTY:'
        ),
        quad(
          'compare-key',
          '    if (t->slot[i] == key) {',
          '    if (t.slot[i] == key) {',
          '      if (slot[i] == key) {',
          '            if self.slot[i] == key:'
        ),
        quad(
          'tombstone-key',
          '      t->slot[i] = TOMB;           /* NOT empty: keeps probe runs intact */',
          '      t.slot[i] = TOMB;            // NOT empty: keeps probe runs intact',
          '        slot[i] = TOMB;            // NOT empty: keeps probe runs intact',
          '                self.slot[i] = TOMB  # NOT empty: keeps probe runs intact'
        ),
        quad(
          'shrink-size',
          '      t->n--; return true;',
          '      t.n--; return true;',
          '        n--; return true;',
          '                self.n -= 1; return True'
        ),
        quad(undefined, '    }', '    }', '      }', ''),
        quad(
          'advance-probe',
          '    i = (i + 1) % t->m;',
          '    i = (i + 1) % t.m;',
          '      i = (i + 1) % m;',
          '            i = (i + 1) % self.m'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'report-missing',
          '  return false;',
          '  return false;',
          '    return false;',
          '        return False'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'resize':
      return [
        quad(
          undefined,
          'void resize(Table* t) {',
          'void resize(Table& t) {',
          '  void resize() {',
          '    def _resize(self):'
        ),
        quad(
          'alloc-buckets',
          chain
            ? '  Node** bigger = calloc(2 * t->m, sizeof(Node*));'
            : '  int* bigger = make_slots(2 * t->m);',
          chain ? '  auto bigger = new List[2 * t.m];' : '  int* bigger = new_slots(2 * t.m);',
          chain ? '    List[] bigger = new List[2 * m];' : '    int[] bigger = newSlots(2 * m);',
          chain
            ? '        bigger = [[] for _ in range(2 * self.m)]'
            : '        bigger = [EMPTY] * (2 * self.m)'
        ),
        quad(
          'rehash-loop',
          '  for each stored key k:',
          '  for each stored key k:',
          '    for each stored key k:',
          '        for k in self._stored_keys():'
        ),
        quad(
          'rehash-key',
          chain
            ? '    push_front(&bigger[k % (2*t->m)], k);   /* new h(k) */'
            : '    place(bigger, k, k % (2*t->m));          /* new h(k) */',
          chain
            ? '    bigger[k % (2*t.m)].push_front(k);       // new h(k)'
            : '    place(bigger, k, k % (2*t.m));           // new h(k)',
          chain
            ? '      bigger[k % (2*m)].addFirst(k);         // new h(k)'
            : '      place(bigger, k, k % (2*m));           // new h(k)',
          chain
            ? '            bigger[k % (2*self.m)].append(k)  # new h(k)'
            : '            place(bigger, k, k % (2*self.m))  # new h(k)'
        ),
        quad(
          'swap-table',
          '  free_old(t); t->bucket = bigger; t->m *= 2;',
          '  swap(t.bucket, bigger); t.m *= 2;',
          '    bucket = bigger; m *= 2;',
          '        self.bucket = bigger; self.m *= 2'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
  }
}

function sourceLines(config: ResolvedConfig, language: SupportedLanguage): SourceLine[] {
  return operationSource(config).map((line, index) => ({
    id: `${config.operation}-${config.strategy}-${index + 1}`,
    number: index + 1,
    text: line[language],
    ...(line.semantic ? { semanticOperationId: line.semantic } : {})
  }));
}

// The visited chain (chaining) or probe run (probing) length for a key lookup.
function lookupCost(config: ResolvedConfig, state: RuntimeState): number {
  const home = hashOf(config.key, state.bucketCount);
  if (config.strategy === 'chaining') return state.buckets[home].length;
  let index = home;
  let visited = 0;
  while (state.slots[index] !== null && visited < state.bucketCount) {
    visited++;
    if (state.slots[index] === config.key) break;
    index = (index + 1) % state.bucketCount;
  }
  return Math.max(1, visited);
}

function deriveComplexity(caseId: string, config: ResolvedConfig): string[] {
  const n = config.keys.length;
  switch (caseId) {
    case 'insert-expected':
    case 'search-expected':
    case 'delete-expected':
      return [
        'h(k) = k mod m lands the key in its bucket with one arithmetic step.',
        'With uniform hashing, the expected chain or probe-run length is the load factor α = n/m, a constant.',
        'Constant expected work per operation is expected O(1) time with O(1) auxiliary space.'
      ];
    case 'insert-worst':
    case 'search-worst':
    case 'delete-worst':
      return [
        'Every stored key hashed into the same bucket or contiguous cluster.',
        `The scan may compare all ${n} stored keys before finishing.`,
        'A degenerate distribution makes the table behave like a list: worst-case O(n).'
      ];
    case 'insert-resize':
    case 'resize-full':
      return [
        'A new bucket array of twice the size is allocated: O(n) transient auxiliary space.',
        `Each of the ${n} stored keys is hashed once more and placed into the new array.`,
        'One hash + placement per key sums to O(n) time for the whole rehash.'
      ];
    case 'insert-amortized':
      return [
        'Doubling makes resizes exponentially rare: rehash totals form a geometric series bounded by 2n.',
        'Across n inserts, total work stays below 3n primitives.',
        'Averaged over the sequence, each insert is amortized O(1) even though one resize is O(n).'
      ];
    default:
      return ['A bounded primitive count is O(1).'];
  }
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const state = initialRuntime(config);
  const cost = lookupCost(config, state);
  const heavy =
    config.keys.length >= 2 && cost >= Math.max(2, Math.ceil(config.keys.length * 0.75));
  let caseId: string;
  switch (config.operation) {
    case 'insert':
      caseId = heavy ? 'insert-worst' : 'insert-expected';
      break;
    case 'search':
      caseId = heavy ? 'search-worst' : 'search-expected';
      break;
    case 'delete':
      caseId = heavy ? 'delete-worst' : 'delete-expected';
      break;
    case 'resize':
      caseId = 'resize-full';
      break;
  }
  const metadata = getHashTableOperationMetadata(config.operation);
  const selected = metadata.cases.find((candidate) => candidate.id === caseId) ?? metadata.cases[0];
  return { ...selected, derivation: deriveComplexity(selected.id, config) };
}

function addHashStep(
  builder: TraceBuilder,
  config: ResolvedConfig,
  checkpoint?: ReturnType<typeof makePrediction>
) {
  const home = hashOf(config.key, builder.state.bucketCount);
  builder.add(
    'hash-key',
    `Hash ${config.key}`,
    `h(${config.key}) = ${config.key} mod ${builder.state.bucketCount} = ${home}. The bucket is computed, never searched for.`,
    { read: 1, write: 1 },
    (state) => {
      state.hashedKey = config.key;
      state.homeBucket = home;
      if (state.strategy === 'linear-probing') state.probeIndex = home;
    },
    checkpoint
  );
}

function runInsert(builder: TraceBuilder, config: ResolvedConfig) {
  const home = hashOf(config.key, builder.state.bucketCount);
  const collision =
    config.strategy === 'chaining'
      ? builder.state.buckets[home].length > 0
      : builder.state.slots[home] !== null;
  const checkpoint = makePrediction(
    `hash-lab:insert:${config.key}:checkpoint`,
    `m = ${builder.state.bucketCount} buckets. Which bucket index does h(${config.key}) = ${config.key} mod ${builder.state.bucketCount} select?`,
    'numeric',
    home,
    `${config.key} mod ${builder.state.bucketCount} = ${home}. The key's own value never decides the index directly — the hash does.`,
    'hash-vs-bucket',
    config.key % 10
  );
  addHashStep(builder, config, checkpoint);

  const nextLoad = (builder.state.size + 1) / builder.state.bucketCount;
  builder.add(
    'check-load',
    `Check load factor before inserting`,
    `(n + 1) / m = ${builder.state.size + 1}/${builder.state.bucketCount} = ${Math.round(nextLoad * 100) / 100} ${nextLoad > 0.75 ? '> 0.75 — a resize would trigger (trace it with the Resize operation)' : '≤ 0.75, so no resize is needed'}.`,
    { read: 2, comparison: 1 }
  );

  if (config.strategy === 'chaining') {
    const chain = [...builder.state.buckets[home]];
    for (let position = 0; position < chain.length; position++) {
      builder.add(
        'scan-chain',
        `Visit chain node ${position + 1} of bucket ${home}`,
        collision && position === 0
          ? `Bucket ${home} is not empty — this is a collision; the chain must be checked for a duplicate.`
          : `The chain continues, so the scan advances.`,
        { read: 1, 'loop-iteration': 1 },
        (state) => {
          state.chainPosition = position;
        }
      );
      builder.add(
        'compare-key',
        `Compare ${chain[position]} with ${config.key}`,
        `${chain[position]} ${chain[position] === config.key ? 'matches — the key is already stored' : 'does not match, so scanning continues'}.`,
        { comparison: 1 },
        (state) => {
          state.comparedKeys = [...state.comparedKeys, chain[position]];
        }
      );
      if (chain[position] === config.key) {
        builder.add(
          'link-key',
          'Duplicate found',
          'The set already contains the key; nothing changes.',
          { return: 1 },
          (state) => {
            state.result = 'duplicate';
            state.chainPosition = null;
          }
        );
        return;
      }
    }
    builder.add(
      'link-key',
      `Link ${config.key} into bucket ${home}`,
      chain.length === 0
        ? `Bucket ${home} was empty: no collision, a single O(1) link.`
        : `After ${chain.length} comparison${chain.length === 1 ? '' : 's'}, ${config.key} joins the chain.`,
      { write: 1, allocation: 1 },
      (state) => {
        state.buckets[home] = [...state.buckets[home], config.key];
        state.chainPosition = null;
      }
    );
  } else {
    let index = home;
    let probes = 0;
    while (builder.state.slots[index] !== null && builder.state.slots[index] !== TOMBSTONE) {
      const occupant = builder.state.slots[index];
      builder.add(
        'probe-slot',
        `Probe slot ${index}`,
        probes === 0 && occupant !== null
          ? `Slot ${index} is occupied by ${occupant} — a collision; linear probing scans forward.`
          : `Slot ${index} is occupied by ${occupant}; the probe continues.`,
        { read: 1, comparison: 1, 'loop-iteration': 1 },
        (state) => {
          state.probeIndex = index;
        }
      );
      builder.add(
        'compare-key',
        `Compare ${occupant} with ${config.key}`,
        `${occupant} ${occupant === config.key ? 'matches — already stored' : 'does not match'}.`,
        { comparison: 1 },
        (state) => {
          if (occupant !== null && occupant !== TOMBSTONE)
            state.comparedKeys = [...state.comparedKeys, occupant];
        }
      );
      if (occupant === config.key) {
        builder.add(
          'link-key',
          'Duplicate found',
          'The set already contains the key; nothing changes.',
          { return: 1 },
          (state) => {
            state.result = 'duplicate';
          }
        );
        return;
      }
      const nextIndex = (index + 1) % builder.state.bucketCount;
      builder.add(
        'advance-probe',
        `Advance to slot ${nextIndex}`,
        `i = (${index} + 1) mod ${builder.state.bucketCount} = ${nextIndex}.`,
        { write: 1 },
        (state) => {
          state.probeIndex = nextIndex;
        }
      );
      index = nextIndex;
      probes++;
    }
    const landed = builder.state.slots[index] === TOMBSTONE ? 'tombstone' : 'empty';
    builder.add(
      'probe-slot',
      `Slot ${index} is ${landed}`,
      landed === 'tombstone'
        ? `A tombstone marks a deleted key: inserts MAY reuse it, so the probe stops here.`
        : `Slot ${index} has never been used, so the probe stops here.`,
      { read: 1, comparison: 1 },
      (state) => {
        state.probeIndex = index;
      }
    );
    builder.add(
      'link-key',
      `Write ${config.key} into slot ${index}`,
      probes === 0
        ? `The home slot was free: no collision, a single O(1) write.`
        : `After ${probes} probe${probes === 1 ? '' : 's'}, ${config.key} lands ${index === home ? 'at home' : `${probes} slot${probes === 1 ? '' : 's'} from home`}.`,
      { write: 1 },
      (state) => {
        state.tombstones = state.tombstones.filter((slot) => slot !== index);
        state.slots[index] = config.key;
      }
    );
  }
  builder.add(
    'grow-size',
    'Increment size',
    'The key count and load factor both rise.',
    { write: 1 },
    (state) => {
      state.size += 1;
      state.result = config.key;
      state.homeBucket = null;
      state.probeIndex = null;
    }
  );
}

function runSearch(builder: TraceBuilder, config: ResolvedConfig) {
  const home = hashOf(config.key, builder.state.bucketCount);
  const cost = lookupCost(config, builder.state);
  const present =
    config.strategy === 'chaining'
      ? builder.state.buckets[home].includes(config.key)
      : builder.state.slots.includes(config.key);
  const checkpoint = makePrediction(
    `hash-lab:search:${config.key}:checkpoint`,
    `How many stored keys are compared before search(${config.key}) finishes?`,
    'numeric',
    config.strategy === 'chaining'
      ? present
        ? builder.state.buckets[home].indexOf(config.key) + 1
        : builder.state.buckets[home].length
      : cost,
    present
      ? `Only the keys in bucket ${home}'s chain or probe run are compared — never the whole table.`
      : `The whole chain or probe run of bucket ${home} is compared before reporting absence.`,
    'hash-vs-bucket',
    config.keys.length
  );
  addHashStep(builder, config, checkpoint);

  if (config.strategy === 'chaining') {
    const chainKeys = [...builder.state.buckets[home]];
    if (chainKeys.length === 0) {
      builder.add(
        'scan-chain',
        `Bucket ${home} is empty`,
        'An empty chain means the key cannot be present.',
        { read: 1, comparison: 1 }
      );
      builder.add(
        'report-missing',
        'Report absent',
        `${config.key} is not stored; only bucket ${home} was ever inspected.`,
        { return: 1 },
        (state) => {
          state.result = false;
        }
      );
      return;
    }
    for (let position = 0; position < chainKeys.length; position++) {
      builder.add(
        'scan-chain',
        `Visit chain node ${position + 1}`,
        `The chain of bucket ${home} is walked in order.`,
        { read: 1, 'loop-iteration': 1 },
        (state) => {
          state.chainPosition = position;
        }
      );
      builder.add(
        'compare-key',
        `Compare ${chainKeys[position]} with ${config.key}`,
        `${chainKeys[position]} ${chainKeys[position] === config.key ? 'matches' : 'does not match'}.`,
        { comparison: 1 },
        (state) => {
          state.comparedKeys = [...state.comparedKeys, chainKeys[position]];
        }
      );
      if (chainKeys[position] === config.key) {
        builder.add(
          'compare-key',
          `Found ${config.key}`,
          `${position + 1} comparison${position === 0 ? '' : 's'} — the rest of the table was never touched.`,
          { return: 1 },
          (state) => {
            state.result = true;
            state.chainPosition = null;
          }
        );
        return;
      }
    }
    builder.add(
      'report-missing',
      'Report absent',
      `The whole chain (${chainKeys.length} key${chainKeys.length === 1 ? '' : 's'}) was compared without a match.`,
      { return: 1 },
      (state) => {
        state.result = false;
        state.chainPosition = null;
      }
    );
  } else {
    let index = home;
    let visited = 0;
    while (builder.state.slots[index] !== null && visited < builder.state.bucketCount) {
      const occupant = builder.state.slots[index];
      builder.add(
        'probe-slot',
        `Probe slot ${index}`,
        occupant === TOMBSTONE
          ? `Slot ${index} holds a tombstone: the key may still be further along, so the scan continues.`
          : `Slot ${index} is occupied by ${occupant}.`,
        { read: 1, comparison: 1, 'loop-iteration': 1 },
        (state) => {
          state.probeIndex = index;
        }
      );
      if (occupant !== TOMBSTONE) {
        builder.add(
          'compare-key',
          `Compare ${occupant} with ${config.key}`,
          `${occupant} ${occupant === config.key ? 'matches' : 'does not match'}.`,
          { comparison: 1 },
          (state) => {
            if (occupant !== null) state.comparedKeys = [...state.comparedKeys, occupant];
          }
        );
        if (occupant === config.key) {
          builder.add(
            'compare-key',
            `Found ${config.key}`,
            `The probe run ended after ${visited + 1} slot${visited === 0 ? '' : 's'}.`,
            { return: 1 },
            (state) => {
              state.result = true;
            }
          );
          return;
        }
      }
      const nextIndex = (index + 1) % builder.state.bucketCount;
      builder.add(
        'advance-probe',
        `Advance to slot ${nextIndex}`,
        `i = (${index} + 1) mod ${builder.state.bucketCount} = ${nextIndex}.`,
        { write: 1 },
        (state) => {
          state.probeIndex = nextIndex;
        }
      );
      index = nextIndex;
      visited++;
    }
    builder.add(
      'probe-slot',
      `Slot ${index} was never used`,
      'An empty (non-tombstone) slot ends every probe run: the key cannot be beyond it.',
      { read: 1, comparison: 1 },
      (state) => {
        state.probeIndex = index;
      }
    );
    builder.add(
      'report-missing',
      'Report absent',
      `${config.key} is not stored.`,
      { return: 1 },
      (state) => {
        state.result = false;
      }
    );
  }
}

function runDelete(builder: TraceBuilder, config: ResolvedConfig) {
  const home = hashOf(config.key, builder.state.bucketCount);
  const checkpoint =
    config.strategy === 'linear-probing'
      ? makePrediction(
          `hash-lab:delete:${config.key}:checkpoint`,
          `After deleting ${config.key} from a linear-probing table, what is left in its slot?`,
          'text',
          'tombstone',
          'Marking the slot truly empty would cut later probe runs short and make other keys unfindable — a tombstone keeps the run intact.',
          'tombstone-vs-empty',
          'empty'
        )
      : makePrediction(
          `hash-lab:delete:${config.key}:checkpoint`,
          `Which bucket's chain is searched to delete ${config.key} (m = ${builder.state.bucketCount})?`,
          'numeric',
          home,
          `h(${config.key}) = ${config.key} mod ${builder.state.bucketCount} = ${home}; only that chain is touched.`,
          'hash-vs-bucket',
          config.key % 10
        );
  addHashStep(builder, config, checkpoint);

  if (config.strategy === 'chaining') {
    const chainKeys = [...builder.state.buckets[home]];
    for (let position = 0; position < chainKeys.length; position++) {
      builder.add(
        'scan-chain',
        `Visit chain node ${position + 1}`,
        `The chain of bucket ${home} is walked in order.`,
        { read: 1, 'loop-iteration': 1 },
        (state) => {
          state.chainPosition = position;
        }
      );
      builder.add(
        'compare-key',
        `Compare ${chainKeys[position]} with ${config.key}`,
        `${chainKeys[position]} ${chainKeys[position] === config.key ? 'matches' : 'does not match'}.`,
        { comparison: 1 },
        (state) => {
          state.comparedKeys = [...state.comparedKeys, chainKeys[position]];
        }
      );
      if (chainKeys[position] === config.key) {
        builder.add(
          'unlink-key',
          `Unlink ${config.key}`,
          'Chaining removes the node outright — no tombstone is ever needed.',
          { write: 1, deallocation: 1, return: 1 },
          (state) => {
            state.buckets[home] = state.buckets[home].filter((stored) => stored !== config.key);
            state.size -= 1;
            state.result = true;
            state.chainPosition = null;
            state.homeBucket = null;
          }
        );
        return;
      }
    }
    builder.add(
      'report-missing',
      'Report absent',
      `${config.key} was not in bucket ${home}'s chain; nothing changes.`,
      { return: 1 },
      (state) => {
        state.result = false;
        state.chainPosition = null;
      }
    );
  } else {
    let index = home;
    let visited = 0;
    while (builder.state.slots[index] !== null && visited < builder.state.bucketCount) {
      const occupant = builder.state.slots[index];
      builder.add(
        'probe-slot',
        `Probe slot ${index}`,
        occupant === TOMBSTONE
          ? `Slot ${index} holds a tombstone; the scan continues past it.`
          : `Slot ${index} is occupied by ${occupant}.`,
        { read: 1, comparison: 1, 'loop-iteration': 1 },
        (state) => {
          state.probeIndex = index;
        }
      );
      if (occupant !== TOMBSTONE) {
        builder.add(
          'compare-key',
          `Compare ${occupant} with ${config.key}`,
          `${occupant} ${occupant === config.key ? 'matches' : 'does not match'}.`,
          { comparison: 1 },
          (state) => {
            if (occupant !== null) state.comparedKeys = [...state.comparedKeys, occupant];
          }
        );
        if (occupant === config.key) {
          const slotIndex = index;
          builder.add(
            'tombstone-key',
            `Tombstone slot ${slotIndex}`,
            `The slot becomes a tombstone, not empty: probe runs across it must stay unbroken so later keys remain findable.`,
            { write: 1 },
            (state) => {
              state.slots[slotIndex] = TOMBSTONE;
              state.tombstones = [...state.tombstones, slotIndex];
            }
          );
          builder.add(
            'shrink-size',
            'Decrement size',
            'The key count falls but the tombstone still occupies a slot until the next resize.',
            { write: 1, return: 1 },
            (state) => {
              state.size -= 1;
              state.result = true;
              state.homeBucket = null;
              state.probeIndex = null;
            }
          );
          return;
        }
      }
      const nextIndex = (index + 1) % builder.state.bucketCount;
      builder.add(
        'advance-probe',
        `Advance to slot ${nextIndex}`,
        `i = (${index} + 1) mod ${builder.state.bucketCount} = ${nextIndex}.`,
        { write: 1 },
        (state) => {
          state.probeIndex = nextIndex;
        }
      );
      index = nextIndex;
      visited++;
    }
    builder.add(
      'report-missing',
      'Report absent',
      `${config.key} is not stored; nothing changes.`,
      { return: 1 },
      (state) => {
        state.result = false;
      }
    );
  }
}

function runResize(builder: TraceBuilder, config: ResolvedConfig) {
  const oldCount = builder.state.bucketCount;
  const newCount = oldCount * 2;
  const storedKeys =
    config.strategy === 'chaining'
      ? builder.state.buckets.flat()
      : (builder.state.slots.filter((slot) => slot !== null && slot !== TOMBSTONE) as number[]);
  const moving = storedKeys.filter((key) => hashOf(key, newCount) !== hashOf(key, oldCount)).length;
  const checkpoint = makePrediction(
    `hash-lab:resize:${oldCount}:checkpoint`,
    `Doubling m from ${oldCount} to ${newCount}: how many stored keys must be rehashed?`,
    'numeric',
    storedKeys.length,
    `Every stored key is rehashed because h(k) = k mod m changes with m — here ${moving} of ${storedKeys.length} actually land in a different bucket, but all ${storedKeys.length} must be recomputed.`,
    'rehash-scope',
    moving
  );
  builder.add(
    'alloc-buckets',
    `Allocate ${newCount} ${config.strategy === 'chaining' ? 'buckets' : 'slots'}`,
    `The new array is O(n)-sized fresh memory; the old array stays alive during the rehash. Tombstones are NOT copied — resizing purges them.`,
    { allocation: 1 },
    (state) => {
      state.oldBuckets =
        config.strategy === 'chaining' ? state.buckets.map((chain) => [...chain]) : null;
      state.oldSlots = config.strategy === 'linear-probing' ? [...state.slots] : null;
      state.oldBucketCount = oldCount;
      state.bucketCount = newCount;
      state.buckets = Array.from({ length: newCount }, () => []);
      state.slots = Array.from({ length: newCount }, () => null);
      state.tombstones = [];
    },
    checkpoint
  );
  for (const key of storedKeys) {
    const oldHome = hashOf(key, oldCount);
    const newHome = hashOf(key, newCount);
    builder.add(
      'rehash-loop',
      `Take ${key} from the old table`,
      `${key} lived in old bucket ${oldHome}.`,
      { read: 1, 'loop-iteration': 1 },
      (state) => {
        state.hashedKey = key;
      }
    );
    builder.add(
      'rehash-key',
      `Rehash ${key} → bucket ${newHome}`,
      `h(${key}) = ${key} mod ${newCount} = ${newHome}${newHome === oldHome ? ' (unchanged)' : ` (moved from ${oldHome})`}.`,
      { read: 1, write: 1 },
      (state) => {
        state.homeBucket = newHome;
        if (config.strategy === 'chaining') {
          state.buckets[newHome] = [...state.buckets[newHome], key];
        } else {
          let index = newHome;
          while (state.slots[index] !== null) index = (index + 1) % newCount;
          state.slots[index] = key;
          state.probeIndex = index;
        }
      }
    );
  }
  builder.add(
    'swap-table',
    'Release the old array',
    `The table now uses ${newCount} buckets; the load factor halves and every tombstone is gone.`,
    { deallocation: 1, write: 2 },
    (state) => {
      state.oldBuckets = null;
      state.oldSlots = null;
      state.oldBucketCount = null;
      state.hashedKey = null;
      state.homeBucket = null;
      state.probeIndex = null;
      state.result = `rehashed ${storedKeys.length} keys`;
    }
  );
}

const LESSON_OBJECTIVES = [
  'Compute h(k) = k mod m and explain why the bucket is found, not searched for',
  'Compare expected O(1) lookups under uniform hashing with the O(n) collision-heavy worst case',
  'Explain why probing deletes need tombstones and why resizing rehashes every stored key'
];

export function createHashTableLesson(
  input: HashTableConfig = DEFAULT_HASH_TABLE_CONFIG
): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));
  switch (config.operation) {
    case 'insert':
      runInsert(builder, config);
      break;
    case 'search':
      runSearch(builder, config);
      break;
    case 'delete':
      runDelete(builder, config);
      break;
    case 'resize':
      runResize(builder, config);
      break;
  }
  const metadata = getHashTableOperationMetadata(config.operation);
  const strategyLabel = config.strategy === 'chaining' ? 'separate chaining' : 'linear probing';
  return {
    id: 'hash-table-lab',
    subject: 'dsa-1',
    topic: 'Hash Table',
    title: `Hash Table Lab — ${metadata.label} (${strategyLabel})`,
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
