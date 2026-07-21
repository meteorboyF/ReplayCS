<script lang="ts">
  import { onMount } from 'svelte';
  import { recommendNext } from '$lib/progress/recommendations';
  import {
    createEmptyProgress,
    levelFromXp,
    loadProgress,
    type Progress
  } from '$lib/progress/store';
  import type { SupportedLanguage } from '$lib/trace/types';

  let progress = $state<Progress>(createEmptyProgress());
  let resetMessage = $state('');
  let recommendation = $derived(recommendNext(progress));
  let level = $derived(levelFromXp(progress.xp));

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
    <p>Every trace you run makes invisible state visible.</p>
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
  <article class="panel metric" data-testid="traces-completed">
    <span>Traces completed</span><b>{progress.completed.length}</b><small
      >Lessons run end to end</small
    >
  </article>
  <article class="panel metric" data-testid="subjects-started">
    <span>Subjects explored</span><b
      >{subjectMastery.filter((subject) => masteryFor(subject.prefixes) > 0).length}</b
    ><small>of {subjectMastery.length} tracks</small>
  </article>
  <article class="panel metric" data-testid="languages-viewed">
    <span>Languages viewed</span><b>{languageActivity.length}</b><small
      >C · C++ · Java · Python</small
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

<div class="dashboard-grid learning-history">
  <section class="panel arena-progress">
    <div class="section-head">
      <div>
        <p class="eyebrow">Scenario Gallery</p>
        <h2>Jump into a trace</h2>
      </div>
    </div>
    <p>
      Hand-picked executions — dynamic-array resizes, hash collisions, worst-case searches, Round
      Robin scheduling, LEFT JOINs, and cold-cache packet journeys — each opening straight into its
      visual trace.
    </p>
    <a href="/challenges" data-testid="scenario-gallery-link">Open the Scenario Gallery →</a>
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
    <p class="empty">No activity recorded yet. Completed traces will appear here.</p>
  {/if}
</section>

<section class="panel mastery">
  <div class="section-head">
    <div>
      <p class="eyebrow">Topic progress</p>
      <h2>Subjects</h2>
    </div>
    <span>Completion-based</span>
  </div>
  {#each subjectMastery as subject}{@const score = masteryFor(subject.prefixes)}
    <div class="mastery-row">
      <strong>{subject.label}</strong>
      <div class="bar"><span class={subject.accent} style={`width:${score}%`}></span></div>
      <b>{score}%</b>
    </div>{/each}
</section>

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
  .arena-progress p {
    color: var(--muted);
    font-size: 0.82rem;
  }
  .arena-progress a {
    color: var(--primary);
    font-size: 0.8rem;
  }
  .language-bar {
    height: 9px;
    overflow: hidden;
    border-radius: 99px;
    background: var(--border);
  }
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
