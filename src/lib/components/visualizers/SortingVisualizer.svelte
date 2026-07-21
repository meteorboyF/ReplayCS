<script lang="ts">
  import type { RuntimeState } from '$lib/engines/dsa/sorting';
  
  let { state }: { state: RuntimeState } = $props();
</script>

<div class="sorting-visualizer">
  <div class="main-array">
    <h3>Main Array</h3>
    <div class="array-container">
      {#each state.array as value, i}
        <div 
          class="cell" 
          class:active={Object.values(state.variables).includes(i)}
        >
          <small>{i}</small>
          <b>{value}</b>
          <div class="pointers">
            {#each Object.entries(state.variables) as [name, val]}
              {#if val === i}
                <em class="pointer pointer-{name}">{name}</em>
              {/if}
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  {#if Object.keys(state.arrays).length > 0}
    <div class="aux-arrays">
      {#each Object.entries(state.arrays) as [name, arr]}
        <div class="aux-array">
          <h3>{name}</h3>
          <div class="array-container">
            {#each arr as value, i}
              <div class="cell">
                <small>{i}</small>
                <b>{value}</b>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .sorting-visualizer {
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }
  h3 {
    font-size: 0.9rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
  }
  .array-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  .cell {
    position: relative;
    width: 3.5rem;
    height: 4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: #38bdf810;
  }
  .cell.active {
    border-color: var(--primary);
    background: #2dd4bf30;
    transform: translateY(-4px);
    box-shadow: 0 8px 20px #2dd4bf30;
  }
  small {
    color: var(--muted);
    font-size: 0.7rem;
  }
  b {
    font-size: 1.2rem;
  }
  .pointers {
    position: absolute;
    bottom: -1.8rem;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    gap: 2px;
  }
  em.pointer {
    font-style: normal;
    font-size: 0.65rem;
    color: var(--primary);
    background: var(--surface);
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid var(--primary);
  }
</style>
