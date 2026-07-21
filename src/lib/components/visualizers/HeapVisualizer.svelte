<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  let { state }: { state: Record<string, TraceValue> } = $props();

  let heap = $derived((Array.isArray(state.heap) ? state.heap : []) as number[]);
  let heapSize = $derived(typeof state.heapSize === 'number' ? state.heapSize : heap.length);
  let swapped = $derived(new Set((state.swapped as number[] | undefined) ?? []));
  let sorted = $derived(new Set((state.sorted as number[] | undefined) ?? []));
  let kind = $derived(String(state.kind ?? 'max'));

  // Tree rows by depth: row r holds indices [2^r - 1 .. 2^(r+1) - 2].
  let rows = $derived.by(() => {
    const result: number[][] = [];
    let start = 0;
    let count = 1;
    while (start < heapSize) {
      result.push(
        Array.from({ length: Math.min(count, heapSize - start) }, (_, offset) => start + offset)
      );
      start += count;
      count *= 2;
    }
    return result;
  });

  function nodeClasses(index: number) {
    return [
      index === 0 ? 'root' : '',
      state.cursor === index ? 'cursor' : '',
      state.compareA === index || state.compareB === index ? 'comparing' : '',
      swapped.has(index) ? 'swapped' : '',
      sorted.has(index) ? 'leaf-skip' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Heap memory state">
  <div class="scalar-dock" aria-label="Heap bookkeeping values">
    <div class="active"><span>heap kind</span><code>{kind}-heap</code></div>
    <div class="active"><span>heap size</span><code>{heapSize}</code></div>
    <div class:active={state.cursor !== null}>
      <span>cursor i</span><code>{state.cursor === null ? '—' : String(state.cursor)}</code>
    </div>
    <div class="active"><span>root</span><code>{heap.length ? heap[0] : '—'}</code></div>
    <div class:active={state.result !== null}>
      <span>result</span><code>{state.result === null ? '—' : String(state.result)}</code>
    </div>
  </div>

  <div class="tree" aria-label="Heap as a complete binary tree">
    {#if heapSize === 0}
      <div class="empty">The heap is empty.</div>
    {:else}
      {#each rows as row, depth}
        <div class="row" style={`--cols:${row.length}`}>
          {#each row as index (index)}
            <div class="node {nodeClasses(index)}" aria-label={`heap[${index}] = ${heap[index]}, depth ${depth}`}>
              <b>{heap[index]}</b>
              <small>i{index}</small>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </div>

  <div class="array-view" aria-label="Heap backing array">
    <span class="array-label">array</span>
    <div class="cells">
      {#each heap as value, index}
        <div class="cell {nodeClasses(index)}" class:out={index >= heapSize}>
          <small>{index}</small><b>{value}</b>
        </div>
      {/each}
    </div>
  </div>

  <div class="legend" aria-label="State legend">
    <span><i class="l-root"></i>Root (extreme)</span><span><i class="l-cursor"></i>Sifting cursor</span>
    <span><i class="l-comparing"></i>Comparing</span><span><i class="l-swapped"></i>Swapped</span>
    <span><i class="l-skip"></i>Leaf (no sift)</span>
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
    font-size: 0.78rem;
  }
  .tree {
    display: grid;
    gap: 0.6rem;
    padding: 0.6rem 0;
    min-height: 200px;
  }
  .row {
    display: flex;
    justify-content: space-around;
    gap: 0.4rem;
  }
  .node {
    display: grid;
    justify-items: center;
    gap: 0.05rem;
    width: 44px;
    height: 44px;
    place-content: center;
    border: 2px solid #334155;
    border-radius: 50%;
    background: #0a1727;
    transition: 160ms ease;
  }
  .node b {
    font: 0.85rem var(--mono);
  }
  .node small {
    color: var(--muted);
    font-size: 0.5rem;
  }
  .node.root {
    border-color: var(--primary);
  }
  .node.leaf-skip {
    border-style: dashed;
    opacity: 0.6;
  }
  .node.comparing {
    border-color: var(--warning);
    box-shadow: 0 0 0 3px #fbbf2422;
  }
  .node.swapped {
    border-color: var(--secondary);
    box-shadow: 0 0 0 3px #9b7cff22;
  }
  .node.cursor {
    border-color: var(--success);
    transform: scale(1.1);
  }
  .array-view {
    display: grid;
    gap: 0.3rem;
  }
  .array-label {
    color: var(--muted);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .cells {
    display: flex;
    gap: 0.3rem;
    overflow-x: auto;
  }
  .cell {
    flex: 1;
    min-width: 44px;
    display: grid;
    gap: 0.1rem;
    justify-items: center;
    padding: 0.4rem 0.3rem;
    border: 2px solid #2dd4bf44;
    border-radius: 8px;
    background: #2dd4bf08;
  }
  .cell small {
    color: var(--muted);
    font-size: 0.55rem;
  }
  .cell b {
    font: 0.95rem var(--mono);
  }
  .cell.out {
    border-style: dashed;
    border-color: var(--border);
    background: none;
    opacity: 0.45;
  }
  .cell.cursor {
    border-color: var(--success);
  }
  .cell.comparing {
    border-color: var(--warning);
  }
  .cell.swapped {
    border-color: var(--secondary);
  }
  .empty {
    display: grid;
    place-items: center;
    min-height: 180px;
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
  .legend i.l-cursor {
    border-color: var(--success);
  }
  .legend i.l-comparing {
    border-color: var(--warning);
  }
  .legend i.l-swapped {
    border-color: var(--secondary);
  }
  .legend i.l-skip {
    border-color: var(--border);
    border-style: dashed;
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
