import type { SubjectId } from '$lib/trace/types';

/**
 * Deterministic revision metadata for the Study Recap generator.
 *
 * These facts are curated from the same live lessons the arena traces. The
 * recap builder assembles them into a structured revision sheet with no model
 * call; the optional GPT-5.6 pass only rewrites this deterministic material
 * into more polished prose (see `/api/study-recap`). Nothing here reads or
 * writes lesson state, progress, or canonical trace answers.
 */
export interface RecapTopic {
  id: string;
  subjectId: SubjectId;
  subjectLabel: string;
  title: string;
  href: string;
  order: number;
  summary: string;
  complexity: string[];
  comparison: string;
  pitfall: string;
}

export type RecapLanguage = 'en' | 'bn';
export type RecapDepth = 'concise' | 'exam';

export const RECAP_TOPICS: readonly RecapTopic[] = [
  {
    id: 'arrays',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Arrays & Dynamic Arrays',
    href: '/lesson/dsa-1/arrays',
    order: 1,
    summary:
      'Contiguous storage with O(1) indexing; a dynamic array grows by copying into a bigger buffer.',
    complexity: [
      'Access/update: O(1)',
      'Insert/delete middle: O(n)',
      'Amortized append: O(1)',
      'Resizing append: O(n)'
    ],
    comparison:
      'Amortized O(1) append vs the O(n) cost of the individual resize that copies every element.',
    pitfall:
      'Treating a single resizing append as O(1) — the copy is O(n); only the average over many appends is O(1).'
  },
  {
    id: 'linked-list',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Linked Lists',
    href: '/lesson/dsa-1/linked-list',
    order: 2,
    summary:
      'Nodes linked by pointers; no random access, but O(1) splicing once you hold the node.',
    complexity: [
      'Access by index: O(n)',
      'Insert/delete at known node: O(1)',
      'Tail insert without tail pointer: O(n)',
      'Tail insert with tail pointer: O(1)'
    ],
    comparison:
      'Tail insertion is O(n) without a tail pointer but O(1) with one — the same operation, different bookkeeping.',
    pitfall: 'Losing the successor pointer before relinking, which drops the rest of the list.'
  },
  {
    id: 'stack',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Stack',
    href: '/lesson/dsa-1/stack',
    order: 3,
    summary: 'LIFO structure; push/pop/peek at one end over an array or linked backing.',
    complexity: [
      'Push/pop/peek: O(1)',
      'Search: O(n)',
      'Dynamic-array push (resize): amortized O(1)'
    ],
    comparison:
      'Fixed-array stack (overflow on full) vs dynamic-array stack (resizes) vs linked stack (no capacity limit).',
    pitfall: 'Popping or peeking an empty stack (underflow) instead of checking size first.'
  },
  {
    id: 'queue',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Queue & Deque',
    href: '/lesson/dsa-1/queue',
    order: 4,
    summary:
      'FIFO structure; a circular buffer reuses freed slots by wrapping indices with modulo.',
    complexity: [
      'Enqueue/dequeue: O(1)',
      'Naive array dequeue (shift): O(n)',
      'Circular enqueue/dequeue: O(1)'
    ],
    comparison:
      'Naive array queue shifts every element on dequeue (O(n)) while a circular queue wraps indices (O(1)).',
    pitfall:
      'Confusing empty and full in a circular buffer when front == rear — track size or leave one slot open.'
  },
  {
    id: 'hash-table',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Hash Tables',
    href: '/lesson/dsa-1/hash-table',
    order: 5,
    summary:
      'Keys map to buckets via a hash; collisions resolve by chaining or probing, and a high load factor triggers a rehash.',
    complexity: [
      'Average insert/search/delete: O(1)',
      'Worst case (all collide): O(n)',
      'Rehash: O(n)'
    ],
    comparison:
      'Separate chaining (linked lists per bucket) vs open addressing (linear probing with tombstones).',
    pitfall:
      'Ignoring the load factor — performance degrades toward O(n) before a resize, and deletes need tombstones under probing.'
  },
  {
    id: 'binary-search',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Binary Search',
    href: '/lesson/dsa-1/binary-search',
    order: 6,
    summary: 'Repeatedly halve a sorted range, comparing the midpoint value to the target.',
    complexity: [
      'Best: O(1) (midpoint hit)',
      'Worst: O(log n) (⌊log₂ n⌋ + 1 comparisons)',
      'Space: O(1) iterative'
    ],
    comparison:
      'Linear search O(n) on unsorted data vs binary search O(log n) — but binary search needs sorted input first.',
    pitfall:
      'Comparing the index with the target instead of the value, or off-by-one bounds when moving low/high.'
  },
  {
    id: 'sorting-arena',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Sorting',
    href: '/lesson/dsa-1/sorting-arena',
    order: 7,
    summary:
      'Comparison sorts (bubble/selection/insertion/merge/quick/heap) and non-comparison sorts (counting/radix).',
    complexity: [
      'Bubble/selection/insertion: O(n²) (insertion ~O(n) nearly sorted)',
      'Merge/heap: O(n log n)',
      'Quick: O(n log n) avg, O(n²) worst',
      'Counting: O(n + k)',
      'Radix: O(d(n + k))'
    ],
    comparison:
      'Merge sort is stable and O(n) space; heap sort is in-place but unstable; quicksort is fast on average but O(n²) with poor pivots.',
    pitfall:
      'Assuming quicksort is always O(n log n) — adversarial or already-sorted input with a bad pivot is O(n²).'
  },
  {
    id: 'bst',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Binary Search Trees',
    href: '/lesson/dsa-1/bst',
    order: 8,
    summary: 'Ordered tree: left < node < right, enabling O(h) search where h is the height.',
    complexity: [
      'Balanced search/insert/delete: O(log n)',
      'Skewed (worst): O(n)',
      'Traversals: O(n)'
    ],
    comparison:
      'A balanced BST gives O(log n) operations; inserting sorted keys skews it into a linked list at O(n).',
    pitfall:
      'Forgetting that a plain BST is not self-balancing — insertion order decides whether you get log n or n.'
  },
  {
    id: 'graph-explorer',
    subjectId: 'dsa-2',
    subjectLabel: 'DSA II',
    title: 'Graph Traversal (BFS/DFS)',
    href: '/lesson/dsa-2/graph-explorer',
    order: 9,
    summary: 'BFS explores by layers with a queue; DFS goes deep with a stack or the call stack.',
    complexity: ['BFS/DFS: O(V + E) on an adjacency list', 'Adjacency matrix: O(V²)'],
    comparison:
      'BFS (FIFO queue) finds shortest unweighted paths; DFS (LIFO stack / recursion) explores one branch fully first.',
    pitfall:
      'Marking nodes visited at dequeue rather than enqueue, which lets a node enter the frontier twice.'
  },
  {
    id: 'query-pipeline',
    subjectId: 'dbms',
    subjectLabel: 'DBMS',
    title: 'SQL Logical Execution',
    href: '/lesson/dbms/query-pipeline',
    order: 10,
    summary:
      'A query runs in logical order FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT, not written order.',
    complexity: [
      'Logical stages transform relations step by step',
      'WHERE filters rows; HAVING filters groups'
    ],
    comparison:
      'WHERE filters individual rows before grouping; HAVING filters aggregated groups after GROUP BY.',
    pitfall:
      'Putting an aggregate condition in WHERE — aggregates only exist after grouping, so they belong in HAVING.'
  },
  {
    id: 'cpu-scheduling',
    subjectId: 'operating-systems',
    subjectLabel: 'Operating Systems',
    title: 'CPU Scheduling',
    href: '/lesson/operating-systems/cpu-scheduling',
    order: 11,
    summary:
      'Policies decide which ready process runs next, producing waiting, turnaround, and response times.',
    complexity: [
      'Turnaround = completion − arrival',
      'Waiting = turnaround − burst',
      'Response = first run − arrival'
    ],
    comparison:
      'FCFS is simple but suffers convoy effect; SJF/SRTF minimize average waiting; Round Robin bounds response time via a quantum.',
    pitfall:
      'Counting a context switch when the CPU was idle, or forgetting a finished process leaves its quantum early.'
  },
  {
    id: 'packet-journey',
    subjectId: 'computer-networks',
    subjectLabel: 'Computer Networks',
    title: 'Packet Journey',
    href: '/lesson/computer-networks/packet-journey',
    order: 12,
    summary:
      'A request runs the stack: cache → DNS → ARP → TCP → TLS → HTTP, with headers added and removed per layer.',
    complexity: [
      'End-to-end IP stays fixed; hop-local MAC changes each routed hop',
      'TCP before TLS before HTTP'
    ],
    comparison:
      'IP addressing is end-to-end (server IP); Ethernet/MAC addressing is hop-local (next-hop router).',
    pitfall:
      'Putting the server’s MAC in the first frame — off-subnet delivery targets the gateway’s MAC, not the server’s.'
  }
];

const topicIndex = new Map(RECAP_TOPICS.map((topic) => [topic.id, topic]));

export interface RecapRequest {
  topicIds: string[];
  language: RecapLanguage;
  depth: RecapDepth;
}

export interface RecapSheet {
  source: 'deterministic' | 'gpt';
  language: RecapLanguage;
  depth: RecapDepth;
  heading: string;
  intro: string;
  topics: {
    title: string;
    subjectLabel: string;
    href: string;
    summary: string;
    complexity: string[];
    comparison: string;
    pitfall: string;
  }[];
  comparisons: string[];
  bigO: string[];
  pitfalls: string[];
  studySequence: string[];
}

const COPY: Record<RecapLanguage, { heading: string; introConcise: string; introExam: string }> = {
  en: {
    heading: 'Revision sheet',
    introConcise: 'A quick refresher across your selected topics.',
    introExam: 'An exam-ready review: comparisons, Big-O cases, and common traps for each topic.'
  },
  bn: {
    heading: 'রিভিশন শিট',
    introConcise: 'আপনার বেছে নেওয়া টপিকগুলোর দ্রুত ঝালাই।',
    introExam: 'পরীক্ষার জন্য প্রস্তুতি: প্রতিটি টপিকের তুলনা, Big-O কেস এবং সাধারণ ভুল।'
  }
};

/** Resolve requested ids to known topics, preserving curated study order. */
export function selectRecapTopics(ids: string[]): RecapTopic[] {
  const unique = [...new Set(ids)];
  return unique
    .map((id) => topicIndex.get(id))
    .filter((topic): topic is RecapTopic => Boolean(topic))
    .sort((a, b) => a.order - b.order);
}

/**
 * Build the deterministic revision sheet. This is the canonical content and the
 * guaranteed fallback when no GPT key is configured.
 */
export function buildDeterministicRecap(request: RecapRequest): RecapSheet {
  const topics = selectRecapTopics(request.topicIds);
  const copy = COPY[request.language];
  const exam = request.depth === 'exam';

  return {
    source: 'deterministic',
    language: request.language,
    depth: request.depth,
    heading: copy.heading,
    intro: exam ? copy.introExam : copy.introConcise,
    topics: topics.map((topic) => ({
      title: topic.title,
      subjectLabel: topic.subjectLabel,
      href: topic.href,
      summary: topic.summary,
      complexity: exam ? topic.complexity : topic.complexity.slice(0, 2),
      comparison: topic.comparison,
      pitfall: topic.pitfall
    })),
    comparisons: topics.map((topic) => `${topic.title}: ${topic.comparison}`),
    bigO: topics.map((topic) => `${topic.title} — ${topic.complexity.join('; ')}`),
    pitfalls: topics.map((topic) => `${topic.title}: ${topic.pitfall}`),
    studySequence: topics.map((topic, index) => `${index + 1}. ${topic.title}`)
  };
}
