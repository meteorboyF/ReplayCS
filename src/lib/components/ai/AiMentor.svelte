<script lang="ts">
  import type { AiStepExplanation, StepContext } from '$lib/server/openai/schemas';

  let { context }: { context: StepContext } = $props();
  let level = $state<StepContext['explanationLevel']>('standard');
  let language = $state<StepContext['explanationLanguage']>('en');
  let preferencesInitialized = $state(false);
  let question = $state('');
  let loading = $state(false);
  let error = $state('');
  let explanation = $state<AiStepExplanation | null>(null);
  let source = $state<'ai' | 'fallback' | null>(null);
  let statusMessage = $state('');
  let lastInteraction = $state<StepContext['interaction']>('explain');

  $effect(() => {
    if (!preferencesInitialized) {
      level = context.explanationLevel;
      language = context.explanationLanguage;
      preferencesInitialized = true;
    }
  });

  async function request(interaction: StepContext['interaction']) {
    lastInteraction = interaction;
    loading = true;
    error = '';
    statusMessage = '';
    try {
      const response = await fetch('/api/ai/explain-step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...context,
          interaction,
          explanationLevel: level,
          explanationLanguage: language,
          learnerQuestion: question || undefined
        })
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 429)
          throw new Error('The mentor is busy. Try again in one minute.');
        throw new Error(body.error ?? 'The mentor could not answer right now.');
      }
      explanation = body.explanation;
      source = body.source;
      statusMessage =
        body.reason === 'not-configured'
          ? 'AI is not configured, so ReplayCS used its deterministic explanation.'
          : body.reason === 'invalid-output'
            ? 'The AI response did not match the grounded schema. Showing the deterministic fallback.'
            : body.reason === 'upstream-error'
              ? 'The AI request failed safely. Showing the deterministic fallback.'
              : 'Grounded by GPT-5.6 using this exact trace step.';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'The mentor could not answer right now.';
    } finally {
      loading = false;
    }
  }
</script>

<section class="mentor" aria-labelledby="mentor-title">
  <div class="mentor-head">
    <div>
      <span class="eyebrow">✦ Grounded mentor</span>
      <h3 id="mentor-title">Ask about this exact step</h3>
    </div>
    {#if source}<span class:ai={source === 'ai'} class="source"
        >{source === 'ai' ? 'GPT-5.6' : 'Deterministic'}</span
      >{/if}
  </div>

  <div class="settings">
    <label
      >Depth<select bind:value={level}
        ><option value="beginner">Beginner</option><option value="standard">Standard</option><option
          value="exam-ready">Exam-ready</option
        ><option value="technical">Technical</option></select
      ></label
    >
    <label
      >Explanation language<select bind:value={language}
        ><option value="en">English</option><option value="bn">বাংলা</option></select
      ></label
    >
  </div>

  <label class="question"
    >Scoped question<input
      bind:value={question}
      maxlength="300"
      placeholder="Why was this half discarded?"
    /></label
  >
  <div class="actions">
    <button onclick={() => request('explain')} disabled={loading}>Explain this step</button>
    <button onclick={() => request('why')} disabled={loading}>Why now?</button>
    <button onclick={() => request('hint')} disabled={loading}>Give me a hint</button>
    <button onclick={() => request('simplify')} disabled={loading}>Simplify</button>
    {#if context.misconceptionTags.length && context.currentPrediction?.learnerAnswer}
      <button onclick={() => request('mistake')} disabled={loading}>Explain my mistake</button>
    {/if}
  </div>

  {#if loading}<div class="loading" role="status"><span></span>Tracing the explanation…</div>{/if}
  {#if error}<div class="error" role="alert">
      <p>{error}</p>
      <button onclick={() => request(lastInteraction)}>Retry</button>
    </div>{/if}
  {#if explanation}
    <article class="response" aria-live="polite">
      <p class="status">{statusMessage}</p>
      <h4>{explanation.summary}</h4>
      <dl>
        <dt>Why this operation?</dt>
        <dd>{explanation.whyNow}</dd>
        <dt>What changed?</dt>
        <dd>{explanation.stateChange}</dd>
      </dl>
      {#if explanation.unchangedState.length}
        <div class="unchanged">
          <strong>What stayed the same?</strong>
          <ul>
            {#each explanation.unchangedState as item}<li>{item}</li>{/each}
          </ul>
        </div>
      {/if}
      {#if explanation.analogy}<p class="analogy">
          <strong>Analogy:</strong>
          {explanation.analogy}
        </p>{/if}
      {#if explanation.commonMistake}<p class="mistake">
          <strong>Watch out:</strong>
          {explanation.commonMistake}
        </p>{/if}
      {#if explanation.recoveryChallenge}<p class="recovery">
          <strong>Recovery challenge:</strong>
          {explanation.recoveryChallenge}
        </p>{/if}
      <p class="check"><strong>Check yourself:</strong> {explanation.checkQuestion.prompt}</p>
      <small>{explanation.groundingNote}</small>
    </article>
  {/if}
</section>

<style>
  .mentor {
    border-top: 1px solid var(--border);
    padding-top: 1rem;
    margin-top: 1rem;
  }
  .mentor-head {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: start;
  }
  h3 {
    margin: 0.3rem 0 0.8rem;
    font-size: 1rem;
  }
  .source {
    font-size: 0.65rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 0.25rem 0.45rem;
    color: var(--muted);
  }
  .source.ai {
    color: var(--secondary);
    border-color: var(--secondary);
  }
  .settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  label {
    display: grid;
    gap: 0.25rem;
    color: var(--muted);
    font-size: 0.7rem;
  }
  select,
  input {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    padding: 0.55rem;
  }
  .question {
    margin-top: 0.6rem;
  }
  .actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
  }
  .actions button {
    font-size: 0.72rem;
    padding: 0.5rem 0.6rem;
  }
  .loading,
  .error {
    margin-top: 0.8rem;
    padding: 0.7rem;
    border-radius: 9px;
    background: #38bdf810;
    font-size: 0.8rem;
  }
  .loading span {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    margin-right: 0.4rem;
    animation: pulse 1s infinite alternate;
  }
  .error {
    color: var(--danger);
    background: #fb718510;
  }
  .error p {
    margin: 0 0 0.5rem;
  }
  .response {
    margin-top: 0.8rem;
    border: 1px solid #8b5cf655;
    border-radius: 12px;
    padding: 0.85rem;
    background: #8b5cf60b;
  }
  .response h4 {
    margin: 0.5rem 0;
    line-height: 1.45;
  }
  .response dl {
    margin: 0.8rem 0;
  }
  .response dt {
    color: var(--secondary);
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
  }
  .response dd {
    margin: 0.25rem 0 0.65rem;
    line-height: 1.5;
    font-size: 0.84rem;
  }
  .status,
  .response small {
    color: var(--muted);
    font-size: 0.7rem;
  }
  .mistake,
  .check,
  .analogy,
  .recovery,
  .unchanged {
    font-size: 0.8rem;
    padding: 0.55rem;
    border-radius: 8px;
    background: #fbbf2410;
  }
  .unchanged strong {
    color: var(--secondary);
  }
  .unchanged ul {
    margin: 0.35rem 0 0;
    padding-left: 1.1rem;
  }
  .recovery {
    border-left: 3px solid var(--success);
    background: #4ade800d;
  }
  @keyframes pulse {
    to {
      opacity: 0.25;
      transform: scale(0.7);
    }
  }
</style>
