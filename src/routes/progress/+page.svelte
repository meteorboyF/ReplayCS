<script lang="ts">
  import { onMount } from 'svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
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

<header class="profile-head">
  <div>
    <p class="eyebrow">Learner profile</p>
    <h1>Level {level} tracer</h1>
    <p class="tagline">Every trace you run makes invisible state visible.</p>
  </div>
  <div
    class="level-ring"
    aria-label={`${progress.xp % 100} percent toward next level`}
    style={`--level-progress:${progress.xp % 100}%`}
  >
    <strong>{progress.xp}</strong><span>XP</span>
  </div>
</header>

<section class="panel next-up" aria-labelledby="next-up-title">
  <span class="pill">{recommendation.label}</span>
  <h2 id="next-up-title">{recommendation.title}</h2>
  <p>{recommendation.reason}</p>
  <a class="button primary" href={recommendation.href}>Continue learning →</a>
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

<section class="panel mastery">
  <div class="section-head">
    <div>
      <p class="eyebrow">Topic progress</p>
      <h2>Subjects</h2>
    </div>
    <span>Completion-based</span>
  </div>
  {#each subjectMastery as subject}
    {@const score = masteryFor(subject.prefixes)}
    <div class="mastery-row">
      <strong>{subject.label}</strong>
      <ProgressBar value={score} label={`${subject.label} mastery`} />
      <b>{score}%</b>
    </div>
  {/each}
</section>

<div class="history-grid">
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

<section class="panel jump-in">
  <div>
    <p class="eyebrow">Scenario Gallery</p>
    <h2>Jump into a trace</h2>
    <p>Hand-picked executions, each opening straight into its visual trace.</p>
  </div>
  <a class="jump-link" href="/challenges" data-testid="scenario-gallery-link">Open the gallery →</a>
</section>

<details class="secondary panel">
  <summary>Preferences &amp; data</summary>
  <div class="secondary-body">
    <dl class="preferences">
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
    <div class="secondary-actions">
      <a href="/onboarding">Edit preferences</a>
      <span class="grow"></span>
      <button onclick={exportProgress}>Export JSON</button>
      <button class="danger" onclick={reset}>Reset progress</button>
    </div>
    <p class="data-note">ReplayCS stores this profile in your browser only. Export it anytime.</p>
  </div>
</details>
{#if resetMessage}<p role="status" class="reset-message">{resetMessage}</p>{/if}

<style>
  .profile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 1.25rem;
  }
  .profile-head h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    margin: 0.3rem 0;
  }
  .profile-head .tagline {
    color: var(--muted);
    margin: 0;
  }
  .level-ring {
    --level-progress: 0%;
    width: 104px;
    aspect-ratio: 1;
    border-radius: 50%;
    display: grid;
    place-content: center;
    text-align: center;
    flex: none;
    background:
      radial-gradient(circle, var(--bg) 58%, transparent 60%),
      conic-gradient(var(--primary) var(--level-progress), var(--border) 0);
  }
  .level-ring strong {
    font-size: 1.5rem;
  }
  .level-ring span {
    font-size: 0.65rem;
    color: var(--muted);
  }

  /* promoted primary action */
  .next-up {
    padding: 1.5rem;
    display: grid;
    justify-items: start;
    gap: 0.55rem;
    background: linear-gradient(135deg, #2dd4bf1f, #8b5cf610);
    border-color: color-mix(in oklab, var(--primary) 40%, var(--border));
  }
  .next-up h2 {
    margin: 0;
    font-size: clamp(1.4rem, 3vw, 1.9rem);
  }
  .next-up p {
    color: var(--muted);
    margin: 0;
    max-width: 560px;
  }
  .next-up .button.primary {
    margin-top: 0.4rem;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    margin-top: 0.8rem;
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
    font-variant-numeric: tabular-nums;
  }

  .mastery,
  .activity,
  .language-usage,
  .jump-in {
    padding: 1.25rem;
    margin-top: 0.8rem;
  }
  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-head h2 {
    margin: 0.2rem 0;
    font-size: 1.15rem;
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
    margin: 0.85rem 0;
  }
  .mastery-row b {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .history-grid {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
    gap: 0.8rem;
  }
  .history-grid > section {
    margin-top: 0.8rem;
  }

  .language-bar {
    height: 9px;
    overflow: hidden;
    border-radius: 99px;
    background: var(--raised);
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

  .jump-in {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .jump-in h2 {
    margin: 0.15rem 0;
    font-size: 1.15rem;
  }
  .jump-in p {
    color: var(--muted);
    font-size: 0.82rem;
    margin: 0;
    max-width: 46ch;
  }
  .jump-link {
    color: var(--primary);
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }

  /* deferred settings */
  .secondary {
    margin-top: 0.8rem;
    padding: 0.4rem 1.25rem;
  }
  .secondary summary {
    cursor: pointer;
    padding: 0.85rem 0;
    font-weight: 600;
    color: var(--text);
    list-style: revert;
  }
  .secondary summary:hover {
    color: var(--primary);
  }
  .secondary-body {
    padding-bottom: 1rem;
  }
  .preferences {
    margin: 0.2rem 0 1rem;
  }
  .preferences div {
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
  .secondary-actions {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .secondary-actions .grow {
    flex: 1;
  }
  .secondary-actions a {
    color: var(--primary);
    font-size: 0.82rem;
  }
  .danger {
    color: var(--danger);
  }
  .data-note {
    color: var(--muted);
    font-size: 0.75rem;
    margin: 0.8rem 0 0;
  }

  .empty {
    color: var(--muted);
  }
  .reset-message {
    color: var(--success);
    margin-top: 0.8rem;
  }

  @media (max-width: 850px) {
    .metrics {
      grid-template-columns: 1fr 1fr;
    }
    .history-grid {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    .profile-head {
      align-items: flex-start;
    }
    .level-ring {
      width: 85px;
    }
    .metrics {
      grid-template-columns: 1fr;
    }
    .mastery-row {
      grid-template-columns: 100px 1fr 36px;
      gap: 0.5rem;
    }
    .jump-in {
      flex-direction: column;
      align-items: flex-start;
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
