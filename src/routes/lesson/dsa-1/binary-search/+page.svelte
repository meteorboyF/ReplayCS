<script lang="ts">
  import { onMount } from 'svelte';
  import CodePane from '$lib/components/code/CodePane.svelte';
  import ArrayVisualizer from '$lib/components/visualizers/ArrayVisualizer.svelte';
  import TraceControls from '$lib/components/trace/TraceControls.svelte';
  import PredictionCheckpoint from '$lib/components/trace/PredictionCheckpoint.svelte';
  import MistakeReplay, { type MistakeAttempt } from '$lib/components/trace/MistakeReplay.svelte';
  import AiMentor from '$lib/components/ai/AiMentor.svelte';
  import { createBinarySearchLesson } from '$lib/engines/dsa/binarySearch';
  import {
    awardPrediction,
    awardRecovery,
    completeLesson,
    loadProgress,
    recordMisconception,
    saveProgress
  } from '$lib/progress/store';
  import type { StepContext } from '$lib/server/openai/schemas';
  import type { SupportedLanguage } from '$lib/trace/types';
  const lesson = createBinarySearchLesson();
  let index = $state(0),
    language = $state<SupportedLanguage>('cpp'),
    playing = $state(false),
    progress = $state(loadProgress()),
    submitted = $state<string[]>([]),
    mistake = $state<MistakeAttempt | null>(null),
    timer: ReturnType<typeof setInterval> | undefined;
  let step = $derived(lesson.steps[index]);
  onMount(() => {
    progress = loadProgress();
    const params = new URLSearchParams(location.search);
    index = Math.min(Number(params.get('step') ?? 0) || 0, lesson.steps.length - 1);
    return () => clearInterval(timer);
  });
  function jump(n: number) {
    index = Math.max(0, Math.min(n, lesson.steps.length - 1));
    history.replaceState({}, '', `?step=${index}`);
    if (index === lesson.steps.length - 1) {
      progress = completeLesson(progress, lesson.id);
      saveProgress(progress);
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
  function predict(correct: boolean, answer: string) {
    if (!step.prediction) return;
    submitted = [...submitted, step.prediction.id];
    if (correct) {
      progress = awardPrediction(progress, step.prediction.id, step.prediction.xpReward);
      saveProgress(progress);
    } else {
      const evidenceId = `${lesson.id}:${step.id}:${step.prediction.id}`;
      mistake = {
        evidenceId,
        stepId: step.id,
        prompt: step.prediction.prompt,
        predicted: answer,
        actual: String(step.prediction.correctAnswer),
        explanation: step.prediction.explanation,
        tag: 'index-vs-value'
      };
      progress = recordMisconception(progress, evidenceId, mistake.tag);
      saveProgress(progress);
    }
  }
  function recoverMistake() {
    if (!mistake) return;
    progress = awardRecovery(progress, mistake.evidenceId);
    saveProgress(progress);
  }
  function mentorContext(): StepContext {
    const activeSourceLines = lesson.sourceByLanguage[language]
      .filter((line) => line.semanticOperationId === step.semanticOperationId)
      .map((line) => line.text);
    return {
      subject: lesson.subject,
      lesson: lesson.id,
      learningObjective: lesson.learningObjectives[0],
      selectedLanguage: language,
      activeSourceLines,
      stateBefore: step.stateBefore,
      mutation: step.mutations,
      stateAfter: step.stateAfter,
      deterministicExplanation: step.deterministicExplanation,
      learnerLevel: 'beginner',
      misconceptionTags: mistake?.stepId === step.id ? [mistake.tag] : [],
      interaction: 'explain',
      explanationLevel: 'standard',
      explanationLanguage: 'en',
      currentPrediction: step.prediction
        ? {
            prompt: step.prediction.prompt,
            learnerAnswer: mistake?.stepId === step.id ? mistake.predicted : undefined,
            correctAnswer: String(step.prediction.correctAnswer)
          }
        : undefined
    };
  }
</script>

<div class="lesson-head">
  <div>
    <a href="/learn/dsa-1" class="back">← DSA I</a>
    <h1>{lesson.title}</h1>
    <p>{lesson.description}</p>
  </div>
  <div class="score"><span>⚡ {progress.xp} XP</span><span>🔥 {progress.streak}</span></div>
</div>
<div class="lab">
  <CodePane
    source={lesson.sourceByLanguage}
    {language}
    activeSemantic={step.semanticOperationId}
    onlanguage={(l) => (language = l)}
  />
  <div class="center">
    <ArrayVisualizer
      state={{
        values: step.stateAfter.values as (string | number)[],
        target: step.stateAfter.target as string | number,
        left: step.stateAfter.left as number,
        right: step.stateAfter.right as number,
        mid: step.stateAfter.mid as number | null
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
    {#if step.prediction}<PredictionCheckpoint
        challenge={step.prediction}
        submitted={submitted.includes(step.prediction.id)}
        onsubmit={predict}
      />{/if}
    {#if mistake?.stepId === step.id}
      <MistakeReplay
        attempt={mistake}
        stateBefore={step.stateBefore}
        stateAfter={step.stateAfter}
        onrecover={recoverMistake}
      />
    {/if}
    {#key step.id}<AiMentor context={mentorContext()} />{/key}
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
    .lab {
      grid-template-columns: 1fr 1.2fr;
    }
    .lab aside {
      grid-column: 1/-1;
    }
  }
  @media (max-width: 700px) {
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
