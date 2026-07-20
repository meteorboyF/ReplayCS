<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import AssumptionPanel from './AssumptionPanel.svelte';
  import CaseComparison from './CaseComparison.svelte';
  import ComplexityDerivation from './ComplexityDerivation.svelte';
  import GrowthChart from './GrowthChart.svelte';
  import { COMPLEXITY_FAMILIES } from '$lib/complexity/catalog';
  import { CHARTABLE_COMPLEXITIES } from '$lib/complexity/growth';
  import type {
    ComplexityClass,
    OperationComplexityCase,
    OperationDefinition
  } from '$lib/complexity/types';
  import type { SupportedLanguage, TraceLesson, TraceStep, TraceValue } from '$lib/trace/types';

  type ExplorerMode =
    | 'overview'
    | 'visual-trace'
    | 'code-trace'
    | 'cases'
    | 'implementations'
    | 'derivation'
    | 'growth'
    | 'space'
    | 'challenge';

  const allModes: Array<{ id: ExplorerMode; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'visual-trace', label: 'Visual Trace' },
    { id: 'code-trace', label: 'Code Trace' },
    { id: 'cases', label: 'Cases' },
    { id: 'implementations', label: 'Implementations' },
    { id: 'derivation', label: 'Derivation' },
    { id: 'growth', label: 'Growth' },
    { id: 'space', label: 'Space' },
    { id: 'challenge', label: 'Challenge' }
  ];

  let {
    operation,
    tracesByCase,
    visualizer
  }: {
    operation: OperationDefinition;
    tracesByCase?: Readonly<Record<string, TraceLesson>>;
    visualizer?: Snippet<[TraceStep, Record<string, TraceValue>]>;
  } = $props();
  const instanceId = $props.id();

  let activeMode = $state<ExplorerMode>('overview');
  let selectedCaseId = $state('');
  let stepIndex = $state(0);
  let language = $state<SupportedLanguage>('python');
  let playing = $state(false);
  let challengeChoice = $state<ComplexityClass | ''>('');
  let challengeSubmitted = $state(false);
  let activeOperationId = $state('');
  let activeTraceId = $state('');
  let activeChallengeCaseId = $state('');
  let timer: ReturnType<typeof setInterval> | undefined;

  let selectedCase = $derived(
    operation.cases.find((complexityCase) => complexityCase.id === selectedCaseId) ??
      operation.cases[0]
  );
  let selectedTrace = $derived(tracesByCase?.[selectedCaseId]);
  let availableModes = $derived(
    allModes.filter(
      (mode) => (mode.id !== 'visual-trace' && mode.id !== 'code-trace') || Boolean(selectedTrace)
    )
  );
  let step = $derived(selectedTrace?.steps[stepIndex]);
  let growthClasses = $derived(
    [...new Set(operation.cases.map((item) => item.timeComplexity))].filter((item) =>
      CHARTABLE_COMPLEXITIES.includes(item)
    )
  );
  let growthFamilies = $derived(
    COMPLEXITY_FAMILIES.filter(
      (family) => family.chartable && growthClasses.includes(family.complexityClass)
    )
  );
  let challengeOptions = $derived(challengeChoices(selectedCase));

  $effect(() => {
    if (activeOperationId !== operation.id) {
      activeOperationId = operation.id;
      selectedCaseId = operation.cases[0]?.id ?? '';
      activeMode = 'overview';
    } else if (!operation.cases.some((item) => item.id === selectedCaseId)) {
      selectedCaseId = operation.cases[0]?.id ?? '';
    }
  });

  $effect(() => {
    const nextTraceId = selectedTrace?.id ?? '';
    if (activeTraceId !== nextTraceId) {
      activeTraceId = nextTraceId;
      stopPlayback();
      stepIndex = 0;
      const preferred = operation.supportedLanguages?.[0];
      const available = selectedTrace?.supportedLanguages ?? operation.supportedLanguages ?? [];
      language = available.includes(language) ? language : (preferred ?? available[0] ?? 'python');
    } else if (selectedTrace && stepIndex >= selectedTrace.steps.length) {
      stepIndex = Math.max(0, selectedTrace.steps.length - 1);
    }
  });

  $effect(() => {
    if (!availableModes.some((mode) => mode.id === activeMode)) activeMode = 'overview';
  });

  $effect(() => {
    const nextCaseId = selectedCase?.id ?? '';
    if (activeChallengeCaseId !== nextCaseId) {
      activeChallengeCaseId = nextCaseId;
      challengeChoice = '';
      challengeSubmitted = false;
    }
  });

  onMount(() => () => clearInterval(timer));

  function timeLabel(complexityCase: OperationComplexityCase | undefined) {
    if (!complexityCase) return 'Not classified';
    return complexityCase.timeComplexity === 'custom'
      ? (complexityCase.customTimeComplexity ?? 'Custom')
      : complexityCase.timeComplexity;
  }

  function selectCase(caseId: string) {
    selectedCaseId = caseId;
  }

  function stopPlayback() {
    playing = false;
    clearInterval(timer);
  }

  function jump(nextIndex: number) {
    if (!selectedTrace?.steps.length) return;
    stepIndex = Math.max(0, Math.min(nextIndex, selectedTrace.steps.length - 1));
    if (stepIndex === selectedTrace.steps.length - 1) stopPlayback();
  }

  function togglePlayback() {
    if (!selectedTrace?.steps.length) return;
    if (playing) {
      stopPlayback();
      return;
    }
    if (stepIndex === selectedTrace.steps.length - 1) stepIndex = 0;
    playing = true;
    timer = setInterval(() => {
      if (!selectedTrace || stepIndex >= selectedTrace.steps.length - 1) stopPlayback();
      else jump(stepIndex + 1);
    }, 950);
  }

  function selectMode(mode: ExplorerMode) {
    activeMode = mode;
  }

  function moveModeFocus(event: KeyboardEvent, currentMode: ExplorerMode) {
    const currentIndex = availableModes.findIndex((mode) => mode.id === currentMode);
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + availableModes.length) % availableModes.length;
        break;
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % availableModes.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = availableModes.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    activeMode = availableModes[nextIndex].id;
    const tablist = (event.currentTarget as HTMLButtonElement).closest('[role="tablist"]');
    tablist?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  }

  function challengeChoices(complexityCase: OperationComplexityCase | undefined) {
    const correct = complexityCase?.timeComplexity;
    const candidates: ComplexityClass[] = [
      ...(correct ? [correct] : []),
      'O(1)',
      'O(log n)',
      'O(n)',
      'O(n log n)',
      'O(n^2)'
    ];
    return [...new Set(candidates)].slice(0, 5);
  }
</script>

<section class="explorer panel" aria-label={`${operation.name} Operation Complexity Explorer`}>
  <header>
    <div>
      <span class="eyebrow">Operation Complexity Explorer · model v{operation.version}</span>
      <h3>{operation.name}</h3>
      <p>{operation.description}</p>
    </div>
    {#if selectedCase}
      <div class="headline-result" aria-label="Selected complexity result">
        <span>{selectedCase.caseType} case</span>
        <strong>{timeLabel(selectedCase)}</strong>
        <small>{selectedCase.auxiliarySpace} auxiliary space</small>
      </div>
    {/if}
  </header>

  <div class="mode-tabs" role="tablist" aria-label="Explorer modes" aria-orientation="horizontal">
    {#each availableModes as mode}
      <button
        type="button"
        role="tab"
        id={`${instanceId}-${mode.id}-tab`}
        aria-controls={`${instanceId}-explorer-panel`}
        aria-selected={activeMode === mode.id}
        tabindex={activeMode === mode.id ? 0 : -1}
        class:active={activeMode === mode.id}
        onclick={() => selectMode(mode.id)}
        onkeydown={(event) => moveModeFocus(event, mode.id)}
      >
        {mode.label}
      </button>
    {/each}
  </div>

  <div
    class="mode-panel"
    role="tabpanel"
    id={`${instanceId}-explorer-panel`}
    aria-labelledby={`${instanceId}-${activeMode}-tab`}
    tabindex="0"
  >
    {#if activeMode === 'overview'}
      <div class="overview-grid">
        <article>
          <span class="eyebrow">What this operation does</span>
          <h3>{selectedCase?.title ?? operation.name}</h3>
          <p>{selectedCase?.scenarioDescription ?? operation.description}</p>
          <dl class="result-grid">
            <div>
              <dt>Selected case</dt>
              <dd>{selectedCase?.caseType ?? '—'}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{timeLabel(selectedCase)}</dd>
            </div>
            <div>
              <dt>Auxiliary space</dt>
              <dd>{selectedCase?.auxiliarySpace ?? '—'}</dd>
            </div>
            <div>
              <dt>Counting model / bound</dt>
              <dd>{selectedCase?.exactCountFormula ?? 'Scenario-defined'}</dd>
            </div>
          </dl>
        </article>
        <AssumptionPanel assumptions={selectedCase?.assumptions ?? []} />
      </div>
    {:else if activeMode === 'visual-trace'}
      {#if selectedTrace && step}
        <div class="trace-heading">
          <div>
            <span class="eyebrow">Deterministic step {stepIndex + 1}</span>
            <h3>{step.title}</h3>
          </div>
          <span>{selectedTrace.title}</span>
        </div>
        {#if visualizer}
          {@render visualizer(step, step.stateAfter)}
        {:else}
          <div class="text-trace" aria-live="polite">
            <p>{step.deterministicExplanation}</p>
            <dl>
              {#each Object.entries(step.stateAfter) as [key, value]}
                <div>
                  <dt>{key}</dt>
                  <dd><code>{JSON.stringify(value)}</code></dd>
                </div>
              {/each}
            </dl>
          </div>
        {/if}
        <details class="state-transition">
          <summary>Inspect exact state before and after</summary>
          <div>
            <section aria-label="State before this step">
              <h4>Before</h4>
              <dl>
                {#each Object.entries(step.stateBefore) as [key, value]}
                  <div>
                    <dt>{key}</dt>
                    <dd><code>{JSON.stringify(value)}</code></dd>
                  </div>
                {/each}
              </dl>
            </section>
            <section aria-label="State after this step">
              <h4>After</h4>
              <dl>
                {#each Object.entries(step.stateAfter) as [key, value]}
                  <div>
                    <dt>{key}</dt>
                    <dd><code>{JSON.stringify(value)}</code></dd>
                  </div>
                {/each}
              </dl>
            </section>
          </div>
        </details>
        <TraceControls
          index={stepIndex}
          total={selectedTrace.steps.length}
          {playing}
          onprevious={() => jump(stepIndex - 1)}
          onnext={() => jump(stepIndex + 1)}
          onrestart={() => jump(0)}
          onplay={togglePlayback}
          onjump={jump}
        />
        <p class="step-explanation" aria-live="polite">{step.deterministicExplanation}</p>
        {#if step.complexityEvidence}
          <div class="work-evidence" aria-label="Operation work at this trace step">
            <div>
              <span>Work this step</span>
              <strong>{step.complexityEvidence.exactOperationCount}</strong>
            </div>
            <div>
              <span>Cumulative work</span>
              <strong>{step.complexityEvidence.cumulativeOperationCount}</strong>
            </div>
            <div>
              <span>Step primitives</span>
              <strong
                >{Object.entries(step.complexityEvidence.stepWork)
                  .map(([metric, count]) => `${metric}: ${count}`)
                  .join(' · ') || 'No counted work'}</strong
              >
            </div>
            <div>
              <span>Auxiliary peak</span>
              <strong
                >{step.complexityEvidence.space.auxiliary.peak}
                {step.complexityEvidence.space.auxiliary.unit}</strong
              >
            </div>
          </div>
        {/if}
      {/if}
    {:else if activeMode === 'code-trace'}
      {#if selectedTrace && step}
        <CodePane
          source={selectedTrace.sourceByLanguage}
          {language}
          activeSemantic={step.semanticOperationId}
          onlanguage={(nextLanguage) => (language = nextLanguage)}
        />
        <TraceControls
          index={stepIndex}
          total={selectedTrace.steps.length}
          {playing}
          onprevious={() => jump(stepIndex - 1)}
          onnext={() => jump(stepIndex + 1)}
          onrestart={() => jump(0)}
          onplay={togglePlayback}
          onjump={jump}
        />
        <p class="step-explanation" aria-live="polite">
          <strong>{step.title}:</strong>
          {step.deterministicExplanation}
        </p>
        {#if step.complexityEvidence}
          <div class="work-evidence compact" aria-label="Operation work at this source line">
            <div>
              <span>Line work</span>
              <strong>{step.complexityEvidence.exactOperationCount}</strong>
            </div>
            <div>
              <span>Cumulative work</span>
              <strong>{step.complexityEvidence.cumulativeOperationCount}</strong>
            </div>
            <div>
              <span>Primitive counts</span>
              <strong
                >{Object.entries(step.complexityEvidence.cumulativeWork)
                  .map(([metric, count]) => `${metric}: ${count}`)
                  .join(' · ') || 'No counted work yet'}</strong
              >
            </div>
          </div>
        {/if}
      {/if}
    {:else if activeMode === 'cases'}
      <CaseComparison {operation} {selectedCaseId} onselect={selectCase} />
    {:else if activeMode === 'implementations'}
      <div class="variant-grid">
        {#each operation.variants as variant}
          {@const variantCases = operation.cases.filter(
            (complexityCase) => complexityCase.implementationVariant === variant
          )}
          <article class:selected={selectedCase?.implementationVariant === variant}>
            <span class="eyebrow">Implementation choice</span>
            <h3>{variant}</h3>
            {#if variantCases.length}
              <ul>
                {#each variantCases as complexityCase}
                  <li>
                    <button type="button" onclick={() => selectCase(complexityCase.id)}>
                      <span>{complexityCase.title}</span><code>{timeLabel(complexityCase)}</code>
                    </button>
                  </li>
                {/each}
              </ul>
            {:else}
              <p>No authored complexity case is connected to this variant yet.</p>
            {/if}
          </article>
        {:else}
          <p class="empty">No implementation variants have been authored.</p>
        {/each}
      </div>
    {:else if activeMode === 'derivation'}
      <ComplexityDerivation
        steps={selectedCase?.derivationSteps ?? []}
        exactCountFormula={selectedCase?.exactCountFormula}
        timeComplexity={timeLabel(selectedCase)}
      />
    {:else if activeMode === 'growth'}
      {#key operation.id}
        <GrowthChart
          families={growthFamilies.length
            ? growthFamilies
            : COMPLEXITY_FAMILIES.filter((family) =>
                ['O(1)', 'O(n)'].includes(family.complexityClass)
              )}
          initialInputSize={Number(selectedCase?.inputPreset.n ?? 16)}
        />
      {/key}
    {:else if activeMode === 'space'}
      <div class="space-layout">
        <article class="space-result">
          <span class="eyebrow">Auxiliary memory</span>
          <strong>{selectedCase?.auxiliarySpace ?? 'Not classified'}</strong>
          <p>
            Auxiliary space counts temporary working memory. It is separate from input storage and
            output that the operation must produce.
          </p>
        </article>
        <AssumptionPanel
          assumptions={selectedCase?.assumptions ?? []}
          title="Space-model assumptions"
        />
        <div class="space-cases">
          {#each operation.cases as complexityCase}
            <button
              type="button"
              class:selected={complexityCase.id === selectedCase?.id}
              onclick={() => selectCase(complexityCase.id)}
            >
              <span>{complexityCase.title}</span>
              <code>{complexityCase.auxiliarySpace}</code>
            </button>
          {/each}
        </div>
      </div>
    {:else if activeMode === 'challenge'}
      {#if selectedCase}
        <section class="challenge" aria-label="Complexity prediction challenge">
          <span class="eyebrow">Predict before checking</span>
          <h3>What is the time complexity for “{selectedCase.title}”?</h3>
          <p>{selectedCase.scenarioDescription}</p>
          <fieldset disabled={challengeSubmitted}>
            <legend>Choose one complexity class</legend>
            {#each challengeOptions as option}
              <label>
                <input type="radio" bind:group={challengeChoice} value={option} />
                {option === 'custom' ? (selectedCase.customTimeComplexity ?? 'Custom') : option}
              </label>
            {/each}
          </fieldset>
          <button
            type="button"
            class="primary"
            disabled={!challengeChoice || challengeSubmitted}
            onclick={() => (challengeSubmitted = true)}>Check prediction</button
          >
          {#if challengeSubmitted}
            <div
              class:correct={challengeChoice === selectedCase.timeComplexity}
              class="challenge-feedback"
              role="status"
              aria-live="polite"
            >
              <strong
                >{challengeChoice === selectedCase.timeComplexity
                  ? 'Correct.'
                  : `Not yet — the deterministic classification is ${timeLabel(selectedCase)}.`}</strong
              >
              <p>{selectedCase.derivationSteps[0] ?? selectedCase.scenarioDescription}</p>
              <button
                type="button"
                onclick={() => {
                  challengeChoice = '';
                  challengeSubmitted = false;
                }}>Try again</button
              >
            </div>
          {/if}
        </section>
      {:else}
        <p class="empty">Add a deterministic case before publishing a challenge.</p>
      {/if}
    {/if}
  </div>
</section>

<style>
  .explorer {
    overflow: hidden;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
    padding: 1.2rem;
  }
  header > div > h3 {
    margin: 0.3rem 0;
    font-size: clamp(1.8rem, 4vw, 2.7rem);
  }
  header p {
    max-width: 700px;
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
  }
  .headline-result {
    display: grid;
    gap: 0.2rem;
    flex: none;
    min-width: 150px;
    padding: 0.75rem;
    border: 1px solid #2dd4bf55;
    border-radius: 13px;
    background: #2dd4bf0b;
  }
  .headline-result span,
  .headline-result small {
    color: var(--muted);
    font-size: 0.68rem;
    text-transform: capitalize;
  }
  .headline-result strong {
    color: var(--primary);
    font: 1.15rem var(--mono);
  }
  .mode-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.65rem 1rem;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: #07111f55;
    overflow-x: auto;
  }
  .mode-tabs button {
    flex: none;
    padding: 0.5rem 0.65rem;
    border-color: transparent;
    background: transparent;
    color: var(--muted);
    font-size: 0.73rem;
  }
  .mode-tabs button.active {
    border-color: var(--primary);
    background: #2dd4bf10;
    color: var(--primary);
  }
  .mode-panel {
    min-height: 360px;
    padding: 1.2rem;
  }
  .mode-panel:focus {
    outline: none;
  }
  .mode-panel:focus-visible {
    outline: 3px solid var(--accent);
    outline-offset: -4px;
  }
  .overview-grid,
  .space-layout {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 1rem;
  }
  .overview-grid article > h3 {
    margin: 0.35rem 0;
    font-size: 1.5rem;
  }
  .overview-grid article > p,
  .space-result p {
    color: var(--muted);
    line-height: 1.6;
  }
  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem;
    margin-top: 1rem;
  }
  .result-grid div {
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #07111f77;
  }
  dt {
    color: var(--muted);
    font-size: 0.67rem;
    text-transform: uppercase;
  }
  dd {
    margin: 0.25rem 0 0;
    color: var(--primary);
    font: 0.82rem/1.4 var(--mono);
  }
  .trace-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.8rem;
  }
  .trace-heading h3 {
    margin: 0.25rem 0 0;
  }
  .trace-heading > span {
    color: var(--muted);
    font-size: 0.75rem;
  }
  .text-trace {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: #07111f77;
  }
  .text-trace > p {
    line-height: 1.6;
  }
  .text-trace dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.45rem;
  }
  .text-trace dl div {
    min-width: 0;
    padding: 0.55rem;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .text-trace dd {
    overflow-wrap: anywhere;
  }
  .state-transition {
    margin-top: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #07111f55;
  }
  .state-transition summary {
    padding: 0.7rem;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 750;
  }
  .state-transition > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
    padding: 0 0.7rem 0.7rem;
  }
  .state-transition section {
    min-width: 0;
    padding: 0.65rem;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .state-transition h4 {
    margin: 0 0 0.5rem;
  }
  .state-transition dl {
    display: grid;
    gap: 0.35rem;
    margin: 0;
  }
  .state-transition dl div {
    display: grid;
    grid-template-columns: minmax(70px, 0.35fr) minmax(0, 1fr);
    gap: 0.45rem;
  }
  .state-transition dd {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .step-explanation {
    padding: 0.75rem;
    border-left: 3px solid var(--primary);
    background: #2dd4bf09;
    line-height: 1.55;
  }
  .work-evidence {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
    margin-top: 0.8rem;
  }
  .work-evidence.compact {
    grid-template-columns: 0.65fr 0.8fr 2fr;
  }
  .work-evidence > div {
    display: grid;
    gap: 0.3rem;
    min-width: 0;
    padding: 0.7rem;
    border: 1px solid #2dd4bf45;
    border-radius: 10px;
    background: #2dd4bf08;
  }
  .work-evidence span {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .work-evidence strong {
    overflow-wrap: anywhere;
    color: var(--primary);
    font: 750 0.78rem/1.4 var(--mono);
    text-transform: capitalize;
  }
  .variant-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 0.8rem;
  }
  .variant-grid article {
    padding: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: #07111f66;
  }
  .variant-grid article.selected {
    border-color: #2dd4bf77;
  }
  .variant-grid h3 {
    font-size: 1rem;
  }
  .variant-grid ul {
    list-style: none;
    margin: 0.7rem 0 0;
    padding: 0;
  }
  .variant-grid li + li {
    margin-top: 0.4rem;
  }
  .variant-grid li button,
  .space-cases button {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    width: 100%;
    text-align: left;
  }
  .variant-grid code,
  .space-cases code {
    color: var(--primary);
    white-space: nowrap;
  }
  .variant-grid article > p,
  .empty {
    color: var(--muted);
  }
  .space-result {
    padding: 1rem;
    border: 1px solid #9b7cff55;
    border-radius: 13px;
    background: #9b7cff08;
  }
  .space-result strong {
    display: block;
    margin-top: 0.7rem;
    color: var(--secondary);
    font: 2rem var(--mono);
  }
  .space-cases {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.5rem;
  }
  .space-cases button.selected {
    border-color: var(--primary);
    background: #2dd4bf0e;
  }
  .challenge {
    max-width: 760px;
    margin: auto;
    padding: 1rem;
    border: 1px solid #fbbf2455;
    border-radius: 14px;
    background: #fbbf2407;
  }
  .challenge h3 {
    font-size: 1.35rem;
  }
  .challenge > p {
    color: var(--muted);
    line-height: 1.6;
  }
  .challenge fieldset {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.5rem;
    margin: 1rem 0;
    padding: 0;
    border: 0;
  }
  .challenge legend {
    grid-column: 1 / -1;
    margin-bottom: 0.35rem;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .challenge label {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.65rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #07111f88;
    font: 0.8rem var(--mono);
  }
  .challenge input {
    accent-color: var(--primary);
  }
  .challenge-feedback {
    margin-top: 0.8rem;
    padding: 0.8rem;
    border: 1px solid var(--danger);
    border-radius: 10px;
    color: var(--danger);
  }
  .challenge-feedback.correct {
    border-color: var(--success);
    color: var(--success);
  }
  .challenge-feedback p {
    color: var(--text);
  }
  @media (max-width: 720px) {
    header,
    .overview-grid,
    .space-layout {
      grid-template-columns: 1fr;
    }
    header {
      flex-direction: column;
    }
    .headline-result {
      width: 100%;
    }
    .result-grid,
    .text-trace dl,
    .state-transition > div,
    .work-evidence,
    .work-evidence.compact {
      grid-template-columns: 1fr;
    }
    .mode-panel {
      padding: 0.9rem;
    }
  }
</style>
