<script lang="ts">
  import { onMount } from 'svelte';
  import { recommendNext } from '$lib/progress/recommendations';
  import {
    accuracy,
    createEmptyProgress,
    levelFromXp,
    loadProgress,
    type Progress
  } from '$lib/progress/store';

  let progress = $state<Progress>(createEmptyProgress());
  let resetMessage = $state('');
  let recommendation = $derived(recommendNext(progress));
  let accuracyScore = $derived(accuracy(progress));
  let level = $derived(levelFromXp(progress.xp));
  let misconceptions = $derived(
    Object.entries(progress.misconceptionCounts)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0)
      .sort((a, b) => b[1] - a[1])
  );

  onMount(() => (progress = loadProgress()));

  function reset() {
    if (confirm('Reset all ReplayCS progress and preferences? This cannot be undone.')) {
      localStorage.removeItem('replaycs-progress');
      progress = createEmptyProgress();
      resetMessage = 'Progress reset. Your next lesson will start fresh.';
    }
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'replaycs-progress.json';
    link.click();
    URL.revokeObjectURL(href);
  }
</script>

<section class="profile-head">
  <div>
    <p class="eyebrow">Learner profile</p>
    <h1>Level {level} tracer</h1>
    <p>Every prediction sharpens a mental model—not just a score.</p>
  </div>
  <div
    class="level-ring"
    aria-label={`${progress.xp % 100} percent toward next level`}
    style={`--level-progress:${progress.xp % 100}%`}
  >
    <strong>{progress.xp}</strong><span>XP</span>
  </div>
</section>

<div class="metrics">
  <article class="panel metric">
    <span>Prediction accuracy</span><b>{accuracyScore}%</b><small
      >{progress.correctPredictions} of {progress.predictionAttempts} correct</small
    >
  </article>
  <article class="panel metric">
    <span>Current streak</span><b>{progress.streak} 🔥</b><small>Correct predictions in a row</small
    >
  </article>
  <article class="panel metric">
    <span>Hearts</span><b>{'♥'.repeat(progress.hearts)}<i>{'♡'.repeat(3 - progress.hearts)}</i></b
    ><small>Recovery restores confidence, not farming</small>
  </article>
  <article class="panel metric">
    <span>Lessons complete</span><b>{progress.completed.length}</b><small
      >{progress.recoveredMistakes.length} mistakes recovered</small
    >
  </article>
</div>

<div class="dashboard-grid">
  <section class="panel recommendation">
    <span class="pill">{recommendation.label}</span>
    <h2>{recommendation.title}</h2>
    <p>{recommendation.reason}</p>
    <a class="button primary" href={recommendation.href}>Continue learning →</a>
  </section>
  <section class="panel preferences">
    <p class="eyebrow">Your learning setup</p>
    <dl>
      <div>
        <dt>Level</dt>
        <dd>{progress.learnerLevel}</dd>
      </div>
      <div>
        <dt>Primary language</dt>
        <dd>
          {progress.preferredLanguage === 'cpp' ? 'C++' : progress.preferredLanguage.toUpperCase()}
        </dd>
      </div>
      <div>
        <dt>Explanation</dt>
        <dd>
          {progress.explanationLanguage === 'bn' ? 'বাংলা' : 'English'} · {progress.explanationLevel}
        </dd>
      </div>
      <div>
        <dt>Daily quest</dt>
        <dd>{progress.dailyGoalMinutes} minutes</dd>
      </div>
    </dl>
    <a href="/onboarding">Edit preferences</a>
  </section>
</div>

<section class="panel mastery">
  <div class="section-head">
    <div>
      <p class="eyebrow">Mastery map</p>
      <h2>Subjects</h2>
    </div>
    <span>Deterministic scoring</span>
  </div>
  {#each [['DSA I', 'binary-search', 'cyan'], ['DSA II', 'bfs', 'violet'], ['DBMS', 'query-pipeline', 'amber'], ['Operating Systems', 'cpu-scheduling', 'green'], ['Networks', 'packet-journey', 'blue']] as subject}{@const score =
      progress.completed.includes(subject[1]) ? 75 : 0}
    <div class="mastery-row">
      <strong>{subject[0]}</strong>
      <div class="bar"><span class={subject[2]} style={`width:${score}%`}></span></div>
      <b>{score}%</b>
    </div>{/each}
</section>

<div class="dashboard-grid lower">
  <section class="panel">
    <p class="eyebrow">Misconception evidence</p>
    <h2>What to revisit</h2>
    {#if misconceptions.length}<ul class="tags">
        {#each misconceptions as [tag, count]}<li><span>{tag}</span><b>{count}×</b></li>{/each}
      </ul>{:else}<p class="empty">
        No misconception evidence yet. ReplayCS records only what your interactions demonstrate.
      </p>{/if}
  </section>
  <section class="panel">
    <p class="eyebrow">Badges</p>
    <h2>Achievements</h2>
    {#if progress.badges.length}<div class="badges">
        {#each progress.badges as badge}<div><span>🏅</span><b>{badge}</b></div>{/each}
      </div>{:else}<p class="empty">Make your first prediction to unlock a badge.</p>{/if}
  </section>
</div>

<section class="data-actions">
  <div>
    <h2>Your data stays here</h2>
    <p>ReplayCS stores this profile in your browser. Export it anytime.</p>
  </div>
  <button onclick={exportProgress}>Export JSON</button><button class="danger" onclick={reset}
    >Reset progress</button
  >
</section>
{#if resetMessage}<p role="status" class="reset-message">{resetMessage}</p>{/if}

<style>
  .profile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 2rem;
  }
  .profile-head h1 {
    font-size: clamp(2.5rem, 5vw, 4rem);
    margin: 0.3rem 0;
  }
  .profile-head p {
    color: var(--muted);
  }
  .level-ring {
    --level-progress: 0%;
    width: 120px;
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-content: center;
    text-align: center;
    background:
      radial-gradient(circle, var(--bg) 58%, transparent 60%),
      conic-gradient(var(--primary) var(--level-progress), var(--border) 0);
  }
  .level-ring strong {
    font-size: 1.6rem;
  }
  .level-ring span {
    font-size: 0.65rem;
    color: var(--muted);
  }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.8rem;
  }
  .metric {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .metric span,
  .metric small {
    color: var(--muted);
    font-size: 0.72rem;
  }
  .metric b {
    font-size: 1.65rem;
    color: var(--primary);
  }
  .metric i {
    color: var(--border);
    font-style: normal;
  }
  .dashboard-grid {
    display: grid;
    grid-template-columns: 1.25fr 0.75fr;
    gap: 0.8rem;
    margin-top: 0.8rem;
  }
  .dashboard-grid > section,
  .mastery {
    padding: 1.25rem;
  }
  .recommendation {
    background: linear-gradient(135deg, #2dd4bf18, #8b5cf610);
  }
  .recommendation p {
    color: var(--muted);
    max-width: 520px;
  }
  .preferences dl {
    margin: 0.7rem 0;
  }
  .preferences dl div {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    padding: 0.45rem 0;
  }
  .preferences dt {
    color: var(--muted);
  }
  .preferences dd {
    margin: 0;
  }
  .preferences a {
    color: var(--primary);
    font-size: 0.8rem;
  }
  .mastery {
    margin-top: 0.8rem;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-head h2 {
    margin: 0.2rem 0;
  }
  .section-head > span {
    color: var(--muted);
    font-size: 0.7rem;
  }
  .mastery-row {
    display: grid;
    grid-template-columns: 150px 1fr 45px;
    gap: 1rem;
    align-items: center;
    margin: 0.8rem 0;
  }
  .bar {
    height: 9px;
    border-radius: 99px;
    background: var(--border);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
  }
  .cyan {
    background: var(--primary);
  }
  .violet {
    background: var(--secondary);
  }
  .amber {
    background: var(--warning);
  }
  .green {
    background: var(--success);
  }
  .blue {
    background: var(--accent);
  }
  .lower > section {
    min-height: 230px;
  }
  .tags {
    list-style: none;
    padding: 0;
  }
  .tags li {
    display: flex;
    justify-content: space-between;
    padding: 0.55rem;
    border-bottom: 1px solid var(--border);
  }
  .tags span {
    color: var(--warning);
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }
  .badges div {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem;
    background: var(--bg);
    border-radius: 10px;
  }
  .badges span {
    font-size: 1.5rem;
  }
  .empty {
    color: var(--muted);
  }
  .data-actions {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-top: 1.5rem;
  }
  .data-actions div {
    margin-right: auto;
  }
  .data-actions h2 {
    font-size: 1rem;
    margin: 0;
  }
  .data-actions p {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .danger {
    color: var(--danger);
  }
  .reset-message {
    color: var(--success);
  }
  @media (max-width: 850px) {
    .metrics {
      grid-template-columns: 1fr 1fr;
    }
    .dashboard-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    .profile-head {
      align-items: flex-start;
    }
    .level-ring {
      width: 85px;
      flex: none;
    }
    .metrics {
      grid-template-columns: 1fr;
    }
    .mastery-row {
      grid-template-columns: 100px 1fr 36px;
      gap: 0.5rem;
    }
    .data-actions {
      align-items: stretch;
      flex-direction: column;
    }
    .data-actions div {
      margin-right: 0;
    }
  }
</style>
