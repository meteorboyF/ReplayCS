<script lang="ts">
  import GrowthChart from '$lib/components/complexity/GrowthChart.svelte';
  import OperationComplexityExplorer from '$lib/components/complexity/OperationComplexityExplorer.svelte';
  import ArrayVisualizer from '$lib/components/visualizers/ArrayVisualizer.svelte';
  import {
    BINARY_SEARCH_COMPLEXITY_OPERATION,
    COMPLEXITY_FAMILIES,
    DYNAMIC_ARRAY_APPEND_OPERATION
  } from '$lib/complexity/catalog';
  import { createBinarySearchLesson } from '$lib/engines/dsa/binarySearch';
  import type { TraceStep, TraceValue } from '$lib/trace/types';

  const chartFamilies = COMPLEXITY_FAMILIES.filter((family) => family.chartable);
  function binaryTrace(caseId: string) {
    const scenario = BINARY_SEARCH_COMPLEXITY_OPERATION.cases.find(
      (candidate) => candidate.id === caseId
    );
    if (!scenario) throw new Error(`Missing binary-search complexity case: ${caseId}`);
    const values = scenario.inputPreset.values;
    const target = scenario.inputPreset.target;
    if (
      !Array.isArray(values) ||
      !values.every((value) => typeof value === 'number') ||
      typeof target !== 'number'
    ) {
      throw new Error(`Binary-search case ${caseId} needs numeric values and target.`);
    }
    const complexityScenario = {
      caseId: scenario.id,
      caseType: scenario.caseType,
      implementation: scenario.implementationVariant,
      time: scenario.timeComplexity,
      space: scenario.auxiliarySpace,
      assumptions: scenario.assumptions,
      derivation: scenario.derivationSteps
    };
    return createBinarySearchLesson(values, target, complexityScenario);
  }
  const binarySearchTraces = {
    'binary-search-best': binaryTrace('binary-search-best'),
    'binary-search-average': binaryTrace('binary-search-average'),
    'binary-search-worst': binaryTrace('binary-search-worst')
  };

  const familyGroups = [
    {
      id: 'single-input',
      eyebrow: 'One growing input',
      title: 'Recognize the shape of n',
      description:
        'These families compare work as one primary input grows. The formula names the modeled operation count, not elapsed milliseconds.',
      families: COMPLEXITY_FAMILIES.filter((family) => family.chartable)
    },
    {
      id: 'multi-input',
      eyebrow: 'Several independent variables',
      title: 'Keep different dimensions separate',
      description:
        'Collections, graphs, and returned results do not always grow together. Preserve n, m, V, E, and k until an assumption relates them.',
      families: COMPLEXITY_FAMILIES.filter(
        (family) => !family.chartable && family.id !== 'amortized-constant'
      )
    },
    {
      id: 'sequence-cost',
      eyebrow: 'Cost across a sequence',
      title: 'Amortized is not average-case',
      description:
        'Amortized analysis distributes a guaranteed aggregate cost across operations; it does not assume a probability distribution over inputs.',
      families: COMPLEXITY_FAMILIES.filter((family) => family.id === 'amortized-constant')
    }
  ];

  function inputSummary(input: (typeof COMPLEXITY_FAMILIES)[number]['defaultInput']) {
    return Object.entries(input)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => `${name} = ${value}`)
      .join(' · ');
  }

  function binaryArrayState(state: Record<string, TraceValue>) {
    return {
      values: state.values as (string | number)[],
      target: state.target as string | number,
      left: state.left as number,
      right: state.right as number,
      mid: state.mid as number | null
    };
  }
</script>

{#snippet binaryVisualizer(_step: TraceStep, state: Record<string, TraceValue>)}
  <ArrayVisualizer state={binaryArrayState(state)} />
{/snippet}

<svelte:head>
  <title>Complexity Lab · ReplayCS</title>
  <meta
    name="description"
    content="Compare algorithmic growth, derive complexity from explicit assumptions, and connect Big O claims to deterministic ReplayCS operation traces."
  />
</svelte:head>

<section class="hero" aria-labelledby="complexity-title">
  <div class="hero-copy">
    <a class="back" href="/trace-lab">← Trace Lab</a>
    <p class="eyebrow">Operation Complexity Lab</p>
    <h1 id="complexity-title">
      Count the work.<br /><span class="gradient">Then name the growth.</span>
    </h1>
    <p class="lead">
      Big O is not a stopwatch result. Choose the input, implementation, case, and primitive
      operation; count deterministic work; then simplify how that count grows.
    </p>
    <nav class="hero-actions" aria-label="Complexity Lab sections">
      <a class="button primary" href="#growth">Compare growth →</a>
      <a class="button" href="#operations">Trace real operations</a>
      <a class="button" href="#family-reference">Open all 15 families</a>
    </nav>
  </div>

  <aside class="proof-card panel" aria-label="Complexity analysis contract">
    <div class="terminal-bar">
      <span></span><span></span><span></span><small>ANALYSIS / CONTRACT</small>
    </div>
    <ol>
      <li>
        <span>01</span>
        <div><strong>Name the input</strong><small>n, m, V, E, or k</small></div>
      </li>
      <li>
        <span>02</span>
        <div>
          <strong>Select the case</strong><small>best, average, worst, expected, or amortized</small
          >
        </div>
      </li>
      <li>
        <span>03</span>
        <div>
          <strong>Count one kind of work</strong><small
            >comparisons, reads, writes, calls, or another explicit metric</small
          >
        </div>
      </li>
      <li>
        <span>04</span>
        <div>
          <strong>Derive and simplify</strong><small
            >retain the dominant growth under stated assumptions</small
          >
        </div>
      </li>
    </ol>
    <div class="proof-result">
      <span>Evidence first</span><strong>T(input) → growth family</strong>
    </div>
  </aside>
</section>

<section class="truth-strip" aria-label="Complexity Lab coverage">
  <article>
    <strong>{COMPLEXITY_FAMILIES.length}</strong>
    <span>required growth families</span>
  </article>
  <article>
    <strong>{chartFamilies.length}</strong>
    <span>comparable one-input curves</span>
  </article>
  <article>
    <strong
      >{BINARY_SEARCH_COMPLEXITY_OPERATION.cases.length +
        DYNAMIC_ARRAY_APPEND_OPERATION.cases.length}</strong
    >
    <span>operation cases with derivations</span>
  </article>
</section>

<section class="measurement" aria-labelledby="measurement-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Measurement contract</p>
      <h2 id="measurement-heading">Operation count ≠ wall-clock time</h2>
    </div>
    <p>Complexity compares growth under a model. Benchmarks measure one real environment.</p>
  </div>

  <div class="measurement-grid">
    <article class="panel count-card">
      <span class="card-mark" aria-hidden="true">Σ</span>
      <div>
        <p class="eyebrow">What this lab measures</p>
        <h3>Deterministic primitive work</h3>
        <ul>
          <li>Comparisons, reads, writes, copies, calls, and other named operations</li>
          <li>The exact input variables and implementation variant</li>
          <li>The selected best, average, worst, expected, or amortized case</li>
          <li>Auxiliary space separately from returned output</li>
        </ul>
      </div>
    </article>

    <article class="panel clock-card">
      <span class="card-mark" aria-hidden="true">ms</span>
      <div>
        <p class="eyebrow">What Big O does not promise</p>
        <h3>A duration on a particular machine</h3>
        <ul>
          <li>CPU speed, cache behavior, runtime warm-up, allocation, and compiler effects</li>
          <li>Equal speed for two implementations in the same growth family</li>
          <li>A useful claim when the counted operation or assumptions stay unnamed</li>
          <li>That constants and lower-order terms never matter at real input sizes</li>
        </ul>
      </div>
    </article>
  </div>

  <div class="model-note panel" role="note">
    <span aria-hidden="true">i</span>
    <p>
      ReplayCS plots representative formulas so their shapes can be compared. A curve is not a
      benchmark and its vertical value is not seconds. Change the implementation, representation,
      case, or assumptions and the valid complexity claim may change too.
    </p>
  </div>
</section>

<section id="growth" class="lab-section" aria-labelledby="growth-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Interactive growth chart</p>
      <h2 id="growth-heading">See when growth overwhelms constants</h2>
    </div>
    <p>
      Toggle families and input size. Linear and logarithmic scales answer different visual
      questions, while capped values keep explosive families safe to inspect.
    </p>
  </div>
  <GrowthChart families={chartFamilies} />
</section>

<section id="operations" class="lab-section operations" aria-labelledby="operations-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Cases, counts, and space</p>
      <h2 id="operations-heading">Ground the notation in real operations</h2>
    </div>
    <p>
      An algorithm name alone is not an analysis. Inspect the concrete input, variant, selected
      case, exact count formula, auxiliary space, assumptions, and derivation together.
    </p>
  </div>

  <article class="operation-block" aria-labelledby="binary-operation-heading">
    <header>
      <span class="operation-number">01</span>
      <div>
        <p class="eyebrow">Live trace connected</p>
        <p id="binary-operation-heading" class="operation-title">
          Binary search: one algorithm, different cases
        </p>
        <p>
          The first midpoint is constant work in the best case; repeated halving is logarithmic in
          typical and worst cases. Recursion changes auxiliary space even when time stays the same.
        </p>
      </div>
    </header>
    <OperationComplexityExplorer
      operation={BINARY_SEARCH_COMPLEXITY_OPERATION}
      tracesByCase={binarySearchTraces}
      visualizer={binaryVisualizer}
    />
  </article>

  <article class="operation-block" aria-labelledby="append-operation-heading">
    <header>
      <span class="operation-number">02</span>
      <div>
        <p class="eyebrow">Sequence accounting</p>
        <p id="append-operation-heading" class="operation-title">
          Dynamic-array append: worst event vs amortized cost
        </p>
        <p>
          A resize copies n elements, so that individual append is linear. Geometric capacity growth
          keeps the total cost of a long sequence linear, making the per-append amortized cost
          constant.
        </p>
      </div>
    </header>
    <OperationComplexityExplorer operation={DYNAMIC_ARRAY_APPEND_OPERATION} />
  </article>
</section>

<section id="family-reference" class="lab-section reference" aria-labelledby="reference-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Complete reference</p>
      <h2 id="reference-heading">All 15 families, with the assumptions attached</h2>
    </div>
    <p>
      Open any family for its real scenarios and derivation. Similar-looking formulas remain
      separate when their variables describe different parts of the input.
    </p>
  </div>

  {#each familyGroups as group}
    <section class="family-group" aria-labelledby={`${group.id}-heading`}>
      <header class="group-heading">
        <div>
          <p class="eyebrow">{group.eyebrow}</p>
          <h3 id={`${group.id}-heading`}>{group.title}</h3>
        </div>
        <p>{group.description}</p>
      </header>

      <div class="family-grid">
        {#each group.families as family}
          <details class="family panel" id={`family-${family.id}`}>
            <summary>
              <span class="notation">{family.notation}</span>
              <span class="family-title">
                <strong>{family.title}</strong>
                <small>{family.summary}</small>
              </span>
            </summary>

            <div class="family-body">
              <dl class="formula-row">
                <div>
                  <dt>Representative count</dt>
                  <dd><code>{family.formula}</code></dd>
                </div>
                <div>
                  <dt>Example input</dt>
                  <dd>{inputSummary(family.defaultInput)}</dd>
                </div>
              </dl>

              <div class="family-columns">
                <section>
                  <h4>Real scenarios</h4>
                  <ul>
                    {#each family.scenarios as scenario}<li>{scenario}</li>{/each}
                  </ul>
                </section>
                <section>
                  <h4>Assumptions</h4>
                  <ul>
                    {#each family.assumptions as assumption}<li>{assumption}</li>{/each}
                  </ul>
                </section>
              </div>

              <section class="derivation">
                <h4>Derivation</h4>
                <ol>
                  {#each family.derivation as step}<li>{step}</li>{/each}
                </ol>
              </section>
            </div>
          </details>
        {/each}
      </div>
    </section>
  {/each}
</section>

<section class="closing panel" aria-labelledby="closing-heading">
  <div>
    <p class="eyebrow">A defensible complexity claim</p>
    <h2 id="closing-heading">Say what grows, what you counted, and why.</h2>
    <p>
      “The worst-case iterative binary search performs logarithmically many midpoint comparisons on
      a sorted random-access sequence” is useful. “Binary search is fast” is not an analysis.
    </p>
  </div>
  <a class="button primary" href="/lesson/dsa-1/binary-search"
    >Open the full Binary Search trace →</a
  >
</section>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .hero,
  .measurement,
  .lab-section,
  .closing {
    scroll-margin-top: 6rem;
  }

  .hero {
    min-height: 68vh;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.72fr);
    gap: clamp(2rem, 6vw, 5rem);
    align-items: center;
    padding: 2rem 0 3.5rem;
  }

  .back {
    display: inline-block;
    margin-bottom: 1.4rem;
    color: var(--primary);
    font-size: 0.82rem;
  }

  h1 {
    max-width: 820px;
    font-size: clamp(3.1rem, 7vw, 6.4rem);
  }

  .lead {
    max-width: 700px;
    color: var(--muted);
    font-size: 1.12rem;
    line-height: 1.72;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 1.6rem;
  }

  .proof-card {
    overflow: hidden;
    padding: 1rem;
    box-shadow: 0 28px 80px #0007;
    background:
      radial-gradient(circle at 100% 0, #2dd4bf1d, transparent 44%),
      linear-gradient(145deg, rgba(20, 37, 59, 0.98), rgba(14, 27, 45, 0.98));
  }

  .terminal-bar {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--border);
  }

  .terminal-bar span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--danger);
  }

  .terminal-bar span:nth-child(2) {
    background: var(--warning);
  }

  .terminal-bar span:nth-child(3) {
    background: var(--success);
  }

  .terminal-bar small {
    margin-left: auto;
    color: var(--muted);
    font: 0.65rem var(--mono);
    letter-spacing: 0.08em;
  }

  .proof-card ol {
    display: grid;
    gap: 0;
    padding: 0;
    margin: 0.7rem 0;
    list-style: none;
  }

  .proof-card li {
    display: grid;
    grid-template-columns: 2.4rem 1fr;
    gap: 0.65rem;
    align-items: center;
    padding: 0.8rem 0.25rem;
    border-bottom: 1px solid var(--border);
  }

  .proof-card li > span {
    color: var(--primary);
    font: 700 0.7rem var(--mono);
  }

  .proof-card li div,
  .proof-card li strong,
  .proof-card li small {
    display: block;
  }

  .proof-card li strong {
    font-size: 0.84rem;
  }

  .proof-card li small {
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.68rem;
    line-height: 1.4;
  }

  .proof-result {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    padding: 0.8rem;
    border: 1px solid #2dd4bf55;
    border-radius: 10px;
    background: #2dd4bf0c;
  }

  .proof-result span {
    color: var(--muted);
    font-size: 0.72rem;
  }

  .proof-result strong {
    color: var(--primary);
    font: 700 0.78rem var(--mono);
  }

  .truth-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-bottom: 6rem;
    border-block: 1px solid var(--border);
  }

  .truth-strip article {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.8rem;
    align-items: center;
    padding: 1.25rem 1.5rem;
  }

  .truth-strip article + article {
    border-left: 1px solid var(--border);
  }

  .truth-strip strong {
    color: var(--primary);
    font: 800 1.8rem var(--mono);
  }

  .truth-strip span {
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .measurement,
  .lab-section {
    padding: 1rem 0 5rem;
  }

  .section-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
    gap: 2rem;
    align-items: end;
    margin-bottom: 1.5rem;
  }

  .section-heading h2 {
    max-width: 760px;
    margin-bottom: 0;
  }

  .section-heading > p,
  .group-heading > p {
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.65;
  }

  .measurement-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .measurement-grid article {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    padding: 1.25rem;
  }

  .card-mark {
    display: grid;
    width: 2.7rem;
    height: 2.7rem;
    place-items: center;
    border: 1px solid #2dd4bf66;
    border-radius: 12px;
    color: var(--primary);
    background: #2dd4bf0d;
    font: 800 0.8rem var(--mono);
  }

  .clock-card .card-mark {
    border-color: #fbbf2466;
    color: var(--warning);
    background: #fbbf240d;
  }

  .measurement-grid h3 {
    margin: 0.35rem 0 0.8rem;
    font-size: 1.16rem;
  }

  .measurement-grid ul,
  .family-body ul,
  .family-body ol {
    padding-left: 1.15rem;
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.6;
  }

  .measurement-grid li + li,
  .family-body li + li {
    margin-top: 0.35rem;
  }

  .model-note {
    display: flex;
    gap: 0.8rem;
    align-items: start;
    margin-top: 1rem;
    padding: 1rem 1.2rem;
    border-color: #38bdf855;
    background: #38bdf80b;
  }

  .model-note > span {
    display: grid;
    flex: 0 0 auto;
    width: 1.5rem;
    height: 1.5rem;
    place-items: center;
    border-radius: 50%;
    color: #082638;
    background: var(--accent);
    font-weight: 850;
  }

  .model-note p {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
    line-height: 1.6;
  }

  .operations {
    display: grid;
    gap: 3rem;
  }

  .operations > .section-heading {
    margin-bottom: -0.5rem;
  }

  .operation-block {
    min-width: 0;
  }

  .operation-block > header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 1rem;
    max-width: 880px;
    margin-bottom: 1rem;
  }

  .operation-number {
    display: grid;
    width: 2.8rem;
    height: 2.8rem;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 50%;
    color: var(--primary);
    font: 800 0.72rem var(--mono);
  }

  .operation-title {
    margin: 0.28rem 0 0.45rem;
    font-size: clamp(1.35rem, 2.5vw, 2rem);
    font-weight: 760;
    line-height: 1.2;
  }

  .operation-block header p:last-child {
    margin: 0;
    color: var(--muted);
    font-size: 0.88rem;
    line-height: 1.65;
  }

  .family-group + .family-group {
    margin-top: 3.5rem;
  }

  .group-heading {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(280px, 1fr);
    gap: 2rem;
    align-items: end;
    margin-bottom: 1rem;
  }

  .group-heading h3 {
    margin: 0.35rem 0 0;
    font-size: clamp(1.35rem, 2.5vw, 1.9rem);
  }

  .family-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .family {
    min-width: 0;
    overflow: hidden;
  }

  .family summary {
    display: grid;
    grid-template-columns: minmax(88px, auto) minmax(0, 1fr);
    gap: 0.9rem;
    align-items: center;
    min-height: 96px;
    padding: 1rem;
    cursor: pointer;
  }

  .family summary:hover {
    background: #2dd4bf08;
  }

  .notation {
    justify-self: start;
    padding: 0.42rem 0.55rem;
    border: 1px solid #2dd4bf55;
    border-radius: 9px;
    color: var(--primary);
    background: #2dd4bf0b;
    font: 800 0.74rem var(--mono);
    white-space: nowrap;
  }

  .family-title,
  .family-title strong,
  .family-title small {
    display: block;
  }

  .family-title strong {
    font-size: 0.95rem;
  }

  .family-title small {
    margin-top: 0.3rem;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.45;
  }

  .family-body {
    padding: 0 1rem 1rem;
    border-top: 1px solid var(--border);
  }

  .formula-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
    margin: 1rem 0;
  }

  .formula-row > div {
    min-width: 0;
    padding: 0.7rem;
    border-radius: 10px;
    background: #07111f7a;
  }

  .formula-row dt {
    color: var(--muted);
    font-size: 0.64rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .formula-row dd {
    margin: 0.35rem 0 0;
    overflow-wrap: anywhere;
    color: var(--text);
    font-size: 0.76rem;
  }

  .formula-row code {
    color: var(--accent);
    font: 700 0.78rem var(--mono);
  }

  .family-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .family-body h4 {
    margin: 0 0 0.5rem;
    color: var(--text);
    font-size: 0.76rem;
  }

  .derivation {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .closing {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    align-items: center;
    margin-top: 2rem;
    padding: 1.5rem;
    background:
      radial-gradient(circle at 0 100%, #9b7cff17, transparent 45%),
      linear-gradient(145deg, rgba(20, 37, 59, 0.98), rgba(14, 27, 45, 0.98));
  }

  .closing h2 {
    margin: 0.35rem 0 0.6rem;
    font-size: clamp(1.5rem, 3vw, 2.35rem);
  }

  .closing p:last-child {
    max-width: 760px;
    margin: 0;
    color: var(--muted);
    line-height: 1.65;
  }

  .closing .button {
    text-align: center;
  }

  @media (max-width: 900px) {
    .hero {
      grid-template-columns: 1fr;
      min-height: auto;
    }

    .proof-card {
      max-width: 620px;
    }

    .section-heading,
    .group-heading {
      grid-template-columns: 1fr;
      gap: 0.65rem;
      align-items: start;
    }

    .family-grid {
      grid-template-columns: 1fr;
    }

    .closing {
      grid-template-columns: 1fr;
    }

    .closing .button {
      justify-self: start;
    }
  }

  @media (max-width: 680px) {
    .hero {
      padding-top: 0.5rem;
    }

    .hero-actions,
    .hero-actions .button {
      width: 100%;
    }

    .hero-actions .button {
      text-align: center;
    }

    .truth-strip,
    .measurement-grid {
      grid-template-columns: 1fr;
    }

    .truth-strip article + article {
      border-top: 1px solid var(--border);
      border-left: 0;
    }

    .truth-strip article {
      padding-inline: 0.5rem;
    }

    .measurement-grid article {
      grid-template-columns: 1fr;
    }

    .operation-block > header {
      grid-template-columns: 1fr;
    }

    .family summary,
    .formula-row,
    .family-columns {
      grid-template-columns: 1fr;
    }

    .family summary {
      gap: 0.6rem;
    }

    .closing .button {
      width: 100%;
    }
  }
</style>
