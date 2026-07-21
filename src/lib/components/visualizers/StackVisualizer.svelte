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

  const pointerNames = ['top', 'current', 'result'] as const;
  
  // Extract elements from the trace state for the abstract stack view.
  // We can derive this based on the backing type.
  type ElementView = { id: string; value: string | number };
  let elements = $derived.by(() => {
    const list: ElementView[] = [];
    if (state.backing === 'array' || state.backing === 'dynamic-array') {
      const slots = (Array.isArray(state.slots) ? state.slots : []) as (number | null)[];
      const size = typeof state.size === 'number' ? state.size : 0;
      for (let i = 0; i < size; i++) {
        if (slots[i] !== null) {
          list.push({ id: `slot-${i}`, value: slots[i]! });
        }
      }
    } else {
      const nodes = (Array.isArray(state.nodes) ? state.nodes : []) as any[];
      // We start from head and follow next pointers
      let currentId = typeof state.head === 'string' ? state.head : null;
      let safeLimit = 100;
      while (currentId && safeLimit-- > 0) {
        const node = nodes.find(n => n.id === currentId);
        if (!node || node.status === 'deleted') break;
        // In our linked list backing for stack, head is the TOP of the stack.
        // We push to `list` directly so index 0 is top, and we will render top to bottom.
        list.push({ id: node.id, value: node.value });
        currentId = node.next;
      }
      // Reverse to match array's visual order where bottom is first.
      list.reverse();
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
      <div class="empty"><code>top → null</code><span>The abstract stack is empty.</span></div>
    {:else}
      <div class="stack-container">
        <div class="top-label">top →</div>
        {#each elements.slice().reverse() as element}
          <article aria-label={`Element ${element.id}, value ${element.value}`}>
            <span class="element-id">{element.id}</span>
            <strong>{element.value}</strong>
          </article>
        {/each}
        <div class="bottom-label">bottom</div>
      </div>
    {/if}
  </div>
</section>

{#if language && activeSemantic}
  <div class="backing-view">
    <p class="eyebrow">Backing Memory View</p>
    {#if state.backing === 'array' || state.backing === 'dynamic-array'}
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
  .top-label {
    text-align: right;
    color: var(--primary);
    font-size: 0.75rem;
    font-weight: bold;
    padding-right: 0.5rem;
  }
  .bottom-label {
    text-align: center;
    color: var(--muted);
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
</style>
