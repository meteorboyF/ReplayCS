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

export const STACK_INPUT_MAX = 8;
export const ELEMENT_SIZE_BYTES = 4;
export const ADDRESS_BASE = 0x100;

export type StackOperation = 'push' | 'pop' | 'peek' | 'search';
export type StackOperationGroup = 'Modification' | 'Inspection';
export type StackBacking = 'array' | 'dynamic-array' | 'linked-list';

export interface StackComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface StackOperationMetadata {
  id: StackOperation;
  label: string;
  description: string;
  group: StackOperationGroup;
  requiresTarget: boolean;
  requiresNewValue: boolean;
  cases: readonly StackComplexityCase[];
}

export interface StackConfig {
  operation: StackOperation;
  values: number[]; // Initial stack values (bottom to top)
  backing: StackBacking;
  capacity?: number; // For array backing
  target?: number; // For search
  newValue?: number; // For push
}

export const DEFAULT_STACK_CONFIG: StackConfig = {
  operation: 'push',
  values: [10, 20, 30],
  backing: 'array',
  capacity: 5,
  newValue: 40
};

const operation = (
  id: StackOperation,
  label: string,
  description: string,
  group: StackOperationGroup,
  flags: Partial<Pick<StackOperationMetadata, 'requiresTarget' | 'requiresNewValue'>>,
  cases: readonly StackComplexityCase[]
): StackOperationMetadata => ({
  id,
  label,
  description,
  group,
  requiresTarget: false,
  requiresNewValue: false,
  ...flags,
  cases
});

export const STACK_OPERATIONS: readonly StackOperationMetadata[] = [
  operation('push', 'Push', 'Add an element to the top of the stack.', 'Modification', { requiresNewValue: true }, [
    {
      id: 'push-normal',
      label: 'Normal push',
      caseType: 'worst',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Array/Linked List',
      assumptions: ['Stack is not full'],
      description: 'One write and top update.'
    },
    {
      id: 'push-resize',
      label: 'Resize push',
      caseType: 'worst',
      timeComplexity: 'O(n)',
      auxiliarySpace: 'O(n)',
      implementationVariant: 'Dynamic Array',
      assumptions: ['Capacity is exceeded, requiring array copy'],
      description: 'Allocating new array and copying elements.'
    },
    {
      id: 'push-amortized',
      label: 'Amortized push',
      caseType: 'amortized',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Dynamic Array',
      assumptions: ['Array doubles on resize'],
      description: 'Frequent O(1) pushes pay for infrequent O(n) resize.'
    }
  ]),
  operation('pop', 'Pop', 'Remove the element from the top of the stack.', 'Modification', {}, [
    {
      id: 'pop-normal',
      label: 'Normal pop',
      caseType: 'worst',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Array/Linked List',
      assumptions: ['Stack is not empty'],
      description: 'Return top element and update top pointer/index.'
    }
  ]),
  operation('peek', 'Peek', 'View the top element without removing it.', 'Inspection', {}, [
    {
      id: 'peek-normal',
      label: 'Normal peek',
      caseType: 'worst',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Array/Linked List',
      assumptions: ['Stack is not empty'],
      description: 'Return top element.'
    }
  ]),
  operation('search', 'Search', 'Search for an element from the top.', 'Inspection', { requiresTarget: true }, [
    {
      id: 'search-normal',
      label: 'Search',
      caseType: 'worst',
      timeComplexity: 'O(n)',
      auxiliarySpace: 'O(1)',
      implementationVariant: 'Linear Search',
      assumptions: ['Target is at the bottom or not present'],
      description: 'Traverse stack from top to bottom.'
    }
  ])
];

export function getStackOperationMetadata(operationId: StackOperation): StackOperationMetadata {
  const metadata = STACK_OPERATIONS.find((candidate) => candidate.id === operationId);
  if (!metadata) throw new Error(`Unknown stack operation: ${String(operationId)}`);
  return metadata;
}

type NodeStatus = 'live' | 'allocated' | 'detached' | 'deleted';

interface RuntimeNode {
  id: string;
  value: number;
  next: string | null;
  status: NodeStatus;
}

interface RuntimeState {
  backing: StackBacking;
  slots: (number | null)[];
  oldSlots: (number | null)[] | null;
  size: number;
  capacity: number;
  oldCapacity: number | null;
  nodes: RuntimeNode[];
  head: string | null;
  newNode: string | null;
  detached: string[];
  deleted: string[];
  allocated: string[];
  current: string | null;
  i: number | null;
  readIndex: number | null;
  writeIndex: number | null;
  result: TraceValue;
  resultIndex: number | null;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: StackOperation;
  values: number[];
  backing: StackBacking;
  capacity: number;
  target: number;
  newValue: number;
}

interface SelectedCase extends StackComplexityCase {
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

function slotAddress(index: number): string {
  return `0x${(ADDRESS_BASE + index * ELEMENT_SIZE_BYTES).toString(16).toUpperCase()}`;
}

function nodeId(index: number): string {
  return `N${index + 1}`;
}

function resolveConfig(input: StackConfig): ResolvedConfig {
  const values = input.values || [];
  const capacity = input.capacity ?? (values.length + 2);
  return {
    operation: input.operation,
    values: [...values],
    backing: input.backing,
    capacity,
    target: input.target ?? 10,
    newValue: input.newValue ?? 40
  };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const n = config.values.length;
  let slots: (number | null)[] = [];
  let nodes: RuntimeNode[] = [];
  let head: string | null = null;
  
  if (config.backing === 'array' || config.backing === 'dynamic-array') {
    slots = Array.from({ length: config.capacity }, (_, i) => i < n ? config.values[i] : null);
  } else {
    for (let i = n - 1; i >= 0; i--) {
      nodes.push({
        id: nodeId(i),
        value: config.values[i],
        next: i > 0 ? nodeId(i - 1) : null,
        status: 'live'
      });
    }
    head = n > 0 ? nodeId(n - 1) : null;
  }

  return {
    backing: config.backing,
    slots,
    oldSlots: null,
    size: n,
    capacity: config.capacity,
    oldCapacity: null,
    nodes,
    head,
    newNode: null,
    detached: [],
    deleted: [],
    allocated: [],
    current: null,
    i: null,
    readIndex: null,
    writeIndex: null,
    result: null,
    resultIndex: null,
    cumulativeWork: {},
    operationCount: 0
  };
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    backing: state.backing,
    slots: [...state.slots],
    oldSlots: state.oldSlots ? [...state.oldSlots] : null,
    size: state.size,
    capacity: state.capacity,
    oldCapacity: state.oldCapacity,
    nodes: state.nodes.map(n => ({...n})) as unknown as TraceValue,
    head: state.head,
    newNode: state.newNode,
    detached: [...state.detached],
    deleted: [...state.deleted],
    allocated: [...state.allocated],
    current: state.current,
    i: state.i,
    readIndex: state.readIndex,
    writeIndex: state.writeIndex,
    result: state.result,
    resultIndex: state.resultIndex,
    cumulativeWork: { ...state.cumulativeWork },
    operationCount: state.operationCount
  };
}

const pointerFields = ['head', 'current', 'newNode'] as const;
const scalarFields = ['size', 'capacity', 'i', 'readIndex', 'writeIndex'] as const;

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = [];

  if (state.backing === 'array' || state.backing === 'dynamic-array') {
    const slots: TraceEntity[] = state.slots.map((value, index) => ({
      id: `slot-${index}`,
      type: 'array-cell',
      label: `data[${index}]`,
      value: value,
      metadata: {
        address: slotAddress(index),
        inSize: index < state.size,
        shifted: false,
        copied: false,
        isRead: state.readIndex === index,
        isWrite: state.writeIndex === index
      }
    }));
    entities.push(...slots);
    
    const scalars: TraceEntity[] = scalarFields.map((field) => ({
      id: `var-${field}`,
      type: 'variable',
      label: field,
      value: state[field]
    }));
    entities.push(...scalars);
    
    entities.push({ id: 'old-buffer', type: 'array', label: 'old buffer', value: state.oldSlots });
  } else {
    const nodes: TraceEntity[] = state.nodes.map((node) => ({
      id: node.id,
      type: 'node',
      label: node.id,
      value: node.value,
      metadata: {
        next: node.next,
        status: node.status,
        isHead: state.head === node.id,
        detached: state.detached.includes(node.id),
        deleted: state.deleted.includes(node.id),
        allocated: state.allocated.includes(node.id)
      }
    }));
    entities.push(...nodes);
    
    const pointers: TraceEntity[] = pointerFields.map((pointer) => ({
      id: `pointer-${pointer}`,
      type: 'pointer',
      label: pointer,
      value: state[pointer],
      metadata: { target: state[pointer] }
    }));
    entities.push(...pointers);
  }
  
  entities.push(
    { id: 'result', type: 'variable', label: 'result', value: state.result },
    { id: 'resultIndex', type: 'variable', label: 'result index', value: state.resultIndex },
    { id: 'operation-count', type: 'variable', label: 'exact operations', value: state.operationCount }
  );
  
  return entities;
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const backing = before.backing as StackBacking;
  
  if (backing === 'array' || backing === 'dynamic-array') {
    const beforeSlots = (before.slots as (number | null)[]) ?? [];
    const afterSlots = (after.slots as (number | null)[]) ?? [];
    const maxLength = Math.max(beforeSlots.length, afterSlots.length);
    for (let index = 0; index < maxLength; index++) {
      const previousValue = beforeSlots[index] ?? null;
      const nextValue = afterSlots[index] ?? null;
      if (previousValue !== nextValue) {
        mutations.push({
          entityId: `slot-${index}`,
          property: 'value',
          previousValue,
          nextValue,
          animation: nextValue === null ? 'remove' : 'highlight'
        });
      }
    }
    
    for (const field of scalarFields) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        mutations.push({
          entityId: `var-${field}`,
          property: 'value',
          previousValue: before[field],
          nextValue: after[field],
          animation: 'highlight'
        });
      }
    }
    
    if (JSON.stringify(before.oldSlots) !== JSON.stringify(after.oldSlots)) {
      mutations.push({
        entityId: 'old-buffer',
        property: 'value',
        previousValue: before.oldSlots,
        nextValue: after.oldSlots,
        animation: before.oldSlots === null ? 'insert' : 'remove'
      });
    }
  } else {
    for (const pointer of pointerFields) {
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
  }
  
  for (const field of ['result', 'resultIndex', 'operationCount']) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      mutations.push({
        entityId: field === 'operationCount' ? 'operation-count' : field === 'result' || field === 'resultIndex' ? field : `var-${field}`,
        property: 'value',
        previousValue: before[field],
        nextValue: after[field],
        animation: 'highlight'
      });
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
  
  const add: TraceBuilder['add'] = (semantic, title, explanation, stepWork, mutate = () => {}) => {
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
        auxiliary: { current: 0, peak: 0, unit: 'slots' },
        output: { current: 0, peak: 0, unit: 'slots' },
        callStackDepth: 1
      },
      assumptions: [...complexityCase.assumptions],
      derivation: [...complexityCase.derivation]
    };

    const visualFocus: string[] = [];

    steps.push({
      id: `stack-${config.operation}-${steps.length}`,
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
      visualFocus,
      complexityCost: {
        comparisons: state.cumulativeWork.comparison ?? 0,
        reads: state.cumulativeWork.read ?? 0,
        writes: state.cumulativeWork.write ?? 0,
        swaps: state.cumulativeWork.swap ?? 0
      },
      complexityEvidence,
      metadata: { operation: config.operation, complexityCase: complexityCase.id }
    });
  };
  return { state, steps, add };
}

function runPush(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.backing === 'array') {
    builder.add('push-check', 'Check capacity', 'Verify array is not full', { comparison: 1 });
    if (builder.state.size === builder.state.capacity) return; // Full array
    builder.add('push-write', 'Write value', 'Write new value to the top of the stack', { write: 1 }, (s) => {
      s.slots[s.size] = config.newValue;
      s.writeIndex = s.size;
    });
    builder.add('push-size', 'Update size', 'Increment stack size', { write: 1 }, (s) => {
      s.size++;
      s.result = config.newValue;
    });
  } else if (config.backing === 'dynamic-array') {
    builder.add('push-check', 'Check capacity', 'Verify array capacity', { comparison: 1 });
    if (builder.state.size === builder.state.capacity) {
      builder.add('push-resize', 'Resize array', 'Allocate and copy array', { allocation: 1, write: builder.state.size * 2 }, (s) => {
        s.oldCapacity = s.capacity;
        s.oldSlots = [...s.slots];
        s.capacity *= 2;
        s.slots = Array.from({ length: s.capacity }, (_, i) => i < s.size ? s.oldSlots![i] : null);
      });
    }
    builder.add('push-write', 'Write value', 'Write new value to array', { write: 1 }, (s) => {
      s.slots[s.size] = config.newValue;
      s.writeIndex = s.size;
    });
    builder.add('push-size', 'Update size', 'Increment stack size', { write: 1 }, (s) => {
      s.size++;
      s.result = config.newValue;
    });
  } else {
    // Linked List
    builder.add('push-alloc', 'Allocate node', 'Create a new node', { allocation: 1 }, (s) => {
      s.newNode = `N${s.nodes.length + 1}`;
      s.nodes.push({ id: s.newNode, value: config.newValue, next: null, status: 'allocated' });
      s.allocated.push(s.newNode);
    });
    builder.add('push-link', 'Link node', 'Point new node to current head', { write: 1 }, (s) => {
      const node = s.nodes.find(n => n.id === s.newNode);
      if (node) node.next = s.head;
    });
    builder.add('push-head', 'Update head', 'Make the new node the head', { write: 1 }, (s) => {
      s.head = s.newNode;
      const node = s.nodes.find(n => n.id === s.newNode);
      if (node) node.status = 'live';
      s.newNode = null;
      s.result = config.newValue;
    });
  }
}

function runPop(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.backing === 'array' || config.backing === 'dynamic-array') {
    builder.add('pop-check', 'Check empty', 'Verify stack is not empty', { comparison: 1 });
    if (builder.state.size === 0) return;
    builder.add('pop-size', 'Update size', 'Decrement stack size', { write: 1 }, (s) => {
      s.size--;
    });
    builder.add('pop-read', 'Read value', 'Return top element', { read: 1 }, (s) => {
      s.result = s.slots[s.size]!;
      s.readIndex = s.size;
    });
  } else {
    builder.add('pop-check', 'Check empty', 'Verify head is not null', { comparison: 1 });
    if (!builder.state.head) return;
    let poppedNodeId = builder.state.head;
    builder.add('pop-read', 'Read value', 'Read top node value', { read: 1 }, (s) => {
      const node = s.nodes.find(n => n.id === s.head);
      s.result = node?.value ?? null;
    });
    builder.add('pop-head', 'Update head', 'Move head to next node', { write: 1 }, (s) => {
      const node = s.nodes.find(n => n.id === s.head);
      s.head = node?.next ?? null;
    });
    builder.add('pop-free', 'Free node', 'Deallocate popped node', { write: 1 }, (s) => {
      const node = s.nodes.find(n => n.id === poppedNodeId);
      if (node) node.status = 'deleted';
      s.deleted.push(poppedNodeId);
    });
  }
}

function runPeek(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.backing === 'array' || config.backing === 'dynamic-array') {
    builder.add('peek-check', 'Check empty', 'Verify stack is not empty', { comparison: 1 });
    if (builder.state.size === 0) return;
    builder.add('peek-read', 'Read value', 'Return top element', { read: 1 }, (s) => {
      s.result = s.slots[s.size - 1]!;
      s.readIndex = s.size - 1;
    });
  } else {
    builder.add('peek-check', 'Check empty', 'Verify head is not null', { comparison: 1 });
    if (!builder.state.head) return;
    builder.add('peek-read', 'Read value', 'Read top node value', { read: 1 }, (s) => {
      const node = s.nodes.find(n => n.id === s.head);
      s.result = node?.value ?? null;
    });
  }
}

function runSearch(builder: TraceBuilder, config: ResolvedConfig) {
  if (config.backing === 'array' || config.backing === 'dynamic-array') {
    builder.add('search-init', 'Initialize', 'Start from top of stack', { write: 1 }, (s) => {
      s.i = s.size - 1;
    });
    let found = false;
    for (let i = config.values.length - 1; i >= 0; i--) {
      builder.add('search-check', 'Check bounds', 'Verify loop bounds', { comparison: 1 }, (s) => {
        s.i = i;
      });
      builder.add('search-compare', 'Compare', 'Check if current element matches target', { read: 1, comparison: 1 }, (s) => {
        s.readIndex = i;
      });
      if (config.values[i] === config.target) {
        builder.add('search-found', 'Found target', 'Return distance from top', { write: 1 }, (s) => {
          s.result = s.size - 1 - i;
          s.resultIndex = i;
        });
        found = true;
        break;
      }
    }
    if (!found) {
      builder.add('search-check', 'Check bounds', 'Verify loop bounds', { comparison: 1 }, (s) => {
        s.i = -1;
      });
      builder.add('search-missing', 'Not found', 'Return -1', { write: 1 }, (s) => {
        s.result = -1;
      });
    }
  } else {
    builder.add('search-init', 'Initialize', 'Start from head', { write: 1 }, (s) => {
      s.current = s.head;
      s.i = 0; // distance
    });
    let currentId = config.values.length > 0 ? `N${config.values.length}` : null;
    let distance = 0;
    let found = false;
    while (currentId) {
      builder.add('search-check', 'Check null', 'Verify current is not null', { comparison: 1 }, (s) => {
        s.current = currentId;
      });
      builder.add('search-compare', 'Compare', 'Check if current node matches target', { read: 1, comparison: 1 }, (s) => {});
      if (config.values[parseInt(currentId!.substring(1)) - 1] === config.target) {
        builder.add('search-found', 'Found target', 'Return distance', { write: 1 }, (s) => {
          s.result = distance;
        });
        found = true;
        break;
      }
      builder.add('search-advance', 'Advance', 'Move to next node', { write: 1 }, (s) => {
        const node = s.nodes.find(n => n.id === currentId);
        currentId = node?.next ?? null;
        s.current = currentId;
        if (s.i !== null) s.i++;
        distance++;
      });
    }
    if (!found) {
      builder.add('search-check', 'Check null', 'Verify current is not null', { comparison: 1 }, (s) => {
        s.current = null;
      });
      builder.add('search-missing', 'Not found', 'Return -1', { write: 1 }, (s) => {
        s.result = -1;
      });
    }
  }
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

function sourceLines(config: ResolvedConfig, lang: SupportedLanguage): SourceLine[] {
  let lines: QuadSourceLine[] = [];
  if (config.backing === 'array' || config.backing === 'dynamic-array') {
    switch (config.operation) {
      case 'push':
        lines = [
          quad(undefined, 'void push(Stack* s, int value) {', 'void push(Stack& s, int value) {', '  void push(int value) {', '    def push(self, value):'),
          quad('push-check', '  if (s->size == s->capacity) return;', '  if (s.size == s.capacity) return;', '    if (size == capacity) return;', '        if self.size == self.capacity: return'),
          quad('push-resize', '  // Resize logic if dynamic', '  // Resize logic if dynamic', '    // Resize logic if dynamic', '        # Resize logic if dynamic'),
          quad('push-write', '  s->data[s->size] = value;', '  s.slots[s.size] = value;', '    slots[size] = value;', '        self.slots[self.size] = value'),
          quad('push-size', '  s->size++;', '  s.size++;', '    size++;', '        self.size += 1'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
      case 'pop':
        lines = [
          quad(undefined, 'int pop(Stack* s) {', 'int pop(Stack& s) {', '  int pop() {', '    def pop(self):'),
          quad('pop-check', '  if (s->size == 0) return -1;', '  if (s.size == 0) return -1;', '    if (size == 0) return -1;', '        if self.size == 0: return -1'),
          quad('pop-size', '  s->size--;', '  s.size--;', '    size--;', '        self.size -= 1'),
          quad('pop-read', '  return s->data[s->size];', '  return s.slots[s.size];', '    return slots[size];', '        return self.slots[self.size]'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
      case 'peek':
        lines = [
          quad(undefined, 'int peek(Stack* s) {', 'int peek(Stack& s) {', '  int peek() {', '    def peek(self):'),
          quad('peek-check', '  if (s->size == 0) return -1;', '  if (s.size == 0) return -1;', '    if (size == 0) return -1;', '        if self.size == 0: return -1'),
          quad('peek-read', '  return s->data[s->size - 1];', '  return s.slots[s.size - 1];', '    return slots[size - 1];', '        return self.slots[self.size - 1]'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
      case 'search':
        lines = [
          quad(undefined, 'int search(Stack* s, int target) {', 'int search(Stack& s, int target) {', '  int search(int target) {', '    def search(self, target):'),
          quad('search-init', '  int distance = 0;', '  int distance = 0;', '    int distance = 0;', '        distance = 0'),
          quad('search-check', '  for (int i = s->size - 1; i >= 0; i--) {', '  for (int i = s.size - 1; i >= 0; i--) {', '    for (int i = size - 1; i >= 0; i--) {', '        for i in range(self.size - 1, -1, -1):'),
          quad('search-compare', '    if (s->data[i] == target)', '    if (s.slots[i] == target)', '      if (slots[i] == target)', '            if self.slots[i] == target:'),
          quad('search-found', '      return s->size - 1 - i;', '      return s.size - 1 - i;', '        return size - 1 - i;', '                return self.size - 1 - i'),
          quad('search-advance', '  }', '  }', '    }', ''),
          quad('search-missing', '  return -1;', '  return -1;', '    return -1;', '        return -1'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
    }
  } else {
    switch (config.operation) {
      case 'push':
        lines = [
          quad(undefined, 'void push(Stack* s, int value) {', 'void push(Stack& s, int value) {', '  void push(int value) {', '    def push(self, value):'),
          quad('push-alloc', '  Node* newNode = malloc(sizeof(Node));', '  Node* newNode = new Node();', '    Node newNode = new Node(value);', '        new_node = Node(value)'),
          quad('push-link', '  newNode->next = s->head;', '  newNode->next = s.head;', '    newNode.next = head;', '        new_node.next = self.head'),
          quad('push-head', '  s->head = newNode;', '  s.head = newNode;', '    head = newNode;', '        self.head = new_node'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
      case 'pop':
        lines = [
          quad(undefined, 'int pop(Stack* s) {', 'int pop(Stack& s) {', '  int pop() {', '    def pop(self):'),
          quad('pop-check', '  if (s->head == NULL) return -1;', '  if (s.head == nullptr) return -1;', '    if (head == null) return -1;', '        if self.head is None: return -1'),
          quad('pop-read', '  int value = s->head->value;', '  int value = s.head->value;', '    int value = head.value;', '        value = self.head.value'),
          quad('pop-head', '  Node* temp = s->head; s->head = s->head->next;', '  Node* temp = s.head; s.head = s.head->next;', '    head = head.next;', '        self.head = self.head.next'),
          quad('pop-free', '  free(temp); return value;', '  delete temp; return value;', '    return value;', '        return value'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
      case 'peek':
        lines = [
          quad(undefined, 'int peek(Stack* s) {', 'int peek(Stack& s) {', '  int peek() {', '    def peek(self):'),
          quad('peek-check', '  if (s->head == NULL) return -1;', '  if (s.head == nullptr) return -1;', '    if (head == null) return -1;', '        if self.head is None: return -1'),
          quad('peek-read', '  return s->head->value;', '  return s.head->value;', '    return head.value;', '        return self.head.value'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
      case 'search':
        lines = [
          quad(undefined, 'int search(Stack* s, int target) {', 'int search(Stack& s, int target) {', '  int search(int target) {', '    def search(self, target):'),
          quad('search-init', '  int distance = 0; Node* current = s->head;', '  int distance = 0; Node* current = s.head;', '    int distance = 0; Node current = head;', '        distance = 0; current = self.head'),
          quad('search-check', '  while (current != NULL) {', '  while (current != nullptr) {', '    while (current != null) {', '        while current is not None:'),
          quad('search-compare', '    if (current->value == target)', '    if (current->value == target)', '      if (current.value == target)', '            if current.value == target:'),
          quad('search-found', '      return distance;', '      return distance;', '        return distance;', '                return distance'),
          quad('search-advance', '    current = current->next; distance++;', '    current = current->next; distance++;', '      current = current.next; distance++;', '            current = current.next; distance += 1'),
          quad(undefined, '  }', '  }', '    }', ''),
          quad('search-missing', '  return -1;', '  return -1;', '    return -1;', '        return -1'),
          quad(undefined, '}', '}', '  }', '')
        ];
        break;
    }
  }
  
  return lines.map((q, i) => ({
    id: q.semantic || `L${i}`,
    semanticOperationId: q.semantic || null,
    text: q[lang]
  }));
}

function deriveComplexity(config: ResolvedConfig): string[] {
  return ['O(1) normally.'];
}

export function createStackLesson(input: StackConfig = DEFAULT_STACK_CONFIG): TraceLesson {
  const config = resolveConfig(input);
  const metadata = getStackOperationMetadata(config.operation);
  let caseId = metadata.cases[0].id;
  
  if (config.operation === 'push' && config.backing === 'dynamic-array') {
    caseId = config.values.length === config.capacity ? 'push-resize' : 'push-normal';
  } else if (config.operation === 'search') {
    caseId = 'search-normal';
  }
  
  const complexityCase = {
    ...metadata.cases.find(c => c.id === caseId)!,
    derivation: deriveComplexity(config)
  };
  
  const state = initialRuntime(config);
  const builder = createTraceBuilder(config, complexityCase, state);
  
  switch (config.operation) {
    case 'push': runPush(builder, config); break;
    case 'pop': runPop(builder, config); break;
    case 'peek': runPeek(builder, config); break;
    case 'search': runSearch(builder, config); break;
  }
  
  return {
    id: `stack-${config.backing}-${config.operation}`,
    subject: 'dsa-1',
    topic: 'stack',
    title: `Stack: ${metadata.label} (${config.backing})`,
    description: metadata.description,
    difficulty: 'beginner',
    learningObjectives: ['Understand stack operations', 'Understand complexity'],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: {
      c: sourceLines(config, 'c'),
      cpp: sourceLines(config, 'cpp'),
      java: sourceLines(config, 'java'),
      python: sourceLines(config, 'python')
    },
    initialState: traceState(initialRuntime(config), config),
    steps: builder.steps,
    completionCriteria: { requiredCorrectPredictions: 0, masteryThreshold: 0 }
  };
}
