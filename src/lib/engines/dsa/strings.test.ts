import { describe, expect, it } from 'vitest';
import { STRING_OPERATIONS, createStringLesson } from './strings';

describe('strings execution engine', () => {
  it('builds every operation with one semantic trace for four languages', () => {
    for (const operation of STRING_OPERATIONS) {
      const secondary =
        operation.id === 'search' ? 'A' : operation.id === 'substring' ? '3' : 'PLAY';
      const lesson = createStringLesson({
        operation: operation.id,
        source: 'REPLAY',
        secondary,
        index: 2
      });
      expect(lesson.steps.length).toBeGreaterThan(1);
      expect(Object.keys(lesson.sourceByLanguage)).toEqual(['c', 'cpp', 'java', 'python']);
      expect(lesson.steps.every((step) => step.prediction === undefined)).toBe(true);
      expect(lesson.steps.at(-1)?.stateAfter.result).not.toBeNull();
    }
  });

  it('distinguishes immutable quadratic copying from linear builder construction', () => {
    const immutable = createStringLesson({ operation: 'immutable-build', source: 'REPLAY' });
    const builder = createStringLesson({ operation: 'builder-build', source: 'REPLAY' });
    expect(immutable.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n^2)');
    expect(builder.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(immutable.steps.at(-1)?.stateAfter.copies).toBeGreaterThan(
      builder.steps.at(-1)?.stateAfter.copies as number
    );
  });

  it('reports best and worst search cases and rejects unsafe inputs', () => {
    const best = createStringLesson({ operation: 'search', source: 'REPLAY', secondary: 'R' });
    const worst = createStringLesson({ operation: 'search', source: 'REPLAY', secondary: 'Z' });
    expect(best.steps.at(-1)?.complexityEvidence?.selectedCase).toBe('best');
    expect(best.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(1)');
    expect(worst.steps.at(-1)?.complexityEvidence?.selectedCase).toBe('worst');
    expect(() => createStringLesson({ operation: 'access', source: 'REPLAY', index: 20 })).toThrow(
      /Index/
    );
    expect(() =>
      createStringLesson({ operation: 'search', source: 'REPLAY', secondary: 'AB' })
    ).toThrow(/one target/);
    expect(() => createStringLesson({ operation: 'traverse', source: 'x'.repeat(13) })).toThrow(
      /1–12/
    );
  });
});
