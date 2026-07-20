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

export const LINKED_LIST_INPUT_MAX = 12;

export type LinkedListOperation =
  | 'access'
  | 'traverse'
  | 'search'
  | 'insert-head'
  | 'insert-tail'
  | 'insert-after-known'
  | 'insert-at-position'
  | 'delete-head'
  | 'delete-tail'
  | 'delete-by-value'
  | 'delete-after-known'
  | 'reverse-iterative'
  | 'reverse-recursive'
  | 'detect-cycle';

export type LinkedListOperationGroup =
  'Access & traversal' | 'Insertion' | 'Deletion' | 'Reversal & cycles';

export interface LinkedListComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface LinkedListOperationMetadata {
  id: LinkedListOperation;
  label: string;
  description: string;
  group: LinkedListOperationGroup;
  requiresPosition: boolean;
  requiresTarget: boolean;
  requiresNewValue: boolean;
  supportsTailToggle: boolean;
  supportsCycleEntry: boolean;
  cases: readonly LinkedListComplexityCase[];
}

export interface LinkedListConfig {
  operation: LinkedListOperation;
  values: number[];
  position?: number;
  target?: number;
  newValue?: number;
  maintainTail?: boolean;
  cycleEntry?: number | null;
}

export interface LinkedListMistakeMetadata {
  prompt: string;
  wrongAnswer: TraceValue;
  correctAnswer: TraceValue;
  explanation: string;
  tag: string;
}

export interface LinkedListNodeState {
  id: string;
  value: number;
  next: string | null;
  status: 'live' | 'allocated' | 'detached' | 'deleted';
}

export const DEFAULT_LINKED_LIST_CONFIG: LinkedListConfig = {
  operation: 'insert-tail',
  values: [12, 27, 41, 56],
  position: 2,
  target: 41,
  newValue: 73,
  maintainTail: false,
  cycleEntry: null
};

const directReferenceAssumption =
  'The operation receives the node reference directly; finding that node is not charged.';
const singlyLinkedAssumption = 'Each node stores one next reference and the list is singly linked.';
const boundedPrimitiveAssumption =
  'Each displayed pointer read, pointer write, comparison, allocation, call, or return is one counted primitive.';

const operation = (
  id: LinkedListOperation,
  label: string,
  description: string,
  group: LinkedListOperationGroup,
  flags: Partial<
    Pick<
      LinkedListOperationMetadata,
      | 'requiresPosition'
      | 'requiresTarget'
      | 'requiresNewValue'
      | 'supportsTailToggle'
      | 'supportsCycleEntry'
    >
  >,
  cases: readonly LinkedListComplexityCase[]
): LinkedListOperationMetadata => ({
  id,
  label,
  description,
  group,
  requiresPosition: false,
  requiresTarget: false,
  requiresNewValue: false,
  supportsTailToggle: false,
  supportsCycleEntry: false,
  ...flags,
  cases
});

export const LINKED_LIST_OPERATIONS: readonly LinkedListOperationMetadata[] = [
  operation(
    'access',
    'Access by position',
    'Follow next references until the requested zero-based position is reached.',
    'Access & traversal',
    { requiresPosition: true },
    [
      {
        id: 'access-head',
        label: 'Access head directly',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Direct head reference',
        assumptions: [singlyLinkedAssumption, 'The requested position is zero.'],
        description: 'Read head once; no next reference is traversed.'
      },
      {
        id: 'access-position',
        label: 'Access a later position',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Forward traversal',
        assumptions: [singlyLinkedAssumption, 'The position can be as large as n - 1.'],
        description: 'A singly linked list cannot calculate an address from an index.'
      }
    ]
  ),
  operation(
    'traverse',
    'Traverse',
    'Visit every reachable node from head to null.',
    'Access & traversal',
    {},
    [
      {
        id: 'traverse-all',
        label: 'Visit all nodes',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Iterative traversal',
        assumptions: [singlyLinkedAssumption, 'The list is acyclic.'],
        description: 'Every node is inspected exactly once.'
      }
    ]
  ),
  operation(
    'search',
    'Search by value',
    'Compare values while walking from head until a match or null.',
    'Access & traversal',
    { requiresTarget: true },
    [
      {
        id: 'search-best',
        label: 'Match at head',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear search',
        assumptions: [singlyLinkedAssumption, 'The head value matches the target.'],
        description: 'The first comparison succeeds.'
      },
      {
        id: 'search-average',
        label: 'Match inside the list',
        caseType: 'average',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear search',
        assumptions: [
          singlyLinkedAssumption,
          'The target position is modeled as distributed through the list.'
        ],
        description: 'A linear fraction of the nodes is inspected.'
      },
      {
        id: 'search-worst',
        label: 'Last node or absent',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear search',
        assumptions: [singlyLinkedAssumption, 'The target is last or absent.'],
        description: 'All n nodes may need a comparison.'
      }
    ]
  ),
  operation(
    'insert-head',
    'Insert at head',
    'Allocate one node, point it at the old head, then replace head.',
    'Insertion',
    { requiresNewValue: true },
    [
      {
        id: 'insert-head-direct',
        label: 'All list sizes',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Head pointer update',
        assumptions: [singlyLinkedAssumption, 'Allocation itself is modeled as one primitive.'],
        description: 'A fixed number of pointer writes changes the head.'
      }
    ]
  ),
  operation(
    'insert-tail',
    'Insert at tail',
    'Compare traversal without a tail pointer against direct insertion with one.',
    'Insertion',
    { requiresNewValue: true, supportsTailToggle: true },
    [
      {
        id: 'insert-tail-without-tail',
        label: 'Tail pointer off',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'No maintained tail pointer',
        assumptions: [singlyLinkedAssumption, 'The terminal node must be found from head.'],
        description: 'Traverse through the list before changing the terminal next reference.'
      },
      {
        id: 'insert-tail-with-tail',
        label: 'Tail pointer on',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Maintained tail pointer',
        assumptions: [singlyLinkedAssumption, 'tail always references the terminal node.'],
        description: 'Use tail directly, then update two references.'
      }
    ]
  ),
  operation(
    'insert-after-known',
    'Insert after known node',
    'Rewire two next references when the predecessor node is already known.',
    'Insertion',
    { requiresPosition: true, requiresNewValue: true },
    [
      {
        id: 'insert-after-known-direct',
        label: 'Direct node reference',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Known predecessor reference',
        assumptions: [singlyLinkedAssumption, directReferenceAssumption],
        description: 'Link the new node without searching for the predecessor.'
      }
    ]
  ),
  operation(
    'insert-at-position',
    'Insert at position',
    'Find the predecessor, preserve its successor, then splice in a node.',
    'Insertion',
    { requiresPosition: true, requiresNewValue: true },
    [
      {
        id: 'insert-position-head',
        label: 'Position zero',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Head special case',
        assumptions: [singlyLinkedAssumption, 'The insertion position is zero.'],
        description: 'No predecessor search is needed at the head.'
      },
      {
        id: 'insert-position-traverse',
        label: 'Position must be found',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Predecessor traversal',
        assumptions: [singlyLinkedAssumption, 'The position may be near the tail.'],
        description: 'Traversal dominates the fixed splice writes.'
      }
    ]
  ),
  operation(
    'delete-head',
    'Delete head',
    'Advance head once and release the old head node.',
    'Deletion',
    {},
    [
      {
        id: 'delete-head-direct',
        label: 'All non-empty lists',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Head pointer update',
        assumptions: [singlyLinkedAssumption, 'Deallocation is modeled as one primitive.'],
        description: 'Only a fixed set of references changes.'
      }
    ]
  ),
  operation(
    'delete-tail',
    'Delete tail',
    'Find the predecessor because a singly linked tail has no back reference.',
    'Deletion',
    {},
    [
      {
        id: 'delete-tail-singly',
        label: 'Singly linked list',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Forward predecessor search',
        assumptions: [singlyLinkedAssumption, 'No predecessor or previous reference is stored.'],
        description: 'Even a tail pointer does not reveal the node before the tail.'
      }
    ]
  ),
  operation(
    'delete-by-value',
    'Delete by value',
    'Search for the first matching node while retaining its predecessor.',
    'Deletion',
    { requiresTarget: true },
    [
      {
        id: 'delete-value-best',
        label: 'Match at head',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear search and unlink',
        assumptions: [singlyLinkedAssumption, 'The head matches the target.'],
        description: 'The first comparison finds the node.'
      },
      {
        id: 'delete-value-average',
        label: 'Match inside the list',
        caseType: 'average',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear search and unlink',
        assumptions: [singlyLinkedAssumption, 'The match is distributed through the list.'],
        description: 'Search work grows linearly; unlinking stays constant.'
      },
      {
        id: 'delete-value-worst',
        label: 'Last node or absent',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear search and unlink',
        assumptions: [singlyLinkedAssumption, 'The target is last or absent.'],
        description: 'Every node may be compared before deletion or failure.'
      }
    ]
  ),
  operation(
    'delete-after-known',
    'Delete after known predecessor',
    'Unlink a known predecessor’s successor without searching.',
    'Deletion',
    { requiresPosition: true },
    [
      {
        id: 'delete-after-known-direct',
        label: 'Predecessor known',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Known predecessor reference',
        assumptions: [singlyLinkedAssumption, directReferenceAssumption],
        description: 'One successor read and one next write bypass the deleted node.'
      }
    ]
  ),
  operation(
    'reverse-iterative',
    'Reverse iteratively',
    'Redirect every next reference while retaining the unreversed suffix.',
    'Reversal & cycles',
    {},
    [
      {
        id: 'reverse-iterative-all',
        label: 'All nodes',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Three-pointer iteration',
        assumptions: [singlyLinkedAssumption, 'The input list is acyclic.'],
        description: 'Each node next reference is read and rewritten once.'
      }
    ]
  ),
  operation(
    'reverse-recursive',
    'Reverse recursively',
    'Recurse to the tail, then reverse links while stack frames unwind.',
    'Reversal & cycles',
    {},
    [
      {
        id: 'reverse-recursive-all',
        label: 'One frame per node',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(n)',
        implementationVariant: 'Recursive unwinding',
        assumptions: [singlyLinkedAssumption, 'The input list is acyclic.'],
        description: 'The call stack grows linearly before links are rewritten.'
      }
    ]
  ),
  operation(
    'detect-cycle',
    'Detect cycle (Floyd)',
    'Move slow by one and fast by two until they meet or fast reaches null.',
    'Reversal & cycles',
    { supportsCycleEntry: true },
    [
      {
        id: 'cycle-present',
        label: 'Cycle present',
        caseType: 'average',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Floyd slow/fast pointers',
        assumptions: [singlyLinkedAssumption, 'Pointer equality is constant time.'],
        description: 'The pointers meet after a linear number of moves.'
      },
      {
        id: 'cycle-absent',
        label: 'Acyclic list',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Floyd slow/fast pointers',
        assumptions: [singlyLinkedAssumption, 'Pointer equality is constant time.'],
        description: 'fast reaches null after inspecting a linear number of links.'
      }
    ]
  )
] as const;

export function getLinkedListOperationMetadata(
  operationId: LinkedListOperation
): LinkedListOperationMetadata {
  const metadata = LINKED_LIST_OPERATIONS.find((candidate) => candidate.id === operationId);
  if (!metadata) throw new Error(`Unknown linked-list operation: ${String(operationId)}`);
  return metadata;
}

type NodeStatus = LinkedListNodeState['status'];
type SourceTemplateLine = readonly [semantic: string | undefined, text: string];

interface RuntimeNode {
  id: string;
  value: number;
  next: string | null;
  status: NodeStatus;
}

interface RuntimeState {
  nodes: RuntimeNode[];
  head: string | null;
  tail: string | null;
  current: string | null;
  previous: string | null;
  next: string | null;
  newNode: string | null;
  slow: string | null;
  fast: string | null;
  detached: string[];
  traversed: string[];
  deleted: string[];
  allocated: string[];
  reconnected: string[];
  result: TraceValue;
  resultIndex: number | null;
  recursiveDepth: number;
  maintainTail: boolean;
  cycleEntry: string | null;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: LinkedListOperation;
  values: number[];
  position: number;
  target: number;
  newValue: number;
  maintainTail: boolean;
  cycleEntry: number | null;
}

interface SelectedCase extends LinkedListComplexityCase {
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

function nodeId(index: number): string {
  return `N${index + 1}`;
}

function cloneNodes(nodes: RuntimeNode[]): RuntimeNode[] {
  return nodes.map((node) => ({ ...node }));
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    values: [...config.values],
    position: config.position,
    target: config.target,
    newValue: config.newValue,
    maintainTail: state.maintainTail,
    cycleEntry: state.cycleEntry,
    nodes: cloneNodes(state.nodes) as unknown as TraceValue,
    head: state.head,
    tail: state.tail,
    current: state.current,
    previous: state.previous,
    next: state.next,
    newNode: state.newNode,
    slow: state.slow,
    fast: state.fast,
    detached: [...state.detached],
    traversed: [...state.traversed],
    deleted: [...state.deleted],
    allocated: [...state.allocated],
    reconnected: [...state.reconnected],
    result: state.result,
    resultIndex: state.resultIndex,
    recursiveDepth: state.recursiveDepth,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
  };
}

function runtimeNode(state: RuntimeState, id: string | null): RuntimeNode | undefined {
  return id ? state.nodes.find((node) => node.id === id) : undefined;
}

function successor(state: RuntimeState, id: string | null): string | null {
  return runtimeNode(state, id)?.next ?? null;
}

function appendUnique(values: string[], id: string | null) {
  if (id && !values.includes(id)) values.push(id);
}

function resolveConfig(input: LinkedListConfig): ResolvedConfig {
  if (!LINKED_LIST_OPERATIONS.some((candidate) => candidate.id === input.operation)) {
    throw new Error(`Unsupported linked-list operation: ${String(input.operation)}`);
  }
  if (!Array.isArray(input.values)) throw new TypeError('Linked-list values must be an array.');
  if (input.values.length > LINKED_LIST_INPUT_MAX) {
    throw new RangeError(
      `Use at most ${LINKED_LIST_INPUT_MAX} nodes so every pointer stays visible.`
    );
  }
  if (input.values.some((value) => !Number.isSafeInteger(value))) {
    throw new TypeError('Linked-list values must be safe integers.');
  }
  const integer = (value: number | undefined, fallback: number, label: string) => {
    const resolved = value ?? fallback;
    if (!Number.isSafeInteger(resolved)) throw new TypeError(`${label} must be a safe integer.`);
    return resolved;
  };
  const defaultPosition = Math.min(2, Math.max(0, input.values.length - 1));
  const position = integer(input.position, defaultPosition, 'Position');
  const target = integer(input.target, input.values[defaultPosition] ?? 0, 'Target');
  const newValue = integer(input.newValue, 99, 'New value');
  const cycleEntry = input.cycleEntry ?? null;
  if (cycleEntry !== null && !Number.isInteger(cycleEntry)) {
    throw new TypeError('Cycle entry must be a zero-based integer or null.');
  }
  if (cycleEntry !== null && (cycleEntry < 0 || cycleEntry >= input.values.length)) {
    throw new RangeError('Cycle entry must reference an existing node.');
  }
  if (input.operation !== 'detect-cycle' && cycleEntry !== null) {
    throw new RangeError('Only cycle detection accepts a cyclic input list.');
  }

  const requiresExistingPosition = ['access', 'insert-after-known', 'delete-after-known'].includes(
    input.operation
  );
  if (requiresExistingPosition && (position < 0 || position >= input.values.length)) {
    throw new RangeError('Position must reference an existing node.');
  }
  if (input.operation === 'delete-after-known' && position >= input.values.length - 1) {
    throw new RangeError('The known predecessor must have a successor to delete.');
  }
  if (
    input.operation === 'insert-at-position' &&
    (position < 0 || position > input.values.length)
  ) {
    throw new RangeError('Insertion position must be between zero and the list length.');
  }

  return {
    operation: input.operation,
    values: [...input.values],
    position,
    target,
    newValue,
    maintainTail: input.maintainTail ?? false,
    cycleEntry
  };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const nodes: RuntimeNode[] = config.values.map((value, index) => ({
    id: nodeId(index),
    value,
    next: index + 1 < config.values.length ? nodeId(index + 1) : null,
    status: 'live'
  }));
  const cycleEntryId = config.cycleEntry === null ? null : nodeId(config.cycleEntry);
  if (nodes.length && cycleEntryId) nodes[nodes.length - 1].next = cycleEntryId;
  return {
    nodes,
    head: nodes[0]?.id ?? null,
    tail: config.maintainTail ? (nodes.at(-1)?.id ?? null) : null,
    current: null,
    previous: null,
    next: null,
    newNode: null,
    slow: null,
    fast: null,
    detached: [],
    traversed: [],
    deleted: [],
    allocated: [],
    reconnected: [],
    result: null,
    resultIndex: null,
    recursiveDepth: 0,
    maintainTail: config.maintainTail,
    cycleEntry: cycleEntryId,
    cumulativeWork: {},
    operationCount: 0
  };
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

const NODE_SOURCE: Record<SupportedLanguage, SourceTemplateLine[]> = {
  c: [
    [undefined, '#include <stdbool.h>'],
    [undefined, '#include <stddef.h>'],
    [undefined, '#include <stdlib.h>'],
    [undefined, 'typedef struct Node {'],
    [undefined, '  int value;'],
    [undefined, '  struct Node *next;'],
    [undefined, '} Node;'],
    [undefined, '']
  ],
  cpp: [
    [undefined, '#include <cstddef>'],
    [undefined, 'struct Node {'],
    [undefined, '  int value;'],
    [undefined, '  Node* next;'],
    [undefined, '};'],
    [undefined, '']
  ],
  java: [
    [undefined, 'final class LinkedListOps {'],
    [undefined, '  static final class Node {'],
    [undefined, '    int value;'],
    [undefined, '    Node next;'],
    [undefined, '    Node(int value) { this.value = value; }'],
    [undefined, '  }'],
    [undefined, '  static final class ListState { Node head, tail; }'],
    [undefined, '']
  ],
  python: [
    [undefined, 'class Node:'],
    [undefined, '    def __init__(self, value):'],
    [undefined, '        self.value = value'],
    [undefined, '        self.next = None'],
    [undefined, ''],
    [undefined, 'class ListState:'],
    [undefined, '    def __init__(self):'],
    [undefined, '        self.head = None'],
    [undefined, '        self.tail = None'],
    [undefined, '']
  ]
};

function operationSource(config: ResolvedConfig): QuadSourceLine[] {
  switch (config.operation) {
    case 'access':
      return [
        quad(
          undefined,
          'Node* access(Node* head, int position) {',
          'Node* access(Node* head, int position) {',
          '  static Node access(Node head, int position) {',
          'def access(head, position):'
        ),
        quad(
          'access-init',
          '  Node* current = head;',
          '  Node* current = head;',
          '    Node current = head;',
          '    current = head'
        ),
        quad(
          'access-check',
          '  for (int i = 0; i < position && current != NULL; ++i) {',
          '  for (int i = 0; i < position && current != nullptr; ++i) {',
          '    for (int i = 0; i < position && current != null; i++) {',
          '    for _ in range(position):'
        ),
        quad(
          'access-advance',
          '    current = current->next;',
          '    current = current->next;',
          '      current = current.next;',
          '        if current is None: break\n        current = current.next'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'access-return',
          '  return current;',
          '  return current;',
          '    return current;',
          '    return current'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'traverse':
      return [
        quad(
          undefined,
          'void traverse(Node* head, void (*visit)(int)) {',
          'template<class Visitor> void traverse(Node* head, Visitor visit) {',
          '  static void traverse(Node head, java.util.function.IntConsumer visit) {',
          'def traverse(head, visit):'
        ),
        quad(
          'traverse-init',
          '  Node* current = head;',
          '  Node* current = head;',
          '    Node current = head;',
          '    current = head'
        ),
        quad(
          'traverse-check',
          '  while (current != NULL) {',
          '  while (current != nullptr) {',
          '    while (current != null) {',
          '    while current is not None:'
        ),
        quad(
          'traverse-visit',
          '    visit(current->value);',
          '    visit(current->value);',
          '      visit.accept(current.value);',
          '        visit(current.value)'
        ),
        quad(
          'traverse-advance',
          '    current = current->next;',
          '    current = current->next;',
          '      current = current.next;',
          '        current = current.next'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad('traverse-return', '}', '}', '  }', '    return None')
      ];
    case 'search':
      return [
        quad(
          undefined,
          'int search(Node* head, int target) {',
          'int search(Node* head, int target) {',
          '  static int search(Node head, int target) {',
          'def search(head, target):'
        ),
        quad(
          'search-init',
          '  Node* current = head; int index = 0;',
          '  Node* current = head; int index = 0;',
          '    Node current = head; int index = 0;',
          '    current, index = head, 0'
        ),
        quad(
          'search-check',
          '  while (current != NULL) {',
          '  while (current != nullptr) {',
          '    while (current != null) {',
          '    while current is not None:'
        ),
        quad(
          'search-compare',
          '    if (current->value == target)',
          '    if (current->value == target)',
          '      if (current.value == target)',
          '        if current.value == target:'
        ),
        quad(
          'search-return-found',
          '      return index;',
          '      return index;',
          '        return index;',
          '            return index'
        ),
        quad(
          'search-advance',
          '    current = current->next; ++index;',
          '    current = current->next; ++index;',
          '      current = current.next; index++;',
          '        current, index = current.next, index + 1'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'search-return-missing',
          '  return -1;',
          '  return -1;',
          '    return -1;',
          '    return -1'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert-head':
      return [
        quad(
          undefined,
          'Node* insertHead(Node* head, int value) {',
          'Node* insertHead(Node* head, int value) {',
          '  static Node insertHead(Node head, int value) {',
          'def insert_head(head, value):'
        ),
        quad(
          'insert-head-allocate',
          '  Node* newNode = malloc(sizeof *newNode); newNode->value = value;',
          '  Node* newNode = new Node{value, nullptr};',
          '    Node newNode = new Node(value);',
          '    newNode = Node(value)'
        ),
        quad(
          'insert-head-link',
          '  newNode->next = head;',
          '  newNode->next = head;',
          '    newNode.next = head;',
          '    newNode.next = head'
        ),
        quad(
          'insert-head-move-head',
          '  head = newNode;',
          '  head = newNode;',
          '    head = newNode;',
          '    head = newNode'
        ),
        quad(
          'insert-head-return',
          '  return head;',
          '  return head;',
          '    return head;',
          '    return head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert-tail':
      if (config.maintainTail) {
        return [
          quad(
            undefined,
            'void insertTail(Node** head, Node** tail, int value) {',
            'void insertTail(Node*& head, Node*& tail, int value) {',
            '  static void insertTail(ListState list, int value) {',
            'def insert_tail(linked_list, value):'
          ),
          quad(
            'insert-tail-allocate',
            '  Node* newNode = malloc(sizeof *newNode); *newNode = (Node){value, NULL};',
            '  Node* newNode = new Node{value, nullptr};',
            '    Node newNode = new Node(value);',
            '    newNode = Node(value)'
          ),
          quad(
            'insert-tail-empty',
            '  if (*head == NULL) { *head = *tail = newNode; return; }',
            '  if (head == nullptr) { head = tail = newNode; return; }',
            '    if (list.head == null) { list.head = list.tail = newNode; return; }',
            '    if linked_list.head is None:\n        linked_list.head = linked_list.tail = newNode\n        return'
          ),
          quad(
            'insert-tail-link',
            '  (*tail)->next = newNode;',
            '  tail->next = newNode;',
            '    list.tail.next = newNode;',
            '    linked_list.tail.next = newNode'
          ),
          quad(
            'insert-tail-move-tail',
            '  *tail = newNode;',
            '  tail = newNode;',
            '    list.tail = newNode;',
            '    linked_list.tail = newNode'
          ),
          quad('insert-tail-return', '}', '}', '  }', '    return None')
        ];
      }
      return [
        quad(
          undefined,
          'Node* insertTail(Node* head, int value) {',
          'Node* insertTail(Node* head, int value) {',
          '  static Node insertTail(Node head, int value) {',
          'def insert_tail(head, value):'
        ),
        quad(
          'insert-tail-allocate',
          '  Node* newNode = malloc(sizeof *newNode); *newNode = (Node){value, NULL};',
          '  Node* newNode = new Node{value, nullptr};',
          '    Node newNode = new Node(value);',
          '    newNode = Node(value)'
        ),
        quad(
          'insert-tail-empty',
          '  if (head == NULL) return newNode;',
          '  if (head == nullptr) return newNode;',
          '    if (head == null) return newNode;',
          '    if head is None: return newNode'
        ),
        quad(
          'insert-tail-init-current',
          '  Node* current = head;',
          '  Node* current = head;',
          '    Node current = head;',
          '    current = head'
        ),
        quad(
          'insert-tail-check-next',
          '  while (current->next != NULL) {',
          '  while (current->next != nullptr) {',
          '    while (current.next != null) {',
          '    while current.next is not None:'
        ),
        quad(
          'insert-tail-advance',
          '    current = current->next;',
          '    current = current->next;',
          '      current = current.next;',
          '        current = current.next'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'insert-tail-link',
          '  current->next = newNode;',
          '  current->next = newNode;',
          '    current.next = newNode;',
          '    current.next = newNode'
        ),
        quad(
          'insert-tail-return',
          '  return head;',
          '  return head;',
          '    return head;',
          '    return head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert-after-known':
      return [
        quad(
          undefined,
          'Node* insertAfter(Node* known, int value) {',
          'Node* insertAfter(Node* known, int value) {',
          '  static Node insertAfter(Node known, int value) {',
          'def insert_after(known, value):'
        ),
        quad(
          'insert-after-allocate',
          '  Node* newNode = malloc(sizeof *newNode); newNode->value = value;',
          '  Node* newNode = new Node{value, nullptr};',
          '    Node newNode = new Node(value);',
          '    newNode = Node(value)'
        ),
        quad(
          'insert-after-preserve',
          '  newNode->next = known->next;',
          '  newNode->next = known->next;',
          '    newNode.next = known.next;',
          '    newNode.next = known.next'
        ),
        quad(
          'insert-after-link',
          '  known->next = newNode;',
          '  known->next = newNode;',
          '    known.next = newNode;',
          '    known.next = newNode'
        ),
        quad(
          'insert-after-return',
          '  return newNode;',
          '  return newNode;',
          '    return newNode;',
          '    return newNode'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert-at-position':
      return [
        quad(
          undefined,
          'Node* insertAt(Node* head, int position, int value) {',
          'Node* insertAt(Node* head, int position, int value) {',
          '  static Node insertAt(Node head, int position, int value) {',
          'def insert_at(head, position, value):'
        ),
        quad(
          'insert-position-head',
          '  if (position == 0) return insertHead(head, value);',
          '  if (position == 0) return insertHead(head, value);',
          '    if (position == 0) return insertHead(head, value);',
          '    if position == 0: return insert_head(head, value)'
        ),
        quad(
          'insert-position-init',
          '  Node* previous = head;',
          '  Node* previous = head;',
          '    Node previous = head;',
          '    previous = head'
        ),
        quad(
          'insert-position-check',
          '  for (int i = 1; i < position; ++i) {',
          '  for (int i = 1; i < position; ++i) {',
          '    for (int i = 1; i < position; i++) {',
          '    for _ in range(1, position):'
        ),
        quad(
          'insert-position-advance',
          '    previous = previous->next;',
          '    previous = previous->next;',
          '      previous = previous.next;',
          '        previous = previous.next'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'insert-position-allocate',
          '  Node* newNode = malloc(sizeof *newNode); newNode->value = value;',
          '  Node* newNode = new Node{value, nullptr};',
          '    Node newNode = new Node(value);',
          '    newNode = Node(value)'
        ),
        quad(
          'insert-position-preserve',
          '  newNode->next = previous->next;',
          '  newNode->next = previous->next;',
          '    newNode.next = previous.next;',
          '    newNode.next = previous.next'
        ),
        quad(
          'insert-position-link',
          '  previous->next = newNode;',
          '  previous->next = newNode;',
          '    previous.next = newNode;',
          '    previous.next = newNode'
        ),
        quad(
          'insert-position-return',
          '  return head;',
          '  return head;',
          '    return head;',
          '    return head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete-head':
      return [
        quad(
          undefined,
          'Node* deleteHead(Node* head) {',
          'Node* deleteHead(Node* head) {',
          '  static Node deleteHead(Node head) {',
          'def delete_head(head):'
        ),
        quad(
          'delete-head-empty',
          '  if (head == NULL) return NULL;',
          '  if (head == nullptr) return nullptr;',
          '    if (head == null) return null;',
          '    if head is None: return None'
        ),
        quad(
          'delete-head-save',
          '  Node* detached = head;',
          '  Node* detached = head;',
          '    Node detached = head;',
          '    detached = head'
        ),
        quad(
          'delete-head-advance',
          '  head = head->next;',
          '  head = head->next;',
          '    head = head.next;',
          '    head = head.next'
        ),
        quad(
          'delete-head-detach',
          '  free(detached);',
          '  delete detached;',
          '    detached.next = null;',
          '    detached.next = None'
        ),
        quad(
          'delete-head-return',
          '  return head;',
          '  return head;',
          '    return head;',
          '    return head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete-tail':
      return [
        quad(
          undefined,
          'Node* deleteTail(Node* head) {',
          'Node* deleteTail(Node* head) {',
          '  static Node deleteTail(Node head) {',
          'def delete_tail(head):'
        ),
        quad(
          'delete-tail-empty',
          '  if (head == NULL) return NULL;',
          '  if (head == nullptr) return nullptr;',
          '    if (head == null) return null;',
          '    if head is None: return None'
        ),
        quad(
          'delete-tail-single',
          '  if (head->next == NULL) { free(head); return NULL; }',
          '  if (head->next == nullptr) { delete head; return nullptr; }',
          '    if (head.next == null) return null;',
          '    if head.next is None: return None'
        ),
        quad(
          'delete-tail-init',
          '  Node* previous = head;',
          '  Node* previous = head;',
          '    Node previous = head;',
          '    previous = head'
        ),
        quad(
          'delete-tail-check',
          '  while (previous->next->next != NULL) {',
          '  while (previous->next->next != nullptr) {',
          '    while (previous.next.next != null) {',
          '    while previous.next.next is not None:'
        ),
        quad(
          'delete-tail-advance',
          '    previous = previous->next;',
          '    previous = previous->next;',
          '      previous = previous.next;',
          '        previous = previous.next'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'delete-tail-save',
          '  Node* detached = previous->next;',
          '  Node* detached = previous->next;',
          '    Node detached = previous.next;',
          '    detached = previous.next'
        ),
        quad(
          'delete-tail-unlink',
          '  previous->next = NULL;',
          '  previous->next = nullptr;',
          '    previous.next = null;',
          '    previous.next = None'
        ),
        quad(
          'delete-tail-detach',
          '  free(detached);',
          '  delete detached;',
          '    detached.next = null;',
          '    detached.next = None'
        ),
        quad(
          'delete-tail-return',
          '  return head;',
          '  return head;',
          '    return head;',
          '    return head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete-by-value':
      return [
        quad(
          undefined,
          'Node* deleteValue(Node* head, int target) {',
          'Node* deleteValue(Node* head, int target) {',
          '  static Node deleteValue(Node head, int target) {',
          'def delete_value(head, target):'
        ),
        quad(
          'delete-value-init',
          '  Node *previous = NULL, *current = head;',
          '  Node *previous = nullptr, *current = head;',
          '    Node previous = null, current = head;',
          '    previous, current = None, head'
        ),
        quad(
          'delete-value-check',
          '  while (current != NULL) {',
          '  while (current != nullptr) {',
          '    while (current != null) {',
          '    while current is not None:'
        ),
        quad(
          'delete-value-compare',
          '    if (current->value == target) break;',
          '    if (current->value == target) break;',
          '      if (current.value == target) break;',
          '        if current.value == target: break'
        ),
        quad(
          'delete-value-advance',
          '    previous = current; current = current->next;',
          '    previous = current; current = current->next;',
          '      previous = current; current = current.next;',
          '        previous, current = current, current.next'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'delete-value-missing',
          '  if (current == NULL) return head;',
          '  if (current == nullptr) return head;',
          '    if (current == null) return head;',
          '    if current is None: return head'
        ),
        quad(
          'delete-value-head',
          '  if (previous == NULL) head = current->next;',
          '  if (previous == nullptr) head = current->next;',
          '    if (previous == null) head = current.next;',
          '    if previous is None: head = current.next'
        ),
        quad(
          'delete-value-unlink',
          '  else previous->next = current->next;',
          '  else previous->next = current->next;',
          '    else previous.next = current.next;',
          '    else: previous.next = current.next'
        ),
        quad(
          'delete-value-detach',
          '  free(current);',
          '  delete current;',
          '    current.next = null;',
          '    current.next = None'
        ),
        quad(
          'delete-value-return',
          '  return head;',
          '  return head;',
          '    return head;',
          '    return head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete-after-known':
      return [
        quad(
          undefined,
          'Node* deleteAfter(Node* known) {',
          'Node* deleteAfter(Node* known) {',
          '  static Node deleteAfter(Node known) {',
          'def delete_after(known):'
        ),
        quad(
          'delete-after-save',
          '  Node* detached = known->next;',
          '  Node* detached = known->next;',
          '    Node detached = known.next;',
          '    detached = known.next'
        ),
        quad(
          'delete-after-unlink',
          '  known->next = detached->next;',
          '  known->next = detached->next;',
          '    known.next = detached.next;',
          '    known.next = detached.next'
        ),
        quad(
          'delete-after-detach',
          '  free(detached);',
          '  delete detached;',
          '    detached.next = null;',
          '    detached.next = None'
        ),
        quad(
          'delete-after-return',
          '  return known;',
          '  return known;',
          '    return known;',
          '    return known'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'reverse-iterative':
      return [
        quad(
          undefined,
          'Node* reverse(Node* head) {',
          'Node* reverse(Node* head) {',
          '  static Node reverse(Node head) {',
          'def reverse(head):'
        ),
        quad(
          'reverse-iterative-init',
          '  Node *previous = NULL, *current = head;',
          '  Node *previous = nullptr, *current = head;',
          '    Node previous = null, current = head;',
          '    previous, current = None, head'
        ),
        quad(
          'reverse-iterative-check',
          '  while (current != NULL) {',
          '  while (current != nullptr) {',
          '    while (current != null) {',
          '    while current is not None:'
        ),
        quad(
          'reverse-iterative-save',
          '    Node* next = current->next;',
          '    Node* next = current->next;',
          '      Node next = current.next;',
          '        next_node = current.next'
        ),
        quad(
          'reverse-iterative-link',
          '    current->next = previous;',
          '    current->next = previous;',
          '      current.next = previous;',
          '        current.next = previous'
        ),
        quad(
          'reverse-iterative-previous',
          '    previous = current;',
          '    previous = current;',
          '      previous = current;',
          '        previous = current'
        ),
        quad(
          'reverse-iterative-current',
          '    current = next;',
          '    current = next;',
          '      current = next;',
          '        current = next_node'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'reverse-iterative-return',
          '  return previous;',
          '  return previous;',
          '    return previous;',
          '    return previous'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'reverse-recursive':
      return [
        quad(
          undefined,
          'Node* reverseRecursive(Node* head) {',
          'Node* reverseRecursive(Node* head) {',
          '  static Node reverseRecursive(Node head) {',
          'def reverse_recursive(head):'
        ),
        quad(
          'reverse-recursive-base',
          '  if (head == NULL || head->next == NULL) return head;',
          '  if (head == nullptr || head->next == nullptr) return head;',
          '    if (head == null || head.next == null) return head;',
          '    if head is None or head.next is None: return head'
        ),
        quad(
          'reverse-recursive-descend',
          '  Node* newHead = reverseRecursive(head->next);',
          '  Node* newHead = reverseRecursive(head->next);',
          '    Node newHead = reverseRecursive(head.next);',
          '    new_head = reverse_recursive(head.next)'
        ),
        quad(
          'reverse-recursive-link',
          '  head->next->next = head;',
          '  head->next->next = head;',
          '    head.next.next = head;',
          '    head.next.next = head'
        ),
        quad(
          'reverse-recursive-clear',
          '  head->next = NULL;',
          '  head->next = nullptr;',
          '    head.next = null;',
          '    head.next = None'
        ),
        quad(
          'reverse-recursive-return',
          '  return newHead;',
          '  return newHead;',
          '    return newHead;',
          '    return new_head'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'detect-cycle':
      return [
        quad(
          undefined,
          'bool hasCycle(Node* head) {',
          'bool hasCycle(Node* head) {',
          '  static boolean hasCycle(Node head) {',
          'def has_cycle(head):'
        ),
        quad(
          'cycle-init',
          '  Node *slow = head, *fast = head;',
          '  Node *slow = head, *fast = head;',
          '    Node slow = head, fast = head;',
          '    slow = fast = head'
        ),
        quad(
          'cycle-check',
          '  while (fast != NULL && fast->next != NULL) {',
          '  while (fast != nullptr && fast->next != nullptr) {',
          '    while (fast != null && fast.next != null) {',
          '    while fast is not None and fast.next is not None:'
        ),
        quad(
          'cycle-move-slow',
          '    slow = slow->next;',
          '    slow = slow->next;',
          '      slow = slow.next;',
          '        slow = slow.next'
        ),
        quad(
          'cycle-move-fast',
          '    fast = fast->next->next;',
          '    fast = fast->next->next;',
          '      fast = fast.next.next;',
          '        fast = fast.next.next'
        ),
        quad(
          'cycle-compare',
          '    if (slow == fast) return true;',
          '    if (slow == fast) return true;',
          '      if (slow == fast) return true;',
          '        if slow is fast: return True'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'cycle-return-false',
          '  return false;',
          '  return false;',
          '    return false;',
          '    return False'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
  }
}

function sourceLines(config: ResolvedConfig, language: SupportedLanguage): SourceLine[] {
  const body = operationSource(config).map((line): SourceTemplateLine => [
    line.semantic,
    line[language]
  ]);
  const closing: SourceTemplateLine[] = language === 'java' ? [[undefined, '}']] : [];
  return [...NODE_SOURCE[language], ...body, ...closing].map(([semantic, text], index) => ({
    id: `${config.operation}-${language}-${index + 1}`,
    number: index + 1,
    text,
    ...(semantic ? { semanticOperationId: semantic } : {})
  }));
}

function findCase(operationId: LinkedListOperation, caseId: string): LinkedListComplexityCase {
  const selected = getLinkedListOperationMetadata(operationId).cases.find(
    (candidate) => candidate.id === caseId
  );
  if (!selected) throw new Error(`Missing linked-list complexity case: ${caseId}`);
  return selected;
}

function deriveComplexity(selected: LinkedListComplexityCase): string[] {
  if (selected.timeComplexity === 'O(1)') {
    return [
      selected.description,
      'The number of counted pointer operations stays bounded as n grows.',
      'A bounded primitive count simplifies to O(1).'
    ];
  }
  if (selected.auxiliarySpace === 'O(n)') {
    return [
      selected.description,
      'At most one bounded unit of work and one stack frame is added per node.',
      'n nodes therefore require O(n) time and O(n) auxiliary call-stack space.'
    ];
  }
  return [
    selected.description,
    'The traversal advances through at most n next references.',
    'Fixed work per visited node sums to O(n), while a fixed pointer set uses O(1) space.'
  ];
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const firstTargetIndex = config.values.indexOf(config.target);
  let caseId: string;
  switch (config.operation) {
    case 'access':
      caseId = config.position === 0 ? 'access-head' : 'access-position';
      break;
    case 'traverse':
      caseId = 'traverse-all';
      break;
    case 'search':
      caseId =
        firstTargetIndex === 0
          ? 'search-best'
          : firstTargetIndex > 0 && firstTargetIndex < config.values.length - 1
            ? 'search-average'
            : 'search-worst';
      break;
    case 'insert-head':
      caseId = 'insert-head-direct';
      break;
    case 'insert-tail':
      caseId = config.maintainTail ? 'insert-tail-with-tail' : 'insert-tail-without-tail';
      break;
    case 'insert-after-known':
      caseId = 'insert-after-known-direct';
      break;
    case 'insert-at-position':
      caseId = config.position === 0 ? 'insert-position-head' : 'insert-position-traverse';
      break;
    case 'delete-head':
      caseId = 'delete-head-direct';
      break;
    case 'delete-tail':
      caseId = 'delete-tail-singly';
      break;
    case 'delete-by-value':
      caseId =
        firstTargetIndex === 0
          ? 'delete-value-best'
          : firstTargetIndex > 0 && firstTargetIndex < config.values.length - 1
            ? 'delete-value-average'
            : 'delete-value-worst';
      break;
    case 'delete-after-known':
      caseId = 'delete-after-known-direct';
      break;
    case 'reverse-iterative':
      caseId = 'reverse-iterative-all';
      break;
    case 'reverse-recursive':
      caseId = 'reverse-recursive-all';
      break;
    case 'detect-cycle':
      caseId = config.cycleEntry === null ? 'cycle-absent' : 'cycle-present';
      break;
  }
  const selected = findCase(config.operation, caseId);
  return { ...selected, derivation: deriveComplexity(selected) };
}

const pointerFields = [
  'head',
  'tail',
  'current',
  'previous',
  'next',
  'newNode',
  'slow',
  'fast'
] as const;

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const nodes: TraceEntity[] = state.nodes.map((node) => ({
    id: node.id,
    type: 'node',
    label: node.id,
    value: node.value,
    metadata: {
      next: node.next,
      status: node.status,
      isHead: state.head === node.id,
      isTail: state.tail === node.id,
      traversed: state.traversed.includes(node.id),
      detached: state.detached.includes(node.id),
      deleted: state.deleted.includes(node.id),
      allocated: state.allocated.includes(node.id),
      reconnected: state.reconnected.includes(node.id)
    }
  }));
  const pointers: TraceEntity[] = pointerFields.map((pointer) => ({
    id: `pointer-${pointer}`,
    type: 'pointer',
    label: pointer,
    value: state[pointer],
    metadata: { target: state[pointer] }
  }));
  return [
    ...nodes,
    ...pointers,
    {
      id: 'operation-count',
      type: 'variable',
      label: 'exact operations',
      value: state.operationCount
    }
  ];
}

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  const mutations: TraceMutation[] = [];
  for (const pointer of pointerFields) {
    if (before[pointer] !== after[pointer]) {
      mutations.push({
        entityId: `pointer-${pointer}`,
        property: 'target',
        previousValue: before[pointer],
        nextValue: after[pointer],
        animation: 'move'
      });
    }
  }

  const beforeNodes = new Map(
    ((before.nodes as unknown as LinkedListNodeState[]) ?? []).map((node) => [node.id, node])
  );
  const afterNodes = (after.nodes as unknown as LinkedListNodeState[]) ?? [];
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
    if (prior.next !== node.next) {
      mutations.push({
        entityId: node.id,
        property: 'next',
        previousValue: prior.next,
        nextValue: node.next,
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

  const otherKeys = [
    'detached',
    'traversed',
    'deleted',
    'allocated',
    'reconnected',
    'result',
    'resultIndex',
    'recursiveDepth',
    'operationCount',
    'cumulativeWork'
  ];
  for (const key of otherKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      mutations.push({
        entityId: key,
        property: 'value',
        previousValue: before[key],
        nextValue: after[key],
        animation: key === 'traversed' ? 'activate' : 'highlight'
      });
    }
  }
  return mutations;
}

function mistakeValue(mistake: LinkedListMistakeMetadata): TraceValue {
  return {
    prompt: mistake.prompt,
    wrongAnswer: mistake.wrongAnswer,
    correctAnswer: mistake.correctAnswer,
    explanation: mistake.explanation,
    tag: mistake.tag
  };
}

function makePrediction(
  id: string,
  prompt: string,
  type: PredictionChallenge['type'],
  correctAnswer: TraceValue,
  explanation: string,
  tag: string,
  wrongAnswer: TraceValue
): { prediction: PredictionChallenge; mistake: LinkedListMistakeMetadata } {
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

    const localPointerCount = [
      state.current,
      state.previous,
      state.next,
      state.newNode,
      state.slow,
      state.fast
    ].filter(Boolean).length;
    const auxiliaryCurrent = Math.max(
      0,
      config.operation === 'reverse-recursive'
        ? state.recursiveDepth
        : Math.min(6, localPointerCount)
    );
    const outputCurrent =
      config.operation === 'traverse' ? state.traversed.length : state.result === null ? 0 : 1;
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
        auxiliary: { current: auxiliaryCurrent, peak: peakAuxiliary, unit: 'pointer/frame slots' },
        output: { current: outputCurrent, peak: peakOutput, unit: 'reported values' },
        callStackDepth: config.operation === 'reverse-recursive' ? state.recursiveDepth : 1
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
    const visualFocus = [
      state.current,
      state.previous,
      state.next,
      state.newNode,
      state.slow,
      state.fast
    ].filter((id): id is string => Boolean(id));

    steps.push({
      id: `linked-list-${config.operation}-${steps.length}`,
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
      visualFocus: [...new Set(visualFocus)],
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
        maintainTail: config.maintainTail,
        ...(checkpoint ? { mistake: mistakeValue(checkpoint.mistake) } : {})
      }
    });
  };
  return { state, steps, add };
}

function markDeleted(state: RuntimeState, id: string) {
  const node = runtimeNode(state, id);
  if (!node) return;
  node.status = 'deleted';
  node.next = null;
  appendUnique(state.detached, id);
  appendUnique(state.deleted, id);
}

function allocateNode(state: RuntimeState, value: number): RuntimeNode {
  const node: RuntimeNode = {
    id: nodeId(state.nodes.length),
    value,
    next: null,
    status: 'allocated'
  };
  state.nodes.push(node);
  state.newNode = node.id;
  appendUnique(state.allocated, node.id);
  return node;
}

function runAccess(builder: TraceBuilder, config: ResolvedConfig) {
  const expected = nodeId(config.position);
  const checkpoint = makePrediction(
    `linked-list-lab:access:${config.position}:checkpoint`,
    `Which node reference is returned for position ${config.position}?`,
    'text',
    expected,
    `Starting at head and following next ${config.position} time${config.position === 1 ? '' : 's'} reaches ${expected}.`,
    'node-vs-value',
    String(config.values[config.position])
  );
  builder.add(
    'access-init',
    'Start at head',
    'current receives the head reference before any traversal.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.current = state.head;
    },
    checkpoint
  );
  for (let index = 0; index < config.position; index++) {
    builder.add(
      'access-check',
      `Check traversal index ${index}`,
      `${index} is before position ${config.position}, so one next link must be followed.`,
      { comparison: 2, 'loop-iteration': 1 }
    );
    builder.add(
      'access-advance',
      `Advance from ${builder.state.current}`,
      'A singly linked node exposes only its next reference.',
      { 'pointer-read': 1, 'pointer-write': 2 },
      (state) => {
        const oldCurrent = state.current;
        state.previous = oldCurrent;
        state.next = successor(state, oldCurrent);
        appendUnique(state.traversed, oldCurrent);
        state.current = state.next;
      }
    );
  }
  builder.add(
    'access-check',
    'Requested position reached',
    `The traversal has completed ${config.position} next-reference hop${config.position === 1 ? '' : 's'}.`,
    { comparison: 1 }
  );
  builder.add(
    'access-return',
    `Return ${expected}`,
    `Access returns the node reference ${expected}, whose value is ${config.values[config.position]}.`,
    { return: 1 },
    (state) => {
      appendUnique(state.traversed, state.current);
      state.result = state.current;
      state.resultIndex = config.position;
    }
  );
}

function runTraverse(builder: TraceBuilder, config: ResolvedConfig) {
  const checkpoint = makePrediction(
    'linked-list-lab:traverse:checkpoint',
    'How many nodes will this complete traversal visit?',
    'numeric',
    config.values.length,
    `The acyclic list contains ${config.values.length} reachable node${config.values.length === 1 ? '' : 's'}.`,
    'loop-boundary',
    Math.max(0, config.values.length - 1)
  );
  builder.add(
    'traverse-init',
    'Start at head',
    'current begins at the first reachable node.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.current = state.head;
      state.result = [];
    },
    checkpoint
  );
  while (builder.state.current !== null) {
    const current = builder.state.current;
    builder.add(
      'traverse-check',
      `Check ${current}`,
      `${current} is not null, so its value is visited.`,
      { comparison: 1, 'loop-iteration': 1 }
    );
    builder.add(
      'traverse-visit',
      `Visit ${current}`,
      `Read ${current}'s value exactly once.`,
      { read: 1, 'node-inspection': 1 },
      (state) => {
        appendUnique(state.traversed, current);
        state.result = state.traversed.map((id) => runtimeNode(state, id)?.value ?? 0);
      }
    );
    builder.add(
      'traverse-advance',
      `Follow ${current}.next`,
      `current moves to ${successor(builder.state, current) ?? 'null'}.`,
      { 'pointer-read': 1, 'pointer-write': 3 },
      (state) => {
        state.previous = current;
        state.next = successor(state, current);
        state.current = state.next;
      }
    );
  }
  builder.add(
    'traverse-check',
    'Reach null',
    'current is null, so the loop stops without reading another node.',
    { comparison: 1 }
  );
  builder.add(
    'traverse-return',
    'Traversal complete',
    `Exactly ${config.values.length} nodes were visited in list order.`,
    { return: 1 }
  );
}

function runSearch(builder: TraceBuilder, config: ResolvedConfig) {
  const foundIndex = config.values.indexOf(config.target);
  const checkpoint = makePrediction(
    `linked-list-lab:search:${config.target}:checkpoint`,
    `At which zero-based position is ${config.target} first found? Enter -1 if absent.`,
    'numeric',
    foundIndex,
    foundIndex < 0
      ? `${config.target} is absent, so every node is compared before -1 is returned.`
      : `The first ${config.target} is stored at position ${foundIndex}.`,
    'node-vs-value',
    config.target
  );
  builder.add(
    'search-init',
    'Initialize search cursor',
    'current starts at head and the logical index starts at zero.',
    { 'pointer-read': 1, 'pointer-write': 1, write: 1 },
    (state) => {
      state.current = state.head;
    },
    checkpoint
  );
  let index = 0;
  while (builder.state.current !== null) {
    const current = builder.state.current;
    const value = runtimeNode(builder.state, current)?.value;
    builder.add(
      'search-check',
      `Check cursor at position ${index}`,
      `${current} is reachable, so its value can be compared.`,
      { comparison: 1, 'loop-iteration': 1 }
    );
    builder.add(
      'search-compare',
      `Compare ${String(value)} with ${config.target}`,
      `${String(value)} ${value === config.target ? 'matches' : 'does not match'} the target.`,
      { read: 1, comparison: 1, 'node-inspection': 1 },
      (state) => appendUnique(state.traversed, current)
    );
    if (value === config.target) {
      builder.add(
        'search-return-found',
        `Return position ${index}`,
        'Search stops at the first matching value.',
        { return: 1 },
        (state) => {
          state.result = index;
          state.resultIndex = index;
        }
      );
      return;
    }
    builder.add(
      'search-advance',
      `Advance beyond ${current}`,
      'Both current and the logical position advance once.',
      { 'pointer-read': 1, 'pointer-write': 3, write: 1 },
      (state) => {
        state.previous = current;
        state.next = successor(state, current);
        state.current = state.next;
      }
    );
    index++;
  }
  builder.add('search-check', 'Reach null', 'There is no remaining node to compare.', {
    comparison: 1
  });
  builder.add(
    'search-return-missing',
    'Return -1',
    `${config.target} does not occur in the list.`,
    { return: 1 },
    (state) => {
      state.result = -1;
      state.resultIndex = -1;
    }
  );
}

function runInsertHead(builder: TraceBuilder, config: ResolvedConfig) {
  const newId = nodeId(config.values.length);
  const checkpoint = makePrediction(
    'linked-list-lab:insert-head:checkpoint',
    'Which node becomes head after the safe pointer updates?',
    'text',
    newId,
    `${newId}.next must preserve the old head before head changes to ${newId}.`,
    'pointer-update-order',
    builder.state.head
  );
  builder.add(
    'insert-head-allocate',
    `Allocate ${newId}`,
    `Create ${newId} with value ${config.newValue} and a null next reference.`,
    { allocation: 1, write: 1, 'pointer-write': 1 },
    (state) => {
      allocateNode(state, config.newValue);
    },
    checkpoint
  );
  builder.add(
    'insert-head-link',
    'Preserve the old list',
    `${newId}.next receives the old head ${builder.state.head ?? 'null'} before head moves.`,
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      const node = runtimeNode(state, state.newNode);
      if (node) node.next = state.head;
      state.next = state.head;
      appendUnique(state.reconnected, state.newNode);
    }
  );
  builder.add(
    'insert-head-move-head',
    'Move head to the new node',
    `head now references ${newId}; no traversal occurred.`,
    { 'pointer-write': config.maintainTail && stateIsEmpty(builder.state) ? 2 : 1 },
    (state) => {
      const wasEmpty = state.head === null;
      state.head = state.newNode;
      if (wasEmpty && state.maintainTail) state.tail = state.newNode;
      const node = runtimeNode(state, state.newNode);
      if (node) node.status = 'live';
      state.current = state.newNode;
      state.result = state.newNode;
    }
  );
  builder.add(
    'insert-head-return',
    'Insertion complete',
    `${newId} is reachable from head and the original list remains connected after it.`,
    { return: 1 }
  );
}

function stateIsEmpty(state: RuntimeState) {
  return state.head === null;
}

function runInsertTail(builder: TraceBuilder, config: ResolvedConfig) {
  const newId = nodeId(config.values.length);
  const expectedComplexity = config.maintainTail ? 'O(1)' : 'O(n)';
  const checkpoint = makePrediction(
    `linked-list-lab:insert-tail:${config.maintainTail ? 'on' : 'off'}:checkpoint`,
    `With “Maintain tail pointer” ${config.maintainTail ? 'ON' : 'OFF'}, what is insert-at-tail time?`,
    'text',
    expectedComplexity,
    config.maintainTail
      ? 'tail already identifies the terminal node, so only constant pointer updates remain.'
      : 'Without tail, current must follow next references through the list before insertion.',
    'tail-pointer-maintenance',
    config.maintainTail ? 'O(n)' : 'O(1)'
  );
  builder.add(
    'insert-tail-allocate',
    `Allocate ${newId}`,
    `Create a terminal candidate containing ${config.newValue}.`,
    {
      allocation: 1,
      write: 1,
      'pointer-write': 1,
      ...(config.maintainTail && builder.state.tail ? { 'pointer-read': 1 } : {})
    },
    (state) => {
      allocateNode(state, config.newValue);
      if (state.maintainTail) state.current = state.tail;
    },
    checkpoint
  );

  if (builder.state.head === null) {
    builder.add(
      'insert-tail-empty',
      'Initialize the empty list',
      `${newId} becomes head${config.maintainTail ? ' and tail' : ''}.`,
      { comparison: 1, 'pointer-write': config.maintainTail ? 2 : 1 },
      (state) => {
        state.head = state.newNode;
        if (state.maintainTail) state.tail = state.newNode;
        state.current = state.newNode;
        const node = runtimeNode(state, state.newNode);
        if (node) node.status = 'live';
        state.result = state.newNode;
      }
    );
    builder.add(
      'insert-tail-return',
      'Insertion complete',
      'No predecessor traversal exists for an empty list.',
      { return: 1 }
    );
    return;
  }

  if (!config.maintainTail) {
    builder.add(
      'insert-tail-init-current',
      'Start terminal-node search',
      'Without a maintained tail pointer, current must start at head.',
      { 'pointer-read': 1, 'pointer-write': 1 },
      (state) => {
        state.current = state.head;
      }
    );
    while (successor(builder.state, builder.state.current) !== null) {
      const current = builder.state.current;
      builder.add(
        'insert-tail-check-next',
        `Inspect ${current}.next`,
        `${current}.next is not null, so ${current} is not the tail.`,
        { 'pointer-read': 1, comparison: 1, 'loop-iteration': 1, 'node-inspection': 1 },
        (state) => appendUnique(state.traversed, current)
      );
      builder.add(
        'insert-tail-advance',
        `Advance from ${current}`,
        'current follows the only forward reference.',
        { 'pointer-read': 1, 'pointer-write': 3 },
        (state) => {
          state.previous = current;
          state.next = successor(state, current);
          state.current = state.next;
        }
      );
    }
    builder.add(
      'insert-tail-check-next',
      `Find terminal node ${builder.state.current}`,
      `${builder.state.current}.next is null, so traversal stops here.`,
      { 'pointer-read': 1, comparison: 1, 'node-inspection': 1 },
      (state) => appendUnique(state.traversed, state.current)
    );
  }

  const predecessor = config.maintainTail ? builder.state.tail : builder.state.current;
  builder.add(
    'insert-tail-link',
    `Link ${predecessor} to ${newId}`,
    `${predecessor}.next changes from null to ${newId}.`,
    { 'pointer-write': 1 },
    (state) => {
      const predecessorNode = runtimeNode(state, config.maintainTail ? state.tail : state.current);
      if (predecessorNode) predecessorNode.next = state.newNode;
      state.previous = predecessorNode?.id ?? null;
      state.next = state.newNode;
      appendUnique(state.reconnected, predecessorNode?.id ?? null);
      const node = runtimeNode(state, state.newNode);
      if (node) node.status = 'live';
    }
  );
  if (config.maintainTail) {
    builder.add(
      'insert-tail-move-tail',
      `Move tail to ${newId}`,
      'The maintained tail invariant is restored after the link write.',
      { 'pointer-write': 1 },
      (state) => {
        state.tail = state.newNode;
        state.current = state.newNode;
      }
    );
  }
  builder.add(
    'insert-tail-return',
    'Insertion complete',
    config.maintainTail
      ? 'The trace used no traversal; allocation and pointer updates stayed constant.'
      : `The trace inspected ${config.values.length} existing node${config.values.length === 1 ? '' : 's'} before linking.`,
    { return: 1 },
    (state) => {
      state.result = state.newNode;
    }
  );
}

function runInsertAfterKnown(builder: TraceBuilder, config: ResolvedConfig) {
  const knownId = nodeId(config.position);
  const successorId = successor(builder.state, knownId);
  const newId = nodeId(config.values.length);
  const checkpoint = makePrediction(
    `linked-list-lab:insert-after-known:${config.position}:checkpoint`,
    'Which pointer assignment must happen first so the old successor is not lost?',
    'text',
    'newNode.next',
    `Set newNode.next to ${successorId ?? 'null'} before overwriting ${knownId}.next.`,
    'pointer-update-order',
    'known.next'
  );
  builder.add(
    'insert-after-allocate',
    `Allocate ${newId}`,
    `${knownId} is supplied directly; no search is included in this operation.`,
    { allocation: 1, write: 1, 'pointer-write': 2 },
    (state) => {
      allocateNode(state, config.newValue);
      state.current = knownId;
      state.previous = knownId;
    },
    checkpoint
  );
  builder.add(
    'insert-after-preserve',
    `Preserve ${successorId ?? 'null'}`,
    `${newId}.next receives ${knownId}.next before ${knownId}.next is overwritten.`,
    { 'pointer-read': 1, 'pointer-write': 2 },
    (state) => {
      const newNode = runtimeNode(state, state.newNode);
      state.next = successor(state, knownId);
      if (newNode) newNode.next = state.next;
      appendUnique(state.reconnected, state.newNode);
    }
  );
  builder.add(
    'insert-after-link',
    `Link ${knownId} to ${newId}`,
    'The splice is complete only after the predecessor points at the allocated node.',
    {
      'pointer-write': config.maintainTail && successorId === null ? 2 : 1
    },
    (state) => {
      const known = runtimeNode(state, knownId);
      if (known) known.next = state.newNode;
      if (state.maintainTail && successorId === null) state.tail = state.newNode;
      const newNode = runtimeNode(state, state.newNode);
      if (newNode) newNode.status = 'live';
      appendUnique(state.reconnected, knownId);
    }
  );
  builder.add(
    'insert-after-return',
    `Return ${newId}`,
    'The direct reference makes the operation constant time regardless of list length.',
    { return: 1 },
    (state) => {
      state.current = state.newNode;
      state.result = state.newNode;
    }
  );
}

function runInsertAtPosition(builder: TraceBuilder, config: ResolvedConfig) {
  const newId = nodeId(config.values.length);
  if (config.position === 0) {
    const checkpoint = makePrediction(
      'linked-list-lab:insert-position-head:checkpoint',
      'At position zero, which reference becomes the new node’s next?',
      'text',
      builder.state.head,
      'The old head must be preserved as newNode.next before head changes.',
      'pointer-update-order',
      null
    );
    builder.add(
      'insert-position-head',
      'Use the head special case',
      'Position zero performs the same fixed allocation and pointer updates as insert-at-head.',
      {
        comparison: 1,
        allocation: 1,
        write: 1,
        'pointer-read': 1,
        'pointer-write': config.maintainTail && builder.state.head === null ? 3 : 2,
        return: 1
      },
      (state) => {
        const oldHead = state.head;
        const newNode = allocateNode(state, config.newValue);
        newNode.next = oldHead;
        newNode.status = 'live';
        state.next = oldHead;
        state.head = newNode.id;
        if (state.maintainTail && oldHead === null) state.tail = newNode.id;
        state.current = newNode.id;
        state.result = newNode.id;
        appendUnique(state.reconnected, newNode.id);
      },
      checkpoint
    );
    return;
  }

  const predecessorId = nodeId(config.position - 1);
  const checkpoint = makePrediction(
    `linked-list-lab:insert-position:${config.position}:checkpoint`,
    `Which predecessor must be found before inserting at position ${config.position}?`,
    'text',
    predecessorId,
    `The node at position ${config.position - 1}, ${predecessorId}, owns the link that must change.`,
    'incorrect-predecessor',
    nodeId(Math.min(config.position, Math.max(0, config.values.length - 1)))
  );
  builder.add(
    'insert-position-init',
    'Start predecessor search',
    'previous starts at head because links can only be followed forward.',
    { comparison: 1, 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.previous = state.head;
      state.current = state.head;
    },
    checkpoint
  );
  for (let index = 1; index < config.position; index++) {
    builder.add(
      'insert-position-check',
      `Check predecessor index ${index - 1}`,
      `The predecessor for position ${config.position} has not been reached yet.`,
      { comparison: 1, 'loop-iteration': 1 }
    );
    builder.add(
      'insert-position-advance',
      `Advance to ${successor(builder.state, builder.state.previous)}`,
      'previous follows one next reference.',
      { 'pointer-read': 1, 'pointer-write': 2 },
      (state) => {
        appendUnique(state.traversed, state.previous);
        state.previous = successor(state, state.previous);
        state.current = state.previous;
      }
    );
  }
  builder.add(
    'insert-position-check',
    `Find predecessor ${predecessorId}`,
    `${predecessorId} is immediately before insertion position ${config.position}.`,
    { comparison: 1 },
    (state) => appendUnique(state.traversed, state.previous)
  );
  builder.add(
    'insert-position-allocate',
    `Allocate ${newId}`,
    `The new node stores ${config.newValue}.`,
    { allocation: 1, write: 1, 'pointer-write': 1 },
    (state) => allocateNode(state, config.newValue)
  );
  builder.add(
    'insert-position-preserve',
    'Preserve the successor',
    `${newId}.next receives ${predecessorId}.next before that predecessor link changes.`,
    { 'pointer-read': 1, 'pointer-write': 2 },
    (state) => {
      state.next = successor(state, state.previous);
      const node = runtimeNode(state, state.newNode);
      if (node) node.next = state.next;
      appendUnique(state.reconnected, state.newNode);
    }
  );
  builder.add(
    'insert-position-link',
    `Splice ${newId} after ${predecessorId}`,
    `${predecessorId}.next now references the allocated node.`,
    {
      'pointer-write': config.maintainTail && config.position === config.values.length ? 2 : 1
    },
    (state) => {
      const predecessor = runtimeNode(state, state.previous);
      if (predecessor) predecessor.next = state.newNode;
      if (state.maintainTail && config.position === config.values.length) {
        state.tail = state.newNode;
      }
      const node = runtimeNode(state, state.newNode);
      if (node) node.status = 'live';
      appendUnique(state.reconnected, state.previous);
    }
  );
  builder.add(
    'insert-position-return',
    'Insertion complete',
    `The fixed splice followed ${config.position - 1} predecessor hop${config.position === 2 ? '' : 's'}.`,
    { return: 1 },
    (state) => {
      state.current = state.newNode;
      state.result = state.newNode;
    }
  );
}

function runDeleteHead(builder: TraceBuilder) {
  const oldHead = builder.state.head;
  const expectedHead = successor(builder.state, oldHead);
  const checkpoint = makePrediction(
    'linked-list-lab:delete-head:checkpoint',
    'Which node reference becomes head after deletion?',
    'text',
    expectedHead,
    `head must advance to the old head’s successor, ${expectedHead ?? 'null'}, before the old node is released.`,
    'pointer-update-order',
    oldHead
  );
  if (oldHead === null) {
    builder.add(
      'delete-head-empty',
      'List is already empty',
      'head is null, so there is no node to delete.',
      { comparison: 1, return: 1 },
      (state) => {
        state.result = null;
      },
      checkpoint
    );
    return;
  }
  builder.add(
    'delete-head-empty',
    'Confirm a head exists',
    `${oldHead} can be safely read before any pointer changes.`,
    { comparison: 1 },
    undefined,
    checkpoint
  );
  builder.add(
    'delete-head-save',
    `Save ${oldHead}`,
    'A temporary reference retains the node that will be released.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.current = oldHead;
      state.detached = [];
    }
  );
  builder.add(
    'delete-head-advance',
    `Advance head to ${expectedHead ?? 'null'}`,
    'Read the successor before releasing the old head, so the remaining list is not lost.',
    {
      'pointer-read': 1,
      'pointer-write': builder.state.maintainTail && expectedHead === null ? 3 : 2
    },
    (state) => {
      state.next = successor(state, oldHead);
      state.head = state.next;
      if (state.maintainTail && state.head === null) state.tail = null;
      appendUnique(state.detached, oldHead);
    }
  );
  builder.add(
    'delete-head-detach',
    `Delete ${oldHead}`,
    `${oldHead} is no longer reachable from head and is marked deleted.`,
    { deallocation: 1, 'pointer-write': 1 },
    (state) => {
      markDeleted(state, oldHead);
      state.result = oldHead;
    }
  );
  builder.add(
    'delete-head-return',
    'Deletion complete',
    'The new head is returned after the old node is detached.',
    { return: 1 }
  );
}

function runDeleteTail(builder: TraceBuilder, config: ResolvedConfig) {
  const lastId = config.values.length ? nodeId(config.values.length - 1) : null;
  const predecessorId = config.values.length > 1 ? nodeId(config.values.length - 2) : null;
  const checkpoint = makePrediction(
    'linked-list-lab:delete-tail:checkpoint',
    'Which node becomes the terminal predecessor after deleting the tail?',
    'text',
    predecessorId,
    predecessorId
      ? `${predecessorId}.next must become null; a tail pointer alone cannot find this predecessor.`
      : 'No predecessor remains when a zero- or one-node list becomes empty.',
    'incorrect-predecessor',
    lastId
  );
  if (builder.state.head === null) {
    builder.add(
      'delete-tail-empty',
      'List is already empty',
      'There is no terminal node to delete.',
      { comparison: 1, return: 1 },
      undefined,
      checkpoint
    );
    return;
  }
  builder.add(
    'delete-tail-empty',
    'Confirm the list is non-empty',
    'head is not null, so the singleton condition is checked next.',
    { comparison: 1 },
    undefined,
    checkpoint
  );
  if (successor(builder.state, builder.state.head) === null) {
    const only = builder.state.head;
    builder.add(
      'delete-tail-single',
      `Delete only node ${only}`,
      'The only node is both head and tail, so the list becomes empty directly.',
      { 'pointer-read': 1, comparison: 1, 'pointer-write': 3, deallocation: 1, return: 1 },
      (state) => {
        state.current = only;
        state.head = null;
        if (state.maintainTail) state.tail = null;
        if (only) markDeleted(state, only);
        state.result = only;
      }
    );
    return;
  }
  builder.add(
    'delete-tail-single',
    'More than one node remains',
    'The terminal predecessor must be found by forward traversal.',
    { 'pointer-read': 1, comparison: 1 }
  );
  builder.add(
    'delete-tail-init',
    'Start predecessor search',
    'previous starts at head; even a maintained tail has no back reference.',
    { 'pointer-read': 1, 'pointer-write': 1 },
    (state) => {
      state.previous = state.head;
      state.current = state.head;
    }
  );
  while (successor(builder.state, successor(builder.state, builder.state.previous)) !== null) {
    const previous = builder.state.previous;
    builder.add(
      'delete-tail-check',
      `Inspect two links ahead of ${previous}`,
      `${previous}.next.next is not null, so ${previous} is not the final predecessor.`,
      {
        'pointer-read': 2,
        comparison: 1,
        'loop-iteration': 1,
        'node-inspection': 1
      },
      (state) => appendUnique(state.traversed, previous)
    );
    builder.add(
      'delete-tail-advance',
      `Advance previous from ${previous}`,
      'previous follows one forward reference.',
      { 'pointer-read': 1, 'pointer-write': 2 },
      (state) => {
        state.previous = successor(state, state.previous);
        state.current = state.previous;
      }
    );
  }
  builder.add(
    'delete-tail-check',
    `Find predecessor ${builder.state.previous}`,
    `${builder.state.previous}.next is the terminal node.`,
    { 'pointer-read': 2, comparison: 1, 'node-inspection': 1 },
    (state) => appendUnique(state.traversed, state.previous)
  );
  builder.add(
    'delete-tail-save',
    `Save tail ${lastId}`,
    'The node to release is retained before its predecessor link changes.',
    { 'pointer-read': 1, 'pointer-write': 2 },
    (state) => {
      state.current = successor(state, state.previous);
      state.next = state.current;
    }
  );
  builder.add(
    'delete-tail-unlink',
    `Set ${predecessorId}.next to null`,
    'This makes the predecessor the new terminal node.',
    { 'pointer-write': builder.state.maintainTail ? 2 : 1 },
    (state) => {
      const predecessor = runtimeNode(state, state.previous);
      if (predecessor) predecessor.next = null;
      if (state.maintainTail) state.tail = state.previous;
      appendUnique(state.detached, state.current);
      appendUnique(state.reconnected, state.previous);
    }
  );
  builder.add(
    'delete-tail-detach',
    `Delete ${lastId}`,
    'The old terminal node is released only after it is unreachable.',
    { deallocation: 1, 'pointer-write': 1 },
    (state) => {
      if (state.current) markDeleted(state, state.current);
      state.result = state.current;
    }
  );
  builder.add(
    'delete-tail-return',
    'Deletion complete',
    `Finding ${predecessorId} required forward traversal, so the general bound is O(n).`,
    { return: 1 }
  );
}

function runDeleteByValue(builder: TraceBuilder, config: ResolvedConfig) {
  const matchIndex = config.values.indexOf(config.target);
  const matchId = matchIndex >= 0 ? nodeId(matchIndex) : null;
  const predecessorId = matchIndex > 0 ? nodeId(matchIndex - 1) : null;
  const checkpoint = makePrediction(
    `linked-list-lab:delete-by-value:${config.target}:checkpoint`,
    `Which reference is rewritten to unlink the first ${config.target}?`,
    'text',
    matchIndex < 0 ? 'none' : matchIndex === 0 ? 'head' : `${predecessorId}.next`,
    matchIndex < 0
      ? `${config.target} is absent, so no reference changes after the failed search.`
      : matchIndex === 0
        ? 'The match is the head node, so the head reference itself must advance.'
        : `${predecessorId} precedes the match, so ${predecessorId}.next bypasses it.`,
    'incorrect-predecessor',
    matchId ? `${matchId}.next` : 'head'
  );
  builder.add(
    'delete-value-init',
    'Initialize search pair',
    'previous starts at null and current starts at head so the predecessor is always retained.',
    { 'pointer-write': 2, 'pointer-read': 1 },
    (state) => {
      state.previous = null;
      state.current = state.head;
    },
    checkpoint
  );
  while (builder.state.current !== null) {
    const current = builder.state.current;
    const value = runtimeNode(builder.state, current)?.value;
    builder.add(
      'delete-value-check',
      `Check ${current}`,
      `${current} is reachable, so its value can be compared.`,
      { comparison: 1, 'loop-iteration': 1 }
    );
    builder.add(
      'delete-value-compare',
      `Compare ${String(value)} with ${config.target}`,
      `${String(value)} ${value === config.target ? 'matches, so the search loop stops' : 'does not match the target'}.`,
      { read: 1, comparison: 1, 'node-inspection': 1 },
      (state) => appendUnique(state.traversed, current)
    );
    if (value === config.target) break;
    builder.add(
      'delete-value-advance',
      `Advance beyond ${current}`,
      'previous shadows current so the eventual unlink has its predecessor.',
      { 'pointer-read': 1, 'pointer-write': 2 },
      (state) => {
        state.previous = current;
        state.next = successor(state, current);
        state.current = state.next;
      }
    );
  }
  builder.add(
    'delete-value-missing',
    builder.state.current === null ? 'No match exists' : 'A match was found',
    builder.state.current === null
      ? `current reached null, so ${config.target} is absent and the list is unchanged.`
      : 'current is not null, so the matched node can be unlinked.',
    { comparison: 1 },
    (state) => {
      if (state.current === null) state.result = 'not-found';
    }
  );
  if (builder.state.current === null) return;
  const victim = builder.state.current;
  if (builder.state.previous === null) {
    builder.add(
      'delete-value-head',
      'Advance head past the match',
      `previous is null, so the match is the head and head moves to ${successor(builder.state, victim) ?? 'null'}.`,
      {
        comparison: 1,
        'pointer-read': 1,
        'pointer-write':
          builder.state.maintainTail && successor(builder.state, victim) === null ? 2 : 1
      },
      (state) => {
        state.next = successor(state, victim);
        state.head = state.next;
        if (state.maintainTail && state.head === null) state.tail = null;
        appendUnique(state.detached, victim);
      }
    );
  } else {
    builder.add(
      'delete-value-head',
      'The match is not the head',
      'previous is not null, so the predecessor link is rewired instead of head.',
      { comparison: 1 }
    );
    builder.add(
      'delete-value-unlink',
      `Bypass ${victim}`,
      `${builder.state.previous}.next now skips ${victim} and references ${successor(builder.state, victim) ?? 'null'}.`,
      {
        'pointer-read': 1,
        'pointer-write':
          builder.state.maintainTail && successor(builder.state, victim) === null ? 2 : 1
      },
      (state) => {
        const predecessor = runtimeNode(state, state.previous);
        state.next = successor(state, victim);
        if (predecessor) predecessor.next = state.next;
        if (state.maintainTail && state.next === null) state.tail = state.previous;
        appendUnique(state.detached, victim);
        appendUnique(state.reconnected, state.previous);
      }
    );
  }
  builder.add(
    'delete-value-detach',
    `Delete ${victim}`,
    `${victim} is unreachable from head and is released.`,
    { deallocation: 1, 'pointer-write': 1 },
    (state) => {
      markDeleted(state, victim);
      state.result = victim;
      state.resultIndex = matchIndex;
    }
  );
  builder.add(
    'delete-value-return',
    'Deletion complete',
    matchIndex === 0
      ? 'The head match made every rewiring step constant; only the search bound is general.'
      : `The search visited ${matchIndex + 1} node${matchIndex === 0 ? '' : 's'} before the constant unlink.`,
    { return: 1 }
  );
}

function runDeleteAfterKnown(builder: TraceBuilder, config: ResolvedConfig) {
  const knownId = nodeId(config.position);
  const victimId = successor(builder.state, knownId);
  const afterVictim = successor(builder.state, victimId);
  const checkpoint = makePrediction(
    `linked-list-lab:delete-after-known:${config.position}:checkpoint`,
    `With predecessor ${knownId} supplied directly, which node is deleted?`,
    'text',
    victimId,
    `deleteAfter removes the successor ${victimId}; the known node ${knownId} survives and is rewired.`,
    'incorrect-predecessor',
    knownId
  );
  builder.add(
    'delete-after-save',
    `Save ${victimId}`,
    `${knownId} is supplied directly, so its successor ${victimId} is captured without any search.`,
    { 'pointer-read': 1, 'pointer-write': 2 },
    (state) => {
      state.previous = knownId;
      state.current = victimId;
      appendUnique(state.detached, victimId);
    },
    checkpoint
  );
  builder.add(
    'delete-after-unlink',
    `Bypass ${victimId}`,
    `${knownId}.next now references ${afterVictim ?? 'null'}, skipping the saved node.`,
    {
      'pointer-read': 1,
      'pointer-write': builder.state.maintainTail && afterVictim === null ? 2 : 1
    },
    (state) => {
      const known = runtimeNode(state, knownId);
      state.next = successor(state, victimId);
      if (known) known.next = state.next;
      if (state.maintainTail && state.next === null) state.tail = knownId;
      appendUnique(state.reconnected, knownId);
    }
  );
  builder.add(
    'delete-after-detach',
    `Delete ${victimId}`,
    `${victimId} is unreachable and released; no traversal ever happened.`,
    { deallocation: 1, 'pointer-write': 1 },
    (state) => {
      if (victimId) markDeleted(state, victimId);
      state.result = victimId;
    }
  );
  builder.add(
    'delete-after-return',
    'Deletion complete',
    'A known predecessor reference makes deletion constant time at any list length.',
    { return: 1 }
  );
}

function runReverseIterative(builder: TraceBuilder, config: ResolvedConfig) {
  const checkpoint = makePrediction(
    'linked-list-lab:reverse-iterative:checkpoint',
    'Which reference must be saved before current.next is overwritten?',
    'text',
    'current.next',
    'Saving current.next into next first is the only way to keep the unreversed suffix reachable.',
    'lost-list',
    'previous'
  );
  builder.add(
    'reverse-iterative-init',
    'Initialize the pointer pair',
    'previous starts at null (the new terminal) and current starts at head.',
    { 'pointer-read': 1, 'pointer-write': 2 },
    (state) => {
      state.previous = null;
      state.current = state.head;
    },
    checkpoint
  );
  const oldHead = builder.state.head;
  while (builder.state.current !== null) {
    const current = builder.state.current;
    builder.add(
      'reverse-iterative-check',
      `Check ${current}`,
      `${current} is not null, so its link must still be reversed.`,
      { comparison: 1, 'loop-iteration': 1 }
    );
    builder.add(
      'reverse-iterative-save',
      `Save ${current}.next`,
      `next retains ${successor(builder.state, current) ?? 'null'} before the overwrite; without this the suffix would be lost.`,
      { 'pointer-read': 1, 'pointer-write': 1 },
      (state) => {
        state.next = successor(state, current);
      }
    );
    builder.add(
      'reverse-iterative-link',
      `Reverse ${current}.next`,
      `${current}.next now points backward to ${builder.state.previous ?? 'null'}.`,
      { 'pointer-write': 1 },
      (state) => {
        const node = runtimeNode(state, current);
        if (node) node.next = state.previous;
        appendUnique(state.traversed, current);
        appendUnique(state.reconnected, current);
      }
    );
    builder.add(
      'reverse-iterative-previous',
      `Move previous to ${current}`,
      'previous advances onto the node whose link was just reversed.',
      { 'pointer-write': 1 },
      (state) => {
        state.previous = current;
      }
    );
    builder.add(
      'reverse-iterative-current',
      `Move current to ${builder.state.next ?? 'null'}`,
      'current resumes from the saved suffix reference.',
      { 'pointer-write': 1 },
      (state) => {
        state.current = state.next;
      }
    );
  }
  builder.add(
    'reverse-iterative-check',
    'Reach null',
    'current is null, so every next reference has been reversed exactly once.',
    { comparison: 1 }
  );
  builder.add(
    'reverse-iterative-return',
    `Return new head ${builder.state.previous ?? 'null'}`,
    'previous references the old terminal node, which is the head of the reversed list.',
    { return: 1, 'pointer-write': builder.state.maintainTail ? 2 : 1 },
    (state) => {
      state.head = state.previous;
      if (state.maintainTail) state.tail = oldHead;
      state.result = state.previous;
    }
  );
}

function runReverseRecursive(builder: TraceBuilder, config: ResolvedConfig) {
  const n = config.values.length;
  const deepestId = n > 0 ? nodeId(n - 1) : null;
  const checkpoint = makePrediction(
    'linked-list-lab:reverse-recursive:checkpoint',
    'Which node does the deepest recursive call return as the new head?',
    'text',
    deepestId ?? 'null',
    n <= 1
      ? 'A list with fewer than two nodes is its own reversal; the base case returns immediately.'
      : `The base case fires at ${deepestId}, whose next is null; that node becomes the head of the whole reversal.`,
    'recursive-base-case',
    n > 0 ? nodeId(0) : 'null'
  );
  if (n === 0) {
    builder.add(
      'reverse-recursive-base',
      'Base case: empty list',
      'head is null, so the base case returns immediately with no link changes.',
      { comparison: 1, return: 1 },
      (state) => {
        state.result = null;
      },
      checkpoint
    );
    return;
  }
  for (let frame = 0; frame < n; frame++) {
    const frameId = nodeId(frame);
    const isDeepest = frame === n - 1;
    builder.add(
      'reverse-recursive-base',
      `Frame ${frame + 1}: check base case at ${frameId}`,
      isDeepest
        ? `${frameId}.next is null, so the base case fires and ${frameId} is returned as newHead.`
        : `${frameId} has a successor, so the base case does not fire yet.`,
      { comparison: 2, 'pointer-read': 1 },
      (state) => {
        state.current = frameId;
        appendUnique(state.traversed, frameId);
      },
      frame === 0 ? checkpoint : undefined
    );
    if (isDeepest) {
      builder.add(
        'reverse-recursive-return',
        `Base case returns ${frameId}`,
        `${frameId} is the deepest frame's return value and will be passed up unchanged as newHead.`,
        { return: 1 },
        (state) => {
          state.result = frameId;
        }
      );
    } else {
      builder.add(
        'reverse-recursive-descend',
        `Recurse into ${nodeId(frame + 1)}`,
        `A new stack frame is pushed for the sublist starting at ${nodeId(frame + 1)}; auxiliary space grows by one frame.`,
        { call: 1, 'pointer-read': 1 },
        (state) => {
          state.recursiveDepth += 1;
          state.current = nodeId(frame + 1);
        }
      );
    }
  }
  for (let frame = n - 2; frame >= 0; frame--) {
    const frameId = nodeId(frame);
    const successorId = nodeId(frame + 1);
    builder.add(
      'reverse-recursive-link',
      `Unwind to ${frameId}: reverse ${successorId}.next`,
      `head.next.next = head makes ${successorId} point back at ${frameId}.`,
      { 'pointer-read': 2, 'pointer-write': 1 },
      (state) => {
        state.current = frameId;
        const successorNode = runtimeNode(state, successorId);
        if (successorNode) successorNode.next = frameId;
        appendUnique(state.reconnected, successorId);
      }
    );
    builder.add(
      'reverse-recursive-clear',
      `Clear ${frameId}.next`,
      `${frameId}.next becomes null so the reversal leaves no two-node cycle behind.`,
      { 'pointer-write': 1 },
      (state) => {
        const frameNode = runtimeNode(state, frameId);
        if (frameNode) frameNode.next = null;
      }
    );
    builder.add(
      'reverse-recursive-return',
      `Frame ${frame + 1} returns newHead ${deepestId}`,
      'The unchanged newHead is passed up while this stack frame is released.',
      {
        return: 1,
        'pointer-write': frame === 0 && builder.state.maintainTail ? 2 : frame === 0 ? 1 : 0
      },
      (state) => {
        state.recursiveDepth = Math.max(0, state.recursiveDepth - 1);
        if (frame === 0) {
          state.head = deepestId;
          if (state.maintainTail) state.tail = nodeId(0);
          state.result = deepestId;
        }
      }
    );
  }
}

function runDetectCycle(builder: TraceBuilder, config: ResolvedConfig) {
  const hasCycle = config.cycleEntry !== null;
  const checkpoint = makePrediction(
    `linked-list-lab:detect-cycle:${hasCycle ? 'cyclic' : 'acyclic'}:checkpoint`,
    'How does this Floyd run terminate: do the pointers meet, or does fast reach null?',
    'text',
    hasCycle ? 'meet' : 'null',
    hasCycle
      ? 'Inside a cycle, fast gains one node on slow per iteration, so they must meet.'
      : 'Without a cycle, fast falls off the end of the list before slow finishes.',
    'fast-vs-slow-pointer',
    hasCycle ? 'null' : 'meet'
  );
  builder.add(
    'cycle-init',
    'Start both pointers at head',
    'slow will move one link per iteration; fast will move two.',
    { 'pointer-read': 1, 'pointer-write': 2 },
    (state) => {
      state.slow = state.head;
      state.fast = state.head;
    },
    checkpoint
  );
  let met = false;
  while (builder.state.fast !== null && successor(builder.state, builder.state.fast) !== null) {
    builder.add(
      'cycle-check',
      `Check fast at ${builder.state.fast}`,
      `fast and fast.next are both non-null, so both pointers can advance safely.`,
      { 'pointer-read': 1, comparison: 2, 'loop-iteration': 1 }
    );
    builder.add(
      'cycle-move-slow',
      `Move slow to ${successor(builder.state, builder.state.slow) ?? 'null'}`,
      'slow follows exactly one next reference.',
      { 'pointer-read': 1, 'pointer-write': 1 },
      (state) => {
        appendUnique(state.traversed, state.slow);
        state.slow = successor(state, state.slow);
      }
    );
    builder.add(
      'cycle-move-fast',
      `Move fast two links to ${successor(builder.state, successor(builder.state, builder.state.fast)) ?? 'null'}`,
      'fast follows two next references, gaining one node on slow each iteration.',
      { 'pointer-read': 2, 'pointer-write': 1 },
      (state) => {
        state.fast = successor(state, successor(state, state.fast));
      }
    );
    const meetsNow = builder.state.slow !== null && builder.state.slow === builder.state.fast;
    builder.add(
      'cycle-compare',
      meetsNow
        ? `slow and fast meet at ${builder.state.slow}`
        : `Compare slow ${builder.state.slow ?? 'null'} with fast ${builder.state.fast ?? 'null'}`,
      meetsNow
        ? 'Reference equality proves a cycle: two distinct walking speeds landed on the same node.'
        : 'The references differ, so no cycle has been proven yet.',
      { comparison: 1, ...(meetsNow ? { return: 1 } : {}) },
      (state) => {
        if (meetsNow) state.result = true;
      }
    );
    if (meetsNow) {
      met = true;
      break;
    }
  }
  if (!met) {
    builder.add(
      'cycle-check',
      'fast reached the end',
      `${builder.state.fast === null ? 'fast is null' : 'fast.next is null'}, so the loop exits without a meeting.`,
      { 'pointer-read': 1, comparison: builder.state.fast === null ? 1 : 2 }
    );
    builder.add(
      'cycle-return-false',
      'Return false',
      'No two positions of slow and fast ever coincided; the list is acyclic.',
      { return: 1 },
      (state) => {
        state.result = false;
      }
    );
  }
}

const LESSON_OBJECTIVES = [
  'Trace every pointer read and write of a singly linked list operation before it happens',
  'Explain why maintaining a tail pointer changes append from O(n) to O(1)',
  'Choose the correct pointer update order so no part of the list is ever lost'
];

export function createLinkedListLesson(
  input: LinkedListConfig = DEFAULT_LINKED_LIST_CONFIG
): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));
  switch (config.operation) {
    case 'access':
      runAccess(builder, config);
      break;
    case 'traverse':
      runTraverse(builder, config);
      break;
    case 'search':
      runSearch(builder, config);
      break;
    case 'insert-head':
      runInsertHead(builder, config);
      break;
    case 'insert-tail':
      runInsertTail(builder, config);
      break;
    case 'insert-after-known':
      runInsertAfterKnown(builder, config);
      break;
    case 'insert-at-position':
      runInsertAtPosition(builder, config);
      break;
    case 'delete-head':
      runDeleteHead(builder);
      break;
    case 'delete-tail':
      runDeleteTail(builder, config);
      break;
    case 'delete-by-value':
      runDeleteByValue(builder, config);
      break;
    case 'delete-after-known':
      runDeleteAfterKnown(builder, config);
      break;
    case 'reverse-iterative':
      runReverseIterative(builder, config);
      break;
    case 'reverse-recursive':
      runReverseRecursive(builder, config);
      break;
    case 'detect-cycle':
      runDetectCycle(builder, config);
      break;
  }
  const metadata = getLinkedListOperationMetadata(config.operation);
  return {
    id: 'linked-list-lab',
    subject: 'dsa-1',
    topic: 'Linked List',
    title: `Linked List Lab — ${metadata.label}`,
    description: metadata.description,
    difficulty: 'beginner',
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
