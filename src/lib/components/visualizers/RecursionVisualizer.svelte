<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';
  let { state }: { state: Record<string, TraceValue> } = $props();
  let frames = $derived(
    state.frames as {
      id: number;
      n: number;
      depth: number;
      status: string;
      returnValue: number | null;
    }[]
  );
  let widths = $derived(state.levelWidths as Record<string, number>);
</script>

<section class="panel visual" aria-label="Recursion call stack visualization">
  <div class="heading">
    <span class="eyebrow">Runtime call stack</span><strong>{state.phase}</strong>
  </div>
  <div class="body">
    <div class="stack" aria-label="Call stack">
      {#if frames.length === 0}<p class="empty">Stack is empty after the final return.</p>{/if}
      {#each [...frames].reverse() as frame}
        <article class:active={frame.id === state.currentFrame}>
          <span>depth {frame.depth}</span><b>f({frame.n})</b><small>{frame.status}</small>
        </article>
      {/each}
    </div>
    <div class="tree">
      <span class="eyebrow">Recursion levels</span>
      {#each Object.entries(widths) as [level, width]}
        <div>
          <small>L{Number(level) - 1}</small><i style={`--width:${Math.min(100, width * 12)}%`}
          ></i><b>{width} call{width === 1 ? '' : 's'}</b>
        </div>
      {/each}
    </div>
  </div>
  <div class="recurrence"><span>Execution recurrence</span><b>{state.recurrence}</b></div>
  <dl>
    <div>
      <dt>Total calls</dt>
      <dd>{state.calls}</dd>
    </div>
    <div>
      <dt>Completed</dt>
      <dd>{state.completed}</dd>
    </div>
    <div>
      <dt>Maximum depth</dt>
      <dd>{state.maxDepth}</dd>
    </div>
    <div>
      <dt>Repeated subproblems</dt>
      <dd>{state.repeatedSubproblems}</dd>
    </div>
    <div>
      <dt>Total work</dt>
      <dd>{state.totalWork}</dd>
    </div>
    <div>
      <dt>Latest return</dt>
      <dd>{state.returnValue ?? '—'}</dd>
    </div>
  </dl>
</section>

<style>
  .visual {
    min-height: 360px;
    padding: 1rem;
    display: grid;
    gap: 0.85rem;
    overflow: hidden;
  }
  .heading,
  .recurrence {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .heading strong {
    color: var(--primary);
    text-transform: capitalize;
  }
  .body {
    display: grid;
    grid-template-columns: minmax(10rem, 0.8fr) 1.2fr;
    gap: 0.8rem;
    min-width: 0;
  }
  .stack {
    min-height: 150px;
    display: flex;
    flex-direction: column;
    justify-content: end;
    gap: 0.3rem;
  }
  .stack article {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.45rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--raised);
  }
  .stack article.active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 12%, var(--raised));
  }
  article span,
  article small {
    color: var(--muted);
    font-size: 0.65rem;
  }
  article small {
    text-align: right;
  }
  .empty {
    color: var(--muted);
    text-align: center;
  }
  .tree {
    display: grid;
    align-content: center;
    gap: 0.4rem;
    min-width: 0;
  }
  .tree div {
    display: grid;
    grid-template-columns: 2rem 1fr 3.8rem;
    gap: 0.35rem;
    align-items: center;
  }
  .tree i {
    display: block;
    width: var(--width);
    max-width: 100%;
    height: 0.65rem;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--primary), var(--accent));
  }
  .tree small,
  .tree b {
    font-size: 0.65rem;
  }
  .recurrence {
    padding: 0.65rem 0.75rem;
    border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
    border-radius: 9px;
    background: color-mix(in srgb, var(--primary) 5%, var(--raised));
  }
  .recurrence span {
    color: var(--muted);
    font-size: 0.7rem;
  }
  .recurrence b {
    font-family: var(--mono);
  }
  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.45rem;
    margin: 0;
  }
  dl div {
    padding: 0.45rem;
    background: var(--raised);
    border-radius: 7px;
  }
  dt {
    color: var(--muted);
    font-size: 0.62rem;
  }
  dd {
    margin: 0.15rem 0 0;
    font-family: var(--mono);
    font-weight: 700;
  }
  @media (max-width: 620px) {
    .body {
      grid-template-columns: 1fr;
    }
    dl {
      grid-template-columns: repeat(2, 1fr);
    }
    .recurrence {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
