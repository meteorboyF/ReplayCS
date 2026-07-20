<script lang="ts">
  import type { PredictionChallenge } from '$lib/trace/types';
  let {
    challenge,
    submitted = false,
    onsubmit
  }: {
    challenge: PredictionChallenge;
    submitted?: boolean;
    onsubmit: (correct: boolean, answer: string) => void;
  } = $props();
  let answer = $state('');
  let correct = $state<boolean | null>(null);
  function answerIsCorrect() {
    const expected = String(challenge.correctAnswer).trim();
    const provided = answer.trim();
    if (challenge.type === 'numeric') {
      const expectedNumber = Number(expected);
      const providedNumber = Number(provided);
      return (
        Number.isFinite(expectedNumber) &&
        Number.isFinite(providedNumber) &&
        providedNumber === expectedNumber
      );
    }
    if (challenge.type === 'boolean') {
      return provided.toLowerCase() === expected.toLowerCase();
    }
    return provided === expected;
  }
  function submit() {
    correct = answerIsCorrect();
    onsubmit(correct, answer.trim());
  }
</script>

<div class="prediction">
  <span class="eyebrow">Prediction checkpoint · {challenge.xpReward} XP</span>
  <h3>{challenge.prompt}</h3>
  <div class="answer">
    <input
      aria-label="Your prediction"
      bind:value={answer}
      disabled={submitted}
      inputmode={challenge.type === 'numeric' ? 'numeric' : 'text'}
      placeholder="Type your answer"
    /><button class="primary" onclick={submit} disabled={submitted || !answer}
      >Lock prediction</button
    >
  </div>
  {#if correct !== null}<p class:good={correct} role="status" aria-live="polite">
      {correct ? 'Correct — nice trace.' : `Not quite. ${challenge.explanation}`}
    </p>{/if}
</div>

<style>
  .prediction {
    padding: 1rem;
    border: 1px solid #fbbf2455;
    background: #fbbf240d;
    border-radius: 14px;
  }
  .prediction h3 {
    margin: 0.5rem 0;
  }
  .answer {
    display: flex;
    gap: 0.5rem;
  }
  .answer input {
    min-width: 0;
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text);
    padding: 0.7rem;
  }
  .prediction p {
    color: var(--warning);
  }
  .prediction p.good {
    color: var(--success);
  }
</style>
