import type {
  SourceLine,
  SupportedLanguage,
  TraceLesson,
  TraceStep,
  TraceValue
} from '$lib/trace/types';
import type {
  ComplexityCaseType,
  ComplexityClass,
  ComplexityEvidence,
  WorkCounts
} from '$lib/complexity/types';

export interface BinarySearchComplexityScenario {
  caseId: string;
  caseType: ComplexityCaseType;
  implementation: string;
  time: ComplexityClass;
  space: string;
  assumptions: readonly string[];
  derivation: readonly string[];
}

const TRACE_COUNTING_ASSUMPTIONS = [
  'The copied values are sorted during deterministic trace setup; that preparation is not charged to the binary-search steps.',
  'The displayed pseudocode is the cost model: each scalar or array read, assignment, comparison, and return is counted; arithmetic and trace bookkeeping are excluded.'
] as const;

const SUPPORTED_IMPLEMENTATION = 'Iterative binary search';
const SUPPORTED_AUXILIARY_SPACE = 'O(1)';

const source: Record<SupportedLanguage, string[]> = {
  c: [
    'int left = 0, right = n - 1;',
    'while (left <= right) {',
    '  int mid = left + (right - left) / 2;',
    '  if (a[mid] == target) return mid;',
    '  if (a[mid] < target) left = mid + 1;',
    '  if (a[mid] > target) right = mid - 1;',
    '}',
    'return -1;'
  ],
  cpp: [
    'int left = 0, right = values.size() - 1;',
    'while (left <= right) {',
    '  int mid = left + (right - left) / 2;',
    '  if (values[mid] == target) return mid;',
    '  if (values[mid] < target) left = mid + 1;',
    '  if (values[mid] > target) right = mid - 1;',
    '}',
    'return -1;'
  ],
  java: [
    'int left = 0, right = values.length - 1;',
    'while (left <= right) {',
    '  int mid = left + (right - left) / 2;',
    '  if (values[mid] == target) return mid;',
    '  if (values[mid] < target) left = mid + 1;',
    '  if (values[mid] > target) right = mid - 1;',
    '}',
    'return -1;'
  ],
  python: [
    'left, right = 0, len(values) - 1',
    'while left <= right:',
    '    mid = left + (right - left) // 2',
    '    if values[mid] == target: return mid',
    '    if values[mid] < target: left = mid + 1',
    '    if values[mid] > target: right = mid - 1',
    '',
    'return -1'
  ]
};
const semantics = [
  'initialize-range',
  'check-range',
  'calculate-middle',
  'compare-target',
  'discard-left',
  'discard-right',
  'end-loop',
  'not-found'
];
function lines(language: SupportedLanguage): SourceLine[] {
  return source[language].map((text, i) => ({
    id: `${language}-${semantics[i]}`,
    number: i + 1,
    text,
    semanticOperationId: semantics[i]
  }));
}
function snapshot(
  values: number[],
  target: number,
  left: number,
  right: number,
  mid: number | null,
  result: number | null,
  comparisons: number
): Record<string, TraceValue> {
  return { values, target, left, right, mid, result, comparisons };
}

function totalWork(work: WorkCounts): number {
  return Object.values(work).reduce((total, count) => total + (count ?? 0), 0);
}

function addWork(cumulative: WorkCounts, step: WorkCounts): WorkCounts {
  const next = { ...cumulative };
  for (const [metric, count] of Object.entries(step)) {
    const key = metric as keyof WorkCounts;
    next[key] = (next[key] ?? 0) + (count ?? 0);
  }
  return next;
}

export function createBinarySearchLesson(
  values = [2, 5, 8, 12, 16, 23, 38, 56],
  target = 23,
  scenario?: BinarySearchComplexityScenario
): TraceLesson {
  if (
    scenario &&
    (scenario.implementation !== SUPPORTED_IMPLEMENTATION ||
      scenario.space !== SUPPORTED_AUXILIARY_SPACE)
  ) {
    throw new Error(
      'The binary-search trace currently supports only iterative binary search with O(1) auxiliary space.'
    );
  }
  const sorted = [...values].sort((a, b) => a - b);
  let left = 0,
    right = sorted.length - 1,
    mid: number | null = null,
    result: number | null = null,
    comparisons = 0;
  const steps: TraceStep[] = [];
  let cumulativeOperationCount = 0;
  let cumulativeWork: WorkCounts = {};
  let peakAuxiliarySpace = 0;
  let peakOutputSpace = 0;
  const add = (
    semantic: string,
    title: string,
    before: Record<string, TraceValue>,
    after: Record<string, TraceValue>,
    explanation: string,
    stepWork: WorkCounts,
    prediction?: TraceStep['prediction']
  ) => {
    const exactOperationCount = totalWork(stepWork);
    cumulativeOperationCount += exactOperationCount;
    cumulativeWork = addWork(cumulativeWork, stepWork);

    const auxiliaryCurrent =
      semantic === 'initialize-range' || semantic === 'check-range' || semantic === 'not-found'
        ? 2
        : 3;
    const outputCurrent = after.result === null ? 0 : 1;
    peakAuxiliarySpace = Math.max(peakAuxiliarySpace, auxiliaryCurrent);
    peakOutputSpace = Math.max(peakOutputSpace, outputCurrent);

    const complexityEvidence: ComplexityEvidence | undefined = scenario
      ? {
          caseId: scenario.caseId,
          selectedCase: scenario.caseType,
          implementationVariant: scenario.implementation,
          inputSize: { n: sorted.length },
          exactOperationCount,
          cumulativeOperationCount,
          stepWork: { ...stepWork },
          cumulativeWork: { ...cumulativeWork },
          timeComplexity: scenario.time,
          auxiliarySpace: scenario.space,
          space: {
            auxiliary: {
              current: auxiliaryCurrent,
              peak: peakAuxiliarySpace,
              unit: 'scalar slots'
            },
            output: { current: outputCurrent, peak: peakOutputSpace, unit: 'returned indices' },
            callStackDepth: 1
          },
          assumptions: [...new Set([...scenario.assumptions, ...TRACE_COUNTING_ASSUMPTIONS])],
          derivation: [...scenario.derivation]
        }
      : undefined;

    steps.push({
      id: `binary-${steps.length}`,
      index: steps.length,
      title,
      eventType: semantic,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      stateBefore: before,
      stateAfter: after,
      entities: sorted.map((value, i) => ({
        id: `cell-${i}`,
        type: 'array-cell',
        label: String(i),
        value,
        metadata: { active: i === mid, inRange: i >= left && i <= right }
      })),
      mutations: Object.keys(after)
        .filter((k) => before[k] !== after[k])
        .map((k) => ({
          entityId: k,
          property: 'value',
          previousValue: before[k],
          nextValue: after[k],
          animation: 'highlight'
        })),
      deterministicExplanation: explanation,
      visualFocus: mid === null ? ['range'] : [`cell-${mid}`],
      prediction,
      complexityCost: { comparisons },
      ...(complexityEvidence ? { complexityEvidence } : {})
    });
  };
  let before = snapshot(sorted, target, left, right, mid, result, comparisons);
  add(
    'initialize-range',
    'Set the search range',
    before,
    before,
    'Start with every array cell eligible.',
    { read: 1, write: 2 }
  );
  while (left <= right) {
    before = snapshot(sorted, target, left, right, mid, result, comparisons);
    add(
      'check-range',
      'Check the range',
      before,
      before,
      `${left} ≤ ${right}, so another candidate remains.`,
      { read: 2, comparison: 1 }
    );
    const nextMid = left + Math.floor((right - left) / 2);
    const afterMid = snapshot(sorted, target, left, right, nextMid, result, comparisons);
    add(
      'calculate-middle',
      'Calculate mid',
      before,
      afterMid,
      `The midpoint is ${nextMid}.`,
      { read: 3, write: 1 },
      {
        id: `mid-${steps.length}`,
        prompt: 'Which index becomes mid?',
        type: 'numeric',
        correctAnswer: nextMid,
        explanation: `left + floor((right-left)/2) = ${nextMid}.`,
        xpReward: 10
      }
    );
    mid = nextMid;
    before = afterMid;
    comparisons++;
    const compared = snapshot(sorted, target, left, right, mid, result, comparisons);
    add(
      'compare-target',
      `Compare ${sorted[mid]} with ${target}`,
      before,
      compared,
      `${sorted[mid]} ${sorted[mid] === target ? 'equals' : sorted[mid] < target ? 'is smaller than' : 'is larger than'} ${target}.`,
      { read: 3, comparison: 1 }
    );
    if (sorted[mid] === target) {
      result = mid;
      add(
        'compare-target',
        'Target found',
        compared,
        snapshot(sorted, target, left, right, mid, result, comparisons),
        `Index ${mid} contains the target. Binary search stops.`,
        { read: 1, return: 1 }
      );
      break;
    }
    if (sorted[mid] < target) {
      const old = left;
      left = mid + 1;
      add(
        'discard-left',
        'Discard the left half',
        compared,
        snapshot(sorted, target, left, right, mid, result, comparisons),
        `Indices ${old} through ${mid} cannot contain ${target}.`,
        { read: 4, comparison: 1, write: 1 }
      );
    } else {
      const old = right;
      right = mid - 1;
      add(
        'discard-right',
        'Discard the right half',
        compared,
        snapshot(sorted, target, left, right, mid, result, comparisons),
        `Indices ${mid} through ${old} cannot contain ${target}.`,
        { read: 4, comparison: 1, write: 1 }
      );
    }
  }
  if (result === null) {
    const b = snapshot(sorted, target, left, right, mid, result, comparisons);
    add(
      'check-range',
      'Confirm the range is empty',
      b,
      b,
      `${left} > ${right}, so the loop condition is false.`,
      { read: 2, comparison: 1 }
    );
    add(
      'not-found',
      'Target not found',
      b,
      { ...b, result: -1 },
      'The search range is empty, so return −1.',
      { return: 1 }
    );
  }
  return {
    id: scenario ? scenario.caseId : 'binary-search',
    subject: 'dsa-1',
    topic: 'Searching',
    title: 'Binary Search',
    description: 'Predict how the search range shrinks, one line at a time.',
    difficulty: 'beginner',
    learningObjectives: [
      'Calculate the midpoint safely',
      'Explain why half the search space can be discarded'
    ],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: {
      c: lines('c'),
      cpp: lines('cpp'),
      java: lines('java'),
      python: lines('python')
    },
    initialState: snapshot(sorted, target, 0, sorted.length - 1, null, null, 0),
    steps,
    completionCriteria: { requiredCorrectPredictions: 1, masteryThreshold: 0.8 }
  };
}
