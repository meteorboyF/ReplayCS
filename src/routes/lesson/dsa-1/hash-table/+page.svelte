<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import HashTableVisualizer from '$lib/components/visualizers/HashTableVisualizer.svelte';
  import {
    DEFAULT_HASH_TABLE_CONFIG, HASH_TABLE_OPERATIONS, createHashTableLesson, type HashTableConfig, type HashTableOperation, type HashTableOperationMetadata, type HashTableBacking, type HashFunctionType
  } from '$lib/engines/dsa/hashTable';
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

  const operationCompletionKeys: string[] = HASH_TABLE_OPERATIONS.map((item) => String(item.id ?? ''));
  const operationCount = operationCompletionKeys.length;
  const languages: SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];
  const complexityRows = [
    ['EnhashTable', 'All cases', 'O(1)', 'O(1)'],
    ['DehashTable', 'All cases', 'O(1)', 'O(1)'],
    ['Peek', 'All cases', 'O(1)', 'O(1)']
  ];
  const mistakeClinic = [
    ['hashTable-overflow', 'EnhashTable to full hashTable', 'enhashTable'],
    ['hashTable-underflow', 'DehashTable empty hashTable', 'dehashTable']
  ] as const;

  let operation = $state<HashTableOperation>(DEFAULT_HASH_TABLE_CONFIG.operation);
  let backing = $state<HashTableBacking>(DEFAULT_HASH_TABLE_CONFIG.backing);
  let hashType = $state<HashFunctionType>(DEFAULT_HASH_TABLE_CONFIG.hashType);
  let entriesText = $state(DEFAULT_HASH_TABLE_CONFIG.initialEntries.map(e => `${e.key}:${e.value}`).join(', '));
  let targetKey = $state(DEFAULT_HASH_TABLE_CONFIG.targetKey ?? 30);
  let targetValue = $state(DEFAULT_HASH_TABLE_CONFIG.targetValue ?? 300);

  let inputError = $state('');
  let lesson = $state(createHashTableLesson(config()));
  let index = $state(0);
  let language = $state<SupportedLanguage>('cpp');
  let playing = $state(false);
  let submitted = $state<string[]>([]);
  let mistake = $state<MistakeAttempt | null>(null);
  let progress = $state(loadProgress());
  let completedOperations = $state<string[]>([]);
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
        localStorage.getItem('replaycs-hashTable-operations') ?? '[]'
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

  function metadataRecord(metadata: HashTableOperationMetadata) {
    return metadata as unknown as Record<string, unknown>;
  }

  function operationMetadata(id: HashTableOperation) {
    return (
      HASH_TABLE_OPERATIONS.find((candidate) => metadataRecord(candidate).id === id) ??
      HASH_TABLE_OPERATIONS[0]
    );
  }

  function metadataText(metadata: HashTableOperationMetadata, ...keys: string[]) {
    const record = metadataRecord(metadata);
    const value = keys.map((key) => record[key]).find((candidate) => typeof candidate === 'string');
    return typeof value === 'string' ? value : String(record.id);
  }

  function config(): HashTableConfig {
    return {
      operation,
      backing,
      hashType,
      initialEntries: parseEntries(false),
      targetKey,
      targetValue
    };
  }

  function parseEntries(validate = true) {
    const pieces = entriesText.split(',').map((v) => v.trim()).filter(Boolean);
    const entries = pieces.map((piece) => {
      const [kStr, vStr] = piece.split(':');
      return { key: parseInt(kStr, 10), value: parseInt(vStr ?? kStr, 10) };
    });

    if (entries.some((e) => isNaN(e.key) || isNaN(e.value)) || entries.length > 8) {
      if (validate) inputError = 'Enter up to 8 comma-separated key:value pairs.';
      return [...DEFAULT_HASH_TABLE_CONFIG.initialEntries];
    }
    inputError = '';
    return entries;
  }

  function buildTrace() {
    const parsed = parseEntries(true);
    inputError = '';
    if (inputError) return;

    try {
      lesson = createHashTableLesson({
        operation,
        backing,
        hashType,
        initialEntries: parsed,
        targetKey,
        targetValue
      });
      index = 0;
      playing = false;
      clearInterval(timer);
      submitted = loadPredictions(`hashTable-${operation}`);
    } catch (error) {
      inputError = error instanceof Error ? error.message : String(error);
    }
  }

  function chooseOperation(next: HashTableOperation) {
    operation = next;
    inputError = '';
    buildTrace();
  }

  function chooseClinicOperation(next: string) {
    const match = HASH_TABLE_OPERATIONS.find(
      (candidate) => String(metadataRecord(candidate).id) === next
    );
    if (match) {
      chooseOperation(metadataRecord(match).id as HashTableOperation);
      document.getElementById('hashTable-lab')?.scrollIntoView({ behavior: 'smooth' });
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
      localStorage.setItem('replaycs-hashTable-operations', JSON.stringify(completedOperations));
    }
    if (nextCompleted.length >= operationCount) {
      progress = completeLesson(progress, 'hashTable-lab', 35);
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
    const evidenceId = `hashTable-lab:${operation}:${step.prediction.id}`;
    if (correct) {
      progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
    } else {
      const authored = mistakeMetadata();
      const firstMutation = step.mutations[0];
      const inferredStateKey = firstMutation?.entityId ?? 'front';
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
      lesson: 'hashTable-lab',
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
    progress = recordHint(progress, 'hashTable-lab');
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
    return Array.isArray(state.elements) ? state.elements.length : 0;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>HashTable Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Execute hashTable enhashTable and dehashTable operations one source line at a time."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-1">← DSA I</a>
    <p class="eyebrow">FIFO execution laboratory</p>
    <h1>Hash Table Lab</h1>
    <p>See every reference read and write before it changes memory.</p>
  </div>
  <div class="mastery" aria-label={`HashTable operation mastery ${masteryPercent}%`}>
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
      bind:value={operation}
      onchange={() => { buildTrace(); }}
    >
      {#each HASH_TABLE_OPERATIONS as item}
        <option value={item.id}>
          {item.label}
        </option>
      {/each}
    </select>
  </label>
  <label class="operation-field">
    Collision Strategy
    <select bind:value={backing} onchange={buildTrace}>
      <option value="separate-chaining">Separate Chaining</option>
      <option value="linear-probing">Linear Probing</option>
    </select>
  </label>
  <label class="operation-field">
    Hash Function
    <select bind:value={hashType} onchange={buildTrace}>
      <option value="good">Good (Uniform)</option>
      <option value="collision-heavy">Poor (Collision-heavy)</option>
    </select>
  </label>
  <label class="values-field"
    >Initial Entries
    <input bind:value={entriesText} aria-describedby="list-help list-error" />
  </label>
  <label>Target Key<input type="number" bind:value={targetKey} /></label>
  {#if String(operation) === 'insert'}
    <label>Target Value<input type="number" bind:value={targetValue} /></label>
  {/if}
  <button class="primary" type="submit">Build deterministic trace</button>
  <p id="list-help">Enter comma-separated values (e.g. 10:100, 20:200).</p>
  {#if inputError}<p id="list-error" class="error" role="alert">{inputError}</p>{/if}
</form>

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

<div id="hashTable-lab" class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={selectLanguage}
  />

  <main class="execution">
    <HashTableVisualizer state={visibleState} />
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
      <p><code>std::hashTable</code> wrapping <code>std::deque</code>.</p>
    </article>
    <article>
      <b>Java</b>
      <p><code>HashTable</code> interface with <code>LinkedList</code> or <code>ArrayDeque</code>.</p>
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
    <h2 id="matrix-title">HashTable complexity, with assumptions named</h2>
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
</style>
