import { describe, expect, it } from 'vitest';
import {
  BINARY_SEARCH_COMPLEXITY_OPERATION,
  COMPLEXITY_FAMILIES,
  DYNAMIC_ARRAY_APPEND_OPERATION
} from './catalog';
import {
  buildGrowthSeries,
  CHARTABLE_COMPLEXITIES,
  evaluateComplexity,
  GROWTH_DISPLAY_CAP
} from './growth';
import { validateComplexityFamilies, validateOperationDefinition } from './validate';

describe('complexity growth evaluator', () => {
  it.each([
    ['O(1)', 16, 1],
    ['O(log n)', 16, 4],
    ['O(sqrt n)', 16, 4],
    ['O(n)', 16, 16],
    ['O(n log n)', 16, 64],
    ['O(n^2)', 16, 256],
    ['O(n^3)', 8, 512],
    ['O(2^n)', 10, 1024],
    ['O(n!)', 5, 120]
  ] as const)('evaluates %s at n=%i', (complexityClass, n, expected) => {
    expect(evaluateComplexity(complexityClass, { n })).toMatchObject({
      value: expected,
      capped: false
    });
  });

  it('distinguishes additive, multiplicative, graph, heap, and output-sensitive variables', () => {
    expect(evaluateComplexity('O(n + m)', { n: 5, m: 7 }).value).toBe(12);
    expect(evaluateComplexity('O(nm)', { n: 5, m: 7 }).value).toBe(35);
    expect(evaluateComplexity('O(V + E)', { n: 1, vertices: 5, edges: 7 }).value).toBe(12);
    expect(evaluateComplexity('O((V + E) log V)', { n: 1, vertices: 8, edges: 12 }).value).toBe(60);
    expect(evaluateComplexity('O(log n + k)', { n: 16, outputSize: 3 }).value).toBe(7);
  });

  it('caps explosive families without overflowing or freezing', () => {
    expect(evaluateComplexity('O(2^n)', { n: 50 })).toEqual({
      value: GROWTH_DISPLAY_CAP,
      capped: true,
      display: `>= ${GROWTH_DISPLAY_CAP}`
    });
    expect(evaluateComplexity('O(n!)', { n: 50 }).capped).toBe(true);
  });

  it('builds bounded serializable series', () => {
    const series = buildGrowthSeries('O(n^2)', 500);
    expect(series).toHaveLength(50);
    expect(series[49]).toMatchObject({ inputSize: 50, value: 2500 });
    expect(() => JSON.stringify(series)).not.toThrow();
  });
});

describe('complexity catalog', () => {
  it('covers every required family and every chart toggle', () => {
    const ids = new Set(COMPLEXITY_FAMILIES.map((family) => family.id));
    expect(ids).toEqual(
      new Set([
        'constant',
        'logarithmic',
        'square-root',
        'linear',
        'linearithmic',
        'quadratic',
        'cubic',
        'exponential',
        'factorial',
        'additive-inputs',
        'multiplicative-inputs',
        'vertices-edges',
        'heap-graph',
        'output-sensitive',
        'amortized-constant'
      ])
    );
    expect(
      COMPLEXITY_FAMILIES.filter((family) => family.chartable).map(
        (family) => family.complexityClass
      )
    ).toEqual(CHARTABLE_COMPLEXITIES);
  });

  it('states scenarios, assumptions, and derivations for every family', () => {
    for (const family of COMPLEXITY_FAMILIES) {
      expect(family.scenarios.length).toBeGreaterThan(0);
      expect(family.assumptions.length).toBeGreaterThan(0);
      expect(family.derivation.length).toBeGreaterThan(1);
    }
  });

  it('passes the reusable definition validators', () => {
    expect(validateComplexityFamilies(COMPLEXITY_FAMILIES)).toEqual([]);
    expect(validateOperationDefinition(DYNAMIC_ARRAY_APPEND_OPERATION)).toEqual([]);
    expect(validateOperationDefinition(BINARY_SEARCH_COMPLEXITY_OPERATION)).toEqual([]);
  });

  it('models worst-case resize separately from amortized append', () => {
    const resize = DYNAMIC_ARRAY_APPEND_OPERATION.cases.find(
      (candidate) => candidate.id === 'append-resize'
    );
    const amortized = DYNAMIC_ARRAY_APPEND_OPERATION.cases.find(
      (candidate) => candidate.id === 'append-amortized'
    );
    expect(resize).toMatchObject({ caseType: 'worst', timeComplexity: 'O(n)' });
    expect(amortized).toMatchObject({ caseType: 'amortized', timeComplexity: 'O(1)' });
    expect(() => JSON.stringify(DYNAMIC_ARRAY_APPEND_OPERATION)).not.toThrow();
  });

  it('distinguishes binary-search cases and implementation space', () => {
    expect(
      BINARY_SEARCH_COMPLEXITY_OPERATION.cases.find(
        (candidate) => candidate.id === 'binary-search-best'
      )
    ).toMatchObject({ caseType: 'best', timeComplexity: 'O(1)' });
    expect(
      BINARY_SEARCH_COMPLEXITY_OPERATION.cases.find(
        (candidate) => candidate.id === 'binary-search-worst'
      )
    ).toMatchObject({ caseType: 'worst', timeComplexity: 'O(log n)', auxiliarySpace: 'O(1)' });
    expect(
      BINARY_SEARCH_COMPLEXITY_OPERATION.cases.find(
        (candidate) => candidate.id === 'binary-search-recursive-space'
      )
    ).toMatchObject({ timeComplexity: 'O(log n)', auxiliarySpace: 'O(log n)' });
  });
});
