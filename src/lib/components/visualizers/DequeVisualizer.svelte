<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type NodeView = {
    id: string;
    value: string | number;
    next: string | null;
    prev: string | null;
    status: string;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  let backing = $derived(String(state.backing ?? 'circular-array'));
  let isList = $derived(backing === 'linked-list');
  let slots = $derived((Array.isArray(state.slots) ? state.slots : []) as (number | null)[]);
  let size = $derived(typeof state.size === 'number' ? state.size : 0);
  let front = $derived(typeof state.front === 'number' ? state.front : 0);
  let rear = $derived(typeof state.rear === 'number' ? state.rear : 0);
  let rearSlot = $derived(slots.length > 0 ? (rear - 1 + slots.length) % slots.length : 0);
  let nodes = $derived((Array.isArray(state.nodes) ? state.nodes : []) as unknown as NodeView[]);
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

  const pointerNames = ['head', 'tail', 'newNode', 'current'] as const;
  const pointerLabels: Record<(typeof pointerNames)[number], string> = {
    head: 'front',
    tail: 'back',
    newNode: 'newNode',
    current: 'cursor'
  };

  function pointerValue(name: (typeof pointerNames)[number]) {
    const value = state[name];
    return value === null || value === undefined ? 'null' : String(value);
  }

  function slotClasses(index: number, value: number | null) {
    return [
      value !== null ? 'live' : 'spare',
      index === front && size > 0 ? 'front' : '',
      index === rearSlot && size > 0 ? 'rear' : '',
      state.readIndex === index ? 'reading' : '',
      state.writeIndex === index ? 'writing' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  function nodeClasses(node: NodeView) {
    return [
      state.head === node.id ? 'front-node' : '',
      state.tail === node.id ? 'rear-node' : '',
      node.status === 'deleted' ? 'deleted' : '',
      node.status === 'allocated' ? 'allocated' : '',
      state.current === node.id || state.newNode === node.id ? 'current' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Deque memory state">
  {#if isList}
    <div class="scalar-dock" aria-label="Pointer values">
      {#each pointerNames as name}
        <div class:active={pointerValue(name) !== 'null'}>
          <span>{pointerLabels[name]}</span><code>{pointerValue(name)}</code>
        </div>
      {/each}
      <div class="active"><span>size</span><code>{size}</code></div>
    </div>

    <div class="memory" aria-label="Deque nodes from front to back">
      {#if chain.length === 0}
        <div class="empty"><code>front → null</code><span>The deque is empty.</span></div>
      {:else}
        {#each chain as node (node.id)}
          <div class="chain-part">
            <article class={nodeClasses(node)} aria-label={`Node ${node.id}, value ${node.value}`}>
              <span class="node-id">{node.id}</span>
              <strong>{node.value}</strong>
              <div><small>prev</small><code>{node.prev ?? 'null'}</code></div>
              <div><small>next</small><code>{node.next ?? 'null'}</code></div>
              {#if state.head === node.id}<em class="badge front-badge">front</em>{/if}
              {#if state.tail === node.id}<em class="badge rear-badge">back</em>{/if}
            </article>
            <div class="arrow" aria-hidden="true">⇄</div>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <div class="scalar-dock" aria-label="Deque index values">
      <div class="active"><span>front index</span><code>{front}</code></div>
      <div class="active"><span>rear index</span><code>{rear}</code></div>
      <div class="active"><span>size</span><code>{size}</code></div>
      <div class="active"><span>capacity</span><code>{String(state.capacity)}</code></div>
      <div class="active"><span>indexing</span><code>mod capacity</code></div>
    </div>

    <div class="buffer-block">
      <p><b>Circular buffer</b> · both ends move modulo capacity, so neither end ever shifts.</p>
      <div class="buffer" aria-label="Deque buffer slots">
        {#if slots.length === 0}
          <div class="empty">The buffer has zero capacity.</div>
        {:else}
          {#each slots as value, index}
            <div class="slot {slotClasses(index, value)}">
              <small>{index}</small>
              <b>{value === null ? '·' : value}</b>
              <span class="pointer-tags">
                {#if index === front && size > 0}<i class="front-tag">F</i>{/if}
                {#if index === rearSlot && size > 0}<i class="rear-tag">B</i>{/if}
              </span>
              <span class="marks">
                {#if state.readIndex === index}<i class="r">R</i>{/if}
                {#if state.writeIndex === index}<i class="w">W</i>{/if}
              </span>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <div class="legend" aria-label="State legend">
    <span><i class="l-front"></i>Front</span><span><i class="l-rear"></i>Back</span>
    <span><i class="l-spare"></i>Free slot</span><span
      ><i class="l-rw"></i>Read / write this line</span
    >
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
  .buffer-block p {
    margin: 0 0 0.4rem;
    color: var(--muted);
    font-size: 0.68rem;
  }
  .buffer-block p b {
    color: var(--text);
  }
  .buffer {
    display: flex;
    gap: 0.35rem;
    overflow-x: auto;
    padding: 0.6rem 0 0.2rem;
  }
  .slot {
    position: relative;
    flex: 1;
    min-width: 58px;
    display: grid;
    gap: 0.15rem;
    justify-items: center;
    padding: 0.55rem 0.3rem 0.4rem;
    border: 2px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    transition: 160ms ease;
  }
  .slot small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .slot b {
    font: 1.15rem var(--mono);
  }
  .slot.live {
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
    background: color-mix(in srgb, var(--primary) 4%, transparent);
  }
  .slot.spare {
    border-style: dashed;
    opacity: 0.65;
  }
  .slot.front {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent);
  }
  .slot.rear {
    border-color: var(--secondary);
  }
  .slot.front.rear {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent),
      0 0 0 6px color-mix(in srgb, var(--secondary) 8%, transparent);
  }
  .slot.reading {
    border-color: var(--warning);
    transform: translateY(-4px);
  }
  .slot.writing {
    border-color: var(--success);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 9%, transparent);
    transform: translateY(-4px);
  }
  .pointer-tags {
    display: flex;
    gap: 0.2rem;
    min-height: 14px;
  }
  .pointer-tags i {
    display: grid;
    place-items: center;
    width: 15px;
    height: 15px;
    border-radius: 4px;
    font: 0.52rem var(--mono);
    font-style: normal;
  }
  .pointer-tags .front-tag {
    background: var(--primary);
    color: var(--primary-contrast);
  }
  .pointer-tags .rear-tag {
    background: var(--secondary);
    color: var(--raised);
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
    min-height: 170px;
    padding: 0.8rem 0.25rem;
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
    display: grid;
    gap: 0.25rem;
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
    padding-top: 0.25rem;
    border-top: 1px solid var(--border);
    font-size: 0.64rem;
  }
  article.front-node {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent);
  }
  article.rear-node {
    border-color: var(--secondary);
  }
  article.current {
    transform: translateY(-4px);
    border-color: var(--warning);
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
    padding: 0.05rem 0.4rem;
    border-radius: 99px;
    font-size: 0.55rem;
    font-style: normal;
  }
  article .front-badge {
    left: 8px;
    background: var(--primary);
    color: var(--primary-contrast);
  }
  article .rear-badge {
    right: 8px;
    background: var(--secondary);
    color: var(--raised);
  }
  .arrow {
    width: 40px;
    display: grid;
    justify-items: center;
    color: var(--primary);
    font: 1.1rem var(--mono);
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
  .legend i.l-front {
    border-color: var(--primary);
  }
  .legend i.l-rear {
    border-color: var(--secondary);
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
