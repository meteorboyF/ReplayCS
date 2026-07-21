export const COMPLEXITY_MODEL_VERSION = 1 as const;

export type ComplexityClass =
  | 'O(1)'
  | 'O(log n)'
  | 'O(sqrt n)'
  | 'O(n)'
  | 'O(n log n)'
  | 'O(n^2)'
  | 'O(n^3)'
  | 'O(2^n)'
  | 'O(n!)'
  | 'O(n + m)'
  | 'O(nm)'
  | 'O(n + k)'
  | 'O(d(n + k))'
  | 'O(V + E)'
  | 'O((V + E) log V)'
  | 'O(log n + k)'
  | 'custom';

export type ComplexityCaseType = 'best' | 'average' | 'worst' | 'amortized' | 'expected';

export type WorkMetric =
  | 'comparison'
  | 'read'
  | 'write'
  | 'swap'
  | 'loop-iteration'
  | 'node-inspection'
  | 'pointer-read'
  | 'pointer-write'
  | 'allocation'
  | 'deallocation'
  | 'call'
  | 'return'
  | 'stack-operation'
  | 'queue-operation'
  | 'edge-inspection'
  | 'row-inspection'
  | 'dispatch';

export type WorkCounts = Partial<Record<WorkMetric, number>>;

export interface ComplexityInput {
  n: number;
  m?: number;
  vertices?: number;
  edges?: number;
  outputSize?: number;
}

export interface OperationComplexityCase {
  id: string;
  operationId: string;
  title: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  customTimeComplexity?: string;
  auxiliarySpace: string;
  exactCountFormula?: string;
  assumptions: string[];
  scenarioDescription: string;
  inputPreset: Record<string, string | number | boolean | number[] | string[]>;
  implementationVariant: string;
  traceLessonId: string;
  derivationSteps: string[];
  misconceptionTags: string[];
}

export interface OperationDefinition {
  version: typeof COMPLEXITY_MODEL_VERSION;
  id: string;
  topicId: string;
  name: string;
  description: string;
  variants: string[];
  cases: OperationComplexityCase[];
  supportedLanguages?: Array<'c' | 'cpp' | 'java' | 'python'>;
}

export interface ComplexityEvidence {
  caseId: string;
  selectedCase: ComplexityCaseType;
  implementationVariant: string;
  inputSize: ComplexityInput;
  exactOperationCount: number;
  cumulativeOperationCount: number;
  stepWork: WorkCounts;
  cumulativeWork: WorkCounts;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  space: {
    auxiliary: { current: number; peak: number; unit: string };
    output: { current: number; peak: number; unit: string };
    callStackDepth?: number;
  };
  assumptions: string[];
  derivation: string[];
}

export interface ComplexityFamilyDefinition {
  id: string;
  notation: string;
  complexityClass: ComplexityClass;
  title: string;
  formula: string;
  summary: string;
  scenarios: string[];
  assumptions: string[];
  derivation: string[];
  defaultInput: ComplexityInput;
  chartable: boolean;
}

export interface ComplexityEvaluation {
  value: number;
  capped: boolean;
  display: string;
}

export interface GrowthPoint extends ComplexityEvaluation {
  inputSize: number;
}
