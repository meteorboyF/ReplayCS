<script lang="ts">
  import { onMount } from 'svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import {
    SORTING_ALGORITHMS,
    createSortingTrace,
    validateSortingInput,
    type SortingAlgorithm,
    type SortingTrace
  } from '$lib/engines/dsa/sorting';
  import { SORTING_SOURCE, sortingSemanticFor } from '$lib/engines/dsa/sortingSource';
  import {
    completeLesson,
    loadProgress,
    recordLanguageUse,
    saveProgress
  } from '$lib/progress/store';
  import type { SupportedLanguage } from '$lib/trace/types';

  const algorithmOrder: SortingAlgorithm[] = [
    'bubble',
    'selection',
    'insertion',
    'merge',
    'quick',
    'heap',
    'counting',
    'radix'
  ];
  const initialValues = [7, 3, 5, 2, 9, 1];

  let algorithm = $state<SortingAlgorithm>('bubble');
  let input = $state(initialValues.join(', '));
  let inputError = $state('');
  let trace = $state<SortingTrace>(createSortingTrace('bubble', initialValues));
  let index = $state(0);
  let playing = $state(false);
  let progress = $state(loadProgress());
  let language = $state<SupportedLanguage>('cpp');
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(trace.steps[index]);
  let info = $derived(SORTING_ALGORITHMS[algorithm]);
  let completed = $derived(progress.completed.includes('sorting-arena'));
  // The active source line follows the current step's event across all four languages.
  let activeSemantic = $derived(sortingSemanticFor(step.event));

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    return () => clearInterval(timer);
  });

  // Switching language never touches the trace, step, counters, or playback.
  function selectLanguage(next: SupportedLanguage) {
    language = next;
    progress = recordLanguageUse(progress, next);
    saveProgress(progress);
  }

  function stopPlayback() {
    playing = false;
    clearInterval(timer);
  }

  function rebuild(nextAlgorithm: SortingAlgorithm, values: readonly number[]) {
    stopPlayback();
    try {
      trace = createSortingTrace(nextAlgorithm, values);
      algorithm = nextAlgorithm;
      inputError = '';
      index = 0;
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'ReplayCS could not build that trace.';
    }
  }

  function chooseAlgorithm(nextAlgorithm: SortingAlgorithm) {
    if (nextAlgorithm === algorithm) return;
    rebuild(nextAlgorithm, trace.input);
  }

  function applyInput(event: SubmitEvent) {
    event.preventDefault();
    const result = validateSortingInput(input);
    if (!result.valid) {
      inputError = result.error;
      return;
    }
    inputError = '';
    input = result.values.join(', ');
    rebuild(algorithm, result.values);
  }

  function jump(nextIndex: number) {
    index = Math.max(0, Math.min(nextIndex, trace.steps.length - 1));
    if (index === trace.steps.length - 1) {
      stopPlayback();
      progress = completeLesson(progress, 'sorting-arena');
      saveProgress(progress);
    }
  }

  function restart() {
    stopPlayback();
    index = 0;
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback();
      return;
    }
    if (index === trace.steps.length - 1) index = 0;
    playing = true;
    timer = setInterval(() => {
      if (index >= trace.steps.length - 1) stopPlayback();
      else jump(index + 1);
    }, 900);
  }
</script>

<svelte:head>
  <title>Sorting Arena · ReplayCS</title>
  <meta
    name="description"
    content="Step through eight sorting algorithms with synchronized C, C++, Java, and Python source and deterministic operation counts."
  />
</svelte:head>

<div class="lesson-head">
  <div>
    <a href="/learn/dsa-1" class="back">← DSA I</a>
    <span class="eyebrow">Interactive execution lab</span>
    <h1>Sorting <span class="gradient">Arena</span></h1>
    <p>Run the same values through three classic algorithms and inspect every operation.</p>
  </div>
  {#if completed}
    <div class="status-pill"><span class="status-dot"></span> Mastery saved</div>
  {/if}
</div>

<section class="setup panel" aria-labelledby="algorithm-heading">
  <div>
    <span class="eyebrow" id="algorithm-heading">Choose an algorithm</span>
    <div class="algorithm-tabs" role="tablist" aria-label="Sorting algorithm">
      {#each algorithmOrder as option}
        <button
          type="button"
          role="tab"
          aria-selected={algorithm === option}
          class:selected={algorithm === option}
          onclick={() => chooseAlgorithm(option)}
        >
          {SORTING_ALGORITHMS[option].shortName}
        </button>
      {/each}
    </div>
  </div>
  <form onsubmit={applyInput} novalidate>
    <label for="sorting-values">Values <span>2–10 integers</span></label>
    <div class="input-row">
      <input
        id="sorting-values"
        bind:value={input}
        aria-invalid={inputError ? 'true' : 'false'}
        aria-describedby={inputError ? 'input-error' : 'input-hint'}
        oninput={() => (inputError = '')}
      />
      <button class="primary" type="submit">Build trace</button>
    </div>
    {#if inputError}
      <p class="error" id="input-error" role="alert">{inputError}</p>
    {:else}
      <p class="hint" id="input-hint">Try negatives and duplicate values too.</p>
    {/if}
  </form>
</section>

<div class="arena-grid">
  <div class="code-column">
    <CodePane
      source={SORTING_SOURCE[algorithm]}
      {language}
      {activeSemantic}
      onlanguage={selectLanguage}
    />
  </div>

  <section class="stage panel" aria-labelledby="stage-title">
    <div class="stage-head">
      <div>
        <span class="event">{step.event.replace('-', ' ')}</span>
        <h2 id="stage-title">{step.title}</h2>
      </div>
      <span class="step-count">Step {index + 1} of {trace.steps.length}</span>
    </div>

    <div class="array" role="list" aria-label={`Current ${info.name} array state`}>
      {#each step.values as value, cellIndex}
        <div
          class="cell"
          class:active={step.activeIndices.includes(cellIndex)}
          class:sorted={step.sortedIndices.includes(cellIndex)}
          role="listitem"
          aria-label={`Index ${cellIndex}: ${value}${step.activeIndices.includes(cellIndex) ? ', active' : ''}${step.sortedIndices.includes(cellIndex) ? ', sorted region' : ''}`}
        >
          <span class="value">{value}</span>
          <span class="cell-index">[{cellIndex}]</span>
        </div>
      {/each}
    </div>

    {#if step.auxiliary?.length}
      <div class="auxiliary" aria-label="Auxiliary arrays">
        {#each step.auxiliary as view}
          <div class="aux-row">
            <span>{view.label}</span>
            <div class="aux-values">
              {#each view.values as auxValue, auxIndex}
                <code class:aux-active={view.highlight?.includes(auxIndex)}
                  >{auxValue === null ? '·' : auxValue}</code
                >
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="legend" aria-label="Visualization legend">
      <span><i class="active-key"></i> Active indices</span>
      <span><i class="sorted-key"></i> Sorted region</span>
    </div>

    <div class="metrics" aria-label="Operation counters">
      <div><span>Pass</span><strong>{step.metrics.pass}</strong></div>
      <div><span>Comparisons</span><strong>{step.metrics.comparisons}</strong></div>
      <div><span>Writes</span><strong>{step.metrics.writes}</strong></div>
      <div><span>Swaps</span><strong>{step.metrics.swaps}</strong></div>
    </div>

    <TraceControls
      {index}
      total={trace.steps.length}
      {playing}
      onprevious={() => jump(index - 1)}
      onnext={() => jump(index + 1)}
      onrestart={restart}
      onplay={togglePlayback}
      onjump={jump}
    />
  </section>

  <aside class="side-column">
    <section class="explanation panel">
      <span class="eyebrow">What just happened?</span>
      <p>{step.explanation}</p>
      <dl>
        <div>
          <dt>Active</dt>
          <dd>{step.activeIndices.length ? step.activeIndices.join(', ') : 'None'}</dd>
        </div>
        <div>
          <dt>Sorted</dt>
          <dd>{step.sortedIndices.length} / {step.values.length}</dd>
        </div>
      </dl>
    </section>

    <section class="facts panel">
      <div class="facts-title">
        <div>
          <span class="eyebrow">Algorithm profile</span>
          <h3>{info.name}</h3>
        </div>
        <div class="badges">
          <span class:stable={info.stable} class:unstable={!info.stable}>
            {info.stable ? 'Stable' : 'Unstable'}
          </span>
          <span class:stable={info.inPlace} class:unstable={!info.inPlace}>
            {info.inPlace ? 'In-place' : 'Not in-place'}
          </span>
        </div>
      </div>
      <p>{info.description}</p>
      <p class="stability-note">{info.stabilityReason}</p>
      <p class="stability-note">{info.inPlaceReason}</p>
      <div class="complexity">
        <div><span>Best</span><code>{info.complexity.best}</code></div>
        <div><span>Average</span><code>{info.complexity.average}</code></div>
        <div><span>Worst</span><code>{info.complexity.worst}</code></div>
        <div><span>Space</span><code>{info.complexity.space}</code></div>
      </div>
    </section>
  </aside>
</div>

<style>
  .lesson-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }
  .lesson-head > div:first-child {
    display: grid;
    gap: 0.35rem;
  }
  .lesson-head h1 {
    margin: 0.15rem 0;
    font-size: clamp(2.6rem, 6vw, 4.8rem);
  }
  .lesson-head p,
  .facts p {
    margin: 0;
    color: var(--muted);
    line-height: 1.55;
  }
  .back {
    color: var(--primary);
    font-size: 0.85rem;
    width: fit-content;
  }
  .status-pill {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    white-space: nowrap;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.8rem;
  }
  .status-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--success);
    box-shadow: 0 0 12px var(--success);
  }
  .setup {
    display: grid;
    grid-template-columns: auto minmax(300px, 1fr);
    align-items: end;
    gap: 2rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  .algorithm-tabs,
  .input-row {
    display: flex;
    gap: 0.45rem;
  }
  .algorithm-tabs {
    margin-top: 0.55rem;
  }
  .algorithm-tabs button {
    padding-inline: 1.1rem;
  }
  .algorithm-tabs button.selected {
    color: var(--primary-contrast);
    border-color: var(--primary);
    background: var(--primary);
    font-weight: 800;
  }
  form label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    font-weight: 700;
  }
  form label span,
  .hint {
    color: var(--muted);
    font-weight: 400;
  }
  .input-row input {
    min-width: 0;
    flex: 1;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font: 0.9rem var(--mono);
  }
  .input-row input[aria-invalid='true'] {
    border-color: var(--danger);
  }
  .hint,
  .error {
    margin: 0.35rem 0 0;
    font-size: 0.75rem;
  }
  .error {
    color: var(--danger);
  }
  .arena-grid {
    display: grid;
    grid-template-columns: minmax(280px, 0.85fr) minmax(340px, 1.5fr) minmax(240px, 0.7fr);
    gap: 1rem;
    align-items: start;
  }
  .code-column {
    min-width: 0;
    position: sticky;
    top: 0.5rem;
  }
  .code-column :global(.code-panel) {
    max-height: 78vh;
  }
  .stage {
    min-width: 0;
    padding: 1.2rem;
  }
  .stage-head,
  .facts-title {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
  }
  .badges {
    display: grid;
    gap: 0.3rem;
    justify-items: end;
  }
  .auxiliary {
    display: grid;
    gap: 0.4rem;
    margin: 0.7rem 0 0.2rem;
    padding: 0.6rem;
    border: 1px dashed var(--border);
    border-radius: 10px;
  }
  .aux-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .aux-row > span {
    min-width: 110px;
    color: var(--muted);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .aux-values {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  .aux-values code {
    min-width: 30px;
    padding: 0.2rem 0.3rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    text-align: center;
    color: var(--text);
    font-size: 0.72rem;
  }
  .aux-values code.aux-active {
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 8%, transparent);
  }
  .stage h2 {
    margin: 0.35rem 0 0;
    font-size: clamp(1.35rem, 3vw, 2rem);
  }
  .event {
    display: inline-flex;
    color: var(--accent);
    font: 700 0.7rem var(--mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .step-count {
    color: var(--muted);
    font: 0.75rem var(--mono);
    white-space: nowrap;
  }
  .array {
    display: flex;
    justify-content: center;
    gap: clamp(0.25rem, 1vw, 0.6rem);
    margin: 3rem 0 1.2rem;
    min-height: 92px;
  }
  .cell {
    flex: 1 1 54px;
    max-width: 82px;
    min-width: 42px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.35rem;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: var(--bg);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background 180ms ease;
  }
  .cell.sorted {
    border-color: color-mix(in srgb, var(--success) 47%, transparent);
    background: color-mix(in srgb, var(--success) 7%, transparent);
  }
  .cell.active {
    z-index: 1;
    border-color: var(--warning);
    background: color-mix(in srgb, var(--warning) 9%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning) 10%, transparent);
    transform: translateY(-8px);
  }
  .value {
    font: 800 clamp(1rem, 3vw, 1.55rem) var(--mono);
  }
  .cell-index {
    color: var(--muted);
    font: 0.68rem var(--mono);
  }
  .legend {
    display: flex;
    justify-content: center;
    gap: 1rem;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .legend span {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .legend i {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
  }
  .active-key {
    background: var(--warning);
  }
  .sorted-key {
    background: var(--success);
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.55rem;
    margin: 1.5rem 0 0.8rem;
  }
  .metrics div {
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: var(--bg);
  }
  .metrics span,
  .complexity span {
    display: block;
    color: var(--muted);
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }
  .metrics strong {
    display: block;
    margin-top: 0.25rem;
    color: var(--primary);
    font: 800 1.25rem var(--mono);
  }
  .side-column {
    display: grid;
    gap: 1rem;
  }
  .explanation,
  .facts {
    padding: 1rem;
  }
  .explanation > p {
    margin: 0.65rem 0 1rem;
    color: var(--text);
    line-height: 1.6;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 0;
  }
  dl div {
    padding: 0.65rem;
    border-radius: 9px;
    background: var(--bg);
  }
  dt {
    color: var(--muted);
    font-size: 0.68rem;
    text-transform: uppercase;
  }
  dd {
    margin: 0.2rem 0 0;
    font: 700 0.85rem var(--mono);
  }
  .facts h3 {
    margin: 0.35rem 0 0;
  }
  .stable,
  .unstable {
    padding: 0.3rem 0.5rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 800;
  }
  .stable {
    color: var(--success);
    background: color-mix(in srgb, var(--success) 8%, transparent);
  }
  .unstable {
    color: var(--warning);
    background: color-mix(in srgb, var(--warning) 8%, transparent);
  }
  .stability-note {
    padding: 0.8rem 0;
    font-size: 0.78rem;
  }
  .complexity {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }
  .complexity div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem;
    border: 1px solid var(--border);
    border-radius: 9px;
  }
  .complexity code {
    color: var(--primary);
  }
  @media (max-width: 1100px) {
    .setup {
      grid-template-columns: 1fr;
    }
    .arena-grid {
      grid-template-columns: minmax(0, 1fr) minmax(240px, 0.7fr);
    }
    .code-column {
      grid-column: 1 / -1;
      position: static;
    }
    .code-column :global(.code-panel) {
      max-height: 42vh;
    }
  }
  @media (max-width: 900px) {
    .setup,
    .arena-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 600px) {
    .lesson-head {
      align-items: start;
      flex-direction: column;
    }
    .algorithm-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
    }
    .input-row {
      flex-direction: column;
    }
    .array {
      justify-content: start;
      overflow-x: auto;
      padding: 0.75rem 0;
    }
    .cell {
      flex-basis: 54px;
      min-width: 54px;
    }
    .metrics {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
