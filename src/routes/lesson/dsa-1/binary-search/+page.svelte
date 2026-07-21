<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ArrayVisualizer from '$lib/components/visualizers/ArrayVisualizer.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import { createBinarySearchLesson } from '$lib/engines/dsa/binarySearch';
  import {
    completeLesson,
    loadProgress,
    recordLanguageUse,
    saveProgress
  } from '$lib/progress/store';
  import type { SupportedLanguage } from '$lib/trace/types';
  const supportedLanguages: readonly SupportedLanguage[] = ['c', 'cpp', 'java', 'python'];
  function requestedLanguage() {
    const candidate = page.url.searchParams.get('lang');
    return supportedLanguages.includes(candidate as SupportedLanguage)
      ? (candidate as SupportedLanguage)
      : null;
  }
  let lesson = $state(createBinarySearchLesson());
  let inputText = $state('2, 5, 8, 12, 16, 23, 38, 56');
  let targetText = $state('23');
  let inputError = $state('');
  let shareStatus = $state('');
  let index = $state(0),
    language = $state<SupportedLanguage>(requestedLanguage() ?? 'cpp'),
    playing = $state(false),
    progress = $state(loadProgress()),
    timer: ReturnType<typeof setInterval> | undefined;
  let step = $derived(lesson.steps[index]);
  let visibleState = $derived(step.stateAfter);
  onMount(() => {
    progress = loadProgress();
    const params = new URLSearchParams(location.search);
    language = requestedLanguage() ?? progress.preferredLanguage;
    const urlValues = params.get('values');
    const urlTarget = params.get('target');
    if (urlValues && urlTarget) {
      inputText = urlValues;
      targetText = urlTarget;
      applyInput(false);
    }
    const requestedStep = Number(params.get('step') ?? 0);
    index = Math.max(
      0,
      Math.min(Number.isSafeInteger(requestedStep) ? requestedStep : 0, lesson.steps.length - 1)
    );
    return () => clearInterval(timer);
  });
  function syncUrl() {
    const params = new URLSearchParams({
      values: inputText.replace(/\s+/g, ''),
      target: targetText.trim(),
      lang: language,
      step: String(index)
    });
    history.replaceState({}, '', `?${params}`);
  }
  function jump(n: number) {
    index = Math.max(0, Math.min(n, lesson.steps.length - 1));
    syncUrl();
    if (index === lesson.steps.length - 1) {
      progress = completeLesson(progress, lesson.id);
      saveProgress(progress);
    }
  }
  function selectLanguage(next: SupportedLanguage) {
    language = next;
    progress = recordLanguageUse(progress, next);
    saveProgress(progress);
    syncUrl();
  }
  function applyInput(updateUrl = true) {
    const pieces = inputText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^-?\d+$/.test(value))) {
      inputError = 'Use comma-separated whole numbers, for example: 2, 5, 8, 12.';
      return;
    }
    const values = pieces.map(Number);
    const target = Number(targetText);
    if (values.length < 2 || values.length > 16) {
      inputError = 'Choose between 2 and 16 values so every state remains readable.';
      return;
    }
    if (values.some((value) => !Number.isSafeInteger(value))) {
      inputError = 'Every value must be a safe whole number.';
      return;
    }
    if (!Number.isSafeInteger(target)) {
      inputError = 'Target must be a safe whole number.';
      return;
    }
    if (values.some((value, position) => position > 0 && value < values[position - 1])) {
      inputError = 'Binary search needs ascending sorted input. Reorder the values and try again.';
      return;
    }
    inputError = '';
    lesson = createBinarySearchLesson(values, target);
    index = 0;
    playing = false;
    clearInterval(timer);
    if (updateUrl) syncUrl();
  }
  function usePreset(values: number[], target: number) {
    inputText = values.join(', ');
    targetText = String(target);
    applyInput();
  }
  async function shareTrace() {
    syncUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      shareStatus = 'Trace link copied.';
    } catch {
      window.prompt('Copy this trace URL:', location.href);
      shareStatus = 'Trace link ready to copy.';
    }
  }
  function handleKeydown(event: KeyboardEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (
      target?.closest(
        'a, button, input, select, textarea, summary, [role="button"], [contenteditable="true"]'
      )
    )
      return;
    if (event.key === 'ArrowRight') jump(index + 1);
    if (event.key === 'ArrowLeft') jump(index - 1);
    if (event.key === ' ') {
      event.preventDefault();
      play();
    }
  }
  function play() {
    playing = !playing;
    clearInterval(timer);
    if (playing)
      timer = setInterval(() => {
        if (index >= lesson.steps.length - 1) {
          playing = false;
          clearInterval(timer);
        } else jump(index + 1);
      }, 1000);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="lesson-head">
  <div>
    <a href="/learn/dsa-1" class="back">← DSA I</a>
    <h1>{lesson.title}</h1>
    <p>{lesson.description}</p>
  </div>
  <div class="score">
    <button onclick={shareTrace}>Share this trace</button><span>⚡ {progress.xp} XP</span><span
      >🔥 {progress.streak}</span
    >
  </div>
</div>
{#if shareStatus}<p class="share-status" role="status">{shareStatus}</p>{/if}
<form
  class="input-panel panel"
  onsubmit={(event) => {
    event.preventDefault();
    applyInput();
  }}
>
  <div>
    <label for="search-values">Sorted values</label><input
      id="search-values"
      bind:value={inputText}
      aria-describedby="input-help input-error"
    />
  </div>
  <div class="target-field">
    <label for="search-target">Target</label><input
      id="search-target"
      bind:value={targetText}
      inputmode="numeric"
    />
  </div>
  <button class="primary" type="submit">Build trace</button>
  <div class="presets">
    <span>Presets</span><button
      type="button"
      onclick={() => usePreset([2, 5, 8, 12, 16, 23, 38, 56], 23)}>Found</button
    ><button type="button" onclick={() => usePreset([1, 3, 5, 7, 9, 11], 8)}>Not found</button
    ><button type="button" onclick={() => usePreset([1, 2, 2, 2, 5, 8], 2)}>Duplicates</button>
  </div>
  <p id="input-help">2–16 sorted integers. Duplicate values are allowed.</p>
  {#if inputError}<p id="input-error" class="input-error" role="alert">{inputError}</p>{/if}
</form>
{#if new Set(visibleState.values as (string | number)[]).size < (visibleState.values as (string | number)[]).length}<p
    class="duplicate-note"
  >
    <strong>Duplicate note:</strong> Standard binary search returns one matching index, not necessarily
    the first duplicate.
  </p>{/if}
<div class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={selectLanguage}
  />
  <div class="center">
    <ArrayVisualizer
      state={{
        values: visibleState.values as (string | number)[],
        target: visibleState.target as string | number,
        left: visibleState.left as number,
        right: visibleState.right as number,
        mid: visibleState.mid as number | null
      }}
    /><TraceControls
      {index}
      total={lesson.steps.length}
      {playing}
      onprevious={() => jump(index - 1)}
      onnext={() => jump(index + 1)}
      onrestart={() => jump(0)}
      onplay={play}
      onjump={jump}
    />
    <div class="complexity panel" aria-label="Complexity counter">
      <span><b>{String(visibleState.comparisons)}</b> comparisons</span><span
        ><b>{Math.max(0, Math.ceil(Math.log2((visibleState.values as unknown[]).length)))}</b> max halving
        rounds</span
      ><span><b>O(log n)</b> time</span><span><b>O(1)</b> space</span>
    </div>
  </div>
  <aside class="panel">
    <span class="eyebrow">Step {index + 1}</span>
    <h2>{step.title}</h2>
    <p class="explain">{step.deterministicExplanation}</p>
    <div class="state">
      <h3>State mutation</h3>
      {#if step.mutations.length}{#each step.mutations as mutation}<div>
            <code>{mutation.entityId}</code><span
              >{String(mutation.previousValue)} → <b>{String(mutation.nextValue)}</b></span
            >
          </div>{/each}{:else}<p class="muted">
          No values changed. This step checks control flow.
        </p>{/if}
    </div>
  </aside>
</div>

<style>
  .lesson-head {
    display: flex;
    justify-content: space-between;
    align-items: end;
    margin-bottom: 1rem;
  }
  .lesson-head h1 {
    font-size: 2.5rem;
    margin: 0.3rem 0;
  }
  .lesson-head p {
    color: var(--muted);
    margin: 0;
  }
  .back {
    color: var(--primary);
    font-size: 0.85rem;
  }
  .score {
    display: flex;
    gap: 0.5rem;
  }
  .score span {
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 9px;
  }
  .score button {
    color: var(--primary);
  }
  .share-status {
    color: var(--success);
    text-align: right;
    font-size: 0.78rem;
  }
  .input-panel {
    display: grid;
    grid-template-columns: minmax(240px, 1fr) 100px auto auto;
    gap: 0.65rem;
    align-items: end;
    padding: 0.8rem;
    margin-bottom: 0.8rem;
  }
  .input-panel > div:not(.presets) {
    display: grid;
    gap: 0.25rem;
  }
  .input-panel label,
  .presets > span {
    color: var(--muted);
    font-size: 0.7rem;
  }
  .input-panel input {
    min-width: 0;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    padding: 0.62rem;
  }
  .presets {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .presets button {
    font-size: 0.68rem;
    padding: 0.48rem;
  }
  .input-panel > p {
    grid-column: 1/-1;
    margin: 0;
    color: var(--muted);
    font-size: 0.67rem;
  }
  .input-panel > p.input-error {
    color: var(--danger);
  }
  .duplicate-note {
    border-left: 3px solid var(--warning);
    padding: 0.55rem 0.8rem;
    background: #fbbf240c;
    font-size: 0.76rem;
  }
  .lab {
    display: grid;
    grid-template-columns: minmax(280px, 0.9fr) minmax(360px, 1.3fr) minmax(270px, 0.9fr);
    gap: 0.8rem;
  }
  .center {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }
  .complexity {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
    padding: 0.65rem;
    text-align: center;
    color: var(--muted);
    font-size: 0.65rem;
  }
  .complexity b {
    display: block;
    color: var(--primary);
    font-size: 0.9rem;
  }
  .lab aside {
    padding: 1rem;
  }
  .lab aside h2 {
    font-size: 1.45rem;
  }
  .explain {
    color: #dce7f5;
    line-height: 1.6;
  }
  .state {
    border-top: 1px solid var(--border);
    padding: 1rem 0;
  }
  .state h3 {
    font-size: 0.8rem;
    color: var(--muted);
    text-transform: uppercase;
  }
  .state > div {
    display: flex;
    justify-content: space-between;
    margin: 0.4rem 0;
  }
  .state b {
    color: var(--primary);
  }
  @media (max-width: 1000px) {
    .input-panel {
      grid-template-columns: 1fr 100px auto;
    }
    .presets {
      grid-column: 1/-1;
    }
    .lab {
      grid-template-columns: 1fr 1.2fr;
    }
    .lab aside {
      grid-column: 1/-1;
    }
  }
  @media (max-width: 700px) {
    .input-panel {
      grid-template-columns: 1fr 80px;
    }
    .input-panel > button {
      grid-column: 1/-1;
    }
    .complexity {
      grid-template-columns: 1fr 1fr;
    }
    .lab {
      grid-template-columns: 1fr;
    }
    .lab aside {
      grid-column: auto;
    }
    .lesson-head {
      align-items: start;
    }
    .score {
      flex-direction: column;
    }
  }
</style>
