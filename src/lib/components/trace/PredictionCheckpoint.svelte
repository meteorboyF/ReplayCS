<script lang="ts">
  import { untrack } from 'svelte';
  import type { PredictionChallenge, TraceValue } from '$lib/trace/types';

  type PredictionOption = NonNullable<PredictionChallenge['options']>[number];

  const DEFAULT_BOOLEAN_OPTIONS: PredictionOption[] = [
    { id: 'true', label: 'True', value: true },
    { id: 'false', label: 'False', value: false }
  ];

  let {
    challenge,
    submitted = false,
    onsubmit
  }: {
    challenge: PredictionChallenge;
    submitted?: boolean;
    onsubmit: (correct: boolean, answer: string) => void;
  } = $props();

  let activeChallengeId = $state(untrack(() => challenge.id));
  let answer = $state('');
  let selectedOptionId = $state('');
  let orderedOptionIds = $state(untrack(() => challenge.options?.map((option) => option.id) ?? []));
  let correct = $state<boolean | null>(null);

  const choiceOptions = $derived.by(() => {
    if (challenge.type === 'boolean') {
      return challenge.options?.length ? challenge.options : DEFAULT_BOOLEAN_OPTIONS;
    }
    if (challenge.type === 'multiple-choice' || challenge.type === 'select-entity') {
      return challenge.options ?? [];
    }
    return [];
  });
  const usesChoiceControl = $derived(choiceOptions.length > 0);
  const usesReorderControl = $derived(
    challenge.type === 'reorder' && Boolean(challenge.options?.length)
  );
  const canSubmit = $derived(
    usesChoiceControl
      ? selectedOptionId.length > 0
      : usesReorderControl
        ? orderedOptionIds.length > 0
        : answer.trim().length > 0
  );
  const promptId = $derived(`prediction-prompt-${safeId(challenge.id)}`);
  const feedbackId = $derived(`prediction-feedback-${safeId(challenge.id)}`);

  $effect(() => {
    if (challenge.id === activeChallengeId) return;
    activeChallengeId = challenge.id;
    answer = '';
    selectedOptionId = '';
    orderedOptionIds = challenge.options?.map((option) => option.id) ?? [];
    correct = null;
  });

  function safeId(value: string) {
    return value.replace(/[^A-Za-z0-9_-]/g, '-');
  }

  function valuesAreEqual(left: TraceValue, right: TraceValue): boolean {
    if (Object.is(left, right)) return true;
    if (Array.isArray(left) || Array.isArray(right)) {
      return (
        Array.isArray(left) &&
        Array.isArray(right) &&
        left.length === right.length &&
        left.every((value, index) => valuesAreEqual(value, right[index]))
      );
    }
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
      return false;
    }
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] &&
          Object.prototype.hasOwnProperty.call(right, key) &&
          valuesAreEqual(left[key], right[key])
      )
    );
  }

  function selectedOption() {
    return choiceOptions.find((option) => option.id === selectedOptionId);
  }

  function orderedValues() {
    const options = challenge.options ?? [];
    return orderedOptionIds
      .map((id) => options.find((option) => option.id === id)?.value)
      .filter((value): value is TraceValue => value !== undefined);
  }

  function parseBoolean(value: TraceValue): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return undefined;
  }

  function answerIsCorrect() {
    if (usesChoiceControl) {
      const provided = selectedOption()?.value;
      if (provided === undefined) return false;
      if (challenge.type === 'boolean') {
        const expectedBoolean = parseBoolean(challenge.correctAnswer);
        const providedBoolean = parseBoolean(provided);
        if (expectedBoolean !== undefined && providedBoolean !== undefined) {
          return providedBoolean === expectedBoolean;
        }
      }
      return valuesAreEqual(provided, challenge.correctAnswer);
    }

    if (usesReorderControl) {
      return valuesAreEqual(orderedValues(), challenge.correctAnswer);
    }

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

  function serializedAnswer() {
    if (usesChoiceControl) {
      const value = selectedOption()?.value;
      return typeof value === 'string' ? value : JSON.stringify(value);
    }
    if (usesReorderControl) return JSON.stringify(orderedValues());
    return answer.trim();
  }

  function submit() {
    if (submitted || !canSubmit) return;
    correct = answerIsCorrect();
    onsubmit(correct, serializedAnswer());
  }

  function moveOption(id: string, direction: -1 | 1) {
    if (submitted) return;
    const currentIndex = orderedOptionIds.indexOf(id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedOptionIds.length) return;
    const nextOrder = [...orderedOptionIds];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [
      nextOrder[nextIndex],
      nextOrder[currentIndex]
    ];
    orderedOptionIds = nextOrder;
  }
</script>

<div class="prediction">
  <span class="eyebrow">Prediction checkpoint · {challenge.xpReward} XP</span>
  <h3 id={promptId}>{challenge.prompt}</h3>
  <form
    class="answer"
    aria-labelledby={promptId}
    onsubmit={(event) => {
      event.preventDefault();
      submit();
    }}
  >
    {#if usesChoiceControl}
      <fieldset class="choices" aria-describedby={correct === null ? undefined : feedbackId}>
        <legend>
          {challenge.type === 'select-entity'
            ? 'Select one entity'
            : challenge.type === 'boolean'
              ? 'Choose True or False'
              : 'Choose one answer'}
        </legend>
        {#each choiceOptions as option (option.id)}
          <label class:selected={selectedOptionId === option.id}>
            <input
              type="radio"
              name={`prediction-${safeId(challenge.id)}`}
              value={option.id}
              bind:group={selectedOptionId}
              disabled={submitted}
            />
            <span>{option.label}</span>
          </label>
        {/each}
      </fieldset>
    {:else if usesReorderControl}
      <fieldset class="reorder" aria-describedby={correct === null ? undefined : feedbackId}>
        <legend>Arrange the choices in the predicted order</legend>
        <ol aria-live="polite">
          {#each orderedOptionIds as optionId, index (optionId)}
            {@const option = challenge.options?.find((candidate) => candidate.id === optionId)}
            {#if option}
              <li>
                <span><b>{index + 1}.</b> {option.label}</span>
                <span class="reorder-actions">
                  <button
                    type="button"
                    class="move"
                    aria-label={`Move ${option.label} up`}
                    onclick={() => moveOption(option.id, -1)}
                    disabled={submitted || index === 0}>↑</button
                  >
                  <button
                    type="button"
                    class="move"
                    aria-label={`Move ${option.label} down`}
                    onclick={() => moveOption(option.id, 1)}
                    disabled={submitted || index === orderedOptionIds.length - 1}>↓</button
                  >
                </span>
              </li>
            {/if}
          {/each}
        </ol>
      </fieldset>
    {:else}
      <input
        aria-label="Your prediction"
        aria-describedby={correct === null ? undefined : feedbackId}
        bind:value={answer}
        disabled={submitted}
        inputmode={challenge.type === 'numeric' ? 'numeric' : 'text'}
        placeholder="Type your answer"
      />
    {/if}
    <button class="primary" type="submit" disabled={submitted || !canSubmit}>Lock prediction</button
    >
  </form>
  {#if correct !== null}
    <p id={feedbackId} class:good={correct} role="status" aria-live="polite">
      {correct ? 'Correct — nice trace.' : `Not quite. ${challenge.explanation}`}
    </p>
  {/if}
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
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .answer > input {
    min-width: 0;
    flex: 1;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 9px;
    color: var(--text);
    padding: 0.7rem;
  }
  .choices,
  .reorder {
    width: 100%;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .choices legend,
  .reorder legend {
    margin-bottom: 0.45rem;
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 700;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 0.5rem;
  }
  .choices legend {
    grid-column: 1 / -1;
  }
  .choices label {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
    cursor: pointer;
  }
  .choices label:hover,
  .choices label:focus-within,
  .choices label.selected {
    border-color: var(--accent);
  }
  .choices label.selected {
    background: #38bdf81a;
  }
  .choices input {
    accent-color: var(--accent);
  }
  .reorder ol {
    display: grid;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .reorder li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: var(--bg);
  }
  .reorder-actions {
    display: flex;
    gap: 0.3rem;
  }
  .move {
    min-width: 2rem;
    padding: 0.25rem 0.45rem;
  }
  .prediction p {
    color: var(--warning);
  }
  .prediction p.good {
    color: var(--success);
  }
</style>
