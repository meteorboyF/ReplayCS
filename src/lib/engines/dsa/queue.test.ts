import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUEUE_CONFIG,
  QUEUE_OPERATIONS,
  createQueueLesson,
  type QueueConfig,
  type QueueOperation
} from './queue';

interface OperationVariant {
  id: string;
  operation: QueueOperation;
  backing: 'naive-array' | 'circular-array' | 'linked-list';
}

const operationVariants: OperationVariant[] = QUEUE_OPERATIONS.flatMap(
  (operation): OperationVariant[] => [
    { id: `${operation.id}-naive-array`, operation: operation.id, backing: 'naive-array' },
    { id: `${operation.id}-circular-array`, operation: operation.id, backing: 'circular-array' },
    { id: `${operation.id}-linked-list`, operation: operation.id, backing: 'linked-list' }
  ]
);

function configFor(variant: OperationVariant): QueueConfig {
  return {
    ...DEFAULT_QUEUE_CONFIG,
    operation: variant.operation,
    values: [10, 20, 30],
    backing: variant.backing,
    newValue: 40,
    capacity: 5
  };
}

describe('queue operation execution coverage', () => {
  it('builds all operations and all backing variants deterministically', () => {
    // 4 operations * 3 backings = 12 variants
    expect(operationVariants).toHaveLength(12);

    for (const variant of operationVariants) {
      const input = configFor(variant);
      const lesson = createQueueLesson(input);
      const repeated = createQueueLesson(input);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, variant.id).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), variant.id).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, variant.id).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, variant.id).toBeGreaterThan(
        0
      );
      expect(finalStep?.complexityEvidence?.timeComplexity, variant.id).toBeDefined();

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

      const predictionStep = lesson.steps.find((step) => step.prediction);
      expect(predictionStep, `${variant.id}:has-prediction`).toBeDefined();
      expect(predictionStep?.metadata?.mistake, `${variant.id}:has-mistake`).toBeDefined();
      expect(
        lesson.steps.at(-1)?.complexityEvidence?.assumptions.length,
        `${variant.id}:assumptions`
      ).toBeGreaterThan(0);

      lesson.steps.forEach((step, index) => {
        expect(step.index, `${variant.id}:step-${index}`).toBe(index);
        expect(step.complexityEvidence, `${variant.id}:step-${index}`).toBeDefined();
        expect(() => JSON.stringify(step), `${variant.id}:step-${index}`).not.toThrow();
      });
    }
  });

  it('turns linked-queue enqueue from O(1) with a rear pointer into O(n) without one', () => {
    const withRear = createQueueLesson({
      operation: 'enqueue',
      backing: 'linked-list',
      values: [10, 20, 30],
      newValue: 40,
      capacity: 5
    });
    const withoutRear = createQueueLesson({
      operation: 'enqueue',
      backing: 'linked-list',
      values: [10, 20, 30],
      newValue: 40,
      capacity: -1
    });
    expect(withRear.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(1)');
    expect(withoutRear.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(withoutRear.steps.length).toBeGreaterThan(withRear.steps.length);
  });

  it('makes naive dequeue shift operation O(n) and circular dequeue O(1)', () => {
    const naiveLesson = createQueueLesson(
      configFor({ id: 'dequeue-naive-array', operation: 'dequeue', backing: 'naive-array' })
    );
    const circularLesson = createQueueLesson(
      configFor({ id: 'dequeue-circular-array', operation: 'dequeue', backing: 'circular-array' })
    );
    const naiveEvidence = naiveLesson.steps.at(-1)?.complexityEvidence;
    const circularEvidence = circularLesson.steps.at(-1)?.complexityEvidence;

    expect(naiveEvidence?.timeComplexity).toBe('O(n)');
    expect(circularEvidence?.timeComplexity).toBe('O(1)');
    expect(naiveLesson.steps.length).toBeGreaterThan(circularLesson.steps.length);
  });
});
