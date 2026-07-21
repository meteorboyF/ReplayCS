import type {
  ComplexityCaseType,
  ComplexityClass,
  ComplexityEvidence,
  WorkCounts
} from '$lib/complexity/types';
import type {
  SourceLine,
  SupportedLanguage,
  TraceEntity,
  TraceLesson,
  TraceMutation,
  TraceStep,
  TraceValue
} from '$lib/trace/types';

export type SearchAlgorithm = 'linear-search' | 'binary-search-iterative' | 'binary-search-recursive' | 'bst-search' | 'hash-lookup';

export interface SearchComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface SearchAlgorithmMetadata {
  id: SearchAlgorithm;
  label: string;
  description: string;
  cases: readonly SearchComplexityCase[];
}

export interface SearchConfig {
  algorithm: SearchAlgorithm;
  values: number[];
  target: number;
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  algorithm: 'binary-search-iterative',
  values: [2, 5, 8, 12, 16, 23, 38, 56],
  target: 23
};

const algorithm = (
  id: SearchAlgorithm,
  label: string,
  description: string,
  cases: readonly SearchComplexityCase[]
): SearchAlgorithmMetadata => ({
  id,
  label,
  description,
  cases
});

export const SEARCH_ALGORITHMS: readonly SearchAlgorithmMetadata[] = [
  algorithm(
    'linear-search',
    'Linear Search',
    'Find an element by checking each item sequentially.',
    [
      { id: 'linear-best', label: 'Best Case', caseType: 'best', timeComplexity: 'O(1)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is at the first position'], description: 'Found immediately.' },
      { id: 'linear-average', label: 'Average Case', caseType: 'average', timeComplexity: 'O(n)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is equally likely to be anywhere'], description: 'Found in the middle.' },
      { id: 'linear-worst', label: 'Worst Case', caseType: 'worst', timeComplexity: 'O(n)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is not present or at the very end'], description: 'Checked all elements.' }
    ]
  ),
  algorithm(
    'binary-search-iterative',
    'Binary Search (Iterative)',
    'Find an element in a sorted array by halving the search interval iteratively.',
    [
      { id: 'binary-iterative-best', label: 'Best Case', caseType: 'best', timeComplexity: 'O(1)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is at the middle'], description: 'Found at the first midpoint.' },
      { id: 'binary-iterative-average', label: 'Average Case', caseType: 'average', timeComplexity: 'O(log n)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is randomly distributed'], description: 'Requires logarithmic comparisons.' },
      { id: 'binary-iterative-worst', label: 'Worst Case', caseType: 'worst', timeComplexity: 'O(log n)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is not present or at extremes'], description: 'Interval shrinks until empty.' }
    ]
  ),
  algorithm(
    'binary-search-recursive',
    'Binary Search (Recursive)',
    'Find an element in a sorted array by halving the search interval recursively.',
    [
      { id: 'binary-recursive-best', label: 'Best Case', caseType: 'best', timeComplexity: 'O(1)', auxiliarySpace: 'O(1)', implementationVariant: 'Recursive', assumptions: ['Target is at the middle'], description: 'Found at the first midpoint.' },
      { id: 'binary-recursive-average', label: 'Average Case', caseType: 'average', timeComplexity: 'O(log n)', auxiliarySpace: 'O(log n)', implementationVariant: 'Recursive', assumptions: ['Target is randomly distributed'], description: 'Requires logarithmic calls.' },
      { id: 'binary-recursive-worst', label: 'Worst Case', caseType: 'worst', timeComplexity: 'O(log n)', auxiliarySpace: 'O(log n)', implementationVariant: 'Recursive', assumptions: ['Target is not present or at extremes'], description: 'Max call stack depth reached.' }
    ]
  ),
  algorithm(
    'bst-search',
    'BST Search',
    'Find an element in a Binary Search Tree.',
    [
      { id: 'bst-best', label: 'Best Case', caseType: 'best', timeComplexity: 'O(1)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Target is the root'], description: 'Found at root.' },
      { id: 'bst-average', label: 'Average Case', caseType: 'average', timeComplexity: 'O(log n)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Tree is balanced'], description: 'Traverse height of balanced tree.' },
      { id: 'bst-worst', label: 'Worst Case', caseType: 'worst', timeComplexity: 'O(n)', auxiliarySpace: 'O(1)', implementationVariant: 'Iterative', assumptions: ['Tree is skewed'], description: 'Traverse all nodes in skewed tree.' }
    ]
  ),
  algorithm(
    'hash-lookup',
    'Hash Lookup',
    'Find an element in a Hash Table.',
    [
      { id: 'hash-best', label: 'Best Case', caseType: 'best', timeComplexity: 'O(1)', auxiliarySpace: 'O(1)', implementationVariant: 'Separate Chaining', assumptions: ['No collisions'], description: 'Found directly at hashed index.' },
      { id: 'hash-average', label: 'Average Case', caseType: 'average', timeComplexity: 'O(1)', auxiliarySpace: 'O(1)', implementationVariant: 'Separate Chaining', assumptions: ['Uniform hashing'], description: 'Few collisions.' },
      { id: 'hash-worst', label: 'Worst Case', caseType: 'worst', timeComplexity: 'O(n)', auxiliarySpace: 'O(1)', implementationVariant: 'Separate Chaining', assumptions: ['All keys collide'], description: 'Traverse entire chain.' }
    ]
  )
];

export function getSearchAlgorithmMetadata(id: SearchAlgorithm): SearchAlgorithmMetadata {
  const metadata = SEARCH_ALGORITHMS.find(a => a.id === id);
  if (!metadata) throw new Error(`Unknown algorithm: ${id}`);
  return metadata;
}

// Tree node structure for BST
export interface TreeNode {
  id: string;
  value: number;
  left: string | null;
  right: string | null;
}

export interface RuntimeState {
  algorithm: SearchAlgorithm;
  values: number[];
  target: number;
  
  // Linear / Binary state
  index: number | null;
  left: number | null;
  right: number | null;
  mid: number | null;
  
  // Recursive Binary Search state
  callStackDepth: number;

  // BST state
  nodes: TreeNode[];
  rootId: string | null;
  currentNodeId: string | null;
  
  // Hash state
  hashTableSize: number;
  buckets: (number[])[];
  currentBucket: number | null;
  
  result: number | null; // index for arrays, value for BST/Hash or -1
  comparisons: number;
  
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  algorithm: SearchAlgorithm;
  values: number[];
  target: number;
}

function resolveConfig(input: SearchConfig): ResolvedConfig {
  const sorted = [...input.values].sort((a, b) => a - b);
  return {
    algorithm: input.algorithm,
    values: (input.algorithm === 'binary-search-iterative' || input.algorithm === 'binary-search-recursive') ? sorted : [...input.values],
    target: input.target
  };
}

function buildBST(values: number[]): { nodes: TreeNode[], rootId: string | null } {
  if (values.length === 0) return { nodes: [], rootId: null };
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const nodes: TreeNode[] = [];
  
  function build(arr: number[], start: number, end: number): string | null {
    if (start > end) return null;
    const mid = Math.floor((start + end) / 2);
    const node: TreeNode = {
      id: `N${nodes.length}`,
      value: arr[mid],
      left: null,
      right: null
    };
    const id = node.id;
    nodes.push(node);
    node.left = build(arr, start, mid - 1);
    node.right = build(arr, mid + 1, end);
    return id;
  }
  
  const rootId = build(sorted, 0, sorted.length - 1);
  return { nodes, rootId };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  let nodes: TreeNode[] = [];
  let rootId: string | null = null;
  let buckets: (number[])[] = [];
  let hashTableSize = 10;
  
  if (config.algorithm === 'bst-search') {
    const bst = buildBST(config.values);
    nodes = bst.nodes;
    rootId = bst.rootId;
  } else if (config.algorithm === 'hash-lookup') {
    hashTableSize = Math.max(10, config.values.length);
    buckets = Array(hashTableSize).fill(null).map(() => []);
    for (const v of config.values) {
      const idx = v % hashTableSize;
      if (!buckets[idx].includes(v)) {
        buckets[idx].push(v);
      }
    }
  }

  return {
    algorithm: config.algorithm,
    values: config.values,
    target: config.target,
    index: null,
    left: null,
    right: null,
    mid: null,
    callStackDepth: 1,
    nodes,
    rootId,
    currentNodeId: null,
    hashTableSize,
    buckets,
    currentBucket: null,
    result: null,
    comparisons: 0,
    cumulativeWork: {},
    operationCount: 0
  };
}

// Clone helpers
function cloneWork(w: WorkCounts): WorkCounts { return { ...w }; }
function addWork(c: WorkCounts, s: WorkCounts): WorkCounts {
  const n = cloneWork(c);
  for (const [k, v] of Object.entries(s)) {
    const key = k as keyof WorkCounts;
    n[key] = (n[key] ?? 0) + (v ?? 0);
  }
  return n;
}
function totalWork(w: WorkCounts): number {
  return Object.values(w).reduce((sum, count) => sum + (count ?? 0), 0);
}

function traceState(state: RuntimeState): Record<string, TraceValue> {
  return {
    algorithm: state.algorithm,
    values: [...state.values],
    target: state.target,
    index: state.index,
    left: state.left,
    right: state.right,
    mid: state.mid,
    callStackDepth: state.callStackDepth,
    nodes: state.nodes.map(n => ({ ...n })) as unknown as TraceValue,
    rootId: state.rootId,
    currentNodeId: state.currentNodeId,
    hashTableSize: state.hashTableSize,
    buckets: state.buckets.map(b => [...b]) as unknown as TraceValue,
    currentBucket: state.currentBucket,
    result: state.result,
    comparisons: state.comparisons,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = [];
  
  if (state.algorithm === 'bst-search') {
    state.nodes.forEach(node => {
      entities.push({
        id: node.id,
        type: 'node',
        label: node.id,
        value: String(node.value),
        metadata: {
          left: node.left,
          right: node.right,
          active: state.currentNodeId === node.id
        }
      });
    });
  } else if (state.algorithm === 'hash-lookup') {
    state.buckets.forEach((bucket, i) => {
      entities.push({
        id: `bucket-${i}`,
        type: 'array-cell',
        label: `bucket[${i}]`,
        value: bucket.length > 0 ? bucket.join(' -> ') : 'empty',
        metadata: { active: state.currentBucket === i }
      });
    });
  } else {
    state.values.forEach((value, i) => {
      let active = false;
      let inRange = false;
      if (state.algorithm === 'linear-search') {
        active = state.index === i;
      } else {
        active = state.mid === i;
        if (state.left !== null && state.right !== null) {
          inRange = i >= state.left && i <= state.right;
        }
      }
      entities.push({
        id: `cell-${i}`,
        type: 'array-cell',
        label: String(i),
        value,
        metadata: { active, inRange }
      });
    });
  }
  
  entities.push({
    id: 'target',
    type: 'variable',
    label: 'target',
    value: state.target
  });
  
  return entities;
}

function mutationsBetween(before: Record<string, TraceValue>, after: Record<string, TraceValue>): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const keysToTrack = ['index', 'left', 'right', 'mid', 'result', 'currentNodeId', 'currentBucket', 'callStackDepth'];
  
  for (const k of keysToTrack) {
    if (before[k] !== after[k]) {
      mutations.push({
        entityId: k,
        property: 'value',
        previousValue: before[k],
        nextValue: after[k],
        animation: 'highlight'
      });
    }
  }
  return mutations;
}

interface TraceBuilder {
  state: RuntimeState;
  steps: TraceStep[];
  add: (semantic: string, title: string, explanation: string, stepWork: WorkCounts, mutate?: (s: RuntimeState) => void, pred?: any) => void;
  peakAux: number;
}

function createTraceBuilder(config: ResolvedConfig, state: RuntimeState, caseType: ComplexityCaseType): TraceBuilder {
  const steps: TraceStep[] = [];
  const meta = getSearchAlgorithmMetadata(config.algorithm);
  let cCase = meta.cases.find(c => c.caseType === caseType) || meta.cases[0];
  
  const builder: TraceBuilder = {
    state,
    steps,
    peakAux: state.callStackDepth,
    add: (semantic, title, explanation, stepWork, mutate = () => {}, pred) => {
      const before = traceState(state);
      mutate(state);
      
      if (state.callStackDepth > builder.peakAux) {
        builder.peakAux = state.callStackDepth;
      }
      
      const exactOperationCount = totalWork(stepWork);
      state.cumulativeWork = addWork(state.cumulativeWork, stepWork);
      state.operationCount += exactOperationCount;
      const after = traceState(state);
      
      const evidence: ComplexityEvidence = {
        caseId: cCase.id,
        selectedCase: cCase.caseType,
        implementationVariant: cCase.implementationVariant,
        inputSize: { n: config.values.length },
        exactOperationCount,
        cumulativeOperationCount: state.operationCount,
        stepWork: cloneWork(stepWork),
        cumulativeWork: cloneWork(state.cumulativeWork),
        timeComplexity: cCase.timeComplexity,
        auxiliarySpace: cCase.auxiliarySpace,
        space: {
          auxiliary: { current: state.callStackDepth, peak: builder.peakAux, unit: 'scalar slots' },
          output: { current: state.result === null ? 0 : 1, peak: 1, unit: 'returned indices/values' },
          callStackDepth: state.callStackDepth
        },
        assumptions: [...cCase.assumptions],
        derivation: []
      };

      steps.push({
        id: `step-${steps.length}`,
        index: steps.length,
        eventType: semantic,
        sourceLineIds: [semantic],
        semanticOperationId: semantic,
        title,
        stateBefore: before,
        stateAfter: after,
        entities: entitiesFor(state),
        mutations: mutationsBetween(before, after),
        deterministicExplanation: explanation,
        complexityEvidence: evidence,
        complexityCost: { comparisons: state.comparisons },
        prediction: pred,
        visualFocus: []
      });
    }
  };
  return builder;
}

// --- Algorithm Runners ---

function runLinearSearch(b: TraceBuilder) {
  const { state } = b;
  b.add('init', 'Initialize', 'Set index to 0.', { write: 1 }, s => { s.index = 0; });
  
  while (state.index !== null && state.index < state.values.length) {
    b.add('check-loop', 'Check condition', `${state.index} < ${state.values.length}`, { comparison: 1 });
    
    b.add('compare', 'Compare element', `Compare values[${state.index}] (${state.values[state.index]}) with target (${state.target})`, { read: 2, comparison: 1 }, s => { s.comparisons++; });
    
    if (state.values[state.index] === state.target) {
      b.add('found', 'Found target', `Target ${state.target} found at index ${state.index}`, { return: 1 }, s => { s.result = s.index; });
      return;
    }
    
    b.add('increment', 'Increment index', 'Move to next element.', { read: 1, write: 1 }, s => { s.index = s.index! + 1; });
  }
  
  b.add('check-loop', 'Loop ends', 'Checked all elements.', { comparison: 1 });
  b.add('not-found', 'Not found', 'Target is not in array.', { return: 1 }, s => { s.result = -1; });
}

function runBinarySearchIterative(b: TraceBuilder) {
  const { state } = b;
  b.add('init', 'Initialize pointers', 'left = 0, right = n - 1', { write: 2 }, s => { s.left = 0; s.right = s.values.length - 1; });
  while (state.left! <= state.right!) {
    b.add('check-loop', 'Check condition', `${state.left} ≤ ${state.right}, so another candidate remains.`, { comparison: 1 });
    
    const nextMid = state.left! + Math.floor((state.right! - state.left!) / 2);
    b.add('calc-mid', 'Calculate mid', `The midpoint is ${nextMid}.`, { read: 1, write: 1 }, s => { s.mid = nextMid; }, {
      id: `mid-${b.steps.length}`,
      prompt: 'Which index becomes mid?',
      type: 'numeric',
      correctAnswer: nextMid,
      explanation: `The midpoint is ${nextMid}.`,
      xpReward: 10
    });
    
    b.add('compare', 'Compare target', `Compare values[${state.mid}] (${state.values[state.mid!]}) with ${state.target}`, { read: 2, comparison: 1 }, s => { s.comparisons++; });
    
    if (state.values[state.mid!] === state.target) {
      b.add('found', 'Found target', 'Target matches mid element.', { return: 1 }, s => { s.result = s.mid; });
      return;
    }
    
    if (state.values[state.mid!] < state.target) {
      b.add('update-left', 'Update left', 'Target is greater, search right half.', { write: 1, comparison: 1 }, s => { s.left = s.mid! + 1; });
    } else {
      b.add('update-right', 'Update right', 'Target is smaller, search left half.', { write: 1, comparison: 1 }, s => { s.right = s.mid! - 1; });
    }
  }
  b.add('check-loop', 'Loop ends', 'left > right, search space empty.', { comparison: 1 });
  b.add('not-found', 'Not found', 'Target not found.', { return: 1 }, s => { s.result = -1; });
}

function runBinarySearchRecursive(b: TraceBuilder) {
  const { state } = b;
  b.add('init', 'Initial call', 'Call binary search with left=0, right=n-1', { write: 2 }, s => { s.left = 0; s.right = s.values.length - 1; });
  
  function recurse(left: number, right: number, depth: number) {
    b.add('call', 'Recursive Call', `search(left=${left}, right=${right})`, { call: 1 }, s => {
      s.left = left; s.right = right; s.callStackDepth = depth;
    });
    
    b.add('check-base', 'Base case check', `${left} > ${right}?`, { comparison: 1 });
    if (left > right) {
      b.add('not-found', 'Not found', 'Base case reached, not found.', { return: 1 }, s => { s.result = -1; });
      return;
    }
    
    const mid = left + Math.floor((right - left) / 2);
    b.add('calc-mid', 'Calculate mid', `mid = ${mid}`, { read: 1, write: 1 }, s => { s.mid = mid; });
    
    b.add('compare', 'Compare', `values[${mid}] == ${state.target}?`, { read: 2, comparison: 1 }, s => { s.comparisons++; });
    if (state.values[mid] === state.target) {
      b.add('found', 'Found target', 'Target matches.', { return: 1 }, s => { s.result = mid; });
      return;
    }
    
    if (state.values[mid] < state.target) {
      b.add('branch-right', 'Go right', 'Search right half.', { comparison: 1 }, () => {});
      recurse(mid + 1, right, depth + 1);
    } else {
      b.add('branch-left', 'Go left', 'Search left half.', { comparison: 1 }, () => {});
      recurse(left, mid - 1, depth + 1);
    }
  }
  
  recurse(0, state.values.length - 1, 1);
}

function runBSTSearch(b: TraceBuilder) {
  const { state } = b;
  b.add('init', 'Initialize', 'Start at root.', { write: 1 }, s => { s.currentNodeId = s.rootId; });
  
  while (state.currentNodeId !== null) {
    const node = state.nodes.find(n => n.id === state.currentNodeId)!;
    b.add('check-node', 'Check node', `Current node is ${node.value}`, { comparison: 1 });
    
    b.add('compare', 'Compare', `${node.value} == ${state.target}?`, { read: 1, comparison: 1 }, s => { s.comparisons++; });
    if (node.value === state.target) {
      b.add('found', 'Found target', 'Match found.', { return: 1 }, s => { s.result = node.value; });
      return;
    }
    
    if (state.target < node.value) {
      b.add('go-left', 'Go left', 'Target is smaller.', { write: 1, comparison: 1 }, s => { s.currentNodeId = node.left; });
    } else {
      b.add('go-right', 'Go right', 'Target is larger.', { write: 1, comparison: 1 }, s => { s.currentNodeId = node.right; });
    }
  }
  
  b.add('not-found', 'Not found', 'Reached null pointer.', { return: 1 }, s => { s.result = -1; });
}

function runHashLookup(b: TraceBuilder) {
  const { state } = b;
  b.add('hash', 'Compute hash', `Hash for ${state.target} is ${state.target % state.hashTableSize}`, { read: 1 });
  const hashIdx = state.target % state.hashTableSize;
  
  b.add('access', 'Access bucket', `Go to bucket ${hashIdx}`, { read: 1, write: 1 }, s => { s.currentBucket = hashIdx; });
  
  const bucket = state.buckets[hashIdx];
  for (let i = 0; i < bucket.length; i++) {
    b.add('compare', 'Check item', `Compare ${bucket[i]} with ${state.target}`, { read: 1, comparison: 1 }, s => { s.comparisons++; });
    if (bucket[i] === state.target) {
      b.add('found', 'Found', 'Match found in bucket.', { return: 1 }, s => { s.result = state.target; });
      return;
    }
  }
  b.add('not-found', 'Not found', 'End of chain.', { return: 1 }, s => { s.result = -1; });
}

export function createSearchLesson(input: Partial<SearchConfig> = {}): TraceLesson {
  const resolved = resolveConfig({ ...DEFAULT_SEARCH_CONFIG, ...input });
  
  // Determine case type based on target presence/position
  let caseType: ComplexityCaseType = 'average';
  const valIdx = resolved.values.indexOf(resolved.target);
  
  if (resolved.algorithm === 'linear-search') {
    if (valIdx === 0) caseType = 'best';
    else if (valIdx === -1 || valIdx === resolved.values.length - 1) caseType = 'worst';
  } else if (resolved.algorithm.includes('binary')) {
    const mid = Math.floor((resolved.values.length - 1) / 2);
    if (valIdx === mid) caseType = 'best';
    else if (valIdx === -1) caseType = 'worst';
  } else if (resolved.algorithm === 'bst-search') {
    // simplified
    caseType = valIdx === -1 ? 'worst' : 'average';
  } else if (resolved.algorithm === 'hash-lookup') {
    caseType = valIdx === -1 ? 'worst' : 'average';
  }

  const state = initialRuntime(resolved);
  const builder = createTraceBuilder(resolved, state, caseType);
  
  switch (resolved.algorithm) {
    case 'linear-search': runLinearSearch(builder); break;
    case 'binary-search-iterative': runBinarySearchIterative(builder); break;
    case 'binary-search-recursive': runBinarySearchRecursive(builder); break;
    case 'bst-search': runBSTSearch(builder); break;
    case 'hash-lookup': runHashLookup(builder); break;
  }
  
  const meta = getSearchAlgorithmMetadata(resolved.algorithm);
  
  // Dummy source lines for now
  const src = [
    { id: '1', number: 1, text: '// ' + meta.label + ' implementation', semanticOperationId: 'init' }
  ];

  return {
    id: `search-${resolved.algorithm}`,
    subject: 'dsa-1',
    topic: 'Searching',
    title: `Search - ${meta.label}`,
    description: meta.description,
    difficulty: 'beginner',
    learningObjectives: ['Understand search algorithms'],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: { c: src, cpp: src, java: src, python: src },
    initialState: traceState(initialRuntime(resolved)),
    steps: builder.steps,
    completionCriteria: { requiredCorrectPredictions: 1, masteryThreshold: 0.8 }
  };
}
