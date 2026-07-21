<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import StackVisualizer from '$lib/components/visualizers/StackVisualizer.svelte';
  import {
    DEFAULT_STACK_CONFIG,
    STACK_OPERATIONS,
    createStackLesson,
    type StackBacking,
    type StackConfig,
    type StackOperation
  } from '$lib/engines/dsa/stack';

  type Preset = {
    id: string;
    label: string;
    operation: StackOperation;
    backing: StackBacking;
    values: number[];
    newValue: number;
  };

  const presets: Preset[] = [
    {
      id: 'normal-push',
      label: 'Normal push',
      operation: 'push',
      backing: 'array',
      values: [10, 20, 30],
      newValue: 40
    },
    {
      id: 'resize-push',
      label: 'Resize push',
      operation: 'push',
      backing: 'dynamic-array',
      values: [10, 20, 30],
      newValue: 40
    },
    {
      id: 'overflow',
      label: 'Overflow',
      operation: 'push',
      backing: 'array',
      values: [10, 20, 30, 40, 50],
      newValue: 60
    },
    {
      id: 'pop',
      label: 'Pop',
      operation: 'pop',
      backing: 'array',
      values: [10, 20, 30],
      newValue: 40
    },
    {
      id: 'peek',
      label: 'Peek',
      operation: 'peek',
      backing: 'array',
      values: [10, 20, 30],
      newValue: 40
    },
    {
      id: 'linked-push',
      label: 'Linked-stack push',
      operation: 'push',
      backing: 'linked-list',
      values: [10, 20, 30],
      newValue: 40
    }
  ];
  const completionKeys = STACK_OPERATIONS.map((item) => item.id);

  let operation = $state<StackOperation>(DEFAULT_STACK_CONFIG.operation);
  let backing = $state<StackBacking>(DEFAULT_STACK_CONFIG.backing);
  let valuesText = $state((DEFAULT_STACK_CONFIG.values ?? []).join(', '));
  let newValue = $state(DEFAULT_STACK_CONFIG.newValue ?? 40);
  let target = $state(DEFAULT_STACK_CONFIG.target ?? 20);
  let activePreset = $state('normal-push');
  let inputError = $state('');

  let lesson = $state(createStackLesson(config()));
  let operationMetadata = $derived(
    STACK_OPERATIONS.find((candidate) => candidate.id === operation) ?? STACK_OPERATIONS[0]
  );

  function config(): StackConfig {
    const values = parseValues();
    return {
      operation,
      backing,
      values,
      newValue,
      target,
      capacity: backing === 'dynamic-array' ? values.length : values.length + 2
    };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) || pieces.length > 8) {
      return [...(DEFAULT_STACK_CONFIG.values ?? [])];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value)))
      return [...(DEFAULT_STACK_CONFIG.values ?? [])];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createStackLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    backing = preset.backing;
    valuesText = preset.values.join(', ');
    newValue = preset.newValue;
    rebuild();
  }
</script>

<svelte:head>
  <title>Stack Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch stack push, pop, peek, and search execute one line at a time across array, dynamic-array, and linked-list backings."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="stack-lab"
  completionXp={35}
  completionKey={operation}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="Stack execution laboratory"
  title="Stack Lab"
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
            operation = event.currentTarget.value as StackOperation;
            rebuild();
          }}
        >
          {#each STACK_OPERATIONS as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label
        >Implementation
        <select
          aria-label="Backing"
          value={backing}
          onchange={(event) => {
            backing = event.currentTarget.value as StackBacking;
            rebuild();
          }}
        >
          <option value="array">Fixed array</option>
          <option value="dynamic-array">Dynamic array</option>
          <option value="linked-list">Linked list</option>
        </select></label
      >
      <label class="values"
        >Input
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      {#if operation === 'push'}
        <label>New value<input type="number" bind:value={newValue} onchange={rebuild} /></label>
      {/if}
      {#if operation === 'search'}
        <label>Target<input type="number" bind:value={target} onchange={rebuild} /></label>
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
    <StackVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      A stack is LIFO: push and pop touch only the top. A fixed array overflows when full; a dynamic
      array doubles (one push becomes O(n), but amortized O(1)); a linked stack never resizes.
      Search is O(n) because only the top is directly reachable.
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
