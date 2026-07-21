<script lang="ts">
  import type { TraceStep, TraceValue } from '$lib/trace/types';

  let { step, revealed = true }: { step: TraceStep; revealed?: boolean } = $props();

  const metrics = [
    ['comparison', 'comparisons'],
    ['read', 'reads'],
    ['write', 'writes'],
    ['pointer-read', 'pointer reads'],
    ['pointer-write', 'pointer writes'],
    ['swap', 'swaps'],
    ['allocation', 'allocations'],
    ['deallocation', 'deallocations'],
    ['node-inspection', 'node visits'],
    ['loop-iteration', 'iterations'],
    ['call', 'calls'],
    ['return', 'returns']
  ] as const;

  let evidence = $derived(step.complexityEvidence);
  let before = $derived(step.stateBefore);
  let after = $derived(step.stateAfter);

  function display(value: TraceValue | undefined) {
    if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
    if (value && typeof value === 'object') return JSON.stringify(value);
    return value === null || value === undefined || value === '' ? 'null' : String(value);
  }

  function stateRows(state: Record<string, TraceValue>) {
    return [
      'size',
      'capacity',
      'oldCapacity',
      'i',
      'readIndex',
      'writeIndex',
      'appendsCompleted',
      'totalElementCopies',
      'head',
      'tail',
      'current',
      'previous',
      'next',
      'newNode',
      'slow',
      'fast',
      'recursiveDepth',
      'result',
      'resultIndex'
    ]
      .map((key) => [key, state[key]] as const)
      .filter(([, value]) => value !== undefined);
  }

  function arraySlots(value: TraceValue[] | undefined) {
    return value
      ?.map((slot, index) => `[${index}]=${slot === null ? '·' : display(slot)}`)
      .join(' · ');
  }

  function structureRows(state: Record<string, TraceValue>) {
    const rows: Array<[string, string]> = [];
    if (Array.isArray(state.nodes)) {
      rows.push([
        'nodes',
        (state.nodes as Array<Record<string, TraceValue>>)
          .map(
            (node) =>
              `${String(node.id)}(${String(node.value)})→${node.next === null ? 'null' : String(node.next)}`
          )
          .join(' · ')
      ]);
    }
    if (Array.isArray(state.slots)) rows.push(['slots', arraySlots(state.slots) ?? '—']);
    if (Array.isArray(state.oldSlots)) rows.push(['old buffer', arraySlots(state.oldSlots) ?? '—']);
    if (Array.isArray(state.copySlots))
      rows.push(['copy buffer', arraySlots(state.copySlots) ?? '—']);
    return rows;
  }
</script>

<section class="evidence panel" aria-label="Execution evidence">
  <div class="topline">
    <div>
      <span class="eyebrow">Exact work through this line</span>
      <strong>{revealed ? (evidence?.cumulativeOperationCount ?? 0) : '?'}</strong>
      <small
        >{revealed ? `+${evidence?.exactOperationCount ?? 0} on this line` : 'line hidden'}</small
      >
    </div>
    <div class="bounds">
      <span><b>{evidence?.timeComplexity ?? '—'}</b> time</span>
      <span><b>{evidence?.auxiliarySpace ?? '—'}</b> auxiliary space</span>
      <span
        ><b>{evidence?.space.output.peak ?? 0}</b> peak {evidence?.space.output.unit ??
          'output'}</span
      >
    </div>
  </div>

  <div class="counts" aria-label="Cumulative operation counts">
    {#each metrics as [metric, label]}
      {@const value = evidence?.cumulativeWork[metric] ?? 0}
      <div class:nonzero={value > 0}><b>{revealed ? value : '·'}</b><span>{label}</span></div>
    {/each}
  </div>

  <div class="transition">
    <div>
      <span>Variables before line</span>
      {#each stateRows(before) as [name, value]}
        <p><code>{name}</code><b>{display(value)}</b></p>
      {/each}
      {#each structureRows(before) as [name, value]}
        <p class="structure"><code>{name}</code><b>{value}</b></p>
      {/each}
    </div>
    <div class="execute" aria-hidden="true"><i></i><span>execute</span><i></i></div>
    <div class:masked={!revealed}>
      <span>Variables after line</span>
      {#each stateRows(after) as [name, value]}
        <p><code>{name}</code><b>{revealed ? display(value) : '?'}</b></p>
      {/each}
      {#each structureRows(after) as [name, value]}
        <p class="structure"><code>{name}</code><b>{revealed ? value : '?'}</b></p>
      {/each}
    </div>
  </div>

  <div class="mutations">
    <span>Reads, writes, and state changes on this line</span>
    {#if revealed && step.mutations.length}
      {#each step.mutations as mutation}
        <p>
          <code>{mutation.entityId}.{mutation.property}</code>
          <span>{display(mutation.previousValue)} → <b>{display(mutation.nextValue)}</b></span>
          <em>{mutation.animation ?? 'update'}</em>
        </p>
      {/each}
    {:else if revealed}
      <p class="quiet">No state write; this line performs control flow or a read.</p>
    {:else}
      <p class="quiet">Lock the prediction to reveal this transition.</p>
    {/if}
  </div>
</section>

<style>
  .evidence {
    padding: 0.9rem;
  }
  .topline,
  .bounds,
  .transition,
  .mutations p {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.65rem;
  }
  .topline > div:first-child {
    display: grid;
  }
  .topline strong {
    color: var(--primary);
    font: 1.55rem var(--mono);
  }
  .topline small {
    color: var(--muted);
    font-size: 0.58rem;
  }
  .bounds span {
    display: grid;
    min-width: 100px;
    padding: 0.42rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--muted);
    font-size: 0.6rem;
  }
  .bounds b {
    color: var(--secondary);
    font-size: 0.82rem;
  }
  .counts {
    display: grid;
    grid-template-columns: repeat(12, minmax(52px, 1fr));
    gap: 0.25rem;
    margin: 0.8rem 0;
  }
  .counts div {
    display: grid;
    gap: 0.15rem;
    min-height: 48px;
    place-content: center;
    padding: 0.3rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    text-align: center;
    color: var(--muted);
  }
  .counts div.nonzero {
    color: var(--text);
    border-color: color-mix(in srgb, var(--primary) 33%, transparent);
    background: color-mix(in srgb, var(--primary) 3%, transparent);
  }
  .counts b {
    font: 0.8rem var(--mono);
  }
  .counts span {
    font-size: 0.5rem;
    line-height: 1.1;
  }
  .transition {
    align-items: stretch;
    padding: 0.8rem 0;
    border-block: 1px solid var(--border);
  }
  .transition > div:not(.execute) {
    flex: 1;
    display: grid;
    align-content: start;
    gap: 0.3rem;
    padding: 0.6rem;
    border-radius: 9px;
    background: var(--bg);
  }
  .transition > div > span,
  .mutations > span {
    color: var(--muted);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .transition p {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0;
    font-size: 0.7rem;
  }
  .transition p b {
    color: var(--primary);
    font-family: var(--mono);
  }
  .transition p.structure {
    display: grid;
    margin-top: 0.3rem;
    padding-top: 0.35rem;
    border-top: 1px solid var(--border);
  }
  .transition p.structure b {
    overflow-wrap: anywhere;
    font-size: 0.58rem;
    line-height: 1.45;
  }
  .execute {
    align-self: center;
    display: grid;
    place-items: center;
    color: var(--secondary);
    font-size: 0.56rem;
    text-transform: uppercase;
  }
  .execute i {
    height: 15px;
    border-left: 1px solid var(--secondary);
  }
  .masked {
    filter: blur(3px);
    user-select: none;
  }
  .mutations {
    padding-top: 0.8rem;
  }
  .mutations p {
    margin: 0.4rem 0 0;
    padding: 0.45rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 0.68rem;
  }
  .mutations p span {
    flex: 1;
    text-align: right;
  }
  .mutations p b {
    color: var(--primary);
  }
  .mutations em {
    color: var(--muted);
    font-size: 0.56rem;
  }
  .mutations p.quiet {
    justify-content: start;
    color: var(--muted);
  }
  @media (max-width: 900px) {
    .counts {
      grid-template-columns: repeat(6, 1fr);
    }
  }
  @media (max-width: 560px) {
    .topline,
    .transition {
      flex-direction: column;
    }
    .bounds {
      width: 100%;
    }
    .bounds span {
      flex: 1;
    }
    .execute {
      display: none;
    }
    .counts {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
