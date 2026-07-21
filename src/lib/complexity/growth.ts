import type { ComplexityClass, ComplexityEvaluation, ComplexityInput, GrowthPoint } from './types';

export const GROWTH_DISPLAY_CAP = 1_000_000_000;

export const CHARTABLE_COMPLEXITIES: readonly ComplexityClass[] = [
  'O(1)',
  'O(log n)',
  'O(sqrt n)',
  'O(n)',
  'O(n log n)',
  'O(n^2)',
  'O(n^3)',
  'O(2^n)',
  'O(n!)'
];

function boundedInteger(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value as number));
}

function cap(value: number): ComplexityEvaluation {
  if (!Number.isFinite(value) || value >= GROWTH_DISPLAY_CAP) {
    return { value: GROWTH_DISPLAY_CAP, capped: true, display: `>= ${GROWTH_DISPLAY_CAP}` };
  }
  const rounded = Math.max(0, Math.ceil(value));
  return { value: rounded, capped: false, display: rounded.toLocaleString('en-US') };
}

function cappedProduct(...factors: number[]) {
  let product = 1;
  for (const factor of factors) {
    if (factor <= 0) return 0;
    if (product >= GROWTH_DISPLAY_CAP / factor) return GROWTH_DISPLAY_CAP;
    product *= factor;
  }
  return product;
}

function cappedPower(base: number, exponent: number) {
  let value = 1;
  for (let index = 0; index < exponent; index++) {
    if (value >= GROWTH_DISPLAY_CAP / base) return GROWTH_DISPLAY_CAP;
    value *= base;
  }
  return value;
}

function cappedFactorial(n: number) {
  let value = 1;
  for (let factor = 2; factor <= n; factor++) {
    if (value >= GROWTH_DISPLAY_CAP / factor) return GROWTH_DISPLAY_CAP;
    value *= factor;
  }
  return value;
}

export function evaluateComplexity(
  complexityClass: ComplexityClass,
  input: ComplexityInput
): ComplexityEvaluation {
  const n = boundedInteger(input.n, 1);
  const m = boundedInteger(input.m, n);
  const vertices = boundedInteger(input.vertices, n);
  const edges = boundedInteger(input.edges, m);
  const outputSize = boundedInteger(input.outputSize, 1);
  const logN = Math.log2(Math.max(2, n));
  const logV = Math.log2(Math.max(2, vertices));

  switch (complexityClass) {
    case 'O(1)':
      return cap(1);
    case 'O(log n)':
      return cap(logN);
    case 'O(sqrt n)':
      return cap(Math.sqrt(n));
    case 'O(n)':
      return cap(n);
    case 'O(n log n)':
      return cap(cappedProduct(n, logN));
    case 'O(n^2)':
      return cap(cappedProduct(n, n));
    case 'O(n^3)':
      return cap(cappedProduct(n, n, n));
    case 'O(2^n)':
      return cap(cappedPower(2, n));
    case 'O(n!)':
      return cap(cappedFactorial(n));
    case 'O(n + m)':
      return cap(n + m);
    case 'O(nm)':
      return cap(cappedProduct(n, m));
    case 'O(V + E)':
      return cap(vertices + edges);
    case 'O((V + E) log V)':
      return cap(cappedProduct(vertices + edges, logV));
    case 'O(log n + k)':
      return cap(logN + outputSize);
    case 'O(n + k)':
      return cap(n + outputSize);
    case 'O(d(n + k))':
      return cap(cappedProduct(3, n + outputSize)); // Approximate d as 3
    case 'custom':
      return { value: 0, capped: false, display: 'scenario-defined' };
  }
}

export function buildGrowthSeries(
  complexityClass: ComplexityClass,
  maxInputSize: number
): GrowthPoint[] {
  const boundedMax = Math.min(50, boundedInteger(maxInputSize, 1));
  return Array.from({ length: boundedMax }, (_, index) => {
    const inputSize = index + 1;
    return { inputSize, ...evaluateComplexity(complexityClass, { n: inputSize }) };
  });
}

export function chartValue(evaluation: ComplexityEvaluation, scale: 'linear' | 'logarithmic') {
  return scale === 'linear' ? evaluation.value : Math.log10(evaluation.value + 1);
}
