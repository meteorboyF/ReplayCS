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

export const QUEUE_INPUT_MAX = 8;

export type QueueOperation = 'enqueue' | 'dequeue' | 'front' | 'rear';
export type QueueBacking = 'naive-array' | 'circular-array' | 'linked-list';
export type QueueOperationGroup = 'Insertion' | 'Deletion' | 'Inspection';

export interface QueueComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface QueueOperationMetadata {
  id: QueueOperation;
  label: string;
  description: string;
  group: QueueOperationGroup;
  requiresNewValue: boolean;
  cases: readonly QueueComplexityCase[];
}

export interface QueueConfig {
  operation: QueueOperation;
  backing: QueueBacking;
  values: number[];
  capacity?: number;
  newValue?: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  operation: 'dequeue',
  backing: 'naive-array',
  values: [10, 20, 30, 40],
  capacity: 6,
  newValue: 50
};

const operation = (
  id: QueueOperation,
  label: string,
  description: string,
  group: QueueOperationGroup,
  flags: Partial<Pick<QueueOperationMetadata, 'requiresNewValue'>>,
  cases: readonly QueueComplexityCase[]
): QueueOperationMetadata => ({
  id,
  label,
  description,
  group,
  requiresNewValue: false,
  ...flags,
  cases
});

const contiguousAssumption = 'Array elements sit in one contiguous buffer indexed in O(1).';
const rearPointerAssumption =
  'A tail/rear pointer references the last node, so no traversal is needed.';

export const QUEUE_OPERATIONS: readonly QueueOperationMetadata[] = [
  operation(
    'enqueue',
    'Enqueue',
    'Add an element to the rear of the queue.',
    'Insertion',
    { requiresNewValue: true },
    [
      {
        id: 'enqueue-naive-array',
        label: 'Naive array',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Naive array (append at tail index)',
        assumptions: [contiguousAssumption, 'The tail index has not reached capacity.'],
        description: 'Write at the tail index and advance it — the cost is in dequeue, not here.'
      },
      {
        id: 'enqueue-circular-array',
        label: 'Circular array',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Circular buffer (modular rear index)',
        assumptions: [contiguousAssumption, 'size < capacity, so a free slot exists.'],
        description: 'Write at rear, then advance rear modulo capacity to reuse freed front slots.'
      },
      {
        id: 'enqueue-linked-with-rear',
        label: 'Linked list with rear pointer',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linked list with maintained rear pointer',
        assumptions: [rearPointerAssumption],
        description: 'A maintained rear pointer links the new node in constant time.'
      },
      {
        id: 'enqueue-linked-without-rear',
        label: 'Linked list without rear pointer',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linked list without rear pointer',
        assumptions: ['Only head is stored, so the last node must be found by traversal.'],
        description: 'Without a rear pointer the whole list is traversed before linking.'
      }
    ]
  ),
  operation(
    'dequeue',
    'Dequeue',
    'Remove the element from the front of the queue.',
    'Deletion',
    {},
    [
      {
        id: 'dequeue-naive-array',
        label: 'Naive array',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Naive array (shift all left)',
        assumptions: [contiguousAssumption, 'The front is index 0, so every survivor shifts.'],
        description: 'Removing index 0 forces all remaining elements to shift one slot left.'
      },
      {
        id: 'dequeue-circular-array',
        label: 'Circular array',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Circular buffer (advance front index)',
        assumptions: [contiguousAssumption, 'The queue is not empty.'],
        description: 'Advance the front index modulo capacity; nothing shifts.'
      },
      {
        id: 'dequeue-linked-list',
        label: 'Linked list',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linked list (advance head)',
        assumptions: ['The queue is not empty.'],
        description: 'Advance head to its successor and release the old head.'
      }
    ]
  ),
  operation(
    'front',
    'Front (peek)',
    'View the first element without removing it.',
    'Inspection',
    {},
    [
      {
        id: 'front-all',
        label: 'All implementations',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Direct front access',
        assumptions: ['The queue is not empty.'],
        description: 'The front element is read directly via the head index or pointer.'
      }
    ]
  ),
  operation('rear', 'Rear (peek)', 'View the last element without removing it.', 'Inspection', {}, [
    {
      id: 'rear-all',
      label: 'All implementations',
      caseType: 'worst',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Direct rear access',
      assumptions: ['The queue is not empty.', 'A tail index or rear pointer is maintained.'],
      description: 'The rear element is read directly via the tail index or rear pointer.'
    }
  ])
];

export function getQueueOperationMetadata(operationId: QueueOperation): QueueOperationMetadata {
  const metadata = QUEUE_OPERATIONS.find((c) => c.id === operationId);
  if (!metadata) throw new Error(`Unknown queue operation: ${String(operationId)}`);
  return metadata;
}

interface RuntimeNode {
  id: string;
  value: number;
  next: string | null;
  status: 'live' | 'allocated' | 'detached' | 'deleted';
}

interface RuntimeState {
  backing: QueueBacking;
  maintainRear: boolean;
  array: (number | null)[];
  capacity: number;
  headIndex: number;
  tailIndex: number;
  size: number;
  nodes: RuntimeNode[];
  headId: string | null;
  tailId: string | null;
  current: string | null;
  readIndex: number | null;
  writeIndex: number | null;
  shifted: number[];
  result: TraceValue;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: QueueOperation;
  backing: QueueBacking;
  values: number[];
  capacity: number;
  newValue: number;
  maintainRear: boolean;
}

interface SelectedCase extends QueueComplexityCase {
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

function nodeId(index: number): string {
  return `N${index + 1}`;
}

function cloneNodes(nodes: RuntimeNode[]): RuntimeNode[] {
  return nodes.map((node) => ({ ...node }));
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    backing: config.backing,
    maintainRear: state.maintainRear,
    values: [...config.values],
    newValue: config.newValue,
    array: [...state.array],
    capacity: state.capacity,
    headIndex: state.headIndex,
    tailIndex: state.tailIndex,
    size: state.size,
    nodes: cloneNodes(state.nodes) as unknown as TraceValue,
    headId: state.headId,
    tailId: state.tailId,
    current: state.current,
    readIndex: state.readIndex,
    writeIndex: state.writeIndex,
    shifted: [...state.shifted],
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function resolveConfig(input: QueueConfig): ResolvedConfig {
  if (!QUEUE_OPERATIONS.some((c) => c.id === input.operation)) {
    throw new Error(`Unsupported queue operation: ${String(input.operation)}`);
  }
  if (!Array.isArray(input.values) || input.values.length > QUEUE_INPUT_MAX) {
    throw new RangeError(`Use at most ${QUEUE_INPUT_MAX} values so every slot stays visible.`);
  }
  if (input.values.some((value) => !Number.isSafeInteger(value))) {
    throw new TypeError('Queue values must be safe integers.');
  }
  const capacity = input.capacity ?? Math.max(6, input.values.length + 2);
  if (input.backing !== 'linked-list' && input.values.length > capacity) {
    throw new RangeError('Initial values exceed array capacity.');
  }
  // The linked-list enqueue comparison is driven by whether a rear pointer is maintained;
  // encode "without rear" as a negative capacity sentinel from the page toggle.
  const maintainRear = input.capacity !== -1;
  return {
    operation: input.operation,
    backing: input.backing,
    values: [...input.values],
    capacity: capacity <= 0 ? Math.max(6, input.values.length + 2) : capacity,
    newValue: input.newValue ?? 99,
    maintainRear
  };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const isList = config.backing === 'linked-list';
  const nodes: RuntimeNode[] = isList
    ? config.values.map((val, idx) => ({
        id: nodeId(idx),
        value: val,
        next: idx + 1 < config.values.length ? nodeId(idx + 1) : null,
        status: 'live'
      }))
    : [];

  const array = new Array<number | null>(config.capacity).fill(null);
  let headIndex = 0;
  let tailIndex = 0;
  const size = config.values.length;

  if (!isList) {
    if (config.backing === 'circular-array') {
      // Start the window offset from 0 so the wrap-around is visible.
      headIndex = Math.min(2, Math.max(0, config.capacity - size));
      for (let i = 0; i < size; i++) {
        array[(headIndex + i) % config.capacity] = config.values[i];
      }
      tailIndex = (headIndex + size) % config.capacity;
    } else {
      for (let i = 0; i < size; i++) array[i] = config.values[i];
      tailIndex = size;
    }
  }

  return {
    backing: config.backing,
    maintainRear: config.maintainRear,
    array,
    capacity: config.capacity,
    headIndex,
    tailIndex,
    size,
    nodes,
    headId: nodes.length > 0 ? nodes[0].id : null,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
    current: null,
    readIndex: null,
    writeIndex: null,
    shifted: [],
    result: null,
    cumulativeWork: {},
    operationCount: 0
  };
}

const queuePointerFields = ['headId', 'tailId', 'current'] as const;
const queueIndexFields = ['headIndex', 'tailIndex', 'size', 'capacity'] as const;

function entitiesFor(state: RuntimeState): TraceEntity[] {
  if (state.backing === 'linked-list') {
    const nodes: TraceEntity[] = state.nodes.map((node) => ({
      id: node.id,
      type: 'node',
      label: node.id,
      value: node.value,
      metadata: {
        next: node.next,
        status: node.status,
        isHead: state.headId === node.id,
        isTail: state.tailId === node.id
      }
    }));
    const pointers: TraceEntity[] = queuePointerFields.map((pointer) => ({
      id: `pointer-${pointer}`,
      type: 'pointer',
      label: pointer,
      value: state[pointer],
      metadata: { target: state[pointer] }
    }));
    return [
      ...nodes,
      ...pointers,
      {
        id: 'operation-count',
        type: 'variable',
        label: 'exact operations',
        value: state.operationCount
      }
    ];
  }
  const arrayElements: TraceEntity[] = state.array.map((value, index) => ({
    id: `array-${index}`,
    type: 'array-cell',
    label: `[${index}]`,
    value,
    metadata: {
      isHead: state.headIndex === index && state.size > 0,
      isTail: (state.tailIndex - 1 + state.capacity) % state.capacity === index && state.size > 0,
      isRead: state.readIndex === index,
      isWrite: state.writeIndex === index,
      shifted: state.shifted.includes(index)
    }
  }));
  const indices: TraceEntity[] = queueIndexFields.map((indexField) => ({
    id: `index-${indexField}`,
    type: 'variable',
    label: indexField,
    value: state[indexField]
  }));
  return [
    ...arrayElements,
    ...indices,
    {
      id: 'operation-count',
      type: 'variable',
      label: 'exact operations',
      value: state.operationCount
    }
  ];
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const backing = before.backing as QueueBacking;

  if (backing === 'linked-list') {
    for (const pointer of queuePointerFields) {
      if (before[pointer] !== after[pointer]) {
        mutations.push({
          entityId: `pointer-${pointer}`,
          property: 'target',
          previousValue: before[pointer],
          nextValue: after[pointer],
          animation: 'move'
        });
      }
    }
    const beforeNodes = new Map(
      ((before.nodes as unknown as RuntimeNode[]) ?? []).map((node) => [node.id, node])
    );
    const afterNodes = (after.nodes as unknown as RuntimeNode[]) ?? [];
    for (const node of afterNodes) {
      const prior = beforeNodes.get(node.id);
      if (!prior) {
        mutations.push({
          entityId: node.id,
          property: 'node',
          previousValue: null,
          nextValue: { ...node },
          animation: 'insert'
        });
        continue;
      }
      if (prior.next !== node.next) {
        mutations.push({
          entityId: node.id,
          property: 'next',
          previousValue: prior.next,
          nextValue: node.next,
          animation: 'move'
        });
      }
      if (prior.status !== node.status) {
        mutations.push({
          entityId: node.id,
          property: 'status',
          previousValue: prior.status,
          nextValue: node.status,
          animation: node.status === 'deleted' ? 'remove' : 'activate'
        });
      }
    }
  } else {
    for (const indexField of queueIndexFields) {
      if (before[indexField] !== after[indexField]) {
        mutations.push({
          entityId: `index-${indexField}`,
          property: 'value',
          previousValue: before[indexField],
          nextValue: after[indexField],
          animation: 'highlight'
        });
      }
    }
    const beforeArray = (before.array as (number | null)[]) ?? [];
    const afterArray = (after.array as (number | null)[]) ?? [];
    for (let i = 0; i < Math.max(beforeArray.length, afterArray.length); i++) {
      if (beforeArray[i] !== afterArray[i]) {
        mutations.push({
          entityId: `array-${i}`,
          property: 'value',
          previousValue: beforeArray[i] ?? null,
          nextValue: afterArray[i] ?? null,
          animation: afterArray[i] === null ? 'remove' : 'highlight'
        });
      }
    }
  }

  if (JSON.stringify(before.result) !== JSON.stringify(after.result)) {
    mutations.push({
      entityId: 'result',
      property: 'value',
      previousValue: before.result,
      nextValue: after.result,
      animation: 'highlight'
    });
  }
  return mutations;
}

export interface QueueMistakeMetadata {
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
): { prediction: PredictionChallenge; mistake: QueueMistakeMetadata } {
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

const boundedPrimitiveAssumption =
  'Each displayed read, write, comparison, allocation, or pointer update is one counted primitive.';

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

    const cursorAuxiliary = [state.readIndex, state.writeIndex, state.current].filter(
      (v) => v !== null
    ).length;
    const auxiliaryCurrent = Math.min(3, cursorAuxiliary);
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
        auxiliary: { current: auxiliaryCurrent, peak: peakAuxiliary, unit: 'cursors' },
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
    if (state.readIndex !== null) visualFocus.push(`array-${state.readIndex}`);
    if (state.writeIndex !== null) visualFocus.push(`array-${state.writeIndex}`);
    for (const id of [state.headId, state.tailId, state.current]) if (id) visualFocus.push(id);

    steps.push({
      id: `queue-${config.operation}-${steps.length}`,
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
        reads: (state.cumulativeWork.read ?? 0) + (state.cumulativeWork['pointer-read'] ?? 0),
        writes: (state.cumulativeWork.write ?? 0) + (state.cumulativeWork['pointer-write'] ?? 0),
        swaps: state.cumulativeWork.swap ?? 0
      },
      complexityEvidence,
      metadata: {
        operation: config.operation,
        backing: config.backing,
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
  const list = config.backing === 'linked-list';
  const circular = config.backing === 'circular-array';
  switch (config.operation) {
    case 'enqueue':
      if (list) {
        if (config.maintainRear) {
          return [
            quad(
              undefined,
              'void enqueue(Queue* q, int v) {',
              'void enqueue(Queue& q, int v) {',
              '  void enqueue(int v) {',
              '    def enqueue(self, v):'
            ),
            quad(
              'enqueue-alloc',
              '  Node* n = malloc(sizeof(Node)); n->value = v; n->next = NULL;',
              '  Node* n = new Node{v, nullptr};',
              '    Node n = new Node(v);',
              '        n = Node(v)'
            ),
            quad(
              'enqueue-link',
              '  if (q->rear) q->rear->next = n; else q->front = n;',
              '  if (q.rear) q.rear->next = n; else q.front = n;',
              '    if (rear != null) rear.next = n; else front = n;',
              '        if self.rear: self.rear.next = n\n        else: self.front = n'
            ),
            quad(
              'enqueue-rear',
              '  q->rear = n;',
              '  q.rear = n;',
              '    rear = n;',
              '        self.rear = n'
            ),
            quad(undefined, '}', '}', '  }', '')
          ];
        }
        return [
          quad(
            undefined,
            'void enqueue(Queue* q, int v) {',
            'void enqueue(Queue& q, int v) {',
            '  void enqueue(int v) {',
            '    def enqueue(self, v):'
          ),
          quad(
            'enqueue-alloc',
            '  Node* n = malloc(sizeof(Node)); n->value = v; n->next = NULL;',
            '  Node* n = new Node{v, nullptr};',
            '    Node n = new Node(v);',
            '        n = Node(v)'
          ),
          quad(
            'enqueue-empty',
            '  if (!q->front) { q->front = n; return; }',
            '  if (!q.front) { q.front = n; return; }',
            '    if (front == null) { front = n; return; }',
            '        if self.front is None:\n            self.front = n; return'
          ),
          quad(
            'enqueue-init-cur',
            '  Node* cur = q->front;',
            '  Node* cur = q.front;',
            '    Node cur = front;',
            '        cur = self.front'
          ),
          quad(
            'enqueue-walk',
            '  while (cur->next) cur = cur->next;   // no rear pointer',
            '  while (cur->next) cur = cur->next;  // no rear pointer',
            '    while (cur.next != null) cur = cur.next;',
            '        while cur.next: cur = cur.next'
          ),
          quad(
            'enqueue-link',
            '  cur->next = n;',
            '  cur->next = n;',
            '    cur.next = n;',
            '        cur.next = n'
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      if (circular) {
        return [
          quad(
            undefined,
            'void enqueue(Queue* q, int v) {',
            'void enqueue(Queue& q, int v) {',
            '  void enqueue(int v) {',
            '    def enqueue(self, v):'
          ),
          quad(
            'enqueue-check',
            '  if (q->size == q->capacity) return;   // full',
            '  if (q.size == q.capacity) return;   // full',
            '    if (size == capacity) return;',
            '        if self.size == self.capacity: return'
          ),
          quad(
            'enqueue-write',
            '  q->data[q->rear] = v;',
            '  q.data[q.rear] = v;',
            '    data[rear] = v;',
            '        self.data[self.rear] = v'
          ),
          quad(
            'enqueue-advance',
            '  q->rear = (q->rear + 1) % q->capacity;',
            '  q.rear = (q.rear + 1) % q.capacity;',
            '    rear = (rear + 1) % capacity;',
            '        self.rear = (self.rear + 1) % self.capacity'
          ),
          quad(
            'enqueue-size',
            '  q->size++;',
            '  q.size++;',
            '    size++;',
            '        self.size += 1'
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      return [
        quad(
          undefined,
          'void enqueue(Queue* q, int v) {',
          'void enqueue(Queue& q, int v) {',
          '  void enqueue(int v) {',
          '    def enqueue(self, v):'
        ),
        quad(
          'enqueue-check',
          '  if (q->tail == q->capacity) return;   // full',
          '  if (q.tail == q.capacity) return;   // full',
          '    if (tail == capacity) return;',
          '        if self.tail == self.capacity: return'
        ),
        quad(
          'enqueue-write',
          '  q->data[q->tail] = v;',
          '  q.data[q.tail] = v;',
          '    data[tail] = v;',
          '        self.data[self.tail] = v'
        ),
        quad(
          'enqueue-advance',
          '  q->tail++;',
          '  q.tail++;',
          '    tail++;',
          '        self.tail += 1'
        ),
        quad(
          'enqueue-size',
          '  q->size++;',
          '  q.size++;',
          '    size++;',
          '        self.size += 1'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'dequeue':
      if (list) {
        return [
          quad(
            undefined,
            'int dequeue(Queue* q) {',
            'int dequeue(Queue& q) {',
            '  int dequeue() {',
            '    def dequeue(self):'
          ),
          quad(
            'dequeue-check',
            '  if (!q->front) return -1;',
            '  if (!q.front) return -1;',
            '    if (front == null) return -1;',
            '        if self.front is None: return -1'
          ),
          quad(
            'dequeue-read',
            '  int v = q->front->value;',
            '  int v = q.front->value;',
            '    int v = front.value;',
            '        v = self.front.value'
          ),
          quad(
            'dequeue-advance',
            '  Node* old = q->front; q->front = q->front->next;',
            '  Node* old = q.front; q.front = q.front->next;',
            '    front = front.next;',
            '        self.front = self.front.next'
          ),
          quad(
            'dequeue-free',
            '  free(old); if (!q->front) q->rear = NULL; return v;',
            '  delete old; if (!q.front) q.rear = nullptr; return v;',
            '    if (front == null) rear = null; return v;',
            '        if self.front is None: self.rear = None\n        return v'
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      if (circular) {
        return [
          quad(
            undefined,
            'int dequeue(Queue* q) {',
            'int dequeue(Queue& q) {',
            '  int dequeue() {',
            '    def dequeue(self):'
          ),
          quad(
            'dequeue-check',
            '  if (q->size == 0) return -1;',
            '  if (q.size == 0) return -1;',
            '    if (size == 0) return -1;',
            '        if self.size == 0: return -1'
          ),
          quad(
            'dequeue-read',
            '  int v = q->data[q->front];',
            '  int v = q.data[q.front];',
            '    int v = data[front];',
            '        v = self.data[self.front]'
          ),
          quad(
            'dequeue-advance',
            '  q->front = (q->front + 1) % q->capacity;',
            '  q.front = (q.front + 1) % q.capacity;',
            '    front = (front + 1) % capacity;',
            '        self.front = (self.front + 1) % self.capacity'
          ),
          quad(
            'dequeue-size',
            '  q->size--; return v;',
            '  q.size--; return v;',
            '    size--; return v;',
            '        self.size -= 1; return v'
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      return [
        quad(
          undefined,
          'int dequeue(Queue* q) {',
          'int dequeue(Queue& q) {',
          '  int dequeue() {',
          '    def dequeue(self):'
        ),
        quad(
          'dequeue-check',
          '  if (q->size == 0) return -1;',
          '  if (q.size == 0) return -1;',
          '    if (size == 0) return -1;',
          '        if self.size == 0: return -1'
        ),
        quad(
          'dequeue-read',
          '  int v = q->data[0];',
          '  int v = q.data[0];',
          '    int v = data[0];',
          '        v = self.data[0]'
        ),
        quad(
          'dequeue-shift',
          '  for (int i = 1; i < q->size; ++i) q->data[i-1] = q->data[i];',
          '  for (int i = 1; i < q.size; ++i) q.data[i-1] = q.data[i];',
          '    for (int i = 1; i < size; i++) data[i-1] = data[i];',
          '        for i in range(1, self.size): self.data[i-1] = self.data[i]'
        ),
        quad(
          'dequeue-size',
          '  q->size--; q->tail--; return v;',
          '  q.size--; q.tail--; return v;',
          '    size--; tail--; return v;',
          '        self.size -= 1; self.tail -= 1; return v'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'front':
      return [
        quad(
          undefined,
          'int front(Queue* q) {',
          'int front(Queue& q) {',
          '  int front() {',
          '    def front(self):'
        ),
        quad(
          'front-check',
          '  if (isEmpty(q)) return -1;',
          '  if (q.empty()) return -1;',
          '    if (size == 0) return -1;',
          '        if self.size == 0: return -1'
        ),
        quad(
          'front-read',
          list ? '  return q->front->value;' : '  return q->data[q->head];',
          list ? '  return q.front->value;' : '  return q.data[q.head];',
          list ? '    return front.value;' : '    return data[head];',
          list ? '        return self.front.value' : '        return self.data[self.head]'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'rear':
      return [
        quad(
          undefined,
          'int rear(Queue* q) {',
          'int rear(Queue& q) {',
          '  int rear() {',
          '    def rear(self):'
        ),
        quad(
          'rear-check',
          '  if (isEmpty(q)) return -1;',
          '  if (q.empty()) return -1;',
          '    if (size == 0) return -1;',
          '        if self.size == 0: return -1'
        ),
        quad(
          'rear-read',
          list ? '  return q->rear->value;' : '  return q->data[q->tail - 1];',
          list ? '  return q.rear->value;' : '  return q.data[q.tail - 1];',
          list ? '    return rear.value;' : '    return data[tail - 1];',
          list ? '        return self.rear.value' : '        return self.data[self.tail - 1]'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
  }
}

function sourceLines(config: ResolvedConfig, lang: SupportedLanguage): SourceLine[] {
  return operationSource(config).map((q, index) => ({
    id: `${config.operation}-${config.backing}-${index + 1}`,
    number: index + 1,
    text: q[lang],
    ...(q.semantic ? { semanticOperationId: q.semantic } : {})
  }));
}

function deriveComplexity(caseId: string, config: ResolvedConfig): string[] {
  const n = config.values.length;
  switch (caseId) {
    case 'dequeue-naive-array':
      return [
        'Removing index 0 leaves a gap that must be closed to keep the front at index 0.',
        `All ${Math.max(0, n - 1)} survivors shift one slot left, each a read-write pair.`,
        'Work grows linearly with the queue length: O(n) time, O(1) auxiliary space.'
      ];
    case 'dequeue-circular-array':
      return [
        'The front index simply advances modulo capacity; the freed slot is reused later.',
        'No element ever moves, so the cost does not depend on the queue length.',
        'A fixed number of updates is O(1) time and O(1) auxiliary space.'
      ];
    case 'enqueue-linked-without-rear':
      return [
        'With only a head pointer, the last node is unknown and must be found.',
        `A cursor walks all ${n} nodes before the new node can be linked.`,
        'The traversal dominates: O(n) time, O(1) auxiliary space.'
      ];
    case 'enqueue-linked-with-rear':
      return [
        'A maintained rear pointer already references the last node.',
        'Linking the new node and moving rear is a fixed number of pointer writes.',
        'No traversal happens: O(1) time and O(1) auxiliary space.'
      ];
    case 'enqueue-circular-array':
      return [
        'The rear index names the next free slot directly.',
        'One write plus a modular increment is independent of the queue length.',
        'A bounded primitive count is O(1) time and O(1) auxiliary space.'
      ];
    default:
      return [
        'The operation touches a fixed number of indices or pointers.',
        'Nothing depends on how many elements the queue holds.',
        'A bounded primitive count is O(1) time and O(1) auxiliary space.'
      ];
  }
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const meta = getQueueOperationMetadata(config.operation);
  let caseId = meta.cases[0].id;
  if (config.operation === 'enqueue') {
    if (config.backing === 'naive-array') caseId = 'enqueue-naive-array';
    else if (config.backing === 'circular-array') caseId = 'enqueue-circular-array';
    else caseId = config.maintainRear ? 'enqueue-linked-with-rear' : 'enqueue-linked-without-rear';
  } else if (config.operation === 'dequeue') {
    if (config.backing === 'naive-array') caseId = 'dequeue-naive-array';
    else if (config.backing === 'circular-array') caseId = 'dequeue-circular-array';
    else caseId = 'dequeue-linked-list';
  }
  const selected = meta.cases.find((c) => c.id === caseId) ?? meta.cases[0];
  return { ...selected, derivation: deriveComplexity(selected.id, config) };
}

function runEnqueue(builder: TraceBuilder, config: ResolvedConfig) {
  const v = config.newValue;
  if (config.backing === 'linked-list') {
    const newId = nodeId(builder.state.nodes.length);
    if (config.maintainRear) {
      const checkpoint = makePrediction(
        'queue-lab:enqueue:rear:checkpoint',
        `A rear pointer is maintained. How many existing nodes are traversed to enqueue ${v}?`,
        'numeric',
        0,
        'The rear pointer references the last node directly, so no traversal happens — this is the O(1) case.',
        'rear-pointer',
        Math.max(0, config.values.length)
      );
      builder.add(
        'enqueue-alloc',
        'Allocate node',
        `Create ${newId} holding ${v}.`,
        { allocation: 1 },
        (s) => {
          s.nodes.push({ id: newId, value: v, next: null, status: 'allocated' });
          s.current = newId;
        },
        checkpoint
      );
      builder.add(
        'enqueue-link',
        'Link at rear',
        `The old rear links to ${newId} directly via the rear pointer.`,
        { 'pointer-read': 1, 'pointer-write': 1 },
        (s) => {
          if (s.tailId) {
            const t = s.nodes.find((x) => x.id === s.tailId);
            if (t) t.next = newId;
          } else s.headId = newId;
        }
      );
      builder.add(
        'enqueue-rear',
        'Move rear',
        `rear now references ${newId}; the enqueue was O(1).`,
        { 'pointer-write': 1 },
        (s) => {
          s.tailId = newId;
          const nn = s.nodes.find((x) => x.id === newId);
          if (nn) nn.status = 'live';
          s.current = null;
          s.size++;
          s.result = v;
        }
      );
      return;
    }
    const checkpoint = makePrediction(
      'queue-lab:enqueue:no-rear:checkpoint',
      `There is NO rear pointer — only head. How many existing nodes must be traversed to enqueue ${v}?`,
      'numeric',
      config.values.length,
      `Without a rear pointer the cursor walks all ${config.values.length} nodes to reach the last one before linking — that is why this is O(n).`,
      'rear-pointer',
      0
    );
    builder.add(
      'enqueue-alloc',
      'Allocate node',
      `Create ${newId} holding ${v}.`,
      { allocation: 1 },
      (s) => {
        s.nodes.push({ id: newId, value: v, next: null, status: 'allocated' });
      },
      checkpoint
    );
    if (builder.state.headId === null) {
      builder.add(
        'enqueue-empty',
        'Empty queue',
        `${newId} becomes both front and rear.`,
        { comparison: 1, 'pointer-write': 1 },
        (s) => {
          s.headId = newId;
          s.tailId = newId;
          const nn = s.nodes.find((x) => x.id === newId);
          if (nn) nn.status = 'live';
          s.size++;
          s.result = v;
        }
      );
      return;
    }
    builder.add(
      'enqueue-init-cur',
      'Start at front',
      'Without a rear pointer, the search for the last node starts at front.',
      { 'pointer-read': 1, 'pointer-write': 1 },
      (s) => {
        s.current = s.headId;
      }
    );
    let cursor = builder.state.headId;
    while (cursor) {
      const node = builder.state.nodes.find((x) => x.id === cursor);
      if (!node || node.next === null) break;
      const nextId = node.next;
      builder.add(
        'enqueue-walk',
        `Walk past ${cursor}`,
        `${cursor} is not the last node, so the cursor advances to ${nextId}.`,
        { 'pointer-read': 1, 'pointer-write': 1, 'loop-iteration': 1 },
        (s) => {
          s.current = nextId;
        }
      );
      cursor = nextId;
    }
    builder.add(
      'enqueue-link',
      'Link at last node',
      `The last node ${cursor} now points to ${newId}; the traversal made this O(n).`,
      { 'pointer-write': 1 },
      (s) => {
        const last = s.nodes.find((x) => x.id === cursor);
        if (last) last.next = newId;
        const nn = s.nodes.find((x) => x.id === newId);
        if (nn) nn.status = 'live';
        s.current = null;
        s.size++;
        s.result = v;
      }
    );
    return;
  }

  // Array backings
  const full =
    config.backing === 'circular-array'
      ? builder.state.size === builder.state.capacity
      : builder.state.tailIndex === builder.state.capacity;
  const checkpoint = makePrediction(
    'queue-lab:enqueue:array:checkpoint',
    config.backing === 'circular-array'
      ? `Circular buffer: rear is at index ${builder.state.tailIndex}. Which index does ${v} get written to?`
      : `Naive array: tail is at index ${builder.state.tailIndex}. Which index does ${v} get written to?`,
    'numeric',
    full ? -1 : builder.state.tailIndex,
    full
      ? 'The queue is full, so the enqueue is rejected (overflow).'
      : config.backing === 'circular-array'
        ? `${v} is written at rear index ${builder.state.tailIndex}, then rear advances modulo capacity — reusing slots freed by earlier dequeues.`
        : `${v} is written at tail index ${builder.state.tailIndex}, then tail advances.`,
    'queue-front-rear',
    full ? builder.state.tailIndex : -1
  );
  builder.add(
    'enqueue-check',
    'Check capacity',
    full
      ? 'The queue is full: enqueue is rejected (overflow).'
      : 'There is a free slot, so the write can proceed.',
    { comparison: 1 },
    full
      ? (s) => {
          s.result = 'overflow';
        }
      : undefined,
    checkpoint
  );
  if (full) return;
  const writeAt = builder.state.tailIndex;
  builder.add(
    'enqueue-write',
    'Write at rear',
    `${v} is written into slot ${writeAt}.`,
    { write: 1 },
    (s) => {
      s.array[writeAt] = v;
      s.writeIndex = writeAt;
    }
  );
  builder.add(
    'enqueue-advance',
    'Advance rear',
    config.backing === 'circular-array'
      ? `rear advances to (${writeAt} + 1) mod ${builder.state.capacity}.`
      : `tail advances to ${writeAt + 1}.`,
    { write: 1 },
    (s) => {
      s.tailIndex =
        config.backing === 'circular-array' ? (s.tailIndex + 1) % s.capacity : s.tailIndex + 1;
    }
  );
  builder.add(
    'enqueue-size',
    'Update size',
    'size increments to include the new element.',
    { write: 1 },
    (s) => {
      s.size++;
      s.result = v;
      s.writeIndex = null;
    }
  );
}

function runDequeue(builder: TraceBuilder, config: ResolvedConfig) {
  const empty = builder.state.size === 0;
  const frontValue = empty
    ? null
    : config.backing === 'linked-list'
      ? (builder.state.nodes.find((n) => n.id === builder.state.headId)?.value ?? null)
      : builder.state.array[builder.state.headIndex];
  const shiftCount = config.backing === 'naive-array' ? Math.max(0, builder.state.size - 1) : 0;
  const checkpoint = makePrediction(
    'queue-lab:dequeue:checkpoint',
    config.backing === 'naive-array'
      ? `Naive array dequeue: how many elements must shift left after removing the front?`
      : `How many elements shift when the front is removed from this ${config.backing.replace('-', ' ')}?`,
    'numeric',
    shiftCount,
    config.backing === 'naive-array'
      ? `Removing index 0 forces all ${shiftCount} survivors to shift left — that is the O(n) cost a circular buffer avoids.`
      : 'The front index/pointer just advances; nothing shifts, so this is O(1).',
    'queue-shift-cost',
    config.backing === 'naive-array' ? 0 : shiftCount + 1
  );
  if (empty) {
    builder.add(
      'dequeue-check',
      'Check empty',
      'The queue is empty, so dequeue reports underflow.',
      { comparison: 1 },
      (s) => {
        s.result = 'underflow';
      },
      checkpoint
    );
    return;
  }
  if (config.backing === 'naive-array') {
    builder.add(
      'dequeue-check',
      'Read front',
      `The front value ${frontValue} at index 0 is saved to return.`,
      { comparison: 1, read: 1 },
      (s) => {
        s.result = s.array[0];
        s.readIndex = 0;
      },
      checkpoint
    );
    const n = builder.state.size;
    for (let i = 1; i < n; i++) {
      builder.add(
        'dequeue-shift',
        `Shift index ${i} → ${i - 1}`,
        `${builder.state.array[i]} moves left to close the gap left by the removed front.`,
        { read: 1, write: 1, 'loop-iteration': 1 },
        (s) => {
          s.array[i - 1] = s.array[i];
          s.readIndex = i;
          s.writeIndex = i - 1;
          if (!s.shifted.includes(i - 1)) s.shifted.push(i - 1);
        }
      );
    }
    builder.add(
      'dequeue-size',
      'Clear last & shrink',
      `Slot ${n - 1} is cleared and size drops to ${n - 1}. All ${shiftCount} shifts made this O(n).`,
      { write: 1 },
      (s) => {
        s.array[s.tailIndex - 1] = null;
        s.tailIndex--;
        s.size--;
        s.readIndex = null;
        s.writeIndex = null;
      }
    );
    return;
  }
  if (config.backing === 'circular-array') {
    const at = builder.state.headIndex;
    builder.add(
      'dequeue-check',
      'Read front',
      `The front value ${frontValue} at index ${at} is saved to return.`,
      { comparison: 1, read: 1 },
      (s) => {
        s.result = s.array[at];
        s.readIndex = at;
      },
      checkpoint
    );
    builder.add(
      'dequeue-advance',
      'Advance front',
      `front advances to (${at} + 1) mod ${builder.state.capacity}; nothing shifts, so this is O(1).`,
      { write: 1 },
      (s) => {
        s.array[at] = null;
        s.headIndex = (s.headIndex + 1) % s.capacity;
        s.readIndex = null;
      }
    );
    builder.add(
      'dequeue-size',
      'Update size',
      'size decrements; the freed slot will be reused by a later enqueue.',
      { write: 1 },
      (s) => {
        s.size--;
      }
    );
    return;
  }
  // linked list
  const oldHead = builder.state.headId;
  builder.add(
    'dequeue-check',
    'Read front',
    `The front node ${oldHead} holds ${frontValue}.`,
    { comparison: 1, 'pointer-read': 1 },
    (s) => {
      s.result = frontValue;
      s.current = oldHead;
    },
    checkpoint
  );
  builder.add(
    'dequeue-advance',
    'Advance head',
    'head moves to its successor in O(1); no traversal.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (s) => {
      const h = s.nodes.find((n) => n.id === s.headId);
      s.headId = h?.next ?? null;
      if (!s.headId) s.tailId = null;
    }
  );
  builder.add(
    'dequeue-free',
    'Free old front',
    `${oldHead} is detached and released.`,
    { deallocation: 1 },
    (s) => {
      const h = s.nodes.find((n) => n.id === oldHead);
      if (h) h.status = 'deleted';
      s.size--;
      s.current = null;
    }
  );
}

function runFront(builder: TraceBuilder, config: ResolvedConfig) {
  const empty = builder.state.size === 0;
  const value = empty
    ? null
    : config.backing === 'linked-list'
      ? (builder.state.nodes.find((n) => n.id === builder.state.headId)?.value ?? null)
      : builder.state.array[builder.state.headIndex];
  const checkpoint = makePrediction(
    'queue-lab:front:checkpoint',
    empty
      ? 'The queue is empty. What does front() return?'
      : 'Which value does front() return — the oldest or the newest element?',
    empty ? 'text' : 'numeric',
    empty ? 'underflow' : (value as number),
    empty
      ? 'front() on an empty queue is underflow.'
      : `A queue is FIFO, so front() returns the oldest element ${value}, not the most recently enqueued one.`,
    empty ? 'underflow-vs-empty' : 'queue-front-rear',
    empty ? 'null' : (config.values[config.values.length - 1] as number)
  );
  if (empty) {
    builder.add(
      'front-check',
      'Check empty',
      'The queue is empty; front() reports underflow.',
      { comparison: 1 },
      (s) => {
        s.result = 'underflow';
      },
      checkpoint
    );
    return;
  }
  builder.add(
    'front-read',
    'Read front',
    `front() returns the oldest element ${value} directly in O(1).`,
    config.backing === 'linked-list'
      ? { comparison: 1, 'pointer-read': 1 }
      : { comparison: 1, read: 1 },
    (s) => {
      s.result = value;
      if (config.backing !== 'linked-list') s.readIndex = s.headIndex;
      else s.current = s.headId;
    },
    checkpoint
  );
}

function runRear(builder: TraceBuilder, config: ResolvedConfig) {
  const empty = builder.state.size === 0;
  const value = empty
    ? null
    : config.backing === 'linked-list'
      ? (builder.state.nodes.find((n) => n.id === builder.state.tailId)?.value ?? null)
      : builder.state.array[
          (builder.state.tailIndex - 1 + builder.state.capacity) % builder.state.capacity
        ];
  const checkpoint = makePrediction(
    'queue-lab:rear:checkpoint',
    empty
      ? 'The queue is empty. What does rear() return?'
      : 'Which value does rear() return — the oldest or the newest element?',
    empty ? 'text' : 'numeric',
    empty ? 'underflow' : (value as number),
    empty
      ? 'rear() on an empty queue is underflow.'
      : `rear() returns the most recently enqueued element ${value}, the opposite end from front().`,
    empty ? 'underflow-vs-empty' : 'queue-front-rear',
    empty ? 'null' : (config.values[0] as number)
  );
  if (empty) {
    builder.add(
      'rear-check',
      'Check empty',
      'The queue is empty; rear() reports underflow.',
      { comparison: 1 },
      (s) => {
        s.result = 'underflow';
      },
      checkpoint
    );
    return;
  }
  const at =
    config.backing === 'linked-list'
      ? null
      : (builder.state.tailIndex - 1 + builder.state.capacity) % builder.state.capacity;
  builder.add(
    'rear-read',
    'Read rear',
    `rear() returns the newest element ${value} directly in O(1).`,
    config.backing === 'linked-list'
      ? { comparison: 1, 'pointer-read': 1 }
      : { comparison: 1, read: 1 },
    (s) => {
      s.result = value;
      if (at !== null) s.readIndex = at;
      else s.current = s.tailId;
    },
    checkpoint
  );
}

const QUEUE_OBJECTIVES = [
  'Explain why naive-array dequeue is O(n) but circular-array dequeue is O(1)',
  'Trace how a rear pointer turns linked-queue enqueue from O(n) into O(1)',
  'Separate FIFO front from rear, and overflow from underflow'
];

export function createQueueLesson(input: QueueConfig = DEFAULT_QUEUE_CONFIG): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));

  switch (config.operation) {
    case 'enqueue':
      runEnqueue(builder, config);
      break;
    case 'dequeue':
      runDequeue(builder, config);
      break;
    case 'front':
      runFront(builder, config);
      break;
    case 'rear':
      runRear(builder, config);
      break;
  }

  const metadata = getQueueOperationMetadata(config.operation);
  const backingLabel =
    config.backing === 'naive-array'
      ? 'naive array'
      : config.backing === 'circular-array'
        ? 'circular array'
        : config.maintainRear
          ? 'linked list (rear pointer)'
          : 'linked list (no rear)';

  return {
    id: 'queue-lab',
    subject: 'dsa-1',
    topic: 'Queue',
    title: `Queue Lab — ${metadata.label} (${backingLabel})`,
    description: metadata.description,
    difficulty: 'beginner',
    learningObjectives: QUEUE_OBJECTIVES,
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
