<script lang="ts">
  import { onMount } from 'svelte';
  import { arenaChallenges } from '$lib/challenges/arena';
  import { recommendNext } from '$lib/progress/recommendations';
  import {
    accuracy,
    createEmptyProgress,
    levelFromXp,
    loadProgress,
    type Progress
  } from '$lib/progress/store';
  import type { SupportedLanguage } from '$lib/trace/types';

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
  let checkpointEvidence = $derived([
    ...new Set([...progress.awardedPredictions, ...progress.mistakeEvidence])
  ]);
  let mistakenCheckpoints = $derived(new Set(progress.mistakeEvidence));
  let firstAttemptCorrect = $derived(
    checkpointEvidence.filter(
      (id) => progress.awardedPredictions.includes(id) && !mistakenCheckpoints.has(id)
    ).length
  );
  let firstAttemptAccuracy = $derived(
    checkpointEvidence.length
      ? Math.round((firstAttemptCorrect / checkpointEvidence.length) * 100)
      : null
  );
  let averageAttempts = $derived(
    checkpointEvidence.length
      ? Math.max(progress.predictionAttempts, checkpointEvidence.length) / checkpointEvidence.length
      : null
  );
  const bossIds: ReadonlySet<string> = new Set(arenaChallenges.map((challenge) => challenge.id));
  let completedBosses = $derived(
    progress.completedBossChallenges.filter((id) => bossIds.has(id)).length
  );
  const totalBosses = arenaChallenges.length;
  let bossProgress = $derived(Math.round((completedBosses / totalBosses) * 100));

  const languageLabels: Record<SupportedLanguage, string> = {
    c: 'C',
    cpp: 'C++',
    java: 'Java',
    python: 'Python'
  };
  const languageIds = Object.keys(languageLabels) as SupportedLanguage[];
  let languageActivity = $derived(
    languageIds
      .map((id) => ({ id, label: languageLabels[id], count: progress.languageUsage[id] ?? 0 }))
      .filter((language) => language.count > 0)
      .sort((a, b) => b.count - a.count)
  );
  let totalLanguageActivity = $derived(
    languageActivity.reduce((total, language) => total + language.count, 0)
  );

  const subjectMastery = [
    {
      label: 'DSA I',
      prefixes: ['binary-search', 'sorting-arena', 'linked-list-lab', 'array-lab'],
      accent: 'cyan'
    },
    { label: 'DSA II', prefixes: ['graph-explorer'], accent: 'violet' },
    { label: 'DBMS', prefixes: ['query-pipeline'], accent: 'amber' },
    { label: 'Operating Systems', prefixes: ['cpu-scheduling'], accent: 'green' },
    { label: 'Networks', prefixes: ['packet-journey'], accent: 'blue' }
  ] as const;

  onMount(() => (progress = loadProgress()));

  function reset() {
    if (confirm('Reset all ReplayCS progress and preferences? This cannot be undone.')) {
      localStorage.removeItem('replaycs-progress');
      localStorage.removeItem('replaycs-linked-list-operations');
      localStorage.removeItem('replaycs-array-operations');
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

  function masteryFor(prefixes: readonly string[]) {
    const recorded = Object.entries(progress.lessonMastery)
      .filter(([lessonId]) => prefixes.some((prefix) => lessonId.includes(prefix)))
      .map(([, score]) => score);
    const hasLegacyCompletion = progress.completed.some((lessonId) =>
      prefixes.some((prefix) => lessonId.includes(prefix))
    );
    return Math.max(hasLegacyCompletion ? 50 : 0, ...recorded, 0);
  }

  function activityLabel(type: Progress['recentActivity'][number]['type']) {
    if (type === 'prediction') return 'Prediction earned';
    if (type === 'recovery') return 'Mistake recovered';
    return 'Lesson completed';
  }

  function lessonLabel(lessonId: string) {
    const canonicalId = lessonId.split(':')[0];
    const labels: Record<string, string> = {
      'binary-search': 'Binary Search',
      'sorting-arena': 'Sorting Arena',
      'linked-list-lab': 'Linked List Lab',
      'array-lab': 'Array & Dynamic Array Lab',
      'graph-explorer': 'Graph Explorer',
      'query-pipeline': 'Query Pipeline',
      'cpu-scheduling': 'CPU Scheduling',
      'packet-journey': 'Packet Journey',
      'binary-bound-boss': 'Binary Bounds Boss',
      'bfs-frontier-boss': 'BFS Frontier Boss',
      'sql-pipeline-boss': 'SQL Pipeline Boss',
      'round-robin-boss': 'Round Robin Boss',
      'packet-route-boss': 'Packet Route Boss'
    };
    return (
      labels[canonicalId] ??
      canonicalId
        .split('-')
        .filter(Boolean)
        .map((word) => word[0]?.toUpperCase() + word.slice(1))
        .join(' ')
    );
  }

  function activityTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time unavailable';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
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

<section class="evidence-grid" aria-label="Learning evidence">
  <article class="panel evidence-card" data-testid="first-attempt-accuracy">
    <span>First-attempt accuracy</span>
    <b>{firstAttemptAccuracy === null ? '—' : `${firstAttemptAccuracy}%`}</b>
    <small>
      {#if checkpointEvidence.length}
        {firstAttemptCorrect} of {checkpointEvidence.length} unique checkpoints
      {:else}
        No checkpoint evidence yet
      {/if}
    </small>
  </article>
  <article class="panel evidence-card" data-testid="average-attempts">
    <span>Average attempts</span>
    <b>{averageAttempts === null ? '—' : averageAttempts.toFixed(1)}</b>
    <small>
      {#if checkpointEvidence.length}
        Per unique evidenced checkpoint
      {:else}
        Make a prediction to start measuring
      {/if}
    </small>
  </article>
  <article class="panel evidence-card" data-testid="hints-used">
    <span>Hints used</span>
    <b>{progress.hintsUsed}</b>
    <small>{progress.hintsUsed === 1 ? 'Recorded hint request' : 'Recorded hint requests'}</small>
  </article>
</section>

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

<div class="dashboard-grid learning-history">
  <section class="panel arena-progress" data-testid="boss-progress">
    <div class="section-head">
      <div>
        <p class="eyebrow">Challenge Arena</p>
        <h2>Boss progress</h2>
      </div>
      <strong>{completedBosses}/{totalBosses}</strong>
    </div>
    <div
      class="arena-meter"
      role="progressbar"
      aria-label="Bosses cleared"
      aria-valuemin="0"
      aria-valuemax={totalBosses}
      aria-valuenow={completedBosses}
    >
      <span style={`width:${bossProgress}%`}></span>
    </div>
    <p>
      {#if completedBosses === totalBosses}
        Every subject boss is cleared. Replay one to keep the trace sharp.
      {:else if completedBosses > 0}
        {completedBosses} of {totalBosses} subject bosses cleared.
      {:else}
        No bosses cleared yet. Each boss combines two prediction checkpoints.
      {/if}
    </p>
    <a href="/challenges"
      >{completedBosses === totalBosses ? 'Replay a boss' : 'Open Challenge Arena'} →</a
    >
  </section>

  <section class="panel language-usage" data-testid="language-usage">
    <div class="section-head">
      <div>
        <p class="eyebrow">Code practice</p>
        <h2>Language activity</h2>
      </div>
      {#if totalLanguageActivity}<span>{totalLanguageActivity} recorded</span>{/if}
    </div>
    {#if languageActivity.length}
      <ul>
        {#each languageActivity as language}
          <li>
            <strong>{language.label}</strong>
            <div class="language-bar" aria-hidden="true">
              <span style={`width:${(language.count / totalLanguageActivity) * 100}%`}></span>
            </div>
            <b>{language.count}</b>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="empty">
        No language interactions recorded yet. Open a code trace and choose a language to start.
      </p>
    {/if}
  </section>
</div>

<section class="panel activity" data-testid="recent-activity">
  <div class="section-head">
    <div>
      <p class="eyebrow">Learning history</p>
      <h2>Recent activity</h2>
    </div>
    {#if progress.recentActivity.length}<span
        >Latest {Math.min(progress.recentActivity.length, 6)}</span
      >{/if}
  </div>
  {#if progress.recentActivity.length}
    <ol>
      {#each progress.recentActivity.slice(0, 6) as item}
        <li>
          <span class={`activity-mark ${item.type}`} aria-hidden="true"></span>
          <div>
            <strong>{activityLabel(item.type)}</strong>
            <span>{lessonLabel(item.lessonId)}</span>
          </div>
          <div class="activity-meta">
            <b>+{item.xp} XP</b>
            <time datetime={item.at}>{activityTime(item.at)}</time>
          </div>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="empty">
      No activity recorded yet. Predictions, recoveries, and completions will appear here.
    </p>
  {/if}
</section>

<section class="panel mastery">
  <div class="section-head">
    <div>
      <p class="eyebrow">Mastery map</p>
      <h2>Subjects</h2>
    </div>
    <span>Deterministic scoring</span>
  </div>
  {#each subjectMastery as subject}{@const score = masteryFor(subject.prefixes)}
    <div class="mastery-row">
      <strong>{subject.label}</strong>
      <div class="bar"><span class={subject.accent} style={`width:${score}%`}></span></div>
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
  .evidence-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    margin-top: 0.8rem;
  }
  .evidence-card {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
  }
  .evidence-card span,
  .evidence-card small {
    color: var(--muted);
    font-size: 0.72rem;
  }
  .evidence-card b {
    color: var(--text);
    font-size: 1.45rem;
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
  .learning-history {
    grid-template-columns: 0.9fr 1.1fr;
  }
  .arena-progress,
  .language-usage,
  .activity {
    padding: 1.25rem;
  }
  .arena-progress .section-head > strong {
    color: var(--primary);
    font-size: 1.5rem;
  }
  .arena-progress p {
    color: var(--muted);
    font-size: 0.82rem;
  }
  .arena-progress a {
    color: var(--primary);
    font-size: 0.8rem;
  }
  .arena-meter,
  .language-bar {
    height: 9px;
    overflow: hidden;
    border-radius: 99px;
    background: var(--border);
  }
  .arena-meter {
    margin-top: 1rem;
  }
  .arena-meter span,
  .language-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--primary), var(--secondary));
  }
  .language-usage ul,
  .activity ol {
    list-style: none;
    margin: 0.8rem 0 0;
    padding: 0;
  }
  .language-usage li {
    display: grid;
    grid-template-columns: 62px 1fr 34px;
    align-items: center;
    gap: 0.65rem;
    padding: 0.45rem 0;
  }
  .language-usage li strong,
  .language-usage li b {
    font-size: 0.78rem;
  }
  .language-usage li b {
    text-align: right;
  }
  .activity {
    margin-top: 0.8rem;
  }
  .activity li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.8rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border);
  }
  .activity li:last-child {
    border-bottom: 0;
  }
  .activity-mark {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--primary);
    box-shadow: 0 0 0 4px #2dd4bf18;
  }
  .activity-mark.recovery {
    background: var(--warning);
    box-shadow: 0 0 0 4px #f59e0b18;
  }
  .activity-mark.completion {
    background: var(--secondary);
    box-shadow: 0 0 0 4px #8b5cf618;
  }
  .activity li > div:not(.activity-meta) {
    display: grid;
    gap: 0.2rem;
  }
  .activity li span,
  .activity-meta time {
    color: var(--muted);
    font-size: 0.7rem;
  }
  .activity-meta {
    display: grid;
    gap: 0.2rem;
    text-align: right;
  }
  .activity-meta b {
    color: var(--success);
    font-size: 0.75rem;
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
    .evidence-grid {
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
    .activity li {
      grid-template-columns: auto 1fr;
      align-items: start;
    }
    .activity-meta {
      grid-column: 2;
      grid-template-columns: auto 1fr;
      text-align: left;
    }
  }
</style>
