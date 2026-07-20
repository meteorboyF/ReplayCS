import type { ComplexityFamilyDefinition, OperationDefinition } from './types';
import { COMPLEXITY_MODEL_VERSION } from './types';

export const COMPLEXITY_FAMILIES: readonly ComplexityFamilyDefinition[] = [
  {
    id: 'constant',
    notation: 'O(1)',
    complexityClass: 'O(1)',
    title: 'Constant work',
    formula: 'c',
    summary: 'The counted operation does not grow with the input size.',
    scenarios: ['Array index access', 'Stack peek', 'Linked-list insertion at head'],
    assumptions: [
      'The target position or pointer is already known.',
      'This describes operation count, not wall-clock time.'
    ],
    derivation: [
      'Count the fixed reads or pointer writes.',
      'The count remains bounded as n grows.',
      'Drop the constant coefficient.'
    ],
    defaultInput: { n: 16 },
    chartable: true
  },
  {
    id: 'logarithmic',
    notation: 'O(log n)',
    complexityClass: 'O(log n)',
    title: 'Halving work',
    formula: 'ceil(log2 n)',
    summary: 'Each operation discards a constant fraction of the remaining input.',
    scenarios: ['Binary search', 'Balanced BST search', 'Heap-height operation'],
    assumptions: [
      'Binary search input is sorted.',
      'Tree height remains logarithmic when balance is maintained.'
    ],
    derivation: [
      'After k halvings, n / 2^k <= 1.',
      'Therefore 2^k >= n.',
      'Solve for k: k >= log2 n.'
    ],
    defaultInput: { n: 16 },
    chartable: true
  },
  {
    id: 'square-root',
    notation: 'O(sqrt n)',
    complexityClass: 'O(sqrt n)',
    title: 'Square-root boundary',
    formula: 'ceil(sqrt n)',
    summary: 'Work stops once a paired factor would repeat.',
    scenarios: ['Trial-division primality checking'],
    assumptions: ['Testing divisors only through sqrt(n) is sufficient for primality.'],
    derivation: [
      'A composite n has factors a * b = n.',
      'At least one factor is no larger than sqrt(n).',
      'Test only that bounded prefix.'
    ],
    defaultInput: { n: 49 },
    chartable: true
  },
  {
    id: 'linear',
    notation: 'O(n)',
    complexityClass: 'O(n)',
    title: 'One pass',
    formula: 'n',
    summary: 'Each input item may be visited once.',
    scenarios: ['Linear search', 'Array traversal', 'Linked-list search'],
    assumptions: ['The worst case reaches every item.', 'Per-item work is bounded.'],
    derivation: [
      'Count at most one visit per item.',
      'n items produce n bounded visits.',
      'The dominant term is n.'
    ],
    defaultInput: { n: 16 },
    chartable: true
  },
  {
    id: 'linearithmic',
    notation: 'O(n log n)',
    complexityClass: 'O(n log n)',
    title: 'Logarithmic levels, linear work each',
    formula: 'ceil(n * log2 n)',
    summary: 'Divide-and-conquer creates logarithmic levels with linear total work per level.',
    scenarios: ['Merge sort', 'Heap sort', 'Balanced divide and conquer'],
    assumptions: [
      'Subproblems remain balanced.',
      'Each level processes all n items in bounded work.'
    ],
    derivation: [
      'Halving creates log2(n) levels.',
      'All nodes at one level process n items total.',
      'Multiply n by the number of levels.'
    ],
    defaultInput: { n: 16 },
    chartable: true
  },
  {
    id: 'quadratic',
    notation: 'O(n^2)',
    complexityClass: 'O(n^2)',
    title: 'All pairs',
    formula: 'n * n',
    summary: 'For each input item, work may scan a linear-sized set.',
    scenarios: ['Bubble sort worst case', 'Selection-sort comparisons', 'All-pairs comparison'],
    assumptions: [
      'Both loop bounds grow with the same n.',
      'Early exit does not shorten the selected case.'
    ],
    derivation: [
      'The outer loop runs n times.',
      'The inner work is proportional to n.',
      'Nested work multiplies to n^2.'
    ],
    defaultInput: { n: 12 },
    chartable: true
  },
  {
    id: 'cubic',
    notation: 'O(n^3)',
    complexityClass: 'O(n^3)',
    title: 'Three-dimensional work',
    formula: 'n * n * n',
    summary: 'Three input-dependent nested dimensions multiply.',
    scenarios: ['Naive square-matrix multiplication', 'Triple nested loop'],
    assumptions: ['All three dimensions use n.', 'The innermost work is bounded.'],
    derivation: [
      'Each loop contributes a factor of n.',
      'Nested loops multiply their counts.',
      'n * n * n = n^3.'
    ],
    defaultInput: { n: 8 },
    chartable: true
  },
  {
    id: 'exponential',
    notation: 'O(2^n)',
    complexityClass: 'O(2^n)',
    title: 'Binary branching',
    formula: '2^n',
    summary: 'Each decision can create two recursive branches.',
    scenarios: ['Subset generation', 'Naive recursive Fibonacci', 'Include/exclude recursion'],
    assumptions: [
      'Both branches continue through depth n.',
      'Repeated subproblems are not memoized.'
    ],
    derivation: [
      'Level 0 has one call.',
      'Each level can double the calls.',
      'Depth n therefore has about 2^n nodes.'
    ],
    defaultInput: { n: 12 },
    chartable: true
  },
  {
    id: 'factorial',
    notation: 'O(n!)',
    complexityClass: 'O(n!)',
    title: 'Every ordering',
    formula: 'n!',
    summary: 'The algorithm explores every permutation of n choices.',
    scenarios: ['Permutation generation', 'Brute-force route ordering'],
    assumptions: [
      'Equivalent orderings are not pruned.',
      'Every complete permutation is produced or checked.'
    ],
    derivation: [
      'There are n choices first.',
      'Then n-1, n-2, and so on.',
      'Multiply the choices: n!.'
    ],
    defaultInput: { n: 10 },
    chartable: true
  },
  {
    id: 'additive-inputs',
    notation: 'O(n + m)',
    complexityClass: 'O(n + m)',
    title: 'Two consecutive inputs',
    formula: 'n + m',
    summary: 'Independent passes add instead of multiply.',
    scenarios: ['Scan two collections', 'Expected hash-join build plus probe'],
    assumptions: [
      'The passes are consecutive.',
      'Hash operations are expected constant time for the join model.'
    ],
    derivation: [
      'Count n visits in the first pass.',
      'Count m visits in the second.',
      'Consecutive work adds to n + m.'
    ],
    defaultInput: { n: 12, m: 8 },
    chartable: false
  },
  {
    id: 'multiplicative-inputs',
    notation: 'O(nm)',
    complexityClass: 'O(nm)',
    title: 'Cross-product work',
    formula: 'n * m',
    summary: 'Each item from one input is paired with every item from another.',
    scenarios: ['Nested-loop join', 'Compare every row in two relations'],
    assumptions: ['There is no index or early termination.', 'The two input sizes may differ.'],
    derivation: [
      'The outer input contributes n iterations.',
      'Each scans m inner items.',
      'Nested work multiplies to nm.'
    ],
    defaultInput: { n: 12, m: 8 },
    chartable: false
  },
  {
    id: 'vertices-edges',
    notation: 'O(V + E)',
    complexityClass: 'O(V + E)',
    title: 'Graph traversal',
    formula: 'V + E',
    summary: 'Adjacency-list traversal processes vertices and their stored edges.',
    scenarios: ['BFS with an adjacency list', 'DFS with an adjacency list'],
    assumptions: [
      'The graph uses adjacency lists.',
      'Each vertex and stored edge is processed a bounded number of times.'
    ],
    derivation: [
      'Visit each of V vertices.',
      'Inspect the adjacency entries totaling E (or 2E undirected).',
      'Drop the constant and add V + E.'
    ],
    defaultInput: { n: 8, vertices: 8, edges: 12 },
    chartable: false
  },
  {
    id: 'heap-graph',
    notation: 'O((V + E) log V)',
    complexityClass: 'O((V + E) log V)',
    title: 'Graph work with a heap',
    formula: '(V + E) * log2 V',
    summary: 'Vertex and edge events can trigger logarithmic priority-queue work.',
    scenarios: ['Dijkstra with adjacency lists and a binary heap'],
    assumptions: [
      'Non-negative edge weights.',
      'A binary heap implements the priority queue.',
      'The graph uses adjacency lists.'
    ],
    derivation: [
      'Process V vertex removals and up to E relaxations.',
      'Heap updates cost O(log V).',
      'Multiply the event bound by the heap cost.'
    ],
    defaultInput: { n: 8, vertices: 8, edges: 12 },
    chartable: false
  },
  {
    id: 'output-sensitive',
    notation: 'O(log n + k)',
    complexityClass: 'O(log n + k)',
    title: 'Lookup plus output',
    formula: 'log2 n + k',
    summary: 'Finding the range and returning its results both count.',
    scenarios: ['B-tree indexed range query'],
    assumptions: [
      'The index remains balanced.',
      'k is the number of returned records.',
      'Storage and cache effects are abstracted.'
    ],
    derivation: [
      'Navigate the balanced index in logarithmic height.',
      'Emit k matching results.',
      'Add lookup and output costs.'
    ],
    defaultInput: { n: 1024, outputSize: 12 },
    chartable: false
  },
  {
    id: 'amortized-constant',
    notation: 'Amortized O(1)',
    complexityClass: 'O(1)',
    title: 'Occasional expensive resize',
    formula: '(total cost across appends) / append count',
    summary: 'Rare O(n) resize events spread across many constant writes.',
    scenarios: ['Dynamic-array append with geometric capacity growth'],
    assumptions: [
      'Capacity grows geometrically, commonly by doubling.',
      'The claim covers a sequence, not one resize event.'
    ],
    derivation: [
      'Most appends write one item.',
      'Resize copies form a geometric series: 1 + 2 + 4 + ... < 2n.',
      'Total work is O(n), so average per append is O(1).'
    ],
    defaultInput: { n: 16 },
    chartable: false
  }
];

export const DYNAMIC_ARRAY_APPEND_OPERATION: OperationDefinition = {
  version: COMPLEXITY_MODEL_VERSION,
  id: 'dynamic-array-append',
  topicId: 'arrays',
  name: 'Dynamic-array append',
  description:
    'Compare a spare-capacity write, a resize event, and the aggregate cost of many appends.',
  variants: [
    'Geometric growth with spare capacity',
    'Geometric growth that resizes',
    'Geometric growth across a sequence'
  ],
  supportedLanguages: ['c', 'cpp', 'java', 'python'],
  cases: [
    {
      id: 'append-spare-capacity',
      operationId: 'dynamic-array-append',
      title: 'Spare capacity',
      caseType: 'best',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      exactCountFormula: '1 element write',
      assumptions: [
        'The backing allocation has an unused slot.',
        'Capacity bookkeeping is constant time.'
      ],
      scenarioDescription: 'Write the new value into the next unused slot and increment size.',
      inputPreset: { size: 3, capacity: 4, values: [4, 8, 15] },
      implementationVariant: 'Geometric growth with spare capacity',
      traceLessonId: 'dynamic-array-append',
      derivationSteps: [
        'No allocation occurs.',
        'No existing element is copied.',
        'One bounded write does not grow with n.'
      ],
      misconceptionTags: ['amortized-vs-worst']
    },
    {
      id: 'append-resize',
      operationId: 'dynamic-array-append',
      title: 'Capacity exhausted',
      caseType: 'worst',
      timeComplexity: 'O(n)',
      auxiliarySpace: 'O(n)',
      exactCountFormula: 'n copies + 1 append',
      assumptions: [
        'The backing allocation is full.',
        'Elements are copied into a larger allocation.'
      ],
      scenarioDescription:
        'Allocate more capacity, copy every existing element, then write the appended value.',
      inputPreset: { size: 4, capacity: 4, values: [4, 8, 15, 16] },
      implementationVariant: 'Geometric growth that resizes',
      traceLessonId: 'dynamic-array-append',
      derivationSteps: [
        'Allocate a larger backing store.',
        'Copy n existing elements.',
        'Add one final write; n + 1 simplifies to O(n).'
      ],
      misconceptionTags: ['amortized-vs-worst', 'time-vs-space']
    },
    {
      id: 'append-amortized',
      operationId: 'dynamic-array-append',
      title: 'Sequence of appends',
      caseType: 'amortized',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(n)',
      exactCountFormula: 'fewer than 3n aggregate writes/copies for doubling growth',
      assumptions: [
        'Capacity doubles when full.',
        'Cost is averaged across a sequence of n appends.'
      ],
      scenarioDescription:
        'Expensive resize copies are rare and are spread across the cheap appends between them.',
      inputPreset: { appends: 16, initialCapacity: 1, growthFactor: 2 },
      implementationVariant: 'Geometric growth across a sequence',
      traceLessonId: 'dynamic-array-append',
      derivationSteps: [
        'Copy costs are 1 + 2 + 4 + ... below n.',
        'That geometric sum is less than 2n.',
        'Add n direct writes and divide O(n) total work by n appends.'
      ],
      misconceptionTags: ['amortized-vs-worst']
    }
  ]
};

export const BINARY_SEARCH_COMPLEXITY_OPERATION: OperationDefinition = {
  version: COMPLEXITY_MODEL_VERSION,
  id: 'binary-search-operation',
  topicId: 'searching',
  name: 'Binary search',
  description:
    'Count midpoint comparisons while a sorted random-access range is repeatedly halved.',
  variants: ['Iterative binary search', 'Recursive binary search'],
  supportedLanguages: ['c', 'cpp', 'java', 'python'],
  cases: [
    {
      id: 'binary-search-best',
      operationId: 'binary-search-operation',
      title: 'Target at the first midpoint',
      caseType: 'best',
      timeComplexity: 'O(1)',
      auxiliarySpace: 'O(1)',
      exactCountFormula: '1 midpoint comparison',
      assumptions: ['Input is sorted.', 'Indexed access is constant time.'],
      scenarioDescription: 'The first midpoint already contains the target.',
      inputPreset: { values: [2, 5, 8, 12, 16, 23, 38], target: 12 },
      implementationVariant: 'Iterative binary search',
      traceLessonId: 'binary-search',
      derivationSteps: [
        'Calculate the first midpoint.',
        'One comparison finds the target.',
        'The counted work is independent of n for this case.'
      ],
      misconceptionTags: ['best-vs-worst', 'logarithm-from-halving']
    },
    {
      id: 'binary-search-average',
      operationId: 'binary-search-operation',
      title: 'Typical target position',
      caseType: 'average',
      timeComplexity: 'O(log n)',
      auxiliarySpace: 'O(1)',
      exactCountFormula: 'position-dependent; bounded by ceil(log2(n + 1)) comparisons',
      assumptions: [
        'Input is sorted and supports constant-time indexed access.',
        'Target positions are distributed across the searchable range.',
        'The iterative implementation is selected.'
      ],
      scenarioDescription: 'Several halvings locate a target that is not the first midpoint.',
      inputPreset: { values: [2, 5, 8, 12, 16, 23, 38, 56], target: 23 },
      implementationVariant: 'Iterative binary search',
      traceLessonId: 'binary-search',
      derivationSteps: [
        'Each failed comparison retains at most half the candidates.',
        'After k steps, at most n / 2^k candidates remain.',
        'Solving n / 2^k <= 1 gives k in O(log n).'
      ],
      misconceptionTags: ['average-case-assumption', 'logarithm-from-halving']
    },
    {
      id: 'binary-search-worst',
      operationId: 'binary-search-operation',
      title: 'Last possible decision or missing target',
      caseType: 'worst',
      timeComplexity: 'O(log n)',
      auxiliarySpace: 'O(1)',
      exactCountFormula: 'at most ceil(log2(n + 1)) midpoint comparisons',
      assumptions: [
        'Input is sorted.',
        'Indexed access is constant time.',
        'The implementation is iterative.'
      ],
      scenarioDescription:
        'The search halves until one candidate remains or the range becomes empty.',
      inputPreset: { values: [1, 3, 5, 7, 9, 11, 13, 15], target: 14 },
      implementationVariant: 'Iterative binary search',
      traceLessonId: 'binary-search',
      derivationSteps: [
        'Start with n candidates.',
        'Each midpoint comparison halves the remaining range.',
        'Only logarithmically many halvings can occur before the range is empty.'
      ],
      misconceptionTags: ['best-vs-worst', 'logarithm-from-halving']
    },
    {
      id: 'binary-search-recursive-space',
      operationId: 'binary-search-operation',
      title: 'Recursive call stack',
      caseType: 'worst',
      timeComplexity: 'O(log n)',
      auxiliarySpace: 'O(log n)',
      exactCountFormula: 'one stack frame per halving level',
      assumptions: [
        'The recursive implementation is selected.',
        'Tail-call elimination is not assumed.'
      ],
      scenarioDescription:
        'The same halving work retains one call frame for each unresolved range.',
      inputPreset: { size: 16, target: -1 },
      implementationVariant: 'Recursive binary search',
      traceLessonId: 'binary-search',
      derivationSteps: [
        'Recursive depth matches the number of halvings.',
        'That depth is O(log n).',
        'Each unresolved call retains a bounded stack frame.'
      ],
      misconceptionTags: ['time-vs-space', 'logarithm-from-halving']
    }
  ]
};
