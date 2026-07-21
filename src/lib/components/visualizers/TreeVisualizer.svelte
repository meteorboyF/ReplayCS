<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type TreeNodeView = {
    id: string;
    value: number;
    left: string | null;
    right: string | null;
    depth: number;
    inorder: number;
    status: string;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  let nodes = $derived(
    (Array.isArray(state.nodes) ? state.nodes : []) as unknown as TreeNodeView[]
  );
  let liveNodes = $derived(nodes.filter((node) => node.status !== 'deleted'));
  let visited = $derived(new Set((state.visited as string[] | undefined) ?? []));
  let queue = $derived((state.queue as string[] | undefined) ?? []);
  let columns = $derived(Math.max(1, ...liveNodes.map((node) => node.inorder + 1)));
  let rows = $derived(Math.max(1, ...liveNodes.map((node) => node.depth + 1)));
  let byId = $derived(new Map(liveNodes.map((node) => [node.id, node])));

  // Edges as SVG lines between parent and child cell centers (percent coordinates).
  let edges = $derived(
    liveNodes.flatMap((node) =>
      [node.left, node.right]
        .filter((childId): childId is string => childId !== null && byId.has(childId))
        .map((childId) => {
          const child = byId.get(childId)!;
          return {
            x1: ((node.inorder + 0.5) / columns) * 100,
            y1: ((node.depth + 0.5) / rows) * 100,
            x2: ((child.inorder + 0.5) / columns) * 100,
            y2: ((child.depth + 0.5) / rows) * 100
          };
        })
    )
  );

  function nodeClasses(node: TreeNodeView) {
    return [
      state.root === node.id ? 'root' : '',
      state.current === node.id ? 'current' : '',
      state.successor === node.id ? 'successor' : '',
      state.newNode === node.id ? 'allocated' : '',
      visited.has(node.id) ? 'visited' : '',
      queue.includes(node.id) ? 'queued' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Binary search tree state">
  <div class="scalar-dock" aria-label="Tree bookkeeping values">
    <div class:active={state.current !== null}>
      <span>current</span><code>{state.current === null ? 'null' : String(state.current)}</code>
    </div>
    <div class:active={state.successor !== null}>
      <span>successor</span><code>{state.successor === null ? '—' : String(state.successor)}</code>
    </div>
    <div class="active"><span>height</span><code>{rows - 1}</code></div>
    <div class="active"><span>nodes</span><code>{liveNodes.length}</code></div>
    {#if queue.length}
      <div class="active"><span>queue</span><code>[{queue.join(', ')}]</code></div>
    {:else}
      <div class:active={Array.isArray(state.visited) && (state.visited as string[]).length > 0}>
        <span>visited</span><code
          >{Array.isArray(state.visited) ? (state.visited as string[]).length : 0}</code
        >
      </div>
    {/if}
  </div>

  <div class="tree-wrap">
    {#if liveNodes.length === 0}
      <div class="empty">The tree is empty.</div>
    {:else}
      <svg class="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {#each edges as edge}
          <line x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} />
        {/each}
      </svg>
      <div
        class="grid"
        style={`grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr);`}
      >
        {#each liveNodes as node (node.id)}
          <div
            class="node {nodeClasses(node)}"
            style={`grid-column: ${node.inorder + 1}; grid-row: ${node.depth + 1};`}
            aria-label={`Node ${node.id}, value ${node.value}, depth ${node.depth}`}
          >
            <b>{node.value}</b>
            <small>{node.id}</small>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="legend" aria-label="State legend">
    <span><i class="l-root"></i>Root</span><span><i class="l-current"></i>Current</span>
    <span><i class="l-visited"></i>Visited</span>
    {#if queue.length}<span><i class="l-queued"></i>In queue</span>{/if}
    {#if state.successor !== null}<span><i class="l-successor"></i>Successor</span>{/if}
  </div>
</section>

<style>
  .visualizer {
    padding: 1rem;
    display: grid;
    gap: 0.9rem;
    overflow: hidden;
  }
  .scalar-dock {
    display: grid;
    grid-template-columns: repeat(5, minmax(76px, 1fr));
    gap: 0.4rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--border);
  }
  .scalar-dock > div {
    display: grid;
    gap: 0.2rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #07111f88;
  }
  .scalar-dock > div.active {
    border-color: #2dd4bf66;
    background: #2dd4bf0b;
  }
  .scalar-dock span {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .scalar-dock code {
    color: var(--primary);
    font-size: 0.74rem;
    overflow-wrap: anywhere;
  }
  .tree-wrap {
    position: relative;
    min-height: 260px;
    padding: 0.5rem;
  }
  .edges {
    position: absolute;
    inset: 0.5rem;
    width: calc(100% - 1rem);
    height: calc(100% - 1rem);
    pointer-events: none;
  }
  .edges line {
    stroke: #334155;
    stroke-width: 0.4;
    vector-effect: non-scaling-stroke;
  }
  .grid {
    position: relative;
    display: grid;
    gap: 0.3rem;
    min-height: 250px;
  }
  .node {
    justify-self: center;
    align-self: center;
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    width: 46px;
    height: 46px;
    place-content: center;
    border: 2px solid #334155;
    border-radius: 50%;
    background: #0a1727;
    transition: 160ms ease;
    z-index: 1;
  }
  .node b {
    font: 0.9rem var(--mono);
  }
  .node small {
    color: var(--muted);
    font-size: 0.5rem;
  }
  .node.root {
    border-color: var(--primary);
  }
  .node.visited {
    background: #2dd4bf12;
  }
  .node.current {
    border-color: var(--warning);
    box-shadow: 0 0 0 4px #fbbf2422;
    transform: scale(1.08);
  }
  .node.successor {
    border-color: var(--secondary);
    box-shadow: 0 0 0 3px #9b7cff22;
  }
  .node.allocated {
    border-color: var(--success);
    animation: pop 300ms ease-out;
  }
  .node.queued {
    border-style: dashed;
    border-color: var(--accent);
  }
  .empty {
    display: grid;
    place-items: center;
    min-height: 220px;
    color: var(--muted);
  }
  .legend {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    color: var(--muted);
    font-size: 0.62rem;
  }
  .legend span {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
  }
  .legend i {
    width: 9px;
    height: 9px;
    border: 2px solid;
    border-radius: 50%;
  }
  .legend i.l-root {
    border-color: var(--primary);
  }
  .legend i.l-current {
    border-color: var(--warning);
  }
  .legend i.l-visited {
    border-color: #2dd4bf88;
    background: #2dd4bf22;
  }
  .legend i.l-queued {
    border-color: var(--accent);
    border-style: dashed;
  }
  .legend i.l-successor {
    border-color: var(--secondary);
  }
  @keyframes pop {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
