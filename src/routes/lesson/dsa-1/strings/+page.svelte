<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import StringVisualizer from '$lib/components/visualizers/StringVisualizer.svelte';
  import {
    DEFAULT_STRING_CONFIG,
    STRING_OPERATIONS,
    createStringLesson,
    type StringOperation
  } from '$lib/engines/dsa/strings';

  const completionKeys = STRING_OPERATIONS.map((item) => item.id);
  let operation = $state<StringOperation>('search');
  let source = $state(DEFAULT_STRING_CONFIG.source);
  let secondary = $state(DEFAULT_STRING_CONFIG.secondary ?? '');
  let index = $state(DEFAULT_STRING_CONFIG.index ?? 0);
  let inputError = $state('');
  let lesson = $state(createStringLesson(DEFAULT_STRING_CONFIG));
  let metadata = $derived(
    STRING_OPERATIONS.find((item) => item.id === operation) ?? STRING_OPERATIONS[0]
  );
  let needsSecondary = $derived(
    ['compare', 'search', 'concatenate', 'substring'].includes(operation)
  );
  let secondaryLabel = $derived(
    operation === 'search'
      ? 'Target character'
      : operation === 'substring'
        ? 'Length'
        : 'Second string'
  );
  let needsIndex = $derived(['access', 'substring'].includes(operation));

  function rebuild() {
    try {
      lesson = createStringLesson({ operation, source, secondary, index });
      inputError = '';
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }
  function preset(
    nextOperation: StringOperation,
    nextSource: string,
    nextSecondary = '',
    nextIndex = 0
  ) {
    operation = nextOperation;
    source = nextSource;
    secondary = nextSecondary;
    index = nextIndex;
    rebuild();
  }
</script>

<svelte:head>
  <title>Strings Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Trace character access, search, copying, immutable concatenation, and builder growth line by line."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="strings-lab"
  completionXp={40}
  completionKey={operation}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Character execution laboratory"
  title="Strings Lab"
  operationTitle={metadata.label}
  operationSummary={metadata.description}
  tabWidth="wide"
>
  {#snippet controls()}
    <form
      class="cfg"
      onsubmit={(event) => {
        event.preventDefault();
        rebuild();
      }}
    >
      <label
        >Operation<select aria-label="Operation" bind:value={operation} onchange={rebuild}
          >{#each STRING_OPERATIONS as item}<option value={item.id}>{item.label}</option
            >{/each}</select
        ></label
      >
      <label class="source"
        >Source<input aria-label="Source string" maxlength="12" bind:value={source} /></label
      >
      {#if needsSecondary}<label
          >{secondaryLabel}<input
            aria-label={secondaryLabel}
            maxlength="12"
            bind:value={secondary}
          /></label
        >{/if}
      {#if needsIndex}<label
          >Start / index<input
            aria-label="Start or index"
            type="number"
            min="0"
            max="11"
            bind:value={index}
          /></label
        >{/if}
      <button class="primary" type="submit">Build trace</button>
    </form>
    <div class="presets" aria-label="String presets">
      <span>Presets</span>
      <button type="button" onclick={() => preset('search', 'REPLAY', 'R')}>Best search</button>
      <button type="button" onclick={() => preset('search', 'REPLAY', 'Z')}>Worst search</button>
      <button type="button" onclick={() => preset('immutable-build', 'REPLAY')}
        >Immutable O(n²)</button
      >
      <button type="button" onclick={() => preset('builder-build', 'REPLAY')}>Builder O(n)</button>
    </div>
    {#if inputError}<p class="error" role="alert">{inputError}</p>{/if}
  {/snippet}
  {#snippet visual({ state })}<StringVisualizer {state} />{/snippet}
  {#snippet about()}
    <p>
      The same semantic step drives C, C++, Java, and Python. Switching language changes only the
      source representation; the character cells, trace cursor, and work counters stay fixed.
    </p>
  {/snippet}
</LessonWorkspace>

<style>
  .cfg {
    display: grid;
    grid-template-columns: 1.25fr 1.4fr 1.2fr 0.8fr auto;
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
  @media (max-width: 1050px) {
    .cfg {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 560px) {
    .cfg {
      grid-template-columns: 1fr;
    }
  }
</style>
