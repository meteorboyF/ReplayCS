<script lang="ts">
  import { onMount } from 'svelte';
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

  onMount(() => {
    progress = loadProgress();
  });
</script>

<p class="eyebrow">Subject map</p>
<h1>{data.subject.title}</h1>
<p class="intro">{data.subject.description}</p>
<div class="summary panel">
  <div><b>{completionXpLeft}</b><span>completion XP left</span></div>
  <div>
    <b>{liveLessons.length}</b><span>live lessons</span>
  </div>
  <div><b>{mastery}%</b><span>mastery</span></div>
</div>
<section>
  <h2>Recommended path</h2>
  <div class="lessons">
    {#each data.subject.lessons as lesson, i}
      {#if lesson.status === 'live'}
        <a class="lesson panel" href={`/lesson/${data.id}/${lesson.slug}`}>
          <span class="number">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <span class="pill">{lesson.status}</span>
            <h3>{lesson.title}</h3>
            <p>{lesson.detail}</p>
          </div>
          <span class="go">Trace →</span>
        </a>
      {:else}
        <article class="lesson panel locked">
          <span class="number">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <span class="pill">{lesson.status}</span>
            <h3>{lesson.title}</h3>
            <p>{lesson.detail}</p>
          </div>
          <span class="go">Coming soon</span>
        </article>
      {/if}
    {/each}
  </div>
</section>

<style>
  h1 {
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    max-width: 800px;
  }
  .intro {
    color: var(--muted);
    font-size: 1.15rem;
    max-width: 700px;
    line-height: 1.7;
  }
  .summary {
    display: flex;
    gap: 3rem;
    padding: 1.2rem 1.5rem;
    margin: 2rem 0 4rem;
  }
  .summary div {
    display: flex;
    flex-direction: column;
  }
  .summary b {
    font-size: 1.4rem;
    color: var(--primary);
  }
  .summary span {
    color: var(--muted);
    font-size: 0.75rem;
  }
  .lessons {
    display: grid;
    gap: 0.8rem;
  }
  .lesson {
    display: grid;
    grid-template-columns: 60px 1fr auto;
    align-items: center;
    padding: 1.2rem;
  }
  .lesson.locked {
    opacity: 0.65;
    cursor: default;
  }
  .number {
    font-family: var(--mono);
    color: var(--muted);
  }
  .lesson h3 {
    margin: 0.35rem 0;
  }
  .lesson p {
    margin: 0;
    color: var(--muted);
  }
  .go {
    color: var(--primary);
    font-size: 0.85rem;
  }
  @media (max-width: 600px) {
    .summary {
      gap: 1rem;
      justify-content: space-between;
    }
    .lesson {
      grid-template-columns: 35px 1fr;
    }
    .go {
      display: none;
    }
  }
</style>
