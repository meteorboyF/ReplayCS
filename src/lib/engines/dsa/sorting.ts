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

export const SORTING_INPUT_MIN = 2;
export const SORTING_INPUT_MAX = 15;

export type SortingAlgorithm = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'counting' | 'radix';

export interface SortingComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface SortingMetadata {
  id: SortingAlgorithm;
  label: string;
  description: string;
  stable: boolean;
  cases: readonly SortingComplexityCase[];
}

export interface SortingConfig {
  algorithm: SortingAlgorithm;
  values: number[];
}

export const DEFAULT_SORTING_CONFIG: SortingConfig = {
  algorithm: 'bubble',
  values: [5, 3, 8, 4, 2]
};

const c = (
  id: string, label: string, caseType: ComplexityCaseType, timeComplexity: ComplexityClass,
  auxiliarySpace: string, assumptions: string[], description: string
): SortingComplexityCase => ({
  id, label, caseType, timeComplexity, auxiliarySpace, implementationVariant: 'Standard', assumptions, description
});

export const SORTING_METADATA: readonly SortingMetadata[] = [
  {
    id: 'bubble',
    label: 'Bubble Sort',
    description: 'Repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.',
    stable: true,
    cases: [
      c('bubble-best', 'Best Case', 'best', 'O(n)', 'O(1)', ['Array is already sorted'], 'Only one pass is needed.'),
      c('bubble-avg', 'Average Case', 'average', 'O(n^2)', 'O(1)', ['Random elements'], 'Requires multiple passes and swaps.'),
      c('bubble-worst', 'Worst Case', 'worst', 'O(n^2)', 'O(1)', ['Array is reverse sorted'], 'Requires maximum number of passes and swaps.')
    ]
  },
  {
    id: 'selection',
    label: 'Selection Sort',
    description: 'Divides the input list into two parts: a sorted sublist and an unsorted sublist. Repeatedly selects the minimum element from the unsorted sublist.',
    stable: false,
    cases: [
      c('selection-best', 'Best Case', 'best', 'O(n^2)', 'O(1)', ['Array is already sorted'], 'Still requires scanning the remaining array for the minimum.'),
      c('selection-avg', 'Average Case', 'average', 'O(n^2)', 'O(1)', ['Random elements'], 'Requires n²/2 comparisons.'),
      c('selection-worst', 'Worst Case', 'worst', 'O(n^2)', 'O(1)', ['Array is reverse sorted'], 'Same number of comparisons as best case.')
    ]
  },
  {
    id: 'insertion',
    label: 'Insertion Sort',
    description: 'Builds the final sorted array one item at a time by repeatedly taking the next element and inserting it into the sorted portion.',
    stable: true,
    cases: [
      c('insertion-best', 'Best Case', 'best', 'O(n)', 'O(1)', ['Array is already sorted'], 'Inner loop immediately breaks.'),
      c('insertion-avg', 'Average Case', 'average', 'O(n^2)', 'O(1)', ['Random elements'], 'Each element moves halfway on average.'),
      c('insertion-worst', 'Worst Case', 'worst', 'O(n^2)', 'O(1)', ['Array is reverse sorted'], 'Each element moves to the beginning.')
    ]
  },
  {
    id: 'merge',
    label: 'Merge Sort',
    description: 'Divide and conquer algorithm that splits the array in half, sorts each half, and merges them back together.',
    stable: true,
    cases: [
      c('merge-best', 'Best Case', 'best', 'O(n log n)', 'O(n)', ['Any array'], 'Always divides and merges.'),
      c('merge-avg', 'Average Case', 'average', 'O(n log n)', 'O(n)', ['Any array'], 'Consistent performance regardless of input.'),
      c('merge-worst', 'Worst Case', 'worst', 'O(n log n)', 'O(n)', ['Any array'], 'Requires n log n operations.')
    ]
  },
  {
    id: 'quick',
    label: 'Quick Sort',
    description: 'Divide and conquer algorithm that picks a pivot and partitions the array around it.',
    stable: false,
    cases: [
      c('quick-best', 'Best Case', 'best', 'O(n log n)', 'O(log n)', ['Pivot is always the median'], 'Balanced partitions.'),
      c('quick-avg', 'Average Case', 'average', 'O(n log n)', 'O(log n)', ['Random elements'], 'Mostly balanced partitions.'),
      c('quick-worst', 'Worst Case', 'worst', 'O(n^2)', 'O(n)', ['Array is already sorted or reverse sorted'], 'Unbalanced partitions (e.g. taking last element as pivot).')
    ]
  },
  {
    id: 'heap',
    label: 'Heap Sort',
    description: 'Converts the array into a max heap, then repeatedly extracts the maximum element to the end.',
    stable: false,
    cases: [
      c('heap-best', 'Best Case', 'best', 'O(n log n)', 'O(1)', ['Elements all distinct'], 'Heapify takes O(log n).'),
      c('heap-avg', 'Average Case', 'average', 'O(n log n)', 'O(1)', ['Random elements'], 'Consistent performance.'),
      c('heap-worst', 'Worst Case', 'worst', 'O(n log n)', 'O(1)', ['Reverse sorted array'], 'Max heapify requires maximum shifts.')
    ]
  },
  {
    id: 'counting',
    label: 'Counting Sort',
    description: 'Integer sorting algorithm that counts the number of objects that possess distinct key values.',
    stable: true,
    cases: [
      c('counting-avg', 'Average Case', 'average', 'O(n + k)', 'O(n + k)', ['k is the range of input'], 'Linear time if k is O(n).')
    ]
  },
  {
    id: 'radix',
    label: 'Radix Sort',
    description: 'Integer sorting algorithm that processes digits individually from least significant to most significant.',
    stable: true,
    cases: [
      c('radix-avg', 'Average Case', 'average', 'O(d(n + k))', 'O(n + k)', ['d is number of digits', 'k is the base'], 'Processes each of the d digits.')
    ]
  }
];

export function getSortingMetadata(algorithm: SortingAlgorithm): SortingMetadata {
  const meta = SORTING_METADATA.find(m => m.id === algorithm);
  if (!meta) throw new Error(`Unknown sorting algorithm: ${algorithm}`);
  return meta;
}

export function validateSortingInput(input: string): { valid: boolean; values: number[] | null; error: string | null } {
  if (!input.trim()) return { valid: false, values: null, error: `Enter ${SORTING_INPUT_MIN} to ${SORTING_INPUT_MAX} comma-separated integers.` };
  const tokens = input.split(',').map(t => t.trim());
  if (tokens.length < SORTING_INPUT_MIN || tokens.length > SORTING_INPUT_MAX) return { valid: false, values: null, error: `Use between ${SORTING_INPUT_MIN} and ${SORTING_INPUT_MAX} integers.` };
  if (tokens.some(t => t.length === 0)) return { valid: false, values: null, error: 'Every item must be an integer; remove empty entries.' };
  const values: number[] = [];
  for (const token of tokens) {
    if (!/^[+-]?\d+$/.test(token)) return { valid: false, values: null, error: `“${token}” is not a valid integer.` };
    const value = Number(token);
    if (!Number.isSafeInteger(value)) return { valid: false, values: null, error: 'Every value must be a safe integer.' };
    values.push(value);
  }
  return { valid: true, values, error: null };
}

export function parseSortingInput(input: string): number[] {
  const result = validateSortingInput(input);
  if (!result.valid) throw new Error(result.error!);
  return result.values!;
}

export interface RuntimeState {
  algorithm: SortingAlgorithm;
  array: number[];
  variables: Record<string, number | null>;
  arrays: Record<string, number[]>;
  result: TraceValue;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig extends SortingConfig {}

interface SelectedCase extends SortingComplexityCase {
  derivation: string[];
}

function cloneWork(work: WorkCounts): WorkCounts { return { ...work }; }
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

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    algorithm: state.algorithm,
    array: [...state.array],
    variables: { ...state.variables } as unknown as TraceValue,
    arrays: Object.fromEntries(Object.entries(state.arrays).map(([k, v]) => [k, [...v]])) as unknown as TraceValue,
    result: state.result,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  return {
    algorithm: config.algorithm,
    array: [...config.values],
    variables: {},
    arrays: {},
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

function quad(semantic: string | undefined, c: string, cpp: string, java: string, python: string): QuadSourceLine {
  return { semantic, c, cpp, java, python };
}

function operationSource(config: ResolvedConfig): QuadSourceLine[] {
  // We supply a simplified mapping to represent the loops for visualization
  return [
    quad(undefined, '// C source', '// C++ source', '// Java source', '# Python source'),
    quad('start', 'void sort(int arr[], int n) {', 'void sort(vector<int>& arr) {', 'void sort(int[] arr) {', 'def sort(arr):'),
    quad('outer-loop', '  // outer loop', '  // outer loop', '  // outer loop', '  # outer loop'),
    quad('inner-loop', '    // inner loop', '    // inner loop', '    // inner loop', '    # inner loop'),
    quad('compare', '      // compare', '      // compare', '      // compare', '      # compare'),
    quad('swap', '      // swap', '      // swap', '      // swap', '      # swap'),
    quad('early-exit', '  // early exit', '  // early exit', '  // early exit', '  # early exit'),
    quad('end', '}', '}', '}', '')
  ];
}

function sourceLines(config: ResolvedConfig, lang: SupportedLanguage): SourceLine[] {
  const quads = operationSource(config);
  return quads.map((q, index) => ({ id: `L${index}`, number: index + 1, semanticOperationId: q.semantic || undefined, text: q[lang] }));
}

function isSorted(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[i - 1]) return false;
  return true;
}

function isReverseSorted(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[i - 1]) return false;
  return true;
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const meta = getSortingMetadata(config.algorithm);
  let c = meta.cases.find(x => x.caseType === 'average') || meta.cases[0];
  if (isSorted(config.values)) {
    c = meta.cases.find(x => x.caseType === 'best') || c;
  } else if (isReverseSorted(config.values)) {
    c = meta.cases.find(x => x.caseType === 'worst') || c;
  }
  return { ...c, derivation: [] };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = [];
  
  state.array.forEach((val, i) => {
    entities.push({
      id: `array-${i}`,
      type: 'array-cell',
      label: `[${i}]`,
      value: val,
      metadata: {}
    });
  });

  for (const [arrName, arrVals] of Object.entries(state.arrays)) {
    arrVals.forEach((val, i) => {
      entities.push({
        id: `${arrName}-${i}`,
        type: 'array-cell',
        label: `${arrName}[${i}]`,
        value: val,
        metadata: {}
      });
    });
  }

  for (const [varName, varVal] of Object.entries(state.variables)) {
    if (varVal !== null) {
      entities.push({
        id: `var-${varName}`,
        type: 'variable',
        label: varName,
        value: varVal
      });
    }
  }

  entities.push({
    id: 'operation-count',
    type: 'variable',
    label: 'exact operations',
    value: state.operationCount
  });

  return entities;
}

function mutationsBetween(before: Record<string, TraceValue>, after: Record<string, TraceValue>): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  
  const beforeArray = (before.array as number[]) ?? [];
  const afterArray = (after.array as number[]) ?? [];
  for (let i = 0; i < Math.max(beforeArray.length, afterArray.length); i++) {
    if (beforeArray[i] !== afterArray[i]) {
      mutations.push({
        entityId: `array-${i}`,
        property: 'value',
        previousValue: beforeArray[i] ?? null,
        nextValue: afterArray[i] ?? null,
        animation: 'pulse'
      });
    }
  }

  const beforeVars = (before.variables as Record<string, number | null>) ?? {};
  const afterVars = (after.variables as Record<string, number | null>) ?? {};
  for (const key of new Set([...Object.keys(beforeVars), ...Object.keys(afterVars)])) {
    if (beforeVars[key] !== afterVars[key]) {
      mutations.push({
        entityId: `var-${key}`,
        property: 'value',
        previousValue: beforeVars[key] ?? null,
        nextValue: afterVars[key] ?? null,
        animation: 'pulse'
      });
    }
  }

  const beforeArrays = (before.arrays as Record<string, number[]>) ?? {};
  const afterArrays = (after.arrays as Record<string, number[]>) ?? {};
  for (const key of new Set([...Object.keys(beforeArrays), ...Object.keys(afterArrays)])) {
    const bArr = beforeArrays[key] ?? [];
    const aArr = afterArrays[key] ?? [];
    for (let i = 0; i < Math.max(bArr.length, aArr.length); i++) {
      if (bArr[i] !== aArr[i]) {
        mutations.push({
          entityId: `${key}-${i}`,
          property: 'value',
          previousValue: bArr[i] ?? null,
          nextValue: aArr[i] ?? null,
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
  add: (semantic: string, title: string, explanation: string, stepWork: WorkCounts, mutate?: (state: RuntimeState) => void) => void;
}

function createTraceBuilder(config: ResolvedConfig, complexityCase: SelectedCase, state: RuntimeState): TraceBuilder {
  const steps: TraceStep[] = [];
  let peakAuxiliary = 1;
  let peakOutput = 0;

  const add: TraceBuilder['add'] = (semantic, title, explanation, stepWork, mutate = () => {}) => {
    const before = traceState(state, config);
    mutate(state);
    const exactOperationCount = totalWork(stepWork);
    state.cumulativeWork = addWork(state.cumulativeWork, stepWork);
    state.operationCount += exactOperationCount;
    const after = traceState(state, config);

    let auxSpace = Object.values(state.arrays).reduce((acc, a) => acc + a.length, 0);
    if (auxSpace > peakAuxiliary) peakAuxiliary = auxSpace;

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
        auxiliary: { current: auxSpace, peak: peakAuxiliary, unit: 'variables' },
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

function runBubbleSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Bubble Sort', 'Begin sorting process', { comparison: 0 });
  const n = builder.state.array.length;
  for (let i = 0; i < n - 1; i++) {
    builder.add('outer-loop', `Pass ${i + 1}`, `Starting pass ${i + 1}`, { comparison: 1 }, s => { s.variables.i = i; });
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      builder.add('inner-loop', 'Check pair', `Check elements at index ${j} and ${j+1}`, { comparison: 1 }, s => { s.variables.j = j; });
      builder.add('compare', 'Compare', `Compare ${builder.state.array[j]} > ${builder.state.array[j+1]}`, { 'read': 2, comparison: 1 });
      if (builder.state.array[j] > builder.state.array[j + 1]) {
        builder.add('swap', 'Swap', `Swap ${builder.state.array[j]} and ${builder.state.array[j+1]}`, { 'write': 2 }, s => {
          const temp = s.array[j];
          s.array[j] = s.array[j+1];
          s.array[j+1] = temp;
        });
        swapped = true;
      }
    }
    if (!swapped) {
      builder.add('early-exit', 'Early Exit', 'No swaps occurred, array is sorted', { comparison: 1 });
      break;
    }
  }
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runSelectionSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Selection Sort', 'Begin sorting process', { comparison: 0 });
  const n = builder.state.array.length;
  for (let i = 0; i < n - 1; i++) {
    builder.add('outer-loop', `Find min for index ${i}`, `Assume index ${i} is minimum`, { comparison: 1 }, s => { s.variables.i = i; s.variables.min_idx = i; });
    let min_idx = i;
    for (let j = i + 1; j < n; j++) {
      builder.add('inner-loop', 'Check next element', `Check index ${j}`, { comparison: 1 }, s => { s.variables.j = j; });
      builder.add('compare', 'Compare', `Compare ${builder.state.array[j]} < ${builder.state.array[min_idx]}`, { 'read': 2, comparison: 1 });
      if (builder.state.array[j] < builder.state.array[min_idx]) {
        min_idx = j;
        builder.add('inner-loop', 'New Minimum', `Found new minimum at index ${min_idx}`, { comparison: 0 }, s => { s.variables.min_idx = min_idx; });
      }
    }
    if (min_idx !== i) {
      builder.add('swap', 'Swap', `Swap ${builder.state.array[i]} and ${builder.state.array[min_idx]}`, { 'write': 2 }, s => {
        const temp = s.array[i];
        s.array[i] = s.array[min_idx];
        s.array[min_idx] = temp;
      });
    }
  }
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runInsertionSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Insertion Sort', 'Begin sorting process', { comparison: 0 });
  const n = builder.state.array.length;
  for (let i = 1; i < n; i++) {
    builder.add('outer-loop', `Insert element ${i}`, `Pick element ${builder.state.array[i]}`, { comparison: 1 }, s => {
      s.variables.i = i;
      s.variables.key = s.array[i];
    });
    const key = builder.state.array[i];
    let j = i - 1;
    while (j >= 0) {
      builder.add('inner-loop', 'Check sorted portion', `Check index ${j}`, { comparison: 1 }, s => { s.variables.j = j; });
      builder.add('compare', 'Compare', `Compare ${builder.state.array[j]} > ${key}`, { 'read': 1, comparison: 1 });
      if (builder.state.array[j] > key) {
        builder.add('swap', 'Shift', `Shift ${builder.state.array[j]} to the right`, { 'write': 1 }, s => {
          s.array[j + 1] = s.array[j];
        });
        j--;
      } else {
        break;
      }
    }
    builder.add('swap', 'Insert', `Insert ${key} at index ${j+1}`, { 'write': 1 }, s => {
      s.array[j + 1] = key;
    });
  }
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runMergeSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Merge Sort', 'Begin sorting process', { comparison: 0 });
  
  function mergeSort(left: number, right: number) {
    if (left >= right) return;
    builder.add('outer-loop', 'Divide', `Divide array from ${left} to ${right}`, { comparison: 1 }, s => {
      s.variables.left = left;
      s.variables.right = right;
    });
    const mid = Math.floor((left + right) / 2);
    builder.add('outer-loop', 'Midpoint', `Midpoint is ${mid}`, { read: 1 }, s => { s.variables.mid = mid; });
    
    mergeSort(left, mid);
    mergeSort(mid + 1, right);
    
    builder.add('inner-loop', 'Merge', `Merge ${left}..${mid} and ${mid+1}..${right}`, { allocation: right - left + 1 }, s => {
      s.variables.left = left;
      s.variables.mid = mid;
      s.variables.right = right;
    });
    
    const temp: number[] = [];
    let i = left;
    let j = mid + 1;
    while (i <= mid && j <= right) {
      builder.add('compare', 'Compare for merge', `Compare ${builder.state.array[i]} and ${builder.state.array[j]}`, { 'read': 2, comparison: 1 });
      if (builder.state.array[i] <= builder.state.array[j]) {
        temp.push(builder.state.array[i++]);
      } else {
        temp.push(builder.state.array[j++]);
      }
    }
    while (i <= mid) temp.push(builder.state.array[i++]);
    while (j <= right) temp.push(builder.state.array[j++]);
    
    builder.add('swap', 'Copy back', 'Copy merged elements back to original array', { 'write': temp.length }, s => {
      for (let k = 0; k < temp.length; k++) {
        s.array[left + k] = temp[k];
      }
    });
  }
  
  mergeSort(0, builder.state.array.length - 1);
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runQuickSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Quick Sort', 'Begin sorting process', { comparison: 0 });

  function partition(low: number, high: number): number {
    const pivot = builder.state.array[high];
    builder.add('outer-loop', 'Partition', `Partition from ${low} to ${high} with pivot ${pivot}`, { 'read': 1 }, s => {
      s.variables.low = low;
      s.variables.high = high;
      s.variables.pivot = pivot;
    });
    let i = low - 1;
    for (let j = low; j < high; j++) {
      builder.add('compare', 'Compare with pivot', `Compare ${builder.state.array[j]} < ${pivot}`, { 'read': 1, comparison: 1 }, s => { s.variables.j = j; });
      if (builder.state.array[j] < pivot) {
        i++;
        if (i !== j) {
          builder.add('swap', 'Swap', `Swap ${builder.state.array[i]} and ${builder.state.array[j]}`, { 'write': 2 }, s => {
            const temp = s.array[i];
            s.array[i] = s.array[j];
            s.array[j] = temp;
          });
        }
      }
    }
    builder.add('swap', 'Place pivot', `Place pivot at correct position ${i+1}`, { 'write': 2 }, s => {
      const temp = s.array[i+1];
      s.array[i+1] = s.array[high];
      s.array[high] = temp;
    });
    return i + 1;
  }

  function quickSort(low: number, high: number) {
    if (low < high) {
      const pi = partition(low, high);
      quickSort(low, pi - 1);
      quickSort(pi + 1, high);
    }
  }

  quickSort(0, builder.state.array.length - 1);
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runHeapSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Heap Sort', 'Begin sorting process', { comparison: 0 });

  function heapify(n: number, i: number) {
    let largest = i;
    const l = 2 * i + 1;
    const r = 2 * i + 2;

    builder.add('inner-loop', 'Heapify', `Heapify at node ${i}`, { comparison: 1 }, s => {
      s.variables.largest = largest;
      s.variables.l = l;
      s.variables.r = r;
    });

    if (l < n) {
      builder.add('compare', 'Compare Left', 'Compare left child with largest', { 'read': 2, comparison: 1 });
      if (builder.state.array[l] > builder.state.array[largest]) largest = l;
    }
    if (r < n) {
      builder.add('compare', 'Compare Right', 'Compare right child with largest', { 'read': 2, comparison: 1 });
      if (builder.state.array[r] > builder.state.array[largest]) largest = r;
    }

    if (largest !== i) {
      builder.add('swap', 'Swap in Heap', `Swap ${builder.state.array[i]} and ${builder.state.array[largest]}`, { 'write': 2 }, s => {
        const swap = s.array[i];
        s.array[i] = s.array[largest];
        s.array[largest] = swap;
      });
      heapify(n, largest);
    }
  }

  const n = builder.state.array.length;
  builder.add('outer-loop', 'Build Max Heap', 'Building initial max heap', { comparison: 0 });
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i);
  }

  for (let i = n - 1; i > 0; i--) {
    builder.add('swap', 'Extract Max', `Move max element ${builder.state.array[0]} to end`, { 'write': 2 }, s => {
      const temp = s.array[0];
      s.array[0] = s.array[i];
      s.array[i] = temp;
    });
    heapify(i, 0);
  }
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runCountingSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Counting Sort', 'Begin sorting process', { comparison: 0 });
  const arr = builder.state.array;
  if (arr.length === 0) return;
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const range = max - min + 1;
  
  builder.add('logic', 'Find Range', `Max: ${max}, Min: ${min}, Range: ${range}`, { comparison: arr.length, allocation: range }, s => {
    s.variables.max = max;
    s.variables.min = min;
    s.arrays.count = new Array(range).fill(0);
    s.arrays.output = new Array(arr.length).fill(0);
  });

  for (let i = 0; i < arr.length; i++) {
    builder.add('outer-loop', 'Count Frequencies', `Count frequency of ${arr[i]}`, { 'read': 1, 'write': 1 }, s => {
      s.variables.i = i;
      s.arrays.count[arr[i] - min]++;
    });
  }

  for (let i = 1; i < range; i++) {
    builder.add('inner-loop', 'Cumulative Count', `Add ${builder.state.arrays.count[i-1]} to count[${i}]`, { 'read': 2, 'write': 1 }, s => {
      s.arrays.count[i] += s.arrays.count[i - 1];
    });
  }

  for (let i = arr.length - 1; i >= 0; i--) {
    builder.add('swap', 'Place Element', `Place ${arr[i]} into output`, { 'read': 2, 'write': 2 }, s => {
      const idx = s.arrays.count[arr[i] - min] - 1;
      s.arrays.output[idx] = arr[i];
      s.arrays.count[arr[i] - min]--;
    });
  }

  builder.add('swap', 'Copy Back', 'Copy output back to original array', { 'write': arr.length }, s => {
    for (let i = 0; i < arr.length; i++) {
      s.array[i] = s.arrays.output[i];
    }
    delete s.arrays.count;
    delete s.arrays.output;
  });
  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { s.variables = {}; });
}

function runRadixSort(builder: TraceBuilder, config: ResolvedConfig) {
  builder.add('start', 'Start Radix Sort', 'Begin sorting process', { comparison: 0 });
  const arr = builder.state.array;
  if (arr.length === 0) return;
  
  const max = Math.max(...arr.map(Math.abs));
  builder.add('logic', 'Find Max', `Max value is ${max} to determine digits`, { comparison: arr.length }, s => {
    s.variables.max = max;
  });

  for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
    builder.add('outer-loop', 'Digit Pass', `Sorting by digit place ${exp}`, { comparison: 1 }, s => {
      s.variables.exp = exp;
      s.arrays.output = new Array(arr.length).fill(0);
      s.arrays.count = new Array(10).fill(0);
    });

    for (let i = 0; i < arr.length; i++) {
      builder.add('inner-loop', 'Count Frequencies', `Count digit for ${arr[i]}`, { 'read': 1, 'write': 1 }, s => {
        const digit = Math.floor(Math.abs(arr[i]) / exp) % 10;
        s.arrays.count[digit]++;
      });
    }

    for (let i = 1; i < 10; i++) {
      builder.add('inner-loop', 'Cumulative Count', `Cumulative count for digit ${i}`, { 'read': 2, 'write': 1 }, s => {
        s.arrays.count[i] += s.arrays.count[i - 1];
      });
    }

    for (let i = arr.length - 1; i >= 0; i--) {
      builder.add('swap', 'Place Element', `Place ${arr[i]} into output`, { 'read': 2, 'write': 2 }, s => {
        const digit = Math.floor(Math.abs(arr[i]) / exp) % 10;
        s.arrays.output[s.arrays.count[digit] - 1] = arr[i];
        s.arrays.count[digit]--;
      });
    }

    builder.add('swap', 'Copy Back', 'Copy output array to main array', { 'write': arr.length }, s => {
      for (let i = 0; i < arr.length; i++) {
        s.array[i] = s.arrays.output[i];
      }
    });
  }

  builder.add('end', 'Done', 'Sorting complete', { comparison: 0 }, s => { 
    s.variables = {}; 
    delete s.arrays.count;
    delete s.arrays.output;
  });
}

export function createSortLesson(config: SortingConfig = DEFAULT_SORTING_CONFIG): TraceLesson {
  const resolvedConfig = { ...config, values: [...config.values] };
  const complexityCase = selectedCase(resolvedConfig);
  const builder = createTraceBuilder(resolvedConfig, complexityCase, initialRuntime(resolvedConfig));
  
  switch (config.algorithm) {
    case 'bubble': runBubbleSort(builder, resolvedConfig); break;
    case 'selection': runSelectionSort(builder, resolvedConfig); break;
    case 'insertion': runInsertionSort(builder, resolvedConfig); break;
    case 'merge': runMergeSort(builder, resolvedConfig); break;
    case 'quick': runQuickSort(builder, resolvedConfig); break;
    case 'heap': runHeapSort(builder, resolvedConfig); break;
    case 'counting': runCountingSort(builder, resolvedConfig); break;
    case 'radix': runRadixSort(builder, resolvedConfig); break;
  }

  const metadata = getSortingMetadata(config.algorithm);
  return {
    id: `sorting-${config.algorithm}`,
    subject: 'dsa-1',
    topic: 'Sorting',
    title: `Sorting Lab — ${metadata.label}`,
    description: metadata.description,
    difficulty: 'beginner',
    learningObjectives: [
      `Understand the ${metadata.label} algorithm and its complexity.`
    ],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: {
      c: sourceLines(resolvedConfig, 'c'),
      cpp: sourceLines(resolvedConfig, 'cpp'),
      java: sourceLines(resolvedConfig, 'java'),
      python: sourceLines(resolvedConfig, 'python')
    },
    initialState: traceState(initialRuntime(resolvedConfig), resolvedConfig),
    steps: builder.steps,
    completionCriteria: { requiredCorrectPredictions: 0, masteryThreshold: 0.8 }
  };
}
