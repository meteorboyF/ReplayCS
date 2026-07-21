<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ComplexityWhy from '$lib/components/complexity/ComplexityWhy.svelte';
  import ExecutionEvidence from '$lib/components/trace/ExecutionEvidence.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import {
    completeLesson,
    loadProgress,
    recordLanguageUse,
    saveProgress
  } from '$lib/progress/store';
  import type { SubjectId, SupportedLanguage, TraceLesson, TraceValue } from '$lib/trace/types';

  let {
    lesson,
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

  let index = $state(0);
  let language = $state<SupportedLanguage>('cpp');
  let playing = $state(false);
  let speed = $state(1);
  let progress = $state(loadProgress());
  let completed = $state<string[]>([]);
  let mobileTab = $state<'visual' | 'code' | 'state' | 'complexity'>('visual');
  let timer: ReturnType<typeof setInterval> | undefined;

  const storageKey = $derived(`replaycs-${completionId}-progress`);
  let step = $derived(lesson.steps[Math.min(index, lesson.steps.length - 1)]);
  // Visual-first: the resulting state is always shown. Nothing is ever hidden.
  let visibleState = $derived(step.stateAfter);
  let finalEvidence = $derived(lesson.steps[lesson.steps.length - 1]?.complexityEvidence);
  let masteryPercent = $derived(
    completionKeys.length ? Math.round((completed.length / completionKeys.length) * 100) : 0
  );

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

  // A fresh lesson (new operation/input) resets the trace cursor.
  let lessonToken = $derived(`${lesson.id}:${lesson.steps.length}:${lesson.title}`);
  let lastToken = '';
  $effect(() => {
    if (lessonToken !== lastToken) {
      lastToken = lessonToken;
      index = 0;
      playing = false;
      clearInterval(timer);
    }
  });

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
    index = Math.max(0, Math.min(requested, lesson.steps.length - 1));
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
        } else jump(index + 1);
      }, 900 / speed);
    }
  }

  function selectLanguage(next: SupportedLanguage) {
    language = next;
    progress = recordLanguageUse(progress, next);
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
  <div class="mastery" aria-label={`${title} mastery ${masteryPercent}%`}>
    <span>{completed.length}/{completionKeys.length} traced</span>
    <div><i style={`width:${masteryPercent}%`}></i></div>
  </div>
</header>

<div class="control-bar panel">
  {@render controls()}
</div>

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
  {#each [['visual', 'Visual'], ['code', 'Code'], ['state', 'State'], ['complexity', 'Complexity']] as [id, label]}
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
    <ExecutionEvidence {step} revealed={true} />
  </div>

  <div class="pane complexity" data-pane="complexity">
    {#if step.complexityEvidence}<ComplexityWhy evidence={step.complexityEvidence} />{/if}
  </div>
</div>

<section class="explain panel" aria-live="polite">
  <div class="explain-head">
    <span class="eyebrow">Step {index + 1} of {lesson.steps.length} · {step.eventType}</span>
    <b>{step.title}</b>
  </div>
  <p class="explanation">{step.deterministicExplanation}</p>

  {#if about}
    <details class="about">
      <summary>{aboutTitle}</summary>
      <div class="about-body">{@render about()}</div>
    </details>
  {/if}
</section>

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
    background: var(--raised);
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
    grid-template-columns: minmax(300px, 1fr) minmax(360px, 1.6fr);
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
  .explain {
    padding: 0.9rem 1rem;
    margin: 0.7rem 0 0;
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
    margin: 0.4rem 0 0;
    line-height: 1.6;
    font-size: 0.9rem;
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
    /* On mobile only the active tab's pane shows. */
    .workspace .pane {
      display: none;
    }
    .workspace[data-tab='visual'] .pane.visual,
    .workspace[data-tab='code'] .pane.code,
    .workspace[data-tab='state'] .pane.state,
    .workspace[data-tab='complexity'] .pane.complexity {
      display: block;
    }
    .playbar {
      position: sticky;
      bottom: 0;
      z-index: 5;
    }
  }
</style>
