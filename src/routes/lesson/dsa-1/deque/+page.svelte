<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import DequeVisualizer from '$lib/components/visualizers/DequeVisualizer.svelte';
  import {
    DEFAULT_DEQUE_CONFIG,
    DEQUE_OPERATIONS,
    createDequeLesson,
    type DequeBacking,
    type DequeConfig,
    type DequeOperation
  } from '$lib/engines/dsa/deque';

  type Preset = {
    id: string;
    label: string;
    operation: DequeOperation;
    backing: DequeBacking;
    values: number[];
  };

  const presets: Preset[] = [
    {
      id: 'push-front',
      label: 'Push front',
      operation: 'push-front',
      backing: 'circular-array',
      values: [20, 30, 40]
    },
    {
      id: 'push-back',
      label: 'Push back',
      operation: 'push-back',
      backing: 'circular-array',
      values: [20, 30, 40]
    },
    {
      id: 'pop-front',
      label: 'Pop front',
      operation: 'pop-front',
      backing: 'circular-array',
      values: [20, 30, 40]
    },
    {
      id: 'pop-back',
      label: 'Pop back',
      operation: 'pop-back',
      backing: 'circular-array',
      values: [20, 30, 40]
    },
    {
      id: 'linked-front',
      label: 'Linked push front',
      operation: 'push-front',
      backing: 'linked-list',
      values: [20, 30, 40]
    },
    {
      id: 'peek-back',
      label: 'Peek back',
      operation: 'peek-back',
      backing: 'circular-array',
      values: [20, 30, 40]
    }
  ];
  const completionKeys = DEQUE_OPERATIONS.map((item) => item.id);

  let operation = $state<DequeOperation>(DEFAULT_DEQUE_CONFIG.operation);
  let backing = $state<DequeBacking>(DEFAULT_DEQUE_CONFIG.backing);
  let valuesText = $state(DEFAULT_DEQUE_CONFIG.values.join(', '));
  let newValue = $state(DEFAULT_DEQUE_CONFIG.newValue ?? 40);
  let activePreset = $state('push-back');
  let inputError = $state('');

  let lesson = $state(createDequeLesson(config()));
  let operationMetadata = $derived(
    DEQUE_OPERATIONS.find((candidate) => candidate.id === operation) ?? DEQUE_OPERATIONS[0]
  );

  function config(): DequeConfig {
    return { operation, backing, values: parseValues(), newValue };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) || pieces.length > 8) {
      return [...DEFAULT_DEQUE_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value)))
      return [...DEFAULT_DEQUE_CONFIG.values];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createDequeLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    backing = preset.backing;
    valuesText = preset.values.join(', ');
    rebuild();
  }
</script>

<svelte:head>
  <title>Deque Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch double-ended queue push, pop, and peek at both ends across a circular buffer and a doubly linked list."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="deque-lab"
  completionXp={35}
  completionKey={operation}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Double-ended execution laboratory"
  title="Deque Lab"
  operationTitle={operationMetadata.label}
  operationSummary={operationMetadata.description}
>
  {#snippet controls()}
    <div class="cfg">
      <label
        >Operation
        <select
          aria-label="Operation"
          value={operation}
          onchange={(event) => {
            operation = event.currentTarget.value as DequeOperation;
            rebuild();
          }}
        >
          {#each DEQUE_OPERATIONS as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label
        >Implementation
        <select
          aria-label="Backing"
          value={backing}
          onchange={(event) => {
            backing = event.currentTarget.value as DequeBacking;
            rebuild();
          }}
        >
          <option value="circular-array">Circular array</option>
          <option value="linked-list">Doubly linked list</option>
        </select></label
      >
      <label class="values"
        >Input
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      {#if operation.startsWith('push')}
        <label>New value<input type="number" bind:value={newValue} onchange={rebuild} /></label>
      {/if}
      <div class="presets" role="group" aria-label="Presets">
        {#each presets as preset}
          <button
            type="button"
            class:active={activePreset === preset.id}
            onclick={() => applyPreset(preset)}>{preset.label}</button
          >
        {/each}
      </div>
      {#if inputError}<p class="err" role="alert">{inputError}</p>{/if}
    </div>
  {/snippet}

  {#snippet visual({ state })}
    <DequeVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      A deque supports O(1) insertion and removal at both ends. A circular array moves front and
      back indices modulo capacity so neither end ever shifts; a doubly linked list relinks
      prev/next pointers at the chosen end. Peeks read an end without changing size.
    </p>
  {/snippet}
</LessonWorkspace>

<style>
  .cfg {
    display: flex;
    align-items: end;
    gap: 0.55rem;
    flex-wrap: wrap;
  }
  .cfg label {
    display: grid;
    gap: 0.25rem;
    color: var(--muted);
    font-size: 0.66rem;
  }
  .cfg input,
  .cfg select {
    min-width: 90px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem;
    background: var(--bg);
    color: var(--text);
  }
  .cfg .values {
    flex: 1;
    min-width: 160px;
  }
  .presets {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
    flex-basis: 100%;
    margin-top: 0.2rem;
  }
  .presets button {
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 99px;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .presets button.active {
    border-color: var(--primary);
    color: var(--primary);
  }
  .err {
    flex-basis: 100%;
    margin: 0;
    color: var(--danger);
    font-size: 0.7rem;
  }
</style>
