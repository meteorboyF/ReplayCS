<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import QueueVisualizer from '$lib/components/visualizers/QueueVisualizer.svelte';
  import {
    DEFAULT_QUEUE_CONFIG,
    QUEUE_OPERATIONS,
    createQueueLesson,
    type QueueConfig,
    type QueueOperation,
    type QueueOperationMetadata,
    type QueueBacking
  } from '$lib/engines/dsa/queue';
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

  const operationCompletionKeys: string[] = QUEUE_OPERATIONS.map((item) => String(item.id ?? ''));
  const operationCount = operationCompletionKeys.length;
  const languages: SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];
  const complexityRows = [
    ['Enqueue', 'All cases', 'O(1)', 'O(1)'],
    ['Dequeue', 'All cases', 'O(1)', 'O(1)'],
    ['Peek', 'All cases', 'O(1)', 'O(1)']
  ];
  const mistakeClinic = [
    ['queue-overflow', 'Enqueue to full queue', 'enqueue'],
    ['queue-underflow', 'Dequeue empty queue', 'dequeue']
  ] as const;

  let operation = $state<QueueOperation>(DEFAULT_QUEUE_CONFIG.operation);
  let backing = $state<QueueBacking>(DEFAULT_QUEUE_CONFIG.backing);
  let maintainRear = $state(true);
  let valuesText = $state(DEFAULT_QUEUE_CONFIG.values?.join(', ') ?? '');
  let newValue = $state(DEFAULT_QUEUE_CONFIG.newValue ?? 99);
  let lesson = $state(createQueueLesson(config()));
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
  let operationRecord = $derived(metadataRecord(operationMetadata(operation)));
  let currentMistake = $derived(mistake?.stepId === step.id ? mistake : null);

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('replaycs-queue-operations') ?? '[]');
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

  function metadataRecord(metadata: QueueOperationMetadata) {
    return metadata as unknown as Record<string, unknown>;
  }

  function operationMetadata(id: QueueOperation) {
    return (
      QUEUE_OPERATIONS.find((candidate) => metadataRecord(candidate).id === id) ??
      QUEUE_OPERATIONS[0]
    );
  }

  function metadataText(metadata: QueueOperationMetadata, ...keys: string[]) {
    const record = metadataRecord(metadata);
    const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === 'string');
    return typeof value === 'string' ? value : String(record.id);
  }

  // Linked-list enqueue without a rear pointer must traverse the list: encode that as
  // capacity -1, the engine's "no rear pointer" sentinel.
  function rearSentinel(values: number[]) {
    return backing === 'linked-list' && !maintainRear ? -1 : Math.max(6, values.length + 2);
  }

  function config(): QueueConfig {
    const values = parseValues(false);
    return {
      operation,
      backing,
      values,
      newValue,
      capacity: rearSentinel(values)
    };
  }

  function parseValues(validate = true) {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) || pieces.length > 8) {
      if (validate) inputError = 'Enter up to 8 comma-separated whole numbers.';
      return [...(DEFAULT_QUEUE_CONFIG.values ?? [])];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value))) {
      if (validate) inputError = 'Each value must be a safe whole number.';
      return [...(DEFAULT_QUEUE_CONFIG.values ?? [])];
    }
    return values;
  }

  function buildTrace() {
    inputError = '';
    const values = parseValues();
    if (inputError) return;
    try {
      lesson = createQueueLesson({
        operation,
        backing,
        values,
        newValue,
        capacity: rearSentinel(values)
      });
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

  function chooseOperation(next: QueueOperation) {
    operation = next;
    inputError = '';
    buildTrace();
  }

  function chooseClinicOperation(next: string) {
    const match = QUEUE_OPERATIONS.find(
      (candidate) => String(metadataRecord(candidate).id) === next
    );
    if (match) {
      chooseOperation(metadataRecord(match).id as QueueOperation);
      document.getElementById('queue-lab')?.scrollIntoView({ behavior: 'smooth' });
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

  function markOperationComplete() {
    const id = String(operation);
    let nextCompleted = completedOperations;
    if (!completedOperations.includes(id)) {
      nextCompleted = [...completedOperations, id];
      completedOperations = nextCompleted;
      localStorage.setItem('replaycs-queue-operations', JSON.stringify(completedOperations));
    }
    if (nextCompleted.length >= operationCount) {
      progress = completeLesson(progress, 'queue-lab', 35);
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
    if (index === lesson.steps.length - 1) markOperationComplete();
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
    const evidenceId = `queue-lab:${operation}:${step.prediction.id}`;
    if (correct) {
      progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
    } else {
      const authored = mistakeMetadata();
      const firstMutation = step.mutations[0];
      const inferredStateKey = firstMutation?.entityId ?? 'front';
      const stateKey = authored?.stateKey ?? inferredStateKey;
      const actual = String(authored?.correctAnswer ?? step.prediction.correctAnswer);
      const attempt: MistakeAttempt = {
        evidenceId,
        stepId: step.id,
        prompt: authored?.prompt ?? step.prediction.prompt,
        predicted: answer,
        actual,
        explanation: authored?.explanation ?? step.prediction.explanation,
        tag: authored?.tag ?? 'queue-front-rear',
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
      lesson: 'queue-lab',
      learningObjective: lesson.learningObjectives?.[0] ?? '',
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
    progress = recordHint(progress, 'queue-lab');
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

  function elementCount(state: Record<string, TraceValue>) {
    return typeof state.size === 'number' ? state.size : 0;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Queue Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Execute queue enqueue and dequeue operations one source line at a time."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-1">← DSA I</a>
    <p class="eyebrow">FIFO execution laboratory</p>
    <h1>Queue Lab</h1>
    <p>See every reference read and write before it changes memory.</p>
  </div>
  <div class="mastery" aria-label={`Queue operation mastery ${masteryPercent}%`}>
    <span>{completedOperations.length}/{operationCount} operations</span>
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
    >Operation
    <select
      aria-label="Operation"
      value={operation}
      onchange={(event) => chooseOperation(event.currentTarget.value as QueueOperation)}
    >
      {#each QUEUE_OPERATIONS as item}
        <option value={String(metadataRecord(item).id)}>
          {metadataText(item, 'label', 'title', 'name')}
        </option>
      {/each}
    </select></label
  >
  <label
    >Backing
    <select
      aria-label="Backing"
      value={backing}
      onchange={(event) => {
        backing = event.currentTarget.value as QueueBacking;
        buildTrace();
      }}
    >
      <option value="naive-array">Naive array</option>
      <option value="circular-array">Circular array</option>
      <option value="linked-list">Linked list</option>
    </select></label
  >
  <label class="values-field"
    >Current queue
    <input bind:value={valuesText} aria-describedby="list-help list-error" />
  </label>
  {#if String(operation) === 'enqueue'}
    <label>New value<input type="number" bind:value={newValue} /></label>
  {/if}
  <button class="primary" type="submit">Build deterministic trace</button>
  <p id="list-help">Enter comma-separated values (front to rear).</p>
  {#if inputError}<p id="list-error" class="error" role="alert">{inputError}</p>{/if}
</form>

{#if backing === 'linked-list' && String(operation) === 'enqueue'}
  <section class="rear-switch panel" aria-labelledby="rear-switch-title">
    <div>
      <p class="eyebrow">Flagship comparison</p>
      <h2 id="rear-switch-title">Maintain rear pointer</h2>
      <p>
        This switch rebuilds the source, trace path, exact counts, and bound for the same enqueue.
      </p>
    </div>
    <button
      type="button"
      class:on={maintainRear}
      role="switch"
      aria-checked={maintainRear}
      aria-label="Maintain rear pointer"
      onclick={() => {
        maintainRear = !maintainRear;
        buildTrace();
      }}><span>{maintainRear ? 'ON' : 'OFF'}</span><i></i></button
    >
    <div class="rear-paths">
      <div class:active={!maintainRear}>
        <b>OFF · O(n)</b><span>front → … → last node → link</span><small
          >Traverse the whole list to find the last node, then link.</small
        >
      </div>
      <div class:active={maintainRear}>
        <b>ON · O(1)</b><span>rear.next → newNode · rear → newNode</span><small
          >Two direct pointer updates; no traversal.</small
        >
      </div>
    </div>
  </section>
{/if}

<section class="operation-context" aria-live="polite">
  <div>
    <span class="eyebrow">Selected operation</span>
    <h2>{String(operationRecord.label ?? operationRecord.title ?? operation)}</h2>
  </div>
  <p>{String(operationRecord.description ?? lesson.description)}</p>
  <div class="case-badges">
    <span>{finalEvidence?.selectedCase ?? 'deterministic'} case</span>
    <b>{finalEvidence?.timeComplexity ?? '—'} time</b>
    <b>{finalEvidence?.auxiliarySpace ?? '—'} space</b>
    <span>n = {elementCount(lesson.initialState)}</span>
  </div>
</section>

<div id="queue-lab" class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={selectLanguage}
  />

  <main class="execution">
    <QueueVisualizer state={visibleState} />
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

<section class="language-notes lab-section" aria-labelledby="language-notes-title">
  <div class="section-heading">
    <p class="eyebrow">Same semantics, honest runtime differences</p>
    <h2 id="language-notes-title">Four complete implementations</h2>
  </div>
  <div>
    <article>
      <b>C</b>
      <p>Uses circular arrays or linked lists.</p>
    </article>
    <article>
      <b>C++</b>
      <p><code>std::queue</code> wrapping <code>std::deque</code>.</p>
    </article>
    <article>
      <b>Java</b>
      <p><code>Queue</code> interface with <code>LinkedList</code> or <code>ArrayDeque</code>.</p>
    </article>
    <article>
      <b>Python</b>
      <p><code>collections.deque</code> for O(1) appends and pops.</p>
    </article>
  </div>
</section>

<section class="mistake-clinic lab-section" aria-labelledby="mistake-title">
  <div class="section-heading">
    <p class="eyebrow">Replay My Mistake</p>
    <h2 id="mistake-title">Practice the first bad transition</h2>
  </div>
  <div>
    {#each mistakeClinic as [tag, label, relatedOperation]}
      <button type="button" onclick={() => chooseClinicOperation(relatedOperation)}>
        <span>{tag}</span><b>{label}</b><small>Open trace →</small>
      </button>
    {/each}
  </div>
</section>

<section class="matrix lab-section" aria-labelledby="matrix-title">
  <div class="section-heading">
    <p class="eyebrow">Case contract</p>
    <h2 id="matrix-title">Queue complexity, with assumptions named</h2>
  </div>
  <div class="table-wrap panel">
    <table>
      <thead
        ><tr><th>Operation</th><th>Case / assumption</th><th>Time</th><th>Auxiliary space</th></tr
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
  /* Base styles same as linked list */
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
    min-width: 205px;
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
  .operation-context {
    margin: 1.5rem 0 0.7rem;
    align-items: center;
  }
  .rear-switch {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.8rem 1.2rem;
    padding: 1rem;
    margin-bottom: 1rem;
    border-color: #fbbf2455;
  }
  .rear-switch h2 {
    margin: 0.2rem 0;
  }
  .rear-switch p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .rear-switch > button {
    position: relative;
    width: 88px;
    height: 42px;
    padding: 0.2rem 0.5rem;
    border-radius: 99px;
    background: #172033;
  }
  .rear-switch > button span {
    position: absolute;
    left: 12px;
    top: 13px;
    color: var(--warning);
    font: 0.66rem var(--mono);
  }
  .rear-switch > button i {
    position: absolute;
    right: 5px;
    top: 5px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--warning);
    transition: 180ms;
  }
  .rear-switch > button.on {
    background: #2dd4bf28;
  }
  .rear-switch > button.on span {
    left: auto;
    right: 13px;
    color: var(--primary);
  }
  .rear-switch > button.on i {
    right: 52px;
    background: var(--primary);
  }
  .rear-paths {
    grid-column: 1/-1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .rear-paths div {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    opacity: 0.5;
  }
  .rear-paths div.active {
    opacity: 1;
    border-color: var(--primary);
    background: #2dd4bf09;
  }
  .rear-paths b {
    color: var(--primary);
  }
  .rear-paths span {
    overflow-wrap: anywhere;
    font: 0.68rem var(--mono);
  }
  .rear-paths small {
    color: var(--muted);
  }
  @media (max-width: 520px) {
    .rear-switch {
      grid-template-columns: 1fr;
    }
    .rear-paths {
      grid-template-columns: 1fr;
    }
  }
</style>
