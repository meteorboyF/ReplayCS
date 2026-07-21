import type { PredictionChallenge } from '$lib/trace/types';

export const SORTING_INPUT_MIN = 2;
export const SORTING_INPUT_MAX = 10;

export type SortingAlgorithm =
  'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'counting' | 'radix';

export interface SortingAlgorithmInfo {
  name: string;
  shortName: string;
  description: string;
  stable: boolean;
  stabilityReason: string;
  inPlace: boolean;
  inPlaceReason: string;
  complexity: {
    best: string;
    average: string;
    worst: string;
    space: string;
  };
}

export const SORTING_ALGORITHMS: Record<SortingAlgorithm, SortingAlgorithmInfo> = {
  bubble: {
    name: 'Bubble Sort',
    shortName: 'Bubble',
    description: 'Compare neighbors and bubble the largest remaining value to the right.',
    stable: true,
    stabilityReason: 'Equal values never swap, so their original order is preserved.',
    inPlace: true,
    inPlaceReason: 'Only neighboring cells swap; no second array is used.',
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
  },
  selection: {
    name: 'Selection Sort',
    shortName: 'Selection',
    description: 'Find the smallest remaining value and place it at the next left position.',
    stable: false,
    stabilityReason: 'A long-distance swap can move an equal value past another equal value.',
    inPlace: true,
    inPlaceReason: 'A single swap per pass rearranges the input array itself.',
    complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
  },
  insertion: {
    name: 'Insertion Sort',
    shortName: 'Insertion',
    description: 'Grow a sorted prefix by shifting larger values and inserting one key.',
    stable: true,
    stabilityReason: 'The key moves only past larger values, never past an equal value.',
    inPlace: true,
    inPlaceReason: 'Shifts happen inside the input array; only the key is held aside.',
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
  },
  merge: {
    name: 'Merge Sort',
    shortName: 'Merge',
    description: 'Split in half, sort each half, then merge two sorted runs into one.',
    stable: true,
    stabilityReason: 'On ties the merge always takes from the left run first.',
    inPlace: false,
    inPlaceReason: 'Each merge copies both runs into an O(n) temporary buffer.',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' }
  },
  quick: {
    name: 'Quick Sort',
    shortName: 'Quick',
    description:
      'Partition around a pivot so smaller values land left, then recurse on both sides.',
    stable: false,
    stabilityReason: 'Partition swaps move equal values across long distances.',
    inPlace: true,
    inPlaceReason: 'Partitioning swaps inside the array; only the recursion stack is extra.',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' }
  },
  heap: {
    name: 'Heap Sort',
    shortName: 'Heap',
    description: 'Build a max-heap, then repeatedly move the root to the end and repair the heap.',
    stable: false,
    stabilityReason: 'Sift-down swaps jump levels, reordering equal values.',
    inPlace: true,
    inPlaceReason: 'The heap lives inside the input array; no second array is used.',
    complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' }
  },
  counting: {
    name: 'Counting Sort',
    shortName: 'Counting',
    description:
      'Count occurrences per key, prefix-sum the counts, then place each value by count.',
    stable: true,
    stabilityReason: 'The placement pass runs right-to-left, preserving equal-key order.',
    inPlace: false,
    inPlaceReason: 'Needs a count array of size k and an output array of size n.',
    complexity: { best: 'O(n + k)', average: 'O(n + k)', worst: 'O(n + k)', space: 'O(n + k)' }
  },
  radix: {
    name: 'Radix Sort (LSD)',
    shortName: 'Radix',
    description: 'Stable-sort by each decimal digit, least significant first.',
    stable: true,
    stabilityReason: 'Each digit pass is a stable counting sort, so earlier order survives ties.',
    inPlace: false,
    inPlaceReason: 'Each digit pass distributes values into 10 buckets and collects them back.',
    complexity: {
      best: 'O(d·(n + b))',
      average: 'O(d·(n + b))',
      worst: 'O(d·(n + b))',
      space: 'O(n + b)'
    }
  }
};

export type SortingEvent =
  'start' | 'pass' | 'compare' | 'select' | 'swap' | 'write' | 'mark-sorted' | 'complete';

export interface SortingMetrics {
  comparisons: number;
  writes: number;
  swaps: number;
  pass: number;
}

/** A labeled helper array (merge buffer, count array, radix buckets) shown beside the values. */
export interface SortingAuxiliaryView {
  label: string;
  values: (number | string | null)[];
  highlight?: number[];
}

export interface SortingStep {
  id: string;
  index: number;
  event: SortingEvent;
  title: string;
  explanation: string;
  values: number[];
  activeIndices: number[];
  sortedIndices: number[];
  metrics: SortingMetrics;
  auxiliary?: SortingAuxiliaryView[];
  prediction?: PredictionChallenge;
}

export interface SortingTrace {
  algorithm: SortingAlgorithm;
  info: SortingAlgorithmInfo;
  input: number[];
  steps: SortingStep[];
  result: number[];
}

export type SortingInputValidation =
  { valid: true; values: number[]; error: null } | { valid: false; values: null; error: string };

/** Validate the exact comma-separated format used by the arena input. */
export function validateSortingInput(input: string): SortingInputValidation {
  if (!input.trim()) {
    return {
      valid: false,
      values: null,
      error: `Enter ${SORTING_INPUT_MIN} to ${SORTING_INPUT_MAX} comma-separated integers.`
    };
  }

  const tokens = input.split(',').map((token) => token.trim());
  if (tokens.length < SORTING_INPUT_MIN || tokens.length > SORTING_INPUT_MAX) {
    return {
      valid: false,
      values: null,
      error: `Use between ${SORTING_INPUT_MIN} and ${SORTING_INPUT_MAX} integers.`
    };
  }
  if (tokens.some((token) => token.length === 0)) {
    return {
      valid: false,
      values: null,
      error: 'Every item must be an integer; remove empty entries.'
    };
  }

  const values: number[] = [];
  for (const token of tokens) {
    if (!/^[+-]?\d+$/.test(token)) {
      return { valid: false, values: null, error: `“${token}” is not a valid integer.` };
    }
    const value = Number(token);
    if (!Number.isSafeInteger(value)) {
      return { valid: false, values: null, error: 'Every value must be a safe integer.' };
    }
    values.push(value);
  }

  return { valid: true, values, error: null };
}

/** Parse a valid arena input, throwing the same human-readable error used by the UI. */
export function parseSortingInput(input: string): number[] {
  const result = validateSortingInput(input);
  if (!result.valid) throw new Error(result.error);
  return result.values;
}

function assertValues(values: readonly number[]): void {
  if (values.length < SORTING_INPUT_MIN || values.length > SORTING_INPUT_MAX) {
    throw new RangeError(
      `Sorting traces require ${SORTING_INPUT_MIN} to ${SORTING_INPUT_MAX} values.`
    );
  }
  if (values.some((value) => !Number.isSafeInteger(value))) {
    throw new TypeError('Sorting traces require safe integers.');
  }
}

function range(from: number, toExclusive: number): number[] {
  return Array.from({ length: Math.max(0, toExclusive - from) }, (_, index) => from + index);
}

function firstMinimumIndex(values: readonly number[]): number {
  let minimum = 0;
  for (let index = 1; index < values.length; index++) {
    if (values[index] < values[minimum]) minimum = index;
  }
  return minimum;
}

function predictionFor(
  algorithm: SortingAlgorithm,
  values: readonly number[]
): PredictionChallenge {
  if (algorithm === 'bubble') {
    const answer = Math.max(values[0], values[1]);
    return {
      id: `sorting-bubble-first-comparison-${values.join('-')}`,
      prompt: 'After the first comparison, which value will be at index 1?',
      type: 'numeric',
      correctAnswer: answer,
      explanation: `Bubble Sort leaves the larger of ${values[0]} and ${values[1]} at index 1: ${answer}.`,
      misconceptionTags: ['comparison-direction'],
      xpReward: 10
    };
  }
  if (algorithm === 'selection') {
    const answer = firstMinimumIndex(values);
    return {
      id: `sorting-selection-first-minimum-${values.join('-')}`,
      prompt: 'Which index contains the minimum chosen during the first pass?',
      type: 'numeric',
      correctAnswer: answer,
      explanation: `The first minimum is ${values[answer]} at index ${answer}.`,
      misconceptionTags: ['index-vs-value'],
      xpReward: 10
    };
  }

  if (algorithm === 'merge') {
    const answer = Math.min(values[0], values[1]);
    return {
      id: `sorting-merge-first-write-${values.join('-')}`,
      prompt: 'The first real merge combines the two leftmost values. Which one is written first?',
      type: 'numeric',
      correctAnswer: answer,
      explanation: `A merge always writes the smaller front value first: min(${values[0]}, ${values[1]}) = ${answer}. On ties it takes from the left run — that is why Merge Sort is stable.`,
      misconceptionTags: ['comparison-direction'],
      xpReward: 10
    };
  }
  if (algorithm === 'quick') {
    const answer = values[values.length - 1];
    return {
      id: `sorting-quick-first-pivot-${values.join('-')}`,
      prompt:
        'Lomuto partitioning always takes the LAST element of the range as pivot. Which value is the first pivot?',
      type: 'numeric',
      correctAnswer: answer,
      explanation: `The first range is the whole array, so its last value ${answer} becomes the pivot — not the first or middle element.`,
      misconceptionTags: ['key-vs-index'],
      xpReward: 10
    };
  }
  if (algorithm === 'heap') {
    const answer = Math.floor(values.length / 2) - 1;
    return {
      id: `sorting-heap-first-sift-${values.join('-')}`,
      prompt: `Build-heap sifts down every non-leaf node. With n = ${values.length}, which index does it start from?`,
      type: 'numeric',
      correctAnswer: answer,
      explanation: `The last non-leaf is ⌊n/2⌋ − 1 = ${answer}; everything after it is a leaf that needs no sifting. Starting at leaves is the insight behind the O(n) build.`,
      misconceptionTags: ['off-by-one'],
      xpReward: 10
    };
  }
  if (algorithm === 'counting') {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const answer = maximum - minimum + 1;
    return {
      id: `sorting-counting-range-${values.join('-')}`,
      prompt: `Values range from ${minimum} to ${maximum}. How many slots does the count array need?`,
      type: 'numeric',
      correctAnswer: answer,
      explanation: `k = max − min + 1 = ${maximum} − ${minimum} + 1 = ${answer}. The +1 is the classic off-by-one trap.`,
      misconceptionTags: ['off-by-one'],
      xpReward: 10
    };
  }
  if (algorithm === 'radix') {
    const minimum = Math.min(...values);
    const normalizedMax = Math.max(...values.map((value) => value - minimum));
    const answer = Math.max(1, String(normalizedMax).length);
    return {
      id: `sorting-radix-passes-${values.join('-')}`,
      prompt: `After shifting by −min, the largest key is ${normalizedMax}. How many digit passes does LSD radix sort run?`,
      type: 'numeric',
      correctAnswer: answer,
      explanation: `One stable pass per decimal digit of the largest key: ${normalizedMax} has ${answer} digit${answer === 1 ? '' : 's'}, so d = ${answer}.`,
      misconceptionTags: ['loop-boundary'],
      xpReward: 10
    };
  }

  const answer = Math.min(values[0], values[1]);
  return {
    id: `sorting-insertion-first-key-${values.join('-')}`,
    prompt: 'After inserting the first key, which value will be at index 0?',
    type: 'numeric',
    correctAnswer: answer,
    explanation: `The sorted two-value prefix begins with ${answer}.`,
    misconceptionTags: ['key-vs-index'],
    xpReward: 10
  };
}

function appendStep(
  steps: SortingStep[],
  algorithm: SortingAlgorithm,
  values: readonly number[],
  activeIndices: readonly number[],
  sortedIndices: readonly number[],
  metrics: SortingMetrics,
  event: SortingEvent,
  title: string,
  explanation: string,
  prediction?: PredictionChallenge,
  auxiliary?: SortingAuxiliaryView[]
): void {
  steps.push({
    id: `${algorithm}-${steps.length}`,
    index: steps.length,
    event,
    title,
    explanation,
    values: [...values],
    activeIndices: [...activeIndices],
    sortedIndices: [...sortedIndices],
    metrics: { ...metrics },
    ...(auxiliary
      ? { auxiliary: auxiliary.map((view) => ({ ...view, values: [...view.values] })) }
      : {}),
    prediction
  });
}

function bubbleTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'bubble';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  let sortedIndices: number[] = [];

  appendStep(
    steps,
    algorithm,
    values,
    [],
    sortedIndices,
    metrics,
    'start',
    'Ready to bubble',
    'Compare neighboring values. Each completed pass locks a suffix on the right.',
    predictionFor(algorithm, values)
  );

  for (let pass = 1; pass < values.length; pass++) {
    metrics.pass = pass;
    let swapped = false;
    const lastComparison = values.length - pass;
    appendStep(
      steps,
      algorithm,
      values,
      [],
      sortedIndices,
      metrics,
      'pass',
      `Pass ${pass}`,
      `Scan indices 0 through ${lastComparison}; the largest remaining value will settle at index ${lastComparison}.`
    );

    for (let left = 0; left < lastComparison; left++) {
      const right = left + 1;
      metrics.comparisons++;
      appendStep(
        steps,
        algorithm,
        values,
        [left, right],
        sortedIndices,
        metrics,
        'compare',
        `Compare ${values[left]} and ${values[right]}`,
        values[left] > values[right]
          ? `${values[left]} is larger, so the pair is out of order.`
          : `${values[left]} is not larger, so their stable order stays unchanged.`
      );

      if (values[left] > values[right]) {
        const leftValue = values[left];
        values[left] = values[right];
        values[right] = leftValue;
        metrics.swaps++;
        metrics.writes += 2;
        swapped = true;
        appendStep(
          steps,
          algorithm,
          values,
          [left, right],
          sortedIndices,
          metrics,
          'swap',
          `Swap indices ${left} and ${right}`,
          `${values[left]} moves left and ${values[right]} bubbles right. A swap writes two array cells.`
        );
      }
    }

    sortedIndices = swapped ? range(lastComparison, values.length) : range(0, values.length);
    appendStep(
      steps,
      algorithm,
      values,
      swapped ? [lastComparison] : [],
      sortedIndices,
      metrics,
      'mark-sorted',
      swapped ? `Index ${lastComparison} is sorted` : 'No swaps: every index is sorted',
      swapped
        ? `${values[lastComparison]} is now at its final position.`
        : 'A complete pass made no swap, so the early-exit optimization can stop.'
    );
    if (!swapped) break;
  }

  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Bubble Sort complete',
    `Sorted ${values.length} values using ${metrics.comparisons} comparisons and ${metrics.swaps} swaps.`
  );
  return steps;
}

function selectionTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'selection';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  let sortedIndices: number[] = [];

  appendStep(
    steps,
    algorithm,
    values,
    [],
    sortedIndices,
    metrics,
    'start',
    'Ready to select',
    'Find the minimum in the unsorted suffix, then place it at the left boundary.',
    predictionFor(algorithm, values)
  );

  for (let position = 0; position < values.length - 1; position++) {
    metrics.pass = position + 1;
    let minimum = position;
    appendStep(
      steps,
      algorithm,
      values,
      [minimum],
      sortedIndices,
      metrics,
      'pass',
      `Pass ${metrics.pass}: fill index ${position}`,
      `Treat ${values[minimum]} as the current minimum and scan the remaining suffix.`
    );

    for (let scan = position + 1; scan < values.length; scan++) {
      metrics.comparisons++;
      appendStep(
        steps,
        algorithm,
        values,
        [minimum, scan],
        sortedIndices,
        metrics,
        'compare',
        `Compare minimum ${values[minimum]} with ${values[scan]}`,
        values[scan] < values[minimum]
          ? `${values[scan]} is smaller, so index ${scan} becomes the new minimum.`
          : `${values[minimum]} remains the minimum for this pass.`
      );
      if (values[scan] < values[minimum]) {
        minimum = scan;
        appendStep(
          steps,
          algorithm,
          values,
          [position, minimum],
          sortedIndices,
          metrics,
          'select',
          `Select index ${minimum}`,
          `${values[minimum]} is the smallest value seen in the unsorted suffix.`
        );
      }
    }

    if (minimum !== position) {
      const positionValue = values[position];
      values[position] = values[minimum];
      values[minimum] = positionValue;
      metrics.swaps++;
      metrics.writes += 2;
      appendStep(
        steps,
        algorithm,
        values,
        [position, minimum],
        sortedIndices,
        metrics,
        'swap',
        `Place ${values[position]} at index ${position}`,
        `Swap the selected minimum with the left boundary. This long-distance swap is why Selection Sort is not stable.`
      );
    } else {
      appendStep(
        steps,
        algorithm,
        values,
        [position],
        sortedIndices,
        metrics,
        'select',
        `${values[position]} is already in place`,
        'The boundary already contains the minimum, so no write is needed.'
      );
    }

    sortedIndices = range(0, position + 1);
    appendStep(
      steps,
      algorithm,
      values,
      [position],
      sortedIndices,
      metrics,
      'mark-sorted',
      `Index ${position} is sorted`,
      `${values[position]} is now fixed in its final position.`
    );
  }

  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Selection Sort complete',
    `Sorted ${values.length} values using ${metrics.comparisons} comparisons and ${metrics.swaps} swaps.`
  );
  return steps;
}

function insertionTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'insertion';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  let sortedIndices = [0];

  appendStep(
    steps,
    algorithm,
    values,
    [],
    sortedIndices,
    metrics,
    'start',
    'Ready to insert',
    'Index 0 is a sorted prefix. Take each next key and insert it into that prefix.',
    predictionFor(algorithm, values)
  );

  for (let keyIndex = 1; keyIndex < values.length; keyIndex++) {
    metrics.pass = keyIndex;
    const key = values[keyIndex];
    let scan = keyIndex - 1;
    appendStep(
      steps,
      algorithm,
      values,
      [keyIndex],
      sortedIndices,
      metrics,
      'pass',
      `Pass ${metrics.pass}: pick up ${key}`,
      `Hold ${key} as the key and search left through the sorted prefix.`
    );

    while (scan >= 0) {
      metrics.comparisons++;
      appendStep(
        steps,
        algorithm,
        values,
        [scan, scan + 1],
        sortedIndices,
        metrics,
        'compare',
        `Compare ${values[scan]} with key ${key}`,
        values[scan] > key
          ? `${values[scan]} is larger than the key, so it must shift right.`
          : `${values[scan]} is not larger than the key, so the insertion point is after it.`
      );
      if (values[scan] <= key) break;

      const shifted = values[scan];
      values[scan + 1] = shifted;
      metrics.writes++;
      appendStep(
        steps,
        algorithm,
        values,
        [scan, scan + 1],
        sortedIndices,
        metrics,
        'write',
        `Shift ${shifted} right`,
        `Copy ${shifted} into index ${scan + 1}; the key remains safely held outside the array.`
      );
      scan--;
    }

    const insertionIndex = scan + 1;
    values[insertionIndex] = key;
    metrics.writes++;
    appendStep(
      steps,
      algorithm,
      values,
      [insertionIndex],
      sortedIndices,
      metrics,
      'write',
      `Insert ${key} at index ${insertionIndex}`,
      `Write the held key into its ordered position. Equal values stay in their original order.`
    );

    sortedIndices = range(0, keyIndex + 1);
    appendStep(
      steps,
      algorithm,
      values,
      [insertionIndex],
      sortedIndices,
      metrics,
      'mark-sorted',
      `Indices 0–${keyIndex} form a sorted prefix`,
      `The sorted region now contains ${keyIndex + 1} values.`
    );
  }

  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Insertion Sort complete',
    `Sorted ${values.length} values using ${metrics.comparisons} comparisons and ${metrics.writes} writes.`
  );
  return steps;
}

function mergeTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'merge';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };

  appendStep(
    steps,
    algorithm,
    values,
    [],
    [],
    metrics,
    'start',
    'Ready to merge',
    'Recursively split until runs hold one value, then merge sorted runs back together.',
    predictionFor(algorithm, values)
  );

  function mergeSort(low: number, high: number) {
    if (high - low <= 1) return;
    const mid = Math.floor((low + high) / 2);
    appendStep(
      steps,
      algorithm,
      values,
      range(low, high),
      [],
      metrics,
      'pass',
      `Split [${low}..${high - 1}] at ${mid}`,
      `The range splits into [${low}..${mid - 1}] and [${mid}..${high - 1}]; each is sorted before merging.`
    );
    mergeSort(low, mid);
    mergeSort(mid, high);

    const left = values.slice(low, mid);
    const right = values.slice(mid, high);
    metrics.writes += left.length + right.length;
    appendStep(
      steps,
      algorithm,
      values,
      range(low, high),
      [],
      metrics,
      'write',
      `Copy runs [${left.join(', ')}] and [${right.join(', ')}] into the buffer`,
      `Both sorted runs are copied out — this O(n) buffer is why Merge Sort is not in-place.`,
      undefined,
      [
        { label: 'left run', values: [...left] },
        { label: 'right run', values: [...right] }
      ]
    );

    let leftIndex = 0;
    let rightIndex = 0;
    let write = low;
    while (leftIndex < left.length && rightIndex < right.length) {
      metrics.comparisons++;
      const takeLeft = left[leftIndex] <= right[rightIndex];
      appendStep(
        steps,
        algorithm,
        values,
        [write],
        [],
        metrics,
        'compare',
        `Compare ${left[leftIndex]} with ${right[rightIndex]}`,
        takeLeft
          ? `${left[leftIndex]} ≤ ${right[rightIndex]}: take from the LEFT run${left[leftIndex] === right[rightIndex] ? ' — the tie-break that makes Merge Sort stable' : ''}.`
          : `${right[rightIndex]} is smaller: take from the right run.`,
        undefined,
        [
          { label: 'left run', values: [...left], highlight: [leftIndex] },
          { label: 'right run', values: [...right], highlight: [rightIndex] }
        ]
      );
      const taken = takeLeft ? left[leftIndex++] : right[rightIndex++];
      values[write] = taken;
      metrics.writes++;
      appendStep(
        steps,
        algorithm,
        values,
        [write],
        [],
        metrics,
        'write',
        `Write ${taken} into index ${write}`,
        `The smaller front value lands in the merged range.`,
        undefined,
        [
          {
            label: 'left run',
            values: [...left],
            highlight: leftIndex < left.length ? [leftIndex] : []
          },
          {
            label: 'right run',
            values: [...right],
            highlight: rightIndex < right.length ? [rightIndex] : []
          }
        ]
      );
      write++;
    }
    while (leftIndex < left.length) {
      values[write] = left[leftIndex];
      metrics.writes++;
      appendStep(
        steps,
        algorithm,
        values,
        [write],
        [],
        metrics,
        'write',
        `Drain ${left[leftIndex]} from the left run`,
        'The right run is exhausted; the rest of the left run copies over without comparisons.'
      );
      leftIndex++;
      write++;
    }
    while (rightIndex < right.length) {
      values[write] = right[rightIndex];
      metrics.writes++;
      appendStep(
        steps,
        algorithm,
        values,
        [write],
        [],
        metrics,
        'write',
        `Drain ${right[rightIndex]} from the right run`,
        'The left run is exhausted; the rest of the right run copies over without comparisons.'
      );
      rightIndex++;
      write++;
    }
    metrics.pass++;
    appendStep(
      steps,
      algorithm,
      values,
      [],
      [],
      metrics,
      'mark-sorted',
      `Range [${low}..${high - 1}] merged`,
      `[${values.slice(low, high).join(', ')}] is now a single sorted run.`
    );
  }

  mergeSort(0, values.length);
  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Merge Sort complete',
    `Sorted ${values.length} values with ${metrics.comparisons} comparisons and ${metrics.writes} writes — n log n work regardless of the input order.`
  );
  return steps;
}

function quickTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'quick';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  const sortedIndices: number[] = [];

  appendStep(
    steps,
    algorithm,
    values,
    [],
    sortedIndices,
    metrics,
    'start',
    'Ready to partition',
    'Lomuto partitioning fixes one pivot into its final place per pass, then recurses on both sides.',
    predictionFor(algorithm, values)
  );

  function swap(a: number, b: number) {
    if (a === b) return;
    const held = values[a];
    values[a] = values[b];
    values[b] = held;
    metrics.swaps++;
    metrics.writes += 2;
  }

  function quickSort(low: number, high: number, depth: number) {
    if (low > high) return;
    if (low === high) {
      if (!sortedIndices.includes(low)) sortedIndices.push(low);
      appendStep(
        steps,
        algorithm,
        values,
        [low],
        sortedIndices,
        metrics,
        'mark-sorted',
        `Single value ${values[low]} is sorted`,
        'A one-element range needs no partitioning.'
      );
      return;
    }
    metrics.pass++;
    const pivot = values[high];
    appendStep(
      steps,
      algorithm,
      values,
      [high],
      sortedIndices,
      metrics,
      'pass',
      `Partition [${low}..${high}] around pivot ${pivot} (depth ${depth})`,
      `The recursion stack is ${depth} deep — that stack is Quick Sort's O(log n) expected auxiliary space.`
    );
    let boundary = low;
    for (let scan = low; scan < high; scan++) {
      metrics.comparisons++;
      appendStep(
        steps,
        algorithm,
        values,
        [scan, high],
        sortedIndices,
        metrics,
        'compare',
        `Compare ${values[scan]} with pivot ${pivot}`,
        values[scan] < pivot
          ? `${values[scan]} < ${pivot}: it belongs on the left side of the boundary.`
          : `${values[scan]} ≥ ${pivot}: it stays on the right side.`
      );
      if (values[scan] < pivot) {
        if (scan !== boundary) {
          swap(boundary, scan);
          appendStep(
            steps,
            algorithm,
            values,
            [boundary, scan],
            sortedIndices,
            metrics,
            'swap',
            `Swap ${values[boundary]} and ${values[scan]}`,
            `The small value crosses into the left region — this long-distance swap is why Quick Sort is not stable.`
          );
        }
        boundary++;
      }
    }
    swap(boundary, high);
    if (!sortedIndices.includes(boundary)) sortedIndices.push(boundary);
    appendStep(
      steps,
      algorithm,
      values,
      [boundary],
      sortedIndices,
      metrics,
      'mark-sorted',
      `Pivot ${values[boundary]} is FINAL at index ${boundary}`,
      `Everything left of ${values[boundary]} is smaller, everything right is not smaller — the pivot never moves again.`
    );
    quickSort(low, boundary - 1, depth + 1);
    quickSort(boundary + 1, high, depth + 1);
  }

  quickSort(0, values.length - 1, 1);
  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Quick Sort complete',
    `Sorted ${values.length} values with ${metrics.comparisons} comparisons and ${metrics.swaps} swaps. A sorted or reversed input degrades the last-element pivot to O(n²).`
  );
  return steps;
}

function heapTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'heap';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  const sortedIndices: number[] = [];

  appendStep(
    steps,
    algorithm,
    values,
    [],
    sortedIndices,
    metrics,
    'start',
    'Ready to heapify',
    'Treat the array as a binary tree: children of i sit at 2i+1 and 2i+2. Build a max-heap, then extract.',
    predictionFor(algorithm, values)
  );

  function swap(a: number, b: number) {
    const held = values[a];
    values[a] = values[b];
    values[b] = held;
    metrics.swaps++;
    metrics.writes += 2;
  }

  function siftDown(root: number, heapSize: number) {
    let current = root;
    for (;;) {
      const left = 2 * current + 1;
      const right = 2 * current + 2;
      let largest = current;
      if (left < heapSize) {
        metrics.comparisons++;
        if (values[left] > values[largest]) largest = left;
      }
      if (right < heapSize) {
        metrics.comparisons++;
        if (values[right] > values[largest]) largest = right;
      }
      appendStep(
        steps,
        algorithm,
        values,
        [current, left, right].filter((candidate) => candidate < heapSize),
        sortedIndices,
        metrics,
        'compare',
        `Sift-down at index ${current}: compare with children`,
        largest === current
          ? `${values[current]} is at least as large as its children — the heap property holds here.`
          : `Child ${values[largest]} is larger, so it must move up.`
      );
      if (largest === current) return;
      swap(current, largest);
      appendStep(
        steps,
        algorithm,
        values,
        [current, largest],
        sortedIndices,
        metrics,
        'swap',
        `Swap ${values[current]} and ${values[largest]}`,
        `The larger child rises; sifting continues below.`
      );
      current = largest;
    }
  }

  const firstNonLeaf = Math.floor(values.length / 2) - 1;
  appendStep(
    steps,
    algorithm,
    values,
    firstNonLeaf >= 0 ? [firstNonLeaf] : [],
    sortedIndices,
    metrics,
    'pass',
    `Build max-heap from index ${firstNonLeaf} down to 0`,
    `Indices after ⌊n/2⌋ − 1 = ${firstNonLeaf} are leaves. Sifting mostly-short subtrees is why building is O(n), not O(n log n).`
  );
  for (let root = firstNonLeaf; root >= 0; root--) {
    siftDown(root, values.length);
  }
  appendStep(
    steps,
    algorithm,
    values,
    [0],
    sortedIndices,
    metrics,
    'mark-sorted',
    'Max-heap built',
    `The maximum ${values[0]} is at the root. Extraction can begin.`
  );

  for (let end = values.length - 1; end > 0; end--) {
    metrics.pass++;
    swap(0, end);
    sortedIndices.push(end);
    appendStep(
      steps,
      algorithm,
      values,
      [0, end],
      sortedIndices,
      metrics,
      'swap',
      `Extract max ${values[end]} to index ${end}`,
      `The root swaps with the last heap slot; the sorted suffix grows by one and the heap shrinks to ${end} item${end === 1 ? '' : 's'}.`
    );
    siftDown(0, end);
  }
  sortedIndices.push(0);
  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Heap Sort complete',
    `Sorted ${values.length} values with ${metrics.comparisons} comparisons and ${metrics.swaps} swaps — all inside the array: O(1) auxiliary space.`
  );
  return steps;
}

function countingTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'counting';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const k = maximum - minimum + 1;
  if (k > 24) {
    throw new RangeError(
      `Counting Sort's count array would need k = ${k} slots; keep max − min ≤ 23 so it stays visible.`
    );
  }
  const counts = new Array<number>(k).fill(0);
  const countLabels = Array.from({ length: k }, (_, index) => index + minimum);

  appendStep(
    steps,
    algorithm,
    values,
    [],
    [],
    metrics,
    'start',
    'Ready to count',
    `Keys span ${minimum}..${maximum}, so the count array needs k = ${k} slots. No comparisons will happen at all.`,
    predictionFor(algorithm, values),
    [{ label: `count[${minimum}..${maximum}]`, values: [...counts] }]
  );

  metrics.pass = 1;
  for (let index = 0; index < values.length; index++) {
    counts[values[index] - minimum]++;
    metrics.writes++;
    appendStep(
      steps,
      algorithm,
      values,
      [index],
      [],
      metrics,
      'write',
      `Count ${values[index]}`,
      `count[${values[index]}] becomes ${counts[values[index] - minimum]}.`,
      undefined,
      [
        {
          label: `count[${minimum}..${maximum}]`,
          values: [...counts],
          highlight: [values[index] - minimum]
        }
      ]
    );
  }

  metrics.pass = 2;
  for (let slot = 1; slot < k; slot++) {
    counts[slot] += counts[slot - 1];
    metrics.writes++;
  }
  appendStep(
    steps,
    algorithm,
    values,
    [],
    [],
    metrics,
    'pass',
    'Prefix-sum the counts',
    `Each slot now holds how many values are ≤ its key — the final position boundary for every key.`,
    undefined,
    [{ label: `prefix counts`, values: [...counts] }]
  );

  metrics.pass = 3;
  const output = new Array<number | null>(values.length).fill(null);
  for (let index = values.length - 1; index >= 0; index--) {
    const value = values[index];
    counts[value - minimum]--;
    const target = counts[value - minimum];
    output[target] = value;
    metrics.writes += 2;
    appendStep(
      steps,
      algorithm,
      values,
      [index],
      [],
      metrics,
      'write',
      `Place ${value} at output[${target}]`,
      `Scanning right-to-left keeps equal keys in their original order — the stability guarantee.`,
      undefined,
      [
        { label: `prefix counts`, values: [...counts], highlight: [value - minimum] },
        { label: 'output', values: [...output], highlight: [target] }
      ]
    );
  }

  for (let index = 0; index < values.length; index++) {
    values[index] = output[index] as number;
    metrics.writes++;
  }
  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Counting Sort complete',
    `Sorted ${values.length} values with ${metrics.comparisons} comparisons (zero!) and ${metrics.writes} writes: O(n + k) time, O(n + k) space.`
  );
  return steps;
}

function radixTrace(input: readonly number[]): SortingStep[] {
  const algorithm: SortingAlgorithm = 'radix';
  const values = [...input];
  const steps: SortingStep[] = [];
  const metrics: SortingMetrics = { comparisons: 0, writes: 0, swaps: 0, pass: 0 };
  const minimum = Math.min(...values);
  const shift = minimum < 0 ? -minimum : 0;
  const digits = Math.max(1, String(Math.max(...values.map((value) => value + shift))).length);

  appendStep(
    steps,
    algorithm,
    values,
    [],
    [],
    metrics,
    'start',
    'Ready for digit passes',
    `${shift > 0 ? `Keys shift by +${shift} so all are non-negative. ` : ''}The largest shifted key has ${digits} digit${digits === 1 ? '' : 's'}, so LSD radix runs d = ${digits} stable passes.`,
    predictionFor(algorithm, values)
  );

  let divisor = 1;
  for (let pass = 1; pass <= digits; pass++) {
    metrics.pass = pass;
    const buckets: number[][] = Array.from({ length: 10 }, () => []);
    appendStep(
      steps,
      algorithm,
      values,
      [],
      [],
      metrics,
      'pass',
      `Pass ${pass}: distribute by digit ${pass} (divisor ${divisor})`,
      `Each value goes to bucket ⌊(value${shift > 0 ? ` + ${shift}` : ''}) / ${divisor}⌋ mod 10, preserving current order inside each bucket.`
    );
    for (let index = 0; index < values.length; index++) {
      const digit = Math.floor((values[index] + shift) / divisor) % 10;
      buckets[digit].push(values[index]);
      metrics.writes++;
      appendStep(
        steps,
        algorithm,
        values,
        [index],
        [],
        metrics,
        'write',
        `${values[index]} → bucket ${digit}`,
        `Digit ${pass} of ${values[index] + shift} is ${digit}.`,
        undefined,
        buckets
          .map((bucket, bucketIndex) => ({
            label: `bucket ${bucketIndex}`,
            values: [...bucket] as (number | null)[],
            highlight: bucketIndex === digit ? [bucket.length - 1] : []
          }))
          .filter((view) => view.values.length > 0)
      );
    }
    let write = 0;
    for (let bucketIndex = 0; bucketIndex < 10; bucketIndex++) {
      for (const value of buckets[bucketIndex]) {
        values[write] = value;
        metrics.writes++;
        write++;
      }
    }
    appendStep(
      steps,
      algorithm,
      values,
      range(0, values.length),
      pass === digits ? range(0, values.length) : [],
      metrics,
      'mark-sorted',
      `Collect buckets 0–9 in order`,
      pass === digits
        ? 'After the final digit pass the array is fully sorted.'
        : `The array is now sorted by the last ${pass} digit${pass === 1 ? '' : 's'}; higher digits come next.`
    );
    divisor *= 10;
  }

  appendStep(
    steps,
    algorithm,
    values,
    [],
    range(0, values.length),
    metrics,
    'complete',
    'Radix Sort complete',
    `Sorted ${values.length} values in ${digits} stable passes with zero comparisons: O(d·(n + b)) time with base b = 10.`
  );
  return steps;
}

/** Build a complete deterministic trace. The input array is never mutated. */
export function createSortingTrace(
  algorithm: SortingAlgorithm,
  input: readonly number[]
): SortingTrace {
  assertValues(input);
  const traceBuilders: Record<SortingAlgorithm, (values: readonly number[]) => SortingStep[]> = {
    bubble: bubbleTrace,
    selection: selectionTrace,
    insertion: insertionTrace,
    merge: mergeTrace,
    quick: quickTrace,
    heap: heapTrace,
    counting: countingTrace,
    radix: radixTrace
  };
  const steps = traceBuilders[algorithm](input);

  return {
    algorithm,
    info: SORTING_ALGORITHMS[algorithm],
    input: [...input],
    steps,
    result: [...steps[steps.length - 1].values]
  };
}
