<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type NodeView = {
    id: string;
    value: string | number;
    next: string | null;
    status: string;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  let backing = $derived(String(state.backing ?? 'array'));
  let isArray = $derived(backing === 'array' || backing === 'dynamic-array');
  let slots = $derived((Array.isArray(state.slots) ? state.slots : []) as (number | null)[]);
  let oldSlots = $derived(
    Array.isArray(state.oldSlots) ? (state.oldSlots as (number | null)[]) : null
  );
  let size = $derived(typeof state.size === 'number' ? state.size : 0);
  let nodes = $derived((Array.isArray(state.nodes) ? state.nodes : []) as unknown as NodeView[]);
  let deleted = $derived(new Set((state.deleted as string[] | undefined) ?? []));
  let allocated = $derived(new Set((state.allocated as string[] | undefined) ?? []));
  // Render top-of-stack first: highest occupied index down to slot 0.
  let slotViews = $derived(slots.map((value, index) => ({ value, index })).reverse());
  let chain = $derived.by(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const ordered: NodeView[] = [];
    let cursor = typeof state.head === 'string' ? state.head : null;
    const guard = new Set<string>();
    while (cursor && byId.has(cursor) && !guard.has(cursor)) {
      guard.add(cursor);
      ordered.push(byId.get(cursor)!);
      cursor = byId.get(cursor)!.next;
    }
    for (const node of nodes) if (!guard.has(node.id)) ordered.push(node);
    return ordered;
  });

  const pointerNames = ['head', 'newNode', 'current'] as const;

  function pointerValue(name: (typeof pointerNames)[number]) {
    const value = state[name];
    return value === null || value === undefined ? 'null' : String(value);
  }

  function slotClasses(index: number, value: number | null) {
    return [
      index < size && value !== null ? 'live' : 'spare',
      index === size - 1 && size > 0 ? 'top' : '',
      state.readIndex === index ? 'reading' : '',
      state.writeIndex === index ? 'writing' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  function nodeClasses(node: NodeView) {
    return [
      state.head === node.id ? 'top' : '',
      deleted.has(node.id) || node.status === 'deleted' ? 'deleted' : '',
      allocated.has(node.id) && node.status === 'allocated' ? 'allocated' : '',
      state.current === node.id ? 'current' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Stack memory state">
  {#if isArray}
    <div class="scalar-dock" aria-label="Stack bookkeeping values">
      <div class:active={size > 0}>
        <span>top index</span><code>{size > 0 ? size - 1 : '—'}</code>
      </div>
      <div class="active"><span>size</span><code>{size}</code></div>
      <div class="active"><span>capacity</span><code>{String(state.capacity)}</code></div>
      <div class:active={state.readIndex !== null}>
        <span>readIndex</span><code
          >{state.readIndex === null ? 'null' : String(state.readIndex)}</code
        >
      </div>
      <div class:active={state.writeIndex !== null}>
        <span>writeIndex</span><code
          >{state.writeIndex === null ? 'null' : String(state.writeIndex)}</code
        >
      </div>
    </div>

    <div class="towers">
      {#if oldSlots}
        <div class="tower old">
          <p><b>Old buffer</b> · being copied out</p>
          {#each [...oldSlots].reverse() as value, viewIndex}
            <div class="slot {oldSlots.length - 1 - viewIndex < size ? 'live' : 'spare'}">
              <small>{oldSlots.length - 1 - viewIndex}</small><b>{value === null ? '·' : value}</b>
            </div>
          {/each}
        </div>
      {/if}
      <div class="tower" aria-label="Stack slots from top to bottom">
        <p><b>{oldSlots ? 'New buffer' : 'Buffer'}</b> · pushes and pops happen at the top</p>
        {#if slots.length === 0}
          <div class="empty">The stack has zero capacity.</div>
        {:else}
          {#each slotViews as view (view.index)}
            <div class="slot {slotClasses(view.index, view.value)}">
              <small>{view.index}</small>
              <b>{view.value === null ? '·' : view.value}</b>
              {#if view.index === size - 1 && size > 0}<em>← top</em>{/if}
              <span class="marks">
                {#if state.readIndex === view.index}<i class="r">R</i>{/if}
                {#if state.writeIndex === view.index}<i class="w">W</i>{/if}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {:else}
    <div class="scalar-dock" aria-label="Pointer values">
      {#each pointerNames as name}
        <div class:active={pointerValue(name) !== 'null'}>
          <span>{name}</span><code>{pointerValue(name)}</code>
        </div>
      {/each}
      <div class="active"><span>size</span><code>{size}</code></div>
    </div>

    <div class="memory" aria-label="Stack nodes from top to bottom">
      {#if chain.length === 0}
        <div class="empty"><code>head → null</code><span>The stack is empty.</span></div>
      {:else}
        {#each chain as node (node.id)}
          <div class="chain-part">
            <article class={nodeClasses(node)} aria-label={`Node ${node.id}, value ${node.value}`}>
              <span class="node-id">{node.id}</span>
              <strong>{node.value}</strong>
              <div><small>next</small><code>{node.next ?? 'null'}</code></div>
              {#if state.head === node.id}<em class="badge">top</em>{/if}
            </article>
            <div class="arrow" aria-hidden="true">→ <small>{node.next ?? 'null'}</small></div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <div class="legend" aria-label="State legend">
    <span><i class="l-top"></i>Top</span><span><i class="l-live"></i>In stack</span>
    <span><i class="l-spare"></i>Spare</span><span><i class="l-rw"></i>Read / write this line</span>
    <span><i class="l-deleted"></i>Deleted</span>
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
    grid-template-columns: repeat(5, minmax(70px, 1fr));
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
  .scalar-dock span,
  .node-id {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .scalar-dock code {
    color: var(--primary);
    font-size: 0.78rem;
  }
  .towers {
    display: flex;
    gap: 1.2rem;
    justify-content: center;
  }
  .tower {
    display: grid;
    gap: 0.3rem;
    min-width: 150px;
  }
  .tower p {
    margin: 0 0 0.2rem;
    color: var(--muted);
    font-size: 0.66rem;
    text-align: center;
  }
  .tower p b {
    color: var(--text);
  }
  .tower.old p b {
    color: var(--warning);
  }
  .tower.old .slot {
    opacity: 0.6;
  }
  .slot {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.4rem 0.7rem;
    border: 2px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    transition: 160ms ease;
  }
  .slot small {
    color: var(--muted);
    font-size: 0.6rem;
  }
  .slot b {
    text-align: center;
    font: 1.05rem var(--mono);
  }
  .slot em {
    color: var(--primary);
    font-size: 0.6rem;
    font-style: normal;
  }
  .slot.live {
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
    background: color-mix(in srgb, var(--primary) 4%, transparent);
  }
  .slot.spare {
    border-style: dashed;
    opacity: 0.6;
  }
  .slot.top {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent);
  }
  .slot.reading {
    border-color: var(--warning);
    transform: translateX(4px);
  }
  .slot.writing {
    border-color: var(--success);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 9%, transparent);
    transform: translateX(4px);
  }
  .marks {
    position: absolute;
    top: -9px;
    right: -4px;
    display: flex;
    gap: 0.15rem;
  }
  .marks i {
    display: grid;
    place-items: center;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    font: 0.55rem var(--mono);
    font-style: normal;
  }
  .marks i.r {
    background: var(--warning);
    color: #241a02;
  }
  .marks i.w {
    background: var(--success);
    color: #04230d;
  }
  .memory {
    display: flex;
    align-items: center;
    min-height: 150px;
    padding: 0.6rem 0.25rem;
    overflow-x: auto;
  }
  .chain-part {
    display: flex;
    align-items: center;
    flex: none;
  }
  article {
    position: relative;
    width: 106px;
    display: grid;
    gap: 0.3rem;
    padding: 0.6rem;
    border: 2px solid var(--border);
    border-radius: 13px;
    background: var(--surface);
    transition: 160ms ease;
  }
  article strong {
    display: grid;
    place-items: center;
    font: 1.25rem var(--mono);
  }
  article > div {
    display: flex;
    justify-content: space-between;
    padding-top: 0.3rem;
    border-top: 1px solid var(--border);
    font-size: 0.66rem;
  }
  article.top {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent);
  }
  article.current {
    border-color: var(--secondary);
    transform: translateY(-4px);
  }
  article.allocated {
    border-color: var(--success);
  }
  article.deleted {
    border-color: var(--danger);
    opacity: 0.5;
    text-decoration: line-through;
  }
  article .badge {
    position: absolute;
    top: -9px;
    left: 8px;
    padding: 0.05rem 0.4rem;
    border-radius: 99px;
    background: var(--primary);
    color: var(--primary-contrast);
    font-size: 0.55rem;
    font-style: normal;
  }
  .arrow {
    width: 52px;
    display: grid;
    justify-items: center;
    color: var(--primary);
    font: 1rem var(--mono);
  }
  .arrow small {
    color: var(--muted);
    font-size: 0.55rem;
  }
  .empty {
    margin: auto;
    display: grid;
    gap: 0.4rem;
    text-align: center;
    color: var(--muted);
    padding: 0.8rem;
  }
  .empty code {
    color: var(--primary);
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
  .legend i.l-top {
    border-color: var(--primary);
  }
  .legend i.l-live {
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
  }
  .legend i.l-spare {
    border-color: var(--border);
    border-style: dashed;
  }
  .legend i.l-rw {
    border-color: var(--success);
  }
  .legend i.l-deleted {
    border-color: var(--danger);
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
