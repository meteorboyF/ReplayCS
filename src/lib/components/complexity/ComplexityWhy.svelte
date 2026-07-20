<script lang="ts">
  import type { ComplexityEvidence } from '$lib/complexity/types';

  let { evidence }: { evidence: ComplexityEvidence } = $props();
  let n = $derived(Math.max(1, evidence.inputSize.n));
  let linear = $derived(evidence.timeComplexity === 'O(n)');
  let recursiveSpace = $derived(evidence.auxiliarySpace === 'O(n)');
</script>

<section class="why" aria-label="Visual complexity explanation">
  <div class="heading">
    <div>
      <span class="eyebrow">Why this bound?</span>
      <h3>{evidence.timeComplexity} time · {evidence.auxiliarySpace} space</h3>
    </div>
    <code>{evidence.selectedCase}</code>
  </div>

  <div class="growth" class:constant={!linear}>
    {#if linear}
      {#each Array(n) as _, index}<span
          class:visited={index < (evidence.cumulativeWork['node-inspection'] ?? 0)}
          >node {index + 1}</span
        >{/each}
      <b>Work can grow once per node → n</b>
    {:else}
      <span class="visited">fixed read</span><span class="visited">fixed write</span><b
        >Input may grow; this fixed-width work does not → 1</b
      >
    {/if}
  </div>

  <div class="space-model">
    <span>Auxiliary memory model</span>
    {#if recursiveSpace}
      <div class="frames">
        {#each Array(n) as _, index}<i style={`--depth: ${index}`}>frame {index + 1}</i>{/each}
      </div>
      <p>Recursive calls remain live together, so peak call-stack depth grows with <b>n</b>.</p>
    {:else}
      <div class="slots"><i>current</i><i>previous</i><i>next</i></div>
      <p>A bounded number of references is reused, so auxiliary storage stays constant.</p>
    {/if}
  </div>

  <ol>
    {#each evidence.derivation as item}<li>{item}</li>{/each}
  </ol>
  <details>
    <summary>Assumptions behind this claim</summary>
    <ul>
      {#each evidence.assumptions as assumption}<li>{assumption}</li>{/each}
    </ul>
  </details>
</section>

<style>
  .why {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: #07111f77;
  }
  .heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
  }
  h3 {
    margin: 0.3rem 0 0;
    font-size: 1rem;
  }
  .heading code {
    color: var(--secondary);
    border: 1px solid #9b7cff55;
    padding: 0.3rem 0.5rem;
    border-radius: 7px;
  }
  .growth {
    display: flex;
    align-items: end;
    gap: 0.25rem;
    min-height: 105px;
    margin: 0.8rem 0;
    overflow-x: auto;
  }
  .growth span {
    flex: 1 0 48px;
    display: grid;
    place-items: center;
    height: 54px;
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--muted);
    font-size: 0.55rem;
  }
  .growth span.visited {
    height: 76px;
    border-color: var(--primary);
    background: #2dd4bf18;
    color: var(--primary);
  }
  .growth b {
    flex: 2 0 180px;
    align-self: center;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .growth.constant span {
    flex: 0 0 75px;
  }
  .space-model {
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .space-model > span {
    color: var(--muted);
    font-size: 0.62rem;
    text-transform: uppercase;
  }
  .slots,
  .frames {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.55rem;
  }
  .slots i,
  .frames i {
    padding: 0.35rem;
    border: 1px solid #38bdf855;
    border-radius: 6px;
    color: var(--accent);
    font: 0.6rem var(--mono);
  }
  .frames i {
    transform: translateY(calc(var(--depth) * 2px));
  }
  .space-model p {
    margin: 0.55rem 0 0;
    color: var(--muted);
    font-size: 0.68rem;
  }
  ol,
  details {
    font-size: 0.72rem;
    line-height: 1.5;
  }
  ol {
    padding-left: 1.15rem;
  }
  details {
    color: var(--muted);
  }
  summary {
    color: var(--primary);
    cursor: pointer;
  }
</style>
