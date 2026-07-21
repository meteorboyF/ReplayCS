<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import SearchVisualizer from '$lib/components/visualizers/SearchVisualizer.svelte';
  import {
    DEFAULT_SEARCHING_CONFIG,
    SEARCH_STRATEGIES,
    comparisonScoreboard,
    createSearchingLesson,
    type SearchStrategy,
    type SearchingConfig
  } from '$lib/engines/dsa/searching';
  import {
    awardPrediction,
    awardRecovery,
    completeLesson,
    loadProgress,
    recordHint,
    recordLanguageUse,
    recordMisconception,
    saveProgress
  } from '$lib/progress/store';
  import type { MisconceptionTag } from '$lib/progress/misconceptions';
  import type { StepContext } from '$lib/server/openai/schemas';
  import type { SupportedLanguage, TraceValue } from '$lib/trace/types';

  type MistakeMetadata = {
    prompt: string;
    wrongAnswer: string;
    correctAnswer: string;
    explanation: string;
    tag: MisconceptionTag;
    variableLabel?: string;
    stateKey?: string;
    recoveryPrompt?: string;
  };

  const operationCompletionKeys: string[] = SEARCH_STRATEGIES.map((item) => item.id);
  const operationCount = operationCompletionKeys.length;
  const complexityRows = [
    ['Linear Search', 'Best — match at index 0', 'O(1)', 'O(1)'],
    ['Linear Search', 'Average / worst — unsorted scan', 'O(n)', 'O(1)'],
    ['Binary Search (iterative)', 'Sorted; halving loop', 'O(log n)', 'O(1)'],
    ['Binary Search (recursive)', 'Sorted; one frame per halving', 'O(log n)', 'O(log n)'],
    ['BST Search', 'Balanced tree', 'O(log n)', 'O(1)'],
    ['BST Search', 'Degenerate (skewed) tree', 'O(n)', 'O(1)'],
    ['Hash Lookup', 'Expected — uniform hashing', 'O(1)', 'O(1)'],
    ['Hash Lookup', 'Worst — every key collides', 'O(n)', 'O(1)']
  ];
  const mistakeClinic = [
    ['loop-boundary', 'Miscounting the halvings', 'binary-iterative'],
    ['recursive-base-case', 'Recursion is free (it is not)', 'binary-recursive'],
    ['hash-vs-bucket', 'Searching for the bucket', 'hash'],
    ['off-by-one', 'Off-by-one comparison counts', 'linear']
  ] as const;

  let strategy = $state<SearchStrategy>(DEFAULT_SEARCHING_CONFIG.strategy);
  let valuesText = $state(DEFAULT_SEARCHING_CONFIG.values.join(', '));
  let target = $state(DEFAULT_SEARCHING_CONFIG.target ?? 23);
  let lesson = $state(createSearchingLesson(config()));
  let index = $state(0);
  let language = $state<SupportedLanguage>('cpp');
  let playing = $state(false);
  let submitted = $state<string[]>([]);
  let mistake = $state<MistakeAttempt | null>(null);
  let progress = $state(loadProgress());
  let completedOperations = $state<string[]>([]);
  let inputError = $state('');
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(lesson.steps[index]);
  let predictionResolved = $derived(!step.prediction || submitted.includes(step.prediction.id));
  let visibleState = $derived(
    step.prediction && !predictionResolved ? step.stateBefore : step.stateAfter
  );
  let finalEvidence = $derived(lesson.steps[lesson.steps.length - 1]?.complexityEvidence);
  let masteryPercent = $derived(Math.round((completedOperations.length / operationCount) * 100));
  let strategyMetadata = $derived(
    SEARCH_STRATEGIES.find((candidate) => candidate.id === strategy) ?? SEARCH_STRATEGIES[0]
  );
  let scoreboard = $derived.by(() => {
    try {
      return comparisonScoreboard(parseValues(false), target);
    } catch {
      return null;
    }
  });
  let currentMistake = $derived(mistake?.stepId === step.id ? mistake : null);

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem('replaycs-search-strategies') ?? '[]'
      );
      completedOperations = [
        ...new Set(
          (Array.isArray(stored) ? stored : []).filter(
            (value: unknown): value is string =>
              typeof value === 'string' && operationCompletionKeys.includes(value)
          )
        )
      ];
    } catch {
      completedOperations = [];
    }
    return () => clearInterval(timer);
  });

  function config(): SearchingConfig {
    return { strategy, values: parseValues(false), target };
  }

  function parseValues(validate = true) {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (
      pieces.some((value) => value === '' || !/^\d+$/.test(value)) ||
      pieces.length < 2 ||
      pieces.length > 10
    ) {
      if (validate) inputError = 'Enter 2–10 comma-separated non-negative whole numbers.';
      return [...DEFAULT_SEARCHING_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value))) {
      if (validate) inputError = 'Each value must be a safe whole number.';
      return [...DEFAULT_SEARCHING_CONFIG.values];
    }
    return values;
  }

  function buildTrace() {
    inputError = '';
    const values = parseValues();
    if (inputError) return;
    try {
      lesson = createSearchingLesson({ strategy, values, target });
      index = 0;
      submitted = [];
      mistake = null;
      playing = false;
      clearInterval(timer);
      inputError = '';
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'ReplayCS could not build that trace.';
    }
  }

  function chooseStrategy(next: SearchStrategy) {
    strategy = next;
    inputError = '';
    buildTrace();
  }

  function chooseClinicStrategy(next: string) {
    const match = SEARCH_STRATEGIES.find((candidate) => candidate.id === next);
    if (match) {
      chooseStrategy(match.id);
      document.getElementById('search-lab')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function gatedIndex(requested: number) {
    const bounded = Math.max(0, Math.min(requested, lesson.steps.length - 1));
    const unresolved = lesson.steps.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex < bounded &&
        candidate.prediction &&
        !submitted.includes(candidate.prediction.id)
    );
    return unresolved >= 0 ? unresolved : bounded;
  }

  function markStrategyComplete() {
    let nextCompleted = completedOperations;
    if (!completedOperations.includes(strategy)) {
      nextCompleted = [...completedOperations, strategy];
      completedOperations = nextCompleted;
      localStorage.setItem('replaycs-search-strategies', JSON.stringify(completedOperations));
    }
    if (nextCompleted.length >= operationCount) {
      progress = completeLesson(progress, 'search-lab', 35);
      saveProgress(progress);
    }
  }

  function jump(requested: number) {
    const bounded = Math.max(0, Math.min(requested, lesson.steps.length - 1));
    index = gatedIndex(bounded);
    if (index < bounded) {
      playing = false;
      clearInterval(timer);
    }
    if (index === lesson.steps.length - 1) markStrategyComplete();
  }

  function togglePlayback() {
    playing = !playing;
    clearInterval(timer);
    if (playing) {
      timer = setInterval(() => {
        if (index >= lesson.steps.length - 1) {
          playing = false;
          clearInterval(timer);
        } else jump(index + 1);
      }, 900);
    }
  }

  function selectLanguage(next: SupportedLanguage) {
    language = next;
    progress = recordLanguageUse(progress, next);
    saveProgress(progress);
  }

  function mistakeMetadata() {
    const candidate = step.metadata?.mistake;
    return candidate && typeof candidate === 'object'
      ? (candidate as unknown as MistakeMetadata)
      : null;
  }

  function submitPrediction(correct: boolean, answer: string) {
    if (!step.prediction) return;
    submitted = [...submitted, step.prediction.id];
    const evidenceId = `search-lab:${strategy}:${step.prediction.id}`;
    if (correct) {
      progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
    } else {
      const authored = mistakeMetadata();
      const firstMutation = step.mutations[0];
      const inferredStateKey = firstMutation?.entityId ?? 'mid';
      const stateKey = authored?.stateKey ?? inferredStateKey;
      const actual = String(authored?.correctAnswer ?? step.prediction.correctAnswer);
      const attempt: MistakeAttempt = {
        evidenceId,
        stepId: step.id,
        prompt: authored?.prompt ?? step.prediction.prompt,
        predicted: answer,
        actual,
        explanation: authored?.explanation ?? step.prediction.explanation,
        tag: authored?.tag ?? 'off-by-one',
        variableLabel: authored?.variableLabel ?? stateKey,
        stateKey,
        recoveryPrompt:
          authored?.recoveryPrompt ?? `Recovery challenge: enter the correct ${stateKey} value.`
      };
      mistake = attempt;
      progress = recordMisconception(progress, evidenceId, attempt.tag);
    }
    saveProgress(progress);
  }

  function recoverMistake() {
    if (!mistake) return;
    progress = awardRecovery(progress, mistake.evidenceId);
    saveProgress(progress);
  }

  function mentorContext(): StepContext {
    return {
      subject: 'dsa-1',
      lesson: 'search-lab',
      learningObjective: lesson.learningObjectives[0],
      selectedLanguage: language,
      activeSourceLines: lesson.sourceByLanguage[language]
        .filter((line) => line.semanticOperationId === step.semanticOperationId)
        .map((line) => line.text),
      stateBefore: step.stateBefore,
      mutation: step.mutations,
      stateAfter: step.stateAfter,
      deterministicExplanation: step.deterministicExplanation,
      learnerLevel: progress.learnerLevel,
      misconceptionTags: currentMistake ? [currentMistake.tag] : [],
      interaction: 'explain',
      explanationLevel: progress.explanationLevel,
      explanationLanguage: progress.explanationLanguage,
      currentPrediction: step.prediction
        ? {
            prompt: step.prediction.prompt,
            learnerAnswer: currentMistake?.predicted,
            correctAnswer: String(step.prediction.correctAnswer)
          }
        : undefined
    };
  }

  function recordMentorHint() {
    progress = recordHint(progress, 'search-lab');
    saveProgress(progress);
  }

  function handleKeydown(event: KeyboardEvent) {
    const targetElement = event.target instanceof Element ? event.target : null;
    if (targetElement?.closest('a,button,input,select,textarea,summary,[contenteditable=true]'))
      return;
    if (event.key === 'ArrowRight') jump(index + 1);
    if (event.key === 'ArrowLeft') jump(index - 1);
    if (event.key === ' ') {
      event.preventDefault();
      togglePlayback();
    }
  }

  function valueCount(state: Record<string, TraceValue>) {
    return Array.isArray(state.array) ? state.array.length : 0;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Search Strategy Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Execute linear search, iterative and recursive binary search, BST descent, and hash lookup on the same data, comparison by comparison."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-1">← DSA I</a>
    <p class="eyebrow">Search strategy laboratory</p>
    <h1>Search Lab</h1>
    <p>Run five search strategies on the same data and count every comparison they make.</p>
  </div>
  <div class="mastery" aria-label={`Search strategy mastery ${masteryPercent}%`}>
    <span>{completedOperations.length}/{operationCount} strategies</span>
    <div><i style={`width:${masteryPercent}%`}></i></div>
    <b>{masteryPercent}% mastery path</b>
  </div>
</header>

<form
  class="builder panel"
  onsubmit={(event) => {
    event.preventDefault();
    buildTrace();
  }}
>
  <label class="operation-field"
    >Strategy
    <select
      aria-label="Strategy"
      value={strategy}
      onchange={(event) => chooseStrategy(event.currentTarget.value as SearchStrategy)}
    >
      {#each SEARCH_STRATEGIES as item}
        <option value={item.id}>{item.label}</option>
      {/each}
    </select></label
  >
  <label class="values-field"
    >Values
    <input bind:value={valuesText} aria-describedby="search-help search-error" />
  </label>
  <label>Target<input type="number" min="0" bind:value={target} /></label>
  <button class="primary" type="submit">Build deterministic trace</button>
  <p id="search-help">
    2–10 distinct non-negative integers. Binary strategies sort them first; the BST inserts them in
    the order you type — try a sorted order to skew the tree.
  </p>
  {#if inputError}<p id="search-error" class="error" role="alert">{inputError}</p>{/if}
</form>

{#if scoreboard}
  <section class="scoreboard panel" aria-labelledby="scoreboard-title">
    <div>
      <p class="eyebrow">Flagship comparison</p>
      <h2 id="scoreboard-title">Same data, five strategies</h2>
      <p>Exact value comparisons each strategy needs to find {target} in this input.</p>
    </div>
    <div class="score-grid">
      {#each SEARCH_STRATEGIES as item}
        <button
          type="button"
          class:active={strategy === item.id}
          onclick={() => chooseStrategy(item.id)}
        >
          <span>{item.label}</span>
          <b>{scoreboard[item.id]}</b>
          <small>comparison{scoreboard[item.id] === 1 ? '' : 's'}</small>
        </button>
      {/each}
    </div>
  </section>
{/if}

<section class="operation-context" aria-live="polite">
  <div>
    <span class="eyebrow">Selected strategy</span>
    <h2>{strategyMetadata.label}</h2>
  </div>
  <p>{strategyMetadata.description}</p>
  <div class="case-badges">
    <span>{finalEvidence?.selectedCase ?? 'deterministic'} case</span>
    <b>{finalEvidence?.timeComplexity ?? '—'} time</b>
    <b>{finalEvidence?.auxiliarySpace ?? '—'} space</b>
    <span>n = {valueCount(lesson.initialState)}</span>
  </div>
</section>

<div id="search-lab" class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={selectLanguage}
  />

  <main class="execution">
    <SearchVisualizer state={visibleState} />
    <TraceControls
      {index}
      total={lesson.steps.length}
      {playing}
      onprevious={() => jump(index - 1)}
      onnext={() => jump(index + 1)}
      onrestart={() => jump(0)}
      onplay={togglePlayback}
      onjump={jump}
    />
    <ExecutionEvidence {step} revealed={predictionResolved} />
    {#if step.complexityEvidence}<ComplexityWhy evidence={step.complexityEvidence} />{/if}
  </main>

  <aside class="step-panel panel">
    <div class="step-heading">
      <span class="eyebrow">Line {index + 1} of {lesson.steps.length}</span>
      <span class="event">{step.eventType}</span>
    </div>
    <h2>{step.title}</h2>
    <p class="explanation">
      {predictionResolved
        ? step.deterministicExplanation
        : 'Predict first. ReplayCS has frozen the post-line state until you commit an answer.'}
    </p>

    {#if step.prediction}
      <PredictionCheckpoint
        challenge={step.prediction}
        submitted={submitted.includes(step.prediction.id)}
        onsubmit={submitPrediction}
      />
    {/if}

    {#if currentMistake}
      {#key currentMistake.evidenceId}
        <MistakeReplay
          attempt={currentMistake}
          stateBefore={step.stateBefore}
          stateAfter={step.stateAfter}
          onrecover={recoverMistake}
        />
      {/key}
    {/if}

    {#if predictionResolved}
      {#key `${step.id}-${language}`}
        <AiMentor context={mentorContext()} onhint={recordMentorHint} />
      {/key}
    {:else}
      <div class="mentor-lock">
        Resolve the deterministic checkpoint to unlock grounded AI help.
      </div>
    {/if}
  </aside>
</div>

<section class="mistake-clinic lab-section" aria-labelledby="mistake-title">
  <div class="section-heading">
    <p class="eyebrow">Replay My Mistake</p>
    <h2 id="mistake-title">Practice the first bad transition</h2>
    <p>
      Choose a related strategy, make a prediction, and an incorrect answer becomes a recoverable
      replay—not a dead end.
    </p>
  </div>
  <div>
    {#each mistakeClinic as [tag, label, relatedStrategy]}
      <button type="button" onclick={() => chooseClinicStrategy(relatedStrategy)}>
        <span>{tag}</span><b>{label}</b><small>Open trace →</small>
      </button>
    {/each}
  </div>
</section>

<section class="matrix lab-section" aria-labelledby="matrix-title">
  <div class="section-heading">
    <p class="eyebrow">Case contract</p>
    <h2 id="matrix-title">Search complexity, with assumptions named</h2>
    <p>
      The active execution above supplies the proof. This table keeps all required cases comparable.
    </p>
  </div>
  <div class="table-wrap panel">
    <table>
      <thead
        ><tr><th>Strategy</th><th>Case / assumption</th><th>Time</th><th>Auxiliary space</th></tr
        ></thead
      >
      <tbody
        >{#each complexityRows as row}<tr
            ><td>{row[0]}</td><td>{row[1]}</td><td><code>{row[2]}</code></td><td
              ><code>{row[3]}</code></td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
</section>

<style>
  .lesson-head,
  .operation-context,
  .section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }
  .lesson-head h1 {
    margin: 0.2rem 0;
    font-size: clamp(2.4rem, 5vw, 4.4rem);
  }
  .lesson-head p,
  .operation-context > p,
  .section-heading > p {
    color: var(--muted);
    max-width: 650px;
    line-height: 1.55;
  }
  .back {
    color: var(--primary);
    font-size: 0.8rem;
  }
  .mastery {
    min-width: 210px;
    text-align: right;
  }
  .mastery span,
  .mastery b {
    color: var(--muted);
    font-size: 0.65rem;
  }
  .mastery div {
    height: 7px;
    margin: 0.35rem 0;
    border-radius: 99px;
    overflow: hidden;
    background: #1e293b;
  }
  .mastery i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
  }
  .builder {
    display: flex;
    align-items: end;
    gap: 0.55rem;
    flex-wrap: wrap;
    margin: 1rem 0;
    padding: 0.8rem;
  }
  .builder label {
    display: grid;
    gap: 0.25rem;
    color: var(--muted);
    font-size: 0.66rem;
  }
  .builder input,
  .builder select {
    min-width: 90px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.6rem;
    background: var(--bg);
    color: var(--text);
  }
  .builder .operation-field {
    min-width: 210px;
  }
  .builder .values-field {
    flex: 1;
    min-width: 220px;
  }
  .builder p {
    flex-basis: 100%;
    margin: 0;
    color: var(--muted);
    font-size: 0.62rem;
  }
  .builder p.error {
    color: var(--danger);
  }
  .scoreboard {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
    margin-bottom: 1rem;
    border-color: #fbbf2455;
  }
  .scoreboard h2 {
    margin: 0.2rem 0;
  }
  .scoreboard > div > p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .score-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
  }
  .score-grid button {
    display: grid;
    gap: 0.25rem;
    justify-items: center;
    padding: 0.7rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    opacity: 0.65;
  }
  .score-grid button.active {
    opacity: 1;
    border-color: var(--primary);
    background: #2dd4bf09;
  }
  .score-grid span {
    color: var(--muted);
    font-size: 0.6rem;
    text-align: center;
  }
  .score-grid b {
    color: var(--primary);
    font: 1.5rem var(--mono);
  }
  .score-grid small {
    color: var(--muted);
    font-size: 0.55rem;
  }
  .operation-context {
    margin: 1.5rem 0 0.7rem;
    align-items: center;
  }
  .operation-context h2 {
    margin: 0.2rem 0;
  }
  .case-badges {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    justify-content: end;
  }
  .case-badges span,
  .case-badges b,
  .event {
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    font-size: 0.62rem;
  }
  .case-badges b {
    color: var(--primary);
  }
  .lab {
    display: grid;
    grid-template-columns: minmax(280px, 0.85fr) minmax(430px, 1.45fr) minmax(285px, 0.9fr);
    gap: 0.75rem;
    align-items: start;
  }
  .execution {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }
  .step-panel {
    position: sticky;
    top: 74px;
    padding: 1rem;
    max-height: calc(100vh - 88px);
    overflow-y: auto;
  }
  .step-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .event {
    color: var(--secondary);
  }
  .step-panel h2 {
    margin: 0.55rem 0;
  }
  .explanation {
    line-height: 1.65;
  }
  .mentor-lock {
    margin-top: 1rem;
    padding: 0.75rem;
    border: 1px dashed var(--border);
    border-radius: 9px;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .lab-section {
    margin-top: 4.5rem;
  }
  .section-heading h2 {
    margin: 0.2rem 0;
    font-size: clamp(1.7rem, 3vw, 2.5rem);
  }
  .mistake-clinic > div:last-child {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .mistake-clinic button {
    display: grid;
    gap: 0.35rem;
    text-align: left;
    min-height: 115px;
  }
  .mistake-clinic button span {
    color: var(--danger);
    font: 0.55rem var(--mono);
  }
  .mistake-clinic button small {
    color: var(--primary);
  }
  .table-wrap {
    overflow-x: auto;
    margin-top: 1rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
    font-size: 0.75rem;
  }
  th {
    color: var(--muted);
    font-size: 0.62rem;
    text-transform: uppercase;
  }
  td code {
    color: var(--primary);
  }
  @media (max-width: 1150px) {
    .lab {
      grid-template-columns: minmax(280px, 0.8fr) minmax(420px, 1.2fr);
    }
    .step-panel {
      grid-column: 1/-1;
      position: static;
      max-height: none;
    }
  }
  @media (max-width: 780px) {
    .lesson-head,
    .operation-context,
    .section-heading {
      align-items: start;
      flex-direction: column;
    }
    .mastery {
      width: 100%;
      text-align: left;
    }
    .lab {
      grid-template-columns: 1fr;
    }
    .score-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 520px) {
    .score-grid,
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr;
    }
  }
</style>
