import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCHING_CONFIG,
  SEARCH_STRATEGIES,
  bstHeight,
  comparisonScoreboard,
  createSearchingLesson,
  type SearchStrategy,
  type SearchingConfig
} from './searching';

const strategies: SearchStrategy[] = [
  'linear',
  'binary-iterative',
  'binary-recursive',
  'bst',
  'hash'
];

function configFor(strategy: SearchStrategy): SearchingConfig {
  return {
    ...DEFAULT_SEARCHING_CONFIG,
    strategy,
    values: [2, 5, 8, 12, 16, 23, 38, 56],
    target: 23
  };
}

describe('search strategy execution coverage', () => {
  it('builds all five strategies deterministically with predictions and evidence', () => {
    expect(strategies.map((id) => SEARCH_STRATEGIES.some((s) => s.id === id))).toEqual([
      true,
      true,
      true,
      true,
      true
    ]);

    for (const strategy of strategies) {
      const input = configFor(strategy);
      const lesson = createSearchingLesson(input);
      const repeated = createSearchingLesson(input);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, strategy).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), strategy).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, strategy).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, strategy).toBeGreaterThan(0);

      const predictionStep = lesson.steps.find((step) => step.prediction);
      expect(predictionStep, `${strategy}:has-prediction`).toBeDefined();
      expect(predictionStep?.metadata?.mistake, `${strategy}:has-mistake`).toBeDefined();
      expect(
        finalStep?.complexityEvidence?.assumptions.length,
        `${strategy}:assumptions`
      ).toBeGreaterThan(0);

      for (const language of lesson.supportedLanguages) {
        const source = lesson.sourceByLanguage[language];
        expect(source.length, `${strategy}:${language}`).toBeGreaterThan(0);
        expect(
          source.some((line) =>
            lesson.steps.some((step) => step.semanticOperationId === line.semanticOperationId)
          ),
          `${strategy}:${language}`
        ).toBe(true);
      }

      lesson.steps.forEach((step, index) => {
        expect(step.index, `${strategy}:step-${index}`).toBe(index);
        expect(step.complexityEvidence, `${strategy}:step-${index}`).toBeDefined();
        expect(() => JSON.stringify(step), `${strategy}:step-${index}`).not.toThrow();
      });
    }
  });

  it('reports O(1) auxiliary space for the loop and O(log n) for the recursion', () => {
    const iterative = createSearchingLesson(configFor('binary-iterative'));
    const recursive = createSearchingLesson(configFor('binary-recursive'));
    expect(iterative.steps.at(-1)?.complexityEvidence?.auxiliarySpace).toBe('O(1)');
    expect(recursive.steps.at(-1)?.complexityEvidence?.auxiliarySpace).toBe('O(log n)');
    const peakFrames = Math.max(
      ...recursive.steps.map((step) => step.complexityEvidence?.space.auxiliary.peak ?? 0)
    );
    expect(peakFrames).toBeGreaterThan(1);
  });

  it('classifies a balanced BST as O(log n) and a sorted-insert BST as O(n)', () => {
    const balanced = createSearchingLesson({
      strategy: 'bst',
      values: [12, 5, 23, 2, 8, 16, 56],
      target: 16
    });
    const skewed = createSearchingLesson({
      strategy: 'bst',
      values: [2, 5, 8, 12, 16, 23, 56],
      target: 56
    });
    expect(bstHeight([12, 5, 23, 2, 8, 16, 56])).toBe(2);
    expect(bstHeight([2, 5, 8, 12, 16, 23, 56])).toBe(6);
    expect(balanced.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(log n)');
    expect(skewed.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(skewed.steps.length).toBeGreaterThan(balanced.steps.length);
  });

  it('computes an honest comparison scoreboard across all strategies', () => {
    const scoreboard = comparisonScoreboard([2, 5, 8, 12, 16, 23, 38, 56], 23);
    // Linear: 23 is the 6th element in input order.
    expect(scoreboard.linear).toBe(6);
    // Binary: mid 12 → mid 23 found: 2 comparisons.
    expect(scoreboard['binary-iterative']).toBe(2);
    expect(scoreboard['binary-recursive']).toBe(2);
    expect(scoreboard.bst).toBeGreaterThan(0);
    expect(scoreboard.hash).toBeGreaterThan(0);
    // Hash never compares more than its own chain.
    expect(scoreboard.hash).toBeLessThanOrEqual(8);
  });

  it('binary strategies sort the display array and find the same index', () => {
    const lesson = createSearchingLesson({
      strategy: 'binary-iterative',
      values: [56, 2, 23, 8],
      target: 23
    });
    expect(lesson.initialState.array).toEqual([2, 8, 23, 56]);
    expect(lesson.steps.at(-1)?.stateAfter.result).toBe(2);
  });

  it('rejects invalid configurations deterministically', () => {
    expect(() => createSearchingLesson({ strategy: 'linear', values: [1, 1], target: 1 })).toThrow(
      /distinct/
    );
    expect(() => createSearchingLesson({ strategy: 'linear', values: [1], target: 1 })).toThrow(
      /2–10 values/
    );
  });
});
