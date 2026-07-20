<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type NodeView = {
    id: string;
    value: string | number;
    next: string | null;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  const pointerNames = [
    'head',
    'tail',
    'current',
    'previous',
    'next',
    'newNode',
    'slow',
    'fast'
  ] as const;
  let nodes = $derived((Array.isArray(state.nodes) ? state.nodes : []) as unknown as NodeView[]);
  let traversed = $derived(new Set((state.traversed as string[] | undefined) ?? []));
  let detached = $derived(new Set((state.detached as string[] | undefined) ?? []));
  let allocated = $derived(new Set((state.allocated as string[] | undefined) ?? []));
  let deleted = $derived(new Set((state.deleted as string[] | undefined) ?? []));
  let reconnected = $derived(new Set((state.reconnected as string[] | undefined) ?? []));

  function pointerValue(name: (typeof pointerNames)[number]) {
    const value = state[name];
    return typeof value === 'string'
      ? value
      : value === null || value === undefined
        ? 'null'
        : String(value);
  }

  function nodeClasses(node: NodeView) {
    return [
      traversed.has(node.id) ? 'traversed' : '',
      detached.has(node.id) ? 'detached' : '',
      allocated.has(node.id) ? 'allocated' : '',
      deleted.has(node.id) ? 'deleted' : '',
      reconnected.has(node.id) ? 'reconnected' : '',
      pointerValue('current') === node.id ? 'current' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  function nodeById(id: string | null) {
    return nodes.find((node) => node.id === id);
  }
</script>

<section class="visualizer panel" aria-label="Linked list memory state">
  <div class="pointer-dock" aria-label="Pointer and reference values">
    {#each pointerNames as name}
      <div class:active={pointerValue(name) !== 'null'}>
        <span>{name}</span><code>{pointerValue(name)}</code>
      </div>
    {/each}
  </div>

  <div class="memory" aria-label="Nodes and next references">
    {#if nodes.length === 0}
      <div class="empty"><code>head → null</code><span>The list is empty.</span></div>
    {:else}
      {#each nodes as node}
        <div class="chain-part">
          <article class={nodeClasses(node)} aria-label={`Node ${node.id}, value ${node.value}`}>
            <span class="node-id">{node.id}</span>
            <strong>{node.value}</strong>
            <div><small>next</small><code>{node.next ?? 'null'}</code></div>
            <div class="badges">
              {#if traversed.has(node.id)}<span>traversed</span>{/if}
              {#if allocated.has(node.id)}<span>allocated</span>{/if}
              {#if detached.has(node.id)}<span>detached</span>{/if}
              {#if deleted.has(node.id)}<span>deleted</span>{/if}
              {#if reconnected.has(node.id)}<span>reconnected</span>{/if}
            </div>
          </article>
          {#if node.next === null}
            <div class="arrow null" aria-label={`${node.id} points to null`}>→ <b>null</b></div>
          {:else if nodeById(node.next)}
            <div
              class:cycle={nodes.findIndex((candidate) => candidate.id === node.next) <=
                nodes.findIndex((candidate) => candidate.id === node.id)}
              class="arrow"
              aria-label={`${node.id} points to ${node.next}`}
            >
              → <small>{node.next}</small>
            </div>
          {:else}
            <div class="arrow missing">⇢ <small>{node.next}</small></div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <div class="legend" aria-label="Node state legend">
    <span><i class="traversed"></i>Traversed</span><span><i class="allocated"></i>Allocated</span
    ><span><i class="detached"></i>Detached</span><span><i class="deleted"></i>Deleted</span>
    <span><i class="reconnected"></i>Reconnected</span>
  </div>
</section>

<style>
  .visualizer {
    padding: 1rem;
    overflow: hidden;
  }
  .pointer-dock {
    display: grid;
    grid-template-columns: repeat(8, minmax(68px, 1fr));
    gap: 0.4rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--border);
  }
  .pointer-dock > div {
    display: grid;
    gap: 0.2rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #07111f88;
  }
  .pointer-dock > div.active {
    border-color: #2dd4bf66;
    background: #2dd4bf0b;
  }
  .pointer-dock span,
  .node-id {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .pointer-dock code {
    color: var(--primary);
    font-size: 0.78rem;
  }
  .memory {
    display: flex;
    align-items: center;
    min-height: 210px;
    padding: 1.25rem 0.25rem;
    overflow-x: auto;
  }
  .chain-part {
    display: flex;
    align-items: center;
    flex: none;
  }
  article {
    position: relative;
    width: 112px;
    min-height: 118px;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: 0.3rem;
    padding: 0.65rem;
    border: 2px solid #334155;
    border-radius: 13px;
    background: #0a1727;
    transition: 180ms ease;
  }
  article strong {
    display: grid;
    place-items: center;
    font: 1.35rem var(--mono);
  }
  article > div:not(.badges) {
    display: flex;
    justify-content: space-between;
    padding-top: 0.35rem;
    border-top: 1px solid var(--border);
    font-size: 0.68rem;
  }
  article.current {
    border-color: var(--secondary);
    box-shadow: 0 0 0 4px #9b7cff18;
    transform: translateY(-5px);
  }
  article.traversed {
    background: #2dd4bf12;
    border-color: #2dd4bf88;
  }
  article.allocated {
    border-color: var(--success);
    animation: arrive 300ms ease-out;
  }
  article.detached {
    border-style: dashed;
    border-color: var(--warning);
    transform: translateY(14px);
  }
  article.deleted {
    border-color: var(--danger);
    opacity: 0.52;
    text-decoration: line-through;
  }
  article.reconnected {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px #38bdf812;
  }
  .arrow {
    width: 58px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2rem;
    align-items: center;
    color: var(--primary);
    text-align: center;
    font: 1.1rem var(--mono);
  }
  .arrow small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .arrow.cycle {
    color: var(--warning);
  }
  .arrow.cycle::after {
    content: 'cycle ↶';
    grid-column: 1/-1;
    color: var(--warning);
    font-size: 0.56rem;
  }
  .arrow.null b {
    color: var(--muted);
    font-size: 0.72rem;
  }
  .badges {
    min-height: 14px;
    display: flex;
    gap: 0.2rem;
    flex-wrap: wrap;
  }
  .badges span {
    padding: 0.08rem 0.25rem;
    border-radius: 99px;
    background: #ffffff0d;
    color: var(--muted);
    font-size: 0.48rem;
    text-transform: uppercase;
  }
  .empty {
    margin: auto;
    display: grid;
    gap: 0.5rem;
    text-align: center;
    color: var(--muted);
  }
  .empty code {
    color: var(--primary);
    font-size: 1.1rem;
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
  .legend i.traversed {
    border-color: var(--primary);
  }
  .legend i.allocated {
    border-color: var(--success);
  }
  .legend i.detached {
    border-color: var(--warning);
  }
  .legend i.deleted {
    border-color: var(--danger);
  }
  .legend i.reconnected {
    border-color: var(--accent);
  }
  @keyframes arrive {
    from {
      opacity: 0;
      transform: scale(0.75);
    }
  }
  @media (max-width: 720px) {
    .pointer-dock {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
