import type {
  ComplexityCaseType,
  ComplexityClass,
  ComplexityEvidence,
  WorkCounts
} from '$lib/complexity/types';
import type {
  PredictionChallenge,
  SourceLine,
  SupportedLanguage,
  TraceEntity,
  TraceLesson,
  TraceMutation,
  TraceStep,
  TraceValue
} from '$lib/trace/types';

export const BST_INPUT_MAX = 10;

export type BstOperation =
  'search' | 'insert' | 'delete' | 'inorder' | 'preorder' | 'postorder' | 'levelorder' | 'height';

export type BstOperationGroup = 'Lookup' | 'Modification' | 'Traversal' | 'Shape';

export interface BstComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface BstOperationMetadata {
  id: BstOperation;
  label: string;
  description: string;
  group: BstOperationGroup;
  requiresKey: boolean;
  cases: readonly BstComplexityCase[];
}

export interface BstConfig {
  operation: BstOperation;
  values: number[];
  key?: number;
}

export const DEFAULT_BST_CONFIG: BstConfig = {
  operation: 'insert',
  values: [50, 30, 70, 20, 40, 60, 80],
  key: 65
};

const distinctAssumption = 'Keys are distinct, so the BST ordering is unambiguous.';
const shapeAssumption = 'Complexity depends on the tree shape produced by the insertion order.';
const boundedPrimitiveAssumption =
  'Each displayed comparison, pointer move, visit, or push/pop is one counted primitive.';

const operation = (
  id: BstOperation,
  label: string,
  description: string,
  group: BstOperationGroup,
  flags: Partial<Pick<BstOperationMetadata, 'requiresKey'>>,
  cases: readonly BstComplexityCase[]
): BstOperationMetadata => ({ id, label, description, group, requiresKey: false, ...flags, cases });

const descentCases: readonly BstComplexityCase[] = [
  {
    id: 'balanced',
    label: 'Balanced tree',
    caseType: 'average',
    timeComplexity: 'O(log n)',
    auxiliarySpace: 'O(1)',
    implementationVariant: 'Iterative descent',
    assumptions: [distinctAssumption, shapeAssumption, 'Insertion order kept the tree bushy.'],
    description: 'Each comparison discards a subtree, descending one level of a log-depth tree.'
  },
  {
    id: 'degenerate',
    label: 'Degenerate (skewed) tree',
    caseType: 'worst',
    timeComplexity: 'O(n)',
    auxiliarySpace: 'O(1)',
    implementationVariant: 'Iterative descent',
    assumptions: [distinctAssumption, shapeAssumption, 'Sorted insertion order chained the nodes.'],
    description: 'A skewed BST is a linked list: the descent may touch every node.'
  }
];

const traversalCases = (order: string): readonly BstComplexityCase[] => [
  {
    id: 'traverse-all',
    label: 'Visit every node',
    caseType: 'worst',
    timeComplexity: 'O(n)',
    auxiliarySpace: 'O(h)',
    implementationVariant: `${order} depth-first traversal`,
    assumptions: [distinctAssumption, 'Recursion (or an explicit stack) holds at most one path.'],
    description: 'Every node is visited exactly once; the call stack holds one root-to-node path.'
  }
];

export const BST_OPERATIONS: readonly BstOperationMetadata[] = [
  operation(
    'search',
    'Search',
    'Descend left/right by comparison until the key or a null child.',
    'Lookup',
    { requiresKey: true },
    descentCases
  ),
  operation(
    'insert',
    'Insert',
    'Descend to the correct null child, then attach the new leaf.',
    'Modification',
    { requiresKey: true },
    descentCases
  ),
  operation(
    'delete',
    'Delete',
    'Find the node, then handle the leaf, one-child, or two-child (successor) case.',
    'Modification',
    { requiresKey: true },
    descentCases
  ),
  operation(
    'inorder',
    'Inorder traversal',
    'Left, node, right — visits BST keys in sorted order.',
    'Traversal',
    {},
    traversalCases('Inorder')
  ),
  operation(
    'preorder',
    'Preorder traversal',
    'Node, left, right — the order that rebuilds the tree.',
    'Traversal',
    {},
    traversalCases('Preorder')
  ),
  operation(
    'postorder',
    'Postorder traversal',
    'Left, right, node — the order that frees a tree safely.',
    'Traversal',
    {},
    traversalCases('Postorder')
  ),
  operation(
    'levelorder',
    'Level-order (BFS)',
    'Visit level by level using a queue instead of the call stack.',
    'Traversal',
    {},
    [
      {
        id: 'bfs-all',
        label: 'Visit every node',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(w)',
        implementationVariant: 'Queue-based breadth-first traversal',
        assumptions: [distinctAssumption, 'The queue holds at most one full level at a time.'],
        description: 'Every node is visited once; the queue peaks at the widest level w.'
      }
    ]
  ),
  operation(
    'height',
    'Height',
    'Recurse both subtrees and take 1 + max — the depth that decides every other bound.',
    'Shape',
    {},
    [
      {
        id: 'height-all',
        label: 'Measure every node',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(h)',
        implementationVariant: 'Recursive height',
        assumptions: [distinctAssumption, 'Every node contributes to at least one subtree height.'],
        description: 'Height must inspect all n nodes; the stack holds one path of length h.'
      }
    ]
  )
] as const;

export function getBstOperationMetadata(operationId: BstOperation): BstOperationMetadata {
  const metadata = BST_OPERATIONS.find((candidate) => candidate.id === operationId);
  if (!metadata) throw new Error(`Unknown BST operation: ${String(operationId)}`);
  return metadata;
}

interface BstNode {
  id: string;
  value: number;
  left: string | null;
  right: string | null;
  depth: number;
  inorder: number;
  status: 'live' | 'allocated' | 'visiting' | 'deleted' | 'detached';
}

interface RuntimeState {
  operation: BstOperation;
  nodes: BstNode[];
  root: string | null;
  current: string | null;
  parent: string | null;
  successor: string | null;
  newNode: string | null;
  visited: string[];
  queue: string[];
  result: TraceValue;
  height: number | null;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: BstOperation;
  values: number[];
  key: number;
}

interface SelectedCase extends BstComplexityCase {
  derivation: string[];
}

function cloneWork(work: WorkCounts): WorkCounts {
  return { ...work };
}

function addWork(cumulative: WorkCounts, step: WorkCounts): WorkCounts {
  const next = cloneWork(cumulative);
  for (const [metric, count] of Object.entries(step)) {
    const key = metric as keyof WorkCounts;
    next[key] = (next[key] ?? 0) + (count ?? 0);
  }
  return next;
}

function totalWork(work: WorkCounts): number {
  return Object.values(work).reduce((sum, count) => sum + (count ?? 0), 0);
}

function nodeById(nodes: BstNode[], id: string | null): BstNode | undefined {
  return id ? nodes.find((node) => node.id === id) : undefined;
}

function relayout(nodes: BstNode[], root: string | null): void {
  function setDepth(id: string | null, depth: number) {
    const node = nodeById(nodes, id);
    if (!node) return;
    node.depth = depth;
    setDepth(node.left, depth + 1);
    setDepth(node.right, depth + 1);
  }
  setDepth(root, 0);
  let position = 0;
  function inorderWalk(id: string | null) {
    const node = nodeById(nodes, id);
    if (!node) return;
    inorderWalk(node.left);
    node.inorder = position++;
    inorderWalk(node.right);
  }
  inorderWalk(root);
}

function buildTree(values: readonly number[]): { nodes: BstNode[]; root: string | null } {
  const nodes: BstNode[] = [];
  let root: string | null = null;
  for (const value of values) {
    const id = `T${nodes.length + 1}`;
    const node: BstNode = {
      id,
      value,
      left: null,
      right: null,
      depth: 0,
      inorder: 0,
      status: 'live'
    };
    nodes.push(node);
    if (root === null) {
      root = id;
      continue;
    }
    let cursor = nodeById(nodes, root)!;
    for (;;) {
      if (value < cursor.value) {
        if (cursor.left === null) {
          cursor.left = id;
          break;
        }
        cursor = nodeById(nodes, cursor.left)!;
      } else {
        if (cursor.right === null) {
          cursor.right = id;
          break;
        }
        cursor = nodeById(nodes, cursor.right)!;
      }
    }
  }
  relayout(nodes, root);
  return { nodes, root };
}

export function treeHeight(values: readonly number[]): number {
  const { nodes, root } = buildTree(values);
  function h(id: string | null): number {
    const node = nodeById(nodes, id);
    if (!node) return -1;
    return 1 + Math.max(h(node.left), h(node.right));
  }
  return h(root);
}

export function treeWidth(values: readonly number[]): number {
  const { nodes, root } = buildTree(values);
  const perLevel = new Map<number, number>();
  function walk(id: string | null, depth: number) {
    const node = nodeById(nodes, id);
    if (!node) return;
    perLevel.set(depth, (perLevel.get(depth) ?? 0) + 1);
    walk(node.left, depth + 1);
    walk(node.right, depth + 1);
  }
  walk(root, 0);
  return Math.max(1, ...perLevel.values());
}

function resolveConfig(input: BstConfig): ResolvedConfig {
  if (!BST_OPERATIONS.some((candidate) => candidate.id === input.operation)) {
    throw new Error(`Unsupported BST operation: ${String(input.operation)}`);
  }
  if (
    !Array.isArray(input.values) ||
    input.values.length < 1 ||
    input.values.length > BST_INPUT_MAX
  ) {
    throw new RangeError(`Use 1–${BST_INPUT_MAX} values so the tree stays visible.`);
  }
  if (input.values.some((value) => !Number.isSafeInteger(value))) {
    throw new TypeError('BST values must be safe integers.');
  }
  if (new Set(input.values).size !== input.values.length) {
    throw new RangeError('Keys must be distinct; a BST stores a set of keys.');
  }
  const key = input.key ?? input.values[0];
  if (!Number.isSafeInteger(key)) throw new TypeError('The key must be a safe integer.');
  return { operation: input.operation, values: [...input.values], key };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const { nodes, root } = buildTree(config.values);
  return {
    operation: config.operation,
    nodes,
    root,
    current: null,
    parent: null,
    successor: null,
    newNode: null,
    visited: [],
    queue: [],
    result: null,
    height: null,
    cumulativeWork: {},
    operationCount: 0
  };
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    key: config.key,
    values: [...config.values],
    nodes: state.nodes.map((node) => ({ ...node })) as unknown as TraceValue,
    root: state.root,
    current: state.current,
    parent: state.parent,
    successor: state.successor,
    newNode: state.newNode,
    visited: [...state.visited],
    queue: [...state.queue],
    result: state.result,
    height: state.height,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const entities: TraceEntity[] = state.nodes.map((node) => ({
    id: node.id,
    type: 'node',
    label: node.id,
    value: node.value,
    metadata: {
      left: node.left,
      right: node.right,
      depth: node.depth,
      status: node.status,
      isRoot: state.root === node.id,
      isCurrent: state.current === node.id,
      visited: state.visited.includes(node.id),
      inQueue: state.queue.includes(node.id)
    }
  }));
  entities.push(
    {
      id: 'operation-count',
      type: 'variable',
      label: 'exact operations',
      value: state.operationCount
    },
    { id: 'result', type: 'variable', label: 'result', value: state.result }
  );
  return entities;
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  const beforeNodes = new Map(
    ((before.nodes as unknown as BstNode[]) ?? []).map((node) => [node.id, node])
  );
  const afterNodes = (after.nodes as unknown as BstNode[]) ?? [];
  for (const node of afterNodes) {
    const prior = beforeNodes.get(node.id);
    if (!prior) {
      mutations.push({
        entityId: node.id,
        property: 'node',
        previousValue: null,
        nextValue: { ...node },
        animation: 'insert'
      });
      continue;
    }
    if (prior.left !== node.left || prior.right !== node.right) {
      mutations.push({
        entityId: node.id,
        property: 'children',
        previousValue: `${prior.left},${prior.right}`,
        nextValue: `${node.left},${node.right}`,
        animation: 'move'
      });
    }
    if (prior.status !== node.status) {
      mutations.push({
        entityId: node.id,
        property: 'status',
        previousValue: prior.status,
        nextValue: node.status,
        animation: node.status === 'deleted' ? 'remove' : 'activate'
      });
    }
  }
  for (const field of ['current', 'parent', 'successor', 'result', 'height', 'visited', 'queue']) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      mutations.push({
        entityId: field,
        property: 'value',
        previousValue: before[field],
        nextValue: after[field],
        animation: 'highlight'
      });
    }
  }
  return mutations;
}

export interface BstMistakeMetadata {
  prompt: string;
  wrongAnswer: TraceValue;
  correctAnswer: TraceValue;
  explanation: string;
  tag: string;
}

function makePrediction(
  id: string,
  prompt: string,
  type: PredictionChallenge['type'],
  correctAnswer: TraceValue,
  explanation: string,
  tag: string,
  wrongAnswer: TraceValue
): { prediction: PredictionChallenge; mistake: BstMistakeMetadata } {
  return {
    prediction: {
      id,
      prompt,
      type,
      correctAnswer,
      explanation,
      misconceptionTags: [tag],
      xpReward: 10
    },
    mistake: { prompt, wrongAnswer, correctAnswer, explanation, tag }
  };
}

interface TraceBuilder {
  state: RuntimeState;
  steps: TraceStep[];
  add: (
    semantic: string,
    title: string,
    explanation: string,
    stepWork: WorkCounts,
    mutate?: (state: RuntimeState) => void,
    checkpoint?: ReturnType<typeof makePrediction>
  ) => void;
}

function createTraceBuilder(
  config: ResolvedConfig,
  complexityCase: SelectedCase,
  state: RuntimeState
): TraceBuilder {
  const steps: TraceStep[] = [];
  let peakAuxiliary = 0;
  let peakOutput = 0;

  const add: TraceBuilder['add'] = (
    semantic,
    title,
    explanation,
    stepWork,
    mutate = () => {},
    checkpoint
  ) => {
    const before = traceState(state, config);
    mutate(state);
    const exactOperationCount = totalWork(stepWork);
    state.cumulativeWork = addWork(state.cumulativeWork, stepWork);
    state.operationCount += exactOperationCount;
    const after = traceState(state, config);

    const currentDepth = nodeById(state.nodes, state.current)?.depth ?? 0;
    const auxiliaryCurrent =
      config.operation === 'levelorder'
        ? state.queue.length
        : ['inorder', 'preorder', 'postorder', 'height'].includes(config.operation)
          ? currentDepth + 1
          : 1;
    const outputCurrent = state.visited.length || (state.result === null ? 0 : 1);
    peakAuxiliary = Math.max(peakAuxiliary, auxiliaryCurrent);
    peakOutput = Math.max(peakOutput, outputCurrent);

    const complexityEvidence: ComplexityEvidence = {
      caseId: complexityCase.id,
      selectedCase: complexityCase.caseType,
      implementationVariant: complexityCase.implementationVariant,
      inputSize: { n: config.values.length },
      exactOperationCount,
      cumulativeOperationCount: state.operationCount,
      stepWork: cloneWork(stepWork),
      cumulativeWork: cloneWork(state.cumulativeWork),
      timeComplexity: complexityCase.timeComplexity,
      auxiliarySpace: complexityCase.auxiliarySpace,
      space: {
        auxiliary: {
          current: auxiliaryCurrent,
          peak: peakAuxiliary,
          unit: config.operation === 'levelorder' ? 'queued nodes' : 'stack frames'
        },
        output: { current: outputCurrent, peak: peakOutput, unit: 'visited nodes' },
        callStackDepth: ['inorder', 'preorder', 'postorder', 'height'].includes(config.operation)
          ? currentDepth + 1
          : 1
      },
      assumptions: [
        ...new Set([
          ...complexityCase.assumptions,
          boundedPrimitiveAssumption,
          'Trace construction and visualization bookkeeping are excluded from the algorithm count.'
        ])
      ],
      derivation: [...complexityCase.derivation]
    };

    steps.push({
      id: `bst-${config.operation}-${steps.length}`,
      index: steps.length,
      title,
      eventType: semantic,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      stateBefore: before,
      stateAfter: after,
      entities: entitiesFor(state),
      mutations: mutationsBetween(before, after),
      deterministicExplanation: explanation,
      visualFocus: state.current ? [state.current] : [],
      ...(checkpoint ? { prediction: checkpoint.prediction } : {}),
      complexityCost: {
        comparisons: state.cumulativeWork.comparison ?? 0,
        reads: (state.cumulativeWork.read ?? 0) + (state.cumulativeWork['pointer-read'] ?? 0),
        writes: (state.cumulativeWork.write ?? 0) + (state.cumulativeWork['pointer-write'] ?? 0),
        swaps: state.cumulativeWork.swap ?? 0
      },
      complexityEvidence,
      metadata: {
        operation: config.operation,
        complexityCase: complexityCase.id,
        ...(checkpoint
          ? {
              mistake: {
                prompt: checkpoint.mistake.prompt,
                wrongAnswer: checkpoint.mistake.wrongAnswer,
                correctAnswer: checkpoint.mistake.correctAnswer,
                explanation: checkpoint.mistake.explanation,
                tag: checkpoint.mistake.tag
              }
            }
          : {})
      }
    });
  };
  return { state, steps, add };
}

interface QuadSourceLine {
  semantic?: string;
  c: string;
  cpp: string;
  java: string;
  python: string;
}

function quad(
  semantic: string | undefined,
  c: string,
  cpp: string,
  java: string,
  python: string
): QuadSourceLine {
  return { semantic, c, cpp, java, python };
}

function operationSource(config: ResolvedConfig): QuadSourceLine[] {
  switch (config.operation) {
    case 'search':
      return [
        quad(
          undefined,
          'Node* search(Node* root, int k) {',
          'Node* search(Node* root, int k) {',
          '  Node search(Node root, int k) {',
          'def search(root, k):'
        ),
        quad(
          'descend-init',
          '  Node* cur = root;',
          '  Node* cur = root;',
          '    Node cur = root;',
          '    cur = root'
        ),
        quad(
          'descend-check',
          '  while (cur != NULL) {',
          '  while (cur != nullptr) {',
          '    while (cur != null) {',
          '    while cur is not None:'
        ),
        quad(
          'compare',
          '    if (k == cur->value) return cur;',
          '    if (k == cur->value) return cur;',
          '      if (k == cur.value) return cur;',
          '        if k == cur.value: return cur'
        ),
        quad(
          'descend-child',
          '    cur = k < cur->value ? cur->left : cur->right;',
          '    cur = k < cur->value ? cur->left : cur->right;',
          '      cur = k < cur.value ? cur.left : cur.right;',
          '        cur = cur.left if k < cur.value else cur.right'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'report',
          '  return NULL;',
          '  return nullptr;',
          '    return null;',
          '    return None'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert':
      return [
        quad(
          undefined,
          'Node* insert(Node* root, int k) {',
          'Node* insert(Node* root, int k) {',
          '  Node insert(Node root, int k) {',
          'def insert(root, k):'
        ),
        quad(
          'insert-empty',
          '  if (root == NULL) return newNode(k);',
          '  if (root == nullptr) return newNode(k);',
          '    if (root == null) return new Node(k);',
          '    if root is None: return Node(k)'
        ),
        quad(
          'descend-init',
          '  Node* cur = root; Node* parent = NULL;',
          '  Node* cur = root; Node* parent = nullptr;',
          '    Node cur = root, parent = null;',
          '    cur, parent = root, None'
        ),
        quad(
          'descend-check',
          '  while (cur) {',
          '  while (cur) {',
          '    while (cur != null) {',
          '    while cur:'
        ),
        quad(
          'compare',
          '    parent = cur; if (k == cur->value) return root;',
          '    parent = cur; if (k == cur->value) return root;',
          '      parent = cur; if (k == cur.value) return root;',
          '        parent = cur\n        if k == cur.value: return root'
        ),
        quad(
          'descend-child',
          '    cur = k < cur->value ? cur->left : cur->right; }',
          '    cur = k < cur->value ? cur->left : cur->right; }',
          '      cur = k < cur.value ? cur.left : cur.right; }',
          '        cur = cur.left if k < cur.value else cur.right'
        ),
        quad(
          'insert-link',
          '  attach newNode(k) to parent as the correct child;',
          '  attach newNode(k) to parent as the correct child;',
          '    attach new Node(k) to parent as the correct child;',
          '    attach Node(k) to parent as the correct child'
        ),
        quad('report', '  return root;', '  return root;', '    return root;', '    return root'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete':
      return [
        quad(
          undefined,
          'Node* erase(Node* root, int k) {',
          'Node* erase(Node* root, int k) {',
          '  Node delete(Node root, int k) {',
          'def delete(root, k):'
        ),
        quad(
          'descend-check',
          '  find node with value k and its parent;',
          '  find node with value k and its parent;',
          '    find node with value k and its parent;',
          '    find node with value k and its parent'
        ),
        quad(
          'delete-leaf',
          '  if (leaf) detach it from parent;',
          '  if (leaf) detach it from parent;',
          '    if (leaf) detach it from parent;',
          '    if leaf: detach it from parent'
        ),
        quad(
          'delete-one-child',
          '  else if (one child) splice child into parent;',
          '  else if (one child) splice child into parent;',
          '    else if (one child) splice child into parent;',
          '    elif one child: splice child into parent'
        ),
        quad(
          'delete-successor',
          '  else { succ = min(node->right);',
          '  else { succ = min(node->right);',
          '    else { succ = min(node.right);',
          '    else: succ = min(node.right)'
        ),
        quad(
          'delete-replace',
          '    copy succ value into node; delete succ; }',
          '    copy succ value into node; delete succ; }',
          '      copy succ value into node; delete succ; }',
          '          copy succ value into node; delete succ'
        ),
        quad('report', '  return root;', '  return root;', '    return root;', '    return root'),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'inorder':
    case 'preorder':
    case 'postorder': {
      const name = config.operation;
      const order =
        name === 'inorder'
          ? ['visit(node->left);', 'output(node->value);', 'visit(node->right);']
          : name === 'preorder'
            ? ['output(node->value);', 'visit(node->left);', 'visit(node->right);']
            : ['visit(node->left);', 'visit(node->right);', 'output(node->value);'];
      return [
        quad(
          undefined,
          `void ${name}(Node* node) {`,
          `void ${name}(Node* node) {`,
          `  void ${name}(Node node) {`,
          `def ${name}(node):`
        ),
        quad(
          'base',
          '  if (node == NULL) return;',
          '  if (node == nullptr) return;',
          '    if (node == null) return;',
          '    if node is None: return'
        ),
        quad(
          'recurse-left',
          `  ${order[0].replace('node->', 'node.').replace('visit', name)}`,
          `  ${order[0].replace('visit', name)}`,
          `    ${order[0].replace('node->', 'node.').replace('visit', name)}`,
          `    ${order[0].replace('node->', 'node.').replace('visit(', `${name}(`).replace(';', '').replace('output(node.value)', 'print(node.value)')}`
        ),
        quad(
          'visit-node',
          `  ${order[1].replace('node->', 'node.').replace('visit', name)}`,
          `  ${order[1].replace('visit', name)}`,
          `    ${order[1].replace('node->', 'node.').replace('visit', name)}`,
          `    ${order[1].replace('node->', 'node.').replace('visit(', `${name}(`).replace(';', '').replace('output(node.value)', 'print(node.value)')}`
        ),
        quad(
          'recurse-right',
          `  ${order[2].replace('node->', 'node.').replace('visit', name)}`,
          `  ${order[2].replace('visit', name)}`,
          `    ${order[2].replace('node->', 'node.').replace('visit', name)}`,
          `    ${order[2].replace('node->', 'node.').replace('visit(', `${name}(`).replace(';', '').replace('output(node.value)', 'print(node.value)')}`
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    }
    case 'levelorder':
      return [
        quad(
          undefined,
          'void levelOrder(Node* root) {',
          'void levelOrder(Node* root) {',
          '  void levelOrder(Node root) {',
          'def level_order(root):'
        ),
        quad(
          'bfs-init',
          '  Queue q; if (root) push(q, root);',
          '  queue<Node*> q; if (root) q.push(root);',
          '    Queue<Node> q; if (root != null) q.add(root);',
          '    q = deque([root]) if root else deque()'
        ),
        quad(
          'bfs-check',
          '  while (!empty(q)) {',
          '  while (!q.empty()) {',
          '    while (!q.isEmpty()) {',
          '    while q:'
        ),
        quad(
          'bfs-pop',
          '    Node* n = pop(q); output(n->value);',
          '    Node* n = q.front(); q.pop(); output(n->value);',
          '      Node n = q.poll(); output(n.value);',
          '        n = q.popleft(); print(n.value)'
        ),
        quad(
          'bfs-push',
          '    if (n->left) push(q, n->left); if (n->right) push(q, n->right);',
          '    if (n->left) q.push(n->left); if (n->right) q.push(n->right);',
          '      if (n.left != null) q.add(n.left); if (n.right != null) q.add(n.right);',
          '        if n.left: q.append(n.left)\n        if n.right: q.append(n.right)'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'height':
      return [
        quad(
          undefined,
          'int height(Node* node) {',
          'int height(Node* node) {',
          '  int height(Node node) {',
          'def height(node):'
        ),
        quad(
          'base',
          '  if (node == NULL) return -1;',
          '  if (node == nullptr) return -1;',
          '    if (node == null) return -1;',
          '    if node is None: return -1'
        ),
        quad(
          'recurse-left',
          '  int L = height(node->left);',
          '  int L = height(node->left);',
          '    int L = height(node.left);',
          '    L = height(node.left)'
        ),
        quad(
          'recurse-right',
          '  int R = height(node->right);',
          '  int R = height(node->right);',
          '    int R = height(node.right);',
          '    R = height(node.right)'
        ),
        quad(
          'combine',
          '  return 1 + max(L, R);',
          '  return 1 + max(L, R);',
          '    return 1 + Math.max(L, R);',
          '    return 1 + max(L, R)'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
  }
}

function sourceLines(config: ResolvedConfig, language: SupportedLanguage): SourceLine[] {
  return operationSource(config).map((line, index) => ({
    id: `${config.operation}-${index + 1}`,
    number: index + 1,
    text: line[language],
    ...(line.semantic ? { semanticOperationId: line.semantic } : {})
  }));
}

function isDegenerate(config: ResolvedConfig): boolean {
  const height = treeHeight(config.values);
  return config.values.length > 2 && height >= config.values.length - 1;
}

function deriveComplexity(caseId: string, config: ResolvedConfig): string[] {
  const n = config.values.length;
  const height = treeHeight(config.values);
  switch (caseId) {
    case 'balanced':
      return [
        'Each comparison eliminates one subtree, moving down exactly one level.',
        `This tree has height ${height} over ${n} nodes — close to ⌈log₂(n+1)⌉.`,
        'One comparison per level is O(log n) time; two pointers are O(1) auxiliary space.'
      ];
    case 'degenerate':
      return [
        'The insertion order gave every node a single child: the tree is a chain.',
        `Height ${height} ≈ n − 1, so the descent may compare all ${n} nodes.`,
        'An unbalanced BST degrades to O(n) — the motivation for AVL and red-black trees.'
      ];
    case 'bfs-all':
      return [
        'BFS visits every node exactly once, so time is O(n).',
        `The queue holds at most one full level; this tree's widest level has ${treeWidth(config.values)} node(s).`,
        'Peak queue size is the tree width w: O(w) auxiliary space, unlike DFS which uses O(h).'
      ];
    case 'height-all':
      return [
        'Height compares nothing but must recurse into every node to find the deepest path.',
        `All ${n} nodes are visited: O(n) time.`,
        `The call stack holds one root-to-leaf path at a time: O(h) = O(${height}) auxiliary space.`
      ];
    default:
      return [
        'A depth-first traversal visits each of the n nodes exactly once.',
        `The call stack holds one active path, at most height ${height} + 1 frames.`,
        'Time is O(n); recursion depth makes auxiliary space O(h).'
      ];
  }
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const metadata = getBstOperationMetadata(config.operation);
  let caseId: string;
  if (['search', 'insert', 'delete'].includes(config.operation)) {
    caseId = isDegenerate(config) ? 'degenerate' : 'balanced';
  } else {
    caseId = metadata.cases[0].id;
  }
  const selected = metadata.cases.find((candidate) => candidate.id === caseId) ?? metadata.cases[0];
  return { ...selected, derivation: deriveComplexity(selected.id, config) };
}

function runDescent(builder: TraceBuilder, config: ResolvedConfig, mode: 'search' | 'insert') {
  const nodes = builder.state.nodes;
  const rootNode = nodeById(nodes, builder.state.root);
  const degenerate = isDegenerate(config);
  const checkpoint = makePrediction(
    `bst-lab:${mode}:${config.key}:checkpoint`,
    mode === 'search'
      ? `Descending for ${config.key}: at the root ${rootNode?.value}, which way does the search go?`
      : `Inserting ${config.key}: at the root ${rootNode?.value}, which subtree will it descend into?`,
    'text',
    rootNode ? (config.key < rootNode.value ? 'left' : 'right') : 'empty',
    rootNode
      ? `${config.key} ${config.key < rootNode.value ? '<' : '≥'} ${rootNode.value}, so go ${config.key < rootNode.value ? 'left' : 'right'} — the BST ordering discards the other whole subtree.`
      : 'The tree is empty, so the key becomes the root.',
    'bst-descent-direction',
    rootNode ? (config.key < rootNode.value ? 'right' : 'left') : 'left'
  );
  builder.add(
    'descend-init',
    `Start at root ${rootNode?.id ?? 'null'}`,
    'BST descent never scans the whole tree — only one root-to-leaf path.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.current = state.root;
    },
    checkpoint
  );
  let cursor = rootNode;
  let parent: BstNode | undefined;
  while (cursor) {
    const node = cursor;
    builder.add(
      'descend-check',
      `Visit ${node.id} (depth ${node.depth})`,
      `${node.id} holds ${node.value}.`,
      { comparison: 1 },
      (state) => {
        state.current = node.id;
        const runtimeNode = nodeById(state.nodes, node.id);
        if (runtimeNode) runtimeNode.status = 'visiting';
      }
    );
    builder.add(
      'compare',
      `Compare ${config.key} with ${node.value}`,
      config.key === node.value
        ? `${config.key} matches at depth ${node.depth}.`
        : config.key < node.value
          ? `${config.key} < ${node.value}: discard the right subtree, go left.`
          : `${config.key} > ${node.value}: discard the left subtree, go right.`,
      { read: 1, comparison: 1 },
      (state) => {
        state.visited = [...state.visited, node.id];
        if (config.key === node.value) state.result = mode === 'search' ? node.id : 'duplicate';
      }
    );
    if (config.key === node.value) {
      if (mode === 'search') {
        return;
      }
      builder.add(
        'insert-link',
        'Key already present',
        'A BST holds a set; the duplicate insert changes nothing.',
        { return: 1 }
      );
      return;
    }
    parent = node;
    const nextId = config.key < node.value ? node.left : node.right;
    builder.add(
      'descend-child',
      nextId
        ? `Descend to ${nextId}`
        : `Reach a null ${config.key < node.value ? 'left' : 'right'} child`,
      nextId
        ? `Follow the ${config.key < node.value ? 'left' : 'right'} child pointer.`
        : `The ${config.key < node.value ? 'left' : 'right'} child is null — the descent ends here.`,
      { 'pointer-read': 1, 'pointer-write': 1 },
      (state) => {
        state.parent = node.id;
        state.current = nextId;
      }
    );
    cursor = nodeById(nodes, nextId);
  }
  if (mode === 'search') {
    builder.add(
      'report',
      `Report ${config.key} absent`,
      `Only ${builder.state.visited.length} node(s) on one path were inspected${degenerate ? ' — but this skewed tree makes that the whole chain' : ''}.`,
      { return: 1 },
      (state) => {
        state.result = 'absent';
      }
    );
    return;
  }
  // Insert: attach as a child of parent.
  const parentNode = parent;
  const goLeft = parentNode ? config.key < parentNode.value : false;
  builder.add(
    'insert-link',
    `Attach ${config.key} as ${parentNode ? `${goLeft ? 'left' : 'right'} child of ${parentNode.id}` : 'the root'}`,
    parentNode
      ? `${parentNode.id}'s null ${goLeft ? 'left' : 'right'} pointer now references the new leaf.`
      : 'The tree was empty, so the new node is the root.',
    { allocation: 1, 'pointer-write': 1 },
    (state) => {
      const id = `T${state.nodes.length + 1}`;
      state.nodes.push({
        id,
        value: config.key,
        left: null,
        right: null,
        depth: 0,
        inorder: 0,
        status: 'allocated'
      });
      if (parentNode) {
        const runtimeParent = nodeById(state.nodes, parentNode.id);
        if (runtimeParent) {
          if (goLeft) runtimeParent.left = id;
          else runtimeParent.right = id;
        }
      } else {
        state.root = id;
      }
      state.newNode = id;
      state.current = id;
      state.result = config.key;
      relayout(state.nodes, state.root);
    }
  );
  builder.add(
    'report',
    'Insertion complete',
    `${config.key} is now a leaf; the descent cost matched the tree height.`,
    { return: 1 },
    (state) => {
      const runtimeNode = nodeById(state.nodes, state.newNode);
      if (runtimeNode) runtimeNode.status = 'live';
    }
  );
}

function runDelete(builder: TraceBuilder, config: ResolvedConfig) {
  const nodes = builder.state.nodes;
  const target = nodes.find((node) => node.value === config.key && node.status !== 'deleted');
  const twoChildren = target ? target.left !== null && target.right !== null : false;
  const checkpoint = makePrediction(
    `bst-lab:delete:${config.key}:checkpoint`,
    target
      ? twoChildren
        ? `${config.key} has two children. Which node replaces it?`
        : `${config.key} has ${target.left || target.right ? 'one child' : 'no children'}. How is it removed?`
      : `${config.key} is not in the tree. What happens?`,
    'text',
    !target
      ? 'nothing'
      : twoChildren
        ? 'inorder successor'
        : target.left || target.right
          ? 'its only child'
          : 'just detached',
    !target
      ? 'The key is absent, so the tree is unchanged.'
      : twoChildren
        ? 'A two-child node is replaced by its in-order successor (smallest key in the right subtree), which preserves BST ordering.'
        : 'A leaf is detached; a one-child node is spliced out by linking its parent to its only child.',
    'bst-delete-successor',
    twoChildren ? 'its left child' : 'the root'
  );
  builder.add(
    'descend-check',
    `Search for ${config.key}`,
    target
      ? `${config.key} is at ${target.id} (depth ${target.depth}).`
      : `${config.key} is not present.`,
    { comparison: 1, read: 1 },
    (state) => {
      state.current = target?.id ?? null;
      state.result = target ? null : 'absent';
    },
    checkpoint
  );
  if (!target) {
    builder.add(
      'report',
      'Nothing to delete',
      `${config.key} was not found; the tree is unchanged.`,
      { return: 1 },
      (state) => {
        state.result = 'absent';
      }
    );
    return;
  }
  const leftId = target.left;
  const rightId = target.right;
  if (!twoChildren) {
    const onlyChild = leftId ?? rightId;
    builder.add(
      onlyChild ? 'delete-one-child' : 'delete-leaf',
      onlyChild ? `Splice ${target.id} out` : `Detach leaf ${target.id}`,
      onlyChild
        ? `${target.id}'s parent is linked directly to its only child ${onlyChild}.`
        : `${target.id} has no children, so it is simply removed.`,
      { 'pointer-write': 1, deallocation: 1, return: 1 },
      (state) => {
        const runtimeTarget = nodeById(state.nodes, target.id)!;
        const parentNode = state.nodes.find(
          (node) => node.left === target.id || node.right === target.id
        );
        if (parentNode) {
          if (parentNode.left === target.id) parentNode.left = onlyChild;
          else parentNode.right = onlyChild;
        } else {
          state.root = onlyChild;
        }
        runtimeTarget.status = 'deleted';
        runtimeTarget.left = null;
        runtimeTarget.right = null;
        state.result = true;
        relayout(state.nodes, state.root);
      }
    );
    return;
  }
  // Two children: find in-order successor (min of right subtree).
  let successor = nodeById(nodes, rightId)!;
  builder.add(
    'delete-successor',
    `Find in-order successor in ${target.id}'s right subtree`,
    `Start at the right child ${successor.id} (${successor.value}).`,
    { 'pointer-read': 1 },
    (state) => {
      state.successor = successor.id;
      state.current = successor.id;
    }
  );
  while (successor.left !== null) {
    const nextSucc = nodeById(nodes, successor.left)!;
    builder.add(
      'delete-successor',
      `Go left to ${nextSucc.id}`,
      `The smallest key in the right subtree is the leftmost node; keep going left.`,
      { 'pointer-read': 1, comparison: 1 },
      (state) => {
        state.successor = nextSucc.id;
        state.current = nextSucc.id;
      }
    );
    successor = nextSucc;
  }
  const succ = successor;
  builder.add(
    'delete-replace',
    `Copy ${succ.value} into ${target.id}, then remove ${succ.id}`,
    `The successor ${succ.value} is the next-largest key, so overwriting ${config.key} with it keeps every BST invariant. ${succ.id} (which has no left child) is then spliced out.`,
    { write: 1, 'pointer-write': 1, deallocation: 1, return: 1 },
    (state) => {
      const runtimeTarget = nodeById(state.nodes, target.id)!;
      runtimeTarget.value = succ.value;
      const succParent = state.nodes.find(
        (node) => node.left === succ.id || node.right === succ.id
      )!;
      const succRight = succ.right;
      if (succParent.left === succ.id) succParent.left = succRight;
      else succParent.right = succRight;
      const runtimeSucc = nodeById(state.nodes, succ.id)!;
      runtimeSucc.status = 'deleted';
      runtimeSucc.left = null;
      runtimeSucc.right = null;
      state.successor = null;
      state.result = true;
      relayout(state.nodes, state.root);
    }
  );
}

function runTraversal(builder: TraceBuilder, config: ResolvedConfig) {
  const nodes = builder.state.nodes;
  const order: number[] = [];
  const visitOrder: string[] = [];
  function walk(id: string | null) {
    const node = nodeById(nodes, id);
    if (!node) return;
    if (config.operation === 'preorder') {
      visitOrder.push(node.id);
      order.push(node.value);
    }
    walk(node.left);
    if (config.operation === 'inorder') {
      visitOrder.push(node.id);
      order.push(node.value);
    }
    walk(node.right);
    if (config.operation === 'postorder') {
      visitOrder.push(node.id);
      order.push(node.value);
    }
  }
  walk(builder.state.root);
  const firstValue = order[0];
  const checkpoint = makePrediction(
    `bst-lab:${config.operation}:checkpoint`,
    `Which value does ${config.operation} output FIRST?`,
    'numeric',
    firstValue,
    config.operation === 'inorder'
      ? `Inorder is Left→Node→Right, so it descends to the smallest key first: ${firstValue}. Inorder of a BST is always sorted.`
      : config.operation === 'preorder'
        ? `Preorder is Node→Left→Right, so it outputs the root first: ${firstValue}.`
        : `Postorder is Left→Right→Node, so the deepest-left leaf comes first: ${firstValue}.`,
    'traversal-order',
    nodeById(nodes, builder.state.root)?.value ?? firstValue
  );
  let emitted = false;
  for (let position = 0; position < visitOrder.length; position++) {
    const nodeId = visitOrder[position];
    const node = nodeById(nodes, nodeId)!;
    builder.add(
      position === 0 ? 'base' : 'visit-node',
      `Output ${node.value}`,
      `${config.operation} reaches ${node.id} at position ${position + 1} of ${visitOrder.length}.`,
      { read: 1, 'node-inspection': 1 },
      (state) => {
        state.current = nodeId;
        state.visited = [...state.visited, nodeId];
        state.result = order.slice(0, position + 1);
      },
      emitted ? undefined : checkpoint
    );
    emitted = true;
  }
  builder.add(
    'base',
    'Traversal complete',
    `${config.operation} output: [${order.join(', ')}]${config.operation === 'inorder' ? ' — sorted, as every BST inorder is' : ''}.`,
    { return: 1 }
  );
}

function runLevelOrder(builder: TraceBuilder, config: ResolvedConfig) {
  const nodes = builder.state.nodes;
  const rootNode = nodeById(nodes, builder.state.root);
  const width = treeWidth(config.values);
  const checkpoint = makePrediction(
    'bst-lab:levelorder:checkpoint',
    `Level-order uses a queue. What is the PEAK number of nodes in the queue (the tree width)?`,
    'numeric',
    width,
    `BFS auxiliary space is the widest level, here ${width} node(s) — that is O(w), in contrast to DFS which is O(h).`,
    'bfs-vs-dfs-space',
    treeHeight(config.values) + 1
  );
  const output: number[] = [];
  const queue: string[] = rootNode ? [rootNode.id] : [];
  builder.add(
    'bfs-init',
    'Enqueue the root',
    'BFS replaces the call stack with an explicit queue.',
    { 'queue-operation': 1 },
    (state) => {
      state.queue = [...queue];
      state.current = rootNode?.id ?? null;
    },
    checkpoint
  );
  while (queue.length) {
    const id = queue.shift()!;
    const node = nodeById(nodes, id)!;
    builder.add(
      'bfs-pop',
      `Dequeue ${node.id}, output ${node.value}`,
      `The front of the queue is visited; its children join the back.`,
      { 'queue-operation': 1, read: 1 },
      (state) => {
        state.current = id;
        state.queue = [...queue];
        state.visited = [...state.visited, id];
        output.push(node.value);
        state.result = [...output];
      }
    );
    const children = [node.left, node.right].filter((child): child is string => child !== null);
    if (children.length) {
      for (const child of children) queue.push(child);
      builder.add(
        'bfs-push',
        `Enqueue ${children.join(', ')}`,
        `${node.id}'s children wait their turn at the back of the queue.`,
        { 'queue-operation': children.length },
        (state) => {
          state.queue = [...queue];
        }
      );
    }
  }
  builder.add(
    'bfs-check',
    'Queue empty — traversal complete',
    `Level-order output: [${output.join(', ')}].`,
    { return: 1 },
    (state) => {
      state.current = null;
    }
  );
}

function runHeight(builder: TraceBuilder, config: ResolvedConfig) {
  const nodes = builder.state.nodes;
  const actualHeight = treeHeight(config.values);
  const checkpoint = makePrediction(
    'bst-lab:height:checkpoint',
    `Height counts edges on the longest root-to-leaf path. What is this tree's height?`,
    'numeric',
    actualHeight,
    `The deepest leaf sits ${actualHeight} edge(s) below the root. Height decides whether search is O(log n) or O(n).`,
    'height-vs-depth',
    actualHeight + 1
  );
  const heights = new Map<string, number>();
  const postorder: string[] = [];
  function walk(id: string | null) {
    const node = nodeById(nodes, id);
    if (!node) return;
    walk(node.left);
    walk(node.right);
    postorder.push(node.id);
  }
  walk(builder.state.root);
  let emitted = false;
  for (const id of postorder) {
    const node = nodeById(nodes, id)!;
    const leftH = node.left ? (heights.get(node.left) ?? -1) : -1;
    const rightH = node.right ? (heights.get(node.right) ?? -1) : -1;
    const h = 1 + Math.max(leftH, rightH);
    heights.set(id, h);
    builder.add(
      'combine',
      `height(${node.id}) = 1 + max(${leftH}, ${rightH}) = ${h}`,
      `A node's height is computed only after both children return — that is why height is a postorder computation.`,
      { comparison: 1, read: 1, 'node-inspection': 1 },
      (state) => {
        state.current = id;
        state.visited = [...state.visited, id];
        state.height = h;
        state.result = h;
      },
      emitted ? undefined : checkpoint
    );
    emitted = true;
  }
  builder.add(
    'base',
    'Height computed',
    `The whole tree's height is ${actualHeight}; every one of the ${config.values.length} nodes was inspected.`,
    { return: 1 }
  );
}

const LESSON_OBJECTIVES = [
  'Trace BST descent and explain why a balanced tree is O(log n) but a skewed one is O(n)',
  'Handle the leaf, one-child, and two-child (in-order successor) deletion cases',
  'Contrast DFS traversals (O(h) stack) with level-order BFS (O(w) queue)'
];

export function createBstLesson(input: BstConfig = DEFAULT_BST_CONFIG): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));
  switch (config.operation) {
    case 'search':
      runDescent(builder, config, 'search');
      break;
    case 'insert':
      runDescent(builder, config, 'insert');
      break;
    case 'delete':
      runDelete(builder, config);
      break;
    case 'inorder':
    case 'preorder':
    case 'postorder':
      runTraversal(builder, config);
      break;
    case 'levelorder':
      runLevelOrder(builder, config);
      break;
    case 'height':
      runHeight(builder, config);
      break;
  }
  const metadata = getBstOperationMetadata(config.operation);
  return {
    id: 'bst-lab',
    subject: 'dsa-1',
    topic: 'Binary Search Tree',
    title: `BST Lab — ${metadata.label}`,
    description: metadata.description,
    difficulty: 'intermediate',
    learningObjectives: LESSON_OBJECTIVES,
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage: {
      c: sourceLines(config, 'c'),
      cpp: sourceLines(config, 'cpp'),
      java: sourceLines(config, 'java'),
      python: sourceLines(config, 'python')
    },
    initialState: traceState(initialRuntime(config), config),
    steps: builder.steps,
    completionCriteria: { requiredCorrectPredictions: 1, masteryThreshold: 0.8 }
  };
}
