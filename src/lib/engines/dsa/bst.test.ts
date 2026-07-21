import { describe, expect, it } from 'vitest';
import {
  BST_OPERATIONS,
  DEFAULT_BST_CONFIG,
  createBstLesson,
  treeHeight,
  treeWidth,
  type BstConfig,
  type BstOperation
} from './bst';

const operations: BstOperation[] = BST_OPERATIONS.map((operation) => operation.id);

function configFor(operation: BstOperation): BstConfig {
  return { ...DEFAULT_BST_CONFIG, operation, values: [50, 30, 70, 20, 40, 60, 80], key: 40 };
}

describe('bst operation execution coverage', () => {
  it('builds all eight operations deterministically with predictions and evidence', () => {
    expect(operations).toHaveLength(8);

    for (const operation of operations) {
      const input = configFor(operation);
      const lesson = createBstLesson(input);
      const repeated = createBstLesson(input);
      const finalStep = lesson.steps.at(-1);

      expect(lesson.steps.length, operation).toBeGreaterThan(0);
      expect(JSON.stringify(repeated), operation).toBe(JSON.stringify(lesson));
      expect(lesson.supportedLanguages, operation).toEqual(['c', 'cpp', 'java', 'python']);
      expect(finalStep?.complexityEvidence?.cumulativeOperationCount, operation).toBeGreaterThan(0);

      const predictionStep = lesson.steps.find((step) => step.prediction);
      expect(predictionStep, `${operation}:has-prediction`).toBeDefined();
      expect(predictionStep?.metadata?.mistake, `${operation}:has-mistake`).toBeDefined();
      expect(
        finalStep?.complexityEvidence?.assumptions.length,
        `${operation}:assumptions`
      ).toBeGreaterThan(0);

      for (const language of lesson.supportedLanguages) {
        const source = lesson.sourceByLanguage[language];
        expect(source.length, `${operation}:${language}`).toBeGreaterThan(0);
        expect(
          source.some((line) =>
            lesson.steps.some((step) => step.semanticOperationId === line.semanticOperationId)
          ),
          `${operation}:${language}`
        ).toBe(true);
      }

      lesson.steps.forEach((step, index) => {
        expect(step.index, `${operation}:step-${index}`).toBe(index);
        expect(step.complexityEvidence, `${operation}:step-${index}`).toBeDefined();
        expect(() => JSON.stringify(step), `${operation}:step-${index}`).not.toThrow();
      });
    }
  });

  it('classifies balanced search as O(log n) and skewed search as O(n)', () => {
    const balanced = createBstLesson({
      operation: 'search',
      values: [50, 30, 70, 20, 40, 60, 80],
      key: 60
    });
    const skewed = createBstLesson({
      operation: 'search',
      values: [10, 20, 30, 40, 50, 60, 70],
      key: 70
    });
    expect(treeHeight([50, 30, 70, 20, 40, 60, 80])).toBe(2);
    expect(treeHeight([10, 20, 30, 40, 50, 60, 70])).toBe(6);
    expect(balanced.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(log n)');
    expect(skewed.steps.at(-1)?.complexityEvidence?.timeComplexity).toBe('O(n)');
    expect(skewed.steps.length).toBeGreaterThan(balanced.steps.length);
  });

  it('produces sorted output for inorder and root-first for preorder', () => {
    const inorder = createBstLesson({ operation: 'inorder', values: [50, 30, 70, 20, 40, 60, 80] });
    const preorder = createBstLesson({
      operation: 'preorder',
      values: [50, 30, 70, 20, 40, 60, 80]
    });
    expect(inorder.steps.at(-1)?.stateBefore.result).toEqual([20, 30, 40, 50, 60, 70, 80]);
    const preorderResult = preorder.steps
      .map((step) => step.stateAfter.result)
      .filter((result): result is number[] => Array.isArray(result))
      .at(-1);
    expect(preorderResult?.[0]).toBe(50);
  });

  it('deletes a two-child node by promoting its in-order successor', () => {
    const lesson = createBstLesson({
      operation: 'delete',
      values: [50, 30, 70, 20, 40, 60, 80],
      key: 30
    });
    const finalNodes = lesson.steps.at(-1)?.stateAfter.nodes as Array<{
      value: number;
      status: string;
    }>;
    const live = finalNodes
      .filter((node) => node.status !== 'deleted')
      .map((node) => node.value)
      .sort((a, b) => a - b);
    // 30 replaced by successor 40; 40's original node removed.
    expect(live).toEqual([20, 40, 50, 60, 70, 80]);
  });

  it('uses O(w) queue space for level-order and O(h) stack space for height', () => {
    const bfs = createBstLesson({ operation: 'levelorder', values: [50, 30, 70, 20, 40, 60, 80] });
    const height = createBstLesson({ operation: 'height', values: [50, 30, 70, 20, 40, 60, 80] });
    expect(bfs.steps.at(-1)?.complexityEvidence?.auxiliarySpace).toBe('O(w)');
    expect(height.steps.at(-1)?.complexityEvidence?.auxiliarySpace).toBe('O(h)');
    expect(treeWidth([50, 30, 70, 20, 40, 60, 80])).toBe(4);
    expect(height.steps.at(-1)?.stateAfter.result).toBe(2);
  });

  it('rejects invalid configurations deterministically', () => {
    expect(() => createBstLesson({ operation: 'insert', values: [1, 1], key: 2 })).toThrow(
      /distinct/
    );
    expect(() => createBstLesson({ operation: 'insert', values: [], key: 2 })).toThrow(
      /1–10 values/
    );
  });
});
