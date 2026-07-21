<script lang="ts">
  import type { SupportedLanguage, TraceValue } from '$lib/trace/types';
  import ArrayVisualizer from './DynamicArrayVisualizer.svelte';
  import LinkedListVisualizer from './LinkedListVisualizer.svelte';

  let {
    state,
    language,
    activeSemantic
  }: {
    state: Record<string, TraceValue>;
    language?: SupportedLanguage;
    activeSemantic?: string;
  } = $props();

  const pointerNames = ['front', 'rear', 'current', 'result'] as const;

  // Extract elements from the trace state for the abstract deque view.
  type ElementView = { id: string; value: string | number };
  let elements = $derived.by(() => {
    const list: ElementView[] = [];
    if (state.backing === 'circular-array') {
      const slots = (Array.isArray(state.slots) ? state.slots : []) as (number | null)[];
      const size = typeof state.size === 'number' ? state.size : 0;
      const frontIndex = typeof state.frontIndex === 'number' ? state.frontIndex : 0;
      const capacity = typeof state.capacity === 'number' ? state.capacity : slots.length;
      if (capacity > 0) {
        for (let i = 0; i < size; i++) {
          const idx = (frontIndex + i) % capacity;
          if (slots[idx] !== null) {
            list.push({ id: `slot-${idx}`, value: slots[idx]! });
          }
        }
      }
    } else {
      const nodes = (Array.isArray(state.nodes) ? state.nodes : []) as any[];
      let currentId = typeof state.front === 'string' ? state.front : null;
      let safeLimit = 100;
      while (currentId && safeLimit-- > 0) {
        const node = nodes.find(n => n.id === currentId);
        if (!node || node.status === 'deleted') break;
        list.push({ id: node.id, value: node.value });
        currentId = node.next;
      }
    }
    return list;
  });

  function pointerValue(name: (typeof pointerNames)[number]) {
    const value = state[name];
    return typeof value === 'string'
      ? value
      : value === null || value === undefined
        ? 'null'
        : String(value);
  }
</script>

<section class="visualizer panel" aria-label="Deque memory state">
  <div class="pointer-dock" aria-label="Pointer and reference values">
    {#each pointerNames as name}
      <div class:active={pointerValue(name) !== 'null'}>
        <span>{name}</span><code>{pointerValue(name)}</code>
      </div>
    {/each}
  </div>

  <div class="memory" aria-label="Deque elements">
    {#if elements.length === 0}
      <div class="empty"><code>front → null</code><span>The abstract deque is empty.</span></div>
    {:else}
      <div class="deque-container">
        <div class="side-label">front →</div>
        {#each elements as element}
          <article aria-label={`Element ${element.id}, value ${element.value}`}>
            <span class="element-id">{element.id}</span>
            <strong>{element.value}</strong>
          </article>
        {/each}
        <div class="side-label">← rear</div>
      </div>
    {/if}
  </div>
</section>

{#if language && activeSemantic}
  <div class="backing-view">
    <p class="eyebrow">Backing Memory View</p>
    {#if state.backing === 'circular-array'}
      <ArrayVisualizer {state} {language} {activeSemantic} />
    {:else}
      <LinkedListVisualizer {state} />
    {/if}
  </div>
{/if}

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
    justify-content: flex-start;
    align-items: center;
    min-height: 210px;
    padding: 1.25rem 0.25rem;
    overflow-x: auto;
  }
  article {
    position: relative;
    width: 112px;
    min-height: 80px;
    display: grid;
    grid-template-rows: auto 1fr;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem;
    border: 2px solid #334155;
    border-radius: 8px;
    background: #0a1727;
    transition: 180ms ease;
    text-align: center;
  }
  article strong {
    font: 1.35rem var(--mono);
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
  .backing-view {
    margin-top: 1rem;
  }
  .backing-view .eyebrow {
    color: var(--primary);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem 0.5rem;
  }
  .side-label {
    display: flex;
    align-items: center;
    color: var(--primary);
    font-size: 0.75rem;
    font-weight: bold;
    padding: 0 0.25rem;
  }
</style>
