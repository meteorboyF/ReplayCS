<script lang="ts">
  import { onMount } from 'svelte';
  import {
    arenaChallenges,
    evaluateChallengeAnswer,
    getArenaChallenge,
    isChallengeId,
    type ChallengeEvaluation,
    type ChallengeId
  } from '$lib/challenges/arena';
  import {
    completeBossChallenge,
    createEmptyProgress,
    loadProgress,
    recordMisconception,
    saveProgress,
    type Progress
  } from '$lib/progress/store';

  let progress = $state<Progress>(createEmptyProgress());
  let activeId = $state<ChallengeId>('binary-bound-boss');
  let checkpointIndex = $state(0);
  let selectedAnswerId = $state('');
  let result = $state<ChallengeEvaluation | null>(null);
  let revealed = $state(false);
  let solvedCheckpointIds = $state<string[]>([]);
  let usedReveal = $state(false);
  let sessionComplete = $state(false);
  let sessionCleared = $state(false);
  let completionMessage = $state('');

  let activeChallenge = $derived(getArenaChallenge(activeId));
  let checkpoint = $derived(activeChallenge.checkpoints[checkpointIndex]);
  let correctOption = $derived(
    checkpoint.options.find((option) => option.id === checkpoint.correctOptionId)
  );
  let completedCount = $derived(
    arenaChallenges.filter((challenge) => progress.completedBossChallenges.includes(challenge.id))
      .length
  );
  let completedPercent = $derived(Math.round((completedCount / arenaChallenges.length) * 100));
  let previouslyCompleted = $derived(progress.completedBossChallenges.includes(activeChallenge.id));
  let nextUnbeatenChallenge = $derived(
    arenaChallenges.find(
      (challenge) =>
        challenge.id !== activeId && !progress.completedBossChallenges.includes(challenge.id)
    ) ?? null
  );

  onMount(() => {
    progress = loadProgress();
    const requestedChallenge = new URLSearchParams(location.search).get('challenge');
    if (isChallengeId(requestedChallenge)) selectChallenge(requestedChallenge, false);
  });

  function resetSession() {
    checkpointIndex = 0;
    selectedAnswerId = '';
    result = null;
    revealed = false;
    solvedCheckpointIds = [];
    usedReveal = false;
    sessionComplete = false;
    sessionCleared = false;
    completionMessage = '';
  }

  function selectChallenge(id: ChallengeId, syncUrl = true) {
    activeId = id;
    resetSession();
    if (syncUrl) history.replaceState({}, '', `?challenge=${id}`);
  }

  function checkAnswer() {
    if (!selectedAnswerId || result || revealed) return;
    result = evaluateChallengeAnswer(activeId, checkpoint.id, selectedAnswerId);
    if (result.correct) {
      if (!solvedCheckpointIds.includes(checkpoint.id)) {
        solvedCheckpointIds = [...solvedCheckpointIds, checkpoint.id];
      }
      return;
    }

    const evidenceId = `${activeChallenge.id}:${checkpoint.id}`;
    progress = recordMisconception(progress, evidenceId, checkpoint.misconceptionTag);
    saveProgress(progress);
  }

  function retryCheckpoint() {
    selectedAnswerId = '';
    result = null;
  }

  function revealAnswer() {
    revealed = true;
    usedReveal = true;
    result = null;
    if (!solvedCheckpointIds.includes(checkpoint.id)) {
      solvedCheckpointIds = [...solvedCheckpointIds, checkpoint.id];
    }
  }

  function advanceCheckpoint() {
    if (!result?.correct && !revealed) return;
    if (checkpointIndex === activeChallenge.checkpoints.length - 1) {
      finishChallenge();
      return;
    }
    checkpointIndex += 1;
    selectedAnswerId = '';
    result = null;
    revealed = false;
  }

  function finishChallenge() {
    if (usedReveal) {
      sessionComplete = true;
      sessionCleared = false;
      completionMessage = 'Guided practice complete. Reveals do not clear a boss or award XP.';
      return;
    }
    const alreadyEarned = progress.completedBossChallenges.includes(activeChallenge.id);
    progress = completeBossChallenge(progress, activeChallenge.id, activeChallenge.xpReward);
    saveProgress(progress);
    sessionComplete = true;
    sessionCleared = true;
    completionMessage = alreadyEarned
      ? `Replay complete. Your ${activeChallenge.xpReward} XP reward stays single-award.`
      : `Boss cleared. +${activeChallenge.xpReward} XP saved to this browser.`;
  }
</script>

<svelte:head>
  <title>Challenge Arena — ReplayCS</title>
  <meta
    name="description"
    content="Clear deterministic computer science boss challenges with prediction, retry, and reveal feedback."
  />
</svelte:head>

<section class="hero">
  <div>
    <p class="eyebrow">Challenge arena</p>
    <h1>Five subjects. <span class="gradient">No lucky guesses.</span></h1>
    <p class="hero-copy">
      Inspect real state, predict the next transition, and explain the machine to yourself. Every
      boss is deterministic and every reward is earned once.
    </p>
  </div>
  <div class="arena-summary panel" aria-label="Arena progress">
    <div class="summary-top">
      <span>Arena cleared</span><strong>{completedCount}/{arenaChallenges.length}</strong>
    </div>
    <div
      class="completion-track"
      role="progressbar"
      aria-label="Boss challenge completion"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={completedPercent}
    >
      <span style={`width: ${completedPercent}%`}></span>
    </div>
    <div class="summary-stats">
      <span><b>⚡ {progress.xp}</b> total XP</span>
      <span><b>{'♥'.repeat(progress.hearts)}{'♡'.repeat(3 - progress.hearts)}</b> focus</span>
    </div>
  </div>
</section>

<div class="arena-layout">
  <aside class="challenge-map" aria-label="Choose a subject challenge">
    <div class="map-heading">
      <p class="eyebrow">Boss map</p>
      <span>{completedCount} cleared</span>
    </div>
    <ol>
      {#each arenaChallenges as challenge, index}
        {@const cleared = progress.completedBossChallenges.includes(challenge.id)}
        <li>
          <button
            class={`challenge-select ${challenge.accent}`}
            class:active={activeId === challenge.id}
            aria-pressed={activeId === challenge.id}
            onclick={() => selectChallenge(challenge.id)}
            data-testid={`challenge-card-${challenge.id}`}
          >
            <span class="map-index" aria-hidden="true">{cleared ? '✓' : index + 1}</span>
            <span class="map-copy">
              <small>{challenge.subjectLabel}</small>
              <strong>{challenge.shortTitle}</strong>
              <span>{challenge.estimatedMinutes} min · {challenge.xpReward} XP</span>
            </span>
            <span class:cleared class="map-status" data-testid={`challenge-status-${challenge.id}`}
              >{cleared ? 'Cleared' : 'Open'}</span
            >
          </button>
        </li>
      {/each}
    </ol>
    <p class="persistence-note">
      <span aria-hidden="true">●</span> Progress is saved locally. Replays never duplicate XP.
    </p>
  </aside>

  <section
    class={`challenge-shell panel ${activeChallenge.accent}`}
    aria-labelledby="active-challenge-title"
  >
    <header class="challenge-head">
      <div>
        <div class="challenge-meta">
          <span>{activeChallenge.subjectLabel}</span><span>{activeChallenge.difficulty}</span><span
            >{activeChallenge.estimatedMinutes} min</span
          >
        </div>
        <h2 id="active-challenge-title">{activeChallenge.title}</h2>
        <p>{activeChallenge.objective}</p>
      </div>
      <div class="reward" class:secured={previouslyCompleted}>
        <small>{previouslyCompleted ? 'Reward secured' : 'Clear reward'}</small>
        <strong>{previouslyCompleted ? '✓' : `+${activeChallenge.xpReward}`}</strong>
        <span>{previouslyCompleted ? 'practice mode' : 'XP'}</span>
      </div>
    </header>

    {#if sessionComplete}
      <section class="victory" data-testid="challenge-complete">
        <div class="victory-mark" class:practice={!sessionCleared} aria-hidden="true">
          {sessionCleared ? '✓' : '↺'}
        </div>
        <p class="eyebrow">{sessionCleared ? 'Trace verified' : 'Guided practice'}</p>
        <h3>{activeChallenge.title} {sessionCleared ? 'cleared' : 'practice complete'}</h3>
        <p role="status">{completionMessage}</p>
        <div class="victory-stats">
          <div>
            <strong>{activeChallenge.checkpoints.length}</strong><span>states resolved</span>
          </div>
          <div>
            <strong>{sessionCleared ? '100%' : 'Practice'}</strong><span
              >{sessionCleared ? 'boss progress' : 'no XP awarded'}</span
            >
          </div>
          <div><strong>{progress.xp}</strong><span>total XP</span></div>
        </div>
        <div class="victory-actions">
          {#if !sessionCleared}
            <button class="primary" onclick={resetSession} data-testid="replay-unassisted"
              >Replay without reveals →</button
            >
          {:else if nextUnbeatenChallenge}
            <button class="primary" onclick={() => selectChallenge(nextUnbeatenChallenge.id)}
              >Next unbeaten boss →</button
            >
          {:else}
            <a class="button primary" href="/progress">View mastery profile →</a>
          {/if}
          {#if sessionCleared}<button onclick={resetSession}>Replay this challenge</button>{/if}
          <a class="button" href={activeChallenge.lessonHref}>Open the full lesson</a>
        </div>
      </section>
    {:else}
      <div class="checkpoint-strip" aria-label="Challenge checkpoints">
        <span>Checkpoint {checkpointIndex + 1} of {activeChallenge.checkpoints.length}</span>
        <div class="checkpoint-dots" aria-hidden="true">
          {#each activeChallenge.checkpoints as item, index}
            <i
              class:current={index === checkpointIndex}
              class:done={solvedCheckpointIds.includes(item.id)}
            ></i>
          {/each}
        </div>
        <span>{solvedCheckpointIds.length}/{activeChallenge.checkpoints.length} resolved</span>
      </div>

      <div class="challenge-grid">
        <section class="workbench" aria-labelledby="workbench-title">
          <div class="workbench-heading">
            <div>
              <p class="eyebrow">Evidence board</p>
              <h3 id="workbench-title">{activeChallenge.artifact.title}</h3>
            </div>
            <span>deterministic</span>
          </div>
          <p class="scenario">{activeChallenge.scenario}</p>
          {#if activeChallenge.artifact.code}
            <pre aria-label="Scenario code"><code>{activeChallenge.artifact.code}</code></pre>
          {/if}
          <div class="table-scroll">
            <table>
              <caption>{activeChallenge.artifact.caption}</caption>
              <thead>
                <tr>
                  {#each activeChallenge.artifact.columns as column}<th scope="col">{column}</th
                    >{/each}
                </tr>
              </thead>
              <tbody>
                {#each activeChallenge.artifact.rows as row}
                  <tr>
                    {#each row as cell, cellIndex}
                      {#if cellIndex === 0}
                        <th scope="row">{cell}</th>
                      {:else}
                        <td class:emphasis={cell === 'mid' || cell === 'predict'}>{cell || '·'}</td>
                      {/if}
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <div class="state-notes" aria-label="Known state">
            {#each activeChallenge.artifact.notes as note}<code>{note}</code>{/each}
          </div>
        </section>

        <section class="prediction-card" aria-labelledby="checkpoint-title">
          <div class="prediction-kicker">
            <span>Predict before stepping</span><b>{checkpointIndex + 1}</b>
          </div>
          <h3 id="checkpoint-title">{checkpoint.prompt}</h3>
          <p class="checkpoint-detail">{checkpoint.detail}</p>

          <fieldset disabled={Boolean(result) || revealed}>
            <legend>Choose one answer</legend>
            {#each checkpoint.options as option, optionIndex}
              <label
                class="answer-option"
                class:selected={selectedAnswerId === option.id}
                class:correct-answer={(result?.correct || revealed) &&
                  option.id === checkpoint.correctOptionId}
              >
                <input
                  type="radio"
                  name={`answer-${activeChallenge.id}-${checkpoint.id}`}
                  value={option.id}
                  bind:group={selectedAnswerId}
                />
                <span class="option-letter" aria-hidden="true"
                  >{String.fromCharCode(65 + optionIndex)}</span
                >
                <span>{option.label}</span>
              </label>
            {/each}
          </fieldset>

          {#if result}
            <div
              class:correct={result.correct}
              class:incorrect={!result.correct}
              class="feedback"
              role={result.correct ? 'status' : 'alert'}
            >
              <strong>{result.correct ? 'State matched.' : 'State mismatch.'}</strong>
              <p>{result.feedback}</p>
            </div>
          {:else if revealed}
            <div class="feedback revealed" role="status">
              <strong>Answer revealed: {correctOption?.label}</strong>
              <p>{checkpoint.revealExplanation}</p>
            </div>
          {/if}

          <div class="prediction-actions">
            {#if result && !result.correct}
              <button class="primary" onclick={retryCheckpoint} data-testid="retry-answer"
                >Try again</button
              >
              <button onclick={revealAnswer} data-testid="reveal-answer">Reveal answer</button>
            {:else if result?.correct || revealed}
              <button
                class="primary"
                onclick={advanceCheckpoint}
                data-testid={checkpointIndex === activeChallenge.checkpoints.length - 1
                  ? 'complete-challenge'
                  : 'advance-checkpoint'}
                >{checkpointIndex === activeChallenge.checkpoints.length - 1
                  ? 'Complete challenge'
                  : 'Continue to next state →'}</button
              >
            {:else}
              <button
                class="primary"
                onclick={checkAnswer}
                disabled={!selectedAnswerId}
                data-testid="check-answer">Check prediction</button
              >
              <span>Select an answer to inspect the next state.</span>
            {/if}
          </div>
        </section>
      </div>

      <footer class="challenge-footer">
        <span>Need the full mental model?</span>
        <a href={activeChallenge.lessonHref}>Practice in {activeChallenge.subjectLabel} lesson →</a>
      </footer>
    {/if}
  </section>
</div>

<style>
  .hero {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: end;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }
  .hero h1 {
    max-width: 760px;
    font-size: clamp(2.7rem, 6vw, 5.2rem);
    margin-bottom: 1rem;
  }
  .hero-copy {
    color: var(--muted);
    font-size: 1.04rem;
    line-height: 1.7;
    max-width: 690px;
    margin: 0;
  }
  .arena-summary {
    padding: 1.15rem;
  }
  .summary-top,
  .summary-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
  .summary-top {
    color: var(--muted);
  }
  .summary-top strong {
    color: var(--text);
    font-size: 1.4rem;
  }
  .completion-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--border);
    margin: 0.8rem 0;
  }
  .completion-track span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--primary), var(--accent));
    transition: width 250ms ease;
  }
  .summary-stats {
    color: var(--muted);
    font-size: 0.75rem;
  }
  .summary-stats b {
    color: var(--text);
  }
  .arena-layout {
    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
    min-width: 0;
  }
  .challenge-map {
    position: sticky;
    top: 84px;
    min-width: 0;
  }
  .map-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.3rem 0.55rem;
  }
  .map-heading p {
    margin: 0;
  }
  .map-heading span {
    color: var(--muted);
    font-size: 0.75rem;
  }
  .challenge-map ol {
    display: grid;
    gap: 0.55rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .cyan {
    --challenge-accent: #2dd4bf;
  }
  .violet {
    --challenge-accent: #a78bfa;
  }
  .amber {
    --challenge-accent: #fbbf24;
  }
  .green {
    --challenge-accent: #4ade80;
  }
  .blue {
    --challenge-accent: #38bdf8;
  }
  .challenge-select {
    width: 100%;
    min-height: 76px;
    display: grid;
    grid-template-columns: 34px 1fr auto;
    align-items: center;
    gap: 0.7rem;
    text-align: left;
    padding: 0.7rem;
    background: rgba(14, 27, 45, 0.72);
    border-left: 3px solid transparent;
  }
  .challenge-select:hover,
  .challenge-select.active {
    border-color: var(--challenge-accent);
    background: rgba(20, 37, 59, 0.98);
  }
  .challenge-select.active {
    box-shadow: inset 4px 0 18px color-mix(in srgb, var(--challenge-accent) 13%, transparent);
  }
  .map-index {
    width: 30px;
    aspect-ratio: 1;
    border: 1px solid var(--border);
    border-radius: 9px;
    display: grid;
    place-items: center;
    color: var(--challenge-accent);
    font: 700 0.78rem var(--mono);
  }
  .map-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .map-copy small {
    color: var(--challenge-accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.62rem;
    font-weight: 800;
  }
  .map-copy strong {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .map-copy span,
  .map-status {
    color: var(--muted);
    font-size: 0.64rem;
  }
  .map-status.cleared {
    color: var(--success);
  }
  .persistence-note {
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.5;
    padding: 0 0.4rem;
  }
  .persistence-note span {
    color: var(--success);
    margin-right: 0.25rem;
  }
  .challenge-shell {
    --challenge-accent: var(--primary);
    overflow: hidden;
    min-width: 0;
  }
  .challenge-head {
    position: static;
    height: auto;
    min-height: auto;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.2rem;
    padding: 1.35rem 1.45rem;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(
      115deg,
      color-mix(in srgb, var(--challenge-accent) 9%, transparent),
      transparent 55%
    );
    backdrop-filter: none;
  }
  .challenge-head h2 {
    font-size: clamp(1.8rem, 4vw, 2.8rem);
    letter-spacing: -0.035em;
    margin: 0.45rem 0;
  }
  .challenge-head p {
    margin: 0;
    color: var(--muted);
    line-height: 1.55;
    max-width: 650px;
  }
  .challenge-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .challenge-meta span {
    padding: 0.22rem 0.48rem;
    border: 1px solid color-mix(in srgb, var(--challenge-accent) 35%, var(--border));
    border-radius: 999px;
    color: var(--challenge-accent);
    font-size: 0.67rem;
    font-weight: 700;
  }
  .reward {
    min-width: 88px;
    padding: 0.6rem;
    border: 1px solid color-mix(in srgb, var(--challenge-accent) 45%, var(--border));
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    background: color-mix(in srgb, var(--challenge-accent) 6%, var(--bg));
  }
  .reward small,
  .reward span {
    color: var(--muted);
    font-size: 0.6rem;
    white-space: nowrap;
  }
  .reward strong {
    color: var(--challenge-accent);
    font-size: 1.55rem;
  }
  .reward.secured strong {
    color: var(--success);
  }
  .checkpoint-strip {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.8rem;
    padding: 0.7rem 1.45rem;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.7rem;
  }
  .checkpoint-strip > span:last-child {
    text-align: right;
  }
  .checkpoint-dots {
    display: flex;
    gap: 0.35rem;
  }
  .checkpoint-dots i {
    width: 28px;
    height: 5px;
    border-radius: 999px;
    background: var(--border);
  }
  .checkpoint-dots i.current {
    background: var(--challenge-accent);
  }
  .checkpoint-dots i.done {
    background: var(--success);
  }
  .challenge-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
    min-height: 590px;
  }
  .workbench,
  .prediction-card {
    padding: 1.4rem;
    min-width: 0;
  }
  .workbench {
    border-right: 1px solid var(--border);
    background:
      linear-gradient(rgba(45, 212, 191, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(45, 212, 191, 0.025) 1px, transparent 1px), rgba(7, 17, 31, 0.44);
    background-size: 24px 24px;
  }
  .workbench-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }
  .workbench-heading p,
  .workbench-heading h3 {
    margin: 0 0 0.35rem;
  }
  .workbench-heading h3 {
    font-size: 1.25rem;
  }
  .workbench-heading > span {
    color: var(--success);
    border: 1px solid #4ade8040;
    background: #4ade800d;
    border-radius: 999px;
    padding: 0.28rem 0.5rem;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .scenario,
  .checkpoint-detail {
    color: var(--muted);
    line-height: 1.65;
  }
  pre {
    overflow: auto;
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #050c16;
    color: #c5f5ec;
    font: 0.75rem/1.65 var(--mono);
    white-space: pre-wrap;
  }
  .table-scroll {
    overflow-x: auto;
    margin-top: 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    min-width: 440px;
    font: 0.74rem var(--mono);
  }
  caption {
    text-align: left;
    padding: 0.7rem 0.8rem;
    color: var(--muted);
    background: rgba(20, 37, 59, 0.85);
    border-bottom: 1px solid var(--border);
    font:
      0.7rem/1.45 ui-sans-serif,
      system-ui,
      sans-serif;
  }
  th,
  td {
    padding: 0.65rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #273a5280;
    border-right: 1px solid #273a5280;
    white-space: nowrap;
  }
  thead th {
    color: var(--challenge-accent);
    background: color-mix(in srgb, var(--challenge-accent) 7%, var(--surface));
  }
  tbody th {
    color: var(--text);
    background: rgba(20, 37, 59, 0.55);
  }
  td {
    color: #cbd5e1;
  }
  td.emphasis {
    color: var(--challenge-accent);
    font-weight: 800;
    background: color-mix(in srgb, var(--challenge-accent) 8%, transparent);
  }
  tr:last-child th,
  tr:last-child td {
    border-bottom: 0;
  }
  th:last-child,
  td:last-child {
    border-right: 0;
  }
  .state-notes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: 1rem;
  }
  .state-notes code {
    color: var(--challenge-accent);
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--bg);
    font-size: 0.67rem;
  }
  .prediction-card {
    display: flex;
    flex-direction: column;
  }
  .prediction-kicker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--challenge-accent);
    text-transform: uppercase;
    letter-spacing: 0.11em;
    font-size: 0.67rem;
    font-weight: 800;
  }
  .prediction-kicker b {
    width: 28px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: color-mix(in srgb, var(--challenge-accent) 15%, transparent);
  }
  .prediction-card h3 {
    font-size: clamp(1.45rem, 3vw, 2rem);
    line-height: 1.16;
    margin: 1rem 0 0.35rem;
  }
  fieldset {
    border: 0;
    margin: 0.7rem 0 0;
    padding: 0;
    display: grid;
    gap: 0.55rem;
  }
  fieldset:disabled {
    opacity: 1;
  }
  legend {
    width: 100%;
    color: var(--muted);
    font-size: 0.7rem;
    margin-bottom: 0.55rem;
  }
  .answer-option {
    display: grid;
    grid-template-columns: 32px 1fr;
    align-items: center;
    gap: 0.65rem;
    min-height: 54px;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: rgba(7, 17, 31, 0.5);
    cursor: pointer;
    transition:
      border-color 140ms ease,
      transform 140ms ease;
  }
  .answer-option:hover {
    border-color: var(--challenge-accent);
    transform: translateX(2px);
  }
  .answer-option.selected {
    border-color: var(--challenge-accent);
    background: color-mix(in srgb, var(--challenge-accent) 8%, var(--bg));
  }
  .answer-option.correct-answer {
    border-color: var(--success);
    background: #4ade800d;
  }
  .answer-option input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
  }
  .answer-option:focus-within {
    outline: 3px solid var(--accent);
    outline-offset: 2px;
  }
  .option-letter {
    width: 30px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--muted);
    font: 700 0.72rem var(--mono);
  }
  .selected .option-letter {
    color: var(--challenge-accent);
    border-color: var(--challenge-accent);
  }
  .correct-answer .option-letter {
    color: var(--success);
    border-color: var(--success);
  }
  .feedback {
    margin-top: 0.8rem;
    padding: 0.75rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 11px;
  }
  .feedback strong {
    font-size: 0.78rem;
  }
  .feedback p {
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.5;
    margin: 0.25rem 0 0;
  }
  .feedback.correct {
    border-color: #4ade8055;
    background: #4ade800b;
  }
  .feedback.correct strong,
  .feedback.revealed strong {
    color: var(--success);
  }
  .feedback.incorrect {
    border-color: #fb718555;
    background: #fb71850b;
  }
  .feedback.incorrect strong {
    color: var(--danger);
  }
  .feedback.revealed {
    border-color: #fbbf2455;
    background: #fbbf240b;
  }
  .prediction-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.55rem;
    margin-top: auto;
    padding-top: 1rem;
  }
  .prediction-actions span {
    color: var(--muted);
    font-size: 0.67rem;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .challenge-footer {
    min-height: auto;
    position: static;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1.4rem;
    border-top: 1px solid var(--border);
    background: rgba(7, 17, 31, 0.45);
    color: var(--muted);
    text-align: left;
    font-size: 0.75rem;
  }
  .challenge-footer a {
    color: var(--challenge-accent);
    font-weight: 700;
  }
  .victory {
    min-height: 590px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    padding: 2rem;
    background:
      radial-gradient(
        circle at 50% 35%,
        color-mix(in srgb, var(--challenge-accent) 16%, transparent),
        transparent 34%
      ),
      rgba(7, 17, 31, 0.35);
  }
  .victory-mark {
    width: 76px;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border: 1px solid var(--success);
    border-radius: 50%;
    color: var(--success);
    background: #4ade8010;
    box-shadow: 0 0 45px #4ade8025;
    font-size: 2rem;
  }
  .victory-mark.practice {
    color: var(--warning);
    border-color: #fbbf2466;
    background: #fbbf2412;
  }
  .victory .eyebrow {
    margin: 1.2rem 0 0;
  }
  .victory h3 {
    font-size: clamp(2rem, 4vw, 3.5rem);
    letter-spacing: -0.04em;
    margin: 0.35rem 0;
  }
  .victory > p:not(.eyebrow) {
    color: var(--muted);
  }
  .victory-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    width: min(540px, 100%);
    margin: 1rem 0;
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }
  .victory-stats div {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.9rem;
    background: rgba(14, 27, 45, 0.7);
    border-right: 1px solid var(--border);
  }
  .victory-stats div:last-child {
    border: 0;
  }
  .victory-stats strong {
    color: var(--challenge-accent);
    font-size: 1.25rem;
  }
  .victory-stats span {
    color: var(--muted);
    font-size: 0.66rem;
  }
  .victory-actions {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  @media (max-width: 980px) {
    .hero {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    .arena-summary {
      width: 100%;
    }
    .arena-layout {
      grid-template-columns: 1fr;
    }
    .challenge-map {
      position: static;
    }
    .challenge-map ol {
      grid-template-columns: repeat(5, 180px);
      overflow-x: auto;
      max-width: 100%;
      padding-bottom: 0.4rem;
    }
    .challenge-select {
      min-width: 0;
      grid-template-columns: 32px 1fr;
    }
    .map-status {
      display: none;
    }
    .persistence-note {
      margin-bottom: 0;
    }
    .challenge-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .workbench {
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .prediction-card {
      min-height: 520px;
    }
  }
  @media (max-width: 620px) {
    .hero h1 {
      font-size: clamp(2.5rem, 14vw, 4rem);
    }
    .challenge-head {
      padding: 1rem;
    }
    .challenge-head h2 {
      font-size: 1.75rem;
    }
    .reward {
      min-width: 76px;
    }
    .checkpoint-strip {
      grid-template-columns: 1fr auto;
      padding: 0.65rem 1rem;
    }
    .checkpoint-strip > span:last-child {
      display: none;
    }
    .workbench,
    .prediction-card {
      padding: 1rem;
    }
    .challenge-footer {
      align-items: flex-start;
      flex-direction: column;
      gap: 0.3rem;
      padding: 0.8rem 1rem;
    }
    .victory {
      min-height: 540px;
      padding: 1rem;
    }
    .victory-stats {
      grid-template-columns: 1fr;
    }
    .victory-stats div {
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .victory-actions {
      width: 100%;
    }
    .victory-actions > :global(*) {
      width: 100%;
      text-align: center;
    }
  }
</style>
