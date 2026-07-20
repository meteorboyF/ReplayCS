import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HASH_TABLE_CONFIG,
  HASH_TABLE_OPERATIONS,
  createHashTableLesson,
  type HashTableConfig,
  type HashTableOperation,
  type HashTableBacking,
  type HashFunctionType
} from './hashTable';

interface OperationVariant {
  id: string;
  operation: HashTableOperation;
  backing: HashTableBacking;
  hashType: HashFunctionType;
}

const backings: HashTableBacking[] = ['separate-chaining', 'linear-probing'];
const hashTypes: HashFunctionType[] = ['good', 'collision-heavy'];

const operationVariants: OperationVariant[] = HASH_TABLE_OPERATIONS.flatMap((operation) =>
  backings.flatMap((backing) =>
    hashTypes.map((hashType) => ({
      id: `${operation.id}-${backing}-${hashType}`,
      operation: operation.id,
      backing,
      hashType
    }))
  )
);

function configFor(variant: OperationVariant, overrides: Partial<HashTableConfig> = {}): HashTableConfig {
  return {
    ...DEFAULT_HASH_TABLE_CONFIG,
    operation: variant.operation,
    backing: variant.backing,
    hashType: variant.hashType,
    capacity: 4,
    initialEntries: [
      { key: 10, value: 100 },
      { key: 20, value: 200 }
    ],
    targetKey: 30,
    targetValue: 300,
    ...overrides
  };
}

describe('hash table operation execution coverage', () => {
  it('builds all operations, backings, and hash types deterministically', () => {
    // 3 operations * 2 backings * 2 hash types = 12 variants
    expect(operationVariants).toHaveLength(12);

    for (const variant of operationVariants) {
      const input = configFor(variant);
      const lesson = createHashTableLesson(input);
      const repeated = createHashTableLesson(input);
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

  it('triggers resize when load factor exceeds 0.75 on insert', () => {
    // capacity is 4. initialEntries size = 3 (0.75 load factor). Inserting one more will push it above 0.75.
    const resizeConfig = configFor(
      { id: 'insert-chaining-good', operation: 'insert', backing: 'separate-chaining', hashType: 'good' },
      {
        initialEntries: [
          { key: 1, value: 1 },
          { key: 2, value: 2 },
          { key: 3, value: 3 }
        ],
        targetKey: 4,
        targetValue: 4
      }
    );
    const lesson = createHashTableLesson(resizeConfig);
    const resizeSteps = lesson.steps.filter(s => s.semanticOperationId === 'resize');
    expect(resizeSteps.length).toBeGreaterThan(0);
    
    const finalState = lesson.steps.at(-1)?.stateAfter;
    expect(finalState?.capacity).toBe(8); // Capacity doubled from 4 to 8
  });

  it('shows O(n) worst case for collision-heavy hash functions vs O(1) average case', () => {
    const averageConfig = configFor({ id: 'search-chaining-good', operation: 'search', backing: 'separate-chaining', hashType: 'good' });
    const worstConfig = configFor({ id: 'search-chaining-worst', operation: 'search', backing: 'separate-chaining', hashType: 'collision-heavy' });

    const averageLesson = createHashTableLesson(averageConfig);
    const worstLesson = createHashTableLesson(worstConfig);

    const averageEvidence = averageLesson.steps.at(-1)?.complexityEvidence;
    const worstEvidence = worstLesson.steps.at(-1)?.complexityEvidence;

    expect(averageEvidence?.timeComplexity).toBe('O(1)');
    expect(worstEvidence?.timeComplexity).toBe('O(n)');
  });
});
