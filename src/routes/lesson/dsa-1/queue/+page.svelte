<script lang="ts">
  import LessonWorkspace from '$lib/components/lesson/LessonWorkspace.svelte';
  import QueueVisualizer from '$lib/components/visualizers/QueueVisualizer.svelte';
  import {
    DEFAULT_QUEUE_CONFIG,
    QUEUE_OPERATIONS,
    createQueueLesson,
    type QueueBacking,
    type QueueConfig,
    type QueueOperation
  } from '$lib/engines/dsa/queue';

  type Preset = {
    id: string;
    label: string;
    operation: QueueOperation;
    backing: QueueBacking;
    values: number[];
    maintainRear?: boolean;
  };

  const presets: Preset[] = [
    {
      id: 'naive-dequeue',
      label: 'Naive dequeue (shift)',
      operation: 'dequeue',
      backing: 'naive-array',
      values: [10, 20, 30, 40]
    },
    {
      id: 'circular-dequeue',
      label: 'Circular dequeue',
      operation: 'dequeue',
      backing: 'circular-array',
      values: [10, 20, 30, 40]
    },
    {
      id: 'circular-enqueue',
      label: 'Circular enqueue',
      operation: 'enqueue',
      backing: 'circular-array',
      values: [10, 20, 30]
    },
    {
      id: 'linked-rear',
      label: 'Linked enqueue (rear ptr)',
      operation: 'enqueue',
      backing: 'linked-list',
      values: [10, 20, 30],
      maintainRear: true
    },
    {
      id: 'linked-no-rear',
      label: 'Linked enqueue (no rear)',
      operation: 'enqueue',
      backing: 'linked-list',
      values: [10, 20, 30],
      maintainRear: false
    },
    {
      id: 'front',
      label: 'Front peek',
      operation: 'front',
      backing: 'circular-array',
      values: [10, 20, 30, 40]
    }
  ];
  const completionKeys = QUEUE_OPERATIONS.map((item) => item.id);

  let operation = $state<QueueOperation>(DEFAULT_QUEUE_CONFIG.operation);
  let backing = $state<QueueBacking>(DEFAULT_QUEUE_CONFIG.backing);
  let valuesText = $state(DEFAULT_QUEUE_CONFIG.values.join(', '));
  let newValue = $state(DEFAULT_QUEUE_CONFIG.newValue ?? 50);
  let maintainRear = $state(true);
  let activePreset = $state('naive-dequeue');
  let inputError = $state('');

  let lesson = $state(createQueueLesson(config()));
  let operationMetadata = $derived(
    QUEUE_OPERATIONS.find((candidate) => candidate.id === operation) ?? QUEUE_OPERATIONS[0]
  );
  let showRearToggle = $derived(backing === 'linked-list' && operation === 'enqueue');

  function config(): QueueConfig {
    // Inline the rear-toggle condition so init-time config() has no dependency
    // on a $derived declared later (temporal dead zone).
    const rearTogglable = backing === 'linked-list' && operation === 'enqueue';
    const capacity = rearTogglable && !maintainRear ? -1 : Math.max(6, parseValues().length + 2);
    return { operation, backing, values: parseValues(), newValue, capacity };
  }

  function parseValues() {
    const pieces = valuesText.split(',').map((value) => value.trim());
    if (pieces.some((value) => value === '' || !/^-?\d+$/.test(value)) || pieces.length > 8) {
      return [...DEFAULT_QUEUE_CONFIG.values];
    }
    const values = pieces.map(Number);
    if (values.some((value) => !Number.isSafeInteger(value)))
      return [...DEFAULT_QUEUE_CONFIG.values];
    return values;
  }

  function rebuild() {
    inputError = '';
    try {
      lesson = createQueueLesson(config());
    } catch (cause) {
      inputError = cause instanceof Error ? cause.message : 'Could not build that trace.';
    }
  }

  function applyPreset(preset: Preset) {
    activePreset = preset.id;
    operation = preset.operation;
    backing = preset.backing;
    valuesText = preset.values.join(', ');
    if (preset.maintainRear !== undefined) maintainRear = preset.maintainRear;
    rebuild();
  }
</script>

<svelte:head>
  <title>Queue Execution Lab · ReplayCS</title>
  <meta
    name="description"
    content="Watch queue enqueue, dequeue, front, and rear execute across naive-array shifting, circular buffers, and linked queues."
  />
</svelte:head>

<LessonWorkspace
  {lesson}
  subject="dsa-1"
  completionId="queue-lab"
  completionXp={35}
  completionKey={operation}
  {completionKeys}
  backHref="/learn/dsa-1"
  backLabel="← DSA I"
  eyebrow="FIFO execution laboratory"
  title="Queue Lab"
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
            operation = event.currentTarget.value as QueueOperation;
            rebuild();
          }}
        >
          {#each QUEUE_OPERATIONS as item}<option value={item.id}>{item.label}</option>{/each}
        </select></label
      >
      <label
        >Implementation
        <select
          aria-label="Backing"
          value={backing}
          onchange={(event) => {
            backing = event.currentTarget.value as QueueBacking;
            rebuild();
          }}
        >
          <option value="naive-array">Naive array</option>
          <option value="circular-array">Circular array</option>
          <option value="linked-list">Linked list</option>
        </select></label
      >
      <label class="values"
        >Input
        <input aria-label="Input" bind:value={valuesText} onchange={rebuild} /></label
      >
      {#if operation === 'enqueue'}
        <label>New value<input type="number" bind:value={newValue} onchange={rebuild} /></label>
      {/if}
      {#if showRearToggle}
        <label class="switch"
          ><input
            type="checkbox"
            checked={maintainRear}
            onchange={(event) => {
              maintainRear = event.currentTarget.checked;
              rebuild();
            }}
          /> Maintain rear pointer</label
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
    <QueueVisualizer {state} />
  {/snippet}

  {#snippet about()}
    <p>
      A queue is FIFO. A naive array keeps the front at index 0, so every dequeue shifts the rest
      left (O(n)); a circular buffer advances a front index modulo capacity instead (O(1)). A linked
      queue enqueues in O(1) when it keeps a rear pointer, but O(n) without one because it must walk
      to the last node.
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
