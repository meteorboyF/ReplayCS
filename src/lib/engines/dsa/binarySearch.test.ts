import { describe, expect, it } from 'vitest';
import { createBinarySearchLesson } from './binarySearch';
describe('binary search trace', () => {
  it('finds a target deterministically', () => {
    const l = createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38], 23);
    expect(l.steps.at(-1)?.stateAfter.result).toBe(5);
    expect(l.steps.some((s) => s.prediction)).toBe(true);
  });
  it('returns -1 for missing values', () =>
    expect(createBinarySearchLesson([1, 3, 5], 4).steps.at(-1)?.stateAfter.result).toBe(-1));
  it('maps every semantic line across four languages', () => {
    const l = createBinarySearchLesson();
    for (const lang of l.supportedLanguages) expect(l.sourceByLanguage[lang].length).toBe(8);
  });
});
