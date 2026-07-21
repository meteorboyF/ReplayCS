<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type BstNodeView = {
    id: string;
    value: number;
    left: string | null;
    right: string | null;
    depth: number;
    inorder: number;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  let strategy = $derived(String(state.strategy ?? 'linear'));
  let array = $derived((Array.isArray(state.array) ? state.array : []) as number[]);
  let nodes = $derived((Array.isArray(state.nodes) ? state.nodes : []) as unknown as BstNodeView[]);
  let buckets = $derived((Array.isArray(state.buckets) ? state.buckets : []) as number[][]);
  let compared = $derived(new Set((state.comparedValues as number[] | undefined) ?? []));
  let left = $derived(typeof state.left === 'number' ? state.left : null);
  let right = $derived(typeof state.right === 'number' ? state.right : null);
  let treeColumns = $derived(Math.max(1, nodes.length));
  let treeRows = $derived(nodes.reduce((maximum, node) => Math.max(maximum, node.depth), 0) + 1);

  function cellClasses(index: number, value: number) {
    const inRange = left === null || right === null || (index >= left && index <= right);
    return [
      strategy.startsWith('binary') && !inRange ? 'discarded' : '',
      compared.has(value) ? 'compared' : '',
      state.mid === index ? 'mid' : '',
      state.i === index ? 'cursor' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Search memory state">
  <div class="scalar-dock" aria-label="Search bookkeeping values">
    <div class="active"><span>target</span><code>{String(state.target)}</code></div>
    {#if strategy.startsWith('binary')}
      <div class:active={left !== null}>
        <span>lo</span><code>{left === null ? '—' : left}</code>
      </div>
      <div class:active={right !== null}>
        <span>hi</span><code>{right === null ? '—' : right}</code>
      </div>
      <div class:active={state.mid !== null}>
        <span>mid</span><code>{state.mid === null ? '—' : String(state.mid)}</code>
      </div>
      <div class:active={strategy === 'binary-recursive' && Number(state.depth) > 0}>
        <span>{strategy === 'binary-recursive' ? 'stack depth' : 'extra memory'}</span>
        <code>{strategy === 'binary-recursive' ? String(state.depth) : '2 bounds'}</code>
      </div>
    {:else if strategy === 'bst'}
      <div class:active={state.currentNode !== null}>
        <span>cursor</span><code
          >{state.currentNode === null ? 'null' : String(state.currentNode)}</code
        >
      </div>
      <div class="active"><span>height</span><code>{treeRows - 1}</code></div>
      <div class="active"><span>nodes</span><code>{nodes.length}</code></div>
      <div class="active"><span>compared</span><code>{compared.size}</code></div>
    {:else if strategy === 'hash'}
      <div class:active={state.homeBucket !== null}>
        <span>h(target)</span><code
          >{state.homeBucket === null ? '—' : String(state.homeBucket)}</code
        >
      </div>
      <div class="active"><span>buckets m</span><code>{buckets.length}</code></div>
      <div class="active"><span>compared</span><code>{compared.size}</code></div>
      <div class="active">
        <span>untouched</span><code>{Math.max(0, buckets.length - 1)} buckets</code>
      </div>
    {:else}
      <div class:active={state.i !== null}>
        <span>i</span><code>{state.i === null ? '—' : String(state.i)}</code>
      </div>
      <div class="active"><span>compared</span><code>{compared.size}</code></div>
      <div class="active"><span>remaining</span><code>{array.length - compared.size}</code></div>
      <div class="active"><span>extra memory</span><code>1 cursor</code></div>
    {/if}
  </div>

  {#if strategy === 'bst'}
    <div
      class="tree"
      aria-label="Binary search tree"
      style={`grid-template-columns: repeat(${treeColumns}, 1fr); grid-template-rows: repeat(${treeRows}, auto);`}
    >
      {#each nodes as node (node.id)}
        <div
          class="tree-node"
          class:current={state.currentNode === node.id}
          class:compared={compared.has(node.value)}
          style={`grid-column: ${node.inorder + 1}; grid-row: ${node.depth + 1};`}
          aria-label={`Node ${node.id}, value ${node.value}, depth ${node.depth}`}
        >
          <b>{node.value}</b>
          <small>{node.left ? '↙' : '·'}{node.right ? '↘' : '·'}</small>
        </div>
      {/each}
    </div>
    <p class="tree-note">
      Rows are tree depth; columns are in-order position. A tall thin staircase means the tree is
      skewed.
    </p>
  {:else if strategy === 'hash'}
    <div class="buckets" aria-label="Hash buckets">
      {#each buckets as chain, index}
        <div class="bucket" class:home={state.homeBucket === index}>
          <small>{index}</small>
          <div class="chain">
            {#each chain as key, position}
              <b
                class:compared={compared.has(key)}
                class:cursor={state.homeBucket === index && state.chainPosition === position}
                >{key}</b
              >
            {:else}
              <b class="nil">·</b>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="array" aria-label="Array being searched">
      {#each array as value, index}
        <div class="cell {cellClasses(index, value)}">
          <small>{index}</small>
          <b>{value}</b>
          <span class="tags">
            {#if state.mid === index}<i class="mid-tag">mid</i>{/if}
            {#if state.i === index}<i class="cursor-tag">i</i>{/if}
          </span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="legend" aria-label="State legend">
    <span><i class="l-compared"></i>Compared</span>
    {#if strategy.startsWith('binary')}<span><i class="l-discarded"></i>Discarded unseen</span><span
        ><i class="l-mid"></i>Midpoint</span
      >{/if}
    {#if strategy === 'bst'}<span><i class="l-current"></i>Search path</span>{/if}
    {#if strategy === 'hash'}<span><i class="l-home"></i>Home bucket h(k)</span>{/if}
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
    background: var(--bg);
  }
  .scalar-dock > div.active {
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
    background: color-mix(in srgb, var(--primary) 4%, transparent);
  }
  .scalar-dock span {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .scalar-dock code {
    color: var(--primary);
    font-size: 0.78rem;
  }
  .array {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    padding: 0.6rem 0 0.2rem;
  }
  .cell {
    position: relative;
    flex: 1;
    min-width: 54px;
    display: grid;
    gap: 0.15rem;
    justify-items: center;
    padding: 0.55rem 0.3rem 0.4rem;
    border: 2px solid color-mix(in srgb, var(--primary) 33%, transparent);
    border-radius: 10px;
    background: color-mix(in srgb, var(--primary) 3%, transparent);
    transition: 160ms ease;
  }
  .cell small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .cell b {
    font: 1.15rem var(--mono);
  }
  .cell.discarded {
    border-color: var(--border);
    border-style: dashed;
    background: none;
    opacity: 0.4;
  }
  .cell.compared {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 7%, transparent);
  }
  .cell.mid {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 9%, transparent);
    transform: translateY(-4px);
  }
  .cell.cursor {
    border-color: var(--secondary);
    transform: translateY(-4px);
  }
  .tags {
    display: flex;
    gap: 0.2rem;
    min-height: 14px;
  }
  .tags i {
    padding: 0.05rem 0.3rem;
    border-radius: 99px;
    font: 0.5rem var(--mono);
    font-style: normal;
  }
  .tags .mid-tag {
    background: var(--primary);
    color: var(--primary-contrast);
  }
  .tags .cursor-tag {
    background: var(--secondary);
    color: var(--raised);
  }
  .tree {
    display: grid;
    gap: 0.3rem;
    overflow-x: auto;
    padding: 0.5rem 0;
  }
  .tree-node {
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    min-width: 44px;
    padding: 0.35rem 0.3rem;
    border: 2px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    transition: 160ms ease;
  }
  .tree-node b {
    font: 0.95rem var(--mono);
  }
  .tree-node small {
    color: var(--muted);
    font-size: 0.55rem;
  }
  .tree-node.compared {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 7%, transparent);
  }
  .tree-node.current {
    border-color: var(--primary);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 9%, transparent);
  }
  .tree-note {
    margin: 0;
    color: var(--muted);
    font-size: 0.62rem;
  }
  .buckets {
    display: flex;
    gap: 0.3rem;
    align-items: start;
    overflow-x: auto;
    padding: 0.5rem 0;
  }
  .bucket {
    flex: 1;
    min-width: 46px;
    display: grid;
    gap: 0.25rem;
    justify-items: center;
    padding: 0.45rem 0.25rem 0.4rem;
    border: 2px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
  }
  .bucket small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .bucket.home {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent);
  }
  .chain {
    display: grid;
    gap: 0.2rem;
    justify-items: center;
  }
  .chain b {
    min-width: 34px;
    padding: 0.2rem 0.3rem;
    border: 1px solid color-mix(in srgb, var(--primary) 27%, transparent);
    border-radius: 7px;
    background: color-mix(in srgb, var(--primary) 4%, transparent);
    text-align: center;
    font: 0.85rem var(--mono);
  }
  .chain b.nil {
    border-color: var(--border);
    border-style: dashed;
    background: none;
    color: var(--muted);
  }
  .chain b.compared {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 8%, transparent);
  }
  .chain b.cursor {
    border-color: var(--secondary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--secondary) 9%, transparent);
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
    border-radius: 3px;
  }
  .legend i.l-compared {
    border-color: var(--warning);
  }
  .legend i.l-discarded {
    border-color: var(--border);
    border-style: dashed;
  }
  .legend i.l-mid,
  .legend i.l-home,
  .legend i.l-current {
    border-color: var(--primary);
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
