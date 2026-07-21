<script lang="ts">
  import { onMount } from 'svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import SearchVisualizer from '$lib/components/visualizers/SearchVisualizer.svelte';
  import {
    createSearchLesson,
    SEARCH_ALGORITHMS,
    DEFAULT_SEARCH_CONFIG,
    type SearchAlgorithm
  } from '$lib/engines/dsa/search';
  import type { RuntimeState } from '$lib/engines/dsa/search';
  import {
    awardPrediction,
    completeLesson,
    loadProgress,
    recordHint,
    recordMisconception,
    saveProgress
  } from '$lib/progress/store';
  import type { StepContext } from '$lib/server/openai/schemas';

  import type { SupportedLanguage } from '$lib/trace/types';
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';

  let algorithm = $state<SearchAlgorithm>('binary-search-iterative');
  let inputValues = $state(DEFAULT_SEARCH_CONFIG.values.join(', '));
  let targetValue = $state(DEFAULT_SEARCH_CONFIG.target.toString());
  let inputError = $state('');
  let language = $state<SupportedLanguage>('cpp');
  
  let lesson = $state(createSearchLesson(DEFAULT_SEARCH_CONFIG));
  let initialStep = parseInt(page.url.searchParams.get('step') || '0', 10);
  let index = $state(!isNaN(initialStep) && initialStep >= 0 ? initialStep : 0);
  let playing = $state(false);
  
  let predictionSubmitted = $state(false);
  let predictionCorrect = $state<boolean | null>(null);
  let predictionNudge = $state('');
  let predictionAnswer = $state<any>(null);
  let submitted = $state<string[]>([]);
  let progress = $state(loadProgress());
  let traceRevision = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  let step = $derived(lesson.steps[index]);
  let info = $derived(SEARCH_ALGORITHMS.find(a => a.id === algorithm)!);
  let lessonId = $derived(`search:${algorithm}`);
  let completed = $derived(progress.completed.includes(lessonId));
  let currentState = $derived(step?.state as unknown as RuntimeState);

  onMount(() => {
    progress = loadProgress();
    language = progress.preferredLanguage;
    return () => clearInterval(timer);
  });

  // URL sync removed to fix Svelte 5 reactivity freeze

  function stopPlayback() {
    playing = false;
    clearInterval(timer);
  }

  function resetCheckpoint() {
    predictionSubmitted = false;
    predictionCorrect = null;
    predictionAnswer = '';
    predictionNudge = '';
    traceRevision++;
  }

  function rebuild(algo: SearchAlgorithm, values: number[], target: number) {
    stopPlayback();
    algorithm = algo;
    lesson = createSearchLesson({ algorithm: algo, values, target });
    index = 0;
    resetCheckpoint();
  }

  function chooseAlgorithm(nextAlgorithm: SearchAlgorithm) {
    if (nextAlgorithm === algorithm) return;
    try {
      const values = inputValues.split(',').map(s => Number(s.trim()));
      const target = Number(targetValue.trim());
      rebuild(nextAlgorithm, values, target);
    } catch (e) {
      // Ignored
    }
  }

  function applyInput(event: SubmitEvent) {
    event.preventDefault();
    if (!inputValues.trim() || !targetValue.trim()) {
      inputError = 'Please enter valid numbers.';
      return;
    }
    const tokens = inputValues.split(',').map(s => s.trim());
    const values: number[] = [];
    for (const token of tokens) {
      const val = Number(token);
      if (isNaN(val)) {
        inputError = `Invalid value: ${token}`;
        return;
      }
      values.push(val);
    }
    const target = Number(targetValue.trim());
    if (isNaN(target)) {
      inputError = `Invalid target: ${targetValue}`;
      return;
    }
    inputError = '';
    inputValues = values.join(', ');
    targetValue = target.toString();
    rebuild(algorithm, values, target);
  }

  function jump(nextIndex: number) {
    const bounded = Math.max(0, Math.min(nextIndex, lesson.steps.length - 1));
    if (bounded > 0 && !predictionSubmitted) {
      index = 0;
      predictionNudge = 'Lock the opening prediction before revealing the trace.';
      stopPlayback();
      return;
    }
    predictionNudge = '';
    index = bounded;
    if (index === lesson.steps.length - 1) {
      stopPlayback();
      progress = completeLesson(progress, lessonId);
      saveProgress(progress);
    }
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback();
    } else {
      if (index === lesson.steps.length - 1) index = 0;
      playing = true;
      timer = setInterval(() => {
        if (index < lesson.steps.length - 1) {
          jump(index + 1);
        } else {
          stopPlayback();
        }
      }, 750);
    }
  }

  let predictionResolved = $derived(!step.prediction || submitted.includes(step.prediction.id));
  let visibleState = $derived(step.prediction && !predictionResolved ? step.stateBefore : step.stateAfter) as unknown as RuntimeState;

  function selectLanguage(next: SupportedLanguage) {
    language = next;
    progress = recordLanguageUse(progress, next);
    saveProgress(progress);
  }

  let mistake = $state<MistakeAttempt | null>(null);
  let currentMistake = $derived(mistake?.stepId === step.id ? mistake : null);

  function mistakeMetadata() {
    const candidate = step.metadata?.mistake;
    return candidate && typeof candidate === 'object'
      ? (candidate as unknown as MistakeMetadata)
      : null;
  }

  function handlePrediction(correct: boolean, text: string) {
    if (!step.prediction) return;
    submitted = [...submitted, step.prediction.id];
    predictionCorrect = correct;
    predictionAnswer = text;
    
    if (correct) {
      progress = awardPrediction(progress, lessonId);
      saveProgress(progress);
      setTimeout(() => jump(index + 1), 600);
    } else {
      const meta = mistakeMetadata();
      mistake = {
        evidenceId: `${lessonId}:${step.prediction.id}`,
        stepId: step.id,
        prompt: meta?.prompt ?? step.prediction.prompt ?? 'Mistake made',
        predicted: text,
        actual: meta?.correctAnswer ?? String(step.prediction.correctAnswer),
        explanation: meta?.explanation ?? step.prediction.explanation ?? 'Incorrect prediction.',
        tag: meta?.tag ?? 'index-vs-value',
        ...meta
      } as MistakeAttempt;
    }
  }

  function handleRecovery(xp: number) {
    progress = awardRecovery(progress, lessonId, xp);
    saveProgress(progress);
    mistake = null;
  }

  const handleAiContext = (): StepContext => ({
    subject: 'dsa-1',
    lesson: 'binary-search',
    learningObjective: lesson.learningObjectives?.[0] ?? '',
    selectedLanguage: language,
    activeSourceLines: lesson.sourceByLanguage[language]
      .filter(line => line.semanticOperationId === step.semanticOperationId)
      .map(line => line.text),
    stateBefore: step.stateBefore,
    mutation: step.mutations,
    stateAfter: step.stateAfter,
    deterministicExplanation: step.deterministicExplanation || '...',
    learnerLevel: progress.learnerLevel,
    misconceptionTags: currentMistake ? [currentMistake.tag] : [],
    interaction: 'explain',
    explanationLevel: progress.explanationLevel,
    explanationLanguage: progress.explanationLanguage,
    currentPrediction: step.prediction
      ? {
          prompt: step.prediction.prompt,
          learnerAnswer: submitted.includes(step.prediction.id) ? predictionAnswer : undefined,
          correctAnswer: String(step.prediction.correctAnswer)
        }
      : undefined
  });

  function handleHint(hint: string) {
    progress = recordHint(progress, lessonId);
    saveProgress(progress);
  }

  function handleMisconception(misconception: string) {
    progress = recordMisconception(progress, lessonId, misconception);
    saveProgress(progress);
  }
</script>

<svelte:head>
  <title>ReplayCS | Search Lab</title>
</svelte:head>

<div class="layout">
  <div class="toolbar panel">
    <div class="modes">
      {#each SEARCH_ALGORITHMS as algo}
        <button
          class="mode-btn"
          class:active={algorithm === algo.id}
          onclick={() => chooseAlgorithm(algo.id)}
        >
          {algo.label}
        </button>
      {/each}
    </div>
    <form class="config-form" onsubmit={applyInput}>
      <div class="inputs">
        <label>
          <span>Array Values</span>
          <input type="text" bind:value={inputValues} placeholder="e.g. 1, 2, 3" />
        </label>
        <label>
          <span>Target</span>
          <input type="text" bind:value={targetValue} placeholder="e.g. 5" />
        </label>
      </div>
      <button type="submit" class="apply-btn">Apply</button>
    </form>
    {#if inputError}
      <div class="error">{inputError}</div>
    {/if}
  </div>

  <div class="main-content">
    <SearchVisualizer state={visibleState} />
    
    {#if predictionNudge}
      <div class="nudge">{predictionNudge}</div>
    {/if}
  </div>

  <div class="sidebar">
    <aside class="step-panel panel">
      <div class="step-heading">
        <span class="eyebrow">Step {index + 1}</span>
        <span class="event">{step.action}</span>
      </div>
      <h2>{step.title || 'Execute'}</h2>
      <p class="explanation">
        {predictionResolved
          ? (step.deterministicExplanation || '...')
          : 'Predict first.'}
      </p>
      {#if step.prediction}
        <PredictionCheckpoint
          challenge={step.prediction}
          submitted={predictionResolved}
          onsubmit={handlePrediction}
        />
      {/if}
    </aside>
    <div class="control-panel panel">
      <TraceControls
        {playing}
        {index}
        total={lesson.steps.length}
        onplay={togglePlayback}
        onprevious={() => jump(index - 1)}
        onnext={() => jump(index + 1)}
        onrestart={() => jump(0)}
        onjump={jump}
      />
    </div>
    {#if completed}
      <div class="completion-banner panel">
        <span>🏆 Lab Complete</span>
      </div>
    {/if}
    <div class="code-panel panel">
      <CodePane 
        source={lesson.sourceByLanguage || lesson.source} 
        activeLineId={step.sourceLineId} 
        {language}
        activeSemantic={step.semanticOperationId}
        onlanguage={selectLanguage}
      />
    </div>
    <div class="evidence-panel panel">
      <ExecutionEvidence {step} revealed={predictionResolved} />
    </div>
    <div class="ai-panel panel">
      {#if currentMistake}
        <MistakeReplay
          mistake={currentMistake}
          stateBefore={step.stateBefore}
          stateAfter={step.stateAfter}
          onrecover={handleRecovery}
        />
      {:else}
      {#key step.id}
        <AiMentor
          context={handleAiContext()}
          onhint={handleHint}
        />
      {/key}
      {/if}
    </div>
  </div>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 1fr 350px;
    grid-template-rows: auto 1fr;
    gap: 1.5rem;
    height: calc(100vh - 180px);
  }
  .toolbar {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
  }
  .modes {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .mode-btn {
    background: transparent;
    border: 1px solid var(--accent);
    color: var(--text);
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mode-btn:hover {
    background: var(--surface-hover);
  }
  .mode-btn.active {
    background: var(--primary);
    color: var(--background);
    border-color: var(--primary);
  }
  .config-form {
    display: flex;
    gap: 1rem;
    align-items: flex-end;
  }
  .inputs {
    display: flex;
    gap: 1rem;
  }
  .inputs label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
  .inputs input {
    background: var(--background);
    border: 1px solid var(--accent);
    color: var(--text);
    padding: 0.5rem 0.8rem;
    border-radius: 6px;
    width: 200px;
  }
  .inputs input:focus {
    outline: none;
    border-color: var(--primary);
  }
  .apply-btn {
    background: var(--primary);
    color: var(--background);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
  }
  .error {
    position: absolute;
    bottom: -1.5rem;
    right: 1.5rem;
    color: var(--danger);
    font-size: 0.85rem;
  }
  .main-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
  }
  .nudge {
    color: var(--warning);
    font-size: 0.9rem;
    text-align: center;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  .control-panel {
    padding: 1rem;
  }
  .completion-banner {
    padding: 1rem;
    background: linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%);
    border-color: rgba(16,185,129,0.2);
    color: #10b981;
    font-weight: 600;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }
  .code-panel {
    flex: 1;
    min-height: 250px;
  }
  .evidence-panel {
    min-height: 200px;
  }
  .ai-panel {
    min-height: 300px;
  }
</style>
