<script lang="ts">
  import { onMount } from 'svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import {
    createGraphTraversalLesson,
    getGraphPreset,
    getGraphTraversalState,
    parseEdgeInput,
    type GraphDefinition,
    type GraphEdge,
    type GraphPresetId,
    type TraversalAlgorithm
  } from '$lib/engines/dsa/graphTraversal';
  import type { SupportedLanguage } from '$lib/trace/types';

  type InputMode = 'preset' | 'custom';
  type Point = { x: number; y: number };

  const initialPreset = getGraphPreset('learning-tree');
  const initialLesson = createGraphTraversalLesson({
    algorithm: 'bfs',
    graph: initialPreset.graph,
    startNode: initialPreset.defaultStart,
    traverseDisconnected: true
  });
  let algorithm = $state<TraversalAlgorithm>('bfs');
  let inputMode = $state<InputMode>('preset');
  let presetId = $state<GraphPresetId>('learning-tree');
  let edgeInput = $state('A-B, A-C, B-D, B-E, C-F, F-G');
  let startNode = $state(initialPreset.defaultStart);
  let directed = $state(initialPreset.graph.directed);
  let graph = $state<GraphDefinition>(initialPreset.graph);
  let lesson = $state(initialLesson);
  let index = $state(0);
  let language = $state<SupportedLanguage>('python');
  let playing = $state(false);
  let error = $state('');
  let submitted = $state<string[]>([]);
  let runId = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(lesson.steps[index]);
  let traversal = $derived(getGraphTraversalState(step));
  let positions = $derived(layoutNodes(graph.nodes));

  onMount(() => () => clearInterval(timer));

  function layoutNodes(nodes: string[]): Record<string, Point> {
    const centerX = 360;
    const centerY = 220;
    const radiusX = nodes.length < 3 ? 155 : 260;
    const radiusY = nodes.length < 3 ? 80 : 155;
    return Object.fromEntries(
      nodes.map((node, position) => {
        const angle = -Math.PI / 2 + (position * Math.PI * 2) / nodes.length;
        return [
          node,
          { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY }
        ];
      })
    );
  }

  function selectPreset(value: string) {
    presetId = value as GraphPresetId;
    const preset = getGraphPreset(presetId);
    startNode = preset.defaultStart;
    directed = preset.graph.directed;
  }

  function rebuild() {
    try {
      const nextGraph =
        inputMode === 'custom'
          ? parseEdgeInput(edgeInput, directed)
          : { ...getGraphPreset(presetId).graph, directed };
      const nextLesson = createGraphTraversalLesson({
        algorithm,
        graph: nextGraph,
        startNode,
        traverseDisconnected: true
      });
      clearInterval(timer);
      playing = false;
      graph = nextGraph;
      lesson = nextLesson;
      index = 0;
      submitted = [];
      runId += 1;
      error = '';
    } catch (caught) {
      error = caught instanceof Error ? caught.message : 'The graph could not be built.';
    }
  }

  function jump(next: number) {
    index = Math.max(0, Math.min(next, lesson.steps.length - 1));
  }

  function togglePlayback() {
    playing = !playing;
    clearInterval(timer);
    if (!playing) return;
    timer = setInterval(() => {
      if (index >= lesson.steps.length - 1) {
        playing = false;
        clearInterval(timer);
      } else {
        jump(index + 1);
      }
    }, 900);
  }

  function recordPrediction() {
    if (!step.prediction || submitted.includes(step.prediction.id)) return;
    submitted = [...submitted, step.prediction.id];
  }

  function isTreeEdge(edge: GraphEdge): boolean {
    const forward = `${edge.from}→${edge.to}`;
    const reverse = `${edge.to}→${edge.from}`;
    return (
      traversal.traversalTree.includes(forward) ||
      (!graph.directed && traversal.traversalTree.includes(reverse))
    );
  }

  function isActiveEdge(edge: GraphEdge): boolean {
    return (
      (traversal.currentNode === edge.from && traversal.inspectingNeighbor === edge.to) ||
      (!graph.directed &&
        traversal.currentNode === edge.to &&
        traversal.inspectingNeighbor === edge.from)
    );
  }

  function statusFor(node: string): string {
    if (traversal.currentNode === node) return 'current node';
    if (traversal.inspectingNeighbor === node)
      return `neighbor being inspected (${traversal.neighborStatus})`;
    if (traversal.visited.includes(node)) return 'visited';
    if (traversal.frontier.includes(node)) return 'waiting in the frontier';
    return 'unseen';
  }
</script>

<svelte:head>
  <title>Graph Explorer — ReplayCS</title>
  <meta
    name="description"
    content="Predict and replay BFS and DFS graph traversal state one step at a time."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-2">← DSA II</a>
    <p class="eyebrow">Prediction-first traversal lab</p>
    <h1>Graph Explorer</h1>
    <p class="intro">See exactly why a queue, stack, or call stack produces a different order.</p>
  </div>
  <div class="run-summary" aria-label="Current trace summary">
    <span>{traversal.visited.length}/{graph.nodes.length} visited</span>
    <span>{traversal.component} component{traversal.component === 1 ? '' : 's'}</span>
  </div>
</header>

<form
  class="panel setup"
  onsubmit={(event) => {
    event.preventDefault();
    rebuild();
  }}
>
  <fieldset>
    <legend>Traversal</legend>
    <label><input type="radio" bind:group={algorithm} value="bfs" /> BFS</label>
    <label
      ><input type="radio" bind:group={algorithm} value="dfs-iterative" /> DFS · iterative</label
    >
    <label
      ><input type="radio" bind:group={algorithm} value="dfs-recursive" /> DFS · recursive</label
    >
  </fieldset>
  <fieldset>
    <legend>Graph source</legend>
    <label><input type="radio" bind:group={inputMode} value="preset" /> Preset</label>
    <label><input type="radio" bind:group={inputMode} value="custom" /> Custom edges</label>
  </fieldset>

  {#if inputMode === 'preset'}
    <label class="field">
      <span>Preset graph</span>
      <select value={presetId} onchange={(event) => selectPreset(event.currentTarget.value)}>
        <option value="learning-tree">Learning tree</option>
        <option value="disconnected">Disconnected islands</option>
      </select>
    </label>
  {:else}
    <label class="field edges">
      <span>Edges <small>comma or line separated</small></span>
      <textarea bind:value={edgeInput} rows="2" placeholder="A-B, A-C, B-D"></textarea>
    </label>
  {/if}

  <label class="field start">
    <span>Start node</span>
    <input bind:value={startNode} maxlength="12" autocomplete="off" aria-describedby="start-hint" />
  </label>
  <label class="toggle"><input type="checkbox" bind:checked={directed} /> Directed edges</label>
  <button class="primary" type="submit">Build trace</button>
  <small id="start-hint" class="hint">Labels are case-sensitive. All components are traced.</small>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</form>

<div class="workspace">
  <div class="visual-column">
    <section class="panel graph-panel" aria-labelledby="graph-heading">
      <div class="panel-head">
        <div>
          <span class="eyebrow">Live graph state</span>
          <h2 id="graph-heading">
            {traversal.algorithm === 'bfs'
              ? 'Breadth-first search'
              : traversal.algorithm === 'dfs-iterative'
                ? 'Iterative depth-first search'
                : 'Recursive depth-first search'}
          </h2>
        </div>
        <div class="legend" aria-label="Node color legend">
          <span><i class="dot current-dot"></i>Current</span>
          <span><i class="dot frontier-dot"></i>Frontier</span>
          <span><i class="dot visited-dot"></i>Visited</span>
        </div>
      </div>

      <svg viewBox="0 0 720 440" role="img" aria-labelledby="graph-title graph-desc">
        <title id="graph-title">Graph traversal visualization</title>
        <desc id="graph-desc">
          {graph.nodes.length} nodes and {graph.edges.length} edges. Current node is {traversal.currentNode ??
            'none'}.
        </desc>
        <defs>
          <marker
            id="graph-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="18"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z"></path>
          </marker>
        </defs>
        {#each graph.edges as edge}
          <line
            x1={positions[edge.from].x}
            y1={positions[edge.from].y}
            x2={positions[edge.to].x}
            y2={positions[edge.to].y}
            class:tree={isTreeEdge(edge)}
            class:active-edge={isActiveEdge(edge)}
            marker-end={graph.directed ? 'url(#graph-arrow)' : undefined}
          />
        {/each}
        {#each graph.nodes as node}
          <g
            transform={`translate(${positions[node].x} ${positions[node].y})`}
            class:current={traversal.currentNode === node}
            class:inspecting={traversal.inspectingNeighbor === node}
            class:visited={traversal.visited.includes(node)}
            class:frontier={traversal.frontier.includes(node)}
          >
            <title>{node}: {statusFor(node)}</title>
            <circle r="27"></circle>
            <text text-anchor="middle" dominant-baseline="central">{node}</text>
            {#if traversal.componentByNode[node]}
              <text class="component-label" y="42" text-anchor="middle"
                >C{traversal.componentByNode[node]}</text
              >
            {/if}
          </g>
        {/each}
      </svg>

      <ul class="sr-only">
        {#each graph.nodes as node}<li>{node}: {statusFor(node)}</li>{/each}
      </ul>
      <div class="graph-caption">
        <span><i class="tree-line"></i>Traversal-tree edge</span>
        <span
          >{graph.directed ? 'Arrows show edge direction' : 'Edges can be followed both ways'}</span
        >
      </div>
    </section>

    <TraceControls
      {index}
      total={lesson.steps.length}
      {playing}
      onprevious={() => jump(index - 1)}
      onnext={() => jump(index + 1)}
      onrestart={() => jump(0)}
      onplay={togglePlayback}
      onjump={jump}
    />

    <section class="frontiers" aria-label="Traversal frontier state">
      <article class:active-frontier={traversal.algorithm === 'bfs'} class="panel frontier-card">
        <div><span>Queue</span><small>front →</small></div>
        <ol aria-label="Queue, front first">
          {#each traversal.queue as node}<li>{node}</li>{:else}<li class="empty">empty</li>{/each}
        </ol>
      </article>
      <article
        class:active-frontier={traversal.algorithm === 'dfs-iterative'}
        class="panel frontier-card"
      >
        <div><span>Stack</span><small>← top</small></div>
        <ol aria-label="Stack, bottom first">
          {#each traversal.stack as node}<li>{node}</li>{:else}<li class="empty">empty</li>{/each}
        </ol>
      </article>
      <article
        class:active-frontier={traversal.algorithm === 'dfs-recursive'}
        class="panel frontier-card"
      >
        <div><span>Call stack</span><small>← active frame</small></div>
        <ol aria-label="Call stack, oldest frame first">
          {#each traversal.callStack as node}<li>DFS({node})</li>{:else}<li class="empty">
              empty
            </li>{/each}
        </ol>
      </article>
    </section>
  </div>

  <aside class="panel inspector" aria-live="polite">
    <span class="eyebrow">Step {index + 1} / {lesson.steps.length}</span>
    <h2>{step.title}</h2>
    <p class="explanation">{step.deterministicExplanation}</p>

    <dl class="state-grid">
      <div>
        <dt>Current node</dt>
        <dd>{traversal.currentNode ?? '—'}</dd>
      </div>
      <div>
        <dt>Inspecting</dt>
        <dd>{traversal.inspectingNeighbor ?? '—'}</dd>
      </div>
      <div>
        <dt>Neighbor state</dt>
        <dd>{traversal.neighborStatus ?? '—'}</dd>
      </div>
      <div>
        <dt>Edge checks</dt>
        <dd>{traversal.inspectionCount}</dd>
      </div>
    </dl>

    <section class="set-view">
      <h3>Visited set</h3>
      <ol aria-label="Visited nodes">
        {#each traversal.visited as node}<li>{node}</li>{:else}<li class="empty">
            No nodes yet
          </li>{/each}
      </ol>
    </section>
    <section class="set-view order">
      <h3>Traversal order</h3>
      <ol aria-label="Traversal order">
        {#each traversal.traversalOrder as node, position}<li>
            <span>{position + 1}</span>{node}
          </li>{:else}<li class="empty">Waiting for the first visit</li>{/each}
      </ol>
    </section>

    {#if step.prediction}
      {#key `${runId}-${step.id}`}
        <PredictionCheckpoint
          challenge={step.prediction}
          submitted={submitted.includes(step.prediction.id)}
          onsubmit={recordPrediction}
        />
      {/key}
    {/if}
  </aside>
</div>

<section class="code-section" aria-labelledby="code-heading">
  <div class="code-copy">
    <span class="eyebrow">Cross-language mapping</span>
    <h2 id="code-heading">Same state change, different syntax</h2>
    <p>The highlighted line follows the current semantic operation across all four languages.</p>
  </div>
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={(next) => (language = next)}
  />
</section>

<style>
  .lesson-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .back {
    color: var(--primary);
    font-size: 0.85rem;
  }
  .lesson-head .eyebrow {
    margin: 0.7rem 0 0;
  }
  .lesson-head h1 {
    font-size: clamp(2.6rem, 7vw, 4.8rem);
    margin-bottom: 0.7rem;
  }
  .intro {
    color: var(--muted);
    margin: 0;
    max-width: 650px;
  }
  .run-summary {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: end;
  }
  .run-summary span {
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.45rem 0.7rem;
    color: var(--muted);
    font-size: 0.78rem;
  }
  .setup {
    padding: 1rem;
    display: grid;
    grid-template-columns: 1.4fr 0.9fr minmax(150px, 0.8fr) minmax(110px, 0.45fr) auto auto;
    gap: 0.8rem;
    align-items: end;
    margin: 1.4rem 0 1rem;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }
  legend,
  .field > span {
    color: var(--muted);
    display: block;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    margin-bottom: 0.45rem;
    text-transform: uppercase;
  }
  fieldset label,
  .toggle {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    white-space: nowrap;
  }
  input[type='radio'],
  input[type='checkbox'] {
    accent-color: var(--primary);
  }
  select,
  textarea,
  input:not([type='radio']):not([type='checkbox']) {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
    padding: 0.62rem;
  }
  textarea {
    min-width: 220px;
    resize: vertical;
  }
  .field small {
    color: #718096;
    text-transform: none;
    letter-spacing: 0;
  }
  .toggle {
    align-self: center;
  }
  .hint {
    color: var(--muted);
    grid-column: 1 / -1;
  }
  .error {
    color: var(--danger);
    margin: 0;
    grid-column: 1 / -1;
  }
  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(285px, 0.65fr);
    gap: 1rem;
  }
  .visual-column {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .graph-panel {
    padding: 1rem;
    overflow: hidden;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
  }
  .panel-head h2 {
    font-size: 1.35rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: end;
    gap: 0.65rem;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .legend span {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
  }
  .current-dot {
    background: var(--warning);
  }
  .frontier-dot {
    background: var(--secondary);
  }
  .visited-dot {
    background: var(--primary);
  }
  svg {
    display: block;
    width: 100%;
    max-height: 440px;
    margin: auto;
  }
  line {
    stroke: #42566f;
    stroke-width: 3;
    transition:
      stroke 180ms ease,
      stroke-width 180ms ease;
  }
  line.tree {
    stroke: #2dd4bf88;
    stroke-width: 5;
  }
  line.active-edge {
    stroke: var(--warning);
    stroke-width: 8;
  }
  marker path {
    fill: #71859f;
  }
  g circle {
    fill: #12243a;
    stroke: #526780;
    stroke-width: 3;
    transition:
      fill 180ms ease,
      stroke 180ms ease;
  }
  g text {
    fill: var(--text);
    font-size: 17px;
    font-weight: 800;
  }
  g.visited circle {
    fill: #123c3c;
    stroke: var(--primary);
  }
  g.frontier circle {
    fill: #2c2450;
    stroke: var(--secondary);
  }
  g.inspecting circle {
    stroke: var(--warning);
    stroke-width: 6;
    stroke-dasharray: 5 4;
  }
  g.current circle {
    fill: #55451c;
    stroke: var(--warning);
    stroke-width: 7;
  }
  g .component-label {
    fill: var(--muted);
    font-size: 11px;
    font-weight: 700;
  }
  .graph-caption {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .graph-caption span {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .tree-line {
    display: inline-block;
    width: 22px;
    height: 4px;
    background: #2dd4bf88;
  }
  .frontiers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.7rem;
  }
  .frontier-card {
    padding: 0.75rem;
    opacity: 0.58;
  }
  .frontier-card.active-frontier {
    opacity: 1;
    border-color: #2dd4bf77;
  }
  .frontier-card > div {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    font-size: 0.72rem;
    text-transform: uppercase;
  }
  .frontier-card ol,
  .set-view ol {
    list-style: none;
    padding: 0;
    margin: 0.7rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .frontier-card li,
  .set-view li {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 0.35rem 0.5rem;
    font: 0.78rem var(--mono);
  }
  .frontier-card li:last-child {
    border-color: var(--secondary);
  }
  .frontier-card li.empty,
  .set-view li.empty {
    color: var(--muted);
    border-style: dashed;
    font-family: inherit;
  }
  .inspector {
    padding: 1.1rem;
    min-width: 0;
  }
  .inspector h2 {
    font-size: 1.6rem;
  }
  .explanation {
    color: #dce7f5;
    line-height: 1.6;
    min-height: 4.8em;
  }
  .state-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 1rem 0;
  }
  .state-grid div {
    background: #07111f88;
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 0.65rem;
  }
  dt {
    color: var(--muted);
    font-size: 0.68rem;
    text-transform: uppercase;
  }
  dd {
    margin: 0.25rem 0 0;
    color: var(--primary);
    font: 0.9rem var(--mono);
  }
  .set-view {
    border-top: 1px solid var(--border);
    padding: 0.8rem 0;
  }
  .set-view h3 {
    color: var(--muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    margin: 0;
  }
  .order li {
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }
  .order li span {
    color: var(--muted);
    font-size: 0.62rem;
  }
  .code-section {
    display: grid;
    grid-template-columns: 0.55fr 1.45fr;
    gap: 1rem;
    align-items: start;
    margin-top: 1rem;
  }
  .code-copy {
    padding: 1rem;
  }
  .code-copy h2 {
    font-size: 1.5rem;
  }
  .code-copy p {
    color: var(--muted);
    line-height: 1.6;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 1050px) {
    .setup {
      grid-template-columns: repeat(3, 1fr);
    }
    .workspace {
      grid-template-columns: 1fr;
    }
    .code-section {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 700px) {
    .lesson-head {
      align-items: start;
      flex-direction: column;
    }
    .run-summary {
      justify-content: start;
    }
    .setup {
      grid-template-columns: 1fr;
    }
    .hint,
    .error {
      grid-column: auto;
    }
    .panel-head {
      flex-direction: column;
    }
    .legend {
      justify-content: start;
    }
    .frontiers {
      grid-template-columns: 1fr;
    }
    .graph-caption {
      flex-direction: column;
    }
  }
</style>
