<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import DynamicArrayVisualizer from '$lib/components/visualizers/DynamicArrayVisualizer.svelte';
  import {
    DEFAULT_DYNAMIC_ARRAY_CONFIG,
    DYNAMIC_ARRAY_OPERATIONS,
    createDynamicArrayLesson,
    type DynamicArrayConfig,
    type DynamicArrayOperation
  } from '$lib/engines/dsa/dynamicArray';

  type Preset = {
    id: string;
    label: string;
    operation: DynamicArrayOperation;
    values: number[];
    spareCapacity: boolean;
    position?: number;
    target?: number;
    newValue?: number;
  };

  const presets: Preset[] = [
    {
      id: 'access',
      label: 'Access',
      operation: 'access',
      values: [7, 14, 21, 28, 35],
      spareCapacity: false,
      position: 3
    },
    {
      id: 'insert-front',
      label: 'Insert at front',
      operation: 'insert-beginning',
      values: [7, 14, 21, 28, 35],
      spareCapacity: false,
      newValue: 42
    },
    {
      id: 'append-capacity',
      label: 'Append (spare capacity)',
      operation: 'insert-end',
      values: [7, 14, 21, 28, 35],
      spareCapacity: true,
      newValue: 42
    },
    {
      id: 'append-resize',
      label: 'Append (resize)',
      operation: 'insert-end',
      values: [7, 14, 21, 28, 35],
      spareCapacity: false,
      newValue: 42
    },
    {
      id: 'append-sequence',
      label: 'Amortized sequence',
      operation: 'append-sequence',
      values: [1, 2, 3, 4, 5, 6, 7, 8],
      spareCapacity: false
    },
    {
      id: 'delete-middle',
      label: 'Delete middle',
      operation: 'delete-middle',
      values: [7, 14, 21, 28, 35],
      spareCapacity: false,
      position: 2
    }
  ];
  const completionKeys = DYNAMIC_ARRAY_OPERATIONS.map((item) => item.id);

  let operation = $state<DynamicArrayOperation>('insert-end');
  let valuesText = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.values.join(', '));
  let position = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.position ?? 2);
  let target = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.target ?? 21);
  let newValue = $state(DEFAULT_DYNAMIC_ARRAY_CONFIG.newValue ?? 42);
  let spareCapacity = $state(false);
  let activePreset = $state('append-resize');
  let inputError = $state('');

  let lesson = $state(createDynamicArrayLesson(config()));
  let operationMetadata = $derived(
    DYNAMIC_ARRAY_OPERATIONS.find((candidate) => candidate.id === operation) ??
      DYNAMIC_ARRAY_OPERATIONS[0]
  );
  let needsPosition = $derived(
    ['access', 'update', 'insert-middle', 'delete-middle'].includes(operation)
  );
  let needsNewValue = $derived(
    ['update', 'insert-beginning', 'insert-middle', 'insert-end'].includes(operation)
  );
  let showSpare = $derived(operation === 'insert-end');

  function config(): DynamicArrayConfig {
    return { operation, values: parseValues(), position, target, newValue, spareCapacity };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (
      pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) ||
      pieces.length < 1 ||
      pieces.length > 8
    ) {
      return [...DEFAULT_DYNAMIC_ARRAY_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value)))
      return [...DEFAULT_DYNAMIC_ARRAY_CONFIG.values];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createDynamicArrayLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    valuesText = preset.values.join(', ');
    spareCapacity = preset.spareCapacity;
    if (preset.position !== undefined) position = preset.position;
    if (preset.target !== undefined) target = preset.target;
    if (preset.newValue !== undefined) newValue = preset.newValue;
    rebuild();
  }
</script>

<svelte:head>
  <title>Array & Dynamic Array Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch array access, shifting inserts and deletes, resizing appends, and amortized growth execute one slot at a time."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="array-lab"
  completionXp={35}
  completionKey={operation}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Contiguous memory laboratory"
  title="Array & Dynamic Array Lab"
  operationTitle={operationMetadata.label}
  operationSummary={operationMetadata.description}
  tabWidth="wide"
>
  {#snippet controls()}
    <div class="cfg">
      <label
        >Operation
        <select
          aria-label="Operation"
          value={operation}
          onchange={(event) => {
            operation = event.currentTarget.value as DynamicArrayOperation;
            rebuild();
          }}
        >
          {#each DYNAMIC_ARRAY_OPERATIONS as item}<option value={item.id}>{item.label}</option
            >{/each}
        </select></label
      >
      <label class="values"
        >Input
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      {#if needsPosition}
        <label
          >Position<input
            type="number"
            min="0"
            max="8"
            bind:value={position}
            onchange={rebuild}
          /></label
        >
      {/if}
      {#if operation === 'search'}
        <label>Target<input type="number" bind:value={target} onchange={rebuild} /></label>
      {/if}
      {#if needsNewValue}
        <label>New value<input type="number" bind:value={newValue} onchange={rebuild} /></label>
      {/if}
      {#if showSpare}
        <label class="switch"
          ><input
            type="checkbox"
            checked={spareCapacity}
            onchange={(event) => {
              spareCapacity = event.currentTarget.checked;
              rebuild();
            }}
          /> Spare capacity</label
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

  {#snippet visual({ state, language, semantic })}
    <DynamicArrayVisualizer {state} {language} activeSemantic={semantic} />
  {/snippet}

  {#snippet about()}
    <p>
      A dynamic array keeps elements contiguous. Access is O(1) index arithmetic; inserting or
      deleting anywhere but the end shifts every following element (O(n)). Appending is O(1) when a
      spare slot exists, but O(n) when the buffer is full and must double — averaged over many
      appends, doubling keeps it amortized O(1). Compare to C arrays (fixed), C++ vector, Java
      ArrayList, and Python list, which all grow this way underneath.
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
