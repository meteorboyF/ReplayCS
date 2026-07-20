<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type ElementView = {
    id: string;
    value: string | number;
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  const pointerNames = ['top', 'current'] as const;
  let elements = $derived((Array.isArray(state.elements) ? state.elements : []) as unknown as ElementView[]);

  function pointerValue(name: (typeof pointerNames)[number]) {
    const value = state[name];
    return typeof value === 'string'
      ? value
      : value === null || value === undefined
        ? 'null'
        : String(value);
  }
</script>

<section class="visualizer panel" aria-label="Stack memory state">
  <div class="pointer-dock" aria-label="Pointer and reference values">
    {#each pointerNames as name}
      <div class:active={pointerValue(name) !== 'null'}>
        <span>{name}</span><code>{pointerValue(name)}</code>
      </div>
    {/each}
  </div>

  <div class="memory" aria-label="Stack elements">
    {#if elements.length === 0}
      <div class="empty"><code>top → null</code><span>The stack is empty.</span></div>
    {:else}
      <div class="stack-container">
        {#each elements as element}
          <article aria-label={`Element ${element.id}, value ${element.value}`}>
            <span class="element-id">{element.id}</span>
            <strong>{element.value}</strong>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .visualizer {
    padding: 1rem;
    overflow: hidden;
  }
  .pointer-dock {
    display: grid;
    grid-template-columns: repeat(4, minmax(68px, 1fr));
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
  .pointer-dock span, .element-id {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .pointer-dock code {
    color: var(--primary);
    font-size: 0.78rem;
  }
  .memory {
    display: flex;
    justify-content: center;
    align-items: end;
    min-height: 210px;
    padding: 1.25rem 0.25rem;
    overflow-x: auto;
  }
  .stack-container {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.5rem;
  }
  article {
    position: relative;
    width: 112px;
    min-height: 50px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem;
    border: 2px solid #334155;
    border-radius: 8px;
    background: #0a1727;
    transition: 180ms ease;
  }
  article strong {
    font: 1.35rem var(--mono);
    text-align: right;
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
</style>
