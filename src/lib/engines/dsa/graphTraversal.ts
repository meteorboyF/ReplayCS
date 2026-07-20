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

export const MAX_GRAPH_NODES = 12;
export const MAX_GRAPH_EDGES = 24;

export type TraversalAlgorithm = 'bfs' | 'dfs-iterative' | 'dfs-recursive';

export interface GraphEdge {
  from: string;
  to: string;
}

export interface GraphDefinition {
  nodes: string[];
  edges: GraphEdge[];
  directed: boolean;
}

export interface GraphPreset {
  name: string;
  description: string;
  defaultStart: string;
  graph: GraphDefinition;
}

export type GraphPresetId = 'learning-tree' | 'disconnected';

export interface GraphTraversalOptions {
  algorithm?: TraversalAlgorithm;
  graph?: GraphDefinition;
  startNode?: string;
  traverseDisconnected?: boolean;
}

export interface GraphTraversalState {
  algorithm: TraversalAlgorithm;
  currentNode: string | null;
  visited: string[];
  discovered: string[];
  frontier: string[];
  queue: string[];
  stack: string[];
  callStack: string[];
  traversalOrder: string[];
  inspectingNeighbor: string | null;
  neighborStatus: 'unseen' | 'frontier' | 'visited' | null;
  component: number;
  componentByNode: Record<string, number>;
  traversalTree: string[];
  inspectionCount: number;
}

type MutableTraversalState = Omit<GraphTraversalState, 'frontier'>;
type SourceTemplateLine = readonly [semantic: string, text: string];

const nodePattern = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;
const algorithms: TraversalAlgorithm[] = ['bfs', 'dfs-iterative', 'dfs-recursive'];

export class GraphInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphInputError';
  }
}

export const GRAPH_PRESETS: Record<GraphPresetId, GraphPreset> = {
  'learning-tree': {
    name: 'Learning tree',
    description: 'A connected graph with branches deep enough to distinguish BFS from DFS.',
    defaultStart: 'A',
    graph: {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'B', to: 'E' },
        { from: 'C', to: 'F' },
        { from: 'F', to: 'G' }
      ],
      directed: false
    }
  },
  disconnected: {
    name: 'Disconnected islands',
    description: 'Three components demonstrate how a full traversal forest restarts.',
    defaultStart: 'A',
    graph: {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'D', to: 'E' },
        { from: 'F', to: 'G' }
      ],
      directed: false
    }
  }
};

const sourceTemplates: Record<
  TraversalAlgorithm,
  Record<SupportedLanguage, SourceTemplateLine[]>
> = {
  bfs: {
    c: [
      ['initialize-frontier', 'enqueue(queue, start); seen[start] = true;'],
      ['select-node', 'int node = dequeue(queue);'],
      ['visit-node', 'order[order_size++] = node;'],
      ['inspect-neighbor', 'for each neighbor in sorted_neighbors(node) {'],
      [
        'add-neighbor',
        '  if (!seen[neighbor]) { seen[neighbor] = true; enqueue(queue, neighbor); }'
      ],
      ['finish-node', '}'],
      ['complete', 'return order;']
    ],
    cpp: [
      ['initialize-frontier', 'queue.push(start); seen.insert(start);'],
      ['select-node', 'auto node = queue.front(); queue.pop();'],
      ['visit-node', 'order.push_back(node);'],
      ['inspect-neighbor', 'for (auto neighbor : sorted(graph[node])) {'],
      ['add-neighbor', '  if (seen.insert(neighbor).second) queue.push(neighbor);'],
      ['finish-node', '}'],
      ['complete', 'return order;']
    ],
    java: [
      ['initialize-frontier', 'queue.add(start); seen.add(start);'],
      ['select-node', 'String node = queue.remove();'],
      ['visit-node', 'order.add(node);'],
      ['inspect-neighbor', 'for (String neighbor : sorted(graph.get(node))) {'],
      ['add-neighbor', '  if (seen.add(neighbor)) queue.add(neighbor);'],
      ['finish-node', '}'],
      ['complete', 'return order;']
    ],
    python: [
      ['initialize-frontier', 'queue = deque([start]); seen = {start}'],
      ['select-node', 'node = queue.popleft()'],
      ['visit-node', 'order.append(node)'],
      ['inspect-neighbor', 'for neighbor in sorted(graph[node]):'],
      ['add-neighbor', '    if neighbor not in seen: seen.add(neighbor); queue.append(neighbor)'],
      ['finish-node', '# repeat until this component is exhausted'],
      ['complete', 'return order']
    ]
  },
  'dfs-iterative': {
    c: [
      ['initialize-frontier', 'push(stack, start); discovered[start] = true;'],
      ['select-node', 'int node = pop(stack);'],
      ['visit-node', 'visited[node] = true; order[order_size++] = node;'],
      ['inspect-neighbor', 'for each neighbor in reverse_sorted_neighbors(node) {'],
      [
        'add-neighbor',
        '  if (!discovered[neighbor]) { discovered[neighbor] = true; push(stack, neighbor); }'
      ],
      ['finish-node', '}'],
      ['complete', 'return order;']
    ],
    cpp: [
      ['initialize-frontier', 'stack.push(start); discovered.insert(start);'],
      ['select-node', 'auto node = stack.top(); stack.pop();'],
      ['visit-node', 'visited.insert(node); order.push_back(node);'],
      ['inspect-neighbor', 'for (auto neighbor : reverse_sorted(graph[node])) {'],
      ['add-neighbor', '  if (discovered.insert(neighbor).second) stack.push(neighbor);'],
      ['finish-node', '}'],
      ['complete', 'return order;']
    ],
    java: [
      ['initialize-frontier', 'stack.push(start); discovered.add(start);'],
      ['select-node', 'String node = stack.pop();'],
      ['visit-node', 'visited.add(node); order.add(node);'],
      ['inspect-neighbor', 'for (String neighbor : reverseSorted(graph.get(node))) {'],
      ['add-neighbor', '  if (discovered.add(neighbor)) stack.push(neighbor);'],
      ['finish-node', '}'],
      ['complete', 'return order;']
    ],
    python: [
      ['initialize-frontier', 'stack = [start]; discovered = {start}'],
      ['select-node', 'node = stack.pop()'],
      ['visit-node', 'visited.add(node); order.append(node)'],
      ['inspect-neighbor', 'for neighbor in sorted(graph[node], reverse=True):'],
      [
        'add-neighbor',
        '    if neighbor not in discovered: discovered.add(neighbor); stack.append(neighbor)'
      ],
      ['finish-node', '# the smallest neighbor is now on top'],
      ['complete', 'return order']
    ]
  },
  'dfs-recursive': {
    c: [
      ['initialize-frontier', 'dfs(start);'],
      ['visit-node', 'visited[node] = true; order[order_size++] = node;'],
      ['inspect-neighbor', 'for each neighbor in sorted_neighbors(node) {'],
      ['add-neighbor', '  if (!visited[neighbor]) dfs(neighbor);'],
      ['return-node', '} // return to the caller'],
      ['finish-node', '// start another unvisited component when needed'],
      ['complete', 'return order;']
    ],
    cpp: [
      ['initialize-frontier', 'dfs(start);'],
      ['visit-node', 'visited.insert(node); order.push_back(node);'],
      ['inspect-neighbor', 'for (auto neighbor : sorted(graph[node])) {'],
      ['add-neighbor', '  if (!visited.contains(neighbor)) dfs(neighbor);'],
      ['return-node', '} // pop this call frame'],
      ['finish-node', '// start another unvisited component when needed'],
      ['complete', 'return order;']
    ],
    java: [
      ['initialize-frontier', 'dfs(start);'],
      ['visit-node', 'visited.add(node); order.add(node);'],
      ['inspect-neighbor', 'for (String neighbor : sorted(graph.get(node))) {'],
      ['add-neighbor', '  if (!visited.contains(neighbor)) dfs(neighbor);'],
      ['return-node', '} // return to the caller'],
      ['finish-node', '// start another unvisited component when needed'],
      ['complete', 'return order;']
    ],
    python: [
      ['initialize-frontier', 'dfs(start)'],
      ['visit-node', 'visited.add(node); order.append(node)'],
      ['inspect-neighbor', 'for neighbor in sorted(graph[node]):'],
      ['add-neighbor', '    if neighbor not in visited: dfs(neighbor)'],
      ['return-node', '# return to the previous call frame'],
      ['finish-node', '# start another unvisited component when needed'],
      ['complete', 'return order']
    ]
  }
};

function compareNode(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneGraph(graph: GraphDefinition): GraphDefinition {
  return {
    nodes: [...graph.nodes],
    edges: graph.edges.map((edge) => ({ ...edge })),
    directed: graph.directed
  };
}

export function getGraphPreset(id: GraphPresetId): GraphPreset {
  const preset = GRAPH_PRESETS[id];
  return { ...preset, graph: cloneGraph(preset.graph) };
}

function duplicateKey(edge: GraphEdge, directed: boolean): string {
  if (directed || compareNode(edge.from, edge.to) <= 0) return `${edge.from}\u0000${edge.to}`;
  return `${edge.to}\u0000${edge.from}`;
}

export function validateGraphDefinition(graph: GraphDefinition): GraphDefinition {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new GraphInputError('A graph needs node and edge lists.');
  }
  if (graph.nodes.length === 0) throw new GraphInputError('Add at least one node.');
  if (graph.nodes.length > MAX_GRAPH_NODES) {
    throw new GraphInputError(`Use at most ${MAX_GRAPH_NODES} nodes so the trace stays readable.`);
  }
  if (graph.edges.length > MAX_GRAPH_EDGES) {
    throw new GraphInputError(`Use at most ${MAX_GRAPH_EDGES} edges so the trace stays readable.`);
  }

  const nodes = new Set<string>();
  for (const node of graph.nodes) {
    if (!nodePattern.test(node)) {
      throw new GraphInputError(
        `“${node}” is not a valid node label. Start with a letter and use up to 12 letters, numbers, or underscores.`
      );
    }
    if (nodes.has(node)) throw new GraphInputError(`Node “${node}” appears more than once.`);
    nodes.add(node);
  }

  const edgeKeys = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
      throw new GraphInputError(
        `Edge ${edge.from}-${edge.to} refers to a node outside the node list.`
      );
    }
    if (edge.from === edge.to) {
      throw new GraphInputError(
        `Self-loop ${edge.from}-${edge.to} is not supported in this lesson.`
      );
    }
    const key = duplicateKey(edge, graph.directed);
    if (edgeKeys.has(key)) {
      throw new GraphInputError(`Edge ${edge.from}-${edge.to} appears more than once.`);
    }
    edgeKeys.add(key);
  }

  return {
    nodes: [...nodes].sort(compareNode),
    edges: graph.edges
      .map((edge) => ({ ...edge }))
      .sort((left, right) => compareNode(left.from, right.from) || compareNode(left.to, right.to)),
    directed: Boolean(graph.directed)
  };
}

function parseEdge(segment: string): GraphEdge | null {
  const symbolic = segment.match(
    /^([A-Za-z][A-Za-z0-9_]{0,11})\s*(?:->|--|-)\s*([A-Za-z][A-Za-z0-9_]{0,11})$/
  );
  if (symbolic) return { from: symbolic[1], to: symbolic[2] };
  const spaced = segment.match(/^([A-Za-z][A-Za-z0-9_]{0,11})\s+([A-Za-z][A-Za-z0-9_]{0,11})$/);
  return spaced ? { from: spaced[1], to: spaced[2] } : null;
}

export function parseEdgeInput(input: string, directed = false): GraphDefinition {
  if (input.length > 1_000) throw new GraphInputError('The edge input is too long.');
  const segments = input
    .split(/[\n,;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    throw new GraphInputError('Enter at least one edge, for example A-B, A-C.');
  }
  if (segments.length > MAX_GRAPH_EDGES) {
    throw new GraphInputError(`Use at most ${MAX_GRAPH_EDGES} edges so the trace stays readable.`);
  }

  const edges = segments.map((segment) => {
    const edge = parseEdge(segment);
    if (!edge) {
      throw new GraphInputError(`Could not read “${segment}”. Use pairs such as A-B or A B.`);
    }
    return edge;
  });
  const nodes = [...new Set(edges.flatMap((edge) => [edge.from, edge.to]))];
  return validateGraphDefinition({ nodes, edges, directed });
}

export function tryParseEdgeInput(
  input: string,
  directed = false
): { success: true; graph: GraphDefinition } | { success: false; error: string } {
  try {
    return { success: true, graph: parseEdgeInput(input, directed) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'The graph input is invalid.'
    };
  }
}

function sourceLines(algorithm: TraversalAlgorithm, language: SupportedLanguage): SourceLine[] {
  return sourceTemplates[algorithm][language].map(([semantic, text], index) => ({
    id: `${algorithm}-${language}-${semantic}-${index}`,
    number: index + 1,
    text,
    semanticOperationId: semantic
  }));
}

function adjacencyList(graph: GraphDefinition): Map<string, string[]> {
  const adjacency = new Map(graph.nodes.map((node) => [node, [] as string[]]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    if (!graph.directed) adjacency.get(edge.to)?.push(edge.from);
  }
  for (const neighbors of adjacency.values()) neighbors.sort(compareNode);
  return adjacency;
}

function activeFrontier(state: MutableTraversalState): string[] {
  if (state.algorithm === 'bfs') return state.queue;
  if (state.algorithm === 'dfs-iterative') return state.stack;
  return state.callStack;
}

function snapshot(state: MutableTraversalState): GraphTraversalState {
  return {
    ...state,
    visited: [...state.visited],
    discovered: [...state.discovered],
    frontier: [...activeFrontier(state)],
    queue: [...state.queue],
    stack: [...state.stack],
    callStack: [...state.callStack],
    traversalOrder: [...state.traversalOrder],
    componentByNode: { ...state.componentByNode },
    traversalTree: [...state.traversalTree]
  };
}

function traceState(state: GraphTraversalState): Record<string, TraceValue> {
  return {
    algorithm: state.algorithm,
    currentNode: state.currentNode,
    visited: state.visited,
    discovered: state.discovered,
    frontier: state.frontier,
    queue: state.queue,
    stack: state.stack,
    callStack: state.callStack,
    traversalOrder: state.traversalOrder,
    inspectingNeighbor: state.inspectingNeighbor,
    neighborStatus: state.neighborStatus,
    component: state.component,
    componentByNode: state.componentByNode,
    traversalTree: state.traversalTree,
    inspectionCount: state.inspectionCount
  };
}

function treeEdgeKey(from: string, to: string): string {
  return `${from}→${to}`;
}

function isTreeEdge(edge: GraphEdge, graph: GraphDefinition, tree: string[]): boolean {
  if (tree.includes(treeEdgeKey(edge.from, edge.to))) return true;
  return !graph.directed && tree.includes(treeEdgeKey(edge.to, edge.from));
}

function entitiesFor(graph: GraphDefinition, state: GraphTraversalState): TraceEntity[] {
  const nodeEntities: TraceEntity[] = graph.nodes.map((node) => ({
    id: `node-${node}`,
    type: 'node',
    label: node,
    value: node,
    metadata: {
      current: state.currentNode === node,
      visited: state.visited.includes(node),
      discovered: state.discovered.includes(node),
      frontier: state.frontier.includes(node),
      inspecting: state.inspectingNeighbor === node,
      component: state.componentByNode[node] ?? 0
    }
  }));
  const edgeEntities: TraceEntity[] = graph.edges.map((edge, index) => ({
    id: `edge-${index}`,
    type: 'edge',
    label: `${edge.from}${graph.directed ? ' → ' : ' — '}${edge.to}`,
    metadata: {
      from: edge.from,
      to: edge.to,
      treeEdge: isTreeEdge(edge, graph, state.traversalTree),
      inspecting:
        state.currentNode === edge.from && state.inspectingNeighbor === edge.to
          ? true
          : !graph.directed &&
            state.currentNode === edge.to &&
            state.inspectingNeighbor === edge.from
    }
  }));
  const frontierType = state.algorithm === 'dfs-recursive' ? 'stack-frame' : 'queue-item';
  const frontierEntities: TraceEntity[] = state.frontier.map((node, index) => ({
    id: `frontier-${index}-${node}`,
    type: frontierType,
    label: node,
    value: node,
    metadata: { position: index }
  }));
  return [...nodeEntities, ...edgeEntities, ...frontierEntities];
}

const mutationKeys: (keyof GraphTraversalState)[] = [
  'currentNode',
  'visited',
  'discovered',
  'frontier',
  'queue',
  'stack',
  'callStack',
  'traversalOrder',
  'inspectingNeighbor',
  'neighborStatus',
  'component',
  'componentByNode',
  'traversalTree',
  'inspectionCount'
];

function mutationsBetween(
  before: Record<string, TraceValue>,
  after: Record<string, TraceValue>
): TraceMutation[] {
  return mutationKeys
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => ({
      entityId: `graph-${key}`,
      property: String(key),
      previousValue: before[key],
      nextValue: after[key],
      animation: key === 'frontier' ? 'move' : 'highlight'
    }));
}

function algorithmName(algorithm: TraversalAlgorithm): string {
  if (algorithm === 'bfs') return 'Breadth-first search';
  if (algorithm === 'dfs-iterative') return 'Iterative depth-first search';
  return 'Recursive depth-first search';
}

function frontierName(algorithm: TraversalAlgorithm): string {
  if (algorithm === 'bfs') return 'queue';
  if (algorithm === 'dfs-iterative') return 'stack';
  return 'call stack';
}

export function getGraphTraversalState(step: TraceStep): GraphTraversalState {
  return step.stateAfter as unknown as GraphTraversalState;
}

export function createGraphTraversalLesson(options: GraphTraversalOptions = {}): TraceLesson {
  const algorithm = options.algorithm ?? 'bfs';
  if (!algorithms.includes(algorithm)) {
    throw new GraphInputError(`Unsupported traversal algorithm “${String(algorithm)}”.`);
  }
  const graph = validateGraphDefinition(options.graph ?? getGraphPreset('learning-tree').graph);
  const startNode = options.startNode?.trim() || graph.nodes[0];
  if (!graph.nodes.includes(startNode)) {
    throw new GraphInputError(`Start node “${startNode}” is not present in this graph.`);
  }
  const traverseDisconnected = options.traverseDisconnected ?? true;
  const adjacency = adjacencyList(graph);
  const roots = traverseDisconnected
    ? [startNode, ...graph.nodes.filter((node) => node !== startNode)]
    : [startNode];
  const discovered = new Set<string>();
  const steps: TraceStep[] = [];
  let predictionAdded = false;
  const state: MutableTraversalState = {
    algorithm,
    currentNode: null,
    visited: [],
    discovered: [],
    queue: [],
    stack: [],
    callStack: [],
    traversalOrder: [],
    inspectingNeighbor: null,
    neighborStatus: null,
    component: 0,
    componentByNode: {},
    traversalTree: [],
    inspectionCount: 0
  };

  const predictionFor = (node: string): PredictionChallenge | undefined => {
    if (predictionAdded) return undefined;
    predictionAdded = true;
    return {
      id: `graph-${algorithm}-first-frontier`,
      prompt: `Which node will be processed next from the ${frontierName(algorithm)}?`,
      type: 'text',
      correctAnswer: node,
      explanation: `${node} is the first available node in the ${frontierName(algorithm)}.`,
      misconceptionTags: ['queue-vs-stack-order', 'frontier-direction'],
      xpReward: 10
    };
  };

  const addStep = (
    semantic: string,
    title: string,
    explanation: string,
    mutate: () => void,
    prediction?: PredictionChallenge
  ): void => {
    const beforeSnapshot = snapshot(state);
    mutate();
    const afterSnapshot = snapshot(state);
    const before = traceState(beforeSnapshot);
    const after = traceState(afterSnapshot);
    steps.push({
      id: `graph-${algorithm}-${steps.length}`,
      index: steps.length,
      title,
      eventType: semantic,
      sourceLineIds: [semantic],
      semanticOperationId: semantic,
      stateBefore: before,
      stateAfter: after,
      entities: entitiesFor(graph, afterSnapshot),
      mutations: mutationsBetween(before, after),
      deterministicExplanation: explanation,
      visualFocus: [
        ...(afterSnapshot.currentNode ? [`node-${afterSnapshot.currentNode}`] : []),
        ...(afterSnapshot.inspectingNeighbor ? [`node-${afterSnapshot.inspectingNeighbor}`] : [])
      ],
      prediction,
      complexityCost: { comparisons: afterSnapshot.inspectionCount },
      metadata: {
        directed: graph.directed,
        startNode,
        traverseDisconnected
      }
    });
  };

  const discover = (node: string, parent?: string): void => {
    discovered.add(node);
    state.discovered.push(node);
    state.componentByNode[node] = state.component;
    if (parent) state.traversalTree.push(treeEdgeKey(parent, node));
  };

  const inspect = (node: string, neighbor: string): 'visited' | 'frontier' | 'unseen' => {
    if (state.visited.includes(neighbor)) return 'visited';
    if (discovered.has(neighbor)) return 'frontier';
    return 'unseen';
  };

  if (algorithm === 'bfs') {
    for (const root of roots) {
      if (discovered.has(root)) continue;
      const component = state.component + 1;
      addStep(
        'initialize-frontier',
        component === 1 ? 'Seed the queue' : `Start component ${component}`,
        `${root} enters the queue and is marked discovered${component > 1 ? ' because the previous component is exhausted' : ''}.`,
        () => {
          state.component = component;
          discover(root);
          state.queue.push(root);
          state.currentNode = null;
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        },
        predictionFor(root)
      );
      while (state.queue.length > 0) {
        const node = state.queue[0];
        addStep('select-node', `Dequeue ${node}`, `${node} leaves the front of the queue.`, () => {
          state.currentNode = state.queue.shift() ?? null;
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        });
        addStep('visit-node', `Visit ${node}`, `${node} joins the traversal order.`, () => {
          state.visited.push(node);
          state.traversalOrder.push(node);
        });
        for (const neighbor of adjacency.get(node) ?? []) {
          const status = inspect(node, neighbor);
          addStep(
            'inspect-neighbor',
            `Inspect ${node} → ${neighbor}`,
            `${neighbor} is ${status === 'unseen' ? 'unseen and can be discovered' : status === 'frontier' ? 'already waiting in the frontier' : 'already visited'}.`,
            () => {
              state.inspectingNeighbor = neighbor;
              state.neighborStatus = status;
              state.inspectionCount += 1;
            }
          );
          if (!discovered.has(neighbor)) {
            addStep(
              'add-neighbor',
              `Enqueue ${neighbor}`,
              `${neighbor} is marked discovered now, preventing duplicate queue entries.`,
              () => {
                discover(neighbor, node);
                state.queue.push(neighbor);
                state.neighborStatus = 'frontier';
              }
            );
          }
        }
        addStep(
          'finish-node',
          `Finish ${node}`,
          `All neighbors of ${node} have been checked.`,
          () => {
            state.currentNode = null;
            state.inspectingNeighbor = null;
            state.neighborStatus = null;
          }
        );
      }
    }
  } else if (algorithm === 'dfs-iterative') {
    for (const root of roots) {
      if (discovered.has(root)) continue;
      const component = state.component + 1;
      addStep(
        'initialize-frontier',
        component === 1 ? 'Seed the stack' : `Start component ${component}`,
        `${root} is pushed onto the stack${component > 1 ? ' after the previous component is exhausted' : ''}.`,
        () => {
          state.component = component;
          discover(root);
          state.stack.push(root);
          state.currentNode = null;
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        },
        predictionFor(root)
      );
      while (state.stack.length > 0) {
        const node = state.stack[state.stack.length - 1];
        addStep('select-node', `Pop ${node}`, `${node} leaves the top of the stack.`, () => {
          state.currentNode = state.stack.pop() ?? null;
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        });
        addStep('visit-node', `Visit ${node}`, `${node} joins the traversal order.`, () => {
          state.visited.push(node);
          state.traversalOrder.push(node);
        });
        const neighbors = [...(adjacency.get(node) ?? [])].reverse();
        for (const neighbor of neighbors) {
          const status = inspect(node, neighbor);
          addStep(
            'inspect-neighbor',
            `Inspect ${node} → ${neighbor}`,
            `Neighbors are inspected in reverse lexical order so the smallest available label will be popped first. ${neighbor} is ${status}.`,
            () => {
              state.inspectingNeighbor = neighbor;
              state.neighborStatus = status;
              state.inspectionCount += 1;
            }
          );
          if (!discovered.has(neighbor)) {
            addStep(
              'add-neighbor',
              `Push ${neighbor}`,
              `${neighbor} is marked discovered and pushed onto the stack.`,
              () => {
                discover(neighbor, node);
                state.stack.push(neighbor);
                state.neighborStatus = 'frontier';
              }
            );
          }
        }
        addStep(
          'finish-node',
          `Finish ${node}`,
          `The stack now determines which node is visited next.`,
          () => {
            state.currentNode = null;
            state.inspectingNeighbor = null;
            state.neighborStatus = null;
          }
        );
      }
    }
  } else {
    const visitRecursively = (node: string): void => {
      addStep(
        'visit-node',
        `Enter ${node}`,
        `${node} joins the traversal order in this call frame.`,
        () => {
          state.currentNode = node;
          state.visited.push(node);
          state.traversalOrder.push(node);
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        }
      );
      for (const neighbor of adjacency.get(node) ?? []) {
        const status = inspect(node, neighbor);
        addStep(
          'inspect-neighbor',
          `Inspect ${node} → ${neighbor}`,
          `${neighbor} is ${status === 'unseen' ? 'unseen, so recursion can descend into it' : status === 'frontier' ? 'already represented by a call frame' : 'already visited'}.`,
          () => {
            state.currentNode = node;
            state.inspectingNeighbor = neighbor;
            state.neighborStatus = status;
            state.inspectionCount += 1;
          }
        );
        if (!discovered.has(neighbor)) {
          addStep(
            'add-neighbor',
            `Call DFS(${neighbor})`,
            `A new frame for ${neighbor} is pushed above ${node}.`,
            () => {
              discover(neighbor, node);
              state.callStack.push(neighbor);
              state.neighborStatus = 'frontier';
            }
          );
          visitRecursively(neighbor);
          addStep(
            'inspect-neighbor',
            `Resume ${node}`,
            `The call for ${neighbor} returned, so ${node} resumes its neighbor loop.`,
            () => {
              state.currentNode = node;
              state.inspectingNeighbor = neighbor;
              state.neighborStatus = 'visited';
            }
          );
        }
      }
      addStep(
        'return-node',
        `Return from ${node}`,
        `${node} has no unvisited neighbors left.`,
        () => {
          state.callStack.pop();
          state.currentNode = state.callStack.at(-1) ?? null;
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        }
      );
    };

    for (const root of roots) {
      if (discovered.has(root)) continue;
      const component = state.component + 1;
      addStep(
        'initialize-frontier',
        component === 1 ? `Call DFS(${root})` : `Start component ${component}`,
        `A call frame for ${root} starts ${component === 1 ? 'the traversal' : 'a new disconnected component'}.`,
        () => {
          state.component = component;
          discover(root);
          state.callStack.push(root);
          state.currentNode = null;
          state.inspectingNeighbor = null;
          state.neighborStatus = null;
        },
        predictionFor(root)
      );
      visitRecursively(root);
    }
  }

  addStep(
    'complete',
    'Traversal complete',
    `${algorithmName(algorithm)} visited ${state.traversalOrder.length} node${state.traversalOrder.length === 1 ? '' : 's'} across ${state.component} component${state.component === 1 ? '' : 's'}.`,
    () => {
      state.currentNode = null;
      state.inspectingNeighbor = null;
      state.neighborStatus = null;
    }
  );

  const sourceByLanguage = Object.fromEntries(
    (['c', 'cpp', 'java', 'python'] as SupportedLanguage[]).map((language) => [
      language,
      sourceLines(algorithm, language)
    ])
  ) as Record<SupportedLanguage, SourceLine[]>;
  const initial: GraphTraversalState = {
    algorithm,
    currentNode: null,
    visited: [],
    discovered: [],
    frontier: [],
    queue: [],
    stack: [],
    callStack: [],
    traversalOrder: [],
    inspectingNeighbor: null,
    neighborStatus: null,
    component: 0,
    componentByNode: {},
    traversalTree: [],
    inspectionCount: 0
  };

  return {
    id: `graph-explorer-${algorithm}`,
    subject: 'dsa-2',
    topic: 'Graph traversal',
    title: 'Graph Explorer',
    description: `Predict and replay ${algorithmName(algorithm).toLowerCase()} one state change at a time.`,
    difficulty: algorithm === 'bfs' ? 'beginner' : 'intermediate',
    learningObjectives: [
      'Distinguish visited nodes from nodes waiting in the frontier',
      'Explain how frontier order changes graph traversal order',
      'Trace traversal across disconnected components'
    ],
    supportedLanguages: ['c', 'cpp', 'java', 'python'],
    sourceByLanguage,
    initialState: traceState(initial),
    steps,
    completionCriteria: { requiredCorrectPredictions: 1, masteryThreshold: 0.8 }
  };
}
