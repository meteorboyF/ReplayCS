<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import LinkedListVisualizer from '$lib/components/visualizers/LinkedListVisualizer.svelte';
  import {
    DEFAULT_LINKED_LIST_CONFIG,
    LINKED_LIST_OPERATIONS,
    createLinkedListLesson,
    type LinkedListConfig,
    type LinkedListOperation,
    type LinkedListOperationMetadata
  } from '$lib/engines/dsa/linkedList';
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

  // Insert-tail OFF and ON are different executable mastery cases.
  const operationCompletionKeys: string[] = LINKED_LIST_OPERATIONS.flatMap((item) =>
    item.id === 'insert-tail' ? ['insert-tail-without-tail', 'insert-tail-with-tail'] : [item.id]
  );
  const operationCount = operationCompletionKeys.length;
  const languages: SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];
  const complexityRows = [
    ['Access head', 'Direct', 'O(1)', 'O(1)'],
    ['Access position', 'Traversal', 'O(n)', 'O(1)'],
    ['Search', 'Best', 'O(1)', 'O(1)'],
    ['Search', 'Average', 'O(n)', 'O(1)'],
    ['Search', 'Worst', 'O(n)', 'O(1)'],
    ['Insert head', 'All cases', 'O(1)', 'O(1)'],
    ['Insert tail', 'Without tail pointer', 'O(n)', 'O(1)'],
    ['Insert tail', 'With tail pointer', 'O(1)', 'O(1)'],
    ['Insert after known node', 'Direct node reference', 'O(1)', 'O(1)'],
    ['Insert at position', 'Position must be found', 'O(n)', 'O(1)'],
    ['Delete head', 'All cases', 'O(1)', 'O(1)'],
    ['Delete tail', 'Singly linked list', 'O(n)', 'O(1)'],
    ['Delete known successor', 'Predecessor known', 'O(1)', 'O(1)'],
    ['Delete by value', 'Search required', 'O(n)', 'O(1)'],
    ['Reverse iterative', 'All nodes', 'O(n)', 'O(1)'],
    ['Reverse recursive', 'All nodes', 'O(n)', 'O(n)'],
    ['Cycle detection', 'Floyd', 'O(n)', 'O(1)']
  ];
  const mistakeClinic = [
    ['head-update-timing', 'Updating head too early', 'insert-head'],
    ['lost-list', 'Losing the remaining list', 'reverse-iterative'],
    ['tail-pointer-maintenance', 'Forgetting to update tail', 'insert-tail'],
    ['node-vs-value', 'Confusing a node with its value', 'search'],
    ['incorrect-predecessor', 'Choosing the wrong predecessor', 'delete-after-known'],
    ['pointer-update-order', 'Rewiring pointers in the wrong order', 'reverse-iterative'],
    ['recursive-base-case', 'Using the wrong recursive base case', 'reverse-recursive'],
    ['fast-vs-slow-pointer', 'Confusing fast and slow pointers', 'detect-cycle']
  ] as const;

  let operation = $state<LinkedListOperation>(DEFAULT_LINKED_LIST_CONFIG.operation);
  let valuesText = $state(DEFAULT_LINKED_LIST_CONFIG.values.join(', '));
  let position = $state(DEFAULT_LINKED_LIST_CONFIG.position ?? 2);
  let target = $state(DEFAULT_LINKED_LIST_CONFIG.target ?? 30);
  let newValue = $state(DEFAULT_LINKED_LIST_CONFIG.newValue ?? 99);
  let maintainTail = $state(DEFAULT_LINKED_LIST_CONFIG.maintainTail ?? false);
  let cycleEntry = $state(DEFAULT_LINKED_LIST_CONFIG.cycleEntry ?? -1);
  let lesson = $state(createLinkedListLesson(config()));
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
      const stored: unknown = JSON.parse(
        localStorage.getItem('replaycs-linked-list-operations') ?? '[]'
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

  function metadataRecord(metadata: LinkedListOperationMetadata) {
    return metadata as unknown as Record<string, unknown>;
  }

  function operationMetadata(id: LinkedListOperation) {
    return (
      LINKED_LIST_OPERATIONS.find((candidate) => metadataRecord(candidate).id === id) ??
      LINKED_LIST_OPERATIONS[0]
    );
  }

  function metadataText(metadata: LinkedListOperationMetadata, ...keys: string[]) {
    const record = metadataRecord(metadata);
    const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === 'string');
    return typeof value === 'string' ? value : String(record.id);
  }

  function config(): LinkedListConfig {
    return {
      operation,
      values: parseValues(false),
      position,
      target,
      newValue,
      maintainTail,
      cycleEntry: cycleEntry < 0 ? null : cycleEntry
    };
  }

  function parseValues(validate = true) {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (
      pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) ||
      pieces.length < 1 ||
      pieces.length > 8
    ) {
      if (validate) inputError = 'Enter 1–8 comma-separated whole numbers.';
      return [...DEFAULT_LINKED_LIST_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value))) {
      if (validate) inputError = 'Each value must be a safe whole number.';
      return [...DEFAULT_LINKED_LIST_CONFIG.values];
    }
    return values;
  }

  function buildTrace() {
    inputError = '';
    const values = parseValues();
    if (inputError) return;
    try {
      lesson = createLinkedListLesson({
        operation,
        values,
        position,
        target,
        newValue,
        maintainTail,
        cycleEntry: cycleEntry < 0 ? null : cycleEntry
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

  function chooseOperation(next: LinkedListOperation) {
    operation = next;
    inputError = '';
    buildTrace();
  }

  function chooseClinicOperation(next: string) {
    const match = LINKED_LIST_OPERATIONS.find(
      (candidate) => String(metadataRecord(candidate).id) === next
    );
    if (match) {
      chooseOperation(metadataRecord(match).id as LinkedListOperation);
      document.getElementById('linked-list-lab')?.scrollIntoView({ behavior: 'smooth' });
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
    const id =
      operation === 'insert-tail'
        ? `insert-tail-${maintainTail ? 'with-tail' : 'without-tail'}`
        : String(operation);
    let nextCompleted = completedOperations;
    if (!completedOperations.includes(id)) {
      nextCompleted = [...completedOperations, id];
      completedOperations = nextCompleted;
      localStorage.setItem('replaycs-linked-list-operations', JSON.stringify(completedOperations));
    }
    if (nextCompleted.length >= operationCount) {
      progress = completeLesson(progress, 'linked-list-lab', 35);
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
    const evidenceId = `linked-list-lab:${operation}:${step.prediction.id}`;
    if (correct) {
      progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
    } else {
      const authored = mistakeMetadata();
      const firstMutation = step.mutations[0];
      const inferredStateKey = firstMutation?.entityId.replace(/^pointer-/, '') ?? 'current';
      const stateKey = authored?.stateKey ?? inferredStateKey;
      const actual = String(authored?.correctAnswer ?? step.prediction.correctAnswer);
      mistake = {
        evidenceId,
        stepId: step.id,
        prompt: authored?.prompt ?? step.prediction.prompt,
        predicted: answer,
        actual,
        explanation: authored?.explanation ?? step.prediction.explanation,
        tag: authored?.tag ?? 'pointer-update-order',
        variableLabel: authored?.variableLabel ?? stateKey,
        stateKey,
        recoveryPrompt:
          authored?.recoveryPrompt ?? `Recovery challenge: enter the correct ${stateKey} value.`
      };
      progress = recordMisconception(progress, evidenceId, mistake.tag);
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
      lesson: 'linked-list-lab',
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
    progress = recordHint(progress, 'linked-list-lab');
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

  function nodeCount(state: Record<string, TraceValue>) {
    return Array.isArray(state.nodes) ? state.nodes.length : 0;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Linked List Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Execute linked-list access, traversal, search, insertion, deletion, reversal, and Floyd cycle detection one source line at a time."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-1">← DSA I</a>
    <p class="eyebrow">Pointer execution laboratory</p>
    <h1>Linked List Lab</h1>
    <p>See every reference read and write before it changes memory.</p>
  </div>
  <div class="mastery" aria-label={`Linked List operation mastery ${masteryPercent}%`}>
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
      onchange={(event) => chooseOperation(event.currentTarget.value as LinkedListOperation)}
    >
      {#each LINKED_LIST_OPERATIONS as item}
        <option value={String(metadataRecord(item).id)}>
          {metadataText(item, 'label', 'title', 'name')}
        </option>
      {/each}
    </select></label
  >
  <label class="values-field"
    >Input list
    <input bind:value={valuesText} aria-describedby="list-help list-error" />
  </label>
  {#if ['access', 'insert-at-position', 'insert-after-known', 'delete-after-known'].includes(String(operation))}
    <label>Position<input type="number" min="0" max="7" bind:value={position} /></label>
  {/if}
  {#if ['search', 'delete-by-value'].includes(String(operation))}
    <label>Target value<input type="number" bind:value={target} /></label>
  {/if}
  {#if String(operation).startsWith('insert')}
    <label>New value<input type="number" bind:value={newValue} /></label>
  {/if}
  {#if operation === 'detect-cycle'}
    <label>Cycle entry<input type="number" min="-1" max="7" bind:value={cycleEntry} /></label>
  {/if}
  <button class="primary" type="submit">Build deterministic trace</button>
  <p id="list-help">Node IDs remain stable while values and references change. Maximum 8 nodes.</p>
  {#if inputError}<p id="list-error" class="error" role="alert">{inputError}</p>{/if}
</form>

{#if operation === 'insert-tail'}
  <section class="tail-switch panel" aria-labelledby="tail-switch-title">
    <div>
      <p class="eyebrow">Flagship comparison</p>
      <h2 id="tail-switch-title">Maintain tail pointer</h2>
      <p>
        This switch rebuilds the source, trace path, active lines, counts, animation, derivation,
        and bound for the same append.
      </p>
    </div>
    <button
      type="button"
      class:on={maintainTail}
      role="switch"
      aria-checked={maintainTail}
      aria-label="Maintain tail pointer"
      onclick={() => {
        maintainTail = !maintainTail;
        buildTrace();
      }}><span>{maintainTail ? 'ON' : 'OFF'}</span><i></i></button
    >
    <div class="tail-paths">
      <div class:active={!maintainTail}>
        <b>OFF · O(n)</b><span
          >{parseValues(false)
            .map((_, i) => `N${i}`)
            .join(' → ')} → null</span
        ><small>Traverse through the list, then rewire.</small>
      </div>
      <div class:active={maintainTail}>
        <b>ON · O(1)</b><span>tail.next → newNode · tail → newNode</span><small
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
    <span>n = {nodeCount(lesson.initialState)}</span>
  </div>
</section>

<div id="linked-list-lab" class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={selectLanguage}
  />

  <main class="execution">
    <LinkedListVisualizer state={visibleState} />
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
      <p>
        Raw pointers, <code>malloc</code>, and explicit <code>free</code>. A lost pointer can leak
        memory or make nodes unreachable.
      </p>
    </article>
    <article>
      <b>C++</b>
      <p>
        Raw node pointers keep the rewiring visible; <code>new</code>/<code>delete</code> make ownership
        work explicit.
      </p>
    </article>
    <article>
      <b>Java</b>
      <p>
        Object references replace pointer syntax. Unreachable deleted nodes are reclaimed by garbage
        collection.
      </p>
    </article>
    <article>
      <b>Python</b>
      <p>
        Names reference node objects; attribute assignments perform the same graph rewiring, with
        managed memory.
      </p>
    </article>
  </div>
</section>

<section class="mistake-clinic lab-section" aria-labelledby="mistake-title">
  <div class="section-heading">
    <p class="eyebrow">Replay My Mistake</p>
    <h2 id="mistake-title">Practice the first bad transition</h2>
    <p>
      Choose a related operation, make a prediction, and an incorrect answer becomes a recoverable
      replay—not a dead end.
    </p>
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
    <h2 id="matrix-title">Linked-list complexity, with assumptions named</h2>
    <p>
      The active execution above supplies the proof. This table keeps all required cases comparable.
    </p>
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
  .tail-switch {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.8rem 1.2rem;
    padding: 1rem;
    margin-bottom: 1rem;
    border-color: #fbbf2455;
  }
  .tail-switch h2 {
    margin: 0.2rem 0;
  }
  .tail-switch p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .tail-switch > button {
    position: relative;
    width: 88px;
    height: 42px;
    padding: 0.2rem 0.5rem;
    border-radius: 99px;
    background: #172033;
  }
  .tail-switch > button span {
    position: absolute;
    left: 12px;
    top: 13px;
    color: var(--warning);
    font: 0.66rem var(--mono);
  }
  .tail-switch > button i {
    position: absolute;
    right: 5px;
    top: 5px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--warning);
    transition: 180ms;
  }
  .tail-switch > button.on {
    background: #2dd4bf28;
  }
  .tail-switch > button.on span {
    left: auto;
    right: 13px;
    color: var(--primary);
  }
  .tail-switch > button.on i {
    right: 52px;
    background: var(--primary);
  }
  .tail-paths {
    grid-column: 1/-1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .tail-paths div {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    opacity: 0.5;
  }
  .tail-paths div.active {
    opacity: 1;
    border-color: var(--primary);
    background: #2dd4bf09;
  }
  .tail-paths b {
    color: var(--primary);
  }
  .tail-paths span {
    overflow-wrap: anywhere;
    font: 0.68rem var(--mono);
  }
  .tail-paths small {
    color: var(--muted);
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
  .language-notes > div:last-child {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.6rem;
    margin-top: 1rem;
  }
  .language-notes article {
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #07111f77;
  }
  .language-notes article b {
    color: var(--primary);
  }
  .language-notes article p {
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.55;
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
    .tail-paths,
    .language-notes > div:last-child,
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 520px) {
    .tail-switch {
      grid-template-columns: 1fr;
    }
    .tail-paths,
    .language-notes > div:last-child,
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr;
    }
  }
</style>
