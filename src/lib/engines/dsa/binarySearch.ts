import type {
  SourceLine,
  SupportedLanguage,
  TraceLesson,
  TraceStep,
  TraceValue
} from '$lib/trace/types';

const source: Record<SupportedLanguage, string[]> = {
  c: [
    'int left = 0, right = n - 1;',
    'while (left <= right) {',
    '  int mid = left + (right - left) / 2;',
    '  if (a[mid] == target) return mid;',
    '  if (a[mid] < target) left = mid + 1;',
    '  else right = mid - 1;',
    '}',
    'return -1;'
  ],
  cpp: [
    'int left = 0, right = values.size() - 1;',
    'while (left <= right) {',
    '  int mid = left + (right - left) / 2;',
    '  if (values[mid] == target) return mid;',
    '  if (values[mid] < target) left = mid + 1;',
    '  else right = mid - 1;',
    '}',
    'return -1;'
  ],
  java: [
    'int left = 0, right = values.length - 1;',
    'while (left <= right) {',
    '  int mid = left + (right - left) / 2;',
    '  if (values[mid] == target) return mid;',
    '  if (values[mid] < target) left = mid + 1;',
    '  else right = mid - 1;',
    '}',
    'return -1;'
  ],
  python: [
    'left, right = 0, len(values) - 1',
    'while left <= right:',
    '    mid = left + (right - left) // 2',
    '    if values[mid] == target: return mid',
    '    if values[mid] < target: left = mid + 1',
    '    else: right = mid - 1',
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
export function createBinarySearchLesson(
  values = [2, 5, 8, 12, 16, 23, 38, 56],
  target = 23
): TraceLesson {
  const sorted = [...values].sort((a, b) => a - b);
  let left = 0,
    right = sorted.length - 1,
    mid: number | null = null,
    result: number | null = null,
    comparisons = 0;
  const steps: TraceStep[] = [];
  const add = (
    semantic: string,
    title: string,
    before: Record<string, TraceValue>,
    after: Record<string, TraceValue>,
    explanation: string,
    prediction?: TraceStep['prediction']
  ) =>
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
      complexityCost: { comparisons }
    });
  let before = snapshot(sorted, target, left, right, mid, result, comparisons);
  add(
    'initialize-range',
    'Set the search range',
    before,
    before,
    'Start with every array cell eligible.'
  );
  while (left <= right) {
    before = snapshot(sorted, target, left, right, mid, result, comparisons);
    add(
      'check-range',
      'Check the range',
      before,
      before,
      `${left} ≤ ${right}, so another candidate remains.`
    );
    const nextMid = left + Math.floor((right - left) / 2);
    const afterMid = snapshot(sorted, target, left, right, nextMid, result, comparisons);
    add('calculate-middle', 'Calculate mid', before, afterMid, `The midpoint is ${nextMid}.`, {
      id: `mid-${steps.length}`,
      prompt: 'Which index becomes mid?',
      type: 'numeric',
      correctAnswer: nextMid,
      explanation: `left + floor((right-left)/2) = ${nextMid}.`,
      xpReward: 10
    });
    mid = nextMid;
    before = afterMid;
    comparisons++;
    const compared = snapshot(sorted, target, left, right, mid, result, comparisons);
    add(
      'compare-target',
      `Compare ${sorted[mid]} with ${target}`,
      before,
      compared,
      `${sorted[mid]} ${sorted[mid] === target ? 'equals' : sorted[mid] < target ? 'is smaller than' : 'is larger than'} ${target}.`
    );
    if (sorted[mid] === target) {
      result = mid;
      add(
        'compare-target',
        'Target found',
        compared,
        snapshot(sorted, target, left, right, mid, result, comparisons),
        `Index ${mid} contains the target. Binary search stops.`
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
        `Indices ${old} through ${mid} cannot contain ${target}.`
      );
    } else {
      const old = right;
      right = mid - 1;
      add(
        'discard-right',
        'Discard the right half',
        compared,
        snapshot(sorted, target, left, right, mid, result, comparisons),
        `Indices ${mid} through ${old} cannot contain ${target}.`
      );
    }
  }
  if (result === null) {
    const b = snapshot(sorted, target, left, right, mid, result, comparisons);
    add(
      'not-found',
      'Target not found',
      b,
      { ...b, result: -1 },
      'The search range is empty, so return −1.'
    );
  }
  return {
    id: 'binary-search',
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
