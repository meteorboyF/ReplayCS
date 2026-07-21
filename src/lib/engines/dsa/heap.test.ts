import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEAP_CONFIG,
  HEAP_OPERATIONS,
  createHeapLesson,
  type HeapConfig,
  type HeapKind,
  type HeapOperation
} from './heap';

interface OperationVariant {
  id: string;
  operation: HeapOperation;
  kind: HeapKind;
}

const operationVariants: OperationVariant[] = HEAP_OPERATIONS.flatMap(
  (operation): OperationVariant[] => [
    { id: `${operation.id}-max`, operation: operation.id, kind: 'max' },
    { id: `${operation.id}-min`, operation: operation.id, kind: 'min' }
  ]
);

function configFor(variant: OperationVariant): HeapConfig {
  return {
    ...DEFAULT_HEAP_CONFIG,
    operation: variant.operation,
    kind: variant.kind,
    values: [50, 30, 40, 10, 20, 35],
    value: variant.operation === 'search' ? 35 : 60
  };
}

describe('heap operation execution coverage', () => {
  it('builds all five operations for both heap kinds deterministically', () => {
    expect(operationVariants).toHaveLength(10);

    for (const variant of operationVariants) {
      const input = configFor(variant);
      const lesson = createHeapLesson(input);
      const repeated = createHeapLesson(input);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, variant.id).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), variant.id).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, variant.id).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, variant.id).toBeGreaterThan(0);

      const predictionStep = lesson.steps.find((step) => step.prediction);
      expect(predictionStep, `${variant.id}:has-prediction`).toBeDefined();
      expect(predictionStep?.metadata?.mistake, `${variant.id}:has-mistake`).toBeDefined();
      expect(
        finalStep?.complexityEvidence?.assumptions.length,
        `${variant.id}:assumptions`
      ).toBeGreaterThan(0);

      for (const language of lesson.supportedLanguages) {
        const source = lesson.sourceByLanguage[language];
        expect(source.length, `${variant.id}:${language}`).toBeGreaterThan(0);
        expect(
          source.some((line) =>
            lesson.steps.some((step) => step.semanticOperationId === line.semanticOperationId)
          ),
          `${variant.id}:${language}`
        ).toBe(true);
      }

      lesson.steps.forEach((step, index) => {
        expect(step.index, `${variant.id}:step-${index}`).toBe(index);
        expect(step.complexityEvidence, `${variant.id}:step-${index}`).toBeDefined();
        expect(() => JSON.stringify(step), `${variant.id}:step-${index}`).not.toThrow();
      });
    }
  });

  it('maintains the max-heap invariant after insert and extract', () => {
    const insert = createHeapLesson({ operation: 'insert', kind: 'max', values: [50, 30, 40, 10, 20, 35], value: 60 });
    const insertHeap = insert.steps.at(-1)?.stateAfter.heap as number[];
    expect(insertHeap[0]).toBe(60); // new max bubbled to the root
    expectValidHeap(insertHeap, 'max');

    const extract = createHeapLesson({ operation: 'extract', kind: 'max', values: [50, 30, 40, 10, 20, 35] });
    expect(extract.steps.at(-1)?.stateAfter.result).toBe(50); // extracted the max
    expectValidHeap(extract.steps.at(-1)?.stateAfter.heap as number[], 'max');
  });

  it('maintains the min-heap invariant after operations', () => {
    const extract = createHeapLesson({ operation: 'extract', kind: 'min', values: [50, 30, 40, 10, 20, 35] });
    expect(extract.steps.at(-1)?.stateAfter.result).toBe(10); // min
    expectValidHeap(extract.steps.at(-1)?.stateAfter.heap as number[], 'min');
  });

  it('reports peek O(1), insert/extract O(log n), search/build O(n)', () => {
    expect(createHeapLesson(configFor({ id: 'peek-max', operation: 'peek', kind: 'max' })).steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(1)');
    expect(createHeapLesson(configFor({ id: 'insert-max', operation: 'insert', kind: 'max' })).steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(log n)');
    expect(createHeapLesson(configFor({ id: 'extract-max', operation: 'extract', kind: 'max' })).steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(log n)');
    expect(createHeapLesson(configFor({ id: 'search-max', operation: 'search', kind: 'max' })).steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    const build = createHeapLesson(configFor({ id: 'build-max', operation: 'build', kind: 'max' }));
    expect(build.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(build.steps[0].prediction?.explanation).toMatch(/O\(n\).*not O\(n log n\)|not O\(n log n\)/);
  });

  it('build-heap produces a valid heap from an arbitrary array', () => {
    const build = createHeapLesson({ operation: 'build', kind: 'max', values: [10, 20, 30, 40, 50, 60, 70] });
    expectValidHeap(build.steps.at(-1)?.stateAfter.heap as number[], 'max');
  });

  it('rejects invalid configurations deterministically', () => {
    expect(() => createHeapLesson({ operation: 'insert', kind: 'max', values: [], value: 1 })).toThrow(/1–10 values/);
  });
});

function expectValidHeap(heap: number[], kind: HeapKind) {
  for (let index = 1; index < heap.length; index++) {
    const parent = Math.floor((index - 1) / 2);
    if (kind === 'max') expect(heap[parent], `parent ${parent} vs child ${index}`).toBeGreaterThanOrEqual(heap[index]);
    else expect(heap[parent], `parent ${parent} vs child ${index}`).toBeLessThanOrEqual(heap[index]);
  }
}
