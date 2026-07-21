<script lang="ts">
  import { onMount } from 'svelte';
  import QueryTable from '$lib/components/dbms/QueryTable.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import {
    QUERY_SCENARIOS,
    createQueryScenario,
    type QueryScenarioId
  } from '$lib/engines/dbms/queryPipeline';
  import { completeLesson, loadProgress, saveProgress } from '$lib/progress/store';

  let scenario = $state(createQueryScenario('active-department-payroll'));
  let index = $state(0);
  let playing = $state(false);
  let progress = $state(loadProgress());
  let scenarioFinished = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  let currentStage = $derived(scenario.stages[index]);
  let finalStage = $derived(scenario.stages.at(-1)!);
  let rowsDelta = $derived(currentStage.rows.length - currentStage.rowsBefore.length);
  let labComplete = $derived(progress.completed.includes('query-pipeline'));

  onMount(() => {
    progress = loadProgress();
    const params = new URLSearchParams(location.search);
    const requestedScenario = params.get('scenario');
    if (QUERY_SCENARIOS.some((item) => item.id === requestedScenario)) {
      selectScenario(requestedScenario as QueryScenarioId, false);
    }
    const requestedStep = Number(params.get('step') ?? 0);
    if (Number.isInteger(requestedStep)) jump(requestedStep, false);
    return () => clearInterval(timer);
  });

  function stopPlayback() {
    playing = false;
    clearInterval(timer);
  }

  function syncUrl() {
    const params = new URLSearchParams({ scenario: scenario.id, step: String(index) });
    history.replaceState({}, '', `?${params}`);
  }

  function selectScenario(nextId: QueryScenarioId, updateUrl = true) {
    stopPlayback();
    scenario = createQueryScenario(nextId);
    index = 0;
    scenarioFinished = false;
    if (updateUrl) syncUrl();
  }

  function jump(nextIndex: number, updateUrl = true) {
    index = Math.max(0, Math.min(nextIndex, scenario.stages.length - 1));
    if (index === scenario.stages.length - 1) {
      stopPlayback();
      scenarioFinished = true;
      progress = completeLesson(progress, 'query-pipeline');
      saveProgress(progress);
    }
    if (updateUrl) syncUrl();
  }

  function restart() {
    stopPlayback();
    index = 0;
    scenarioFinished = false;
    syncUrl();
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (index === scenario.stages.length - 1) index = 0;
    playing = true;
    timer = setInterval(() => {
      if (index >= scenario.stages.length - 1) stopPlayback();
      else jump(index + 1);
    }, 1150);
  }
</script>

<svelte:head>
  <title>SQL Query Pipeline · ReplayCS</title>
  <meta
    name="description"
    content="Trace curated HR queries through JOIN, WHERE, GROUP BY, HAVING, SELECT, ORDER BY, and LIMIT."
  />
</svelte:head>

<div class="lesson-head">
  <div>
    <a class="back" href="/learn/dbms">← DBMS</a>
    <span class="eyebrow">Flagship logical execution lab</span>
    <h1>SQL Query <span class="gradient">Pipeline</span></h1>
    <p>Inspect and replay every relation—without sending arbitrary SQL anywhere.</p>
  </div>
  <div class="score" aria-label="Learner score">
    <span>⚡ {progress.xp} XP</span>
  </div>
</div>

<section class="scenario-picker panel" aria-labelledby="scenario-heading">
  <div>
    <span class="eyebrow" id="scenario-heading">Curated HR scenario</span>
    <h2>{scenario.title}</h2>
    <p>{scenario.summary}</p>
  </div>
  <div class="scenario-tabs" role="tablist" aria-label="Query scenario">
    {#each QUERY_SCENARIOS as item}
      <button
        type="button"
        role="tab"
        aria-selected={scenario.id === item.id}
        class:selected={scenario.id === item.id}
        onclick={() => selectScenario(item.id)}
      >
        <strong>{item.title}</strong><span>{item.joinLabel}</span>
      </button>
    {/each}
  </div>
</section>

<div class="query-overview">
  <section class="query panel" aria-labelledby="query-heading">
    <div class="panel-head">
      <div>
        <span class="eyebrow">Read-only preset</span>
        <h2 id="query-heading">SQL query</h2>
      </div>
      <span class="safe-badge">Deterministic</span>
    </div>
    <pre><code>{scenario.sql}</code></pre>
    <p>
      ReplayCS evaluates a fixed in-memory dataset. This lab does not execute user-provided SQL.
    </p>
  </section>

  <section class="model-panel panel" aria-labelledby="models-heading">
    <span class="eyebrow">Two different ideas</span>
    <h2 id="models-heading">Logical order ≠ physical plan</h2>
    <div class="model-block logical-model">
      <strong>Logical teaching order</strong>
      <p>The clause-by-clause result defined by SQL semantics.</p>
      <div class="mini-pipeline" aria-label="Logical SQL processing order">
        {#each scenario.stages as stage}
          <span>{stage.operation}</span>
        {/each}
      </div>
    </div>
    <div class="model-block physical-model">
      <strong>Illustrative possible physical plan</strong>
      <p>An engine may push filters earlier or select different algorithms.</p>
      <ol>
        {#each scenario.physicalPlan as item}
          <li><b>{item.operator}</b><span>≈ {item.estimatedOutputRows} rows</span></li>
        {/each}
      </ol>
    </div>
    <p class="caveat">{scenario.physicalPlanCaveat}</p>
  </section>
</div>

<details class="sources panel" open>
  <summary>
    <span
      ><span class="eyebrow">Consistent dataset</span><strong>Inspect source tables</strong></span
    >
    <span>{scenario.sourceTables.reduce((total, table) => total + table.rows.length, 0)} rows</span>
  </summary>
  <div class="source-grid">
    {#each scenario.sourceTables as table}
      <section aria-labelledby={`source-${table.name}`}>
        <div class="table-heading">
          <div>
            <h3 id={`source-${table.name}`}>{table.name} <code>{table.alias}</code></h3>
            <p>{table.description}</p>
          </div>
          <span>{table.rows.length} rows</span>
        </div>
        <QueryTable rows={table.rows} caption={`${table.name} source table`} compact />
      </section>
    {/each}
  </div>
</details>

<nav class="pipeline" aria-label="Logical query stages">
  {#each scenario.stages as item, stageIndex}
    <button
      type="button"
      aria-current={stageIndex === index ? 'step' : undefined}
      class:active={stageIndex === index}
      class:done={stageIndex < index}
      onclick={() => jump(stageIndex)}
    >
      <span>{stageIndex + 1}</span>{item.operation}
    </button>
    {#if stageIndex < scenario.stages.length - 1}<i aria-hidden="true">→</i>{/if}
  {/each}
</nav>

<section class="trace panel" aria-labelledby="stage-heading">
  <div class="trace-head">
    <div>
      <span class="eyebrow">Logical stage {index + 1} of {scenario.stages.length}</span>
      <h2 id="stage-heading"><code>{currentStage.operation}</code> · {currentStage.title}</h2>
    </div>
    <div class="row-metric">
      <strong>{currentStage.rows.length}</strong><span>rows after</span>
      <small class:positive={rowsDelta > 0} class:negative={rowsDelta < 0}
        >{rowsDelta > 0 ? '+' : ''}{rowsDelta} from input</small
      >
    </div>
  </div>
  <p class="stage-description">{currentStage.description}</p>
  <div class="teaching-point">
    <span>Trace insight</span>
    <p>{currentStage.teachingPoint}</p>
  </div>

  <div class="relation-grid">
    <section aria-labelledby="before-heading">
      <div class="relation-heading">
        <div>
          <span>Before</span>
          <h3 id="before-heading">Rows entering {currentStage.operation}</h3>
        </div>
        <strong>{currentStage.rowsBefore.length}</strong>
      </div>
      <QueryTable
        rows={currentStage.rowsBefore}
        caption={`Rows before ${currentStage.operation}`}
      />
    </section>
    <div class="relation-arrow" aria-hidden="true"><span>{currentStage.operation}</span>→</div>
    <section aria-labelledby="after-heading">
      <div class="relation-heading">
        <div>
          <span>After</span>
          <h3 id="after-heading">Rows leaving {currentStage.operation}</h3>
        </div>
        <strong>{currentStage.rows.length}</strong>
      </div>
      <QueryTable
        rows={currentStage.rows}
        caption={`Rows after ${currentStage.operation}`}
        emptyMessage="This operation produced an empty relation."
      />
    </section>
  </div>

  <TraceControls
    {index}
    total={scenario.stages.length}
    {playing}
    onprevious={() => jump(index - 1)}
    onnext={() => jump(index + 1)}
    onrestart={restart}
    onplay={togglePlayback}
    onjump={jump}
  />
</section>

<section class="final-result panel" aria-labelledby="final-heading">
  <div class="final-head">
    <div>
      <span class="eyebrow">Final deterministic relation</span>
      <h2 id="final-heading">Query result</h2>
    </div>
    <span class="result-count">
      {finalStage.rows.length} row{finalStage.rows.length === 1 ? '' : 's'}
    </span>
  </div>
  <QueryTable rows={finalStage.rows} caption={`Final result for ${scenario.title}`} />
  {#if scenarioFinished}<p class="complete-message" role="status">
      ✓ Scenario complete. Progress saved locally.
    </p>{:else}<p class="finish-hint">
      {labComplete
        ? 'Reach LIMIT to complete this scenario. Lab completion XP is awarded once.'
        : 'Reach LIMIT to complete this scenario and earn 25 XP.'}
    </p>{/if}
</section>

<style>
  .lesson-head {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 1rem;
    margin-bottom: 1.2rem;
  }
  .lesson-head > div:first-child {
    display: grid;
    gap: 0.35rem;
  }
  .lesson-head h1 {
    margin: 0.15rem 0;
    font-size: clamp(2.7rem, 6vw, 4.8rem);
  }
  .lesson-head p,
  .scenario-picker p,
  .query > p,
  .model-block p,
  .table-heading p,
  .finish-hint {
    margin: 0;
    color: var(--muted);
    line-height: 1.55;
  }
  .back {
    width: fit-content;
    color: var(--primary);
    font-size: 0.85rem;
  }
  .score {
    display: flex;
    gap: 0.45rem;
  }
  .score span,
  .safe-badge,
  .result-count {
    padding: 0.48rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.75rem;
    white-space: nowrap;
  }
  .scenario-picker {
    display: grid;
    grid-template-columns: minmax(260px, 0.8fr) minmax(420px, 1.2fr);
    gap: 1.5rem;
    align-items: center;
    padding: 1rem;
    border-color: #fbbf2450;
  }
  .scenario-picker h2,
  .query h2,
  .model-panel h2,
  .final-head h2 {
    margin: 0.3rem 0;
    font-size: 1.35rem;
  }
  .scenario-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .scenario-tabs button {
    display: grid;
    gap: 0.3rem;
    text-align: left;
  }
  .scenario-tabs button span {
    color: var(--muted);
    font: 0.66rem var(--mono);
  }
  .scenario-tabs button.selected {
    color: #291b02;
    border-color: var(--warning);
    background: var(--warning);
  }
  .scenario-tabs button.selected span {
    color: #563b06;
  }
  .query-overview {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
    gap: 1rem;
    margin-top: 1rem;
  }
  .query,
  .model-panel {
    min-width: 0;
    padding: 1rem;
  }
  .panel-head,
  .final-head,
  .trace-head,
  .table-heading,
  .relation-heading {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 0.8rem;
  }
  .safe-badge {
    color: var(--success);
    border-color: #4ade8055;
  }
  .query pre {
    overflow: auto;
    margin: 0.8rem 0;
    padding: 0.85rem;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: #07111f;
    color: #f5d89f;
    font: 0.75rem/1.6 var(--mono);
  }
  .query > p {
    font-size: 0.72rem;
  }
  .model-block {
    margin-top: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 11px;
  }
  .model-block > strong {
    color: var(--primary);
  }
  .model-block > p {
    margin: 0.25rem 0 0.55rem;
    font-size: 0.75rem;
  }
  .mini-pipeline {
    display: flex;
    gap: 0.25rem;
    overflow: auto;
  }
  .mini-pipeline span {
    padding: 0.3rem 0.38rem;
    border-radius: 6px;
    background: #2dd4bf13;
    color: var(--primary);
    font: 600 0.57rem var(--mono);
    white-space: nowrap;
  }
  .physical-model {
    border-color: #9b7cff55;
  }
  .physical-model > strong {
    color: var(--secondary);
  }
  .physical-model ol {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding-left: 1.3rem;
  }
  .physical-model li {
    padding-left: 0.2rem;
    font-size: 0.7rem;
  }
  .physical-model li span {
    float: right;
    color: var(--muted);
  }
  .caveat {
    margin: 0.6rem 0 0;
    color: var(--warning);
    font-size: 0.67rem;
    line-height: 1.5;
  }
  .sources {
    margin-top: 1rem;
    padding: 0.2rem 1rem 1rem;
  }
  .sources summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 0;
    cursor: pointer;
  }
  .sources summary > span:first-child {
    display: grid;
    gap: 0.25rem;
  }
  .sources summary > span:last-child,
  .table-heading > span {
    color: var(--muted);
    font: 0.7rem var(--mono);
  }
  .source-grid {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 1rem;
  }
  .source-grid section {
    min-width: 0;
  }
  .table-heading {
    margin-bottom: 0.5rem;
  }
  .table-heading h3 {
    margin: 0;
    font-size: 1rem;
  }
  .table-heading h3 code {
    color: var(--warning);
  }
  .table-heading p {
    margin-top: 0.2rem;
    font-size: 0.68rem;
  }
  .pipeline {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin: 1.2rem 0 0.8rem;
    overflow: auto;
  }
  .pipeline button {
    display: flex;
    align-items: center;
    gap: 0.38rem;
    padding: 0.55rem 0.62rem;
    white-space: nowrap;
    font: 700 0.65rem var(--mono);
  }
  .pipeline button span {
    display: grid;
    width: 1.15rem;
    height: 1.15rem;
    place-items: center;
    border-radius: 50%;
    background: #ffffff0b;
    color: var(--muted);
    font-size: 0.58rem;
  }
  .pipeline button.active {
    color: #291b02;
    border-color: var(--warning);
    background: var(--warning);
  }
  .pipeline button.active span {
    color: white;
    background: #291b02;
  }
  .pipeline button.done {
    border-color: #4ade8066;
  }
  .pipeline i {
    color: var(--muted);
    font-style: normal;
  }
  .trace {
    padding: 1rem;
    border-color: #fbbf2455;
  }
  .trace-head h2 {
    margin: 0.35rem 0;
    font-size: clamp(1.4rem, 3vw, 2rem);
  }
  .trace-head h2 code {
    color: var(--warning);
    font-size: 0.8em;
  }
  .row-metric {
    display: grid;
    min-width: 110px;
    padding: 0.55rem;
    border: 1px solid var(--border);
    border-radius: 11px;
    text-align: right;
  }
  .row-metric strong {
    color: var(--warning);
    font-size: 1.35rem;
  }
  .row-metric span,
  .row-metric small {
    color: var(--muted);
    font-size: 0.62rem;
  }
  .row-metric small.positive {
    color: var(--accent);
  }
  .row-metric small.negative {
    color: var(--danger);
  }
  .stage-description {
    margin: 0.2rem 0 0.75rem;
    color: #dce7f5;
    line-height: 1.55;
  }
  .teaching-point {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    margin-bottom: 1rem;
    padding: 0.65rem 0.75rem;
    border-left: 3px solid var(--warning);
    background: #fbbf240a;
  }
  .teaching-point span {
    color: var(--warning);
    font: 700 0.65rem var(--mono);
    white-space: nowrap;
  }
  .teaching-point p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .relation-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    gap: 0.7rem;
    align-items: center;
  }
  .relation-grid > section {
    min-width: 0;
  }
  .relation-heading {
    margin-bottom: 0.45rem;
  }
  .relation-heading span {
    color: var(--muted);
    font: 0.6rem var(--mono);
    text-transform: uppercase;
  }
  .relation-heading h3 {
    margin: 0.15rem 0 0;
    font-size: 0.85rem;
  }
  .relation-heading > strong {
    color: var(--warning);
    font: 1.2rem var(--mono);
  }
  .relation-arrow {
    display: grid;
    place-items: center;
    color: var(--warning);
    font-size: 1.2rem;
  }
  .relation-arrow span {
    padding: 0.25rem;
    border-radius: 5px;
    background: #fbbf2411;
    font: 0.55rem var(--mono);
  }
  .trace :global(.controls) {
    margin-top: 0.8rem;
    border-radius: 12px;
    background: #07111f99;
  }
  .final-result {
    min-width: 0;
    padding: 1rem;
    margin-top: 1rem;
  }
  .result-count {
    color: var(--warning);
    border-color: #fbbf2455;
  }
  .complete-message,
  .finish-hint {
    margin: 0.7rem 0 0;
    font-size: 0.75rem;
  }
  .complete-message {
    color: var(--success);
  }
  @media (max-width: 960px) {
    .scenario-picker,
    .query-overview {
      grid-template-columns: 1fr;
    }
    .source-grid {
      grid-template-columns: 1fr;
    }
    .relation-grid {
      grid-template-columns: 1fr;
    }
    .relation-arrow {
      transform: rotate(90deg);
    }
  }
  @media (max-width: 700px) {
    .lesson-head {
      align-items: start;
    }
    .score {
      flex-direction: column;
    }
    .scenario-tabs {
      grid-template-columns: 1fr;
    }
    .trace-head {
      align-items: start;
    }
    .teaching-point {
      display: grid;
    }
  }
</style>
