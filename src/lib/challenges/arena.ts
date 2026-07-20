import type { MisconceptionTag } from '$lib/progress/misconceptions';
import type { SubjectId } from '$lib/trace/types';

export type ChallengeId =
  | 'binary-bound-boss'
  | 'bfs-frontier-boss'
  | 'sql-pipeline-boss'
  | 'round-robin-boss'
  | 'packet-route-boss';

export interface ChallengeOption {
  id: string;
  label: string;
}

export interface ChallengeCheckpoint {
  id: string;
  prompt: string;
  detail: string;
  options: ChallengeOption[];
  correctOptionId: string;
  correctFeedback: string;
  incorrectFeedback: string;
  revealExplanation: string;
  misconceptionTag: MisconceptionTag;
}

export interface ChallengeArtifact {
  title: string;
  caption: string;
  code?: string;
  columns: string[];
  rows: string[][];
  notes: string[];
}

export interface ArenaChallenge {
  id: ChallengeId;
  subjectId: SubjectId;
  subjectLabel: string;
  title: string;
  shortTitle: string;
  difficulty: 'Foundation' | 'Intermediate';
  estimatedMinutes: number;
  xpReward: number;
  scenario: string;
  objective: string;
  accent: 'cyan' | 'violet' | 'amber' | 'green' | 'blue';
  artifact: ChallengeArtifact;
  checkpoints: ChallengeCheckpoint[];
  lessonHref: string;
}

export interface ChallengeEvaluation {
  challengeId: ChallengeId;
  checkpointId: string;
  answerId: string;
  correct: boolean;
  feedback: string;
}

export const arenaChallenges: readonly ArenaChallenge[] = [
  {
    id: 'binary-bound-boss',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Binary Bounds Boss',
    shortTitle: 'Binary bounds',
    difficulty: 'Foundation',
    estimatedMinutes: 2,
    xpReward: 30,
    scenario:
      'Search for 27 in a sorted array. The current bounds are low = 0 and high = 6, so index 3 is inspected first.',
    objective: 'Update inclusive bounds without confusing an index with the value stored there.',
    accent: 'cyan',
    artifact: {
      title: 'Search state',
      caption: 'The midpoint is floor((low + high) / 2). Bounds are inclusive.',
      columns: ['Index', '0', '1', '2', '3', '4', '5', '6'],
      rows: [
        ['Value', '4', '9', '13', '18', '27', '31', '42'],
        ['Role', 'low', '', '', 'mid', '', '', 'high']
      ],
      notes: ['target = 27', 'values[3] = 18', '18 < 27']
    },
    checkpoints: [
      {
        id: 'update-inclusive-bounds',
        prompt: 'Which bounds should the next iteration use?',
        detail: 'The midpoint value 18 is smaller than the target 27.',
        options: [
          { id: 'low-3-high-6', label: 'low = 3, high = 6' },
          { id: 'low-4-high-6', label: 'low = 4, high = 6' },
          { id: 'low-0-high-2', label: 'low = 0, high = 2' },
          { id: 'low-4-high-5', label: 'low = 4, high = 5' }
        ],
        correctOptionId: 'low-4-high-6',
        correctFeedback: 'Correct. Index 3 was ruled out, so low moves to mid + 1 = 4.',
        incorrectFeedback:
          'That range either keeps a ruled-out index or discards values that could still match.',
        revealExplanation:
          'With inclusive bounds, a midpoint smaller than the target causes low = mid + 1. High remains 6.',
        misconceptionTag: 'off-by-one'
      },
      {
        id: 'inspect-next-midpoint',
        prompt: 'Which array value is inspected next?',
        detail: 'Continue from low = 4 and high = 6.',
        options: [
          { id: 'value-27', label: '27 at index 4' },
          { id: 'value-31', label: '31 at index 5' },
          { id: 'value-42', label: '42 at index 6' },
          { id: 'value-18', label: '18 at index 3' }
        ],
        correctOptionId: 'value-31',
        correctFeedback: 'Exactly. floor((4 + 6) / 2) = 5, so the next value is 31.',
        incorrectFeedback:
          'Recompute the midpoint from the updated indexes before reading the array.',
        revealExplanation:
          'The next midpoint index is 5. Index 5 stores 31; the algorithm compares the value, not the index, with 27.',
        misconceptionTag: 'index-vs-value'
      }
    ],
    lessonHref: '/lesson/dsa-1/binary-search'
  },
  {
    id: 'bfs-frontier-boss',
    subjectId: 'dsa-2',
    subjectLabel: 'DSA II',
    title: 'BFS Frontier Boss',
    shortTitle: 'BFS frontier',
    difficulty: 'Foundation',
    estimatedMinutes: 2,
    xpReward: 30,
    scenario:
      'Breadth-first search starts at A. Neighbors are visited left to right and marked when they enter the queue.',
    objective: 'Preserve FIFO order and avoid enqueueing an already visited node.',
    accent: 'violet',
    artifact: {
      title: 'Graph and frontier',
      caption: 'A has just been expanded. The leftmost queue item is the front.',
      code: 'A → B, C\nB → D, E\nC → E, F\nD → ·   E → ·   F → ·',
      columns: ['State', 'Contents'],
      rows: [
        ['Visited', 'A, B, C'],
        ['Queue (front → back)', 'B, C'],
        ['Traversal output', 'A']
      ],
      notes: ['mark on enqueue', 'FIFO frontier', 'left-to-right neighbors']
    },
    checkpoints: [
      {
        id: 'dequeue-next-node',
        prompt: 'Which node is removed from the queue next?',
        detail: 'The current queue is [B, C], with B at the front.',
        options: [
          { id: 'node-a', label: 'A' },
          { id: 'node-b', label: 'B' },
          { id: 'node-c', label: 'C' },
          { id: 'node-d', label: 'D' }
        ],
        correctOptionId: 'node-b',
        correctFeedback: 'Correct. BFS removes B, the oldest item in its FIFO queue.',
        incorrectFeedback:
          'BFS does not choose by depth label or newest insertion; it dequeues the front.',
        revealExplanation:
          'B entered the queue before C, so FIFO order makes B the next node expanded.',
        misconceptionTag: 'stack-vs-queue'
      },
      {
        id: 'enqueue-unvisited-neighbors',
        prompt: 'What is the queue immediately after B is expanded?',
        detail: 'B has neighbors D and E. Neither has been visited yet.',
        options: [
          { id: 'queue-d-e-c', label: '[D, E, C]' },
          { id: 'queue-c-d-e', label: '[C, D, E]' },
          { id: 'queue-c-e-d', label: '[C, E, D]' },
          { id: 'queue-b-c-d-e', label: '[B, C, D, E]' }
        ],
        correctOptionId: 'queue-c-d-e',
        correctFeedback: 'Correct. C keeps its place at the front; D and E join at the back.',
        incorrectFeedback:
          'Keep the existing frontier in place, then append newly discovered neighbors.',
        revealExplanation:
          'After B is dequeued, [C] remains. Visiting B discovers D then E, producing [C, D, E].',
        misconceptionTag: 'visited-marking-timing'
      }
    ],
    lessonHref: '/lesson/dsa-2/graph-explorer'
  },
  {
    id: 'sql-pipeline-boss',
    subjectId: 'dbms',
    subjectLabel: 'DBMS',
    title: 'SQL Pipeline Boss',
    shortTitle: 'SQL pipeline',
    difficulty: 'Intermediate',
    estimatedMinutes: 3,
    xpReward: 30,
    scenario:
      'Trace a grouped query over five orders. Logical SQL execution filters rows before grouping and applies HAVING after aggregation.',
    objective: 'Separate row filtering, group filtering, ordering, and limiting.',
    accent: 'amber',
    artifact: {
      title: 'orders table',
      caption: 'Evaluate the query using logical execution order, not written clause order.',
      code: "SELECT region, SUM(amount) AS total\nFROM orders\nWHERE status = 'paid'\nGROUP BY region\nHAVING SUM(amount) >= 180\nORDER BY total DESC\nLIMIT 1;",
      columns: ['id', 'region', 'amount', 'status'],
      rows: [
        ['1', 'North', '120', 'paid'],
        ['2', 'South', '90', 'paid'],
        ['3', 'North', '80', 'pending'],
        ['4', 'South', '140', 'paid'],
        ['5', 'North', '60', 'paid']
      ],
      notes: ['WHERE → GROUP BY', 'HAVING → SELECT', 'ORDER BY → LIMIT']
    },
    checkpoints: [
      {
        id: 'rows-after-where',
        prompt: 'Which order IDs survive the WHERE stage?',
        detail: "Keep only rows whose status is 'paid'.",
        options: [
          { id: 'ids-1-2-4-5', label: '1, 2, 4, 5' },
          { id: 'ids-1-2-3-4-5', label: '1, 2, 3, 4, 5' },
          { id: 'ids-1-4-5', label: '1, 4, 5' },
          { id: 'ids-2-4', label: '2, 4' }
        ],
        correctOptionId: 'ids-1-2-4-5',
        correctFeedback: 'Correct. Only pending order 3 is removed by WHERE.',
        incorrectFeedback: 'WHERE evaluates each source row; totals and HAVING do not exist yet.',
        revealExplanation: 'IDs 1, 2, 4, and 5 are paid. ID 3 is pending, so WHERE removes it.',
        misconceptionTag: 'grouping-before-filtering'
      },
      {
        id: 'final-limited-row',
        prompt: 'Which single row does the query return?',
        detail: 'North totals 180 and South totals 230 after filtering.',
        options: [
          { id: 'north-180', label: 'North | 180' },
          { id: 'south-230', label: 'South | 230' },
          { id: 'south-140', label: 'South | 140' },
          { id: 'no-rows', label: 'No rows' }
        ],
        correctOptionId: 'south-230',
        correctFeedback:
          'Correct. Both groups pass HAVING; descending order puts South first, then LIMIT keeps it.',
        incorrectFeedback:
          'Apply HAVING to group totals, sort the surviving groups, and only then apply LIMIT.',
        revealExplanation:
          'North = 180 and South = 230 both meet HAVING. ORDER BY total DESC puts South first; LIMIT 1 returns South | 230.',
        misconceptionTag: 'where-vs-having'
      }
    ],
    lessonHref: '/lesson/dbms/query-pipeline'
  },
  {
    id: 'round-robin-boss',
    subjectId: 'operating-systems',
    subjectLabel: 'Operating Systems',
    title: 'Round Robin Boss',
    shortTitle: 'Round Robin',
    difficulty: 'Intermediate',
    estimatedMinutes: 3,
    xpReward: 30,
    scenario:
      'P1, P2, and P3 all arrive at time 0 with CPU bursts 5, 3, and 1. Round Robin uses a quantum of 2.',
    objective:
      'Rotate unfinished processes through the ready queue and stop a slice when a process finishes.',
    accent: 'green',
    artifact: {
      title: 'Ready queue snapshot',
      caption: 'Two time slices have completed. Remaining burst is shown after each slice.',
      columns: ['Time', 'Running', 'Remaining after slice', 'Ready queue'],
      rows: [
        ['0–2', 'P1', 'P1 = 3', 'P2, P3, P1'],
        ['2–4', 'P2', 'P2 = 1', 'P3, P1, P2'],
        ['4–?', 'predict', '—', 'P3, P1, P2']
      ],
      notes: ['quantum = 2', 'all arrivals = 0', 'unfinished process returns to back']
    },
    checkpoints: [
      {
        id: 'dispatch-third-slice',
        prompt: 'Which process runs at time 4?',
        detail: 'The ready queue is [P3, P1, P2].',
        options: [
          { id: 'process-p1', label: 'P1' },
          { id: 'process-p2', label: 'P2' },
          { id: 'process-p3', label: 'P3' },
          { id: 'process-idle', label: 'CPU is idle' }
        ],
        correctOptionId: 'process-p3',
        correctFeedback: 'Correct. P3 is at the front and runs from time 4 to 5.',
        incorrectFeedback: 'Round Robin dispatches the process at the front of the ready queue.',
        revealExplanation:
          'P3 waited behind the first slices of P1 and P2. It now reaches the queue front and needs only one time unit.',
        misconceptionTag: 'waiting-vs-turnaround'
      },
      {
        id: 'complete-schedule-order',
        prompt: 'Which CPU sequence completes all three processes?',
        detail: 'A process that finishes early does not consume the rest of its quantum.',
        options: [
          { id: 'sequence-correct', label: 'P1 → P2 → P3 → P1 → P2 → P1' },
          { id: 'sequence-p1-first', label: 'P1 → P1 → P1 → P2 → P2 → P3' },
          { id: 'sequence-p3-late', label: 'P1 → P2 → P1 → P2 → P3 → P1' },
          { id: 'sequence-no-return', label: 'P1 → P2 → P3' }
        ],
        correctOptionId: 'sequence-correct',
        correctFeedback:
          'Correct. Unfinished P1 and P2 cycle back until their remaining bursts reach zero.',
        incorrectFeedback:
          'Follow the queue after every slice and requeue only processes that still need CPU time.',
        revealExplanation:
          'The slices are P1(2), P2(2), P3(1), P1(2), P2(1), P1(1), so the process order matches the first option.',
        misconceptionTag: 'waiting-vs-turnaround'
      }
    ],
    lessonHref: '/lesson/operating-systems/cpu-scheduling'
  },
  {
    id: 'packet-route-boss',
    subjectId: 'computer-networks',
    subjectLabel: 'Computer Networks',
    title: 'Packet Route Boss',
    shortTitle: 'Packet route',
    difficulty: 'Intermediate',
    estimatedMinutes: 3,
    xpReward: 30,
    scenario:
      'A laptop opens https://learn.example over an empty browser, DNS, and ARP cache. The server is outside the local subnet.',
    objective:
      'Distinguish end-to-end IP addressing from hop-local Ethernet delivery and protocol order.',
    accent: 'blue',
    artifact: {
      title: 'Cold-cache journey',
      caption: 'The server IP remains end to end; Ethernet addresses change at every routed hop.',
      columns: ['Known state', 'Value'],
      rows: [
        ['Client IP', '192.0.2.10'],
        ['Default gateway IP', '192.0.2.1'],
        ['Server IP after DNS', '203.0.113.80'],
        ['Server location', 'remote subnet'],
        ['ARP cache', 'empty']
      ],
      notes: [
        'DNS resolves a name',
        'ARP resolves a local next-hop MAC',
        'TCP before TLS before HTTP'
      ]
    },
    checkpoints: [
      {
        id: 'first-hop-destination-mac',
        prompt: 'Whose MAC address should the laptop put in the first-hop Ethernet frame?',
        detail: 'The destination server is not on the laptop’s local subnet.',
        options: [
          { id: 'mac-server', label: 'The remote server’s MAC' },
          { id: 'mac-gateway', label: 'The default gateway’s LAN MAC' },
          { id: 'mac-dns', label: 'The DNS resolver’s MAC' },
          { id: 'mac-client', label: 'The laptop’s own MAC' }
        ],
        correctOptionId: 'mac-gateway',
        correctFeedback:
          'Correct. The IP packet targets the server, but the local frame targets the next-hop router.',
        incorrectFeedback:
          'Ethernet delivers only across the local link; choose the device that can route off-subnet.',
        revealExplanation:
          'ARP discovers the default gateway’s LAN MAC. The server IP remains the packet destination while the frame goes to the router.',
        misconceptionTag: 'ip-vs-mac'
      },
      {
        id: 'secure-protocol-order',
        prompt: 'Which sequence occurs before the browser can send the HTTPS request?',
        detail: 'Assume DNS and ARP resolution are complete.',
        options: [
          { id: 'order-correct', label: 'TCP handshake → TLS handshake → HTTP request' },
          { id: 'order-http-first', label: 'HTTP request → TLS handshake → TCP handshake' },
          { id: 'order-tls-first', label: 'TLS handshake → TCP handshake → HTTP request' },
          { id: 'order-arp-http', label: 'ARP → HTTP request → TCP handshake' }
        ],
        correctOptionId: 'order-correct',
        correctFeedback:
          'Correct. TCP establishes transport, TLS secures it, then HTTP travels inside TLS.',
        incorrectFeedback:
          'Build the stack from transport connection to security session to application data.',
        revealExplanation:
          'HTTPS needs an established TCP connection first. TLS negotiates protection over TCP, then carries the HTTP request.',
        misconceptionTag: 'sequence-vs-acknowledgement'
      }
    ],
    lessonHref: '/lesson/computer-networks/packet-journey'
  }
] as const;

const challengeIndex = new Map<ChallengeId, ArenaChallenge>(
  arenaChallenges.map((challenge) => [challenge.id, challenge])
);

export function isChallengeId(value: string | null): value is ChallengeId {
  return value !== null && challengeIndex.has(value as ChallengeId);
}

export function getArenaChallenge(id: ChallengeId): ArenaChallenge {
  const challenge = challengeIndex.get(id);
  if (!challenge) throw new Error(`Unknown arena challenge: ${id}`);
  return challenge;
}

export function evaluateChallengeAnswer(
  challengeId: ChallengeId,
  checkpointId: string,
  answerId: string
): ChallengeEvaluation {
  const challenge = getArenaChallenge(challengeId);
  const checkpoint = challenge.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) {
    throw new Error(`Unknown checkpoint ${checkpointId} for challenge ${challengeId}`);
  }
  if (!checkpoint.options.some((option) => option.id === answerId)) {
    throw new Error(`Unknown answer ${answerId} for checkpoint ${checkpointId}`);
  }
  const correct = checkpoint.correctOptionId === answerId;
  return {
    challengeId,
    checkpointId,
    answerId,
    correct,
    feedback: correct ? checkpoint.correctFeedback : checkpoint.incorrectFeedback
  };
}
