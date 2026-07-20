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

export const DYNAMIC_ARRAY_INPUT_MAX = 8;
/** Educational C-style address model; this is not a real browser/runtime address. */
export const ELEMENT_SIZE_BYTES = 4;
export const ADDRESS_BASE = 0x100;

export type DynamicArrayOperation =
  | 'access'
  | 'update'
  | 'search'
  | 'insert-beginning'
  | 'insert-middle'
  | 'insert-end'
  | 'delete-beginning'
  | 'delete-middle'
  | 'delete-end'
  | 'copy'
  | 'append-sequence';

export type DynamicArrayOperationGroup =
  'Access & search' | 'Insertion' | 'Deletion' | 'Copy & growth';

export interface DynamicArrayComplexityCase {
  id: string;
  label: string;
  caseType: ComplexityCaseType;
  timeComplexity: ComplexityClass;
  auxiliarySpace: string;
  implementationVariant: string;
  assumptions: readonly string[];
  description: string;
}

export interface DynamicArrayOperationMetadata {
  id: DynamicArrayOperation;
  label: string;
  description: string;
  group: DynamicArrayOperationGroup;
  requiresPosition: boolean;
  requiresTarget: boolean;
  requiresNewValue: boolean;
  supportsCapacityToggle: boolean;
  cases: readonly DynamicArrayComplexityCase[];
}

export interface DynamicArrayConfig {
  operation: DynamicArrayOperation;
  values: number[];
  position?: number;
  target?: number;
  newValue?: number;
  spareCapacity?: boolean;
}

export const DEFAULT_DYNAMIC_ARRAY_CONFIG: DynamicArrayConfig = {
  operation: 'insert-end',
  values: [7, 14, 21, 28, 35],
  position: 2,
  target: 21,
  newValue: 42,
  spareCapacity: false
};

const contiguousAssumption =
  'Logical elements occupy consecutive indexed backing slots; only the explicit C-style teaching model exposes base + index × slot size.';
const modeledAddressAssumption =
  'Addresses use an explicit teaching model with base 0x100 and four-byte integer slots; Java ArrayList and Python list expose indexed references rather than these physical addresses.';
const boundedPrimitiveAssumption =
  'Each displayed read, write, comparison, allocation, or copy is one counted primitive.';
const doublingAssumption = 'A full buffer grows by doubling its capacity before the write.';
const spareCapacityAssumption =
  'The buffer already has at least one unused slot; growth is traced separately in the append operations.';
const logicalRetirementAssumption =
  'Installing a grown backing store counts the backing-reference and capacity writes; C frees its retired allocation explicitly, while C++ lifetime rules and Java/Python runtimes govern physical reclamation, which is outside the portable count.';

const operation = (
  id: DynamicArrayOperation,
  label: string,
  description: string,
  group: DynamicArrayOperationGroup,
  flags: Partial<
    Pick<
      DynamicArrayOperationMetadata,
      'requiresPosition' | 'requiresTarget' | 'requiresNewValue' | 'supportsCapacityToggle'
    >
  >,
  cases: readonly DynamicArrayComplexityCase[]
): DynamicArrayOperationMetadata => ({
  id,
  label,
  description,
  group,
  requiresPosition: false,
  requiresTarget: false,
  requiresNewValue: false,
  supportsCapacityToggle: false,
  ...flags,
  cases
});

export const DYNAMIC_ARRAY_OPERATIONS: readonly DynamicArrayOperationMetadata[] = [
  operation(
    'access',
    'Access by index',
    'Compute one address from the index, then perform a single read.',
    'Access & search',
    { requiresPosition: true },
    [
      {
        id: 'access-direct',
        label: 'Any index',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Index arithmetic',
        assumptions: [
          contiguousAssumption,
          modeledAddressAssumption,
          'The index is already known to be in bounds.'
        ],
        description: 'One multiplication, one addition, and one read — at every index and size.'
      }
    ]
  ),
  operation(
    'update',
    'Update by index',
    'Compute the address, then overwrite the slot with one write.',
    'Access & search',
    { requiresPosition: true, requiresNewValue: true },
    [
      {
        id: 'update-direct',
        label: 'Any index',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Index arithmetic',
        assumptions: [
          contiguousAssumption,
          modeledAddressAssumption,
          'The index is already known to be in bounds.'
        ],
        description: 'A single addressed write; no other slot moves.'
      }
    ]
  ),
  operation(
    'search',
    'Linear search',
    'Compare slots from index zero until a match or the end of the array.',
    'Access & search',
    { requiresTarget: true },
    [
      {
        id: 'search-best',
        label: 'Match at index zero',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear scan',
        assumptions: [contiguousAssumption, 'The first slot matches the target.'],
        description: 'The first comparison succeeds.'
      },
      {
        id: 'search-average',
        label: 'Match inside the array',
        caseType: 'average',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear scan',
        assumptions: [contiguousAssumption, 'The match position is distributed through the array.'],
        description: 'A linear fraction of the slots is compared.'
      },
      {
        id: 'search-worst',
        label: 'Last slot or absent',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Linear scan',
        assumptions: [contiguousAssumption, 'The target is last or absent.'],
        description: 'Every slot may need one comparison.'
      }
    ]
  ),
  operation(
    'insert-beginning',
    'Insert at beginning',
    'Shift every element one slot right, from the back, then write index zero.',
    'Insertion',
    { requiresNewValue: true },
    [
      {
        id: 'insert-begin-shift',
        label: 'All n elements shift',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Right shift from the back',
        assumptions: [contiguousAssumption, spareCapacityAssumption],
        description: 'Index zero is only free after n read-write pairs move every element.'
      }
    ]
  ),
  operation(
    'insert-middle',
    'Insert at position',
    'Shift the suffix one slot right, then write the freed slot.',
    'Insertion',
    { requiresPosition: true, requiresNewValue: true },
    [
      {
        id: 'insert-middle-append',
        label: 'Position equals size',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'No suffix to shift',
        assumptions: [contiguousAssumption, spareCapacityAssumption],
        description: 'Inserting at the end shifts nothing.'
      },
      {
        id: 'insert-middle-shift',
        label: 'Suffix must shift',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Right shift from the back',
        assumptions: [contiguousAssumption, spareCapacityAssumption],
        description: 'n − position elements move before one write lands.'
      }
    ]
  ),
  operation(
    'insert-end',
    'Append (insert at end)',
    'Compare a spare-capacity append against one that must grow the buffer first.',
    'Insertion',
    { requiresNewValue: true, supportsCapacityToggle: true },
    [
      {
        id: 'append-capacity',
        label: 'Spare capacity on',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Write into an existing slot',
        assumptions: [contiguousAssumption, 'size < capacity when the append starts.'],
        description: 'One write into slot size, then size increments.'
      },
      {
        id: 'append-resize',
        label: 'Spare capacity off',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(n)',
        implementationVariant: 'Allocate, copy all, then write',
        assumptions: [
          contiguousAssumption,
          doublingAssumption,
          logicalRetirementAssumption,
          'size == capacity when the append starts.'
        ],
        description: 'A new buffer is allocated and all n elements are copied before the write.'
      }
    ]
  ),
  operation(
    'delete-beginning',
    'Delete at beginning',
    'Shift every remaining element one slot left over the removed value.',
    'Deletion',
    {},
    [
      {
        id: 'delete-begin-shift',
        label: 'n − 1 elements shift',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Left shift from the front',
        assumptions: [contiguousAssumption, 'Slots must stay contiguous after removal.'],
        description: 'Every survivor moves once so no gap remains at index zero.'
      }
    ]
  ),
  operation(
    'delete-middle',
    'Delete at position',
    'Shift the suffix one slot left over the removed value.',
    'Deletion',
    { requiresPosition: true },
    [
      {
        id: 'delete-middle-last',
        label: 'Position is the last index',
        caseType: 'best',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'No suffix to shift',
        assumptions: [contiguousAssumption],
        description: 'Removing the final element shifts nothing.'
      },
      {
        id: 'delete-middle-shift',
        label: 'Suffix must shift',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Left shift from position',
        assumptions: [contiguousAssumption, 'Slots must stay contiguous after removal.'],
        description: 'n − position − 1 elements move left before size decrements.'
      }
    ]
  ),
  operation(
    'delete-end',
    'Delete at end',
    'Decrement size; the last slot simply stops being part of the array.',
    'Deletion',
    {},
    [
      {
        id: 'delete-end-direct',
        label: 'All sizes',
        caseType: 'worst',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Size decrement',
        assumptions: [contiguousAssumption, 'No shrinking of the buffer is traced.'],
        description: 'No element moves; only the size changes.'
      }
    ]
  ),
  operation(
    'copy',
    'Copy the array',
    'Allocate a second buffer and copy every element with one read-write pair.',
    'Copy & growth',
    {},
    [
      {
        id: 'copy-full',
        label: 'All n elements',
        caseType: 'worst',
        timeComplexity: 'O(n)',
        auxiliarySpace: 'O(1)',
        implementationVariant: 'Element-by-element copy',
        assumptions: [contiguousAssumption, 'The destination buffer has the same capacity.'],
        description:
          'n reads and n writes produce an O(n) returned buffer; only the loop cursor is auxiliary space.'
      }
    ]
  ),
  operation(
    'append-sequence',
    'Dynamic append sequence',
    'Append every input value into an initially empty capacity-1 buffer and watch doubling pay off.',
    'Copy & growth',
    {},
    [
      {
        id: 'append-amortized',
        label: 'Doubling growth over k appends',
        caseType: 'amortized',
        timeComplexity: 'O(1)',
        auxiliarySpace: 'O(n)',
        implementationVariant: 'Geometric capacity doubling',
        assumptions: [
          contiguousAssumption,
          doublingAssumption,
          logicalRetirementAssumption,
          'Total copies across k appends stay below 2k, so each append averages O(1).'
        ],
        description:
          'Individual appends spike to O(n) at each resize, but the copies form a geometric series bounded by 2k.'
      }
    ]
  )
] as const;

export function getDynamicArrayOperationMetadata(
  operationId: DynamicArrayOperation
): DynamicArrayOperationMetadata {
  const metadata = DYNAMIC_ARRAY_OPERATIONS.find((candidate) => candidate.id === operationId);
  if (!metadata) throw new Error(`Unknown dynamic-array operation: ${String(operationId)}`);
  return metadata;
}

type SourceTemplateLine = readonly [semantic: string | undefined, text: string];

interface RuntimeState {
  slots: (number | null)[];
  oldSlots: (number | null)[] | null;
  copySlots: (number | null)[] | null;
  size: number;
  capacity: number;
  oldCapacity: number | null;
  i: number | null;
  readIndex: number | null;
  writeIndex: number | null;
  shifted: number[];
  copied: number[];
  result: TraceValue;
  resultIndex: number | null;
  appendsCompleted: number;
  totalElementCopies: number;
  cumulativeWork: WorkCounts;
  operationCount: number;
}

interface ResolvedConfig {
  operation: DynamicArrayOperation;
  values: number[];
  position: number;
  target: number;
  newValue: number;
  spareCapacity: boolean;
  initialCapacity: number;
}

interface SelectedCase extends DynamicArrayComplexityCase {
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

export function slotAddress(index: number): string {
  return `0x${(ADDRESS_BASE + index * ELEMENT_SIZE_BYTES).toString(16).toUpperCase()}`;
}

function resolveConfig(input: DynamicArrayConfig): ResolvedConfig {
  if (!DYNAMIC_ARRAY_OPERATIONS.some((candidate) => candidate.id === input.operation)) {
    throw new Error(`Unsupported dynamic-array operation: ${String(input.operation)}`);
  }
  if (!Array.isArray(input.values)) throw new TypeError('Array values must be an array.');
  if (input.values.length > DYNAMIC_ARRAY_INPUT_MAX) {
    throw new RangeError(
      `Use at most ${DYNAMIC_ARRAY_INPUT_MAX} values so every slot stays visible.`
    );
  }
  if (input.values.some((value) => !Number.isSafeInteger(value))) {
    throw new TypeError('Array values must be safe integers.');
  }
  const integer = (value: number | undefined, fallback: number, label: string) => {
    const resolved = value ?? fallback;
    if (!Number.isSafeInteger(resolved)) throw new TypeError(`${label} must be a safe integer.`);
    return resolved;
  };
  const n = input.values.length;
  const defaultPosition = Math.min(2, Math.max(0, n - 1));
  const position = integer(input.position, defaultPosition, 'Position');
  const target = integer(input.target, input.values[defaultPosition] ?? 0, 'Target');
  const newValue = integer(input.newValue, 42, 'New value');
  const spareCapacity = ['insert-beginning', 'insert-middle'].includes(input.operation)
    ? true
    : (input.spareCapacity ?? false);

  if (
    n === 0 &&
    [
      'access',
      'update',
      'delete-beginning',
      'delete-middle',
      'delete-end',
      'append-sequence'
    ].includes(input.operation)
  ) {
    throw new RangeError(
      `${getDynamicArrayOperationMetadata(input.operation).label} requires at least one value.`
    );
  }

  if (['access', 'update', 'delete-middle'].includes(input.operation)) {
    if (position < 0 || position >= n)
      throw new RangeError('Position must reference an existing slot.');
  }
  if (input.operation === 'insert-middle' && (position < 0 || position > n)) {
    throw new RangeError('Insertion position must be between zero and the current size.');
  }

  let initialCapacity = n;
  if (['insert-beginning', 'insert-middle'].includes(input.operation)) initialCapacity = n + 1;
  if (input.operation === 'insert-end') initialCapacity = spareCapacity ? n + 2 : n;
  if (input.operation === 'append-sequence') initialCapacity = 1;

  return {
    operation: input.operation,
    values: [...input.values],
    position,
    target,
    newValue,
    spareCapacity,
    initialCapacity
  };
}

function initialRuntime(config: ResolvedConfig): RuntimeState {
  const fromValues = config.operation !== 'append-sequence';
  const size = fromValues ? config.values.length : 0;
  const slots: (number | null)[] = Array.from({ length: config.initialCapacity }, (_, index) =>
    fromValues && index < size ? config.values[index] : null
  );
  return {
    slots,
    oldSlots: null,
    copySlots: null,
    size,
    capacity: config.initialCapacity,
    oldCapacity: null,
    i: null,
    readIndex: null,
    writeIndex: null,
    shifted: [],
    copied: [],
    result: null,
    resultIndex: null,
    appendsCompleted: 0,
    totalElementCopies: 0,
    cumulativeWork: {},
    operationCount: 0
  };
}

function traceState(state: RuntimeState, config: ResolvedConfig): Record<string, TraceValue> {
  return {
    operation: config.operation,
    values: [...config.values],
    position: config.position,
    target: config.target,
    newValue: config.newValue,
    spareCapacity: config.spareCapacity,
    slots: [...state.slots],
    oldSlots: state.oldSlots ? [...state.oldSlots] : null,
    copySlots: state.copySlots ? [...state.copySlots] : null,
    size: state.size,
    capacity: state.capacity,
    oldCapacity: state.oldCapacity,
    i: state.i,
    readIndex: state.readIndex,
    writeIndex: state.writeIndex,
    shifted: [...state.shifted],
    copied: [...state.copied],
    result: state.result,
    resultIndex: state.resultIndex,
    appendsCompleted: state.appendsCompleted,
    totalElementCopies: state.totalElementCopies,
    cumulativeWork: cloneWork(state.cumulativeWork),
    operationCount: state.operationCount
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

const STRUCT_SOURCE: Record<SupportedLanguage, SourceTemplateLine[]> = {
  c: [
    [undefined, '#include <stdlib.h>'],
    [undefined, '/* Fixed form: int fixed[N]; its capacity cannot grow. */'],
    [undefined, '/* Dynamic form: an allocated C buffer plus size and capacity. */'],
    [undefined, 'typedef struct {'],
    [undefined, '  int *data;'],
    [undefined, '  int size;'],
    [undefined, '  int capacity;'],
    [undefined, '} DynArray;'],
    [undefined, '']
  ],
  cpp: [
    [undefined, '#include <vector>'],
    [undefined, '// Fixed counterpart: std::array<int, N>.'],
    [undefined, '// std::vector supplies native storage; size/capacity stay explicit for tracing.'],
    [undefined, 'struct DynArray {'],
    [undefined, '  std::vector<int> slots;'],
    [undefined, '  int size;'],
    [undefined, '  int capacity;'],
    [undefined, '};'],
    [undefined, '']
  ],
  java: [
    [undefined, 'import java.util.ArrayList;'],
    [undefined, 'import java.util.Collections;'],
    [
      undefined,
      '// Fixed counterpart: int[]. ArrayList<Integer> is the native growable container.'
    ],
    [undefined, 'final class DynArray {'],
    [undefined, '  ArrayList<Integer> slots;'],
    [undefined, '  int size;'],
    [undefined, '  int capacity;'],
    [undefined, '  DynArray(int capacity) {'],
    [undefined, '    this.capacity = capacity;'],
    [undefined, '    this.slots = new ArrayList<>(capacity);'],
    [undefined, '    for (int i = 0; i < capacity; i++) slots.add(null);'],
    [undefined, '  }'],
    [undefined, '  DynArray(int capacity, int size) { this(capacity); this.size = size; }'],
    [undefined, '']
  ],
  python: [
    [undefined, '# Python has no fixed built-in list; list is its native growable container.'],
    [undefined, '# Capacity is explicit here solely so each internal resize can be traced.'],
    [undefined, 'class DynArray:'],
    [undefined, '    def __init__(self, capacity, size=0):'],
    [undefined, '        self.slots = [None] * capacity'],
    [undefined, '        self.size = size'],
    [undefined, '        self.capacity = capacity'],
    [undefined, '']
  ]
};

function operationSource(config: ResolvedConfig): QuadSourceLine[] {
  switch (config.operation) {
    case 'access':
      return [
        quad(
          undefined,
          'int access(DynArray *a, int i) {',
          'int access(const DynArray& a, int i) {',
          '  int access(int i) {',
          '    def access(self, i):'
        ),
        quad(
          'access-address',
          '  int *slot = a->data + i; /* modeled offset i * sizeof(int) */',
          '  int index = i; // vector indexing; physical address is not exposed',
          '    int index = i; // ArrayList exposes an index, not a byte address',
          '        index = i  # list exposes an index, not a byte address'
        ),
        quad(
          'access-read',
          '  return *slot;',
          '  return a.slots[index];',
          '    return slots.get(index);',
          '        return self.slots[index]'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'update':
      return [
        quad(
          undefined,
          'void update(DynArray *a, int i, int v) {',
          'void update(DynArray& a, int i, int v) {',
          '  void update(int i, int v) {',
          '    def update(self, i, v):'
        ),
        quad(
          'update-address',
          '  int *slot = a->data + i; /* modeled offset i * sizeof(int) */',
          '  int index = i; // vector indexing; physical address is not exposed',
          '    int index = i; // ArrayList exposes an index, not a byte address',
          '        index = i  # list exposes an index, not a byte address'
        ),
        quad(
          'update-write',
          '  *slot = v;',
          '  a.slots[index] = v;',
          '    slots.set(index, v);',
          '        self.slots[index] = v'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'search':
      return [
        quad(
          undefined,
          'int search(DynArray *a, int target) {',
          'int search(const DynArray& a, int target) {',
          '  int search(int target) {',
          '    def search(self, target):'
        ),
        quad(
          'search-check',
          '  for (int i = 0; i < a->size; ++i) {',
          '  for (int i = 0; i < a.size; ++i) {',
          '    for (int i = 0; i < size; i++) {',
          '        for i in range(self.size):'
        ),
        quad(
          'search-compare',
          '    if (a->data[i] == target)',
          '    if (a.slots[i] == target)',
          '      if (slots.get(i) == target)',
          '            if self.slots[i] == target:'
        ),
        quad(
          'search-found',
          '      return i;',
          '      return i;',
          '        return i;',
          '                return i'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'search-missing',
          '  return -1;',
          '  return -1;',
          '    return -1;',
          '        return -1'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert-beginning':
    case 'insert-middle':
      return [
        quad(
          undefined,
          'void insertAt(DynArray *a, int p, int v) {',
          'void insertAt(DynArray& a, int p, int v) {',
          '  void insertAt(int p, int v) {',
          '    def insert_at(self, p, v):'
        ),
        quad(
          'insert-shift-check',
          '  for (int i = a->size; i > p; --i) {',
          '  for (int i = a.size; i > p; --i) {',
          '    for (int i = size; i > p; i--) {',
          '        for i in range(self.size, p, -1):'
        ),
        quad(
          'insert-shift-move',
          '    a->data[i] = a->data[i - 1];',
          '    a.slots[i] = a.slots[i - 1];',
          '      slots.set(i, slots.get(i - 1));',
          '            self.slots[i] = self.slots[i - 1]'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'insert-write',
          '  a->data[p] = v;',
          '  a.slots[p] = v;',
          '    slots.set(p, v);',
          '        self.slots[p] = v'
        ),
        quad(
          'insert-size',
          '  a->size += 1;',
          '  a.size += 1;',
          '    size += 1;',
          '        self.size += 1'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'insert-end':
      if (config.spareCapacity) {
        return [
          quad(
            undefined,
            'void append(DynArray *a, int v) {',
            'void append(DynArray& a, int v) {',
            '  void append(int v) {',
            '    def append(self, v):'
          ),
          quad(
            'append-capacity-check',
            '  if (a->size >= a->capacity) return; /* spare-capacity guard */',
            '  if (a.size >= a.capacity) return; // spare-capacity guard',
            '    if (size >= capacity) return; // spare-capacity guard',
            '        if self.size >= self.capacity: return  # spare-capacity guard'
          ),
          quad(
            'append-write',
            '  a->data[a->size] = v;',
            '  a.slots[a.size] = v;',
            '    slots.set(size, v);',
            '        self.slots[self.size] = v'
          ),
          quad(
            'append-size',
            '  a->size += 1;',
            '  a.size += 1;',
            '    size += 1;',
            '        self.size += 1'
          ),
          quad(undefined, '}', '}', '  }', '')
        ];
      }
      return [
        quad(
          undefined,
          'void append(DynArray *a, int v) {',
          'void append(DynArray& a, int v) {',
          '  void append(int v) {',
          '    def append(self, v):'
        ),
        quad(
          'append-capacity-check',
          '  if (a->size == a->capacity) {',
          '  if (a.size == a.capacity) {',
          '    if (size == capacity) {',
          '        if self.size == self.capacity:'
        ),
        quad(
          'append-allocate',
          '    int nextCapacity = a->capacity == 0 ? 1 : 2 * a->capacity; int *bigger = malloc(nextCapacity * sizeof(int));',
          '    int nextCapacity = a.capacity == 0 ? 1 : 2 * a.capacity; std::vector<int> bigger(nextCapacity);',
          '      int nextCapacity = capacity == 0 ? 1 : 2 * capacity; ArrayList<Integer> bigger = new ArrayList<>(Collections.nCopies(nextCapacity, null));',
          '            next_capacity = 1 if self.capacity == 0 else 2 * self.capacity; bigger = [None] * next_capacity'
        ),
        quad(
          'append-copy-check',
          '    for (int i = 0; i < a->size; ++i) {',
          '    for (int i = 0; i < a.size; ++i) {',
          '      for (int i = 0; i < size; i++) {',
          '            for i in range(self.size):'
        ),
        quad(
          'append-copy-move',
          '      bigger[i] = a->data[i];',
          '      bigger[i] = a.slots[i];',
          '        bigger.set(i, slots.get(i));',
          '                bigger[i] = self.slots[i]'
        ),
        quad(undefined, '    }', '    }', '      }', ''),
        quad(
          'append-swap-buffer',
          '    free(a->data); a->data = bigger; a->capacity = nextCapacity; /* C frees explicitly */',
          '    a.slots.swap(bigger); a.capacity = nextCapacity; // retired storage follows RAII',
          '      slots = bigger; capacity = nextCapacity; // retire reference; GC timing is not modeled',
          '            self.slots = bigger; self.capacity = next_capacity  # retire reference; reclamation timing is not modeled'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'append-write',
          '  a->data[a->size] = v;',
          '  a.slots[a.size] = v;',
          '    slots.set(size, v);',
          '        self.slots[self.size] = v'
        ),
        quad(
          'append-size',
          '  a->size += 1;',
          '  a.size += 1;',
          '    size += 1;',
          '        self.size += 1'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete-beginning':
    case 'delete-middle':
      return [
        quad(
          undefined,
          'void deleteAt(DynArray *a, int p) {',
          'void deleteAt(DynArray& a, int p) {',
          '  void deleteAt(int p) {',
          '    def delete_at(self, p):'
        ),
        quad(
          'delete-shift-check',
          '  for (int i = p; i < a->size - 1; ++i) {',
          '  for (int i = p; i < a.size - 1; ++i) {',
          '    for (int i = p; i < size - 1; i++) {',
          '        for i in range(p, self.size - 1):'
        ),
        quad(
          'delete-shift-move',
          '    a->data[i] = a->data[i + 1];',
          '    a.slots[i] = a.slots[i + 1];',
          '      slots.set(i, slots.get(i + 1));',
          '            self.slots[i] = self.slots[i + 1]'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'delete-size',
          '  a->size -= 1;',
          '  a.size -= 1;',
          '    size -= 1;',
          '        self.size -= 1'
        ),
        quad(
          'delete-clear',
          '  a->data[a->size] = 0; /* clear the now-unused teaching slot */',
          '  a.slots[a.size] = 0; // clear the now-unused teaching slot',
          '    slots.set(size, null);',
          '        self.slots[self.size] = None'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'delete-end':
      return [
        quad(
          undefined,
          'void deleteEnd(DynArray *a) {',
          'void deleteEnd(DynArray& a) {',
          '  void deleteEnd() {',
          '    def delete_end(self):'
        ),
        quad(
          'delete-end-size',
          '  a->size -= 1;   /* no element moves */',
          '  a.size -= 1;    // no element moves',
          '    size -= 1;      // no element moves',
          '        self.size -= 1  # no element moves'
        ),
        quad(
          'delete-end-clear',
          '  a->data[a->size] = 0;',
          '  a.slots[a.size] = 0;',
          '    slots.set(size, null);',
          '        self.slots[self.size] = None'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'copy':
      return [
        quad(
          undefined,
          'DynArray copy(DynArray *a) {',
          'DynArray copy(const DynArray& a) {',
          '  DynArray copy() {',
          '    def copy(self):'
        ),
        quad(
          'copy-allocate',
          '  int *dest = malloc(a->capacity * sizeof(int));',
          '  DynArray dest{std::vector<int>(a.capacity), a.size, a.capacity};',
          '    DynArray dest = new DynArray(capacity, size);',
          '        dest = DynArray(self.capacity, self.size)'
        ),
        quad(
          'copy-check',
          '  for (int i = 0; i < a->size; ++i) {',
          '  for (int i = 0; i < a.size; ++i) {',
          '    for (int i = 0; i < size; i++) {',
          '        for i in range(self.size):'
        ),
        quad(
          'copy-move',
          '    dest[i] = a->data[i];',
          '    dest.slots[i] = a.slots[i];',
          '      dest.slots.set(i, slots.get(i));',
          '            dest.slots[i] = self.slots[i]'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad(
          'copy-return',
          '  return (DynArray){dest, a->size, a->capacity};',
          '  return dest;',
          '    return dest;',
          '        return dest'
        ),
        quad(undefined, '}', '}', '  }', '')
      ];
    case 'append-sequence':
      return [
        quad(
          undefined,
          'void appendAll(DynArray *a, int *vs, int k) {',
          'void appendAll(DynArray& a, const std::vector<int>& values) {',
          '  void appendAll(ArrayList<Integer> values) {',
          '    def append_all(self, values):'
        ),
        quad(
          'seq-next',
          '  for (int j = 0; j < k; ++j) {',
          '  for (int j = 0; j < (int)values.size(); ++j) {',
          '    for (int j = 0; j < values.size(); j++) {',
          '        for j, value in enumerate(values):'
        ),
        quad(
          'append-capacity-check',
          '    if (a->size == a->capacity) {',
          '    if (a.size == a.capacity) {',
          '      if (size == capacity) {',
          '            if self.size == self.capacity:'
        ),
        quad(
          'append-allocate',
          '      int *bigger = malloc(2 * a->capacity * sizeof(int));',
          '      std::vector<int> bigger(2 * a.capacity);',
          '        ArrayList<Integer> bigger = new ArrayList<>(Collections.nCopies(2 * capacity, null));',
          '                bigger = [None] * (2 * self.capacity)'
        ),
        quad(
          'append-copy-check',
          '      for (int i = 0; i < a->size; ++i) {',
          '      for (int i = 0; i < a.size; ++i) {',
          '        for (int i = 0; i < size; i++) {',
          '                for i in range(self.size):'
        ),
        quad(
          'append-copy-move',
          '        bigger[i] = a->data[i];',
          '        bigger[i] = a.slots[i];',
          '          bigger.set(i, slots.get(i));',
          '                    bigger[i] = self.slots[i]'
        ),
        quad(undefined, '      }', '      }', '        }', ''),
        quad(
          'append-swap-buffer',
          '      free(a->data); a->data = bigger; a->capacity *= 2; /* C frees explicitly */',
          '      a.slots.swap(bigger); a.capacity *= 2; // retired storage follows RAII',
          '        slots = bigger; capacity *= 2; // retire reference; GC timing is not modeled',
          '                self.slots = bigger; self.capacity *= 2  # retire reference; reclamation timing is not modeled'
        ),
        quad(undefined, '    }', '    }', '      }', ''),
        quad(
          'append-write',
          '    a->data[a->size] = vs[j];',
          '    a.slots[a.size] = values[j];',
          '      slots.set(size, values.get(j));',
          '            self.slots[self.size] = value'
        ),
        quad(
          'append-size',
          '    a->size += 1;',
          '    a.size += 1;',
          '      size += 1;',
          '            self.size += 1'
        ),
        quad(undefined, '  }', '  }', '    }', ''),
        quad('seq-return', '  return;', '  return;', '    return;', '        return None'),
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
  return [...STRUCT_SOURCE[language], ...body, ...closing].map(([semantic, text], index) => ({
    id: `${config.operation}-${language}-${index + 1}`,
    number: index + 1,
    text,
    ...(semantic ? { semanticOperationId: semantic } : {})
  }));
}

function findCase(operationId: DynamicArrayOperation, caseId: string): DynamicArrayComplexityCase {
  const selected = getDynamicArrayOperationMetadata(operationId).cases.find(
    (candidate) => candidate.id === caseId
  );
  if (!selected) throw new Error(`Missing dynamic-array complexity case: ${caseId}`);
  return selected;
}

function deriveComplexity(selected: DynamicArrayComplexityCase, config: ResolvedConfig): string[] {
  const n = config.values.length;
  switch (selected.id) {
    case 'access-direct':
    case 'update-direct':
      return [
        `address = ${slotAddress(0)} + index × ${ELEMENT_SIZE_BYTES} is one multiply and one add at any n.`,
        'One addressed memory operation follows the arithmetic.',
        'A fixed primitive count is O(1) time with O(1) auxiliary space.'
      ];
    case 'append-capacity':
      return [
        'size < capacity, so slot[size] already exists.',
        'One write and one size increment happen regardless of n.',
        'A fixed primitive count is O(1).'
      ];
    case 'append-resize':
      return [
        `size == capacity == ${n}, so a ${Math.max(1, 2 * n)}-slot buffer is allocated first.`,
        `All ${n} elements are copied — one read and one write each — before the new value lands.`,
        'The copy loop grows linearly with n: O(n) time and O(n) transient auxiliary space.'
      ];
    case 'append-amortized':
      return [
        'Each resize doubles capacity, so copies happen at sizes 1, 2, 4, 8, …',
        `The copy total is a geometric series bounded by 2k (here: ${''}watch totalElementCopies stay below 2 × appends).`,
        'k appends cost at most 3k primitive writes in total, so each append averages O(1) — amortized, not worst-case.'
      ];
    case 'copy-full':
      return [
        `Every one of the ${n} elements needs exactly one read and one write.`,
        'The returned destination holds n output slots; it is not temporary workspace.',
        'Time and output space grow linearly, while the loop cursor keeps auxiliary space O(1).'
      ];
    default:
      if (selected.timeComplexity === 'O(1)') {
        return [
          selected.description,
          'The number of counted reads, writes, and comparisons stays fixed as n grows.',
          'A bounded primitive count simplifies to O(1).'
        ];
      }
      return [
        selected.description,
        'Each affected slot costs one bounded read-write or comparison.',
        'Up to n affected slots sum to O(n) time, while the cursor set stays O(1) space.'
      ];
  }
}

function selectedCase(config: ResolvedConfig): SelectedCase {
  const firstTargetIndex = config.values.indexOf(config.target);
  const n = config.values.length;
  let caseId: string;
  switch (config.operation) {
    case 'access':
      caseId = 'access-direct';
      break;
    case 'update':
      caseId = 'update-direct';
      break;
    case 'search':
      caseId =
        firstTargetIndex === 0
          ? 'search-best'
          : firstTargetIndex > 0 && firstTargetIndex < n - 1
            ? 'search-average'
            : 'search-worst';
      break;
    case 'insert-beginning':
      caseId = 'insert-begin-shift';
      break;
    case 'insert-middle':
      caseId = config.position === n ? 'insert-middle-append' : 'insert-middle-shift';
      break;
    case 'insert-end':
      caseId = config.spareCapacity ? 'append-capacity' : 'append-resize';
      break;
    case 'delete-beginning':
      caseId = 'delete-begin-shift';
      break;
    case 'delete-middle':
      caseId = config.position === n - 1 ? 'delete-middle-last' : 'delete-middle-shift';
      break;
    case 'delete-end':
      caseId = 'delete-end-direct';
      break;
    case 'copy':
      caseId = 'copy-full';
      break;
    case 'append-sequence':
      caseId = 'append-amortized';
      break;
  }
  const selected = findCase(config.operation, caseId);
  return { ...selected, derivation: deriveComplexity(selected, config) };
}

const scalarFields = ['size', 'capacity', 'i', 'readIndex', 'writeIndex'] as const;

function entitiesFor(state: RuntimeState): TraceEntity[] {
  const slots: TraceEntity[] = state.slots.map((value, index) => ({
    id: `slot-${index}`,
    type: 'array-cell',
    label: `data[${index}]`,
    value: value,
    metadata: {
      address: slotAddress(index),
      inSize: index < state.size,
      shifted: state.shifted.includes(index),
      copied: state.copied.includes(index),
      isRead: state.readIndex === index,
      isWrite: state.writeIndex === index
    }
  }));
  const scalars: TraceEntity[] = scalarFields.map((field) => ({
    id: `var-${field}`,
    type: 'variable',
    label: field,
    value: state[field]
  }));
  return [
    ...slots,
    ...scalars,
    { id: 'result', type: 'variable', label: 'result', value: state.result },
    { id: 'resultIndex', type: 'variable', label: 'result index', value: state.resultIndex },
    { id: 'copy-buffer', type: 'array', label: 'returned copy', value: state.copySlots },
    { id: 'old-buffer', type: 'array', label: 'old resize buffer', value: state.oldSlots },
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
  const beforeSlots = (before.slots as (number | null)[]) ?? [];
  const afterSlots = (after.slots as (number | null)[]) ?? [];
  const maxLength = Math.max(beforeSlots.length, afterSlots.length);
  for (let index = 0; index < maxLength; index++) {
    const previousValue = beforeSlots[index] ?? null;
    const nextValue = afterSlots[index] ?? null;
    if (previousValue !== nextValue) {
      mutations.push({
        entityId: `slot-${index}`,
        property: 'value',
        previousValue,
        nextValue,
        animation: nextValue === null ? 'remove' : 'highlight'
      });
    }
  }
  for (const field of [...scalarFields, 'result', 'resultIndex', 'operationCount'] as const) {
    if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
      mutations.push({
        entityId:
          field === 'operationCount'
            ? 'operation-count'
            : field === 'result' || field === 'resultIndex'
              ? field
              : `var-${field}`,
        property: 'value',
        previousValue: before[field],
        nextValue: after[field],
        animation: 'highlight'
      });
    }
  }
  if (JSON.stringify(before.copySlots) !== JSON.stringify(after.copySlots)) {
    mutations.push({
      entityId: 'copy-buffer',
      property: 'value',
      previousValue: before.copySlots,
      nextValue: after.copySlots,
      animation: 'highlight'
    });
  }
  if (JSON.stringify(before.oldSlots) !== JSON.stringify(after.oldSlots)) {
    mutations.push({
      entityId: 'old-buffer',
      property: 'value',
      previousValue: before.oldSlots,
      nextValue: after.oldSlots,
      animation: before.oldSlots === null ? 'insert' : 'remove'
    });
  }
  return mutations;
}

export interface DynamicArrayMistakeMetadata {
  prompt: string;
  wrongAnswer: TraceValue;
  correctAnswer: TraceValue;
  explanation: string;
  tag: string;
}

function distinctWrongAnswer(correctAnswer: TraceValue, proposed: TraceValue): TraceValue {
  if (JSON.stringify(correctAnswer) !== JSON.stringify(proposed)) return proposed;
  if (typeof correctAnswer === 'number') return correctAnswer + 1;
  if (typeof correctAnswer === 'boolean') return !correctAnswer;
  if (typeof correctAnswer === 'string') return `${correctAnswer} (incorrect)`;
  if (correctAnswer === null) return 'not null';
  return 'different answer';
}

function makePrediction(
  id: string,
  prompt: string,
  type: PredictionChallenge['type'],
  correctAnswer: TraceValue,
  explanation: string,
  tag: string,
  wrongAnswer: TraceValue
): { prediction: PredictionChallenge; mistake: DynamicArrayMistakeMetadata } {
  const safeWrongAnswer = distinctWrongAnswer(correctAnswer, wrongAnswer);
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
    mistake: { prompt, wrongAnswer: safeWrongAnswer, correctAnswer, explanation, tag }
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

    const bufferAuxiliary = state.oldSlots ? state.slots.length : 0;
    const cursorAuxiliary = [state.i, state.readIndex, state.writeIndex].filter(
      (value) => value !== null
    ).length;
    const auxiliaryCurrent = bufferAuxiliary + Math.min(3, cursorAuxiliary);
    const outputCurrent =
      config.operation === 'copy' ? (state.copySlots?.length ?? 0) : state.result === null ? 0 : 1;
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
        auxiliary: { current: auxiliaryCurrent, peak: peakAuxiliary, unit: 'slots + cursors' },
        output: {
          current: outputCurrent,
          peak: peakOutput,
          unit: config.operation === 'copy' ? 'returned buffer slots' : 'reported values'
        },
        callStackDepth: 1
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
    const visualFocus = [state.readIndex, state.writeIndex, state.i]
      .filter(
        (value): value is number => value !== null && value >= 0 && value < state.slots.length
      )
      .map((index) => `slot-${index}`);

    steps.push({
      id: `dynamic-array-${config.operation}-${steps.length}`,
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
        reads: state.cumulativeWork.read ?? 0,
        writes: state.cumulativeWork.write ?? 0,
        swaps: state.cumulativeWork.swap ?? 0
      },
      complexityEvidence,
      metadata: {
        operation: config.operation,
        complexityCase: complexityCase.id,
        spareCapacity: config.spareCapacity,
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

function runAccess(builder: TraceBuilder, config: ResolvedConfig) {
  const index = config.position;
  const checkpoint = makePrediction(
    `array-lab:access:${index}:checkpoint`,
    `Which zero-based backing-slot index does access(${index}) read?`,
    'numeric',
    index,
    `It reads slot index ${index} in every implementation. ReplayCS separately models the C-style teaching address as ${slotAddress(0)} + ${index} × ${ELEMENT_SIZE_BYTES} = ${slotAddress(index)}; Java ArrayList and Python list do not expose that physical address.`,
    'index-vs-value',
    config.values[index]
  );
  builder.add(
    'access-address',
    `Compute the indexed location for ${index}`,
    `The C-style teaching address is ${slotAddress(0)} + ${index} × ${ELEMENT_SIZE_BYTES} = ${slotAddress(index)}; managed containers expose index ${index} instead. No traversal happens.`,
    { read: 1, write: 1 },
    (state) => {
      state.i = index;
      state.readIndex = index;
    },
    checkpoint
  );
  builder.add(
    'access-read',
    `Read slot ${index}`,
    `One read at ${slotAddress(index)} returns ${config.values[index]}, whatever the array size is.`,
    { read: 1, return: 1 },
    (state) => {
      state.result = config.values[index];
      state.resultIndex = index;
    }
  );
}

function runUpdate(builder: TraceBuilder, config: ResolvedConfig) {
  const index = config.position;
  const oldValue = config.values[index];
  const checkpoint = makePrediction(
    `array-lab:update:${index}:checkpoint`,
    `After update(${index}, ${config.newValue}), what does slot ${index} contain?`,
    'numeric',
    config.newValue,
    `The write overwrites ${oldValue}; no other slot changes.`,
    'index-vs-value',
    oldValue
  );
  builder.add(
    'update-address',
    `Compute the indexed location for ${index}`,
    `The C-style teaching address is ${slotAddress(index)}; vector, ArrayList, and list perform the equivalent indexed lookup without exposing that address.`,
    { read: 1, write: 1 },
    (state) => {
      state.i = index;
      state.writeIndex = index;
    },
    checkpoint
  );
  builder.add(
    'update-write',
    `Overwrite slot ${index}`,
    `${oldValue} is replaced by ${config.newValue} with a single addressed write.`,
    { write: 1 },
    (state) => {
      state.slots[index] = config.newValue;
      state.result = config.newValue;
      state.resultIndex = index;
    }
  );
}

function runSearch(builder: TraceBuilder, config: ResolvedConfig) {
  const foundIndex = config.values.indexOf(config.target);
  const checkpoint = makePrediction(
    `array-lab:search:${config.target}:checkpoint`,
    `How many VALUE comparisons does the scan make before returning? (${config.target} ${foundIndex < 0 ? 'is absent' : `is at index ${foundIndex}`})`,
    'numeric',
    foundIndex < 0 ? config.values.length : foundIndex + 1,
    foundIndex < 0
      ? `Every one of the ${config.values.length} slots is compared before -1 is returned.`
      : `Slots 0 through ${foundIndex} are compared: ${foundIndex + 1} comparison${foundIndex === 0 ? '' : 's'}.`,
    'off-by-one',
    foundIndex < 0 ? config.values.length - 1 : foundIndex
  );
  builder.add(
    'search-check',
    'Start the scan at index 0',
    config.values.length === 0
      ? 'The initial 0 < size check is false, so no slot is read.'
      : 'The loop cursor begins at the first slot after the initial condition succeeds.',
    { write: 1, comparison: 1 },
    (state) => {
      state.i = 0;
    },
    checkpoint
  );
  for (let index = 0; index < config.values.length; index++) {
    const value = config.values[index];
    builder.add(
      'search-compare',
      `Compare data[${index}] with ${config.target}`,
      `${value} ${value === config.target ? 'matches' : 'does not match'} the target.`,
      { read: 1, comparison: 1 },
      (state) => {
        state.readIndex = index;
      }
    );
    if (value === config.target) {
      builder.add(
        'search-found',
        `Return index ${index}`,
        'The scan stops at the first match.',
        { return: 1 },
        (state) => {
          state.result = index;
          state.resultIndex = index;
        }
      );
      return;
    }
    const nextIndex = index + 1;
    builder.add(
      'search-check',
      nextIndex < config.values.length
        ? `Advance the cursor to index ${nextIndex}`
        : `Fail the loop check at i = ${nextIndex}`,
      nextIndex < config.values.length
        ? `i < size still holds, so slot ${nextIndex} is inspected next.`
        : `i == size (${config.values.length}), so the final loop condition is false.`,
      { write: 1, comparison: 1, 'loop-iteration': 1 },
      (state) => {
        state.i = nextIndex;
      }
    );
  }
  builder.add(
    'search-missing',
    'Return -1',
    `All ${config.values.length} slots were compared without a match.`,
    { return: 1 },
    (state) => {
      state.result = -1;
      state.resultIndex = -1;
    }
  );
}

function runInsertShift(builder: TraceBuilder, config: ResolvedConfig) {
  const position = config.operation === 'insert-beginning' ? 0 : config.position;
  const n = config.values.length;
  const shiftCount = n - position;
  const checkpoint = makePrediction(
    `array-lab:${config.operation}:${position}:checkpoint`,
    `Which element moves FIRST when inserting at index ${position}?`,
    'text',
    n > position ? `data[${n - 1}]` : 'none',
    shiftCount > 0
      ? `Shifting starts from the back: data[${n - 1}] moves into slot ${n}. Starting from the front would overwrite values before they are saved.`
      : `Position ${position} equals size, so nothing shifts.`,
    'loop-boundary',
    `data[${position}]`
  );
  builder.add(
    'insert-shift-check',
    `Start the shift loop at i = ${n}`,
    shiftCount > 0
      ? `The loop walks from the back (i = ${n}) down to position ${position} so no value is overwritten before it moves.`
      : `i = ${n} is not greater than position ${position}, so the loop body never runs.`,
    { write: 1, comparison: 1 },
    (state) => {
      state.i = n;
    },
    checkpoint
  );
  for (let index = n; index > position; index--) {
    builder.add(
      'insert-shift-move',
      `Shift data[${index - 1}] into slot ${index}`,
      `${config.values[index - 1]} moves right; slot ${index - 1} is now free to receive the next shift.`,
      { read: 1, write: 1, 'loop-iteration': 1 },
      (state) => {
        state.slots[index] = state.slots[index - 1];
        state.readIndex = index - 1;
        state.writeIndex = index;
        if (!state.shifted.includes(index)) state.shifted.push(index);
      }
    );
    const nextIndex = index - 1;
    builder.add(
      'insert-shift-check',
      nextIndex > position
        ? `Check the next shift at i = ${nextIndex}`
        : `Fail the shift check at i = ${nextIndex}`,
      nextIndex > position
        ? `${nextIndex} > ${position}, so another element must move right.`
        : `${nextIndex} is not greater than ${position}; the loop is complete.`,
      { write: 1, comparison: 1 },
      (state) => {
        state.i = nextIndex;
      }
    );
  }
  builder.add(
    'insert-write',
    `Write ${config.newValue} into slot ${position}`,
    shiftCount > 0
      ? `After ${shiftCount} read-write pair${shiftCount === 1 ? '' : 's'}, slot ${position} is free.`
      : 'No shift was needed; the write lands immediately.',
    { write: 1 },
    (state) => {
      state.slots[position] = config.newValue;
      state.writeIndex = position;
      state.readIndex = null;
    }
  );
  builder.add(
    'insert-size',
    `Increment size to ${n + 1}`,
    'The logical size now includes the inserted element.',
    { write: 1 },
    (state) => {
      state.size = n + 1;
      state.result = config.newValue;
      state.resultIndex = position;
    }
  );
}

function appendSteps(
  builder: TraceBuilder,
  value: number,
  options: { sequence: boolean; checkpoint?: ReturnType<typeof makePrediction> }
) {
  const state = builder.state;
  const isFull = state.size === state.capacity;
  builder.add(
    'append-capacity-check',
    `Check capacity: size ${state.size} vs capacity ${state.capacity}`,
    isFull
      ? 'size equals capacity — there is no free slot, so the buffer must grow first.'
      : `size < capacity: slot ${state.size} is already available.`,
    { read: 2, comparison: 1 },
    undefined,
    options.checkpoint
  );
  if (isFull) {
    const oldCapacity = state.capacity;
    const newCapacity = Math.max(1, oldCapacity * 2);
    builder.add(
      'append-allocate',
      `Allocate a ${newCapacity}-slot buffer`,
      `Doubling ${oldCapacity} → ${newCapacity} keeps future appends cheap; the old buffer stays alive during the copy.`,
      { allocation: 1 },
      (s) => {
        s.oldSlots = [...s.slots];
        s.oldCapacity = oldCapacity;
        s.slots = Array.from({ length: newCapacity }, () => null);
        s.copied = [];
      }
    );
    const count = state.size;
    builder.add(
      'append-copy-check',
      `Start the copy loop at i = 0`,
      count > 0
        ? `0 < ${count}, so the first existing element must be copied.`
        : 'The old buffer has no logical elements, so the copy loop is skipped.',
      { write: 1, comparison: 1 },
      (s) => {
        s.i = 0;
      }
    );
    for (let index = 0; index < count; index++) {
      builder.add(
        'append-copy-move',
        `Copy element ${index} into the new buffer`,
        `data[${index}] = ${state.oldSlots?.[index]} costs one read and one write.`,
        { read: 1, write: 1, 'loop-iteration': 1 },
        (s) => {
          s.slots[index] = s.oldSlots?.[index] ?? null;
          s.i = index;
          s.readIndex = index;
          s.writeIndex = index;
          s.copied = [...s.copied, index];
          s.totalElementCopies += 1;
        }
      );
      const nextIndex = index + 1;
      builder.add(
        'append-copy-check',
        nextIndex < count
          ? `Check the next copy at i = ${nextIndex}`
          : `Fail the copy check at i = ${nextIndex}`,
        nextIndex < count
          ? `${nextIndex} < ${count}, so another existing element must be copied.`
          : `${nextIndex} == size, so the copy loop is complete.`,
        { write: 1, comparison: 1 },
        (s) => {
          s.i = nextIndex;
        }
      );
    }
    builder.add(
      'append-swap-buffer',
      'Install the new buffer and retire the old reference',
      `The backing reference and capacity now describe the ${newCapacity}-slot buffer. C frees its retired ${oldCapacity}-slot allocation explicitly; C++ lifetime rules and Java/Python runtimes decide physical reclamation, which this portable count does not claim.`,
      { write: 2 },
      (s) => {
        s.oldSlots = null;
        s.oldCapacity = null;
        s.capacity = newCapacity;
        s.i = null;
        s.readIndex = null;
        s.writeIndex = null;
      }
    );
  }
  builder.add(
    'append-write',
    `Write ${value} into slot ${state.size}`,
    `The append itself is always exactly one write into slot ${state.size}.`,
    { write: 1 },
    (s) => {
      s.slots[s.size] = value;
      s.writeIndex = s.size;
    }
  );
  builder.add(
    'append-size',
    `Increment size to ${state.size + 1}`,
    'The new element is now inside the logical array.',
    { write: 1 },
    (s) => {
      s.size += 1;
      s.appendsCompleted += 1;
      s.result = value;
      s.resultIndex = s.size - 1;
      s.writeIndex = null;
    }
  );
}

function runInsertEnd(builder: TraceBuilder, config: ResolvedConfig) {
  const n = config.values.length;
  const checkpoint = makePrediction(
    `array-lab:insert-end:${config.spareCapacity ? 'capacity' : 'resize'}:checkpoint`,
    `size is ${n} and capacity is ${builder.state.capacity}. How many EXISTING elements get copied before ${config.newValue} is written?`,
    'numeric',
    config.spareCapacity ? 0 : n,
    config.spareCapacity
      ? 'size < capacity, so the write lands directly: zero copies.'
      : `size == capacity forces a resize that copies all ${n} elements first.`,
    'capacity-vs-size',
    config.spareCapacity ? n : 0
  );
  appendSteps(builder, config.newValue, { sequence: false, checkpoint });
}

function runDeleteShift(builder: TraceBuilder, config: ResolvedConfig) {
  const position = config.operation === 'delete-beginning' ? 0 : config.position;
  const n = config.values.length;
  const shiftCount = n - position - 1;
  const removed = config.values[position];
  const checkpoint = makePrediction(
    `array-lab:${config.operation}:${position}:checkpoint`,
    `How many elements shift left when index ${position} is deleted from ${n} elements?`,
    'numeric',
    shiftCount,
    shiftCount === 0
      ? 'The last element has no suffix; only size changes.'
      : `Indices ${position + 1} through ${n - 1} each move one slot left: ${shiftCount} moves.`,
    'off-by-one',
    Math.max(0, shiftCount === 0 ? 1 : shiftCount + 1)
  );
  builder.add(
    'delete-shift-check',
    `Start the shift loop at i = ${position}`,
    shiftCount > 0
      ? `Deleting inside the array leaves a gap at ${position}; the suffix closes it from the left.`
      : 'The loop condition fails immediately; there is no suffix to move.',
    { write: 1, comparison: 1 },
    (state) => {
      state.i = position;
    },
    checkpoint
  );
  for (let index = position; index < n - 1; index++) {
    builder.add(
      'delete-shift-move',
      `Shift data[${index + 1}] into slot ${index}`,
      `${config.values[index + 1]} moves left over the ${index === position ? `removed ${removed}` : 'previous copy'}.`,
      { read: 1, write: 1, 'loop-iteration': 1 },
      (state) => {
        state.slots[index] = state.slots[index + 1];
        state.readIndex = index + 1;
        state.writeIndex = index;
        if (!state.shifted.includes(index)) state.shifted.push(index);
      }
    );
    const nextIndex = index + 1;
    builder.add(
      'delete-shift-check',
      nextIndex < n - 1
        ? `Check the next shift at i = ${nextIndex}`
        : `Fail the shift check at i = ${nextIndex}`,
      nextIndex < n - 1
        ? `${nextIndex} < ${n - 1}, so another survivor must move left.`
        : `${nextIndex} is not less than ${n - 1}; the shift loop is complete.`,
      { write: 1, comparison: 1 },
      (state) => {
        state.i = nextIndex;
      }
    );
  }
  builder.add(
    'delete-size',
    `Decrement size to ${n - 1}`,
    `Slot ${n - 1} is now outside the logical array; the next displayed line clears that unused teaching slot.`,
    { write: 1 },
    (state) => {
      state.size = n - 1;
      state.result = removed;
      state.resultIndex = position;
      state.readIndex = null;
    }
  );
  builder.add(
    'delete-clear',
    `Clear unused slot ${n - 1}`,
    'This explicit write keeps spare capacity visually distinct from the logical array and is included in the exact count.',
    { write: 1 },
    (state) => {
      state.slots[n - 1] = null;
      state.writeIndex = n - 1;
    }
  );
}

function runDeleteEnd(builder: TraceBuilder, config: ResolvedConfig) {
  const n = config.values.length;
  const removed = config.values[n - 1];
  const checkpoint = makePrediction(
    'array-lab:delete-end:checkpoint',
    'How many elements shift when the LAST element is deleted?',
    'numeric',
    0,
    'Deleting at the end never leaves a gap, so only the size changes — that is why stacks grow at this end.',
    'capacity-vs-size',
    n - 1
  );
  builder.add(
    'delete-end-size',
    `Decrement size to ${n - 1}`,
    `${removed} is outside the logical array as soon as size excludes it; zero elements shift.`,
    { write: 1 },
    (state) => {
      state.size = n - 1;
      state.result = removed;
      state.resultIndex = n - 1;
    },
    checkpoint
  );
  builder.add(
    'delete-end-clear',
    `Clear unused slot ${n - 1}`,
    'The separate clear write is visible and counted; it does not shift any surviving element.',
    { write: 1 },
    (state) => {
      state.slots[n - 1] = null;
      state.writeIndex = n - 1;
    }
  );
}

function runCopy(builder: TraceBuilder, config: ResolvedConfig) {
  const n = config.values.length;
  const checkpoint = makePrediction(
    'array-lab:copy:checkpoint',
    `Copying ${n} elements costs how many primitive memory operations (reads + writes)?`,
    'numeric',
    2 * n,
    `Each element needs one read from the source and one write to the destination: ${n} + ${n} = ${2 * n}.`,
    'off-by-one',
    n
  );
  builder.add(
    'copy-allocate',
    `Allocate a ${config.initialCapacity}-slot destination`,
    'The new destination is O(n) returned output, not temporary workspace; the loop cursor is O(1) auxiliary space.',
    { allocation: 1 },
    (state) => {
      state.copySlots = Array.from({ length: config.initialCapacity }, () => null);
    },
    checkpoint
  );
  builder.add(
    'copy-check',
    'Start the copy loop at i = 0',
    n === 0
      ? '0 is not less than size 0, so the copy loop is skipped.'
      : `0 < ${n}, so the first source element must be copied.`,
    { write: 1, comparison: 1 },
    (state) => {
      state.i = 0;
    }
  );
  for (let index = 0; index < n; index++) {
    builder.add(
      'copy-move',
      `Copy element ${index}`,
      `dest[${index}] = ${config.values[index]}: one read, one write.`,
      { read: 1, write: 1, 'loop-iteration': 1 },
      (state) => {
        if (state.copySlots) state.copySlots[index] = config.values[index];
        state.i = index;
        state.readIndex = index;
        state.writeIndex = index;
        state.copied = [...state.copied, index];
        state.totalElementCopies += 1;
      }
    );
    const nextIndex = index + 1;
    builder.add(
      'copy-check',
      nextIndex < n
        ? `Check the next copy at i = ${nextIndex}`
        : `Fail the copy check at i = ${nextIndex}`,
      nextIndex < n
        ? `${nextIndex} < ${n}, so another source element must be copied.`
        : `${nextIndex} == size, so the copy loop is complete.`,
      { write: 1, comparison: 1 },
      (state) => {
        state.i = nextIndex;
      }
    );
  }
  builder.add(
    'copy-return',
    'Return the copy',
    `The two buffers are now independent: updating one never changes the other.`,
    { return: 1 },
    (state) => {
      state.result = 'copy complete';
      state.i = null;
      state.readIndex = null;
      state.writeIndex = null;
    }
  );
}

function runAppendSequence(builder: TraceBuilder, config: ResolvedConfig) {
  const k = config.values.length;
  const resizes: number[] = [];
  let capacity = 1;
  let size = 0;
  let copies = 0;
  for (let index = 0; index < k; index++) {
    if (size === capacity) {
      copies += size;
      resizes.push(size);
      capacity *= 2;
    }
    size += 1;
  }
  const checkpoint = makePrediction(
    `array-lab:append-sequence:${k}:checkpoint`,
    `Appending ${k} values into a capacity-1 buffer with doubling: how many TOTAL element copies happen across all resizes?`,
    'numeric',
    copies,
    `Resizes copy ${resizes.join(' + ') || '0'} = ${copies} elements — below 2 × ${k} = ${2 * k}, which is why the average append is O(1).`,
    'amortized-vs-worst',
    k * k
  );
  for (const [index, value] of config.values.entries()) {
    builder.add(
      'seq-next',
      `Select append ${index + 1} of ${k}`,
      `The outer loop condition ${index} < ${k} is true, so ${value} is the next value appended.`,
      { read: 1, write: 1, comparison: 1, 'loop-iteration': 1 },
      (state) => {
        state.i = index;
      },
      index === 0 ? checkpoint : undefined
    );
    appendSteps(builder, value, { sequence: true });
  }
  builder.add(
    'seq-next',
    `Fail the outer loop check at j = ${k}`,
    `${k} is not less than ${k}, so no further input value is read.`,
    { write: 1, comparison: 1 },
    (state) => {
      state.i = k;
    }
  );
  builder.add(
    'seq-return',
    'Sequence complete',
    `${k} appends performed ${builder.state.totalElementCopies} resize copies in total (bound: ${2 * k}). Average cost per append stays constant even though single resizes cost O(n).`,
    { return: 1 },
    (state) => {
      state.result = `${state.appendsCompleted} appends, ${state.totalElementCopies} copies`;
      state.i = null;
    }
  );
}

const LESSON_OBJECTIVES = [
  'Explain why index arithmetic makes array access O(1) at any size',
  'Count the exact shifts that make front and middle insertion O(n)',
  'Distinguish a worst-case O(n) resize from the amortized O(1) append it enables'
];

export function createDynamicArrayLesson(
  input: DynamicArrayConfig = DEFAULT_DYNAMIC_ARRAY_CONFIG
): TraceLesson {
  const config = resolveConfig(input);
  const complexityCase = selectedCase(config);
  const builder = createTraceBuilder(config, complexityCase, initialRuntime(config));
  switch (config.operation) {
    case 'access':
      runAccess(builder, config);
      break;
    case 'update':
      runUpdate(builder, config);
      break;
    case 'search':
      runSearch(builder, config);
      break;
    case 'insert-beginning':
    case 'insert-middle':
      runInsertShift(builder, config);
      break;
    case 'insert-end':
      runInsertEnd(builder, config);
      break;
    case 'delete-beginning':
    case 'delete-middle':
      runDeleteShift(builder, config);
      break;
    case 'delete-end':
      runDeleteEnd(builder, config);
      break;
    case 'copy':
      runCopy(builder, config);
      break;
    case 'append-sequence':
      runAppendSequence(builder, config);
      break;
  }
  const metadata = getDynamicArrayOperationMetadata(config.operation);
  return {
    id: 'array-lab',
    subject: 'dsa-1',
    topic: 'Arrays & Dynamic Arrays',
    title: `Array Lab — ${metadata.label}`,
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
