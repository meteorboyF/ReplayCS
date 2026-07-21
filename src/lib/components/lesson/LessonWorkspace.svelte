<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import { LEARNING_MODES, shouldGateStep, type LearningMode } from '$lib/lesson/mode';
  import type { MisconceptionTag } from '$lib/progress/misconceptions';
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
  import type { StepContext } from '$lib/server/openai/schemas';
  import type { SubjectId, SupportedLanguage, TraceLesson, TraceValue } from '$lib/trace/types';

  type AuthoredMistake = {
    prompt?: string;
    wrongAnswer?: TraceValue;
    correctAnswer?: TraceValue;
    explanation?: string;
    tag?: string;
    variableLabel?: string;
    stateKey?: string;
    recoveryPrompt?: string;
  };

  let {
    lesson,
    subject,
    completionId,
    completionXp = 30,
    completionKey,
    completionKeys,
    backHref,
    backLabel = '← Back',
    eyebrow,
    title,
    operationTitle,
    operationSummary,
    tabWidth = 'default',
    controls,
    visual,
    aboutTitle = 'About this implementation',
    about
  }: {
    lesson: TraceLesson;
    subject: SubjectId;
    completionId: string;
    completionXp?: number;
    completionKey: string;
    completionKeys: readonly string[];
    backHref: string;
    backLabel?: string;
    eyebrow: string;
    title: string;
    operationTitle: string;
    operationSummary: string;
    tabWidth?: 'default' | 'wide';
    controls: Snippet;
    visual: Snippet<
      [{ state: Record<string, TraceValue>; language: SupportedLanguage; semantic: string }]
    >;
    aboutTitle?: string;
    about?: Snippet;
  } = $props();

  let mode = $state<LearningMode>('learn');
  let index = $state(0);
  let language = $state<SupportedLanguage>('cpp');
  let playing = $state(false);
  let speed = $state(1);
  let submitted = $state<string[]>([]);
  let mistake = $state<MistakeAttempt | null>(null);
  let progress = $state(loadProgress());
  let completed = $state<string[]>([]);
  let showLearnPrediction = $state(false);
  let mobileTab = $state<'visual' | 'code' | 'state' | 'complexity' | 'explain'>('visual');
  let timer: ReturnType<typeof setInterval> | undefined;

  const storageKey = $derived(`replaycs-${completionId}-progress`);
  let step = $derived(lesson.steps[Math.min(index, lesson.steps.length - 1)]);
  let gated = $derived(shouldGateStep(mode, step, submitted));
  // In Challenge Mode the resulting mutation is hidden until the learner answers.
  let visibleState = $derived(gated ? step.stateBefore : step.stateAfter);
  let finalEvidence = $derived(lesson.steps[lesson.steps.length - 1]?.complexityEvidence);
  let masteryPercent = $derived(
    completionKeys.length ? Math.round((completed.length / completionKeys.length) * 100) : 0
  );
  let currentMistake = $derived(mistake?.stepId === step.id ? mistake : null);
  // Guided surfaces optional checkpoints inline; Learn only when the learner opts in.
  let showPrediction = $derived(
    Boolean(step.prediction) &&
      (mode === 'challenge' || mode === 'guided' || (mode === 'learn' && showLearnPrediction))
  );
  let predictionResolved = $derived(!step.prediction || submitted.includes(step.prediction.id));

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      completed = [
        ...new Set(
          (Array.isArray(stored) ? stored : []).filter(
            (value: unknown): value is string =>
              typeof value === 'string' && completionKeys.includes(value)
          )
        )
      ];
    } catch {
      completed = [];
    }
    return () => clearInterval(timer);
  });

  // A fresh lesson (new operation/input) resets the trace cursor and answers.
  let lessonToken = $derived(`${lesson.id}:${lesson.steps.length}:${lesson.title}`);
  let lastToken = '';
  $effect(() => {
    if (lessonToken !== lastToken) {
      lastToken = lessonToken;
      index = 0;
      submitted = [];
      mistake = null;
      playing = false;
      showLearnPrediction = false;
      clearInterval(timer);
    }
  });

  function setMode(next: LearningMode) {
    mode = next;
    playing = false;
    clearInterval(timer);
    // Leaving Challenge should never strand the learner on a gated step.
    if (next !== 'challenge') mistake = null;
  }

  function gatedIndex(requested: number) {
    const bounded = Math.max(0, Math.min(requested, lesson.steps.length - 1));
    if (mode !== 'challenge') return bounded;
    const blocking = lesson.steps.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex < bounded &&
        candidate.prediction &&
        !submitted.includes(candidate.prediction.id)
    );
    return blocking >= 0 ? blocking : bounded;
  }

  function markComplete() {
    let next = completed;
    if (!completed.includes(completionKey)) {
      next = [...completed, completionKey];
      completed = next;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore quota errors */
      }
    }
    if (next.length >= completionKeys.length) {
      progress = completeLesson(progress, completionId, completionXp);
      saveProgress(progress);
    }
  }

  function jump(requested: number) {
    const bounded = Math.max(0, Math.min(requested, lesson.steps.length - 1));
    const resolved = gatedIndex(bounded);
    index = resolved;
    if (resolved < bounded) {
      playing = false;
      clearInterval(timer);
    }
    if (index === lesson.steps.length - 1) markComplete();
  }

  function togglePlayback() {
    playing = !playing;
    clearInterval(timer);
    if (playing) {
      timer = setInterval(() => {
        if (index >= lesson.steps.length - 1) {
          playing = false;
          clearInterval(timer);
        } else if (mode === 'challenge' && gated) {
          // Never auto-advance past a Challenge gate.
          playing = false;
          clearInterval(timer);
        } else jump(index + 1);
      }, 900 / speed);
    }
  }

  function selectLanguage(next: SupportedLanguage) {
    language = next;
    progress = recordLanguageUse(progress, next);
    saveProgress(progress);
  }

  function authoredMistake(): AuthoredMistake | null {
    const candidate = step.metadata?.mistake;
    return candidate && typeof candidate === 'object' ? (candidate as AuthoredMistake) : null;
  }

  function submitPrediction(correct: boolean, answer: string) {
    if (!step.prediction) return;
    submitted = [...submitted, step.prediction.id];
    const evidenceId = `${completionId}:${completionKey}:${step.prediction.id}`;
    // XP + challenge accounting only apply in Challenge Mode.
    if (correct) {
      if (mode === 'challenge') {
        progress = awardPrediction(progress, evidenceId, step.prediction.xpReward);
        saveProgress(progress);
      }
      return;
    }
    if (mode !== 'challenge') return; // Guided/Learn wrong answers never punish or gate.
    const authored = authoredMistake();
    const firstMutation = step.mutations[0];
    const inferredKey = firstMutation?.entityId.replace(/^(pointer|var|slot)-/, '') ?? 'state';
    const stateKey = authored?.stateKey ?? inferredKey;
    const attempt: MistakeAttempt = {
      evidenceId,
      stepId: step.id,
      prompt: authored?.prompt ?? step.prediction.prompt,
      predicted: answer,
      actual: String(authored?.correctAnswer ?? step.prediction.correctAnswer),
      explanation: authored?.explanation ?? step.prediction.explanation,
      tag: (authored?.tag ??
        step.prediction.misconceptionTags?.[0] ??
        'off-by-one') as MisconceptionTag,
      variableLabel: authored?.variableLabel ?? stateKey,
      stateKey,
      recoveryPrompt:
        authored?.recoveryPrompt ?? `Recovery challenge: enter the correct ${stateKey} value.`
    };
    mistake = attempt;
    progress = recordMisconception(progress, evidenceId, attempt.tag);
    saveProgress(progress);
  }

  function recoverMistake() {
    if (!mistake) return;
    progress = awardRecovery(progress, mistake.evidenceId);
    saveProgress(progress);
  }

  function mentorContext(): StepContext {
    return {
      subject,
      lesson: completionId,
      learningObjective: lesson.learningObjectives[0] ?? '',
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
            correctAnswer:
              mode === 'challenge' && gated
                ? '(hidden until you predict)'
                : String(step.prediction.correctAnswer)
          }
        : undefined
    };
  }

  function recordMentorHint() {
    progress = recordHint(progress, completionId);
    saveProgress(progress);
  }

  function handleKeydown(event: KeyboardEvent) {
    const el = event.target instanceof Element ? event.target : null;
    if (el?.closest('a,button,input,select,textarea,summary,[contenteditable=true]')) return;
    if (event.key === 'ArrowRight') jump(index + 1);
    if (event.key === 'ArrowLeft') jump(index - 1);
    if (event.key === ' ') {
      event.preventDefault();
      togglePlayback();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="lesson-head">
  <div class="titles">
    <a class="back" href={backHref}>{backLabel}</a>
    <p class="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
  </div>
  <div class="head-right">
    <div class="mode-toggle" role="group" aria-label="Learning mode">
      {#each LEARNING_MODES as option}
        <button
          type="button"
          class:selected={mode === option.id}
          aria-pressed={mode === option.id}
          title={option.blurb}
          onclick={() => setMode(option.id)}>{option.label}</button
        >
      {/each}
    </div>
    <div class="mastery" aria-label={`${title} mastery ${masteryPercent}%`}>
      <span>{completed.length}/{completionKeys.length} done</span>
      <div><i style={`width:${masteryPercent}%`}></i></div>
    </div>
  </div>
</header>

<div class="control-bar panel">
  {@render controls()}
</div>

<p class="mode-hint">
  {#if mode === 'learn'}
    <b>Learn Mode.</b> Explore every step freely — move forward and back, change inputs, and ask the mentor.
    Predictions are optional.
  {:else if mode === 'guided'}
    <b>Guided Mode.</b> Optional checkpoints appear as you go. Answer, ask for a hint, or skip — the trace
    never blocks.
  {:else}
    <b>Challenge Mode.</b> At each checkpoint the next state stays hidden until you predict it. Correct
    answers earn XP; misses become a replay.
  {/if}
</p>

<section class="op-context" aria-live="polite">
  <h2>{operationTitle}</h2>
  <p>{operationSummary}</p>
  <div class="badges">
    <span>{finalEvidence?.selectedCase ?? 'deterministic'} case</span>
    <b>{finalEvidence?.timeComplexity ?? '—'} time</b>
    <b>{finalEvidence?.auxiliarySpace ?? '—'} space</b>
  </div>
</section>

<!-- Mobile tab switcher (hidden on desktop) -->
<div class="mobile-tabs" role="tablist" aria-label="Lesson views">
  {#each [['visual', 'Visual'], ['code', 'Code'], ['state', 'State'], ['complexity', 'Complexity'], ['explain', 'Explain']] as [id, label]}
    <button
      type="button"
      role="tab"
      aria-selected={mobileTab === id}
      class:selected={mobileTab === id}
      onclick={() => (mobileTab = id as typeof mobileTab)}>{label}</button
    >
  {/each}
</div>

<div class="workspace" class:wide={tabWidth === 'wide'} data-tab={mobileTab}>
  <div class="pane code" data-pane="code">
    <CodePane
      source={lesson.sourceByLanguage}
      {language}
      activeSemantic={step.semanticOperationId}
      onlanguage={selectLanguage}
    />
  </div>

  <div class="pane visual" data-pane="visual">
    {@render visual({ state: visibleState, language, semantic: step.semanticOperationId })}
  </div>

  <div class="pane state" data-pane="state">
    <ExecutionEvidence {step} revealed={!gated} />
  </div>

  <div class="pane complexity" data-pane="complexity">
    {#if step.complexityEvidence}<ComplexityWhy evidence={step.complexityEvidence} />{/if}
  </div>
</div>

<div class="playbar panel">
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
  <label class="speed"
    >Speed
    <select value={speed} onchange={(event) => (speed = Number(event.currentTarget.value))}>
      <option value={0.5}>0.5×</option>
      <option value={1}>1×</option>
      <option value={2}>2×</option>
    </select>
  </label>
</div>

<section class="explain panel" data-pane="explain" class:mobile-active={mobileTab === 'explain'}>
  <div class="explain-head">
    <span class="eyebrow">Step {index + 1} of {lesson.steps.length} · {step.eventType}</span>
    <b>{step.title}</b>
  </div>
  <p class="explanation">
    {gated
      ? 'Predict the result below to reveal this step — you are in Challenge Mode.'
      : step.deterministicExplanation}
  </p>

  {#if step.prediction && mode === 'learn' && !showLearnPrediction}
    <button type="button" class="try-predict" onclick={() => (showLearnPrediction = true)}>
      Try predicting this step (optional)
    </button>
  {/if}

  {#if showPrediction && step.prediction}
    <div class="prediction-slot" class:optional={mode !== 'challenge'}>
      {#if mode !== 'challenge'}
        <div class="prediction-tag">
          <span>{mode === 'guided' ? 'Optional checkpoint' : 'Optional practice'}</span>
          <button
            type="button"
            onclick={() => {
              if (step.prediction) submitted = [...submitted, step.prediction.id];
              showLearnPrediction = false;
            }}>Skip</button
          >
        </div>
      {/if}
      {#if !predictionResolved || mode === 'challenge'}
        <PredictionCheckpoint
          challenge={step.prediction}
          submitted={submitted.includes(step.prediction.id)}
          onsubmit={submitPrediction}
        />
      {/if}
    </div>
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

  {#key `${step.id}-${language}`}
    <AiMentor context={mentorContext()} onhint={recordMentorHint} />
  {/key}

  {#if about}
    <details class="about">
      <summary>{aboutTitle}</summary>
      <div class="about-body">{@render about()}</div>
    </details>
  {/if}
</section>

<style>
  .lesson-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .titles h1 {
    margin: 0.15rem 0 0;
    font-size: clamp(1.75rem, 3vw, 2.25rem);
  }
  .eyebrow {
    color: var(--muted);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0;
  }
  .back {
    color: var(--primary);
    font-size: 0.8rem;
  }
  .head-right {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }
  .mode-toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .mode-toggle button {
    padding: 0.45rem 0.85rem;
    background: transparent;
    color: var(--muted);
    font-size: 0.8rem;
    border-right: 1px solid var(--border);
  }
  .mode-toggle button:last-child {
    border-right: none;
  }
  .mode-toggle button.selected {
    background: var(--primary);
    color: #04231f;
    font-weight: 600;
  }
  .mastery {
    min-width: 120px;
  }
  .mastery span {
    color: var(--muted);
    font-size: 0.62rem;
  }
  .mastery div {
    height: 6px;
    margin-top: 0.25rem;
    border-radius: 99px;
    overflow: hidden;
    background: #1e293b;
  }
  .mastery i {
    display: block;
    height: 100%;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
  }
  .control-bar {
    margin: 0.9rem 0 0.4rem;
    padding: 0.7rem 0.8rem;
  }
  .mode-hint {
    margin: 0 0 0.6rem;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.5;
  }
  .mode-hint b {
    color: var(--text);
  }
  .op-context {
    margin: 0 0 0.7rem;
    display: flex;
    align-items: baseline;
    gap: 0.6rem 1rem;
    flex-wrap: wrap;
  }
  .op-context h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  .op-context p {
    margin: 0;
    flex: 1;
    min-width: 220px;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .badges {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .badges span,
  .badges b {
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    font-size: 0.62rem;
  }
  .badges b {
    color: var(--primary);
  }
  .workspace {
    display: grid;
    grid-template-columns: minmax(300px, 1fr) minmax(360px, 1.5fr);
    grid-template-areas: 'code visual' 'state complexity';
    gap: 0.7rem;
    align-items: start;
  }
  .workspace.wide {
    grid-template-columns: minmax(300px, 0.9fr) minmax(400px, 1.7fr);
  }
  .pane.code {
    grid-area: code;
    min-width: 0;
  }
  .pane.visual {
    grid-area: visual;
    min-width: 0;
  }
  .pane.state {
    grid-area: state;
    min-width: 0;
  }
  .pane.complexity {
    grid-area: complexity;
    min-width: 0;
  }
  .playbar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0.7rem 0;
    padding: 0.5rem 0.6rem;
  }
  .playbar :global(.controls) {
    flex: 1;
    border: none;
    background: none;
    padding: 0;
  }
  .speed {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .speed select {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 0.3rem 0.4rem;
    background: var(--bg);
    color: var(--text);
  }
  .explain {
    padding: 0.9rem 1rem;
  }
  .explain-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .explain-head b {
    font-size: 1.05rem;
  }
  .explanation {
    margin: 0.4rem 0 0.7rem;
    line-height: 1.6;
    font-size: 0.9rem;
  }
  .try-predict {
    margin-bottom: 0.7rem;
    padding: 0.5rem 0.7rem;
    border: 1px dashed var(--border);
    border-radius: 9px;
    color: var(--primary);
    font-size: 0.78rem;
    width: 100%;
    text-align: left;
  }
  .prediction-slot {
    margin-bottom: 0.7rem;
  }
  .prediction-slot.optional {
    border-left: 2px solid var(--secondary);
    padding-left: 0.6rem;
  }
  .prediction-tag {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.4rem;
    color: var(--secondary);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .prediction-tag button {
    color: var(--muted);
    font-size: 0.7rem;
    text-decoration: underline;
  }
  .about {
    margin-top: 0.9rem;
    border-top: 1px solid var(--border);
    padding-top: 0.6rem;
  }
  .about summary {
    cursor: pointer;
    color: var(--muted);
    font-size: 0.78rem;
  }
  .about-body {
    margin-top: 0.6rem;
  }
  .mobile-tabs {
    display: none;
  }
  @media (max-width: 1000px) {
    .workspace {
      grid-template-columns: 1fr;
      grid-template-areas: 'visual' 'code' 'state' 'complexity';
    }
  }
  @media (max-width: 680px) {
    .mobile-tabs {
      display: flex;
      gap: 0.3rem;
      margin-bottom: 0.6rem;
      overflow-x: auto;
    }
    .mobile-tabs button {
      flex: 1;
      padding: 0.5rem 0.4rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: transparent;
      color: var(--muted);
      font-size: 0.72rem;
      white-space: nowrap;
    }
    .mobile-tabs button.selected {
      border-color: var(--primary);
      color: var(--primary);
    }
    /* On mobile only the active tab's pane shows; explain has its own tab. */
    .workspace .pane {
      display: none;
    }
    .workspace[data-tab='visual'] .pane.visual,
    .workspace[data-tab='code'] .pane.code,
    .workspace[data-tab='state'] .pane.state,
    .workspace[data-tab='complexity'] .pane.complexity {
      display: block;
    }
    .explain {
      display: none;
    }
    .explain.mobile-active {
      display: block;
    }
    .playbar {
      position: sticky;
      bottom: 0;
      z-index: 5;
    }
  }
</style>
