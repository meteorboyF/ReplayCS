<script lang="ts">
  import type { RuntimeState } from '$lib/engines/dsa/search';
  import ArrayVisualizer from './ArrayVisualizer.svelte';
  import HashTableVisualizer from './HashTableVisualizer.svelte';
  
  let { state }: { state: RuntimeState } = $props();
</script>

{#if state.algorithm === 'binary-search-iterative' || state.algorithm === 'binary-search-recursive' || state.algorithm === 'linear-search'}
  <ArrayVisualizer state={{
    values: state.values,
    target: state.target,
    left: state.left ?? 0,
    right: state.right ?? state.values.length - 1,
    mid: state.mid ?? state.index
  }} />
{:else if state.algorithm === 'hash-lookup'}
  <HashTableVisualizer state={{
    hashTableSize: state.hashTableSize,
    buckets: state.buckets,
    currentBucket: state.currentBucket,
    nodes: [],
    cells: []
  }} />
{:else if state.algorithm === 'bst-search'}
  <section class="panel visual">
    <div class="heading">
      <span class="eyebrow">Tree view</span><span>Target <strong>{state.target}</strong></span>
    </div>
    <div class="tree-container">
      {#if state.rootId}
        <p>BST search visualization for {state.target}</p>
        <div class="bst-diagram">
          {#each state.nodes as node}
            <div class="bst-node" class:active={node.id === state.currentNodeId}>
              {node.value}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  .visual {
    padding: 1.2rem;
    min-height: 260px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    color: var(--muted);
    margin-bottom: 2rem;
  }
  .heading strong {
    color: var(--text);
  }
  .bst-diagram {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  .bst-node {
    padding: 1rem;
    border-radius: 50%;
    border: 1px solid var(--accent);
    background: #38bdf810;
  }
  .bst-node.active {
    border-color: var(--primary);
    background: #2dd4bf30;
    transform: scale(1.1);
  }
</style>
