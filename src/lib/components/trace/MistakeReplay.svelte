<script lang="ts">
  import type { MisconceptionTag } from '$lib/progress/misconceptions';
  import type { TraceValue } from '$lib/trace/types';

  export interface MistakeAttempt {
    evidenceId: string;
    stepId: string;
    prompt: string;
    predicted: string;
    actual: string;
    explanation: string;
    tag: MisconceptionTag;
    variableLabel?: string;
    stateKey?: string;
    recoveryPrompt?: string;
    recoveryError?: string;
    transitionBefore?: string;
    transitionAfter?: string;
    transitionLabel?: string;
  }

  let {
    attempt,
    stateBefore,
    stateAfter,
    onrecover
  }: {
    attempt: MistakeAttempt;
    stateBefore: Record<string, TraceValue>;
    stateAfter: Record<string, TraceValue>;
    onrecover: () => void;
  } = $props();
  let replayed = $state(false);
  let recoveryAnswer = $state('');
  let recovered = $state(false);
  let recoveryError = $state('');

  function checkRecovery() {
    if (recoveryAnswer.trim() === attempt.actual) {
      recovered = true;
      recoveryError = '';
      onrecover();
    } else
      recoveryError =
        attempt.recoveryError ?? 'Replay the highlighted transition once more before retrying.';
  }

  let variableLabel = $derived(attempt.variableLabel ?? 'mid');
  let stateKey = $derived(attempt.stateKey ?? 'mid');
</script>

<section class="replay" aria-labelledby="replay-title">
  <div class="title-row">
    <span class="replay-mark">↺</span>
    <div>
      <span class="eyebrow">Replay My Mistake</span>
      <h3 id="replay-title">Find the first divergence</h3>
    </div>
  </div>
  <p>{attempt.prompt}</p>
  <div class="compare">
    <div class="predicted">
      <small>Your predicted state</small><strong>{variableLabel} = {attempt.predicted}</strong><span
        >Different here</span
      >
    </div>
    <div class="actual">
      <small>Actual trace state</small><strong>{variableLabel} = {attempt.actual}</strong><span
        >Deterministic result</span
      >
    </div>
  </div>
  <div class="divergence">
    <strong>First divergence · {attempt.tag}</strong>
    <p>{attempt.explanation}</p>
  </div>
  <button onclick={() => (replayed = !replayed)}
    >{replayed ? 'Hide transition' : 'Replay correct transition'}</button
  >
  {#if replayed}<div class="transition" aria-live="polite">
      <code
        >before: {attempt.transitionLabel ?? variableLabel} = {attempt.transitionBefore ??
          String(stateBefore[stateKey])}</code
      ><span>→ execute highlighted line →</span><code
        >after: {attempt.transitionLabel ?? variableLabel} = {attempt.transitionAfter ??
          String(stateAfter[stateKey])}</code
      >
    </div>{/if}
  <div class="recovery">
    <label for="recovery-answer"
      >{attempt.recoveryPrompt ??
        'Recovery challenge: enter the correct state after this line.'}</label
    >
    <div>
      <input
        id="recovery-answer"
        bind:value={recoveryAnswer}
        disabled={recovered}
        inputmode={/^-?\d+$/.test(attempt.actual) ? 'numeric' : 'text'}
      /><button class="primary" onclick={checkRecovery} disabled={recovered || !recoveryAnswer}
        >Check recovery</button
      >
    </div>
    {#if recovered}<p class="success" role="status">
        Recovered · +6 XP. You corrected the state transition.
      </p>{/if}
    {#if recoveryError}<p class="error" role="alert">{recoveryError}</p>{/if}
  </div>
</section>

<style>
  .replay {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid #fb718566;
    border-radius: 14px;
    background: #fb718509;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }
  .replay-mark {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #fb71851a;
    color: var(--danger);
    font-size: 1.2rem;
  }
  h3 {
    margin: 0.2rem 0;
    font-size: 1rem;
  }
  .compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem;
  }
  .compare > div {
    display: grid;
    gap: 0.35rem;
    padding: 0.7rem;
    border-radius: 10px;
    border: 1px solid var(--border);
  }
  .compare small,
  .compare span {
    color: var(--muted);
    font-size: 0.65rem;
  }
  .predicted {
    border-color: var(--danger) !important;
  }
  .predicted strong {
    color: var(--danger);
  }
  .actual {
    border-color: var(--success) !important;
  }
  .actual strong {
    color: var(--success);
  }
  .divergence {
    margin: 0.7rem 0;
    font-size: 0.78rem;
  }
  .divergence strong {
    color: var(--warning);
  }
  .divergence p {
    margin: 0.3rem 0;
    color: var(--muted);
  }
  .transition {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 0.4rem;
    align-items: center;
    margin: 0.6rem 0;
    font-size: 0.68rem;
  }
  .transition code {
    padding: 0.5rem;
    background: var(--bg);
    border-radius: 7px;
  }
  .transition span {
    color: var(--primary);
  }
  .recovery {
    margin-top: 0.8rem;
    padding-top: 0.8rem;
    border-top: 1px solid var(--border);
  }
  .recovery label {
    display: block;
    font-size: 0.76rem;
    margin-bottom: 0.4rem;
  }
  .recovery > div {
    display: flex;
    gap: 0.4rem;
  }
  input {
    min-width: 0;
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    padding: 0.55rem;
  }
  .success {
    color: var(--success);
    font-size: 0.75rem;
  }
  .error {
    color: var(--danger);
    font-size: 0.75rem;
  }
  @media (max-width: 480px) {
    .compare {
      grid-template-columns: 1fr;
    }
    .transition {
      grid-template-columns: 1fr;
    }
  }
</style>
