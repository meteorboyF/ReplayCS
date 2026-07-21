<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import RecursionVisualizer from '$lib/components/visualizers/RecursionVisualizer.svelte';
  import {
    RECURSION_SCENARIOS,
    createRecursionLesson,
    type RecursionScenario
  } from '$lib/engines/dsa/recursion';

  const completionKeys = RECURSION_SCENARIOS.map((item) => item.id);
  let scenario = $state<RecursionScenario>('linear');
  let input = $state(5);
  let inputError = $state('');
  let lesson = $state(createRecursionLesson('linear', 5));
  let metadata = $derived(
    RECURSION_SCENARIOS.find((item) => item.id === scenario) ?? RECURSION_SCENARIOS[0]
  );
  let limit = $derived(scenario === 'binary' ? 5 : scenario === 'divide-conquer' ? 8 : 12);
  function rebuild() {
    try {
      lesson = createRecursionLesson(scenario, input);
      inputError = '';
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }
  function choose(next: RecursionScenario, n: number) {
    scenario = next;
    input = n;
    rebuild();
  }
</script>

<svelte:head>
  <title>Recursion Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Trace recursive calls, base cases, unwinding, recurrences, tree width, and auxiliary stack space."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="recursion-lab"
  completionXp={40}
  completionKey={scenario}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Call stack execution laboratory"
  title="Recursion Lab"
  operationTitle={metadata.label}
  operationSummary={`${metadata.description} ${metadata.recurrence}`}
  tabWidth="wide"
>
  {#snippet controls()}
    <form
      class="cfg"
      novalidate
      onsubmit={(event) => {
        event.preventDefault();
        rebuild();
      }}
    >
      <label
        >Scenario<select
          aria-label="Scenario"
          bind:value={scenario}
          onchange={() => {
            if (input > limit) input = limit;
            rebuild();
          }}
          >{#each RECURSION_SCENARIOS as item}<option value={item.id}>{item.label}</option
            >{/each}</select
        ></label
      >
      <label
        >Input n<input
          aria-label="Input n"
          type="number"
          min="1"
          max={limit}
          bind:value={input}
        /></label
      >
      <button class="primary" type="submit">Build trace</button>
      <span class="limit">Bound: 1–{limit}</span>
    </form>
    <div class="presets" aria-label="Recursion presets">
      <span>Presets</span>
      <button type="button" onclick={() => choose('linear', 5)}>Linear</button>
      <button type="button" onclick={() => choose('halving', 8)}>Halving</button>
      <button type="button" onclick={() => choose('binary', 4)}>Binary tree</button>
      <button type="button" onclick={() => choose('divide-conquer', 8)}>Divide & conquer</button>
      <button type="button" onclick={() => choose('iterative', 5)}>Iterative comparison</button>
    </div>
    {#if inputError}<p class="error" role="alert">{inputError}</p>{/if}
  {/snippet}
  {#snippet visual({ state })}<RecursionVisualizer {state} />{/snippet}
  {#snippet about()}
    <p>
      Every displayed recurrence is backed by the call and return events in this trace. Language
      switching preserves the active semantic event, stack, counters, and recurrence.
    </p>
  {/snippet}
</LessonWorkspace>

<style>
  .cfg {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) 8rem auto auto;
    gap: 0.7rem;
    align-items: end;
    width: 100%;
  }
  label {
    display: grid;
    gap: 0.3rem;
    color: var(--muted);
    font-size: 0.7rem;
  }
  input,
  select {
    width: 100%;
  }
  .limit {
    align-self: center;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .presets {
    display: flex;
    gap: 0.45rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.7rem;
  }
  .presets span {
    color: var(--muted);
    font-size: 0.72rem;
  }
  .presets button {
    padding: 0.45rem 0.65rem;
    font-size: 0.7rem;
  }
  .error {
    color: var(--danger);
    margin: 0.55rem 0 0;
  }
  @media (max-width: 680px) {
    .cfg {
      grid-template-columns: 1fr 1fr;
    }
  }
  @media (max-width: 440px) {
    .cfg {
      grid-template-columns: 1fr;
    }
  }
</style>
