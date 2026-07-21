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

export type HashTableOperation = 'insert' | 'search' | 'delete';
export type HashTableBacking = 'separate-chaining' | 'linear-probing';
export type HashFunctionType = 'good' | 'collision-heavy';
export type HashTableOperationGroup = 'Insertion' | 'Retrieval' | 'Deletion';

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
  cases: readonly HashTableComplexityCase[];
}

export interface HashTableConfig {
  operation: HashTableOperation;
  backing: HashTableBacking;
  hashType: HashFunctionType;
  initialEntries: { key: number; value: number }[];
  capacity?: number;
  targetKey: number;
  targetValue?: number;
}

export const DEFAULT_HASH_TABLE_CONFIG: HashTableConfig = {
  operation: 'insert',
  backing: 'separate-chaining',
  hashType: 'good',
  initialEntries: [{ key: 10, value: 100 }, { key: 20, value: 200 }],
  capacity: 4,
  targetKey: 30,
  targetValue: 300
};

const operation = (
  id: HashTableOperation,
  label: string,
  description: string,
  group: HashTableOperationGroup,
  cases: readonly HashTableComplexityCase[]
): HashTableOperationMetadata => ({
  id,
  label,
  description,
  group,
  cases
});

export const HASH_TABLE_OPERATIONS: readonly HashTableOperationMetadata[] = [
  operation(
    'insert',
    'Insert',
    'Insert a key-value pair into the hash table.',
    'Insertion',
    [
      {
        id: 'insert-average',
        label: 'Average Case',
        caseType: 'average',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Any',
        assumptions: ['Good hash function', 'No resize needed'],
        description: 'Directly insert at the hashed index with minimal collisions.'
      },
      {
        id: 'insert-worst',
        label: 'Worst Case',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(n)',
        implementationVariant: 'Any',
        assumptions: ['Collision-heavy hash function or resizing'],
        description: 'All elements hash to the same bucket/probe sequence or a resize is triggered.'
      }
    ]
  ),
  operation(
    'search',
    'Search',
    'Find a value by key.',
    'Retrieval',
    [
      {
        id: 'search-average',
        label: 'Average Case',
        caseType: 'average',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Any',
        assumptions: ['Good hash function'],
        description: 'Directly locate the key at the hashed index.'
      },
      {
        id: 'search-worst',
        label: 'Worst Case',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Any',
        assumptions: ['Collision-heavy hash function'],
        description: 'Traverse all elements in a bucket or probe sequence.'
      }
    ]
  ),
  operation(
    'delete',
    'Delete',
    'Remove a key-value pair from the hash table.',
    'Deletion',
    [
      {
        id: 'delete-average',
        label: 'Average Case',
        caseType: 'average',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Any',
        assumptions: ['Good hash function'],
        description: 'Directly remove the key at the hashed index.'
      },
      {
        id: 'delete-worst',
        label: 'Worst Case',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Any',
        assumptions: ['Collision-heavy hash function'],
        description: 'Traverse all elements in a bucket or probe sequence to find the key.'
      }
    ]
  )
];

export function getHashTableOperationMetadata(operationId: HashTableOperation): HashTableOperationMetadata {
  const metadata = HASH_TABLE_OPERATIONS.find((c) => c.id === operationId);
  if (!metadata) throw new Error(`Unknown hash table operation: ${String(operationId)}`);
  return metadata;
}

export interface RuntimeNode {
  id: string;
  key: number;
  value: number;
  next: string | null;
  status: 'live' | 'detached' | 'deleted';
}

export interface RuntimeCell {
  id: string;
  key: number | null;
  value: number | null;
  status: 'empty' | 'occupied' | 'tombstone';
}

export interface RuntimeState {
  backing: HashTableBacking;
  hashType: HashFunctionType;
  capacity: number;
  size: number;
  loadFactor: number;
  
  buckets: (string | null)[];
  nodes: RuntimeNode[];
  
  cells: RuntimeCell[];
  
  result: TraceValue;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: HashTableOperation;
  backing: HashTableBacking;
  hashType: HashFunctionType;
  initialEntries: { key: number; value: number }[];
  capacity: number;
  targetKey: number;
  targetValue: number;
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

function cloneNodes(nodes: RuntimeNode[]): RuntimeNode[] {
  return nodes.map((node) => ({ ...node }));
}

function cloneCells(cells: RuntimeCell[]): RuntimeCell[] {
  return cells.map((cell) => ({ ...cell }));
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    backing: config.backing,
    hashType: config.hashType,
    capacity: state.capacity,
    size: state.size,
    loadFactor: state.loadFactor,
    buckets: [...state.buckets],
    nodes: cloneNodes(state.nodes) as unknown as TraceValue,
    cells: cloneCells(state.cells) as unknown as TraceValue,
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function resolveConfig(input: HashTableConfig): ResolvedConfig {
  if (!HASH_TABLE_OPERATIONS.some((c) => c.id === input.operation)) {
    throw new Error(`Unsupported hash table operation: ${String(input.operation)}`);
  }
  return {
    operation: input.operation,
    backing: input.backing,
    hashType: input.hashType,
    initialEntries: input.initialEntries.map((e) => ({ ...e })),
    capacity: input.capacity ?? Math.max(4, input.initialEntries.length * 2),
    targetKey: input.targetKey,
    targetValue: input.targetValue ?? 0
  };
}

function hashFunc(key: number, capacity: number, type: HashFunctionType): number {
  if (type === 'collision-heavy') return 1 % capacity;
  return Math.abs(key) % capacity;
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const state: RuntimeState = {
    backing: config.backing,
    hashType: config.hashType,
    capacity: config.capacity,
    size: 0,
    loadFactor: 0,
    buckets: new Array(config.capacity).fill(null),
    nodes: [],
    cells: Array.from({ length: config.capacity }, (_, i) => ({
      id: `C${i}`,
      key: null,
      value: null,
      status: 'empty'
    })),
    result: null,
    cumulativeWork: {},
    operationCount: 0
  };

  // Populate initial entries silently
  for (const entry of config.initialEntries) {
    if (config.backing === 'separate-chaining') {
      const h = hashFunc(entry.key, state.capacity, config.hashType);
      let curr = state.buckets[h];
      let found = false;
      while (curr !== null) {
        const node = state.nodes.find(n => n.id === curr)!;
        if (node.key === entry.key) {
          node.value = entry.value;
          found = true;
          break;
        }
        curr = node.next;
      }
      if (!found) {
        const newNode: RuntimeNode = {
          id: `N${state.nodes.length + 1}`,
          key: entry.key,
          value: entry.value,
          next: state.buckets[h],
          status: 'live'
        };
        state.nodes.push(newNode);
        state.buckets[h] = newNode.id;
        state.size++;
      }
    } else {
      let h = hashFunc(entry.key, state.capacity, config.hashType);
      for (let i = 0; i < state.capacity; i++) {
        const cell = state.cells[h];
        if (cell.status === 'empty' || cell.status === 'tombstone') {
          cell.key = entry.key;
          cell.value = entry.value;
          cell.status = 'occupied';
          state.size++;
          break;
        } else if (cell.key === entry.key) {
          cell.value = entry.value;
          break;
        }
        h = (h + 1) % state.capacity;
      }
    }
  }
  state.loadFactor = state.size / state.capacity;
  return state;
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
  return [
    quad(undefined, '// C source', '// C++ source', '// Java source', '# Python source'),
    quad('start', 'void op() {', 'void op() {', 'void op() {', 'def op():'),
    quad('hash', '  int h = hash(key);', '  int h = hash(key);', '  int h = hash(key);', '  h = hash(key)'),
    quad('logic', '  // execute logic', '  // execute logic', '  // execute logic', '  # execute logic'),
    quad('resize', '  // resize if needed', '  // resize if needed', '  // resize if needed', '  # resize if needed'),
    quad('end', '}', '}', '}', '')
  ];
}

function sourceLines(config: ResolvedConfig, lang: SupportedLanguage): SourceLine[] {
  const quads = operationSource(config);
  return quads.map((q, index) => ({ id: `L${index}`, number: index + 1, semanticOperationId: q.semantic || undefined, text: q[lang] }));
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const meta = getHashTableOperationMetadata(config.operation);
  let c = meta.cases[0];
  if (config.hashType === 'collision-heavy') {
    c = meta.cases.find(x => x.id.includes('worst')) || meta.cases[0];
  }
  return { ...c, derivation: [] };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const isChaining = state.backing === 'separate-chaining';
  const entities: TraceEntity[] = [];

  entities.push({
    id: 'capacity',
    type: 'variable',
    label: 'capacity',
    value: state.capacity
  });
  entities.push({
    id: 'size',
    type: 'variable',
    label: 'size',
    value: state.size
  });
  entities.push({
    id: 'loadFactor',
    type: 'variable',
    label: 'loadFactor',
    value: state.loadFactor
  });
  entities.push({
    id: 'operation-count',
    type: 'variable',
    label: 'exact operations',
    value: state.operationCount
  });

  if (isChaining) {
    state.buckets.forEach((headId, i) => {
      entities.push({
        id: `bucket-${i}`,
        type: 'array-cell',
        label: `bucket[${i}]`,
        value: headId,
        metadata: {}
      });
    });
    state.nodes.forEach(node => {
      entities.push({
        id: node.id,
        type: 'node',
        label: node.id,
        value: `{${node.key}:${node.value}}`,
        metadata: {
          next: node.next,
          status: node.status,
          key: node.key
        }
      });
    });
  } else {
    state.cells.forEach((cell, i) => {
      entities.push({
        id: cell.id,
        type: 'array-cell',
        label: `cell[${i}]`,
        value: cell.status === 'occupied' ? `{${cell.key}:${cell.value}}` : cell.status,
        metadata: {
          status: cell.status,
          key: cell.key
        }
      });
    });
  }

  return entities;
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const backing = before.backing as HashTableBacking;

  const vars = ['capacity', 'size', 'loadFactor'];
  for (const v of vars) {
    if (before[v] !== after[v]) {
      mutations.push({
        entityId: v,
        property: 'value',
        previousValue: before[v],
        nextValue: after[v],
        animation: 'pulse'
      });
    }
  }

  if (backing === 'separate-chaining') {
    const beforeBuckets = (before.buckets as (string | null)[]) ?? [];
    const afterBuckets = (after.buckets as (string | null)[]) ?? [];
    for (let i = 0; i < Math.max(beforeBuckets.length, afterBuckets.length); i++) {
      if (beforeBuckets[i] !== afterBuckets[i]) {
        mutations.push({
          entityId: `bucket-${i}`,
          property: 'value',
          previousValue: beforeBuckets[i],
          nextValue: afterBuckets[i],
          animation: 'pulse'
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
      if (prior.value !== node.value) {
        mutations.push({
          entityId: node.id,
          property: 'value',
          previousValue: prior.value,
          nextValue: node.value,
          animation: 'pulse'
        });
      }
    }
  } else {
    const beforeCells = new Map(
      ((before.cells as unknown as RuntimeCell[]) ?? []).map((c) => [c.id, c])
    );
    const afterCells = (after.cells as unknown as RuntimeCell[]) ?? [];

    for (const cell of afterCells) {
      const prior = beforeCells.get(cell.id);
      if (!prior) {
        mutations.push({
          entityId: cell.id,
          property: 'cell',
          previousValue: null,
          nextValue: { ...cell },
          animation: 'insert'
        });
        continue;
      }
      if (prior.status !== cell.status || prior.key !== cell.key || prior.value !== cell.value) {
        mutations.push({
          entityId: cell.id,
          property: 'value',
          previousValue: prior.status === 'occupied' ? `{${prior.key}:${prior.value}}` : prior.status,
          nextValue: cell.status === 'occupied' ? `{${cell.key}:${cell.value}}` : cell.status,
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

    if (state.capacity > peakAuxiliary) peakAuxiliary = state.capacity;

    const complexityEvidence: ComplexityEvidence = {
      caseId: complexityCase.id,
      selectedCase: complexityCase.caseType,
      implementationVariant: complexityCase.implementationVariant,
      inputSize: { n: state.size },
      exactOperationCount,
      cumulativeOperationCount: state.operationCount,
      stepWork: cloneWork(stepWork),
      cumulativeWork: cloneWork(state.cumulativeWork),
      timeComplexity: complexityCase.timeComplexity,
      auxiliarySpace: complexityCase.auxiliarySpace,
      space: {
        auxiliary: { current: state.capacity, peak: peakAuxiliary, unit: 'variables' },
        output: { current: state.size, peak: Math.max(state.size, state.capacity), unit: 'elements' }
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

function checkResize(builder: TraceBuilder, config: ResolvedConfig) {
  if (builder.state.loadFactor > 0.75) {
    const newCap = builder.state.capacity * 2;
    builder.add('resize', 'Resize Hash Table', `Load factor ${builder.state.loadFactor.toFixed(2)} > 0.75. Doubling capacity to ${newCap}.`, { allocation: newCap }, (s) => {
      s.capacity = newCap;
      if (s.backing === 'separate-chaining') {
        s.buckets = new Array(newCap).fill(null);
        // Reset node links to re-insert them
        for (const n of s.nodes) {
          if (n.status === 'live') {
            n.next = null;
          }
        }
      } else {
        s.cells = Array.from({ length: newCap }, (_, i) => ({
          id: `C${i}`,
          key: null,
          value: null,
          status: 'empty'
        }));
      }
    });

    builder.add('resize', 'Rehash elements', 'Rehashing all existing elements into the new structure.', { read: builder.state.size }, (s) => {
      if (s.backing === 'separate-chaining') {
        // We only rehash 'live' nodes
        for (const n of s.nodes) {
          if (n.status === 'live') {
            const h = hashFunc(n.key, s.capacity, s.hashType);
            n.next = s.buckets[h];
            s.buckets[h] = n.id;
          }
        }
      } else {
        const oldEntries = builder.steps[builder.steps.length - 2].stateAfter.cells as unknown as unknown as RuntimeCell[];
        for (const cell of oldEntries) {
          if (cell.status === 'occupied') {
            let h = hashFunc(cell.key!, s.capacity, s.hashType);
            for (let i = 0; i < s.capacity; i++) {
              if (s.cells[h].status === 'empty') {
                s.cells[h].key = cell.key;
                s.cells[h].value = cell.value;
                s.cells[h].status = 'occupied';
                break;
              }
              h = (h + 1) % s.capacity;
            }
          }
        }
      }
      s.loadFactor = s.size / s.capacity;
    });
  }
}

function runInsert(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Insert', `Inserting key ${config.targetKey}.`, { comparison: 1 });
  
  const h = hashFunc(config.targetKey, builder.state.capacity, config.hashType);
  builder.add('hash', 'Compute Hash', `Hash for key ${config.targetKey} is ${h}.`, { read: 1 });
  
  if (config.backing === 'separate-chaining') {
    let curr = builder.state.buckets[h];
    let found = false;
    let probes = 0;
    while (curr !== null) {
      probes++;
      const node = builder.state.nodes.find(n => n.id === curr)!;
      builder.add('logic', 'Traverse bucket', `Checking node with key ${node.key}.`, { comparison: 1 });
      if (node.key === config.targetKey) {
        builder.add('logic', 'Update existing', `Key found. Updating value to ${config.targetValue}.`, { 'write': 1 }, (s) => {
          const n = s.nodes.find(x => x.id === curr)!;
          n.value = config.targetValue;
        });
        found = true;
        break;
      }
      curr = node.next;
    }
    
    if (!found) {
      builder.add('logic', 'Insert new node', `Key not found. Prepending new node to bucket ${h}.`, { allocation: 1, 'pointer-write': 1 }, (s) => {
        const newNode: RuntimeNode = {
          id: `N${s.nodes.length + 1}`,
          key: config.targetKey,
          value: config.targetValue,
          next: s.buckets[h],
          status: 'live'
        };
        s.nodes.push(newNode);
        s.buckets[h] = newNode.id;
        s.size++;
        s.loadFactor = s.size / s.capacity;
      });
      checkResize(builder, config);
    }
  } else {
    let currH = h;
    let probes = 0;
    let found = false;
    for (let i = 0; i < builder.state.capacity; i++) {
      probes++;
      const cell = builder.state.cells[currH];
      builder.add('logic', 'Probe cell', `Checking cell ${currH} (status: ${cell.status}).`, { 'read': 1, comparison: 1 });
      
      if (cell.status === 'empty' || cell.status === 'tombstone') {
        builder.add('logic', 'Insert into empty/tombstone', `Found available cell at ${currH}. Inserting.`, { 'write': 1 }, (s) => {
          s.cells[currH].key = config.targetKey;
          s.cells[currH].value = config.targetValue;
          s.cells[currH].status = 'occupied';
          s.size++;
          s.loadFactor = s.size / s.capacity;
        });
        found = true;
        break;
      } else if (cell.key === config.targetKey) {
        builder.add('logic', 'Update existing', `Key found at cell ${currH}. Updating value.`, { 'write': 1 }, (s) => {
          s.cells[currH].value = config.targetValue;
        });
        found = true;
        break;
      }
      
      currH = (currH + 1) % builder.state.capacity;
    }
    if (!found) {
      builder.add('end', 'Table Full', 'Could not insert, table is full.', { comparison: 1 });
    } else {
      checkResize(builder, config);
    }
  }
}

function runSearch(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Search', `Searching for key ${config.targetKey}.`, { comparison: 1 });
  const h = hashFunc(config.targetKey, builder.state.capacity, config.hashType);
  builder.add('hash', 'Compute Hash', `Hash for key ${config.targetKey} is ${h}.`, { read: 1 });

  if (config.backing === 'separate-chaining') {
    let curr = builder.state.buckets[h];
    let found = false;
    while (curr !== null) {
      const node = builder.state.nodes.find(n => n.id === curr)!;
      builder.add('logic', 'Traverse bucket', `Checking node with key ${node.key}.`, { comparison: 1 });
      if (node.key === config.targetKey) {
        builder.add('logic', 'Found key', `Key ${config.targetKey} found with value ${node.value}.`, { 'pointer-read': 1 }, (s) => {
          s.result = node.value;
        });
        found = true;
        break;
      }
      curr = node.next;
    }
    if (!found) {
      builder.add('end', 'Not found', `Key ${config.targetKey} not found in the hash table.`, { comparison: 1 }, (s) => {
        s.result = null;
      });
    }
  } else {
    let currH = h;
    let found = false;
    for (let i = 0; i < builder.state.capacity; i++) {
      const cell = builder.state.cells[currH];
      builder.add('logic', 'Probe cell', `Checking cell ${currH} (status: ${cell.status}).`, { 'read': 1, comparison: 1 });
      
      if (cell.status === 'empty') {
        break;
      } else if (cell.status === 'occupied' && cell.key === config.targetKey) {
        builder.add('logic', 'Found key', `Key ${config.targetKey} found at cell ${currH}.`, { 'read': 1 }, (s) => {
          s.result = cell.value;
        });
        found = true;
        break;
      }
      currH = (currH + 1) % builder.state.capacity;
    }
    if (!found) {
      builder.add('end', 'Not found', `Key ${config.targetKey} not found in the hash table.`, { comparison: 1 }, (s) => {
        s.result = null;
      });
    }
  }
}

function runDelete(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Delete', `Deleting key ${config.targetKey}.`, { comparison: 1 });
  const h = hashFunc(config.targetKey, builder.state.capacity, config.hashType);
  builder.add('hash', 'Compute Hash', `Hash for key ${config.targetKey} is ${h}.`, { read: 1 });

  if (config.backing === 'separate-chaining') {
    let curr = builder.state.buckets[h];
    let prev: string | null = null;
    let found = false;
    while (curr !== null) {
      const node = builder.state.nodes.find(n => n.id === curr)!;
      builder.add('logic', 'Traverse bucket', `Checking node with key ${node.key}.`, { comparison: 1 });
      if (node.key === config.targetKey) {
        builder.add('logic', 'Delete node', `Key found. Detaching node from bucket.`, { 'pointer-write': 1 }, (s) => {
          const n = s.nodes.find(x => x.id === curr)!;
          n.status = 'deleted';
          if (prev === null) {
            s.buckets[h] = n.next;
          } else {
            const p = s.nodes.find(x => x.id === prev)!;
            p.next = n.next;
          }
          s.size--;
          s.loadFactor = s.size / s.capacity;
        });
        found = true;
        break;
      }
      prev = curr;
      curr = node.next;
    }
    if (!found) {
      builder.add('end', 'Not found', `Key ${config.targetKey} not found. Nothing to delete.`, { comparison: 1 });
    }
  } else {
    let currH = h;
    let found = false;
    for (let i = 0; i < builder.state.capacity; i++) {
      const cell = builder.state.cells[currH];
      builder.add('logic', 'Probe cell', `Checking cell ${currH} (status: ${cell.status}).`, { 'read': 1, comparison: 1 });
      
      if (cell.status === 'empty') {
        break;
      } else if (cell.status === 'occupied' && cell.key === config.targetKey) {
        builder.add('logic', 'Delete cell', `Key found. Marking cell ${currH} as tombstone.`, { 'write': 1 }, (s) => {
          s.cells[currH].status = 'tombstone';
          s.cells[currH].key = null;
          s.cells[currH].value = null;
          s.size--;
          s.loadFactor = s.size / s.capacity;
        });
        found = true;
        break;
      }
      currH = (currH + 1) % builder.state.capacity;
    }
    if (!found) {
      builder.add('end', 'Not found', `Key ${config.targetKey} not found. Nothing to delete.`, { comparison: 1 });
    }
  }
}

export function createHashTableLesson(
  input: HashTableConfig = DEFAULT_HASH_TABLE_CONFIG
): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const state = initialRuntime(config);
  const builder = createTraceBuilder(config, complexityCase, state);

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
  }

  const metadata = getHashTableOperationMetadata(config.operation);
  return {
    id: `hashTable-${config.backing}-${config.operation}`,
    subject: 'dsa-1',
    topic: 'Hash Table',
    title: `Hash Table Lab \u2014 ${metadata.label}`,
    description: metadata.description,
    difficulty: 'intermediate',
    learningObjectives: [
      'Understand hash functions and collision resolution.',
      'Trace linear probing and separate chaining.',
      'Understand the impact of load factor and rehashing.'
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
