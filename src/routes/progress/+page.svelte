<script lang="ts">
  import { onMount } from 'svelte';
  import { loadProgress, type Progress } from '$lib/progress/store';
  let progress = $state<Progress>({
    version: 1,
    xp: 0,
    streak: 0,
    completed: [],
    awardedPredictions: []
  });
  onMount(() => (progress = loadProgress()));
  function reset() {
    if (confirm('Reset all ReplayCS progress?')) {
      localStorage.removeItem('replaycs-progress');
      progress = loadProgress();
    }
  }
</script>

<p class="eyebrow">Learner profile</p>
<h1>Your progress</h1>
<div class="cards">
  <div class="panel card"><b>{progress.xp}</b><span>XP earned</span></div>
  <div class="panel card"><b>{progress.streak}</b><span>prediction streak</span></div>
  <div class="panel card"><b>{progress.completed.length}</b><span>lessons complete</span></div>
</div>
{#if progress.badge}<section class="panel badge">
    <span>🏅</span>
    <div>
      <p class="eyebrow">Badge unlocked</p>
      <h2>{progress.badge}</h2>
    </div>
  </section>{/if}<button class="danger" onclick={reset}>Reset progress</button>

<style>
  h1 {
    font-size: 4rem;
  }
  .card {
    display: flex;
    flex-direction: column;
  }
  .card b {
    font-size: 2.5rem;
    color: var(--primary);
  }
  .card span {
    color: var(--muted);
  }
  .badge {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 1rem;
    margin: 2rem 0;
  }
  .badge > span {
    font-size: 3rem;
  }
  .badge h2 {
    margin: 0;
  }
  .danger {
    margin-top: 2rem;
    color: var(--danger);
  }
</style>
