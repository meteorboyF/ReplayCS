import { describe, expect, it } from 'vitest';
import { createBinarySearchLesson } from './binarySearch';

describe('binary search wrapper trace', () => {
  it('finds a target deterministically', () => {
    const l = createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38], 23);
    expect(l.steps.at(-1)?.stateAfter.result).toBe(5);
  });
  it('returns -1 for missing values', () => {
    expect(createBinarySearchLesson([1, 3, 5], 4).steps.at(-1)?.stateAfter.result).toBe(-1);
  });
});
