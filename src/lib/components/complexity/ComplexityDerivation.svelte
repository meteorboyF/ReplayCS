<script lang="ts">
  import type { ComplexityClass } from '$lib/complexity/types';

  let {
    steps,
    exactCountFormula,
    timeComplexity,
    title = 'Derive the bound'
  }: {
    steps: readonly string[];
    exactCountFormula?: string;
    timeComplexity?: ComplexityClass | string;
    title?: string;
  } = $props();
</script>

<section class="derivation" aria-label={title}>
  <div class="heading">
    <div>
      <span class="eyebrow">Count → simplify → classify</span>
      <h3>{title}</h3>
    </div>
    {#if timeComplexity}<code>{timeComplexity}</code>{/if}
  </div>

  {#if exactCountFormula}
    <div class="formula">
      <span>Counting model / bound</span>
      <strong>{exactCountFormula}</strong>
    </div>
  {/if}

  {#if steps.length}
    <ol>
      {#each steps as step, index}
        <li>
          <span aria-hidden="true">{index + 1}</span>
          <p>{step}</p>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="empty">A deterministic derivation has not been authored for this case yet.</p>
  {/if}
</section>

<style>
  .derivation {
    min-width: 0;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }
  h3 {
    margin: 0.3rem 0 0;
    font-size: 1.15rem;
  }
  .heading > code {
    flex: none;
    padding: 0.45rem 0.65rem;
    border: 1px solid color-mix(in srgb, var(--primary) 33%, transparent);
    border-radius: 9px;
    background: color-mix(in srgb, var(--primary) 5%, transparent);
    color: var(--primary);
    font-weight: 800;
  }
  .formula {
    display: grid;
    gap: 0.3rem;
    margin-top: 1rem;
    padding: 0.8rem;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: var(--bg);
  }
  .formula span {
    color: var(--muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .formula strong {
    color: var(--accent);
    font: 0.9rem/1.5 var(--mono);
  }
  ol {
    list-style: none;
    display: grid;
    gap: 0.65rem;
    margin: 1rem 0 0;
    padding: 0;
  }
  li {
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: 0.7rem;
    align-items: start;
  }
  li > span {
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid color-mix(in srgb, var(--secondary) 40%, transparent);
    border-radius: 50%;
    color: var(--secondary);
    font: 0.75rem var(--mono);
  }
  li p {
    margin: 0;
    padding: 0.4rem 0 0.8rem;
    border-bottom: 1px solid var(--border);
    line-height: 1.55;
  }
  .empty {
    color: var(--muted);
  }
  @media (max-width: 520px) {
    .heading {
      flex-direction: column;
    }
  }
</style>
