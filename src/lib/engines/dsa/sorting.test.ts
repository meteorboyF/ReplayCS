import { describe, expect, it } from 'vitest';
import {
  SORTING_ALGORITHMS,
  createSortingTrace,
  parseSortingInput,
  validateSortingInput,
  type SortingAlgorithm
} from './sorting';

const algorithms: SortingAlgorithm[] = [
  'bubble',
  'selection',
  'insertion',
  'merge',
  'quick',
  'heap',
  'counting',
  'radix'
];

describe('sorting input validation', () => {
  it('parses signed, spaced, comma-separated integers', () => {
    expect(validateSortingInput(' 8, -3, +5, 0 ')).toEqual({
      valid: true,
      values: [8, -3, 5, 0],
      error: null
    });
    expect(parseSortingInput('2, 1')).toEqual([2, 1]);
  });

  it.each([
    ['', 'Enter 2 to 10'],
    ['1', 'between 2 and 10'],
    ['1,2,3,4,5,6,7,8,9,10,11', 'between 2 and 10'],
    ['1,,2', 'remove empty entries'],
    ['1,2.5', 'not a valid integer'],
    ['1,nope', 'not a valid integer'],
    ['1,9007199254740992', 'safe integer']
  ])('rejects invalid input %j', (input, message) => {
    const result = validateSortingInput(input);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain(message);
  });

  it('throws when parsing an invalid input', () => {
    expect(() => parseSortingInput('4')).toThrow('between 2 and 10');
  });
});

describe('deterministic sorting traces', () => {
  it.each(algorithms)(
    '%s sorts duplicates and negative values without changing the input',
    (algorithm) => {
      const input = [4, -1, 4, 2, 0];
      const trace = createSortingTrace(algorithm, input);

      expect(trace.result).toEqual([-1, 0, 2, 4, 4]);
      expect(input).toEqual([4, -1, 4, 2, 0]);
      expect(trace.steps.at(-1)?.sortedIndices).toEqual([0, 1, 2, 3, 4]);
      expect(trace.steps.at(-1)?.activeIndices).toEqual([]);
      expect(trace.steps.filter((step) => step.prediction)).toHaveLength(1);
    }
  );

  it.each(algorithms)('%s produces byte-for-byte repeatable snapshots', (algorithm) => {
    const first = createSortingTrace(algorithm, [5, 1, 3, 2]);
    const second = createSortingTrace(algorithm, [5, 1, 3, 2]);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('records exact operation counters', () => {
    const bubble = createSortingTrace('bubble', [3, 2, 1]).steps.at(-1)?.metrics;
    const selection = createSortingTrace('selection', [3, 2, 1]).steps.at(-1)?.metrics;
    const insertion = createSortingTrace('insertion', [3, 2, 1]).steps.at(-1)?.metrics;

    expect(bubble).toEqual({ comparisons: 3, writes: 6, swaps: 3, pass: 2 });
    expect(selection).toEqual({ comparisons: 3, writes: 2, swaps: 1, pass: 2 });
    expect(insertion).toEqual({ comparisons: 3, writes: 5, swaps: 0, pass: 2 });
  });

  it('uses an early exit for an already sorted bubble trace', () => {
    const trace = createSortingTrace('bubble', [1, 2, 3, 4]);
    expect(trace.steps.at(-1)?.metrics).toEqual({
      comparisons: 3,
      writes: 0,
      swaps: 0,
      pass: 1
    });
    expect(trace.steps.some((step) => step.title.startsWith('No swaps'))).toBe(true);
  });

  it('marks a suffix for Bubble Sort and prefixes for Selection and Insertion Sort', () => {
    const bubbleMark = createSortingTrace('bubble', [3, 1, 2]).steps.find(
      (step) => step.event === 'mark-sorted'
    );
    const selectionMark = createSortingTrace('selection', [3, 1, 2]).steps.find(
      (step) => step.event === 'mark-sorted'
    );
    const insertionMark = createSortingTrace('insertion', [3, 1, 2]).steps.find(
      (step) => step.event === 'mark-sorted'
    );

    expect(bubbleMark?.sortedIndices).toEqual([2]);
    expect(selectionMark?.sortedIndices).toEqual([0]);
    expect(insertionMark?.sortedIndices).toEqual([0, 1]);
  });

  it('exposes accurate stability, in-place, and complexity labels', () => {
    expect(SORTING_ALGORITHMS.bubble.stable).toBe(true);
    expect(SORTING_ALGORITHMS.selection.stable).toBe(false);
    expect(SORTING_ALGORITHMS.insertion.stable).toBe(true);
    expect(SORTING_ALGORITHMS.merge.stable).toBe(true);
    expect(SORTING_ALGORITHMS.quick.stable).toBe(false);
    expect(SORTING_ALGORITHMS.heap.stable).toBe(false);
    expect(SORTING_ALGORITHMS.counting.stable).toBe(true);
    expect(SORTING_ALGORITHMS.radix.stable).toBe(true);
    expect(SORTING_ALGORITHMS.merge.inPlace).toBe(false);
    expect(SORTING_ALGORITHMS.quick.inPlace).toBe(true);
    expect(SORTING_ALGORITHMS.heap.inPlace).toBe(true);
    expect(SORTING_ALGORITHMS.counting.inPlace).toBe(false);
    expect(SORTING_ALGORITHMS.bubble.complexity.worst).toBe('O(n²)');
    expect(SORTING_ALGORITHMS.insertion.complexity.best).toBe('O(n)');
    expect(SORTING_ALGORITHMS.merge.complexity.worst).toBe('O(n log n)');
    expect(SORTING_ALGORITHMS.quick.complexity.worst).toBe('O(n²)');
    expect(SORTING_ALGORITHMS.heap.complexity.space).toBe('O(1)');
    expect(SORTING_ALGORITHMS.counting.complexity.worst).toBe('O(n + k)');
  });

  it('shows the merge buffer and count array as auxiliary views', () => {
    const merge = createSortingTrace('merge', [3, 1, 4, 2]);
    const mergeBufferStep = merge.steps.find((step) =>
      step.auxiliary?.some((view) => view.label === 'left run')
    );
    expect(mergeBufferStep).toBeDefined();

    const counting = createSortingTrace('counting', [3, 1, 4, 2]);
    const countStep = counting.steps.find((step) =>
      step.auxiliary?.some((view) => view.label.startsWith('count['))
    );
    expect(countStep).toBeDefined();
    const outputStep = counting.steps.find((step) =>
      step.auxiliary?.some((view) => view.label === 'output')
    );
    expect(outputStep).toBeDefined();
  });

  it('counts zero comparisons for the non-comparison sorts', () => {
    expect(createSortingTrace('counting', [5, 2, 8, 2]).steps.at(-1)?.metrics.comparisons).toBe(0);
    expect(createSortingTrace('radix', [170, 45, 75, 90]).steps.at(-1)?.metrics.comparisons).toBe(
      0
    );
  });

  it('fixes each quick-sort pivot in its final position', () => {
    const trace = createSortingTrace('quick', [5, 2, 8, 1]);
    const firstPivotStep = trace.steps.find(
      (step) => step.event === 'mark-sorted' && step.title.includes('FINAL')
    );
    expect(firstPivotStep).toBeDefined();
    // First pivot is 1 (last element); after partition it lands at index 0.
    expect(firstPivotStep?.values[firstPivotStep.sortedIndices[0]]).toBe(1);
  });

  it('handles negative keys in counting and radix sort via the documented shift', () => {
    expect(createSortingTrace('counting', [4, -1, 4, 2, 0]).result).toEqual([-1, 0, 2, 4, 4]);
    expect(createSortingTrace('radix', [4, -1, 4, 2, 0]).result).toEqual([-1, 0, 2, 4, 4]);
  });

  it('rejects traces outside the supported arena bounds', () => {
    expect(() => createSortingTrace('bubble', [1])).toThrow(RangeError);
    expect(() => createSortingTrace('bubble', [1, Number.NaN])).toThrow(TypeError);
    expect(() => createSortingTrace('counting', [0, 1000])).toThrow(/count array/);
  });
});
