<script lang="ts">
  import type { ComplexityEvidence } from '$lib/complexity/types';

  let { evidence }: { evidence: ComplexityEvidence } = $props();
  let n = $derived(Math.max(1, evidence.inputSize.n));
  let linear = $derived(evidence.timeComplexity === 'O(n)');
  let amortized = $derived(evidence.selectedCase === 'amortized');
  let linearSpace = $derived(evidence.auxiliarySpace === 'O(n)');
  let recursiveSpace = $derived(
    linearSpace &&
      ((evidence.space.callStackDepth ?? 1) > 1 ||
        evidence.space.auxiliary.unit.toLowerCase().includes('frame'))
  );
  let bufferSpace = $derived(linearSpace && !recursiveSpace);
  let arrayWork = $derived(evidence.space.auxiliary.unit.toLowerCase().startsWith('slots'));
  let visitedWork = $derived(
    evidence.cumulativeWork['node-inspection'] ??
      evidence.cumulativeWork['loop-iteration'] ??
      Math.min(n, (evidence.cumulativeWork.read ?? 0) + (evidence.cumulativeWork.write ?? 0))
  );

  function resizeSizes(inputSize: number) {
    const sizes: number[] = [];
    for (let capacity = 1; capacity < inputSize; capacity *= 2) sizes.push(capacity);
    return sizes;
  }
</script>

<section class="why" aria-label="Visual complexity explanation">
  <div class="heading">
    <div>
      <span class="eyebrow">Why this bound?</span>
      <h3>{evidence.timeComplexity} time · {evidence.auxiliarySpace} space</h3>
    </div>
    <code>{evidence.selectedCase}</code>
  </div>

  <div class="growth" class:constant={!linear && !amortized} class:amortized>
    {#if amortized}
      {#each resizeSizes(n) as copies}
        <span class="resize" style={`--resize-height:${Math.min(90, 38 + copies * 6)}px`}
          >copy {copies}</span
        >
      {/each}
      <b>Copies form 1 + 2 + 4 + … &lt; 2n, so n appends cost O(n) total → amortized O(1).</b>
    {:else if linear}
      {#each Array(n) as _, index}<span class:visited={index < visitedWork}
          >{arrayWork ? 'slot' : 'node'} {index + 1}</span
        >{/each}
      <b>Work can grow once per {arrayWork ? 'affected slot' : 'node'} → n</b>
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
    {:else if bufferSpace}
      <div class="frames buffer-slots">
        {#each Array(n) as _, index}<i>slot {index}</i>{/each}
      </div>
      <p>
        A second/resized buffer can hold a linear number of slots, so peak auxiliary storage is
        <b>O(n)</b>.
      </p>
    {:else}
      <div class="slots"><i>cursor</i><i>temporary</i><i>counter</i></div>
      <p>
        A bounded number of scalar/reference slots is reused, so auxiliary storage stays constant.
      </p>
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
    background: var(--bg);
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
    border: 1px solid color-mix(in srgb, var(--secondary) 33%, transparent);
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
    background: color-mix(in srgb, var(--primary) 9%, transparent);
    color: var(--primary);
  }
  .growth span.resize {
    height: var(--resize-height);
    border-color: var(--secondary);
    background: color-mix(in srgb, var(--secondary) 7%, transparent);
    color: var(--secondary);
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
    border: 1px solid color-mix(in srgb, var(--accent) 33%, transparent);
    border-radius: 6px;
    color: var(--accent);
    font: 0.6rem var(--mono);
  }
  .frames i {
    transform: translateY(calc(var(--depth) * 2px));
  }
  .buffer-slots {
    flex-wrap: wrap;
  }
  .buffer-slots i {
    border-color: color-mix(in srgb, var(--primary) 40%, transparent);
    color: var(--primary);
    transform: none;
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
