<script lang="ts">
  import { onMount } from 'svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import {
    liveLessonsForSubject,
    remainingCompletionXp,
    subjectMastery
  } from '$lib/content/liveLessons';
  import { createEmptyProgress, loadProgress } from '$lib/progress/store';
  import type { SubjectId } from '$lib/trace/types';

  let { data } = $props();
  let progress = $state(createEmptyProgress());
  let subjectId = $derived(data.id as SubjectId);
  let liveLessons = $derived(liveLessonsForSubject(subjectId));
  let completionXpLeft = $derived(remainingCompletionXp(progress, subjectId));
  let mastery = $derived(subjectMastery(progress, subjectId));

  const isDone = (lesson: { completionId: string }) =>
    progress.completed.includes(lesson.completionId);
  let completedCount = $derived(liveLessons.filter((lesson) => isDone(lesson)).length);
  let nextLesson = $derived(liveLessons.find((lesson) => !isDone(lesson)));

  onMount(() => {
    progress = loadProgress();
  });
</script>

<header class="subject-head">
  <p class="eyebrow">Subject map</p>
  <h1>{data.subject.title}</h1>
  <p class="intro">{data.subject.description}</p>
</header>

<div class="summary panel">
  <div class="summary-mastery">
    <div class="summary-mastery-head">
      <span>Mastery</span><b>{mastery}%</b>
    </div>
    <ProgressBar value={mastery} label={`${data.subject.title} mastery`} />
  </div>
  <div class="summary-stats">
    <div><b>{completedCount}/{liveLessons.length}</b><span>lessons done</span></div>
    <div><b>{completionXpLeft}</b><span>XP left</span></div>
  </div>
</div>

{#if nextLesson}
  <section class="panel continue" aria-labelledby="continue-title">
    <span class="pill">Continue</span>
    <h2 id="continue-title">{nextLesson.title}</h2>
    <p>{nextLesson.detail}</p>
    <a class="button primary" href={nextLesson.href}>Resume trace →</a>
  </section>
{/if}

<section>
  <h2 class="lessons-title">Available lessons</h2>
  <div class="lessons">
    {#each liveLessons as lesson, i}
      {@const done = isDone(lesson)}
      {@const now = nextLesson?.completionId === lesson.completionId}
      <a class="lesson panel" class:done class:now href={lesson.href}>
        <span class="number">{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
        <div>
          <h3>{lesson.title}</h3>
          <p>{lesson.detail}</p>
        </div>
        <span class="go">{done ? 'Replay →' : now ? 'Continue →' : 'Trace →'}</span>
      </a>
    {/each}
  </div>
</section>

<style>
  .subject-head h1 {
    font-size: clamp(2.2rem, 4.5vw, 3.6rem);
    max-width: 800px;
    margin: 0.3rem 0;
  }
  .intro {
    color: var(--muted);
    font-size: 1.1rem;
    max-width: 700px;
    line-height: 1.7;
  }
  .summary {
    display: flex;
    align-items: center;
    gap: 2.5rem;
    padding: 1.25rem 1.5rem;
    margin: 1.75rem 0 2rem;
  }
  .summary-mastery {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.5rem;
  }
  .summary-mastery-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .summary-mastery-head span {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .summary-mastery-head b {
    font-size: 1.4rem;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
  }
  .summary-stats {
    display: flex;
    gap: 2rem;
    flex: none;
  }
  .summary-stats div {
    display: flex;
    flex-direction: column;
  }
  .summary-stats b {
    font-size: 1.25rem;
    font-variant-numeric: tabular-nums;
  }
  .summary-stats span {
    color: var(--muted);
    font-size: 0.72rem;
  }

  /* promoted primary action */
  .continue {
    display: grid;
    justify-items: start;
    gap: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary) 12%, transparent),
      color-mix(in srgb, var(--secondary) 6%, transparent)
    );
    border-color: color-mix(in oklab, var(--primary) 40%, var(--border));
  }
  .continue h2 {
    margin: 0;
    font-size: clamp(1.3rem, 2.6vw, 1.75rem);
  }
  .continue p {
    margin: 0;
    color: var(--muted);
    max-width: 560px;
  }
  .continue .button.primary {
    margin-top: 0.4rem;
  }

  .lessons-title {
    margin-bottom: 1rem;
  }
  .lessons {
    display: grid;
    gap: 0.7rem;
  }
  .lesson {
    display: grid;
    grid-template-columns: 46px 1fr auto;
    align-items: center;
    gap: 0.5rem;
    padding: 1.1rem 1.2rem;
    text-decoration: none;
    color: inherit;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .lesson:hover {
    border-color: color-mix(in oklab, var(--primary) 45%, var(--border));
    transform: translateY(-1px);
  }
  .lesson.now {
    border-color: color-mix(in oklab, var(--primary) 50%, var(--border));
  }
  .lesson.done {
    opacity: 0.62;
  }
  .number {
    font-family: var(--mono);
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
  .lesson.done .number {
    color: var(--success);
  }
  .lesson h3 {
    margin: 0.2rem 0;
    font-size: 1.05rem;
  }
  .lesson p {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
  .go {
    color: var(--primary);
    font-size: 0.85rem;
    white-space: nowrap;
  }
  @media (max-width: 600px) {
    .summary {
      flex-direction: column;
      align-items: stretch;
      gap: 1.25rem;
    }
    .summary-stats {
      justify-content: space-between;
    }
    .lesson {
      grid-template-columns: 32px 1fr;
    }
    .go {
      display: none;
    }
  }
</style>
