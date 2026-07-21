import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HASH_TABLE_CONFIG,
  HASH_TABLE_OPERATIONS,
  TOMBSTONE,
  createHashTableLesson,
  hashOf,
  type HashTableConfig,
  type HashTableOperation,
  type HashTableStrategy
} from './hashTable';

interface OperationVariant {
  id: string;
  operation: HashTableOperation;
  strategy: HashTableStrategy;
}

const operationVariants: OperationVariant[] = HASH_TABLE_OPERATIONS.flatMap(
  (operation): OperationVariant[] => [
    { id: `${operation.id}-chaining`, operation: operation.id, strategy: 'chaining' },
    { id: `${operation.id}-linear-probing`, operation: operation.id, strategy: 'linear-probing' }
  ]
);

function configFor(variant: OperationVariant): HashTableConfig {
  return {
    ...DEFAULT_HASH_TABLE_CONFIG,
    operation: variant.operation,
    strategy: variant.strategy,
    keys: [12, 5, 21, 30],
    key: 12, // stored, so search/delete traverse to a real hit
    bucketCount: 7
  };
}

describe('hash-table operation execution coverage', () => {
  it('builds all four operations under both strategies deterministically', () => {
    expect(operationVariants).toHaveLength(8);

    for (const variant of operationVariants) {
      const input = configFor(variant);
      const lesson = createHashTableLesson(input);
      const repeated = createHashTableLesson(input);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, variant.id).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), variant.id).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, variant.id).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, variant.id).toBeGreaterThan(
        0
      );

      const predictionStep = lesson.steps.find((step) => step.prediction);
      expect(predictionStep, `${variant.id}:has-prediction`).toBeDefined();
      expect(predictionStep?.metadata?.mistake, `${variant.id}:has-mistake`).toBeDefined();
      expect(
        lesson.steps.at(-1)?.complexityEvidence?.assumptions.length,
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

  it('separates expected O(1) from collision-heavy O(n) lookups', () => {
    // Uniform: keys spread across buckets mod 7.
    const uniform = createHashTableLesson({
      operation: 'search',
      strategy: 'chaining',
      keys: [1, 2, 3, 4],
      key: 4,
      bucketCount: 7
    });
    // Degenerate: all keys ≡ 0 mod 7 collide into bucket 0.
    const heavy = createHashTableLesson({
      operation: 'search',
      strategy: 'chaining',
      keys: [7, 14, 21, 28],
      key: 28,
      bucketCount: 7
    });
    expect(uniform.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(1)');
    expect(uniform.steps.at(-1)?.complexityEvidence?.selectedCase).toBe('expected');
    expect(heavy.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(heavy.steps.at(-1)?.complexityEvidence?.selectedCase).toBe('worst');
    expect(heavy.steps.length).toBeGreaterThan(uniform.steps.length);
  });

  it('leaves a tombstone on probing delete and keeps later keys findable', () => {
    // 7 and 14 collide at bucket 0; 14 probes to slot 1.
    const deletion = createHashTableLesson({
      operation: 'delete',
      strategy: 'linear-probing',
      keys: [7, 14],
      key: 7,
      bucketCount: 7
    });
    const finalSlots = deletion.steps.at(-1)?.stateAfter.slots as (number | null)[];
    expect(finalSlots[0]).toBe(TOMBSTONE);
    expect(finalSlots[1]).toBe(14);

    // Searching 14 afterwards must skip the tombstone and still find it.
    const search = createHashTableLesson({
      operation: 'search',
      strategy: 'linear-probing',
      keys: [7, 14],
      key: 14,
      bucketCount: 7
    });
    expect(search.steps.at(-1)?.stateAfter.result).toBe(true);
  });

  it('rehashes every stored key on resize and purges tombstones', () => {
    const lesson = createHashTableLesson({
      operation: 'resize',
      strategy: 'chaining',
      keys: [12, 5, 21, 30],
      bucketCount: 4
    });
    const finalState = lesson.steps.at(-1)?.stateAfter;
    expect(finalState?.bucketCount).toBe(8);
    const buckets = finalState?.buckets as number[][];
    const stored = buckets.flat().sort((a, b) => a - b);
    expect(stored).toEqual([5, 12, 21, 30]);
    for (const key of stored) {
      expect(buckets[hashOf(key, 8)]).toContain(key);
    }
    expect(lesson.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(lesson.steps.at(-1)?.complexityEvidence?.auxiliarySpace).toBe('O(n)');
  });

  it('computes bucket selection with the teaching hash', () => {
    expect(hashOf(19, 7)).toBe(5);
    expect(hashOf(21, 7)).toBe(0);
    const lesson = createHashTableLesson({
      operation: 'insert',
      strategy: 'chaining',
      keys: [3],
      key: 19,
      bucketCount: 7
    });
    expect(lesson.steps[0].deterministicExplanation).toContain('19 mod 7 = 5');
  });

  it('rejects invalid configurations deterministically', () => {
    expect(() =>
      createHashTableLesson({ operation: 'insert', strategy: 'chaining', keys: [1, 1], key: 2 })
    ).toThrow(/distinct/);
    expect(() =>
      createHashTableLesson({
        operation: 'insert',
        strategy: 'linear-probing',
        keys: [1, 2, 3, 4],
        key: 9,
        bucketCount: 4
      })
    ).toThrow(/fewer keys than buckets/);
    expect(() =>
      createHashTableLesson({
        operation: 'insert',
        strategy: 'chaining',
        keys: [1],
        key: 2,
        bucketCount: 40
      })
    ).toThrow(/between 2 and/);
  });
});
