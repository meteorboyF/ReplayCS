export const subjects = {
  'dsa-1': {
    title: 'Data Structures & Algorithms I',
    description:
      'Trace searches, sorting, arrays, linked lists, stacks, queues, and deques operation by operation.',
    lessons: [
      {
        title: 'Binary Search',
        slug: 'binary-search',
        status: 'live',
        detail: 'Shrink a sorted search range and predict every midpoint.'
      },
      {
        title: 'Sorting Arena',
        slug: 'sorting-arena',
        status: 'live',
        detail: 'Compare Bubble, Selection, and Insertion Sort operation by operation.'
      },
      {
        title: 'Linked List Lab',
        slug: 'linked-list',
        status: 'live',
        detail:
          'Trace access, insertion, deletion, reversal, and cycle detection pointer by pointer.'
      },
      {
        title: 'Array & Dynamic Array Lab',
        slug: 'arrays',
        status: 'live',
        detail: 'Trace index arithmetic, shifting, resizing, and amortized growth slot by slot.'
      },
      {
        title: 'Stack Lab',
        slug: 'stack',
        status: 'live',
        detail:
          'Push, pop, peek, and search across fixed-array, dynamic-array, and linked backings.'
      },
      {
        title: 'Queue Lab',
        slug: 'queue',
        status: 'live',
        detail: 'Compare naive-array shifting, circular wrap-around, and linked front/rear updates.'
      },
      {
        title: 'Deque Lab',
        slug: 'deque',
        status: 'live',
        detail: 'Push, pop, and peek at both ends of a circular buffer or doubly linked list.'
      },
      {
        title: 'Hash Table Lab',
        slug: 'hash-table',
        status: 'live',
        detail:
          'Hash keys into buckets, chase collisions through chains and probes, and rehash on resize.'
      },
      {
        title: 'Search Lab',
        slug: 'search-lab',
        status: 'live',
        detail: 'Race linear, binary (loop and recursion), BST, and hash search on the same data.'
      },
      {
        title: 'BST Lab',
        slug: 'bst',
        status: 'live',
        detail: 'Search, insert, delete, traverse, and measure a binary search tree node by node.'
      },
      {
        title: 'Strings Lab',
        slug: 'strings',
        status: 'live',
        detail:
          'Trace character reads, copies, allocations, immutable growth, and builder capacity.'
      },
      {
        title: 'Recursion Lab',
        slug: 'recursion',
        status: 'live',
        detail: 'Trace call frames, base cases, unwinding, recurrence levels, and stack depth.'
      }
    ]
  },
  'dsa-2': {
    title: 'Data Structures & Algorithms II',
    description:
      'Trace BFS, iterative DFS, and recursive DFS across connected and disconnected graphs.',
    lessons: [
      {
        title: 'Graph Explorer',
        slug: 'graph-explorer',
        status: 'live',
        detail: 'Compare BFS and DFS through queues, stacks, call frames and traversal trees.'
      },
      {
        title: 'Tree traversal',
        slug: 'tree-traversal',
        status: 'planned',
        detail: 'Reveal recursive frames and return paths.'
      },
      {
        title: 'Dynamic programming',
        slug: 'dynamic-programming',
        status: 'planned',
        detail: 'Build a recurrence table one dependency at a time.'
      }
    ]
  },
  dbms: {
    title: 'Database Management Systems',
    description: 'See the logical stages between a SQL query and its result.',
    lessons: [
      {
        title: 'SQL Execution Lab',
        slug: 'query-pipeline',
        status: 'live',
        detail: 'Predict JOIN, filter, grouping, aggregate, sort, and limit transitions.'
      },
      {
        title: 'Normalization',
        slug: 'normalization',
        status: 'planned',
        detail: 'Split dependencies and prevent update anomalies.'
      },
      {
        title: 'Transactions',
        slug: 'transactions',
        status: 'planned',
        detail: 'Trace locks, anomalies, commit and rollback.'
      }
    ]
  },
  'operating-systems': {
    title: 'Operating Systems',
    description:
      'Predict CPU scheduling decisions and make process metrics visible clock by clock.',
    lessons: [
      {
        title: 'CPU Scheduling Arena',
        slug: 'cpu-scheduling',
        status: 'live',
        detail: 'Compare FCFS, SJF, SRTF, Priority, and Round Robin on one workload.'
      },
      {
        title: 'Page Replacement',
        slug: 'page-replacement',
        status: 'planned',
        detail: 'Trace page hits, faults, frames, and eviction decisions.'
      }
    ]
  },
  'computer-networks': {
    title: 'Computer Networks',
    description: 'Trace packets, protocols, layers, and hop-by-hop addressing from URL to render.',
    lessons: [
      {
        title: 'Packet Journey',
        slug: 'packet-journey',
        status: 'live',
        detail: 'Follow cache, DNS, ARP, TCP, TLS, HTTP, and response decapsulation.'
      },
      {
        title: 'TCP Reliability',
        slug: 'tcp-reliability',
        status: 'planned',
        detail: 'Predict acknowledgements, loss, timeout, and retransmission.'
      }
    ]
  }
} as const;
