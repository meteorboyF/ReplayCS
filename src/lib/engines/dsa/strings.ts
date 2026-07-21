import type { ComplexityCaseType, ComplexityClass, WorkCounts } from '$lib/complexity/types';
import type {
  SourceLine,
  SupportedLanguage,
  TraceLesson,
  TraceStep,
  TraceValue
} from '$lib/trace/types';

export type StringOperation =
  | 'access'
  | 'traverse'
  | 'compare'
  | 'search'
  | 'concatenate'
  | 'substring'
  | 'reverse'
  | 'immutable-build'
  | 'builder-build';

export interface StringConfig {
  operation: StringOperation;
  source: string;
  secondary?: string;
  index?: number;
}

export const STRING_OPERATIONS: readonly {
  id: StringOperation;
  label: string;
  description: string;
}[] = [
  { id: 'access', label: 'Character access', description: 'Read one character by index.' },
  { id: 'traverse', label: 'Traversal', description: 'Visit every character from left to right.' },
  { id: 'compare', label: 'Compare', description: 'Compare two strings until they differ or end.' },
  { id: 'search', label: 'Search', description: 'Scan for the first matching character.' },
  {
    id: 'concatenate',
    label: 'Concatenate',
    description: 'Allocate and copy two strings into one result.'
  },
  { id: 'substring', label: 'Substring', description: 'Copy a bounded slice into a new string.' },
  { id: 'reverse', label: 'Reverse', description: 'Copy characters in reverse order.' },
  {
    id: 'immutable-build',
    label: 'Repeated immutable concatenation',
    description: 'Reallocate and recopy the growing prefix.'
  },
  {
    id: 'builder-build',
    label: 'Builder construction',
    description: 'Append into reusable capacity, growing only when full.'
  }
] as const;

export const DEFAULT_STRING_CONFIG: StringConfig = {
  operation: 'search',
  source: 'REPLAY',
  secondary: 'A',
  index: 2
};

const semantics = ['setup', 'inspect', 'allocate', 'copy', 'finish'];
const templates: Record<SupportedLanguage, Record<StringOperation, string[]>> = {
  c: {
    access: ['int i = index;', 'char result = source[i];', '', '', 'return result;'],
    traverse: ['int i = 0;', "while (source[i] != '\\0') {", '', '  visit(source[i++]);', '}'],
    compare: [
      'int i = 0;',
      "while (a[i] == b[i] && a[i] != '\\0') i++;",
      '',
      '',
      'return a[i] - b[i];'
    ],
    search: [
      'int i = 0;',
      "while (source[i] != target && source[i] != '\\0') i++;",
      '',
      '',
      'return source[i] == target ? i : -1;'
    ],
    concatenate: [
      'size_t n = strlen(a), m = strlen(b);',
      '',
      'char *out = malloc(n + m + 1);',
      'copy_chars(out, a, b);',
      'return out;'
    ],
    substring: [
      'int end = min(start + count, n);',
      '',
      'char *out = malloc(end - start + 1);',
      'copy_range(out, source, start, end);',
      'return out;'
    ],
    reverse: [
      'int n = strlen(source);',
      '',
      'char *out = malloc(n + 1);',
      'for (int i = 0; i < n; i++) out[i] = source[n-1-i];',
      'return out;'
    ],
    'immutable-build': [
      'char *result = empty_string();',
      '',
      'result = realloc_and_copy(result);',
      'for each ch: result = concat(result, ch);',
      'return result;'
    ],
    'builder-build': [
      'Builder b = builder_new();',
      '',
      'if (b.size == b.capacity) builder_grow(&b);',
      'for each ch: builder_append(&b, ch);',
      'return builder_string(&b);'
    ]
  },
  cpp: {
    access: ['size_t i = index;', 'char result = source[i];', '', '', 'return result;'],
    traverse: ['size_t i = 0;', 'while (i < source.size()) {', '', '  visit(source[i++]);', '}'],
    compare: [
      'size_t i = 0;',
      'while (i < min(a.size(), b.size()) && a[i] == b[i]) i++;',
      '',
      '',
      'return compare_at(a, b, i);'
    ],
    search: [
      'size_t i = 0;',
      'while (i < source.size() && source[i] != target) i++;',
      '',
      '',
      'return i < source.size() ? i : -1;'
    ],
    concatenate: [
      'size_t n = a.size(), m = b.size();',
      '',
      "string out(n + m, ' ' );",
      'copy(a.begin(), a.end(), out.begin()); copy(b.begin(), b.end(), out.begin()+n);',
      'return out;'
    ],
    substring: [
      'size_t end = min(start + count, source.size());',
      '',
      "string out(end - start, ' ' );",
      'copy(source.begin()+start, source.begin()+end, out.begin());',
      'return out;'
    ],
    reverse: [
      'size_t n = source.size();',
      '',
      "string out(n, ' ' );",
      'for (size_t i = 0; i < n; i++) out[i] = source[n-1-i];',
      'return out;'
    ],
    'immutable-build': [
      'string result;',
      '',
      'string next = result + ch;',
      'for (char ch : source) result = result + ch;',
      'return result;'
    ],
    'builder-build': [
      'string result; result.reserve(source.size());',
      '',
      'if (result.size() == result.capacity()) result.reserve(result.size()*2);',
      'for (char ch : source) result.push_back(ch);',
      'return result;'
    ]
  },
  java: {
    access: ['int i = index;', 'char result = source.charAt(i);', '', '', 'return result;'],
    traverse: [
      'int i = 0;',
      'while (i < source.length()) {',
      '',
      '  visit(source.charAt(i++));',
      '}'
    ],
    compare: [
      'int i = 0;',
      'while (i < Math.min(a.length(), b.length()) && a.charAt(i) == b.charAt(i)) i++;',
      '',
      '',
      'return compareAt(a, b, i);'
    ],
    search: [
      'int i = 0;',
      'while (i < source.length() && source.charAt(i) != target) i++;',
      '',
      '',
      'return i < source.length() ? i : -1;'
    ],
    concatenate: [
      'int n = a.length(), m = b.length();',
      '',
      'char[] out = new char[n + m];',
      'copyCharacters(a, b, out);',
      'return new String(out);'
    ],
    substring: [
      'int end = Math.min(start + count, source.length());',
      '',
      'char[] out = new char[end - start];',
      'copyRange(source, start, end, out);',
      'return new String(out);'
    ],
    reverse: [
      'int n = source.length();',
      '',
      'char[] out = new char[n];',
      'for (int i = 0; i < n; i++) out[i] = source.charAt(n-1-i);',
      'return new String(out);'
    ],
    'immutable-build': [
      'String result = "";',
      '',
      'String next = result + ch;',
      'for (char ch : source.toCharArray()) result = result + ch;',
      'return result;'
    ],
    'builder-build': [
      'StringBuilder result = new StringBuilder();',
      '',
      'result.ensureCapacity(result.length() + 1);',
      'for (char ch : source.toCharArray()) result.append(ch);',
      'return result.toString();'
    ]
  },
  python: {
    access: ['i = index', 'result = source[i]', '', '', 'return result'],
    traverse: ['i = 0', 'while i < len(source):', '', '    visit(source[i]); i += 1', ''],
    compare: [
      'i = 0',
      'while i < min(len(a), len(b)) and a[i] == b[i]: i += 1',
      '',
      '',
      'return compare_at(a, b, i)'
    ],
    search: [
      'i = 0',
      'while i < len(source) and source[i] != target: i += 1',
      '',
      '',
      'return i if i < len(source) else -1'
    ],
    concatenate: [
      'n, m = len(a), len(b)',
      '',
      'out = [None] * (n + m)',
      'copy_characters(a, b, out)',
      'return "".join(out)'
    ],
    substring: [
      'end = min(start + count, len(source))',
      '',
      'out = [None] * (end - start)',
      'copy_range(source, start, end, out)',
      'return "".join(out)'
    ],
    reverse: [
      'n = len(source)',
      '',
      'out = [None] * n',
      'for i in range(n): out[i] = source[n - 1 - i]',
      'return "".join(out)'
    ],
    'immutable-build': [
      'result = ""',
      '',
      'next_result = result + ch',
      'for ch in source: result = result + ch',
      'return result'
    ],
    'builder-build': [
      'result = []',
      '',
      'if len(result) == capacity: grow()',
      'for ch in source: result.append(ch)',
      'return "".join(result)'
    ]
  }
};

function sourceLines(language: SupportedLanguage, operation: StringOperation): SourceLine[] {
  return templates[language][operation].map((text, index) => ({
    id: `${language}-${semantics[index]}`,
    number: index + 1,
    text,
    semanticOperationId: semantics[index]
  }));
}

function addWork(total: WorkCounts, step: WorkCounts) {
  const next = { ...total };
  for (const [key, count] of Object.entries(step)) {
    const metric = key as keyof WorkCounts;
    next[metric] = (next[metric] ?? 0) + (count ?? 0);
  }
  return next;
}

export function createStringLesson(config: StringConfig = DEFAULT_STRING_CONFIG): TraceLesson {
  const source = config.source;
  const secondary = config.secondary ?? '';
  const index = config.index ?? 0;
  if (source.length < 1 || source.length > 12 || secondary.length > 12)
    throw new Error('Use 1–12 source characters and at most 12 secondary characters.');
  if (config.operation === 'access' && (index < 0 || index >= source.length))
    throw new Error(`Index must be between 0 and ${source.length - 1}.`);
  if (config.operation === 'search' && secondary.length !== 1)
    throw new Error('Search needs exactly one target character.');
  if (config.operation === 'substring' && (index < 0 || index >= source.length))
    throw new Error(`Substring start must be between 0 and ${source.length - 1}.`);

  const steps: TraceStep[] = [];
  let cumulative: WorkCounts = {};
  let cumulativeCount = 0;
  let allocations = 0;
  let copies = 0;
  let capacity = config.operation === 'builder-build' ? 1 : 0;
  let result = '';
  let activeIndex: number | null = null;
  let compareIndex: number | null = null;
  let foundIndex = -1;

  const selectedCase: ComplexityCaseType =
    config.operation === 'search' && secondary === source[0]
      ? 'best'
      : config.operation === 'search'
        ? 'worst'
        : 'worst';
  const linear = ['traverse', 'concatenate', 'substring', 'reverse', 'builder-build'].includes(
    config.operation
  );
  const time: ComplexityClass =
    config.operation === 'access' || (config.operation === 'search' && selectedCase === 'best')
      ? 'O(1)'
      : config.operation === 'immutable-build'
        ? 'O(n^2)'
        : config.operation === 'concatenate'
          ? 'O(n + m)'
          : 'O(n)';
  const aux = ['concatenate', 'substring', 'reverse', 'immutable-build', 'builder-build'].includes(
    config.operation
  )
    ? 'O(n)'
    : 'O(1)';
  const derivation =
    config.operation === 'immutable-build'
      ? [
          'Prefix lengths copied are 1 + 2 + … + n.',
          'That arithmetic series grows as n(n + 1) / 2, so time is O(n²).'
        ]
      : config.operation === 'builder-build'
        ? [
            'Capacity grows geometrically.',
            'Each character moves only a constant amortized number of times, so total construction is O(n).'
          ]
        : config.operation === 'access'
          ? [
              'Under random-access string storage, the address is base + index.',
              'One indexed read is O(1).'
            ]
          : [
              'The trace processes at most n characters.',
              `A constant amount of work per character gives ${time}.`
            ];

  const state = (): Record<string, TraceValue> => ({
    source: [...source],
    secondary: [...secondary],
    activeIndex,
    compareIndex,
    result,
    allocations,
    copies,
    builderCapacity: capacity,
    foundIndex
  });
  const add = (
    semantic: string,
    title: string,
    explanation: string,
    work: WorkCounts,
    before = state()
  ) => {
    cumulative = addWork(cumulative, work);
    const exact = Object.values(work).reduce((sum, value) => sum + (value ?? 0), 0);
    cumulativeCount += exact;
    const after = state();
    steps.push({
      id: `strings-${config.operation}-${steps.length}`,
      index: steps.length,
      title,
      eventType: semantic,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      stateBefore: before,
      stateAfter: after,
      entities: [...source].map((value, cell) => ({
        id: `source-${cell}`,
        type: 'array-cell',
        label: String(cell),
        value,
        metadata: { active: cell === activeIndex }
      })),
      mutations: [],
      deterministicExplanation: explanation,
      visualFocus: activeIndex === null ? ['result'] : [`source-${activeIndex}`],
      complexityEvidence: {
        caseId: `${config.operation}-${selectedCase}`,
        selectedCase,
        implementationVariant: config.operation,
        inputSize: { n: source.length, m: secondary.length, outputSize: result.length },
        exactOperationCount: exact,
        cumulativeOperationCount: cumulativeCount,
        stepWork: work,
        cumulativeWork: cumulative,
        timeComplexity: time,
        auxiliarySpace: aux,
        space: {
          auxiliary: {
            current: aux === 'O(1)' ? 2 : Math.max(1, result.length),
            peak: aux === 'O(1)' ? 2 : Math.max(1, result.length),
            unit: aux === 'O(1)' ? 'scalar slots' : 'character slots'
          },
          output: { current: result.length, peak: result.length, unit: 'characters' },
          callStackDepth: 1
        },
        assumptions: [
          'Strings use indexed contiguous character storage.',
          'Character reads, writes, comparisons, and allocations are counted directly.',
          ...(linear ? ['n is the source string length.'] : [])
        ],
        derivation
      }
    });
  };

  add('setup', 'Prepare the operation', `The source contains ${source.length} characters.`, {
    read: 1
  });
  const inspect = (i: number, explanation: string, work: WorkCounts = { read: 1 }) => {
    const before = state();
    activeIndex = i;
    compareIndex = i;
    add('inspect', `Inspect index ${i}`, explanation, work, before);
  };
  const append = (character: string, i: number, allocate = false) => {
    const before = state();
    activeIndex = i;
    if (allocate) allocations++;
    result += character;
    copies++;
    add(
      allocate ? 'allocate' : 'copy',
      `Copy '${character}'`,
      `The intermediate result is now “${result}”.`,
      { read: 1, write: 1, ...(allocate ? { allocation: 1 } : {}) },
      before
    );
  };

  switch (config.operation) {
    case 'access':
      inspect(index, `Index ${index} maps directly to '${source[index]}'.`);
      result = source[index];
      break;
    case 'traverse':
      for (let i = 0; i < source.length; i++)
        inspect(i, `Visit '${source[i]}' once.`, { read: 1, 'loop-iteration': 1 });
      result = source;
      break;
    case 'compare': {
      const limit = Math.min(source.length, secondary.length);
      for (let i = 0; i < limit; i++) {
        inspect(i, `'${source[i]}' is compared with '${secondary[i]}'.`, {
          read: 2,
          comparison: 1
        });
        if (source[i] !== secondary[i]) break;
      }
      result =
        source === secondary
          ? 'equal'
          : source < secondary
            ? 'source < secondary'
            : 'source > secondary';
      break;
    }
    case 'search':
      for (let i = 0; i < source.length; i++) {
        inspect(i, `Compare '${source[i]}' with target '${secondary}'.`, {
          read: 1,
          comparison: 1
        });
        if (source[i] === secondary) {
          foundIndex = i;
          break;
        }
      }
      result = String(foundIndex);
      break;
    case 'concatenate':
      allocations++;
      add(
        'allocate',
        'Allocate the destination',
        `Reserve ${source.length + secondary.length} character slots.`,
        { allocation: 1, write: 1 }
      );
      for (let i = 0; i < source.length; i++) append(source[i], i);
      for (let i = 0; i < secondary.length; i++) append(secondary[i], i);
      break;
    case 'substring': {
      const end = Math.min(source.length, index + Math.max(1, Number(secondary) || 3));
      allocations++;
      add('allocate', 'Allocate the slice', `Reserve ${end - index} character slots.`, {
        allocation: 1
      });
      for (let i = index; i < end; i++) append(source[i], i);
      break;
    }
    case 'reverse':
      allocations++;
      add('allocate', 'Allocate the reversed result', `Reserve ${source.length} character slots.`, {
        allocation: 1
      });
      for (let i = source.length - 1; i >= 0; i--) append(source[i], i);
      break;
    case 'immutable-build':
      for (let i = 0; i < source.length; i++) {
        const prefix = result + source[i];
        const before = state();
        activeIndex = i;
        allocations++;
        copies += prefix.length;
        result = prefix;
        add(
          'allocate',
          `Allocate prefix ${i + 1}`,
          `A new immutable string copies ${prefix.length} characters; earlier prefixes cannot be reused.`,
          { allocation: 1, read: prefix.length, write: prefix.length },
          before
        );
      }
      break;
    case 'builder-build':
      for (let i = 0; i < source.length; i++) {
        const before = state();
        activeIndex = i;
        let grew = false;
        if (result.length === capacity) {
          capacity *= 2;
          allocations++;
          copies += result.length;
          grew = true;
        }
        result += source[i];
        copies++;
        add(
          grew ? 'allocate' : 'copy',
          grew ? `Grow capacity to ${capacity}` : `Append '${source[i]}'`,
          grew
            ? `The builder doubles capacity, copies the ${result.length - 1} existing characters, then appends '${source[i]}'.`
            : `Spare capacity accepts '${source[i]}' without reallocating.`,
          {
            ...(grew
              ? { allocation: 1, read: result.length - 1, write: result.length }
              : { write: 1 })
          },
          before
        );
      }
      break;
  }
  activeIndex = null;
  compareIndex = null;
  add(
    'finish',
    'Return the result',
    `The operation returns ${result === '' ? 'an empty string' : `“${result}”`}.`,
    { return: 1 }
  );

  return {
    id: 'strings-lab',
    subject: 'dsa-1',
    topic: 'strings',
    title: `Strings Lab · ${STRING_OPERATIONS.find((item) => item.id === config.operation)?.label}`,
    description: 'Trace indexed reads, comparisons, copies, allocations, and builder capacity.',
    difficulty: 'beginner',
    learningObjectives: [
      'Connect string operations to character-level work.',
      'Compare immutable concatenation with builder construction.'
    ],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: Object.fromEntries(
      (['c', 'cpp', 'java', 'python'] as SupportedLanguage[]).map((language) => [
        language,
        sourceLines(language, config.operation)
      ])
    ) as Record<SupportedLanguage, SourceLine[]>,
    initialState: steps[0].stateBefore,
    steps,
    completionCriteria: { requiredCorrectPredictions: 0, masteryThreshold: 1 }
  };
}
