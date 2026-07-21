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

export const QUEUE_INPUT_MAX = 12;

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
  operation: 'enqueue',
  backing: 'circular-array',
  values: [10, 20, 30],
  capacity: 5,
  newValue: 40
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
        label: 'Naive Array',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Naive Array',
        assumptions: ['Capacity is not exceeded'],
        description: 'Insert at the end of the array.'
      },
      {
        id: 'enqueue-circular-array',
        label: 'Circular Array',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Circular Array',
        assumptions: ['Capacity is not exceeded'],
        description: 'Insert at the rear index and wrap around if necessary.'
      },
      {
        id: 'enqueue-linked-list',
        label: 'Linked List',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linked List with Tail Pointer',
        assumptions: ['Tail pointer is maintained'],
        description: 'Update the tail node and tail pointer.'
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
        label: 'Naive Array',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Naive Array',
        assumptions: ['Shift all elements left'],
        description: 'Removing the first element requires shifting all remaining elements to fill the gap.'
      },
      {
        id: 'dequeue-circular-array',
        label: 'Circular Array',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Circular Array',
        assumptions: ['Queue is not empty'],
        description: 'Advance the front index and wrap around if necessary.'
      },
      {
        id: 'dequeue-linked-list',
        label: 'Linked List',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linked List',
        assumptions: ['Queue is not empty'],
        description: 'Advance the head pointer and deallocate the old head.'
      }
    ]
  ),
  operation(
    'front',
    'Front',
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
        implementationVariant: 'Any',
        assumptions: ['Queue is not empty'],
        description: 'Directly access the front element via head index/pointer.'
      }
    ]
  ),
  operation(
    'rear',
    'Rear',
    'View the last element without removing it.',
    'Inspection',
    {},
    [
      {
        id: 'rear-all',
        label: 'All implementations',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Any',
        assumptions: ['Queue is not empty', 'Tail pointer/index is maintained'],
        description: 'Directly access the rear element via tail index/pointer.'
      }
    ]
  )
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
  array: (number | null)[];
  capacity: number;
  headIndex: number;
  tailIndex: number;
  size: number;
  nodes: RuntimeNode[];
  headId: string | null;
  tailId: string | null;
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
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function resolveConfig(input: QueueConfig): ResolvedConfig {
  if (!QUEUE_OPERATIONS.some((c) => c.id === input.operation)) {
    throw new Error(`Unsupported queue operation: ${String(input.operation)}`);
  }
  const capacity = input.capacity ?? Math.max(5, input.values.length + 2);
  if (input.backing !== 'linked-list' && input.values.length > capacity) {
    throw new Error('Initial values exceed array capacity.');
  }
  return {
    operation: input.operation,
    backing: input.backing,
    values: [...input.values],
    capacity,
    newValue: input.newValue ?? 99
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

  const array = new Array(config.capacity).fill(null);
  let headIndex = 0;
  let tailIndex = 0;
  let size = config.values.length;

  if (!isList) {
    if (config.backing === 'circular-array') {
      headIndex = 1;
      for (let i = 0; i < size; i++) {
        array[(headIndex + i) % config.capacity] = config.values[i];
      }
      tailIndex = (headIndex + size) % config.capacity;
    } else {
      for (let i = 0; i < size; i++) {
        array[i] = config.values[i];
      }
      tailIndex = size;
    }
  }

  return {
    backing: config.backing,
    array,
    capacity: config.capacity,
    headIndex,
    tailIndex,
    size,
    nodes,
    headId: nodes.length > 0 ? nodes[0].id : null,
    tailId: nodes.length > 0 ? nodes[nodes.length - 1].id : null,
    result: null,
    cumulativeWork: {},
    operationCount: 0
  };
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
  // We provide a simplified source mapping for brevity but maintain the pattern.
  return [
    quad(undefined, '// C source', '// C++ source', '// Java source', '# Python source'),
    quad('start', 'void op() {', 'void op() {', 'void op() {', 'def op():'),
    quad('logic', '  // execute', '  // execute', '  // execute', '    pass'),
    quad('end', '}', '}', '}', '')
  ];
}

function sourceLines(config: ResolvedConfig, lang: SupportedLanguage): SourceLine[] {
  const quads = operationSource(config);
  return quads.map((q, index) => ({ id: `L${index}`, number: index + 1, semanticOperationId: q.semantic || undefined, text: q[lang] }));
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const meta = getQueueOperationMetadata(config.operation);
  let c = meta.cases[0];
  if (config.backing === 'naive-array') {
    c = meta.cases.find(x => x.id.includes('naive')) || meta.cases[0];
  } else if (config.backing === 'circular-array') {
    c = meta.cases.find(x => x.id.includes('circular')) || meta.cases[0];
  } else if (config.backing === 'linked-list') {
    c = meta.cases.find(x => x.id.includes('linked-list')) || meta.cases[0];
  }
  return { ...c, derivation: [] };
}

const queuePointerFields = ['headId', 'tailId'] as const;
const queueIndexFields = ['headIndex', 'tailIndex', 'size', 'capacity'] as const;

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const isList = state.backing === 'linked-list';
  if (isList) {
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
  } else {
    const arrayElements: TraceEntity[] = state.array.map((value, index) => ({
      id: `array-${index}`,
      type: 'array-cell',
      label: `[${index}]`,
      value,
      metadata: {
        isHead: state.headIndex === index,
        isTail: state.tailIndex === index
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
          animation: 'pulse'
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
          previousValue: beforeArray[i],
          nextValue: afterArray[i],
          animation: 'pulse'
        });
      }
    }
  }

  return mutations;
}



interface TraceBuilder {
  state: RuntimeState;
  steps: TraceStep[];
  add: (
    semantic: string,
    title: string,
    explanation: string,
    stepWork: WorkCounts,
    mutate?: (state: RuntimeState) => void
  ) => void;
}

function createTraceBuilder(
  config: ResolvedConfig,
  complexityCase: SelectedCase,
  state: RuntimeState
): TraceBuilder {
  const steps: TraceStep[] = [];
  let peakAuxiliary = 1;
  let peakOutput = 0;

  const add: TraceBuilder['add'] = (
    semantic,
    title,
    explanation,
    stepWork,
    mutate = () => {}
  ) => {
    const before = traceState(state, config);
    mutate(state);
    const exactOperationCount = totalWork(stepWork);
    state.cumulativeWork = addWork(state.cumulativeWork, stepWork);
    state.operationCount += exactOperationCount;
    const after = traceState(state, config);

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
        auxiliary: { current: 1, peak: peakAuxiliary, unit: 'variables' },
        output: { current: config.values.length, peak: config.values.length, unit: 'elements' }
      },
      assumptions: Array.from(complexityCase.assumptions),
      derivation: []
    };

    steps.push({
      id: `step-${steps.length + 1}`,
      index: steps.length,
      eventType: semantic,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      title,
      stateBefore: before,
      stateAfter: after,
      mutations: mutationsBetween(before, after),
      complexityEvidence,
      entities: entitiesFor(state),
      deterministicExplanation: explanation,
      visualFocus: []
    });
  };

  return { state, steps, add };
}

function runEnqueue(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.backing === 'naive-array' || config.backing === 'circular-array') {
    builder.add('start', 'Check capacity', 'Ensure array is not full.', { comparison: 1 });
    if (config.backing === 'circular-array') {
      builder.add(
        'logic',
        'Insert value at rear',
        'Assign value to tail index and wrap tail around.',
        { 'write': 1, read: 1 },
        (s) => {
          s.array[s.tailIndex] = config.newValue;
          s.tailIndex = (s.tailIndex + 1) % s.capacity;
          s.size++;
        }
      );
    } else {
      builder.add(
        'logic',
        'Insert value at end',
        'Assign value to tail index.',
        { 'write': 1 },
        (s) => {
          s.array[s.tailIndex] = config.newValue;
          s.tailIndex++;
          s.size++;
        }
      );
    }
  } else if (config.backing === 'linked-list') {
    builder.add('start', 'Allocate node', 'Create new node for the value.', { allocation: 1 }, (s) => {
      const newNode: RuntimeNode = {
        id: nodeId(s.size),
        value: config.newValue,
        next: null,
        status: 'live'
      };
      s.nodes.push(newNode);
    });
    builder.add('logic', 'Link to tail', 'Update old tail and new tail pointer.', { 'pointer-write': 2 }, (s) => {
      if (s.size === 0) {
        s.headId = s.nodes[0].id;
        s.tailId = s.nodes[0].id;
      } else {
        const lastNode = s.nodes.find(n => n.id === s.tailId);
        if (lastNode) lastNode.next = s.nodes[s.size].id;
        s.tailId = s.nodes[s.size].id;
      }
      s.size++;
    });
  }
}

function runDequeue(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.values.length === 0) {
    builder.add('start', 'Check empty', 'Queue is empty.', { comparison: 1 });
    return;
  }
  
  if (config.backing === 'naive-array') {
    builder.add('start', 'Save front', 'Save the element to return.', { 'read': 1 }, (s) => {
      s.result = s.array[0];
    });
    for (let i = 1; i < config.values.length; i++) {
      builder.add('logic', `Shift element ${i}`, 'Move element one position left.', { 'read': 1, 'write': 1 }, (s) => {
        s.array[i - 1] = s.array[i];
      });
    }
    builder.add('end', 'Clear last', 'Nullify the last element and decrement size.', { 'write': 1 }, (s) => {
      s.array[s.tailIndex - 1] = null;
      s.tailIndex--;
      s.size--;
    });
  } else if (config.backing === 'circular-array') {
    builder.add('start', 'Save front', 'Save the element to return.', { 'read': 1 }, (s) => {
      s.result = s.array[s.headIndex];
    });
    builder.add('logic', 'Advance front', 'Move head index and wrap around.', { 'write': 1, read: 1 }, (s) => {
      s.array[s.headIndex] = null;
      s.headIndex = (s.headIndex + 1) % s.capacity;
      s.size--;
    });
  } else if (config.backing === 'linked-list') {
    builder.add('start', 'Save front', 'Save head value.', { 'pointer-read': 1 }, (s) => {
      const head = s.nodes.find(n => n.id === s.headId);
      s.result = head ? head.value : null;
    });
    builder.add('logic', 'Advance head', 'Update head to next node.', { 'pointer-write': 1 }, (s) => {
      const oldHead = s.nodes.find(n => n.id === s.headId);
      if (oldHead) {
        oldHead.status = 'deleted';
        s.headId = oldHead.next;
        if (!s.headId) s.tailId = null;
      }
      s.size--;
    });
  }
}

function runFront(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.values.length === 0) {
    builder.add('start', 'Check empty', 'Queue is empty.', { comparison: 1 });
    return;
  }
  builder.add('logic', 'Access front', 'Read front element directly.', { 'read': 1 }, (s) => {
    if (s.backing === 'linked-list') {
      const head = s.nodes.find(n => n.id === s.headId);
      s.result = head ? head.value : null;
    } else if (s.backing === 'circular-array') {
      s.result = s.array[s.headIndex];
    } else {
      s.result = s.array[0];
    }
  });
}

function runRear(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.values.length === 0) {
    builder.add('start', 'Check empty', 'Queue is empty.', { comparison: 1 });
    return;
  }
  builder.add('logic', 'Access rear', 'Read rear element directly.', { 'read': 1 }, (s) => {
    if (s.backing === 'linked-list') {
      const tail = s.nodes.find(n => n.id === s.tailId);
      s.result = tail ? tail.value : null;
    } else if (s.backing === 'circular-array') {
      const rearIdx = (s.headIndex + s.size - 1 + s.capacity) % s.capacity;
      s.result = s.array[rearIdx];
    } else {
      s.result = s.array[s.size - 1];
    }
  });
}

export function createQueueLesson(
  input: QueueConfig = DEFAULT_QUEUE_CONFIG
): TraceLesson {
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
  return {
    id: `queue-${config.backing}-${config.operation}`,
    subject: 'dsa-1',
    topic: 'Queue',
    title: `Queue Lab \u2014 ${metadata.label}`,
    description: metadata.description,
    difficulty: 'beginner',
    learningObjectives: [
      'Understand O(n) vs O(1) shifting with naive vs circular arrays',
      'Trace pointer/index operations in queues'
    ],
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
