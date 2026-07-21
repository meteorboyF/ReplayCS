import type { SubjectId } from '$lib/trace/types';

/**
 * A Scenario Gallery entry. Each card links directly to a visual trace preset.
 * There are no questions, no predictions, no XP, and no "correct answers" — a
 * scenario simply points the learner at an interesting execution to watch.
 */
export interface GalleryScenario {
  id: string;
  subjectId: SubjectId;
  subjectLabel: string;
  title: string;
  /** One sentence describing the scenario setup. */
  description: string;
  /** What the learner will actually watch happen in the trace. */
  observe: string;
  /** Direct link to the trace preset (deep-linked where the page reads URL params). */
  href: string;
  accent: 'cyan' | 'violet' | 'amber' | 'green' | 'blue';
}

export const galleryScenarios: readonly GalleryScenario[] = [
  {
    id: 'dynamic-array-resize',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Dynamic array resize',
    description: 'Append to a full dynamic array so it must grow its backing buffer.',
    observe:
      'A new buffer is allocated, every element is copied one at a time, then the value is appended — the O(n) cost hidden inside an amortized O(1) append.',
    href: '/lesson/dsa-1/arrays',
    accent: 'cyan'
  },
  {
    id: 'linked-list-tail-no-pointer',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Tail insertion without a tail pointer',
    description: 'Insert at the end of a singly linked list that only tracks its head.',
    observe:
      'The current pointer walks every node to reach the tail before linking the new node — a full O(n) traversal for one insertion.',
    href: '/lesson/dsa-1/linked-list',
    accent: 'violet'
  },
  {
    id: 'linked-list-tail-with-pointer',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Tail insertion with a tail pointer',
    description: 'Insert at the end of a list that keeps a tail pointer.',
    observe:
      'The new node links straight off the tail pointer with no traversal — the same operation collapses from O(n) to O(1).',
    href: '/lesson/dsa-1/linked-list',
    accent: 'green'
  },
  {
    id: 'hash-table-collision-chain',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Hash-table collision chain',
    description: 'Insert several keys that hash to the same bucket with separate chaining.',
    observe:
      'Keys pile into one bucket’s chain while others stay empty, so a lookup walks the chain and the load factor climbs toward a resize.',
    href: '/lesson/dsa-1/hash-table',
    accent: 'amber'
  },
  {
    id: 'binary-search-worst-case',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Binary search worst-case path',
    description: 'Search for the final element of a sorted array of eight values.',
    observe:
      'The window halves the maximum number of times before the target is found, showing why the bound is ⌊log₂ n⌋ + 1 comparisons.',
    href: '/lesson/dsa-1/binary-search?values=1%2C2%2C3%2C4%2C5%2C6%2C7%2C8&target=8',
    accent: 'blue'
  },
  {
    id: 'bubble-sort-reverse',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Bubble sort on reverse-sorted input',
    description: 'Run Bubble Sort on a fully reversed array.',
    observe:
      'Every pass performs the maximum swaps, driving comparisons and writes to the O(n²) worst case.',
    href: '/lesson/dsa-1/sorting-arena',
    accent: 'cyan'
  },
  {
    id: 'bst-balanced-vs-skewed',
    subjectId: 'dsa-1',
    subjectLabel: 'DSA I',
    title: 'Balanced versus skewed BST search',
    description: 'Search the same key in a balanced tree and in a skewed tree.',
    observe:
      'A balanced tree reaches the key in O(log n) hops; a skewed tree degrades to a linked list and takes O(n).',
    href: '/lesson/dsa-1/bst',
    accent: 'violet'
  },
  {
    id: 'bfs-disconnected-graph',
    subjectId: 'dsa-2',
    subjectLabel: 'DSA II',
    title: 'BFS on a disconnected graph',
    description: 'Run breadth-first search across a graph with more than one component.',
    observe:
      'The queue drains the first component, then traversal restarts from an unvisited node to cover the rest — every vertex and edge visited once.',
    href: '/lesson/dsa-2/graph-explorer',
    accent: 'green'
  },
  {
    id: 'round-robin-scheduling',
    subjectId: 'operating-systems',
    subjectLabel: 'Operating Systems',
    title: 'Round Robin scheduling',
    description: 'Schedule three processes under Round Robin with a fixed time quantum.',
    observe:
      'Unfinished processes rotate to the back of the ready queue each slice, and the Gantt chart fills tick by tick with the resulting waiting and turnaround times.',
    href: '/lesson/operating-systems/cpu-scheduling',
    accent: 'amber'
  },
  {
    id: 'sql-left-join-unmatched',
    subjectId: 'dbms',
    subjectLabel: 'DBMS',
    title: 'SQL LEFT JOIN with unmatched rows',
    description: 'Trace a LEFT JOIN where some left-side rows have no match.',
    observe:
      'Unmatched departments survive the join padded with NULLs, and you can watch the row set change at every logical stage through to the final relation.',
    href: '/lesson/dbms/query-pipeline?scenario=dhaka-department-capacity',
    accent: 'blue'
  },
  {
    id: 'cold-cache-packet-journey',
    subjectId: 'computer-networks',
    subjectLabel: 'Computer Networks',
    title: 'Cold-cache packet journey',
    description: 'Open a page with empty browser, DNS, and ARP caches.',
    observe:
      'Every layer runs from scratch — DNS, ARP, the TCP handshake, TLS, then HTTP — while the server IP stays fixed and the hop-local MAC changes at the router.',
    href: '/lesson/computer-networks/packet-journey',
    accent: 'cyan'
  }
] as const;
