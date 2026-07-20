import { describe, expect, it } from 'vitest';
import {
  createGraphTraversalLesson,
  getGraphPreset,
  getGraphTraversalState,
  GraphInputError,
  parseEdgeInput,
  tryParseEdgeInput
} from './graphTraversal';

function finalOrder(algorithm: 'bfs' | 'dfs-iterative' | 'dfs-recursive'): string[] {
  const lesson = createGraphTraversalLesson({
    algorithm,
    graph: getGraphPreset('learning-tree').graph,
    startNode: 'A'
  });
  return getGraphTraversalState(lesson.steps.at(-1)!).traversalOrder;
}

describe('graph input validation', () => {
  it('parses compact edge pairs into a sorted undirected graph', () => {
    expect(parseEdgeInput('C-D, A-B; A-C')).toEqual({
      nodes: ['A', 'B', 'C', 'D'],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'C', to: 'D' }
      ],
      directed: false
    });
  });

  it('preserves edge direction when requested', () => {
    const graph = parseEdgeInput('B->A, A->C', true);
    expect(graph.directed).toBe(true);
    expect(graph.edges).toContainEqual({ from: 'B', to: 'A' });
  });

  it.each([
    ['A-A', 'Self-loop'],
    ['A-B, B-A', 'appears more than once'],
    ['A/B', 'Could not read']
  ])('rejects invalid input %s', (input, message) => {
    expect(() => parseEdgeInput(input)).toThrow(message);
    expect(tryParseEdgeInput(input).success).toBe(false);
  });

  it('rejects a start node outside the graph', () => {
    expect(() =>
      createGraphTraversalLesson({ graph: parseEdgeInput('A-B'), startNode: 'Z' })
    ).toThrow(GraphInputError);
  });
});

describe('deterministic graph traversal traces', () => {
  it('produces the expected BFS order with queue snapshots', () => {
    const lesson = createGraphTraversalLesson({ algorithm: 'bfs' });
    expect(finalOrder('bfs')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(lesson.steps.some((step) => getGraphTraversalState(step).queue.length > 1)).toBe(true);
    expect(lesson.steps.filter((step) => step.prediction)).toHaveLength(1);
  });

  it('produces the expected iterative DFS order with stack snapshots', () => {
    const lesson = createGraphTraversalLesson({ algorithm: 'dfs-iterative' });
    expect(finalOrder('dfs-iterative')).toEqual(['A', 'B', 'D', 'E', 'C', 'F', 'G']);
    expect(lesson.steps.some((step) => getGraphTraversalState(step).stack.length > 1)).toBe(true);
  });

  it('produces the expected recursive DFS order and unwinds every call frame', () => {
    const lesson = createGraphTraversalLesson({ algorithm: 'dfs-recursive' });
    expect(finalOrder('dfs-recursive')).toEqual(['A', 'B', 'D', 'E', 'C', 'F', 'G']);
    expect(
      Math.max(...lesson.steps.map((step) => getGraphTraversalState(step).callStack.length))
    ).toBeGreaterThan(2);
    expect(getGraphTraversalState(lesson.steps.at(-1)!).callStack).toEqual([]);
  });

  it('restarts at the next lexical node for disconnected components', () => {
    const lesson = createGraphTraversalLesson({
      algorithm: 'bfs',
      graph: getGraphPreset('disconnected').graph,
      startNode: 'D'
    });
    const final = getGraphTraversalState(lesson.steps.at(-1)!);
    expect(final.traversalOrder).toEqual(['D', 'E', 'A', 'B', 'C', 'F', 'G']);
    expect(final.component).toBe(3);
  });

  it('returns byte-for-byte deterministic, serializable snapshots', () => {
    const options = {
      algorithm: 'dfs-recursive' as const,
      graph: parseEdgeInput('A-B, A-C, B-D'),
      startNode: 'A'
    };
    const first = createGraphTraversalLesson(options);
    const second = createGraphTraversalLesson(options);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.steps.every((step, index) => step.index === index)).toBe(true);
  });
});
