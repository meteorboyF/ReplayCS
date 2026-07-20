import { describe, expect, it } from 'vitest';
import type { WorkCounts } from '$lib/complexity/types';
import type { TraceLesson } from '$lib/trace/types';
import { createBinarySearchLesson, type BinarySearchComplexityScenario } from './binarySearch';

const assumptions = [
  'Input is sorted.',
  'Indexed access is constant time.',
  'Reads, writes, comparisons, and returns in the displayed pseudocode are counted.'
];
const derivation = [
  'Each failed midpoint decision halves the remaining range.',
  'The number of decisions grows logarithmically.'
];

function scenario(
  caseId: string,
  caseType: BinarySearchComplexityScenario['caseType'],
  time: BinarySearchComplexityScenario['time']
): BinarySearchComplexityScenario {
  return {
    caseId,
    caseType,
    implementation: 'Iterative binary search',
    time,
    space: 'O(1)',
    assumptions,
    derivation
  };
}

function sumWork(work: WorkCounts) {
  return Object.values(work).reduce((total, count) => total + (count ?? 0), 0);
}

function expectEvidenceInvariants(lesson: TraceLesson) {
  let operationTotal = 0;
  const workTotal: WorkCounts = {};

  for (const step of lesson.steps) {
    const evidence = step.complexityEvidence;
    expect(evidence, `${step.id} should include complexity evidence`).toBeDefined();
    if (!evidence) continue;

    operationTotal += evidence.exactOperationCount;
    for (const [metric, count] of Object.entries(evidence.stepWork)) {
      const key = metric as keyof WorkCounts;
      workTotal[key] = (workTotal[key] ?? 0) + (count ?? 0);
    }

    expect(evidence.exactOperationCount).toBe(sumWork(evidence.stepWork));
    expect(evidence.cumulativeOperationCount).toBe(operationTotal);
    expect(evidence.cumulativeWork).toEqual(workTotal);
    expect(evidence.cumulativeOperationCount).toBe(sumWork(evidence.cumulativeWork));
    expect(evidence.inputSize).toEqual({
      n: lesson.initialState.values instanceof Array ? lesson.initialState.values.length : 0
    });
    expect(evidence.space.auxiliary.current).toBeLessThanOrEqual(evidence.space.auxiliary.peak);
    expect(evidence.space.output.current).toBeLessThanOrEqual(evidence.space.output.peak);
    expect(evidence.space.output.peak).toBeLessThanOrEqual(1);
    expect(evidence.space.output.unit).toBe('returned indices');
    expect(evidence.assumptions.length).toBeGreaterThan(0);
    expect(evidence.derivation.length).toBeGreaterThan(0);
  }
}

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

  it('preserves the legacy lesson id and leaves an unclassified run without evidence', () => {
    const lessons = [
      createBinarySearchLesson(),
      createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38, 56], 12),
      createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38, 56], 57)
    ];

    for (const lesson of lessons) {
      expect(lesson.id).toBe('binary-search');
      expect(lesson.steps.every((step) => !Object.hasOwn(step, 'complexityEvidence'))).toBe(true);
      expect(lesson.steps.every((step) => step.complexityCost)).toBe(true);
    }
    expect(lessons.map((lesson) => lesson.steps.at(-1)?.complexityCost?.comparisons)).toEqual([
      2, 1, 4
    ]);
  });

  it('counts a first-midpoint best case exactly and assigns a scenario-specific lesson id', () => {
    const best = scenario('binary-search-best', 'best', 'O(1)');
    const lesson = createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38, 56], 12, best);
    const finalEvidence = lesson.steps.at(-1)?.complexityEvidence;

    expect(lesson.id).toBe('binary-search-best');
    expect(lesson.steps).toHaveLength(5);
    expect(finalEvidence?.cumulativeWork).toEqual({
      read: 10,
      write: 3,
      comparison: 2,
      return: 1
    });
    expect(finalEvidence?.cumulativeOperationCount).toBe(16);
    expect(finalEvidence).toMatchObject({
      caseId: 'binary-search-best',
      selectedCase: 'best',
      implementationVariant: 'Iterative binary search',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      space: {
        auxiliary: { current: 3, peak: 3, unit: 'scalar slots' },
        output: { current: 1, peak: 1, unit: 'returned indices' },
        callStackDepth: 1
      }
    });
    expectEvidenceInvariants(lesson);
  });

  it('accumulates deterministic work across a multi-step average trace', () => {
    const average = scenario('binary-search-average', 'average', 'O(log n)');
    const lesson = createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38, 56], 23, average);
    const finalEvidence = lesson.steps.at(-1)?.complexityEvidence;

    expect(lesson.id).toBe('binary-search-average');
    expect(
      lesson.steps.filter((step) => step.semanticOperationId === 'compare-target')
    ).toHaveLength(3);
    expect(finalEvidence?.cumulativeWork).toEqual({
      read: 22,
      write: 5,
      comparison: 5,
      return: 1
    });
    expect(finalEvidence?.cumulativeOperationCount).toBe(33);
    expectEvidenceInvariants(lesson);
  });

  it('includes the failed terminal range check in a missing-target worst case', () => {
    const worst = scenario('binary-search-worst', 'worst', 'O(log n)');
    const lesson = createBinarySearchLesson([2, 5, 8, 12, 16, 23, 38, 56], 57, worst);
    const finalStep = lesson.steps.at(-1);
    const finalEvidence = finalStep?.complexityEvidence;

    expect(lesson.id).toBe('binary-search-worst');
    expect(finalStep?.semanticOperationId).toBe('not-found');
    expect(lesson.steps.at(-2)).toMatchObject({
      semanticOperationId: 'check-range',
      complexityEvidence: { stepWork: { read: 2, comparison: 1 } }
    });
    expect(finalEvidence?.stepWork).toEqual({ return: 1 });
    expect(finalEvidence?.cumulativeWork).toEqual({
      read: 51,
      write: 10,
      comparison: 13,
      return: 1
    });
    expect(finalEvidence?.cumulativeOperationCount).toBe(75);
    expect(finalEvidence?.space).toEqual({
      auxiliary: { current: 2, peak: 3, unit: 'scalar slots' },
      output: { current: 1, peak: 1, unit: 'returned indices' },
      callStackDepth: 1
    });
    expectEvidenceInvariants(lesson);
  });
});
