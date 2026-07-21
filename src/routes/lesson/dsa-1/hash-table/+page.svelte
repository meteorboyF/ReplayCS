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
    DEFAULT_HASH_TABLE_CONFIG,
    HASH_TABLE_OPERATIONS,
    createHashTableLesson,
    type HashTableConfig,
    type HashTableOperation,
    type HashTableStrategy
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

  // Insert/search/delete under both strategies plus resize are separate mastery cases.
  const operationCompletionKeys: string[] = HASH_TABLE_OPERATIONS.flatMap((item) =>
    item.id === 'resize' ? ['resize'] : [`${item.id}-chaining`, `${item.id}-linear-probing`]
  );
  const operationCount = operationCompletionKeys.length;
  const complexityRows = [
    ['Search', 'Expected — uniform hashing, bounded α', 'O(1)', 'O(1)'],
    ['Search', 'Worst — every key collides', 'O(n)', 'O(1)'],
    ['Insert', 'Expected — uniform hashing, bounded α', 'O(1)', 'O(1)'],
    ['Insert', 'Resize triggered — rehash all keys', 'O(n)', 'O(n)'],
    ['Insert', 'Amortized over doubling', 'O(1)', 'O(1)'],
    ['Delete', 'Expected — uniform hashing, bounded α', 'O(1)', 'O(1)'],
    ['Delete', 'Worst — every key collides', 'O(n)', 'O(1)'],
    ['Resize & rehash', 'All n keys recomputed', 'O(n)', 'O(n)']
  ];
  const mistakeClinic = [
    ['hash-vs-bucket', 'Confusing the key with its bucket', 'insert'],
    ['tombstone-vs-empty', 'Emptying a slot instead of tombstoning', 'delete'],
    ['rehash-scope', 'Rehashing only some keys on resize', 'resize'],
    ['amortized-vs-worst', 'Confusing amortized with worst case', 'insert']
  ] as const;
  const languageReality = [
    [
      'C',
      'No built-in table: you own the bucket array, the hash, collisions, and resizing — exactly the traces above.'
    ],
    [
      'C++ std::unordered_map',
      'Separate chaining with a max_load_factor of 1.0 by default; rehash() doubles the bucket count.'
    ],
    [
      'Java HashMap',
      'Chaining with a 0.75 load-factor threshold; long chains convert to red-black trees since Java 8.'
    ],
    [
      'Python dict',
      'Open addressing with perturbed probing and tombstone-like dummy entries; resizes near 2/3 load.'
    ]
  ];
  const presets = [
    {
      id: 'uniform',
      label: 'Good distribution',
      detail: 'Keys spread across buckets → short chains → expected O(1)',
      keys: '12, 5, 21, 30',
      key: 19,
      bucketCount: 7
    },
    {
      id: 'collision-heavy',
      label: 'Collision-heavy',
      detail: 'All keys ≡ 0 mod 7 pile into bucket 0 → worst-case O(n)',
      keys: '7, 14, 21, 28',
      key: 35,
      bucketCount: 7
    },
    {
      id: 'low-load',
      label: 'Low load factor',
      detail: 'n/m = 3/16 ≈ 0.19 → collisions are rare',
      keys: '12, 5, 30',
      key: 19,
      bucketCount: 16
    },
    {
      id: 'high-load',
      label: 'High load factor',
      detail: 'n/m = 3/4 = 0.75 → collisions and probe runs grow',
      keys: '12, 5, 30',
      key: 19,
      bucketCount: 4
    }
  ] as const;

  let operation = $state<HashTableOperation>(DEFAULT_HASH_TABLE_CONFIG.operation);
  let strategy = $state<HashTableStrategy>(DEFAULT_HASH_TABLE_CONFIG.strategy);
  let keysText = $state(DEFAULT_HASH_TABLE_CONFIG.keys.join(', '));
  let key = $state(DEFAULT_HASH_TABLE_CONFIG.key ?? 19);
  let bucketCount = $state(DEFAULT_HASH_TABLE_CONFIG.bucketCount ?? 7);
  let activePreset = $state('uniform');
  let lesson = $state(createHashTableLesson(config()));
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
  let operationMetadata = $derived(
    HASH_TABLE_OPERATIONS.find((candidate) => candidate.id === operation) ??
      HASH_TABLE_OPERATIONS[0]
  );
  let currentMistake = $derived(mistake?.stepId === step.id ? mistake : null);

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    try {
      const stored: unknown = JSON.parse(
        localStorage.getItem('replaycs-hash-table-operations') ?? '[]'
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

  function config(): HashTableConfig {
    return {
      operation,
      strategy,
      keys: parseKeys(false),
      key,
      bucketCount
    };
  }

  function parseKeys(validate = true) {
    const pieces = keysText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^\d+$/.test(value)) || pieces.length > 8) {
      if (validate) inputError = 'Enter up to 8 comma-separated non-negative whole numbers.';
      return [...DEFAULT_HASH_TABLE_CONFIG.keys];
    }
    const keys = pieces.map(Number);
    if (keys.some((value) => !Number.isSafeInteger(value))) {
      if (validate) inputError = 'Each key must be a safe whole number.';
      return [...DEFAULT_HASH_TABLE_CONFIG.keys];
    }
    return keys;
  }

  function buildTrace() {
    inputError = '';
    const keys = parseKeys();
    if (inputError) return;
    try {
      lesson = createHashTableLesson({ operation, strategy, keys, key, bucketCount });
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

  function chooseOperation(next: HashTableOperation) {
    operation = next;
    inputError = '';
    buildTrace();
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((candidate) => candidate.id === presetId);
    if (!preset) return;
    activePreset = preset.id;
    keysText = preset.keys;
    key = preset.key;
    bucketCount = preset.bucketCount;
    buildTrace();
  }

  function chooseClinicOperation(next: string) {
    const match = HASH_TABLE_OPERATIONS.find((candidate) => candidate.id === next);
    if (match) {
      chooseOperation(match.id);
      document.getElementById('hash-table-lab')?.scrollIntoView({ behavior: 'smooth' });
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
    const id = operation === 'resize' ? 'resize' : `${operation}-${strategy}`;
    let nextCompleted = completedOperations;
    if (!completedOperations.includes(id)) {
      nextCompleted = [...completedOperations, id];
      completedOperations = nextCompleted;
      localStorage.setItem('replaycs-hash-table-operations', JSON.stringify(completedOperations));
    }
    if (nextCompleted.length >= operationCount) {
      progress = completeLesson(progress, 'hash-table-lab', 40);
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
    const evidenceId = `hash-table-lab:${operation}:${step.prediction.id}`;
    if (correct) {
      progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
    } else {
      const authored = mistakeMetadata();
      const firstMutation = step.mutations[0];
      const inferredStateKey = firstMutation?.entityId.replace(/^var-/, '') ?? 'homeBucket';
      const stateKey = authored?.stateKey ?? inferredStateKey;
      const actual = String(authored?.correctAnswer ?? step.prediction.correctAnswer);
      const attempt: MistakeAttempt = {
        evidenceId,
        stepId: step.id,
        prompt: authored?.prompt ?? step.prediction.prompt,
        predicted: answer,
        actual,
        explanation: authored?.explanation ?? step.prediction.explanation,
        tag: authored?.tag ?? 'hash-vs-bucket',
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
      lesson: 'hash-table-lab',
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
    progress = recordHint(progress, 'hash-table-lab');
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

  function keyCount(state: Record<string, TraceValue>) {
    return typeof state.size === 'number' ? state.size : 0;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Hash Table Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Execute hashing, bucket selection, collisions, chaining, linear probing, tombstones, load factor, and rehashing one source line at a time."
  />
</svelte:head>

<header class="lesson-head">
  <div>
    <a class="back" href="/learn/dsa-1">← DSA I</a>
    <p class="eyebrow">Hashing execution laboratory</p>
    <h1>Hash Table Lab</h1>
    <p>Watch every hash computation, collision, probe, tombstone, and rehash before it happens.</p>
  </div>
  <div class="mastery" aria-label={`Hash table operation mastery ${masteryPercent}%`}>
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
      onchange={(event) => chooseOperation(event.currentTarget.value as HashTableOperation)}
    >
      {#each HASH_TABLE_OPERATIONS as item}
        <option value={item.id}>{item.label}</option>
      {/each}
    </select></label
  >
  <label
    >Strategy
    <select
      aria-label="Strategy"
      value={strategy}
      onchange={(event) => {
        strategy = event.currentTarget.value as HashTableStrategy;
        buildTrace();
      }}
    >
      <option value="chaining">Separate chaining</option>
      <option value="linear-probing">Linear probing</option>
    </select></label
  >
  <label class="values-field"
    >Stored keys
    <input bind:value={keysText} aria-describedby="keys-help keys-error" />
  </label>
  {#if operation !== 'resize'}
    <label>Key<input type="number" min="0" bind:value={key} /></label>
  {/if}
  <label>Buckets m<input type="number" min="2" max="16" bind:value={bucketCount} /></label>
  <button class="primary" type="submit">Build deterministic trace</button>
  <p id="keys-help">h(k) = k mod m. Up to 8 distinct non-negative keys; probing needs n &lt; m.</p>
  {#if inputError}<p id="keys-error" class="error" role="alert">{inputError}</p>{/if}
</form>

<section class="presets panel" aria-labelledby="presets-title">
  <div>
    <p class="eyebrow">Flagship comparison</p>
    <h2 id="presets-title">Distribution and load factor</h2>
    <p>
      The same operation flips between expected O(1) and worst-case O(n) depending only on how keys
      distribute and how full the table is.
    </p>
  </div>
  <div class="preset-grid">
    {#each presets as preset}
      <button
        type="button"
        class:active={activePreset === preset.id}
        onclick={() => applyPreset(preset.id)}
      >
        <b>{preset.label}</b><span>{preset.detail}</span>
      </button>
    {/each}
  </div>
</section>

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
    <span>n = {keyCount(lesson.initialState)}</span>
  </div>
</section>

<div id="hash-table-lab" class="lab">
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
    <h2 id="language-notes-title">Real hash tables in four languages</h2>
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
    <h2 id="matrix-title">Hash-table complexity, with assumptions named</h2>
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
    min-width: 160px;
  }
  .builder .values-field {
    flex: 1;
    min-width: 200px;
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
  .presets {
    display: grid;
    gap: 0.8rem;
    padding: 1rem;
    margin-bottom: 1rem;
    border-color: #fbbf2455;
  }
  .presets h2 {
    margin: 0.2rem 0;
  }
  .presets > div > p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  .preset-grid button {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem;
    text-align: left;
    border: 1px solid var(--border);
    border-radius: 10px;
    opacity: 0.65;
  }
  .preset-grid button.active {
    opacity: 1;
    border-color: var(--primary);
    background: #2dd4bf09;
  }
  .preset-grid b {
    color: var(--primary);
  }
  .preset-grid span {
    color: var(--muted);
    font-size: 0.66rem;
    line-height: 1.4;
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
    .preset-grid,
    .language-notes > div:last-child,
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 520px) {
    .preset-grid,
    .language-notes > div:last-child,
    .mistake-clinic > div:last-child {
      grid-template-columns: 1fr;
    }
  }
</style>
