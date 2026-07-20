<script lang="ts">
  interface ArrayState {
    values: (string | number)[];
    target: string | number;
    left: number;
    right: number;
    mid: number | null;
  }
  let { state }: { state: ArrayState } = $props();
</script>

<section class="panel visual">
  <div class="heading">
    <span class="eyebrow">Memory view</span><span>Target <strong>{state.target}</strong></span>
  </div>
  <div class="array">
    {#each state.values as value, i}<div
        class:mid={i === state.mid}
        class:discarded={i < state.left || i > state.right}
      >
        <small>{i}</small><b>{value}</b>{#if i === state.left}<em>L</em
          >{/if}{#if i === state.mid}<em>M</em>{/if}{#if i === state.right}<em>R</em>{/if}
      </div>{/each}
  </div>
  <p class="legend"><span>● Active range</span><span>● Midpoint</span><span>● Discarded</span></p>
</section>

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
  .array {
    display: flex;
    gap: 0.45rem;
  }
  .array div {
    position: relative;
    flex: 1;
    text-align: center;
    padding: 1rem 0.2rem;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: #38bdf810;
  }
  .array div.mid {
    border-color: var(--primary);
    background: #2dd4bf30;
    transform: translateY(-8px);
    box-shadow: 0 12px 30px #2dd4bf30;
  }
  .array div.discarded {
    opacity: 0.3;
    filter: grayscale(1);
  }
  small {
    display: block;
    color: var(--muted);
  }
  b {
    font-size: 1.2rem;
  }
  em {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    bottom: -1.5rem;
    color: var(--primary);
    font-style: normal;
    font-size: 0.72rem;
  }
  .legend {
    margin: 2.5rem 0 0;
    display: flex;
    gap: 1rem;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .legend span:nth-child(2) {
    color: var(--primary);
  }
  @media (max-width: 520px) {
    .array {
      gap: 0.2rem;
    }
    .array div {
      padding: 0.7rem 0.1rem;
    }
    .legend {
      flex-wrap: wrap;
    }
  }
</style>
