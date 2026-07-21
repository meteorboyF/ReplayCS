import { describe, expect, it } from 'vitest';
import type { WorkCounts } from '$lib/complexity/types';
import type { TraceLesson } from '$lib/trace/types';
import { createSearchLesson, type SearchConfig, type SearchAlgorithm } from './search';

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
    expect(evidence.space.auxiliary.current).toBeLessThanOrEqual(evidence.space.auxiliary.peak);
    expect(evidence.space.output.current).toBeLessThanOrEqual(evidence.space.output.peak);
  }
}

describe('search algorithms trace', () => {
  it('linear search finds target', () => {
    const l = createSearchLesson({ algorithm: 'linear-search', values: [1, 2, 3], target: 2 });
    expect(l.steps.at(-1)?.stateAfter.result).toBe(1);
    expectEvidenceInvariants(l);
  });

  it('binary search iterative finds target', () => {
    const l = createSearchLesson({ algorithm: 'binary-search-iterative', values: [2, 5, 8, 12, 16], target: 12 });
    expect(l.steps.at(-1)?.stateAfter.result).toBe(3);
    expectEvidenceInvariants(l);
  });
  
  it('binary search iterative handles missing', () => {
    const l = createSearchLesson({ algorithm: 'binary-search-iterative', values: [1, 3, 5], target: 4 });
    expect(l.steps.at(-1)?.stateAfter.result).toBe(-1);
    expectEvidenceInvariants(l);
  });

  it('binary search recursive finds target', () => {
    const l = createSearchLesson({ algorithm: 'binary-search-recursive', values: [2, 5, 8, 12, 16], target: 12 });
    expect(l.steps.at(-1)?.stateAfter.result).toBe(3);
    expectEvidenceInvariants(l);
  });

  it('bst search finds target', () => {
    const l = createSearchLesson({ algorithm: 'bst-search', values: [2, 5, 8, 12, 16], target: 12 });
    expect(l.steps.at(-1)?.stateAfter.result).toBe(12);
    expectEvidenceInvariants(l);
  });

  it('hash lookup finds target', () => {
    const l = createSearchLesson({ algorithm: 'hash-lookup', values: [2, 5, 8, 12, 16], target: 12 });
    expect(l.steps.at(-1)?.stateAfter.result).toBe(12);
    expectEvidenceInvariants(l);
  });
});
