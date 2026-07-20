<script lang="ts">
  import type { TraceValue } from '$lib/trace/types';

  type NodeView = {
    id: string;
    key: number;
    value: number;
    next: string | null;
    status: 'live' | 'detached' | 'deleted';
  };

  type CellView = {
    id: string;
    key: number | null;
    value: number | null;
    status: 'empty' | 'occupied' | 'tombstone';
  };

  let { state }: { state: Record<string, TraceValue> } = $props();

  let backing = $derived(state.backing as string);
  let capacity = $derived(state.capacity as number);
  let size = $derived(state.size as number);
  let loadFactor = $derived(state.loadFactor as number);

  // Separate Chaining
  let buckets = $derived((state.buckets ?? []) as (string | null)[]);
  let nodes = $derived((state.nodes ?? []) as unknown as NodeView[]);

  // Linear Probing
  let cells = $derived((state.cells ?? []) as unknown as CellView[]);

  function getNode(id: string | null) {
    if (!id) return null;
    return nodes.find(n => n.id === id) || null;
  }
  
  function getChain(headId: string | null) {
    const chain: NodeView[] = [];
    let current = getNode(headId);
    while (current) {
      chain.push(current);
      current = getNode(current.next);
    }
    return chain;
  }
</script>

<section class="visualizer panel" aria-label="Hash Table state">
  <div class="stats" aria-label="Hash Table Statistics">
    <div><span>Size</span><code>{size ?? 0}</code></div>
    <div><span>Capacity</span><code>{capacity ?? 0}</code></div>
    <div><span>Load Factor</span><code>{typeof loadFactor === 'number' ? loadFactor.toFixed(2) : '0.00'}</code></div>
  </div>

  <div class="memory" aria-label="Hash Table Buckets">
    {#if backing === 'separate-chaining'}
      <div class="buckets chaining">
        {#each buckets as headId, i}
          <div class="bucket-row">
            <div class="bucket-index">[{i}]</div>
            <div class="bucket-head">
              {#if headId}
                <span class="pointer">→</span>
              {:else}
                <span class="null-ptr">null</span>
              {/if}
            </div>
            <div class="chain">
              {#each getChain(headId) as node}
                <div class="node {node.status}">
                  <div class="node-content">
                    <span class="key">K: {node.key}</span>
                    <span class="value">V: {node.value}</span>
                  </div>
                  {#if node.next}
                    <span class="arrow">→</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else if backing === 'linear-probing'}
      <div class="buckets probing">
        {#each cells as cell, i}
          <div class="cell {cell.status}">
            <div class="cell-index">[{i}]</div>
            <div class="cell-content">
              {#if cell.status === 'occupied'}
                <div class="kv">
                  <span class="key">K: {cell.key}</span>
                  <span class="value">V: {cell.value}</span>
                </div>
              {:else if cell.status === 'tombstone'}
                <span class="tombstone-mark">TOMBSTONE</span>
              {:else}
                <span class="empty-mark">EMPTY</span>
              {/if}
            </div>
          </div>
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
  .stats {
    display: flex;
    gap: 1rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--border);
  }
  .stats > div {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #07111f88;
  }
  .stats span {
    color: var(--muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .stats code {
    color: var(--primary);
    font-weight: 600;
  }
  
  .memory {
    padding: 1rem 0;
    overflow-y: auto;
    max-height: 400px;
  }

  /* Separate Chaining Styles */
  .chaining {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .bucket-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .bucket-index {
    width: 40px;
    font-family: var(--mono);
    color: var(--muted);
    text-align: right;
  }
  .bucket-head {
    width: 60px;
    height: 40px;
    background: #0f172a;
    border: 1px solid var(--border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-size: 0.8rem;
  }
  .chain {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .node {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .node-content {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 0.4rem 0.8rem;
    display: flex;
    flex-direction: column;
    min-width: 70px;
    align-items: center;
  }
  .node.live .node-content {
    border-color: var(--primary);
  }
  .node.deleted .node-content {
    border-color: #ef4444;
    opacity: 0.5;
    text-decoration: line-through;
  }
  .key {
    font-size: 0.7rem;
    color: var(--muted);
  }
  .value {
    font-weight: bold;
    color: #f8fafc;
  }
  .arrow {
    color: var(--muted);
  }

  /* Linear Probing Styles */
  .probing {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
  }
  .cell {
    background: #0f172a;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    min-height: 70px;
  }
  .cell.occupied {
    border-color: var(--primary);
    background: #1e293b;
  }
  .cell.tombstone {
    border-color: #ef444455;
    background: #7f1d1d22;
  }
  .cell-index {
    font-family: var(--mono);
    color: var(--muted);
    font-size: 0.75rem;
    align-self: flex-start;
  }
  .cell-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }
  .kv {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .tombstone-mark {
    color: #ef4444;
    font-size: 0.7rem;
    font-weight: bold;
    letter-spacing: 0.05em;
  }
  .empty-mark {
    color: var(--muted);
    font-size: 0.7rem;
  }
</style>
