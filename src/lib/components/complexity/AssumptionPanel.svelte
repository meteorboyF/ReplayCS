<script lang="ts">
  let {
    assumptions,
    title = 'Assumptions behind this result',
    emptyMessage = 'No assumptions have been documented for this case yet.'
  }: {
    assumptions: readonly string[];
    title?: string;
    emptyMessage?: string;
  } = $props();
</script>

<section class="assumptions" aria-label={title}>
  <div class="heading">
    <span aria-hidden="true">◇</span>
    <h3>{title}</h3>
  </div>
  {#if assumptions.length}
    <ul>
      {#each assumptions as assumption}<li>{assumption}</li>{/each}
    </ul>
    <p class="boundary">Change an assumption and the complexity may change too.</p>
  {:else}
    <p class="empty">{emptyMessage}</p>
  {/if}
</section>

<style>
  .assumptions {
    padding: 0.9rem;
    border: 1px solid #fbbf2444;
    border-radius: 13px;
    background: #fbbf2408;
  }
  .heading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .heading span {
    color: var(--warning);
    font-size: 1.15rem;
  }
  h3 {
    margin: 0;
    font-size: 0.9rem;
  }
  ul {
    margin: 0.75rem 0 0;
    padding-left: 1.2rem;
  }
  li {
    margin: 0.45rem 0;
    color: #dce7f5;
    line-height: 1.5;
  }
  li::marker {
    color: var(--warning);
  }
  .boundary,
  .empty {
    margin: 0.75rem 0 0;
    color: var(--muted);
    font-size: 0.74rem;
    line-height: 1.5;
  }
  .boundary {
    padding-top: 0.65rem;
    border-top: 1px solid #fbbf2428;
  }
</style>
