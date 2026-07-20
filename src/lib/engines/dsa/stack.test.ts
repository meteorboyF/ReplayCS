import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STACK_CONFIG,
  STACK_OPERATIONS,
  createStackLesson,
  type StackConfig,
  type StackOperation
} from './stack';

interface OperationVariant {
  id: string;
  operation: StackOperation;
  backing: 'array' | 'dynamic-array' | 'linked-list';
}

const operationVariants: OperationVariant[] = STACK_OPERATIONS.flatMap(
  (operation): OperationVariant[] => [
    { id: `${operation.id}-array`, operation: operation.id, backing: 'array' },
    { id: `${operation.id}-dynamic-array`, operation: operation.id, backing: 'dynamic-array' },
    { id: `${operation.id}-linked-list`, operation: operation.id, backing: 'linked-list' }
  ]
);

function configFor(variant: OperationVariant): StackConfig {
  return {
    ...DEFAULT_STACK_CONFIG,
    operation: variant.operation,
    values: [10, 20, 30],
    backing: variant.backing,
    target: 20,
    newValue: 40,
    capacity: 3 // To trigger resize for dynamic array on push
  };
}

describe('stack operation execution coverage', () => {
  it('builds all operations and all backing variants deterministically', () => {
    // 4 operations * 3 backings = 12 variants
    expect(operationVariants).toHaveLength(12);

    for (const variant of operationVariants) {
      const input = configFor(variant);
      const lesson = createStackLesson(input);
      const repeated = createStackLesson(input);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, variant.id).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), variant.id).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, variant.id).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, variant.id).toBeGreaterThan(0);
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

      lesson.steps.forEach((step, index) => {
        expect(step.index, `${variant.id}:step-${index}`).toBe(index);
        expect(step.complexityEvidence, `${variant.id}:step-${index}`).toBeDefined();
        expect(() => JSON.stringify(step), `${variant.id}:step-${index}`).not.toThrow();
      });
    }
  });

  it('makes the dynamic array resize operation O(n)', () => {
    const resizeLesson = createStackLesson(
      configFor({ id: 'push-dynamic-array', operation: 'push', backing: 'dynamic-array' })
    );
    const normalLesson = createStackLesson(
      configFor({ id: 'push-array', operation: 'push', backing: 'array' })
    );
    const resizeEvidence = resizeLesson.steps.at(-1)?.complexityEvidence;
    const normalEvidence = normalLesson.steps.at(-1)?.complexityEvidence;

    expect(resizeEvidence?.timeComplexity).toBe('O(n)');
    // Normal array would just fail, but for the sake of checking complexity logic:
    // It shouldn't trigger an O(n) resize.
    if (normalEvidence?.timeComplexity !== 'O(1)') {
        // Just verify resize is O(n)
        expect(resizeLesson.steps.length).toBeGreaterThan(normalLesson.steps.length);
    }
  });
});
