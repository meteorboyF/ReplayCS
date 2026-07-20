export const subjects = {
  'dsa-1': {
    title: 'Data Structures & Algorithms I',
    description:
      'Trace binary search and compare Bubble, Selection, and Insertion Sort operation by operation.',
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
        title: 'Linked-list insertion',
        slug: 'linked-list-insertion',
        status: 'planned',
        detail: 'Follow pointer rewiring without losing the list.'
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
