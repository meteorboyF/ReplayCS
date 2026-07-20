import type { PredictionChallenge } from '$lib/trace/types';

export const SORTING_INPUT_MIN = 2;
export const SORTING_INPUT_MAX = 10;

export type SortingAlgorithm = 'bubble' | 'selection' | 'insertion';

export interface SortingAlgorithmInfo {
  name: string;
  shortName: string;
  description: string;
  stable: boolean;
  stabilityReason: string;
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
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
  },
  selection: {
    name: 'Selection Sort',
    shortName: 'Selection',
    description: 'Find the smallest remaining value and place it at the next left position.',
    stable: false,
    stabilityReason: 'A long-distance swap can move an equal value past another equal value.',
    complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
  },
  insertion: {
    name: 'Insertion Sort',
    shortName: 'Insertion',
    description: 'Grow a sorted prefix by shifting larger values and inserting one key.',
    stable: true,
    stabilityReason: 'The key moves only past larger values, never past an equal value.',
    complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' }
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
  prediction?: PredictionChallenge
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

/** Build a complete deterministic trace. The input array is never mutated. */
export function createSortingTrace(
  algorithm: SortingAlgorithm,
  input: readonly number[]
): SortingTrace {
  assertValues(input);
  const steps =
    algorithm === 'bubble'
      ? bubbleTrace(input)
      : algorithm === 'selection'
        ? selectionTrace(input)
        : insertionTrace(input);

  return {
    algorithm,
    info: SORTING_ALGORITHMS[algorithm],
    input: [...input],
    steps,
    result: [...steps[steps.length - 1].values]
  };
}
