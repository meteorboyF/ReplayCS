import type { ComplexityClass, WorkCounts } from '$lib/complexity/types';
import type {
  SourceLine,
  SupportedLanguage,
  TraceLesson,
  TraceStep,
  TraceValue
} from '$lib/trace/types';

export type RecursionScenario =
  'linear' | 'tail' | 'halving' | 'binary' | 'divide-conquer' | 'iterative';

export const RECURSION_SCENARIOS: readonly {
  id: RecursionScenario;
  label: string;
  description: string;
  recurrence: string;
}[] = [
  {
    id: 'linear',
    label: 'Linear recursion',
    description: 'One call reduces n by one, then unwinds.',
    recurrence: 'T(n) = T(n - 1) + O(1)'
  },
  {
    id: 'tail',
    label: 'Tail recursion',
    description: 'The recursive call is the final operation.',
    recurrence: 'T(n) = T(n - 1) + O(1)'
  },
  {
    id: 'halving',
    label: 'Halving recursion',
    description: 'Each call divides the remaining input by two.',
    recurrence: 'T(n) = T(n / 2) + O(1)'
  },
  {
    id: 'binary',
    label: 'Binary recursion',
    description: 'Each non-base call creates two n − 1 subproblems.',
    recurrence: 'T(n) = 2T(n - 1) + O(1)'
  },
  {
    id: 'divide-conquer',
    label: 'Divide-and-conquer',
    description: 'Two half-size calls plus linear combine work.',
    recurrence: 'T(n) = 2T(n / 2) + O(n)'
  },
  {
    id: 'iterative',
    label: 'Recursive vs iterative',
    description: 'An equivalent loop keeps one frame.',
    recurrence: 'T(n) = T(n - 1) + O(1)'
  }
] as const;

type Frame = {
  id: number;
  n: number;
  depth: number;
  branch: string;
  status: string;
  returnValue: number | null;
};
type Event = {
  kind: 'call' | 'base' | 'return' | 'work';
  frame: Frame;
  value?: number;
  work?: number;
};

const languageSyntax: Record<SupportedLanguage, Record<RecursionScenario, string[]>> = {
  c: {
    linear: [
      'int sum(int n) {',
      '  if (n <= 1) return n;',
      '  int child = sum(n - 1);',
      '  return n + child;',
      '}'
    ],
    tail: [
      'int sum_tail(int n, int acc) {',
      '  if (n == 0) return acc;',
      '  return sum_tail(n - 1, acc + n);',
      '',
      '}'
    ],
    halving: [
      'int halves(int n) {',
      '  if (n <= 1) return 1;',
      '  return 1 + halves(n / 2);',
      '',
      '}'
    ],
    binary: [
      'int calls(int n) {',
      '  if (n <= 1) return 1;',
      '  int left = calls(n - 1), right = calls(n - 1);',
      '  return 1 + left + right;',
      '}'
    ],
    'divide-conquer': [
      'void split(int n) {',
      '  if (n <= 1) return;',
      '  split(n / 2); split(n / 2);',
      '  combine(n);',
      '}'
    ],
    iterative: [
      'int sum_loop(int n) {',
      '  int result = 0;',
      '  for (int i = n; i > 0; i--)',
      '    result += i;',
      '  return result; }'
    ]
  },
  cpp: {
    linear: [
      'int sum(int n) {',
      '  if (n <= 1) return n;',
      '  int child = sum(n - 1);',
      '  return n + child;',
      '}'
    ],
    tail: [
      'int sum_tail(int n, int acc) {',
      '  if (n == 0) return acc;',
      '  return sum_tail(n - 1, acc + n);',
      '',
      '}'
    ],
    halving: [
      'int halves(int n) {',
      '  if (n <= 1) return 1;',
      '  return 1 + halves(n / 2);',
      '',
      '}'
    ],
    binary: [
      'int calls(int n) {',
      '  if (n <= 1) return 1;',
      '  auto left = calls(n - 1), right = calls(n - 1);',
      '  return 1 + left + right;',
      '}'
    ],
    'divide-conquer': [
      'void split(int n) {',
      '  if (n <= 1) return;',
      '  split(n / 2); split(n / 2);',
      '  combine(n);',
      '}'
    ],
    iterative: [
      'int sum_loop(int n) {',
      '  int result = 0;',
      '  for (int i = n; i > 0; --i)',
      '    result += i;',
      '  return result; }'
    ]
  },
  java: {
    linear: [
      'int sum(int n) {',
      '  if (n <= 1) return n;',
      '  int child = sum(n - 1);',
      '  return n + child;',
      '}'
    ],
    tail: [
      'int sumTail(int n, int acc) {',
      '  if (n == 0) return acc;',
      '  return sumTail(n - 1, acc + n);',
      '',
      '}'
    ],
    halving: [
      'int halves(int n) {',
      '  if (n <= 1) return 1;',
      '  return 1 + halves(n / 2);',
      '',
      '}'
    ],
    binary: [
      'int calls(int n) {',
      '  if (n <= 1) return 1;',
      '  int left = calls(n - 1), right = calls(n - 1);',
      '  return 1 + left + right;',
      '}'
    ],
    'divide-conquer': [
      'void split(int n) {',
      '  if (n <= 1) return;',
      '  split(n / 2); split(n / 2);',
      '  combine(n);',
      '}'
    ],
    iterative: [
      'int sumLoop(int n) {',
      '  int result = 0;',
      '  for (int i = n; i > 0; i--)',
      '    result += i;',
      '  return result; }'
    ]
  },
  python: {
    linear: [
      'def sum_n(n):',
      '    if n <= 1: return n',
      '    child = sum_n(n - 1)',
      '    return n + child',
      ''
    ],
    tail: [
      'def sum_tail(n, acc=0):',
      '    if n == 0: return acc',
      '    return sum_tail(n - 1, acc + n)',
      '',
      ''
    ],
    halving: ['def halves(n):', '    if n <= 1: return 1', '    return 1 + halves(n // 2)', '', ''],
    binary: [
      'def calls(n):',
      '    if n <= 1: return 1',
      '    left, right = calls(n - 1), calls(n - 1)',
      '    return 1 + left + right',
      ''
    ],
    'divide-conquer': [
      'def split(n):',
      '    if n <= 1: return',
      '    split(n // 2); split(n // 2)',
      '    combine(n)',
      ''
    ],
    iterative: [
      'def sum_loop(n):',
      '    result = 0',
      '    for i in range(n, 0, -1):',
      '        result += i',
      '    return result'
    ]
  }
};

const semantics = ['enter', 'base', 'recurse', 'return', 'finish'];
function lines(language: SupportedLanguage, scenario: RecursionScenario): SourceLine[] {
  return languageSyntax[language][scenario].map((text, index) => ({
    id: `${language}-${semantics[index]}`,
    number: index + 1,
    text,
    semanticOperationId: semantics[index]
  }));
}

function buildEvents(scenario: RecursionScenario, input: number): Event[] {
  const events: Event[] = [];
  let nextId = 0;
  const visit = (n: number, depth: number, branch: string): number => {
    const frame: Frame = { id: nextId++, n, depth, branch, status: 'active', returnValue: null };
    events.push({ kind: 'call', frame: { ...frame } });
    const base = scenario === 'tail' ? n === 0 : n <= 1;
    if (base) {
      const value = scenario === 'linear' || scenario === 'tail' ? n : 1;
      events.push({ kind: 'base', frame: { ...frame, status: 'base', returnValue: value }, value });
      events.push({
        kind: 'return',
        frame: { ...frame, status: 'returned', returnValue: value },
        value
      });
      return value;
    }
    if (scenario === 'binary' || scenario === 'divide-conquer') {
      const child = scenario === 'binary' ? n - 1 : Math.floor(n / 2);
      const left = visit(child, depth + 1, `${branch}L`);
      const right = visit(child, depth + 1, `${branch}R`);
      const local = scenario === 'divide-conquer' ? n : 1;
      events.push({ kind: 'work', frame: { ...frame, status: 'combining' }, work: local });
      const value = scenario === 'binary' ? 1 + left + right : left + right + local;
      events.push({
        kind: 'return',
        frame: { ...frame, status: 'returned', returnValue: value },
        value
      });
      return value;
    }
    const childN = scenario === 'halving' ? Math.floor(n / 2) : n - 1;
    const child = visit(childN, depth + 1, `${branch}C`);
    const value = scenario === 'halving' ? 1 + child : n + child;
    events.push({
      kind: 'return',
      frame: { ...frame, status: 'returned', returnValue: value },
      value
    });
    return value;
  };
  if (scenario === 'iterative') {
    const frame: Frame = {
      id: 0,
      n: input,
      depth: 1,
      branch: 'loop',
      status: 'active',
      returnValue: null
    };
    events.push({ kind: 'call', frame });
    let result = 0;
    for (let n = input; n > 0; n--) {
      result += n;
      events.push({
        kind: 'work',
        frame: { ...frame, n, status: 'iterating', returnValue: result },
        work: 1,
        value: result
      });
    }
    events.push({
      kind: 'return',
      frame: { ...frame, status: 'returned', returnValue: result },
      value: result
    });
  } else visit(input, 1, 'root');
  return events;
}

function addWork(total: WorkCounts, step: WorkCounts) {
  const next = { ...total };
  for (const [key, value] of Object.entries(step))
    next[key as keyof WorkCounts] = (next[key as keyof WorkCounts] ?? 0) + (value ?? 0);
  return next;
}

export function createRecursionLesson(
  scenario: RecursionScenario = 'linear',
  input = 5
): TraceLesson {
  const limit = scenario === 'binary' ? 5 : scenario === 'divide-conquer' ? 8 : 12;
  if (!Number.isInteger(input) || input < 1 || input > limit)
    throw new Error(`Use a whole number from 1 to ${limit} for this scenario.`);
  const metadata = RECURSION_SCENARIOS.find((item) => item.id === scenario)!;
  const events = buildEvents(scenario, input);
  const levelWidths: Record<number, number> = {};
  for (const event of events.filter((event) => event.kind === 'call'))
    levelWidths[event.frame.depth] = (levelWidths[event.frame.depth] ?? 0) + 1;
  const maxDepth = Math.max(...Object.keys(levelWidths).map(Number));
  const calls = events.filter((event) => event.kind === 'call').length;
  const repeated = scenario === 'binary' ? Math.max(0, calls - input) : 0;
  const time: ComplexityClass =
    scenario === 'halving'
      ? 'O(log n)'
      : scenario === 'binary'
        ? 'O(2^n)'
        : scenario === 'divide-conquer'
          ? 'O(n log n)'
          : 'O(n)';
  const space = scenario === 'halving' ? 'O(log n)' : scenario === 'iterative' ? 'O(1)' : 'O(n)';
  const steps: TraceStep[] = [];
  const stack: Frame[] = [];
  let executedCalls = 0;
  let peakDepth = 0;
  let completed = 0;
  let totalWork = 0;
  let result: number | null = null;
  let cumulative: WorkCounts = {};
  const snapshot = (event: Event): Record<string, TraceValue> => ({
    frames: stack.map((frame) => ({ ...frame })),
    currentFrame: event.frame.id,
    phase: event.kind,
    calls: executedCalls,
    totalCalls: calls,
    completed,
    maxDepth: peakDepth,
    repeatedSubproblems: repeated,
    levelWidths,
    returnValue: result,
    recurrence: metadata.recurrence,
    totalWork,
    input
  });
  for (const event of events) {
    const before = snapshot(event);
    if (event.kind === 'call') {
      stack.push({ ...event.frame });
      executedCalls++;
      peakDepth = Math.max(peakDepth, stack.length);
    }
    if (event.kind === 'return') {
      result = event.value ?? null;
      completed++;
      stack.pop();
    }
    const localWork = event.kind === 'work' ? (event.work ?? 1) : 1;
    totalWork += localWork;
    const work: WorkCounts =
      event.kind === 'call'
        ? { call: 1, comparison: 1 }
        : event.kind === 'return'
          ? { return: 1 }
          : { 'loop-iteration': localWork };
    cumulative = addWork(cumulative, work);
    const after = snapshot(event);
    const semantic =
      event.kind === 'call'
        ? 'enter'
        : event.kind === 'base'
          ? 'base'
          : event.kind === 'return'
            ? 'return'
            : 'recurse';
    steps.push({
      id: `recursion-${scenario}-${steps.length}`,
      index: steps.length,
      title:
        event.kind === 'call'
          ? `Call with n = ${event.frame.n}`
          : event.kind === 'return'
            ? `Return ${event.value}`
            : event.kind === 'base'
              ? 'Base case reached'
              : `Do ${localWork} local work`,
      eventType: event.kind,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      stateBefore: before,
      stateAfter: after,
      entities: stack.map((frame) => ({
        id: `frame-${frame.id}`,
        type: 'stack-frame',
        label: `n=${frame.n}`,
        metadata: { depth: frame.depth, status: frame.status }
      })),
      mutations: [],
      deterministicExplanation:
        event.kind === 'call'
          ? `Push a frame at depth ${event.frame.depth}; the base-case test runs before any child call.`
          : event.kind === 'return'
            ? `Frame n=${event.frame.n} returns ${event.value} and unwinds.`
            : event.kind === 'base'
              ? 'The base case creates no recursive child.'
              : `${localWork} combine/loop work is charged at this level.`,
      visualFocus: [`frame-${event.frame.id}`],
      complexityEvidence: {
        caseId: `${scenario}-execution`,
        selectedCase: 'worst',
        implementationVariant: scenario,
        inputSize: { n: input },
        exactOperationCount: Object.values(work).reduce((sum, value) => sum + (value ?? 0), 0),
        cumulativeOperationCount: totalWork,
        stepWork: work,
        cumulativeWork: cumulative,
        timeComplexity: time,
        auxiliarySpace: space,
        space: {
          auxiliary: { current: stack.length, peak: maxDepth, unit: 'stack frames' },
          output: { current: result === null ? 0 : 1, peak: 1, unit: 'return values' },
          callStackDepth: stack.length
        },
        assumptions: [
          'Each call, return, base test, and displayed local-work unit is counted.',
          `Input is capped at ${limit} to keep the execution tree readable.`
        ],
        derivation: [
          `The execution creates ${calls} calls across ${Object.keys(levelWidths).length} levels.`,
          `Maximum live stack depth is ${maxDepth}; widest level has ${Math.max(...Object.values(levelWidths))} calls.`,
          `${metadata.recurrence} resolves to ${time} time for this scenario.`
        ]
      }
    });
  }
  return {
    id: 'recursion-lab',
    subject: 'dsa-1',
    topic: 'recursion',
    title: `Recursion Lab · ${metadata.label}`,
    description:
      'Watch calls, base cases, returns, unwinding, level width, and stack space emerge from execution.',
    difficulty:
      scenario === 'binary' || scenario === 'divide-conquer' ? 'intermediate' : 'beginner',
    learningObjectives: [
      'Connect call-stack events to a recurrence.',
      'Separate total call work from auxiliary stack depth.'
    ],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: Object.fromEntries(
      (['c', 'cpp', 'java', 'python'] as SupportedLanguage[]).map((language) => [
        language,
        lines(language, scenario)
      ])
    ) as Record<SupportedLanguage, SourceLine[]>,
    initialState: steps[0].stateBefore,
    steps,
    completionCriteria: { requiredCorrectPredictions: 0, masteryThreshold: 1 }
  };
}
