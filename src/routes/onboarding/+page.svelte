<script lang="ts">
  import { goto } from '$app/navigation';
  import { recommendNext } from '$lib/progress/recommendations';
  import {
    configureProfile,
    loadProgress,
    saveProgress,
    type LearnerLevel,
    type LearningGoal
  } from '$lib/progress/store';
  import type { SubjectId, SupportedLanguage } from '$lib/trace/types';

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

  function toggleSubject(subject: SubjectId) {
    subjectsOfInterest = subjectsOfInterest.includes(subject)
      ? subjectsOfInterest.filter((item) => item !== subject)
      : [...subjectsOfInterest, subject];
  }

  function finish(event?: SubmitEvent) {
    event?.preventDefault();
    const profile = configureProfile(loadProgress(), {
      learnerLevel,
      primaryGoal,
      preferredLanguage,
      explanationLanguage,
      subjectsOfInterest: subjectsOfInterest.length ? subjectsOfInterest : ['dsa-1'],
      dailyGoalMinutes
    });
    saveProgress(profile);
    goto(recommendNext(profile).href);
  }

  function skip() {
    const current = loadProgress();
    saveProgress({ ...current, onboardingComplete: true });
    goto(recommendNext(current).href);
  }
</script>

<div class="onboarding">
  <section class="intro">
    <span class="eyebrow">Your first trace</span>
    <h1>Make ReplayCS fit how you learn.</h1>
    <p>
      Six quick choices configure recommendations and explanations. No account, no personal details.
    </p>
    <div class="promise panel">
      <span>01</span>
      <p><strong>Predict first.</strong><br />Explanations arrive after you commit to a state.</p>
      <span>02</span>
      <p><strong>Recover visibly.</strong><br />Mistakes become targeted micro-challenges.</p>
      <span>03</span>
      <p><strong>Progress honestly.</strong><br />Deterministic mastery—not AI-generated scores.</p>
    </div>
  </section>
  <form class="panel" onsubmit={finish}>
    <label
      >Current level<select bind:value={learnerLevel}
        ><option value="beginner">Beginner · learning the foundations</option><option
          value="intermediate">Intermediate · practicing core subjects</option
        ><option value="advanced">Advanced · preparing for exams</option></select
      ></label
    >
    <label
      >Primary goal<select bind:value={primaryGoal}
        ><option value="foundation">Build strong foundations</option><option value="exam"
          >Prepare for an exam</option
        ><option value="interview">Prepare for technical interviews</option><option
          value="curiosity">Explore out of curiosity</option
        ></select
      ></label
    >
    <div class="row">
      <label
        >Programming language<select bind:value={preferredLanguage}
          ><option value="c">C</option><option value="cpp">C++</option><option value="java"
            >Java</option
          ><option value="python">Python</option></select
        ></label
      ><label
        >Explanation language<select bind:value={explanationLanguage}
          ><option value="en">English</option><option value="bn">বাংলা</option></select
        ></label
      >
    </div>
    <fieldset>
      <legend>Subjects you care about</legend>
      <div class="subject-options">
        {#each subjects as subject}<button
            type="button"
            class:selected={subjectsOfInterest.includes(subject.id)}
            aria-pressed={subjectsOfInterest.includes(subject.id)}
            onclick={() => toggleSubject(subject.id)}
            >{subjectsOfInterest.includes(subject.id) ? '✓ ' : ''}{subject.label}</button
          >{/each}
      </div>
    </fieldset>
    <label
      >Daily learning goal <strong>{dailyGoalMinutes} minutes</strong><input
        aria-label="Daily learning goal"
        type="range"
        min="5"
        max="45"
        step="5"
        bind:value={dailyGoalMinutes}
      /></label
    >
    <button class="primary start" type="submit">Build my learning path →</button><button
      class="skip"
      type="button"
      onclick={skip}>Skip and use recommended defaults</button
    >
  </form>
</div>

<style>
  .onboarding {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    align-items: center;
    min-height: 70vh;
  }
  .intro h1 {
    font-size: clamp(2.6rem, 5vw, 4.5rem);
  }
  .intro > p {
    color: var(--muted);
    line-height: 1.7;
  }
  .promise {
    display: grid;
    grid-template-columns: 35px 1fr;
    padding: 1rem;
    gap: 0.7rem;
  }
  .promise span {
    color: var(--primary);
    font-family: var(--mono);
  }
  .promise p {
    margin: 0;
    color: var(--muted);
    font-size: 0.82rem;
  }
  .promise strong {
    color: var(--text);
  }
  form {
    padding: 1.4rem;
    display: grid;
    gap: 1rem;
  }
  label {
    display: grid;
    gap: 0.35rem;
    color: var(--muted);
    font-size: 0.78rem;
  }
  select,
  input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 9px;
    padding: 0.7rem;
    background: var(--bg);
    color: var(--text);
  }
  input[type='range'] {
    padding: 0;
    accent-color: var(--primary);
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }
  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
  }
  legend {
    color: var(--muted);
    font-size: 0.78rem;
    margin-bottom: 0.4rem;
  }
  .subject-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .subject-options button {
    font-size: 0.72rem;
  }
  .subject-options button.selected {
    color: var(--primary);
    border-color: var(--primary);
    background: #2dd4bf14;
  }
  .start {
    margin-top: 0.5rem;
  }
  .skip {
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 0.72rem;
  }
  @media (max-width: 760px) {
    .onboarding {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .row {
      grid-template-columns: 1fr;
    }
  }
</style>
