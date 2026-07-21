<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type NodeView = {
    id: string;
    value: string | number;
    next: string | null;
    status: string;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  let backing = $derived(String(state.backing ?? 'naive-array'));
  let isList = $derived(backing === 'linked-list');
  let slots = $derived((Array.isArray(state.array) ? state.array : []) as (number | null)[]);
  let size = $derived(typeof state.size === 'number' ? state.size : 0);
  let headIndex = $derived(typeof state.headIndex === 'number' ? state.headIndex : 0);
  let tailIndex = $derived(typeof state.tailIndex === 'number' ? state.tailIndex : 0);
  let shifted = $derived(new Set((state.shifted as number[] | undefined) ?? []));
  let nodes = $derived((Array.isArray(state.nodes) ? state.nodes : []) as unknown as NodeView[]);
  let rearSlot = $derived(slots.length > 0 ? (tailIndex - 1 + slots.length) % slots.length : 0);
  let chain = $derived.by(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const ordered: NodeView[] = [];
    let cursor = typeof state.headId === 'string' ? state.headId : null;
    const guard = new Set<string>();
    while (cursor && byId.has(cursor) && !guard.has(cursor)) {
      guard.add(cursor);
      ordered.push(byId.get(cursor)!);
      cursor = byId.get(cursor)!.next;
    }
    for (const node of nodes) if (!guard.has(node.id)) ordered.push(node);
    return ordered;
  });

  const pointerNames = ['headId', 'tailId', 'current'] as const;
  const pointerLabels: Record<(typeof pointerNames)[number], string> = {
    headId: 'front',
    tailId: 'rear',
    current: 'cursor'
  };

  function pointerValue(name: (typeof pointerNames)[number]) {
    const value = state[name];
    return value === null || value === undefined ? 'null' : String(value);
  }

  function slotClasses(index: number, value: number | null) {
    return [
      value !== null ? 'live' : 'spare',
      index === headIndex && size > 0 ? 'front' : '',
      index === rearSlot && size > 0 ? 'rear' : '',
      shifted.has(index) ? 'shifted' : '',
      state.readIndex === index ? 'reading' : '',
      state.writeIndex === index ? 'writing' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }

  function nodeClasses(node: NodeView) {
    return [
      state.headId === node.id ? 'front-node' : '',
      state.tailId === node.id ? 'rear-node' : '',
      node.status === 'deleted' ? 'deleted' : '',
      node.status === 'allocated' ? 'allocated' : '',
      state.current === node.id ? 'current' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }
</script>

<section class="visualizer panel" aria-label="Queue memory state">
  {#if isList}
    <div class="scalar-dock" aria-label="Pointer values">
      {#each pointerNames as name}
        <div class:active={pointerValue(name) !== 'null'}>
          <span>{pointerLabels[name]}</span><code>{pointerValue(name)}</code>
        </div>
      {/each}
      <div class="active"><span>size</span><code>{size}</code></div>
    </div>

    <div class="memory" aria-label="Queue nodes from front to rear">
      {#if chain.length === 0}
        <div class="empty"><code>front → null</code><span>The queue is empty.</span></div>
      {:else}
        {#each chain as node (node.id)}
          <div class="chain-part">
            <article class={nodeClasses(node)} aria-label={`Node ${node.id}, value ${node.value}`}>
              <span class="node-id">{node.id}</span>
              <strong>{node.value}</strong>
              <div><small>next</small><code>{node.next ?? 'null'}</code></div>
              {#if state.headId === node.id}<em class="badge front-badge">front</em>{/if}
              {#if state.tailId === node.id}<em class="badge rear-badge">rear</em>{/if}
            </article>
            <div class="arrow" aria-hidden="true">→ <small>{node.next ?? 'null'}</small></div>
          </div>
        {/each}
      {/if}
    </div>
  {:else}
    <div class="scalar-dock" aria-label="Queue index values">
      <div class="active"><span>front index</span><code>{headIndex}</code></div>
      <div class="active"><span>rear index</span><code>{tailIndex}</code></div>
      <div class="active"><span>size</span><code>{size}</code></div>
      <div class="active"><span>capacity</span><code>{String(state.capacity)}</code></div>
      <div class:active={backing === 'circular-array'}>
        <span>indexing</span><code>{backing === 'circular-array' ? 'mod capacity' : 'linear'}</code>
      </div>
    </div>

    <div class="buffer-block">
      <p>
        <b>Buffer</b> · {backing === 'circular-array'
          ? 'front and rear wrap around modulo capacity'
          : 'front stays at index 0; dequeue shifts every survivor left'}
      </p>
      <div class="buffer" aria-label="Queue buffer slots">
        {#if slots.length === 0}
          <div class="empty">The buffer has zero capacity.</div>
        {:else}
          {#each slots as value, index}
            <div class="slot {slotClasses(index, value)}">
              <small>{index}</small>
              <b>{value === null ? '·' : value}</b>
              <span class="pointer-tags">
                {#if index === headIndex && size > 0}<i class="front-tag">F</i>{/if}
                {#if index === rearSlot && size > 0}<i class="rear-tag">R</i>{/if}
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
    <span><i class="l-front"></i>Front</span><span><i class="l-rear"></i>Rear</span>
    <span><i class="l-shifted"></i>Shifted</span><span><i class="l-spare"></i>Free slot</span>
    <span><i class="l-rw"></i>Read / write this line</span>
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
  .slot.shifted {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 7%, transparent);
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
    min-height: 150px;
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
  .legend i.l-front {
    border-color: var(--primary);
  }
  .legend i.l-rear {
    border-color: var(--secondary);
  }
  .legend i.l-shifted {
    border-color: var(--accent);
  }
  .legend i.l-spare {
    border-color: var(--border);
    border-style: dashed;
  }
  .legend i.l-rw {
    border-color: var(--success);
  }
  @media (max-width: 720px) {
    .scalar-dock {
      grid-template-columns: repeat(3, 1fr);
    }
  }
</style>
