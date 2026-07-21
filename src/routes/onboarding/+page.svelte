<script lang="ts">
  import { tick } from 'svelte';
  import { goto } from '$app/navigation';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import { recommendNext } from '$lib/progress/recommendations';
  import {
    configureProfile,
    loadProgress,
    saveProgress,
    type LearnerLevel,
    type LearningGoal,
    type Progress
  } from '$lib/progress/store';
  import type { SubjectId, SupportedLanguage } from '$lib/trace/types';

  const TOTAL = 4;
  let step = $state(1);

  let learnerLevel = $state<LearnerLevel>('beginner');
  let primaryGoal = $state<LearningGoal>('foundation');
  let preferredLanguage = $state<SupportedLanguage>('cpp');
  let explanationLanguage = $state<'en' | 'bn'>('en');
  let subjectsOfInterest = $state<SubjectId[]>(['dsa-1']);
  let dailyGoalMinutes = $state(15);

  const subjects: { id: SubjectId; label: string }[] = [
    { id: 'dsa-1', label: 'DSA I' },
    { id: 'dsa-2', label: 'DSA II' },
    { id: 'dbms', label: 'DBMS' },
    { id: 'operating-systems', label: 'Operating Systems' },
    { id: 'computer-networks', label: 'Networks' }
  ];
  const languageAwareLessons = new Set([
    '/lesson/dsa-1/binary-search',
    '/lesson/dsa-2/graph-explorer'
  ]);

  function learningPathFor(progress: Progress) {
    const recommendation = recommendNext(progress);
    const destination = new URL(recommendation.href, 'https://replaycs.invalid');
    if (languageAwareLessons.has(destination.pathname)) {
      destination.searchParams.set('lang', progress.preferredLanguage);
    }
    return `${destination.pathname}${destination.search}${destination.hash}`;
  }

  function toggleSubject(subject: SubjectId) {
    subjectsOfInterest = subjectsOfInterest.includes(subject)
      ? subjectsOfInterest.filter((item) => item !== subject)
      : [...subjectsOfInterest, subject];
  }

  async function goToStep(next: number) {
    step = Math.max(1, Math.min(TOTAL, next));
    await tick();
    document.querySelector<HTMLElement>('.step-body h1')?.focus();
  }

  const nextStep = () => goToStep(step + 1);
  const prevStep = () => goToStep(step - 1);

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (step < TOTAL) nextStep();
    else finish();
  }

  function finish() {
    const profile = configureProfile(loadProgress(), {
      learnerLevel,
      primaryGoal,
      preferredLanguage,
      explanationLanguage,
      subjectsOfInterest: subjectsOfInterest.length ? subjectsOfInterest : ['dsa-1'],
      dailyGoalMinutes
    });
    saveProgress(profile);
    goto(learningPathFor(profile));
  }

  function skip() {
    const profile = { ...loadProgress(), onboardingComplete: true };
    saveProgress(profile);
    goto(learningPathFor(profile));
  }
</script>

<div class="onboarding">
  <form class="stepper panel" onsubmit={handleSubmit} aria-label="Set up your learning path">
    <header class="step-head">
      <div class="step-meta">
        <span class="eyebrow">Your first trace</span>
        <span class="counter" aria-live="polite">Step {step} of {TOTAL}</span>
      </div>
      <ProgressBar value={(step / TOTAL) * 100} label={`Onboarding, step ${step} of ${TOTAL}`} />
    </header>

    <div class="step-body">
      {#if step === 1}
        <section class="q">
          <span class="q-eyebrow">Let's calibrate</span>
          <h1 tabindex="-1">Where are you starting from?</h1>
          <p class="q-help">This sets your starting difficulty and what we recommend first.</p>
          <label
            >Current level
            <select bind:value={learnerLevel} aria-label="Current level">
              <option value="beginner">Beginner · learning the foundations</option>
              <option value="intermediate">Intermediate · practicing core subjects</option>
              <option value="advanced">Advanced · preparing for exams</option>
            </select>
          </label>
          <label
            >Primary goal
            <select bind:value={primaryGoal} aria-label="Primary goal">
              <option value="foundation">Build strong foundations</option>
              <option value="exam">Prepare for an exam</option>
              <option value="interview">Prepare for technical interviews</option>
              <option value="curiosity">Explore out of curiosity</option>
            </select>
          </label>
        </section>
      {:else if step === 2}
        <section class="q">
          <span class="q-eyebrow">A quick one</span>
          <h1 tabindex="-1">Which subjects are you here for?</h1>
          <p class="q-help">
            Pick any — this orders your recommendations. You can change it later.
          </p>
          <div class="subject-options" role="group" aria-label="Subjects you care about">
            {#each subjects as subject}
              <button
                type="button"
                class:selected={subjectsOfInterest.includes(subject.id)}
                aria-pressed={subjectsOfInterest.includes(subject.id)}
                onclick={() => toggleSubject(subject.id)}
                >{subjectsOfInterest.includes(subject.id) ? '✓ ' : ''}{subject.label}</button
              >
            {/each}
          </div>
        </section>
      {:else if step === 3}
        <section class="q">
          <span class="q-eyebrow">Make it readable</span>
          <h1 tabindex="-1">Your code and explanations.</h1>
          <p class="q-help">
            Every trace shows all four languages — this just sets your default view.
          </p>
          <div class="row">
            <label
              >Programming language
              <select bind:value={preferredLanguage} aria-label="Programming language">
                <option value="c">C</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>
            </label>
            <label
              >Explanation language
              <select bind:value={explanationLanguage} aria-label="Explanation language">
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
            </label>
          </div>
        </section>
      {:else}
        <section class="q">
          <span class="q-eyebrow">Last one</span>
          <h1 tabindex="-1">Set a daily rhythm.</h1>
          <p class="q-help">A gentle target to keep momentum. No pressure — change it anytime.</p>
          <label class="slider"
            >Daily learning goal <strong>{dailyGoalMinutes} minutes</strong>
            <input
              aria-label="Daily learning goal"
              type="range"
              min="5"
              max="45"
              step="5"
              bind:value={dailyGoalMinutes}
            />
          </label>
        </section>
      {/if}
    </div>

    <footer class="step-nav">
      {#if step > 1}
        <button type="button" class="back" onclick={prevStep}>← Back</button>
      {:else}
        <span class="back-spacer"></span>
      {/if}
      <button class="button primary" type="submit">
        {step < TOTAL ? 'Continue →' : 'Build my learning path →'}
      </button>
    </footer>

    {#if step === TOTAL}
      <button type="button" class="skip" onclick={skip}>Skip and use recommended defaults</button>
    {/if}
  </form>
</div>

<style>
  .onboarding {
    display: grid;
    place-items: center;
    min-height: calc(100vh - 200px);
    padding: 2rem 0;
  }
  .stepper {
    width: 100%;
    max-width: 580px;
    display: grid;
    gap: 1.5rem;
    padding: 1.75rem;
  }
  .step-head {
    display: grid;
    gap: 0.75rem;
  }
  .step-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
  }
  .eyebrow {
    margin: 0;
  }
  .counter {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--muted);
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .step-body {
    min-height: 16rem;
    display: flex;
  }
  .q {
    display: grid;
    gap: 0.85rem;
    width: 100%;
    align-content: start;
    animation: q-rise 0.28s ease both;
  }
  .q-eyebrow {
    font-family: var(--mono);
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--primary);
  }
  .q h1 {
    font-size: clamp(1.55rem, 3.4vw, 2.1rem);
    margin: 0;
    line-height: 1.12;
  }
  .q h1:focus {
    outline: none;
  }
  .q-help {
    color: var(--muted);
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    line-height: 1.55;
  }
  label {
    display: grid;
    gap: 0.4rem;
    color: var(--muted);
    font-size: 0.8rem;
  }
  .slider strong {
    color: var(--text);
  }
  select,
  input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.75rem;
    background: var(--bg);
    color: var(--text);
    font-size: 0.95rem;
  }
  input[type='range'] {
    padding: 0;
    accent-color: var(--primary);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }
  .subject-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .subject-options button {
    font-size: 0.85rem;
    padding: 0.55rem 0.95rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .subject-options button:hover {
    border-color: var(--primary);
  }
  .subject-options button.selected {
    color: var(--primary);
    border-color: var(--primary);
    background: #2dd4bf14;
  }
  .step-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    border-top: 1px solid var(--border);
    padding-top: 1.25rem;
  }
  .back {
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.4rem 0.2rem;
  }
  .back:hover {
    color: var(--text);
  }
  .step-nav .primary {
    margin-left: auto;
  }
  .skip {
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 0.76rem;
    cursor: pointer;
    justify-self: center;
    margin: -0.5rem auto 0;
  }
  .skip:hover {
    color: var(--text);
  }
  @keyframes q-rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .q {
      animation: none;
    }
  }
  @media (max-width: 620px) {
    .row {
      grid-template-columns: 1fr;
    }
    .stepper {
      padding: 1.35rem;
    }
  }
</style>
