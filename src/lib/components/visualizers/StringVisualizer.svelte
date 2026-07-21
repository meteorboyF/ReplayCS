<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';
  let { state }: { state: Record<string, TraceValue> } = $props();
  let source = $derived(state.source as string[]);
  let secondary = $derived(state.secondary as string[]);
  let activeIndex = $derived(state.activeIndex as number | null);
</script>

<section class="panel visual" aria-label="String memory visualization">
  <div class="heading">
    <span class="eyebrow">Character memory</span><span>{source.length} source cells</span>
  </div>
  <div class="string-row">
    <strong>Source</strong>
    <div class="cells">
      {#each source as character, index}<div class:active={index === activeIndex}>
          <small>{index}</small><b>{character}</b>
        </div>{/each}
    </div>
  </div>
  {#if secondary.length}
    <div class="string-row secondary">
      <strong>Second / target</strong>
      <div class="cells">
        {#each secondary as character, index}<div class:compared={index === state.compareIndex}>
            <small>{index}</small><b>{character}</b>
          </div>{/each}
      </div>
    </div>
  {/if}
  <div class="result panel">
    <span>Intermediate result</span><b>{state.result || '∅'}</b>
    <dl>
      <div>
        <dt>Allocations</dt>
        <dd>{state.allocations}</dd>
      </div>
      <div>
        <dt>Character copies</dt>
        <dd>{state.copies}</dd>
      </div>
      <div>
        <dt>Builder capacity</dt>
        <dd>{state.builderCapacity || '—'}</dd>
      </div>
      <div>
        <dt>Found index</dt>
        <dd>{state.foundIndex === -1 ? 'not found' : state.foundIndex}</dd>
      </div>
    </dl>
  </div>
</section>

<style>
  .visual {
    min-height: 330px;
    padding: 1.1rem;
    display: grid;
    gap: 1rem;
    align-content: center;
    overflow: hidden;
  }
  .heading,
  .string-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .heading {
    color: var(--muted);
    font-size: 0.78rem;
  }
  .string-row > strong {
    flex: 0 0 7.5rem;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .cells {
    display: flex;
    flex: 1;
    min-width: 0;
    justify-content: center;
    gap: 0.35rem;
  }
  .cells div {
    min-width: 2.2rem;
    padding: 0.45rem 0.25rem;
    text-align: center;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--raised);
    transition: 0.2s ease;
  }
  .cells div.active,
  .cells div.compared {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 14%, var(--raised));
    transform: translateY(-4px);
  }
  small {
    display: block;
    color: var(--muted);
    font-size: 0.62rem;
  }
  .cells b {
    font-family: var(--mono);
  }
  .result {
    padding: 0.9rem;
    background: color-mix(in srgb, var(--primary) 4%, var(--raised));
  }
  .result > span {
    color: var(--muted);
    font-size: 0.72rem;
  }
  .result > b {
    display: block;
    margin: 0.25rem 0 0.75rem;
    font-family: var(--mono);
    overflow-wrap: anywhere;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.45rem;
    margin: 0;
  }
  dl div {
    min-width: 0;
  }
  dt {
    color: var(--muted);
    font-size: 0.65rem;
  }
  dd {
    margin: 0.15rem 0 0;
    font-family: var(--mono);
    font-weight: 700;
  }
  @media (max-width: 620px) {
    .string-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.4rem;
    }
    .string-row > strong {
      flex-basis: auto;
    }
    .cells {
      width: 100%;
      justify-content: flex-start;
      overflow-x: auto;
      padding-bottom: 0.35rem;
    }
    .cells div {
      min-width: 2rem;
    }
    dl {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
