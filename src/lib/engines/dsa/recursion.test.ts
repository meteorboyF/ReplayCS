import { describe, expect, it } from 'vitest';
import { RECURSION_SCENARIOS, createRecursionLesson } from './recursion';

describe('recursion execution engine', () => {
  it('builds every bounded scenario with four synchronized languages', () => {
    for (const scenario of RECURSION_SCENARIOS) {
      const lesson = createRecursionLesson(scenario.id, scenario.id === 'binary' ? 4 : 5);
      expect(lesson.steps.length).toBeGreaterThan(1);
      expect(Object.keys(lesson.sourceByLanguage)).toEqual(['c', 'cpp', 'java', 'python']);
      expect(lesson.steps.every((step) => step.prediction === undefined)).toBe(true);
      expect(lesson.steps.at(-1)?.stateAfter.frames).toEqual([]);
    }
  });

  it('derives call count, depth, and recurrence complexity from execution', () => {
    const binary = createRecursionLesson('binary', 4);
    const divide = createRecursionLesson('divide-conquer', 8);
    const halving = createRecursionLesson('halving', 8);
    expect(binary.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(2^n)');
    expect(binary.steps.at(-1)?.stateAfter.calls).toBe(15);
    expect(divide.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n log n)');
    expect(halving.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(log n)');
    expect(halving.steps.at(-1)?.complexityEvidence?.auxiliarySpace).toBe('O(log n)');
  });

  it('keeps exponential inputs strict and iterative space constant', () => {
    expect(() => createRecursionLesson('binary', 6)).toThrow(/1 to 5/);
    expect(() => createRecursionLesson('divide-conquer', 9)).toThrow(/1 to 8/);
    expect(
      createRecursionLesson('iterative', 5).steps.at(-1)?.complexityEvidence?.auxiliarySpace
    ).toBe('O(1)');
  });
});
