import { describe, expect, it } from 'vitest';
import {
  SORTING_METADATA,
  createSortLesson,
  parseSortingInput,
  validateSortingInput,
  type SortingAlgorithm
} from './sorting';

const algorithms: SortingAlgorithm[] = [
  'bubble', 'selection', 'insertion', 'merge', 'quick', 'heap', 'counting', 'radix'
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
    ['', 'Enter 2 to 15'],
    ['1', 'between 2 and 15'],
    ['1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16', 'between 2 and 15'],
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
    expect(() => parseSortingInput('4')).toThrow('between 2 and 15');
  });
});

describe('deterministic sorting traces', () => {
  it.each(algorithms)(
    '%s sorts duplicates and positive values correctly',
    (algorithm) => {
      const input = [4, 1, 4, 2, 0];
      const lesson = createSortLesson({ algorithm, values: input });

      const finalState = lesson.steps[lesson.steps.length - 1].stateAfter;
      expect(finalState.array).toEqual([0, 1, 2, 4, 4]);
      expect(input).toEqual([4, 1, 4, 2, 0]);
    }
  );

  it.each(algorithms)('%s produces byte-for-byte repeatable snapshots', (algorithm) => {
    const first = createSortLesson({ algorithm, values: [5, 1, 3, 2] });
    const second = createSortLesson({ algorithm, values: [5, 1, 3, 2] });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('exposes accurate stability and complexity labels', () => {
    const bubble = SORTING_METADATA.find(m => m.id === 'bubble');
    const selection = SORTING_METADATA.find(m => m.id === 'selection');
    const insertion = SORTING_METADATA.find(m => m.id === 'insertion');
    
    expect(bubble?.stable).toBe(true);
    expect(selection?.stable).toBe(false);
    expect(insertion?.stable).toBe(true);
    expect(bubble?.cases.find(c => c.caseType === 'worst')?.timeComplexity).toBe('O(n²)');
    expect(insertion?.cases.find(c => c.caseType === 'best')?.timeComplexity).toBe('O(n)');
  });
});
