import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LINKED_LIST_CONFIG,
  LINKED_LIST_OPERATIONS,
  createLinkedListLesson,
  getLinkedListOperationMetadata,
  type LinkedListConfig,
  type LinkedListOperation
} from './linkedList';

interface OperationVariant {
  id: string;
  operation: LinkedListOperation;
  maintainTail: boolean;
}

const operationVariants: OperationVariant[] = LINKED_LIST_OPERATIONS.flatMap(
  (operation): OperationVariant[] =>
    operation.id === 'insert-tail'
      ? [
          { id: 'insert-tail-without-tail', operation: operation.id, maintainTail: false },
          { id: 'insert-tail-with-tail', operation: operation.id, maintainTail: true }
        ]
      : [{ id: operation.id, operation: operation.id, maintainTail: false }]
);

function configFor(variant: OperationVariant): LinkedListConfig {
  return {
    ...DEFAULT_LINKED_LIST_CONFIG,
    operation: variant.operation,
    values: [12, 27, 41, 56],
    position: 1,
    target: 27,
    newValue: 73,
    maintainTail: variant.maintainTail,
    cycleEntry: variant.operation === 'detect-cycle' ? 1 : null
  };
}

describe('linked-list operation execution coverage', () => {
  it('builds all fourteen operations and both insert-tail implementations deterministically', () => {
    expect(operationVariants).toHaveLength(15);

    for (const variant of operationVariants) {
      const input = configFor(variant);
      const lesson = createLinkedListLesson(input);
      const repeated = createLinkedListLesson(input);
      const metadata = getLinkedListOperationMetadata(variant.operation);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, variant.id).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), variant.id).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, variant.id).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, variant.id).toBeGreaterThan(
        0
      );
      expect(
        metadata.cases.some(
          (complexityCase) =>
            complexityCase.timeComplexity === finalStep?.complexityEvidence?.timeComplexity &&
            complexityCase.auxiliarySpace === finalStep.complexityEvidence.auxiliarySpace
        ),
        variant.id
      ).toBe(true);

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

  it('makes the maintained-tail implementation visibly smaller and constant-time', () => {
    const withoutTail = createLinkedListLesson(
      configFor({ id: 'without-tail', operation: 'insert-tail', maintainTail: false })
    );
    const withTail = createLinkedListLesson(
      configFor({ id: 'with-tail', operation: 'insert-tail', maintainTail: true })
    );
    const withoutTailEvidence = withoutTail.steps.at(-1)?.complexityEvidence;
    const withTailEvidence = withTail.steps.at(-1)?.complexityEvidence;

    expect(withoutTailEvidence?.timeComplexity).toBe('O(n)');
    expect(withTailEvidence?.timeComplexity).toBe('O(1)');
    expect(withoutTail.steps.length).toBeGreaterThan(withTail.steps.length);
    expect(withoutTailEvidence?.cumulativeOperationCount).toBeGreaterThan(
      withTailEvidence?.cumulativeOperationCount ?? 0
    );
    expect(withTail.sourceByLanguage.cpp.map((line) => line.text)).not.toEqual(
      withoutTail.sourceByLanguage.cpp.map((line) => line.text)
    );
  });
});
