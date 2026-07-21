<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import LinkedListVisualizer from '$lib/components/visualizers/LinkedListVisualizer.svelte';
  import {
    DEFAULT_LINKED_LIST_CONFIG,
    LINKED_LIST_OPERATIONS,
    createLinkedListLesson,
    type LinkedListConfig,
    type LinkedListOperation
  } from '$lib/engines/dsa/linkedList';

  type Preset = {
    id: string;
    label: string;
    operation: LinkedListOperation;
    values: number[];
    maintainTail?: boolean;
    position?: number;
    target?: number;
    newValue?: number;
    cycleEntry?: number | null;
  };

  const presets: Preset[] = [
    {
      id: 'insert-head',
      label: 'Insert head',
      operation: 'insert-head',
      values: [12, 27, 41, 56],
      newValue: 73
    },
    {
      id: 'tail-no-ptr',
      label: 'Insert tail (no tail ptr)',
      operation: 'insert-tail',
      values: [12, 27, 41, 56],
      maintainTail: false,
      newValue: 73
    },
    {
      id: 'tail-ptr',
      label: 'Insert tail (tail ptr)',
      operation: 'insert-tail',
      values: [12, 27, 41, 56],
      maintainTail: true,
      newValue: 73
    },
    { id: 'search', label: 'Search', operation: 'search', values: [12, 27, 41, 56], target: 41 },
    {
      id: 'reverse',
      label: 'Reverse (iterative)',
      operation: 'reverse-iterative',
      values: [12, 27, 41, 56]
    },
    {
      id: 'cycle',
      label: 'Detect cycle (Floyd)',
      operation: 'detect-cycle',
      values: [12, 27, 41, 56],
      cycleEntry: 1
    }
  ];
  const completionKeys = LINKED_LIST_OPERATIONS.flatMap((item) =>
    item.id === 'insert-tail' ? ['insert-tail-without-tail', 'insert-tail-with-tail'] : [item.id]
  );

  let operation = $state<LinkedListOperation>(DEFAULT_LINKED_LIST_CONFIG.operation);
  let valuesText = $state(DEFAULT_LINKED_LIST_CONFIG.values.join(', '));
  let position = $state(DEFAULT_LINKED_LIST_CONFIG.position ?? 2);
  let target = $state(DEFAULT_LINKED_LIST_CONFIG.target ?? 41);
  let newValue = $state(DEFAULT_LINKED_LIST_CONFIG.newValue ?? 73);
  let maintainTail = $state(false);
  let cycleEntry = $state(-1);
  let activePreset = $state('tail-no-ptr');
  let inputError = $state('');

  let lesson = $state(createLinkedListLesson(config()));
  let operationMetadata = $derived(
    LINKED_LIST_OPERATIONS.find((candidate) => candidate.id === operation) ??
      LINKED_LIST_OPERATIONS[0]
  );
  let completionKey = $derived(
    operation === 'insert-tail'
      ? maintainTail
        ? 'insert-tail-with-tail'
        : 'insert-tail-without-tail'
      : operation
  );

  function config(): LinkedListConfig {
    return {
      operation,
      values: parseValues(),
      position,
      target,
      newValue,
      maintainTail,
      cycleEntry: cycleEntry < 0 ? null : cycleEntry
    };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (
      pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) ||
      pieces.length < 1 ||
      pieces.length > 8
    ) {
      return [...DEFAULT_LINKED_LIST_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value)))
      return [...DEFAULT_LINKED_LIST_CONFIG.values];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createLinkedListLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    valuesText = preset.values.join(', ');
    if (preset.maintainTail !== undefined) maintainTail = preset.maintainTail;
    if (preset.position !== undefined) position = preset.position;
    if (preset.target !== undefined) target = preset.target;
    if (preset.newValue !== undefined) newValue = preset.newValue;
    cycleEntry = preset.cycleEntry ?? -1;
    rebuild();
  }
</script>

<svelte:head>
  <title>Linked List Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch linked-list access, insertion, deletion, reversal, and Floyd cycle detection execute one pointer change at a time."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="linked-list-lab"
  completionXp={35}
  {completionKey}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Pointer execution laboratory"
  title="Linked List Lab"
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
            operation = event.currentTarget.value as LinkedListOperation;
            rebuild();
          }}
        >
          {#each LINKED_LIST_OPERATIONS as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label class="values"
        >Input
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      {#if ['access', 'insert-at-position', 'insert-after-known', 'delete-after-known'].includes(operation)}
        <label
          >Position<input
            type="number"
            min="0"
            max="7"
            bind:value={position}
            onchange={rebuild}
          /></label
        >
      {/if}
      {#if ['search', 'delete-by-value'].includes(operation)}
        <label>Target<input type="number" bind:value={target} onchange={rebuild} /></label>
      {/if}
      {#if operation.startsWith('insert')}
        <label>New value<input type="number" bind:value={newValue} onchange={rebuild} /></label>
      {/if}
      {#if operation === 'detect-cycle'}
        <label
          >Cycle entry<input
            type="number"
            min="-1"
            max="7"
            bind:value={cycleEntry}
            onchange={rebuild}
          /></label
        >
      {/if}
      {#if operation === 'insert-tail'}
        <label class="switch"
          ><input
            type="checkbox"
            checked={maintainTail}
            onchange={(event) => {
              maintainTail = event.currentTarget.checked;
              rebuild();
            }}
          /> Maintain tail pointer</label
        >
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
    <LinkedListVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      A singly linked list reaches each node only through the previous node's next pointer.
      Inserting at the head is O(1); inserting at the tail is O(n) without a tail pointer but O(1)
      with one. Reversal rewires every next pointer; Floyd's slow/fast pointers detect a cycle in
      O(n) with O(1) space.
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
  .cfg input:not([type='checkbox']),
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
  .cfg .switch {
    flex-direction: row;
    align-items: center;
    gap: 0.35rem;
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
