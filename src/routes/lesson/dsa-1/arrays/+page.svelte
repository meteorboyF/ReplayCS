<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import DynamicArrayVisualizer from '$lib/components/visualizers/DynamicArrayVisualizer.svelte';
  import {
    DEFAULT_DYNAMIC_ARRAY_CONFIG,
    DYNAMIC_ARRAY_OPERATIONS,
    createDynamicArrayLesson,
    type DynamicArrayConfig,
    type DynamicArrayOperation
  } from '$lib/engines/dsa/dynamicArray';
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

  // A named operation is complete only after every meaningful complexity path is executed.
  // Append with and without capacity remain separate operation units for the flagship comparison.
  const completionUnits = [
    { id: 'access', keys: ['access'] },
    { id: 'update', keys: ['update'] },
    { id: 'search', keys: ['search-best', 'search-average', 'search-worst'] },
    { id: 'insert-beginning', keys: ['insert-beginning'] },
    {
      id: 'insert-middle',
      keys: ['insert-middle-append', 'insert-middle-shift']
    },
    { id: 'append-capacity', keys: ['append-capacity'] },
    { id: 'append-resize', keys: ['append-resize'] },
    { id: 'delete-beginning', keys: ['delete-beginning'] },
    {
      id: 'delete-middle',
      keys: ['delete-middle-last', 'delete-middle-shift']
    },
    { id: 'delete-end', keys: ['delete-end'] },
    { id: 'copy', keys: ['copy'] },
    { id: 'append-sequence', keys: ['append-sequence'] }
  ] as const;
  const operationCompletionKeys: string[] = completionUnits.flatMap((unit) => [...unit.keys]);
  const operationCount = completionUnits.length;
  const requiredCaseCount = operationCompletionKeys.length;
  const complexityRows = [
    ['Access', 'Index arithmetic, all cases', 'O(1)', 'O(1)'],
    ['Update', 'Index arithmetic, all cases', 'O(1)', 'O(1)'],
    ['Search', 'Best — match at index 0', 'O(1)', 'O(1)'],
    ['Search', 'Average — match inside', 'O(n)', 'O(1)'],
    ['Search', 'Worst — last or absent', 'O(n)', 'O(1)'],
    ['Insert beginning', 'All n elements shift', 'O(n)', 'O(1)'],
    ['Insert middle', 'Suffix shifts', 'O(n)', 'O(1)'],
    ['Append', 'Spare capacity', 'O(1)', 'O(1)'],
    ['Append', 'Resize required', 'O(n)', 'O(n)'],
    ['Append', 'Amortized over doubling', 'O(1)', 'O(n)'],
    ['Delete beginning', 'Survivors shift left', 'O(n)', 'O(1)'],
    ['Delete middle', 'Suffix shifts left', 'O(n)', 'O(1)'],
    ['Delete end', 'Size decrement only', 'O(1)', 'O(1)'],
    ['Copy', 'n reads + n writes; returned buffer is output', 'O(n)', 'O(1)']
  ];
  const mistakeClinic = [
    ['index-vs-value', 'Confusing an index with its value', 'access'],
    ['off-by-one', 'Off-by-one in scan or shift counts', 'search'],
    ['loop-boundary', 'Shifting from the wrong end', 'insert-beginning'],
    ['capacity-vs-size', 'Confusing capacity with size', 'insert-end'],
    ['amortized-vs-worst', 'Confusing amortized with worst case', 'append-sequence']
  ] as const;
  const languageReality = [
    [
      'C array',
      'int a[8] is a fixed block: no size, no growth. Growth means malloc, copy, free — exactly the resize trace above.'
    ],
    [
      'C++ std::vector',
      'Stores data, size, and capacity pointers. push_back is the append trace: O(1) with spare capacity, O(n) on growth.'
    ],
    [
      'Java ArrayList',
      'Wraps an Object[] with a size field. add() grows by ~1.5×; the copy loop is the same resize trace.'
    ],
    [
      'Python list',
      'A table of object references with over-allocation. append is amortized O(1); insert(0, v) still shifts every slot.'
    ]
  ];
  const operationObjectives: Record<DynamicArrayOperation, string> = {
    access: 'Explain how index arithmetic reaches any valid array slot in constant time.',
    update: 'Explain how an indexed write changes one array slot without shifting its neighbors.',
    search: 'Relate the exact value and loop comparisons to best, average, and worst-case search.',
    'insert-beginning':
      'Explain why a safe right shift starts at the back and touches every value.',
    'insert-middle': 'Count the shifted suffix and connect its length to the insertion bound.',
    'insert-end':
      'Compare a direct spare-capacity append with allocation and copying during resize.',
    'delete-beginning': 'Explain why deleting the first value shifts every survivor left.',
    'delete-middle': 'Count the shifted suffix and connect its length to the deletion bound.',
    'delete-end': 'Explain why reducing logical size at the end requires no element shifts.',
    copy: 'Separate the returned O(n) output buffer from O(1) auxiliary workspace while counting copies.',
    'append-sequence': 'Use geometric resize-copy totals to justify amortized O(1) append time.'
  };

  let operation = $state<DynamicArrayOperation>(DEFAULT_DYNAMIC_ARRAY_CONFIG.operation);
  let valuesText = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.values.join(', '));
  let position = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.position ?? 2);
  let target = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.target ?? 21);
  let newValue = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.newValue ?? 42);
  let spareCapacity = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.spareCapacity ?? false);
  let lesson = $state(createDynamicArrayLesson(config()));
  let index = $state(0);
  let language = $state<SupportedLanguage>('cpp');
  let playing = $state(false);
  let submitted = $state<string[]>([]);
  let mistake = $state<MistakeAttempt | null>(null);
  let progress = $state(loadProgress());
  let completedOperations = $state<string[]>([]);
  let inputError = $state('');
  let traceInstance = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(lesson.steps[index]);
  let predictionResolved = $derived(!step.prediction || submitted.includes(step.prediction.id));
  let visibleState = $derived(
    step.prediction && !predictionResolved ? step.stateBefore : step.stateAfter
  );
  let finalEvidence = $derived(lesson.steps[lesson.steps.length - 1]?.complexityEvidence);
  let completedOperationCount = $derived(
    completionUnits.filter((unit) =>
      unit.keys.every((completionKey) => completedOperations.includes(completionKey))
    ).length
  );
  let masteryPercent = $derived(Math.round((completedOperationCount / operationCount) * 100));
  let operationMetadata = $derived(
    DYNAMIC_ARRAY_OPERATIONS.find((candidate) => candidate.id === operation) ??
      DYNAMIC_ARRAY_OPERATIONS[0]
  );
  let currentMistake = $derived(mistake?.stepId === step.id ? mistake : null);

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem('replaycs-array-operations') ?? '[]');
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

  function config(): DynamicArrayConfig {
    return {
      operation,
      values: parseValues(false),
      position,
      target,
      newValue,
      spareCapacity
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
      return [...DEFAULT_DYNAMIC_ARRAY_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value))) {
      if (validate) inputError = 'Each value must be a safe whole number.';
      return [...DEFAULT_DYNAMIC_ARRAY_CONFIG.values];
    }
    return values;
  }

  function buildTrace() {
    inputError = '';
    const values = parseValues();
    if (inputError) return;
    try {
      lesson = createDynamicArrayLesson({
        operation,
        values,
        position,
        target,
        newValue,
        spareCapacity
      });
      index = 0;
      submitted = [];
      mistake = null;
      playing = false;
      traceInstance += 1;
      clearInterval(timer);
      inputError = '';
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'ReplayCS could not build that trace.';
    }
  }

  function chooseOperation(next: DynamicArrayOperation) {
    operation = next;
    inputError = '';
    buildTrace();
  }

  function chooseClinicOperation(next: string) {
    const match = DYNAMIC_ARRAY_OPERATIONS.find((candidate) => candidate.id === next);
    if (match) {
      chooseOperation(match.id);
      document.getElementById('array-lab')?.scrollIntoView({ behavior: 'smooth' });
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

  function completionKeyForTrace() {
    if (['search', 'insert-middle', 'insert-end', 'delete-middle'].includes(operation)) {
      return finalEvidence?.caseId ?? String(operation);
    }
    return String(operation);
  }

  function tracePredictionsResolved() {
    return lesson.steps.every(
      (candidate) => !candidate.prediction || submitted.includes(candidate.prediction.id)
    );
  }

  function markOperationComplete() {
    if (!tracePredictionsResolved()) return;
    const id = completionKeyForTrace();
    if (!operationCompletionKeys.includes(id)) return;
    let nextCompleted = completedOperations;
    if (!completedOperations.includes(id)) {
      nextCompleted = [...completedOperations, id];
      completedOperations = nextCompleted;
      localStorage.setItem('replaycs-array-operations', JSON.stringify(completedOperations));
    }
    if (operationCompletionKeys.every((completionKey) => nextCompleted.includes(completionKey))) {
      progress = completeLesson(progress, 'array-lab', 35);
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
    if (index === lesson.steps.length - 1 && tracePredictionsResolved()) markOperationComplete();
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
    const evidenceId = `array-lab:${operation}:${step.prediction.id}`;
    if (correct) {
      progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
    } else {
      const authored = mistakeMetadata();
      const actual = String(authored?.correctAnswer ?? step.prediction.correctAnswer);
      mistake = {
        evidenceId,
        stepId: step.id,
        prompt: authored?.prompt ?? step.prediction.prompt,
        predicted: answer,
        actual,
        explanation: authored?.explanation ?? step.prediction.explanation,
        tag: authored?.tag ?? 'off-by-one',
        variableLabel: 'answer',
        transitionLabel: 'answer',
        transitionBefore: answer,
        transitionAfter: actual,
        recoveryPrompt: authored?.recoveryPrompt ?? 'Recovery challenge: enter the correct answer.'
      };
      progress = recordMisconception(progress, evidenceId, mistake.tag);
    }
    saveProgress(progress);
    if (index === lesson.steps.length - 1 && tracePredictionsResolved()) {
      markOperationComplete();
    }
  }

  function recoverMistake() {
    if (!mistake) return;
    progress = awardRecovery(progress, mistake.evidenceId);
    saveProgress(progress);
  }

  function mentorDeterministicExplanation() {
    const evidence = step.complexityEvidence;
    if (!evidence) return step.deterministicExplanation;
    const assumptions = evidence.assumptions.slice(0, 3).join(' ');
    const outputNote =
      operation === 'copy'
        ? ' The returned destination is O(n) output and is not charged as auxiliary workspace.'
        : '';
    return `${step.deterministicExplanation} Complexity evidence: ${evidence.caseId} (${evidence.selectedCase}); this line performs ${evidence.exactOperationCount} counted primitives and ${evidence.cumulativeOperationCount} cumulatively; ${evidence.timeComplexity} time and ${evidence.auxiliarySpace} auxiliary space. Assumptions: ${assumptions}.${outputNote}`.slice(
      0,
      1500
    );
  }

  function mentorContext(): StepContext {
    return {
      subject: 'dsa-1',
      lesson: 'array-lab',
      learningObjective: operationObjectives[operation],
      selectedLanguage: language,
      activeSourceLines: lesson.sourceByLanguage[language]
        .filter((line) => line.semanticOperationId === step.semanticOperationId)
        .map((line) => line.text),
      stateBefore: step.stateBefore,
      mutation: step.mutations,
      stateAfter: step.stateAfter,
      deterministicExplanation: mentorDeterministicExplanation(),
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
    progress = recordHint(progress, 'array-lab');
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
    return Array.isArray(state.values) ? state.values.length : 0;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Array & Dynamic Array Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Execute array access, search, shifting insertions and deletions, resizing appends, and amortized growth one source line at a time."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-1">← DSA I</a>
    <p class="eyebrow">Contiguous memory laboratory</p>
    <h1>Array & Dynamic Array Lab</h1>
    <p>Watch every read, write, shift, and resize copy before it changes the buffer.</p>
  </div>
  <div class="mastery" aria-label={`Array operation mastery ${masteryPercent}%`}>
    <span>{completedOperationCount}/{operationCount} operations</span>
    <div><i style={`width:${masteryPercent}%`}></i></div>
    <b>
      {masteryPercent}% mastery path · {completedOperations.length}/{requiredCaseCount} cases
    </b>
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
      onchange={(event) => chooseOperation(event.currentTarget.value as DynamicArrayOperation)}
    >
      {#each DYNAMIC_ARRAY_OPERATIONS as item}
        <option value={item.id}>{item.label}</option>
      {/each}
    </select></label
  >
  <label class="values-field"
    >Input values
    <input bind:value={valuesText} aria-describedby="array-help array-error" />
  </label>
  {#if ['access', 'update', 'insert-middle', 'delete-middle'].includes(String(operation))}
    <label>Position<input type="number" min="0" max="8" bind:value={position} /></label>
  {/if}
  {#if operation === 'search'}
    <label>Target value<input type="number" bind:value={target} /></label>
  {/if}
  {#if ['update', 'insert-beginning', 'insert-middle', 'insert-end'].includes(String(operation))}
    <label>New value<input type="number" bind:value={newValue} /></label>
  {/if}
  <button class="primary" type="submit">Build deterministic trace</button>
  <p id="array-help">
    Slot addresses stay visible so index arithmetic is never hand-waved. Maximum 8 values.
  </p>
  {#if inputError}<p id="array-error" class="error" role="alert">{inputError}</p>{/if}
</form>

{#if operation === 'insert-end'}
  <section class="capacity-switch panel" aria-labelledby="capacity-switch-title">
    <div>
      <p class="eyebrow">Flagship comparison</p>
      <h2 id="capacity-switch-title">Spare capacity</h2>
      <p>
        This switch rebuilds the source, trace path, exact counts, animation, derivation, and bound
        for the same append.
      </p>
    </div>
    <button
      type="button"
      class:on={spareCapacity}
      role="switch"
      aria-checked={spareCapacity}
      aria-label="Spare capacity"
      onclick={() => {
        spareCapacity = !spareCapacity;
        buildTrace();
      }}><span>{spareCapacity ? 'ON' : 'OFF'}</span><i></i></button
    >
    <div class="capacity-paths">
      <div class:active={!spareCapacity}>
        <b>OFF · O(n)</b><span>allocate 2n → copy n elements → write</span><small
          >size == capacity forces a full-buffer copy first.</small
        >
      </div>
      <div class:active={spareCapacity}>
        <b>ON · O(1)</b><span>data[size] = value · size += 1</span><small
          >One write into an existing slot; no copying.</small
        >
      </div>
    </div>
  </section>
{/if}

<section class="operation-context" aria-live="polite">
  <div>
    <span class="eyebrow">Selected operation</span>
    <h2>{operationMetadata.label}</h2>
  </div>
  <p>{operationMetadata.description}</p>
  <div class="case-badges">
    <span>{finalEvidence?.selectedCase ?? 'deterministic'} case</span>
    <b>{finalEvidence?.timeComplexity ?? '—'} time</b>
    <b>{finalEvidence?.auxiliarySpace ?? '—'} space</b>
    <span>n = {valueCount(lesson.initialState)}</span>
  </div>
</section>

<div id="array-lab" class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={selectLanguage}
  />

  <main class="execution">
    <DynamicArrayVisualizer
      state={visibleState}
      {language}
      activeSemantic={step.semanticOperationId}
    />
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
      {#key `${traceInstance}:${step.prediction.id}`}
        <PredictionCheckpoint
          challenge={step.prediction}
          submitted={submitted.includes(step.prediction.id)}
          onsubmit={submitPrediction}
        />
      {/key}
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
      {#key `${traceInstance}-${step.id}-${language}`}
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
    <p class="eyebrow">Fixed arrays versus real library growth</p>
    <h2 id="language-notes-title">The same buffer in four languages</h2>
  </div>
  <div>
    {#each languageReality as [name, note]}
      <article>
        <b>{name}</b>
        <p>{note}</p>
      </article>
    {/each}
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
    <h2 id="matrix-title">Array complexity, with assumptions named</h2>
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
    <p class="output-note">
      <b>Space accounting:</b> copying returns an O(n) destination buffer as output while reusing O(1)
      auxiliary workspace. A growing dynamic array temporarily holds a replacement O(n) buffer during
      resize, including across the amortized append sequence.
    </p>
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
  .capacity-switch {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.8rem 1.2rem;
    padding: 1rem;
    margin-bottom: 1rem;
    border-color: #fbbf2455;
  }
  .capacity-switch h2 {
    margin: 0.2rem 0;
  }
  .capacity-switch p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .capacity-switch > button {
    position: relative;
    width: 88px;
    height: 42px;
    padding: 0.2rem 0.5rem;
    border-radius: 99px;
    background: #172033;
  }
  .capacity-switch > button span {
    position: absolute;
    left: 12px;
    top: 13px;
    color: var(--warning);
    font: 0.66rem var(--mono);
  }
  .capacity-switch > button i {
    position: absolute;
    right: 5px;
    top: 5px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--warning);
    transition: 180ms;
  }
  .capacity-switch > button.on {
    background: #2dd4bf28;
  }
  .capacity-switch > button.on span {
    left: auto;
    right: 13px;
    color: var(--primary);
  }
  .capacity-switch > button.on i {
    right: 52px;
    background: var(--primary);
  }
  .capacity-paths {
    grid-column: 1/-1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  .capacity-paths div {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    opacity: 0.5;
  }
  .capacity-paths div.active {
    opacity: 1;
    border-color: var(--primary);
    background: #2dd4bf09;
  }
  .capacity-paths b {
    color: var(--primary);
  }
  .capacity-paths span {
    overflow-wrap: anywhere;
    font: 0.68rem var(--mono);
  }
  .capacity-paths small {
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
    grid-template-columns: repeat(5, 1fr);
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
  .output-note {
    margin: 0;
    padding: 0.85rem;
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.5;
  }
  .output-note b {
    color: var(--accent);
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
    .capacity-paths,
    .language-notes > div:last-child {
      grid-template-columns: 1fr 1fr;
    }
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 520px) {
    .capacity-switch {
      grid-template-columns: 1fr;
    }
    .capacity-paths,
    .language-notes > div:last-child,
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr;
    }
  }
</style>
